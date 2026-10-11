'use strict';
// Código Rojo: la partida. Arma la persecución (ladrón, patrulleros, tráfico, bolsas y guarida),
// simula a 120 pasos por segundo, llena la barra de arresto, cuenta el tiempo de la meta y
// mueve las cámaras (atrás y cabina). También el modo demostración del menú.

const G = { mode: 'boot', cfg: null, all: [], cops: [], traffic: [], t: 0, time: 0, acc: 0, bar: 0, cam: 'afuera', snap: true };
const KEYS = {};
const TOUCH = { left: false, right: false, gas: false, brake: false, hand: false, nitro: false };
const STEP = 1 / 120;
const inp = { thr: 0, brk: 0, steer: 0, hand: false, nitro: false };

function readInput(dt) {
  const L = KEYS.ArrowLeft || KEYS.KeyA || TOUCH.left, R = KEYS.ArrowRight || KEYS.KeyD || TOUCH.right;
  const target = (R ? 1 : 0) - (L ? 1 : 0);
  const rate = target === 0 || Math.sign(target) !== Math.sign(inp.steer) ? 7 : 3.2 * (save.opt.sens || 1);
  const d = target - inp.steer;
  inp.steer += Math.sign(d) * Math.min(Math.abs(d), rate * dt);
  inp.thr = KEYS.ArrowUp || KEYS.KeyW || TOUCH.gas ? 1 : 0;
  inp.brk = KEYS.ArrowDown || KEYS.KeyS || TOUCH.brake ? 1 : 0;
  inp.hand = !!(KEYS.Space || TOUCH.hand);
  inp.nitro = !!(KEYS.ShiftLeft || KEYS.ShiftRight || KEYS.KeyN || TOUCH.nitro);
  return inp;
}

// ---------- entidades ----------
// Un "actor" es la física (body) más su modelo (car) y, si no es el jugador, su IA.
function spawnActor(spec, x, z, h, opts = {}) {
  const body = newBody(spec, x, z, h);
  body.state = 'drive';
  if (opts.player) body.nitro = 1;
  const car = makeCar(spec, { police: opts.police, cockpit: opts.player });
  car.sirenOn = !!opts.police;
  W.scene.add(car.root);
  const a = { body, car, ai: null, role: opts.role || 'trafico', player: !!opts.player };
  body.actor = a;
  poseCar(car, body, 0, 0);
  return a;
}
function removeActor(a) {
  // (las geometrías son compartidas entre carros del mismo tipo: no se liberan)
  W.scene.remove(a.car.root);
}
function clearGame() {
  for (const a of G.all) removeActor(a);
  G.all = []; G.cops = []; G.traffic = []; G.thief = null; G.player = null;
  for (const b of G.bags || []) W.scene.remove(b.mesh);
  G.bags = [];
  if (G.marker) { W.scene.remove(G.marker); G.marker = null; }
  for (const l of G.copLights || []) W.scene.remove(l);
  G.copLights = [];
  if (G.head) { W.scene.remove(G.head); W.scene.remove(G.head.target); G.head = null; }
  fxClear();
}

// Lugar en un carril de un tramo de calle (nodos a → b), a una fracción f del tramo.
function laneSpot(a, b, f, lane = LANE) {
  const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
  return { x: a.x + dx * f - uz * lane, z: a.z + dz * f + ux * lane, h: Math.atan2(ux, uz) };
}
function randomSegment(r, far, minD) {
  for (let k = 0; k < 200; k++) {
    const a = CITY.nodes[Math.floor(r() * CITY.nodes.length)], b = nodeAt(a.nb[Math.floor(r() * a.nb.length)]);
    const s = laneSpot(a, b, 0.25 + r() * 0.5);
    if (!far || far.every(p => Math.hypot(p.x - s.x, p.z - s.z) > minD)) return { a, b, s };
  }
  const a = CITY.nodes[0], b = nodeAt(a.nb[0]);
  return { a, b, s: laneSpot(a, b, 0.5) };
}
function spawnTraffic(n, avoid) {
  const r = Math.random;
  const bodies = ['hatch', 'sedan', 'sedan', 'pickup', 'van', 'hatch'];
  const colors = [0xd8d8d8, 0x2a2a2e, 0xb83228, 0x2f5fb0, 0xe2c23a, 0x3c7a4a, 0x8a8f96, 0xf4f4f4, 0x6a3a8a];
  for (let i = 0; i < n; i++) {
    const seg = randomSegment(r, avoid, 35);
    const spec = { body: bodies[Math.floor(r() * bodies.length)], color: colors[Math.floor(r() * colors.length)], top: 22, acc: 4.5, grip: 0.95, brake: 9, hp: 80, mass: 1.1 };
    if (spec.body === 'van') spec.mass = 1.5;
    const a = spawnActor(spec, seg.s.x, seg.s.z, seg.s.h);
    a.ai = newTraffic(a.body);
    a.ai.route = [seg.a, seg.b]; extendRandom(a.ai);
    G.traffic.push(a); G.all.push(a);
  }
}
const COP_CAR = { facil: 'sedan', normal: 'muscle', dificil: 'deportivo', leyenda: 'super' };
const THIEF_CAR = { facil: 'sedan', normal: 'muscle', dificil: 'deportivo', leyenda: 'super' };
function spawnCop(near, role, diff) {
  const spec = Object.assign({}, carById(COP_CAR[diff]));
  // lugar lejos del ladrón (pero no tanto) y que no se vea
  let seg = null;
  for (let k = 0; k < 120; k++) {
    const s = randomSegment(Math.random, null, 0);
    const d = Math.hypot(s.s.x - near.x, s.s.z - near.z);
    if (d > 110 && d < 210 && !G.cops.some(c => Math.hypot(c.body.x - s.s.x, c.body.z - s.s.z) < 50)) { seg = s; break; }
  }
  seg = seg || randomSegment(Math.random, [near], 100);
  const a = spawnActor(spec, seg.s.x, seg.s.z, seg.s.h, { police: true, role: 'policia' });
  a.ai = newCop(a.body, role, diff);
  return a;
}

// ---------- empezar ----------
function startGame(cfg) {
  clearGame();
  document.getElementById('big').className = '';
  G.cfg = cfg;
  const D = DIFFS[cfg.diff];
  setTimeOfDay(cfg.time);
  G.time = 0; G.bar = 0; G.acc = 0; G.got = 0; G.reds = 0; G.bridges = 0; G.wrecked = 0; G.tunnel = false; G.lastNode = null; G.onBridge = false;
  G.stats = { maxJump: 0, top: 0, maxBar: 0 };
  const spec = carById(save.car);
  // salida: el ladrón sale del banco (cerca de la plaza del sur oeste)
  const startSeg = { a: nodeAt(1 * 6 + 0), b: nodeAt(1 * 6 + 1) };      // calle x = -135, de z = -225 a -135
  if (cfg.role === 'ladron') {
    const s = laneSpot(startSeg.a, startSeg.b, 0.35);
    G.player = spawnActor(spec, s.x, s.z, s.h, { player: true, role: 'ladron' });
    G.thief = G.player;
    G.all.push(G.player);
    const roles = ['chase', 'cut', 'flank'];
    for (let i = 0; i < 3; i++) { const c = spawnCop(G.player.body, roles[i], cfg.diff); c.wait = (cfg.diff === 'facil' ? 4.5 : 2) + i * 1.5; G.cops.push(c); G.all.push(c); }
  } else {
    const ts = laneSpot(startSeg.a, startSeg.b, 0.75);
    const tspec = Object.assign({}, carById(THIEF_CAR[cfg.diff]), { color: 0x101010 });
    G.thief = spawnActor(tspec, ts.x, ts.z, ts.h, { role: 'ladron' });
    G.all.push(G.thief);
    const s = laneSpot(startSeg.a, startSeg.b, 0.25);
    const pspec = Object.assign({}, spec);
    G.player = spawnActor(pspec, s.x, s.z, s.h, { player: true, police: true, role: 'policia' });
    G.cops.push(G.player); G.all.push(G.player);
  }
  // guarida y bolsas
  G.hideout = null;
  if (cfg.goal === 'escape' || cfg.goal === 'stop') {
    const from = G.player.body;
    G.hideout = CITY.hideouts.slice().sort((a, b) => Math.hypot(b.x - from.x, b.z - from.z) - Math.hypot(a.x - from.x, a.z - from.z))[0];
    G.marker = makeMarker(G.hideout.x, G.hideout.z, cfg.role === 'ladron' ? 0x3ddc84 : 0xff4d4d);
  }
  if (cfg.role === 'policia') G.thief.ai = newThief(G.thief.body, cfg.diff, cfg.goal === 'stop' ? G.hideout : null);
  G.bags = [];
  if (cfg.goal === 'bags') {
    const spots = CITY.bagSpots.slice().sort(() => Math.random() - 0.5), pick = [];
    for (const sp of spots) { if (pick.length >= cfg.n + 3) break; if (Math.hypot(sp.x - G.player.body.x, sp.z - G.player.body.z) > 60 && pick.every(p => Math.hypot(p.x - sp.x, p.z - sp.z) > 70)) pick.push(sp); }
    for (const p of pick) { const m = makeBag(); m.position.set(p.x, groundH(p.x, p.z) + 1.2, p.z); W.scene.add(m); G.bags.push({ x: p.x, z: p.z, mesh: m, got: false }); }
  }
  spawnTraffic(D.traffic, [G.player.body, G.thief.body]);
  // luces de noche: faros del jugador y luces de los patrulleros
  if (cfg.time !== 'dia') {
    G.head = new THREE.SpotLight(0xfff0d0, cfg.time === 'noche' ? 220 : 80, 90, 0.55, 0.5, 1.3);
    W.scene.add(G.head, G.head.target);
  }
  G.copLights = [];
  if (cfg.time === 'noche') for (let i = 0; i < Math.min(3, G.cops.length); i++) { const l = new THREE.PointLight(0xff2030, 0, 30, 1.6); W.scene.add(l); G.copLights.push(l); }
  G.mode = 'count'; G.countT = 0;
  G.cam = save.opt.cam || 'afuera';
  setCam();
  inp.steer = 0;
  save.stats.runs++; persist();
  SFX.init();
  hudStatic();
}

function setCam() {
  const car = G.player && G.player.car;
  if (!car) return;
  const inside = G.cam === 'cabina' && (G.mode === 'count' || G.mode === 'play' || G.mode === 'pause');
  car.cockpit.visible = inside; car.cab.visible = !inside; car.roof.visible = !inside;
  car.bar.forEach(b => { b.visible = !inside; }); if (car.ant) car.ant.visible = !inside;
  setCockpitClip(car, inside);
  if (inside) { car.body.add(W.camera); W.camera.position.copy(car.eye); W.camera.rotation.set(-0.15, Math.PI, 0, 'YXZ'); }
  else { W.scene.attach(W.camera); W.camera.rotation.order = 'XYZ'; G.snap = true; }
  document.body.classList.toggle('cam-cabina', inside);
}
function toggleCam() { G.cam = G.cam === 'cabina' ? 'afuera' : 'cabina'; save.opt.cam = G.cam; persist(); setCam(); }

// Efectos de cada carro: marcas y humo de llantas al derrapar o frenar fuerte, humo y fuego
// del motor cuando está dañado, llama azul del nitro.
function carFx(a, dt) {
  const b = a.body, B = a.car.B;
  const fx = Math.sin(b.h), fz = Math.cos(b.h), lx = Math.cos(b.h), lz = -Math.sin(b.h);
  const hard = !b.air && (b.slide > 2.2 || (b.braking && Math.abs(b.f) > 10 && !a.ai) || (a === G.player && inp.hand && Math.abs(b.f) > 5));
  const k = clamp(Math.max(b.slide / 7, b.braking ? 0.5 : 0, 0.35), 0, 1);
  const tw = B.W / 2 - 0.14, rz = -B.wb / 2;
  const pts = [[b.x + lx * tw + fx * rz, b.z + lz * tw + fz * rz], [b.x - lx * tw + fx * rz, b.z - lz * tw + fz * rz]];
  if (hard && b.skid) for (let i = 0; i < 2; i++) fxSkid(b.skid[i][0], b.skid[i][1], pts[i][0], pts[i][1], 0.24, k);
  b.skid = hard ? pts : null;
  if (hard && b.slide > 3.5 && Math.random() < dt * 14) { const p = pts[Math.random() < 0.5 ? 0 : 1]; fxSmoke(p[0], b.y + 0.3, p[1], 1, 0xd8d8d8, 1.3, 1.4); }
  // motor dañado
  const hp = b.hp / b.hpMax, hx = b.x + fx * (B.L / 2 - 0.7), hz = b.z + fz * (B.L / 2 - 0.7);
  if (hp < 0.45 && Math.random() < dt * (hp < 0.2 ? 14 : 6)) fxSmoke(hx, b.y + B.belt + 0.2, hz, 1, hp < 0.2 ? 0x2a2a2a : 0x8a8a8a, 1.1, 1.6);
  if (hp < 0.18 && Math.random() < dt * (b.dead ? 30 : 12)) fxFire(hx, b.y + B.belt + 0.1, hz, 1, b.dead ? 1.4 : 0.8);
  // nitro: llama azul por el escape
  if (b.boost) { const ex = b.x - fx * (B.L / 2 + 0.2) + lx * 0.4, ez = b.z - fz * (B.L / 2 + 0.2) + lz * 0.4; fxFire(ex, b.y + B.clr + 0.15, ez, 1, 0.55, 0x3f8cff); }
}

// ---------- simulación ----------
function simulate(dt) {
  if (G.mode === 'count') {
    const prev = G.countT; G.countT += dt;
    for (let k = 0; k < 4; k++) if (prev < k * 0.8 + 0.3 && G.countT >= k * 0.8 + 0.3) showCount(k);
    readInput(dt);
    G.player.body.rpm += ((inp.thr ? 4500 : 900) - G.player.body.rpm) * Math.min(1, dt * 6);
    if (G.countT >= 2.7) G.mode = 'play';
    stepTraffic(dt);
    return;
  }
  if (G.mode !== 'play' && G.mode !== 'busted') return;
  if (G.mode === 'play') G.time += dt;
  G.acc += Math.min(dt, 0.05);
  while (G.acc >= STEP) { G.acc -= STEP; physicsStep(STEP); }
  if (G.mode === 'play') rules(dt);
  else { G.endT += dt; if (G.endT > 2.8) finish(G.endWin, G.endWhy); }
}
function stepTraffic(dt) {
  G.acc += Math.min(dt, 0.05);
  while (G.acc >= STEP) { G.acc -= STEP; for (const a of G.traffic) { stepBody(a.body, trafficInput(a.body, a.ai, G.all.map(o => o.body), W.t, STEP), STEP, onEv); collideStatic(a.body, onEv); } }
}
function physicsStep(dt) {
  const bodies = G.all.map(a => a.body);
  for (const a of G.all) {
    const b = a.body;
    let i;
    if (a.player && G.mode === 'play') i = readInput(dt);
    else if (a.player) i = { thr: 0, brk: 1, steer: 0, hand: false, stop: true };
    else if (a.ai.kind === 'trafico') i = trafficInput(b, a.ai, bodies, W.t, dt);
    else if (a.ai.kind === 'policia') {
      if (a.wait > 0) { a.wait -= dt; i = { thr: 0, brk: 1, steer: 0, stop: true }; }
      else if (b.dead) i = { thr: 0, brk: 1, steer: 0, stop: true };
      else i = copInput(b, a.ai, G.thief.body, bodies, W.t, dt);
    } else if (a.ai.kind === 'ladron') i = G.mode === 'busted' ? { thr: 0, brk: 1, steer: 0, stop: true } : thiefInput(b, a.ai, G.player.body, bodies, W.t, dt);
    b.braking = i.brk > 0;
    stepBody(b, i, dt, onEv);
    b.steer = i.steer;
    collideStatic(b, onEv);
  }
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) collideCars(bodies[i], bodies[j], onEv);
}

function onEv(name, d) {
  const P = G.player && G.player.body;
  if (name === 'choque') {
    if (d.c === P) { SFX.hit(d.vn); shake(Math.min(1, d.vn / 10)); if (d.kind === 'pared') W.wallFlash = 1; }
    if (d.vn > 4) fxSparks(d.x, d.c.y + 0.5, d.z, 6 + d.vn * 2, 5);
    checkDead(d.c);
  } else if (name === 'choqueCarro') {
    const involved = d.a === P || d.b === P;
    if (d.imp > 2) {
      if (involved) { SFX.hit(d.imp * 0.8); shake(Math.min(1, d.imp / 12)); }
      fxSparks(d.x, (d.a.y + d.b.y) / 2 + 0.6, d.z, 8 + d.imp * 2, 6);
      // daño: el más liviano sufre más; los patrulleros embisten
      // (los patrulleros tienen defensa: reciben la mitad)
      const dmg = d.imp * 0.8, k = b => b.actor && b.actor.role === 'policia' ? 0.5 : b === G.thief.body ? 1.5 : 1;
      d.a.hp = Math.max(0, d.a.hp - dmg * d.b.mass / (d.a.mass + d.b.mass) * 2 * k(d.a));
      d.b.hp = Math.max(0, d.b.hp - dmg * d.a.mass / (d.a.mass + d.b.mass) * 2 * k(d.b));
      if (d.imp > 9) fxBits(d.x, 0.8, d.z, 3, d.a.actor ? d.a.actor.car.paint.color.getHex() : 0x888888, 6);
      checkDead(d.a); checkDead(d.b);
    }
  } else if (name === 'aterriza') {
    if (d.c === P) {
      if (d.imp > 3) { SFX.thud(d.imp); shake(Math.min(1, d.imp / 8)); fxSmoke(d.c.x, d.c.y + 0.2, d.c.z, 4, 0xbbb2a0, 1.6, 1.4); }
      G.stats.maxJump = Math.max(G.stats.maxJump, d.dist);
      if (d.dist >= 15) unlockAch('salto');
      if (d.dist > 8) toast(`¡Salto de ${Math.round(d.dist)} m!`);
    }
  }
}
function checkDead(b) {
  if (b.dead || b.hp > 0 || !b.actor) return;
  b.dead = true;
  const a = b.actor;
  fxSmoke(b.x, b.y + 1, b.z, 6, 0x333333, 2.2, 3);
  if (a.role === 'policia' && !a.player) { G.wrecked++; a.respawn = 7; unlockAch('chatarra'); if (G.cfg.role === 'ladron') toast('¡Un patrullero quedó fuera de combate!'); }
  if (a === G.player && G.cfg.role === 'policia') endWith(false, 'Tu patrullero quedó destrozado');
  if (a === G.thief && G.cfg.role === 'policia' && G.mode === 'play') endWith(true, '¡El ladrón chocó y quedó atrapado!');
}

// Reglas de la partida: arresto, bolsas, guarida, tiempo, semáforos, puentes y túnel.
function rules(dt) {
  const cfg = G.cfg, D = DIFFS[cfg.diff], T = G.thief.body, P = G.player.body;
  // arresto: un policía pegado y el ladrón casi parado
  let near = 0;
  for (const c of G.cops) { const b = c.body; if (!b.dead && Math.hypot(b.x - T.x, b.z - T.z) < 7.5 && Math.abs(b.y - T.y) < 2) near++; }
  const slow = Math.hypot(T.vx, T.vz) < 8 || T.dead;
  const rate = cfg.role === 'ladron' ? D.arrest : 1.25 / D.arrest;
  if (near && slow) G.bar = Math.min(1, G.bar + dt * 0.42 * Math.pow(near, 0.7) * rate * (T.dead ? 2 : 1));
  else if (near) G.bar = Math.min(1, G.bar + dt * 0.1 * Math.pow(near, 0.7) * rate);   // pegado a toda velocidad también llena, pero lento
  else G.bar = Math.max(0, G.bar - dt * 0.3);
  if (G.bar >= 1) {
    if (cfg.role === 'ladron') return endWith(false, '¡Te atraparon!');
    return endWith(true, '¡Ladrón atrapado!');
  }
  // patrulleros destrozados vuelven a salir más lejos
  for (const c of G.cops) if (!c.player && c.body.dead) {
    c.respawn -= dt;
    if (c.respawn <= 0) { const i = G.all.indexOf(c), j = G.cops.indexOf(c); removeActor(c); const n = spawnCop(T, c.ai.role, cfg.diff); G.all[i] = n; G.cops[j] = n; }
  }
  // bolsas
  for (const b of G.bags) if (!b.got && Math.hypot(b.x - P.x, b.z - P.z) < 3.2) {
    b.got = true; G.got++; W.scene.remove(b.mesh); SFX.bag(); fxSparks(b.x, P.y + 1, b.z, 30, 5);
    toast(`💰 Bolsa ${G.got}/${cfg.n}`);
  }
  // guarida
  if (G.hideout) {
    const who = cfg.role === 'ladron' ? P : T;
    if (Math.hypot(who.x - G.hideout.x, who.z - G.hideout.z) < 7) {
      if (cfg.role === 'ladron') return endWith(true, '¡Llegaste a la guarida!');
      return endWith(false, 'El ladrón llegó a su guarida');
    }
  }
  // tiempo
  if (G.time >= cfg.t) {
    if (cfg.role === 'ladron') {
      if (cfg.goal === 'survive') return endWith(true, '¡Aguantaste!');
      if (cfg.goal === 'bags') return endWith(G.got >= cfg.n, G.got >= cfg.n ? '¡Aguantaste con el botín!' : `Sólo juntaste ${G.got} de ${cfg.n} bolsas`);
      return endWith(false, 'Se acabó el tiempo');
    }
    return endWith(false, 'Se escapó: se acabó el tiempo');
  }
  // semáforos en rojo, puentes, túnel (para las insignias)
  const n = nearestNode(P.x, P.z), dn = Math.hypot(n.x - P.x, n.z - P.z);
  if (dn < 5 && G.lastNode !== n) {
    G.lastNode = n;
    const axis = Math.abs(Math.sin(P.h)) > Math.abs(Math.cos(P.h)) ? 'x' : 'z';
    if (lightState(n, axis, W.t) === 'rojo' && P.f > 5) { G.reds++; save.stats.reds++; if (save.stats.reds >= 10) unlockAch('rojo'); }
  } else if (dn > 12) G.lastNode = null;
  const onB = Math.abs(P.z) < 20 && GRID.some(g => Math.abs(P.x - g) < 7);
  if (onB && !G.onBridge) { G.bridges++; if (G.bridges >= 5) unlockAch('puentes'); }
  G.onBridge = onB;
  if (P.x > HILL.x0 && P.x < HILL.x1 && Math.abs(P.z - 135) < 6 && !G.tunnel) { G.tunnel = true; unlockAch('tunel'); }
  const kmh = Math.abs(P.f) * 3.6;
  G.stats.top = Math.max(G.stats.top, kmh); G.stats.maxBar = Math.max(G.stats.maxBar, G.bar);
  if (kmh > save.stats.top) save.stats.top = kmh;
  if (kmh >= 200) unlockAch('veloz');
}

function endWith(win, why) {
  if (G.mode !== 'play') return;
  G.mode = 'busted'; G.endT = 0; G.endWin = win; G.endWhy = why;
  const busted = G.bar >= 1;
  if (busted) { SFX.bust(); flashScreen(G.cfg.role === 'ladron' ? 'busted' : 'win'); }
  else if (win) SFX.win(); else SFX.lose();
  const big = document.getElementById('big');
  big.textContent = busted ? (G.cfg.role === 'ladron' ? '¡ATRAPADO!' : '¡LO ATRAPASTE!') : win ? '¡LO LOGRASTE!' : why.toUpperCase();
  big.className = 'on ' + (win ? 'win' : 'lose') + (big.textContent.length > 16 ? ' long' : '');
  G.snap = true;
  W.scene.attach(W.camera); W.camera.rotation.order = 'XYZ';
}

// ---------- cámaras ----------
let shakeAmt = 0;
function shake(a) { shakeAmt = Math.max(shakeAmt, a); }
const _v = new THREE.Vector3(), _t = new THREE.Vector3();
function updateCamera(dt) {
  const cam = W.camera;
  shakeAmt = Math.max(0, shakeAmt - dt * 2.5);
  const sh = shakeAmt * 0.06;
  if (G.mode === 'menu') return attractCamera(dt);
  const b = G.player.body;
  if (G.mode === 'busted') {
    // vuelta lenta alrededor del arresto o del final
    const T = G.thief.body, a = G.endT * 0.5;
    _v.set(clamp(T.x + Math.sin(a) * 11, -LIMIT + 3, LIMIT - 3), T.y + 5, clamp(T.z + Math.cos(a) * 11, -LIMIT + 3, LIMIT - 3));
    camClip(_v, T.x, T.y + 1.4, T.z);
    if (G.snap) { cam.position.copy(_v); G.snap = false; }
    cam.position.lerp(_v, Math.min(1, dt * 2)); cam.lookAt(T.x, T.y + 1, T.z);
    return;
  }
  if (G.cam === 'cabina' && cam.parent === G.player.car.body) {
    cam.position.set(G.player.car.eye.x + (Math.random() - 0.5) * sh, G.player.car.eye.y + (Math.random() - 0.5) * sh, G.player.car.eye.z);
    cam.rotation.set(-0.15, Math.PI - b.steer * 0.08, 0, 'YXZ');
    return;
  }
  // atrás del carro, mirando un poco hacia donde va
  const fx = Math.sin(b.h), fz = Math.cos(b.h);
  const vdir = Math.hypot(b.vx, b.vz) > 3 ? Math.atan2(b.vx, b.vz) : b.h;
  const back = 7.5 + Math.min(3, Math.abs(b.f) * 0.04);
  _v.set(b.x - Math.sin(vdir) * back, b.y + 2.9, b.z - Math.cos(vdir) * back);
  if (G.snap) { cam.position.copy(_v); G.snap = false; }
  cam.position.lerp(_v, Math.min(1, dt * 7));
  cam.position.x += (Math.random() - 0.5) * sh * 3; cam.position.y += (Math.random() - 0.5) * sh * 3;
  // que la cámara no atraviese casas ni el cerro: se acerca al carro si algo tapa
  camClip(cam.position, b.x, b.y + 1.4, b.z);
  _t.set(b.x + fx * 5, b.y + 1.1, b.z + fz * 5);
  cam.lookAt(_t);
}

// Recorre la línea del carro a la cámara; si choca con algo sólido, acerca la cámara.
function camClip(p, x, y, z) {
  const dx = p.x - x, dz = p.z - z, L = Math.hypot(dx, dz);
  if (L < 0.5) return;
  const n = Math.ceil(L / 0.4);
  for (let k = 1; k <= n; k++) {
    const f = k / n, px = x + dx * f, pz = z + dz * f, py = y + (p.y - y) * f;
    for (const s of solidsNear(px, pz)) {
      if (s.h < 3) continue;
      if (px > s.x0 - 0.4 && px < s.x1 + 0.4 && pz > s.z0 - 0.4 && pz < s.z1 + 0.4 && py < s.h + 0.3) {
        const t = Math.max(0.18, (k - 1) / n);
        p.x = x + dx * t; p.z = z + dz * t; p.y = Math.max(p.y, y + 0.8);
        return;
      }
    }
  }
}

// ---------- demostración del menú: un ladrón y dos patrulleros manejando solos ----------
function startAttract() {
  clearGame();
  document.getElementById('big').className = '';
  setTimeOfDay(['tarde', 'noche', 'dia'][Math.floor(Math.random() * 3)]);
  G.cfg = { role: 'demo', diff: 'normal' };
  const seg = randomSegment(Math.random, null, 0);
  G.thief = spawnActor(Object.assign({}, carById('muscle'), { color: 0x101010 }), seg.s.x, seg.s.z, seg.s.h, { role: 'ladron' });
  G.all.push(G.thief);
  for (const role of ['chase', 'cut']) { const c = spawnCop(G.thief.body, role, 'normal'); c.ai.diff = 'normal'; G.cops.push(c); G.all.push(c); }
  G.thief.ai = newThief(G.thief.body, 'dificil', null);
  // el ladrón huye del patrullero más cercano
  G.player = null;
  spawnTraffic(20, [G.thief.body]);
  G.attractT = 0; G.shot = -1; G.acc = 0;
}
function attractStep(dt) {
  G.attractT += dt;
  G.acc += Math.min(dt, 0.05);
  const bodies = G.all.map(a => a.body);
  while (G.acc >= STEP) {
    G.acc -= STEP;
    const lead = G.cops.reduce((a, c) => (!a || Math.hypot(c.body.x - G.thief.body.x, c.body.z - G.thief.body.z) < Math.hypot(a.body.x - G.thief.body.x, a.body.z - G.thief.body.z) ? c : a), null);
    for (const a of G.all) {
      const b = a.body;
      let i;
      if (a.ai.kind === 'trafico') i = trafficInput(b, a.ai, bodies, W.t, STEP);
      else if (a.ai.kind === 'policia') i = copInput(b, a.ai, G.thief.body, bodies, W.t, STEP);
      else i = thiefInput(b, a.ai, lead.body, bodies, W.t, STEP);
      stepBody(b, i, STEP, () => {}); b.steer = i.steer; collideStatic(b, () => {});
    }
    for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) collideCars(bodies[i], bodies[j], () => {});
  }
  // si los patrulleros lo alcanzan o se traban, arranca otra persecución
  if (G.attractT > 70) startAttract();
}
function attractCamera(dt) {
  const cam = W.camera, T = G.thief.body;
  const shot = Math.floor(G.attractT / 7) % 4;
  if (shot !== G.shot) {
    G.shot = shot; G.snap = true;
    const fx = Math.sin(T.h), fz = Math.cos(T.h);
    G.shotPos = new THREE.Vector3(T.x + fx * 40 + fz * 7, 1.6, T.z + fz * 40 - fx * 7);
  }
  const fx = Math.sin(T.h), fz = Math.cos(T.h);
  if (shot === 0) _v.set(T.x - fx * 9, T.y + 3.2, T.z - fz * 9);
  else if (shot === 1) _v.copy(G.shotPos);
  else if (shot === 2) _v.set(T.x + fz * 6 - fx * 2, T.y + 1.4, T.z - fx * 6 - fz * 2);
  else _v.set(T.x - fx * 20, T.y + 38, T.z - fz * 20);
  // dentro del túnel, sólo la toma de atrás
  if (T.x > HILL.x0 - 6 && T.x < HILL.x1 + 6 && Math.abs(T.z - 135) < 8) _v.set(T.x - fx * 8, T.y + 2.6, T.z - fz * 8);
  if (G.snap) { cam.position.copy(_v); G.snap = false; }
  cam.position.lerp(_v, Math.min(1, dt * (shot === 1 ? 10 : 4)));
  for (const s of solidsNear(cam.position.x, cam.position.z)) if (cam.position.x > s.x0 && cam.position.x < s.x1 && cam.position.z > s.z0 && cam.position.z < s.z1 && cam.position.y < s.h && s.kind !== 'cerro') cam.position.y = s.h + 1;
  cam.lookAt(T.x + fx * 3, T.y + 0.8, T.z + fz * 3);
}

// ---------- HUD ----------
function hudStatic() {
  const cfg = G.cfg;
  document.getElementById('hName').textContent = cfg.name || (cfg.role === 'ladron' ? 'Ladrón' : 'Policía');
  document.getElementById('hRole').textContent = cfg.role === 'ladron' ? '💰 LADRÓN' : '🚓 POLICÍA';
  document.getElementById('hGoal').textContent = goalText(cfg);
  document.body.classList.toggle('modo-poli', cfg.role === 'policia');
}
function hud() {
  const cfg = G.cfg, P = G.player.body;
  const left = Math.max(0, cfg.t - G.time);
  document.getElementById('hTime').textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
  document.getElementById('hTime').classList.toggle('low', left < 10);
  let extra = '';
  if (cfg.goal === 'bags') extra = `💰 ${G.got}/${cfg.n}`;
  if (G.hideout) extra = `${cfg.role === 'ladron' ? '🏁 Guarida' : '⚠️ Guarida del ladrón'}: ${Math.round(Math.hypot((cfg.role === 'ladron' ? P : G.thief.body).x - G.hideout.x, (cfg.role === 'ladron' ? P : G.thief.body).z - G.hideout.z))} m`;
  if (cfg.role === 'policia') extra = `🎯 Ladrón a ${Math.round(Math.hypot(G.thief.body.x - P.x, G.thief.body.z - P.z))} m` + (G.hideout ? ` · ${extra}` : '');
  document.getElementById('hExtra').textContent = extra;
  const bar = document.getElementById('hBar');
  bar.firstElementChild.style.width = (G.bar * 100) + '%';
  bar.parentElement.classList.toggle('hot', G.bar > 0.01);
  const kmh = Math.abs(P.f) * 3.6;
  document.getElementById('hSpd').textContent = Math.round(kmh);
  document.getElementById('hGear').textContent = P.gear < 0 ? 'R' : P.f < 0.5 && !inp.thr ? 'N' : P.gear + 'ª';
  document.getElementById('gArc').style.strokeDasharray = `${Math.min(245, kmh / 240 * 245)} 400`;
  const hp = P.hp / P.hpMax, gh = document.getElementById('gHp');
  gh.style.strokeDasharray = `${207 * hp} 400`; gh.style.stroke = hp < 0.3 ? '#ff4d4d' : hp < 0.6 ? '#ffc53d' : '#3ddc84';
  document.getElementById('hRing').style.strokeDashoffset = 106.8 * (1 - left / cfg.t);
  const nb = document.getElementById('hNitro'); nb.firstElementChild.style.height = (P.nitro * 100) + '%'; nb.classList.toggle('on', !!P.boost); nb.classList.toggle('low', P.nitro < 0.15);
  document.getElementById('hPct').textContent = G.bar > 0.01 ? Math.round(G.bar * 100) + '%' : '';
  drawRadar();
}

// Radar: calles, patrulleros, ladrón, bolsas y guarida; gira con el carro.
function drawRadar() {
  const cv = document.getElementById('radar'), g = cv.getContext('2d'), S = cv.width, P = G.player.body;
  const k = S / 260, cx = S / 2, cy = S / 2;
  const sh = Math.sin(P.h), ch = Math.cos(P.h);
  const tr = (x, z) => { const dx = x - P.x, dz = z - P.z; return [cx + (dx * -ch + dz * sh) * k, cy - (dx * sh + dz * ch) * k]; };
  g.clearRect(0, 0, S, S);
  g.save(); g.beginPath(); g.arc(cx, cy, S / 2 - 2, 0, 7); g.clip();
  g.fillStyle = 'rgba(12,16,24,0.85)'; g.fillRect(0, 0, S, S);
  // canal
  g.fillStyle = 'rgba(40,110,140,0.6)';
  { const a = tr(-300, -CANAL), b = tr(300, -CANAL), c = tr(300, CANAL), d = tr(-300, CANAL); g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...c); g.lineTo(...d); g.fill(); }
  // cerro
  g.fillStyle = 'rgba(70,120,60,0.8)';
  { const a = tr(HILL.x0, HILL.z0), b = tr(HILL.x1, HILL.z0), c = tr(HILL.x1, HILL.z1), d = tr(HILL.x0, HILL.z1); g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...c); g.lineTo(...d); g.fill(); }
  g.strokeStyle = '#5d6676'; g.lineWidth = ROAD_W * k; g.lineCap = 'square';
  for (const c of GRID) { g.beginPath(); g.moveTo(...tr(c, -231)); g.lineTo(...tr(c, 231)); g.stroke(); g.beginPath(); g.moveTo(...tr(-231, c)); g.lineTo(...tr(231, c)); g.stroke(); }
  // borde rojo
  g.strokeStyle = 'rgba(255,60,60,0.9)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(...tr(-LIMIT, -LIMIT)); g.lineTo(...tr(LIMIT, -LIMIT)); g.lineTo(...tr(LIMIT, LIMIT)); g.lineTo(...tr(-LIMIT, LIMIT)); g.closePath(); g.stroke();
  const dot = (x, z, col, r) => { let [px, py] = tr(x, z); const dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy), lim = S / 2 - 8; if (d > lim) { px = cx + dx / d * lim; py = cy + dy / d * lim; } g.fillStyle = col; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill(); };
  for (const a of G.traffic) dot(a.body.x, a.body.z, 'rgba(200,200,200,0.5)', 2);
  for (const b of G.bags) if (!b.got) dot(b.x, b.z, '#ffd23f', 4.5);
  if (G.hideout) dot(G.hideout.x, G.hideout.z, G.cfg.role === 'ladron' ? '#3ddc84' : '#ff4d4d', 6);
  const blink = Math.floor(W.t * 6) % 2;
  for (const c of G.cops) if (!c.player) dot(c.body.x, c.body.z, c.body.dead ? '#555' : blink ? '#ff3040' : '#3070ff', 5);
  if (G.cfg.role === 'policia') dot(G.thief.body.x, G.thief.body.z, '#ff8a00', 6);
  g.translate(cx, cy);
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(0, 3); g.lineTo(-6, 7); g.closePath(); g.fill();
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, S / 2 - 2, 0, 7); g.stroke();
}

function showCount(k) {
  const el = document.getElementById('count');
  el.innerHTML = `<b>${k < 3 ? 3 - k : '¡YA!'}</b>`;
  SFX.beep(k === 3);
  if (k === 3) setTimeout(() => { if (el.textContent === '¡YA!') el.innerHTML = ''; }, 800);
}
function flashScreen(kind) {
  const f = document.getElementById('flash');
  f.className = 'on ' + kind;
  setTimeout(() => { f.className = ''; }, 900);
}

// ---------- final ----------
function finish(win, why) {
  if (G.mode === 'result') return;
  G.mode = 'result';
  document.getElementById('big').className = '';
  SFX.stopDrive();
  const cfg = G.cfg, D = DIFFS[cfg.diff];
  let coins = 0;
  const lines = [];
  if (win) {
    coins = Math.round(150 * D.reward);
    lines.push(['Meta cumplida', `+${coins}`]);
    const left = Math.max(0, cfg.t - G.time);
    if (cfg.role === 'policia' && left > 0) { const b = Math.round(left * 2 * D.reward); coins += b; lines.push([`Tiempo de sobra (${Math.round(left)} s)`, `+${b}`]); }
    if (cfg.mission && !save.done[cfg.mission]) { const b = Math.round(100 * D.reward); coins += b; lines.push(['Primera vez', `+${b}`]); }
    save.stats.wins++;
    if (cfg.role === 'ladron') { save.stats.thiefWins++; unlockAch('primera'); } else { save.stats.copWins++; save.stats.arrests++; unlockAch('placa'); }
    if (cfg.mission) { save.done[cfg.mission] = true; const prev = save.best[cfg.mission]; save.best[cfg.mission] = prev ? Math.min(prev, G.time) : G.time; }
    if (MISSIONS.every(m => save.done[m.id])) unlockAch('leyenda');
  } else {
    coins = Math.round(25 * D.reward);
    lines.push(['Por intentarlo', `+${coins}`]);
    if (cfg.role === 'ladron' && G.bar >= 1) save.stats.busted++;
  }
  if (G.got) { const b = G.got * 20; coins += b; lines.push([`Bolsas (${G.got})`, `+${b}`]); }
  if (G.wrecked) { const b = G.wrecked * 40; coins += b; lines.push([`Patrulleros destrozados (${G.wrecked})`, `+${b}`]); }
  if (G.reds) lines.push([`Semáforos en rojo`, `${G.reds}`]);
  if (G.stats.maxJump > 5) lines.push(['Salto más largo', `${Math.round(G.stats.maxJump)} m`]);
  // estrellas: ganar, terminar con el motor sano y una tercera según el rol
  const P = G.player.body, hp = P.hp / P.hpMax;
  const s3 = cfg.role === 'ladron' ? G.stats.maxBar < 0.5 : G.time < cfg.t * 0.6;
  const stars = win ? 1 + (hp > 0.5 ? 1 : 0) + (s3 ? 1 : 0) : 0;
  const starWhy = [['Meta cumplida', win], ['Motor sano (más de 50 %)', win && hp > 0.5], [cfg.role === 'ladron' ? 'Nunca casi te atrapan' : 'Atrapado rápido', win && s3]];
  if (cfg.mission && stars > (save.stars[cfg.mission] || 0)) save.stars[cfg.mission] = stars;
  const stats = [['⏱', 'Tiempo', `${Math.floor(G.time / 60)}:${String(Math.floor(G.time % 60)).padStart(2, '0')}`], ['🏎', 'Vel. máx.', `${Math.round(G.stats.top)} km/h`], ['🔧', 'Motor', `${Math.round(hp * 100)} %`]];
  save.coins += coins; save.stats.coins += coins;
  persist();
  showResult({ win, why, coins, lines, stars, starWhy, stats });
}
