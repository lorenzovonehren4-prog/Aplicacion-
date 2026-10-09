'use strict';
// Carrera: karts, bots, vueltas, sectores, posiciones y efectos (chispas, humo, marcas).

const R = {
  on: false, T: null, def: null, diff: null, laps: 3, mode: 'quick',
  karts: [], player: null, players: [], t: 0, state: 'idle', countdown: 0, finishOrder: [],
  endTimer: 0, prof: null, bestSec: [Infinity, Infinity, Infinity], bestLap: Infinity, events: [],
};

function botLook() {
  const b = BODIES[Math.floor(Math.random() * BODIES.length)];
  const h = HELMETS[Math.floor(Math.random() * HELMETS.length)];
  const g = Math.random() < 0.35 ? GLOWS[1 + Math.floor(Math.random() * (GLOWS.length - 1))] : null;
  return { body: b, helmet: h, rims: RIMS[Math.floor(Math.random() * RIMS.length)], glow: g, num: 2 + Math.floor(Math.random() * 97) };
}

// grid: lista de { name, isPlayer, look } en orden de largada
// format: 'race' (gana el primero en cruzar la meta) o 'best' (gana la mejor vuelta)
function startRace(def, diff, laps, mode, grid, format, time) {
  endRace();
  R.def = def; R.diff = diff; R.laps = laps; R.mode = mode; R.format = format || 'race';
  R.T = buildTrackScene(def, time);
  R.time = time; R.timeT = 0;
  if (time === 'ciclo' && W.day) applyTime(timeAt(0));
  R.prof = speedProfile(R.T, diff.pace);
  R.karts = []; R.players = []; R.finishOrder = []; R.events = [];
  R.rec = { dt: 1 / 30, acc: 0, n: 0, t: [], k: [] };
  R.t = 0; R.state = 'countdown'; R.countdown = 3.6; R.endTimer = 0;
  const pb = save.pb[def.id] || {};
  R.bestSec = (pb.sec || [Infinity, Infinity, Infinity]).map(v => v == null ? Infinity : v);
  R.bestLap = pb.lap || Infinity;
  R.sessSec = [Infinity, Infinity, Infinity];
  R.sessLap = Infinity;
  grid.forEach((g, k) => {
    const slot = gridSlot(R.T, k);
    const mesh = makeKart(g.look);
    W.scene.add(mesh);
    const kart = {
      name: g.name, isPlayer: !!g.isPlayer, look: g.look, mesh,
      p: newPhys(slot.x, slot.z, slot.h), idx: slot.i,
      dist: -slot.back, maxDist: -slot.back, lapsDone: 0, lapStart: 0, secStart: 0, sec: [null, null, null],
      lastLap: null, bestLap: null, finished: false, finishTime: null, pos: k + 1,
      ai: { lane: 0, laneT: 0, err: 1, errT: 0, stuck: 0, mode: '', modeT: 0 }, bump: 0, wrong: 0, draft: 0,
      pid: g.isPlayer ? (g.pid || 0) : -1,
    };
    kart.ai.lane = rand(-0.6, 0.6);
    R.karts.push(kart);
    R.rec.k.push([]);
    if (kart.isPlayer) R.players[kart.pid] = kart;
    poseKart(mesh, kart.p, 0);
  });
  R.players = R.players.filter(Boolean);
  R.player = R.players[0];
  R.on = true;
  FX.reset();
}

function endRace() {
  for (const k of R.karts) W.scene.remove(k.mesh);
  R.karts = []; R.player = null; R.players = []; R.on = false; R.state = 'idle';
  clearTrack();
}

// ---------- controles del bot ----------
// Desplazamiento lateral de un kart respecto del centro de la pista
function latOf(k) { const T = R.T, i = k.idx; return (k.p.x - T.px[i]) * T.nx[i] + (k.p.z - T.pz[i]) * T.nz[i]; }
// Lado interior de la próxima curva (entre 15 y 70 m adelante): +1 derecha, -1 izquierda, 0 si no hay
function insideAhead(T, i) {
  let best = 0, side = 0;
  for (let o = 15; o < 70; o += 3) { const c = T.curv[(i + o) % T.N]; if (Math.abs(c) > best) { best = Math.abs(c); side = Math.sign(c); } }
  return best > 1 / 60 ? side : 0;
}

function botInput(k, dt) {
  const T = R.T, p = k.p, N = T.N, ai = k.ai;
  const v = Math.max(p.fwd, 0);
  const lim = T.hw - 1.0;
  const skill = 1 - R.diff.err * 0.6;          // 0.2 (fácil) … 0.94 (experto)
  const mylat = latOf(k);
  // carril propio: varía un poco
  ai.laneT -= dt;
  if (ai.laneT <= 0) { ai.laneT = rand(2, 5); ai.laneWant = rand(-0.8, 0.8); }
  let want = ai.laneWant || 0, push = 1;
  ai.modeT -= dt;
  if (ai.modeT <= 0) ai.mode = '';
  // ¿quién va adelante y atrás, cerca?
  let ahead = null, behind = null, da = 99, db = 99;
  for (const o of R.karts) {
    if (o === k || Math.abs(o.p.y - p.y) > 1.5) continue;
    const d = o.dist - k.dist;
    if (d > 0 && d < da) { da = d; ahead = o; }
    if (d < 0 && -d < db) { db = -d; behind = o; }
  }
  const inside = insideAhead(T, k.idx);
  if (ahead && da < 16 && !k.finished) {
    const olat = latOf(ahead);
    const closing = v - Math.max(ahead.p.fwd, 0);
    if (Math.abs(olat - mylat) < 1.9 || closing > 0.5) {
      // ataque: por dentro de la próxima curva; si no hay curva, por el lado libre
      if (Math.random() < skill * dt * 1.2 || ai.mode === 'attack') {
        if (ai.mode !== 'attack') { ai.mode = 'attack'; ai.modeT = rand(2, 4); ai.side = inside || (olat > 0 ? -1 : 1); }
        want = ai.side * (lim - 0.3);
        push = 1 + 0.035 * skill;               // frena un poco más tarde cuando ataca
      } else if (Math.abs(olat - mylat) < 1.9 && da < 9) want = olat > mylat ? -2.2 : 2.2;
    }
  }
  // defensa: si alguien viene pegado atrás antes de una curva, cierra el interior
  if (ai.mode !== 'attack' && behind && db < 9 && inside && Math.random() < skill * dt * 2) { ai.mode = 'defend'; ai.modeT = rand(1.5, 2.5); ai.side = inside; }
  if (ai.mode === 'defend') want = ai.side * (lim * 0.55);
  ai.lane = lerp(ai.lane, want, 1 - Math.exp(-dt * (ai.mode ? 2.4 : 1.5)));
  const la = 3.5 + v * 0.42;
  const j = (k.idx + Math.round(la)) % N;
  // al atacar o defender se usa la línea propia (mezclada con la de carrera)
  const base = ai.mode ? T.lineOff[j] * 0.35 : T.lineOff[j];
  const off = clamp(base + ai.lane, -lim, lim);
  const tx = T.px[j] + T.nx[j] * off, tz = T.pz[j] + T.nz[j] * off;
  const dx = tx - p.x, dz = tz - p.z, dl = Math.hypot(dx, dz) || 1;
  const rx = -Math.cos(p.h), rz = Math.sin(p.h);
  const sideways = (dx * rx + dz * rz) / dl;
  // pure pursuit: giro que hace falta para llegar al punto, como fracción del giro máximo
  const sp = Math.max(v, 1.5);
  const yawNeed = sp * 2 * sideways / dl;
  const yawMax = steerLimits(T, k.idx, sp, false).yawMax;
  const frac = clamp(yawNeed / yawMax, -1, 1);
  let steer = Math.sign(frac) * Math.pow(Math.abs(frac), 1 / 1.3);

  // velocidad objetivo según la curva que viene
  ai.errT -= dt;
  if (ai.errT <= 0) { ai.errT = rand(1.5, 4); ai.err = 1 + R.diff.err * rand(-0.07, 0.035); }
  const look = (k.idx + 2 + Math.round(v * 0.12)) % N;
  let vt = Math.min(R.prof[look], R.prof[k.idx]) * ai.err * push;
  // por fuera de la línea ideal se va un poco más lento
  if (ai.mode) vt *= 0.985;
  vt = Math.min(vt, KART.vmax * R.diff.top * (1 + 0.05 * k.draft));
  // goma elástica según la dificultad
  // (en Fácil y Normal los bots esperan a los jugadores si se escapan mucho)
  if (R.players.length && R.diff.band && R.format === 'race') {
    const lead = Math.max(...R.players.map(h => h.dist)), last = Math.min(...R.players.map(h => h.dist));
    const gap = k.dist - lead, [far, slow] = R.diff.band;
    if (gap > far) vt *= slow; else if (gap > far * 0.5) vt *= lerp(1, slow, (gap - far * 0.5) / (far * 0.5));
    else if (k.dist - last < -far * 2) vt *= 1.03;
  }
  if (k.finished) vt *= 0.7;
  let throttle = 0, brake = 0;
  if (v < vt - 0.3) throttle = 1; else if (v < vt + 0.3) throttle = 0.35;
  if (v > vt + 0.9) brake = clamp((v - vt) / 3, 0.2, 1);
  // si quedó trabado contra la barrera, retrocede
  if (R.state === 'race' && p.speed < 1) ai.stuck += dt; else ai.stuck = Math.max(0, ai.stuck - dt * 2);
  if (ai.stuck > 1.5) { throttle = 0; brake = 1; steer = -steer; if (ai.stuck > 3) ai.stuck = 0; }
  return { throttle, brake, steer, handbrake: false };
}

// Rebufo: si vas pegado detrás de otro kart en recta, el aire te frena menos
function updateDraft() {
  for (const k of R.karts) {
    let d = 0;
    for (const o of R.karts) {
      if (o === k || Math.abs(o.p.y - k.p.y) > 1.5) continue;
      const gap = o.dist - k.dist;
      if (gap < 1.5 || gap > 12) continue;
      const dl = Math.abs(latOf(o) - latOf(k));
      if (dl > 1.6) continue;
      d = Math.max(d, (1 - (gap - 1.5) / 10.5) * (1 - dl / 1.6) * (k.p.fwd > 12 ? 1 : 0));
    }
    k.draft = lerp(k.draft, d, 0.2);
  }
}

// ---------- paso de la carrera ----------
function updateRace(dt, inputs) {
  if (!R.on) return;
  const T = R.T;
  if (!Array.isArray(inputs)) inputs = [inputs];
  if (R.state === 'countdown') {
    const before = Math.ceil(R.countdown - 0.6);
    R.countdown -= dt;
    const after = Math.ceil(R.countdown - 0.6);
    if (after !== before && after >= 1) R.events.push({ type: 'beep', n: after });
    if (R.countdown <= 0.6) { R.state = 'race'; R.t = 0; R.events.push({ type: 'go' }); }
  } else if (R.state === 'race' || R.state === 'done') {
    R.t += dt;
  }
  const live = R.state !== 'countdown';
  if (live) updateDraft();
  for (const k of R.karts) {
    let inp;
    const hin = k.isPlayer ? (inputs[k.pid] || inputs[0]) : null;
    if (!live) { k.inp = { throttle: hin ? hin.throttle : 0, brake: 0, steer: 0 }; k.p.vx = k.p.vz = 0; poseKart(k.mesh, k.p, dt); continue; }
    else if (k.isPlayer && !k.finished) inp = Object.assign({}, hin);
    else inp = botInput(k, dt);
    inp.draft = k.draft;
    const res = stepPhys(k.p, inp, dt, T, k.idx);
    k.inp = inp;
    k.idx = res.idx;
    if (res.hit > 2) {
      FX.sparks(k.p.x + T.nx[k.idx] * res.side * 0.7, k.p.z + T.nz[k.idx] * res.side * 0.7, res.hit, k.p.y);
      if (k.isPlayer) R.events.push({ type: 'hit', v: res.hit, pid: k.pid });
    }
    trackProgress(k, T);
  }
  collideKarts(R.karts);
  for (const k of R.karts) {
    if (k.bump > 2 && (k.isPlayer)) R.events.push({ type: 'bump', v: k.bump, pid: k.pid });
    k.bump = 0;
    poseKart(k.mesh, k.p, dt, R.t);
    // humo y marcas al derrapar
    if (k.p.slip > 2.2 && k.p.speed > 5) FX.skid(k, k.p.slip);
  }
  // posiciones
  const order = R.karts.slice().sort(R.format === 'best' ? byBestLap : (a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished) return -1; if (b.finished) return 1;
    return b.dist - a.dist;
  });
  order.forEach((k, i) => {
    if (k.isPlayer && R.state === 'race' && k.pos && i + 1 < k.pos && R.t > 3) R.events.push({ type: 'overtake', pid: k.pid, pos: i + 1 });
    k.pos = i + 1;
  });
  // grabación para la repetición (30 cuadros por segundo)
  if (live && R.state !== 'results') {
    R.rec.acc += dt;
    if (R.rec.acc >= R.rec.dt) {
      R.rec.acc -= R.rec.dt;
      R.rec.t.push(R.t);
      R.karts.forEach((k, i) => { const p = k.p; R.rec.k[i].push(p.x, p.y, p.z, p.h, p.slope, p.roll, p.pitch, p.steer, p.wheelRot); });
    }
  }
  // fin
  if (R.state === 'done') {
    R.endTimer += dt;
    const all = R.karts.every(k => k.finished);
    if (all || R.endTimer > (R.format === 'best' ? 25 : 18)) finishAll();
  }
  // hora que cambia durante la carrera
  if (R.time === 'ciclo' && W.day && R.player && R.state !== 'results') {
    R.timeT -= dt;
    if (R.timeT <= 0) { R.timeT = 0.4; applyTime(timeAt(Math.max(0, R.player.dist) / (R.laps * T.L))); }
  }
  FX.update(dt);
}

function trackProgress(k, T) {
  const c = trackCoords(T, k.p.x, k.p.z, k.idx);
  const prev = ((k.dist % T.L) + T.L) % T.L;
  let d = c.s - prev;
  if (d < -T.L / 2) d += T.L; else if (d > T.L / 2) d -= T.L;
  k.dist += d;
  // sentido contrario
  const fwdDot = Math.sin(k.p.h) * T.tx[k.idx] + Math.cos(k.p.h) * T.tz[k.idx];
  k.wrong = (fwdDot < -0.4 && k.p.speed > 2) ? k.wrong + 1 : 0;
  if (k.dist <= k.maxDist) return;
  const L = T.L, sl = L / 3;
  // sectores cruzados por primera vez
  const fromSec = Math.floor(k.maxDist / sl), toSec = Math.floor(k.dist / sl);
  k.maxDist = k.dist;
  if (R.state === 'countdown') return;
  for (let b = fromSec + 1; b <= toSec; b++) {
    if (b <= 0) { if (b === 0) { k.lapStart = R.t; k.secStart = R.t; } continue; }
    const si = (b - 1) % 3; // sector que se acaba de cerrar
    const st = R.t - k.secStart;
    k.secStart = R.t;
    k.sec[si] = st;
    if (k.isPlayer) onPlayerSector(k, si, st);
    if (b % 3 === 0) {
      // vuelta completa
      const lt = R.t - k.lapStart;
      k.lapStart = R.t;
      k.lapsDone++;
      k.lastLap = lt;
      if (k.bestLap == null || lt < k.bestLap) k.bestLap = lt;
      if (k.isPlayer) onPlayerLap(k, lt);
      if (k.lapsDone >= R.laps && !k.finished) {
        k.finished = true; k.finishTime = R.t;
        R.finishOrder.push(k);
        if (k.isPlayer) {
          R.events.push({ type: 'finish', pid: k.pid, name: k.name, pos: R.format === 'best' ? R.karts.slice().sort(byBestLap).indexOf(k) + 1 : R.finishOrder.length });
          if (R.players.every(h => h.finished)) R.state = 'done';
        }
      } else if (k.isPlayer && k.lapsDone === R.laps - 1) R.events.push({ type: 'lastlap', pid: k.pid });
      if (k.isPlayer) k.sec = [null, null, null];
    }
  }
}

function onPlayerSector(k, si, st) {
  let cls = 'slow';
  if (st < R.bestSec[si]) { R.bestSec[si] = st; cls = 'record'; }
  else if (st < R.sessSec[si]) cls = 'best';
  R.sessSec[si] = Math.min(R.sessSec[si], st);
  k.secCls = k.secCls || [];
  k.secCls[si] = cls;
  R.events.push({ type: 'sector', si, st, cls, pid: k.pid });
}

function onPlayerLap(k, lt) {
  let cls = 'slow';
  if (lt < R.bestLap) { R.bestLap = lt; cls = 'record'; }
  else if (lt < R.sessLap) cls = 'best';
  R.sessLap = Math.min(R.sessLap, lt);
  k.lastCls = cls;
  k.secCls = [];
  R.events.push({ type: 'lap', lt, cls, pid: k.pid, name: k.name });
  // guardar récords de la pista
  const pb = save.pb[R.def.id] || (save.pb[R.def.id] = { lap: null, sec: [null, null, null] });
  if (pb.lap == null || lt < pb.lap) pb.lap = lt;
  pb.sec = R.bestSec.map(v => isFinite(v) ? v : null);
  persist();
}

// En "mejor vuelta" manda el mejor tiempo; sin vuelta completa, la distancia recorrida
function byBestLap(a, b) {
  const la = a.bestLap == null ? Infinity : a.bestLap, lb = b.bestLap == null ? Infinity : b.bestLap;
  if (la !== lb) return la - lb;
  return b.dist - a.dist;
}

function finishAll() {
  if (R.state === 'results') return;
  // los que no llegaron se ordenan por distancia recorrida
  const rest = R.karts.filter(k => !k.finished).sort((a, b) => b.dist - a.dist);
  for (const k of rest) { k.finished = true; k.finishTime = null; R.finishOrder.push(k); }
  if (R.format === 'best') R.finishOrder.sort(byBestLap);
  R.state = 'results';
  R.events.push({ type: 'results' });
}

// Reubica a un jugador en el centro de la pista (tecla R)
function resetPlayer(pid) {
  const k = R.players[pid || 0]; if (!k || R.state !== 'race') return;
  const T = R.T, i = k.idx;
  k.p.x = T.px[i] + T.nx[i] * T.lineOff[i] * 0.5; k.p.z = T.pz[i] + T.nz[i] * T.lineOff[i] * 0.5;
  k.p.h = Math.atan2(T.tx[i], T.tz[i]); k.p.vx = k.p.vz = 0; k.p.yaw = 0;
}

// ---------- efectos ----------
const FX = {
  sparksPts: null, smoke: [], skids: null, skidN: 0, sparkData: [],
  init(scene) {
    // chispas
    const n = 160;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.sparksPts = new THREE.Points(g, new THREE.PointsMaterial({ color: '#FFC24D', size: 0.09, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.sparksPts.frustumCulled = false;
    scene.add(this.sparksPts);
    for (let i = 0; i < n; i++) this.sparkData.push({ life: 0, x: 0, y: -10, z: 0, vx: 0, vy: 0, vz: 0, floor: 0 });
    // humo
    const st = canvasTexture(64, 64, (c, w, h) => { const gr = c.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(230,230,240,.75)'); gr.addColorStop(1, 'rgba(230,230,240,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
    for (let i = 0; i < 40; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false; scene.add(s); this.smoke.push({ s, life: 0 });
    }
    // marcas de frenada (anillo de cuadraditos oscuros)
    const sk = 700;
    this.skids = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.5), new THREE.MeshBasicMaterial({ color: '#0b0b0e', transparent: true, opacity: 0.45, depthWrite: false }), sk);
    this.skids.count = 0; this.skids.frustumCulled = false; scene.add(this.skids);
    this.skidMax = sk;
  },
  reset() {
    for (const d of this.sparkData) d.life = 0;
    for (const s of this.smoke) { s.life = 0; s.s.visible = false; }
    this.skids.count = 0; this.skidN = 0;
  },
  sparks(x, z, power, y) {
    const n = Math.min(24, Math.round(power * 3));
    for (let i = 0, made = 0; i < this.sparkData.length && made < n; i++) {
      const d = this.sparkData[i]; if (d.life > 0) continue;
      d.life = rand(0.2, 0.5); d.x = x; d.y = (y || 0) + 0.3; d.z = z; d.floor = y || 0;
      d.vx = rand(-4, 4); d.vy = rand(1, 4); d.vz = rand(-4, 4); made++;
    }
  },
  _m: new THREE.Matrix4(), _q: new THREE.Quaternion(), _v: new THREE.Vector3(), _s: new THREE.Vector3(1, 1, 1),
  _up: new THREE.Vector3(0, 1, 0), _qx: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2),
  skid(k, slip) {
    k.skidT = (k.skidT || 0) + 1;
    const p = k.p;
    if (k.skidT % 2 === 0) {
      const rx = -Math.cos(p.h), rz = Math.sin(p.h), fx = Math.sin(p.h), fz = Math.cos(p.h);
      for (const sd of [-1, 1]) {
        const x = p.x + rx * 0.6 * sd - fx * 0.64, z = p.z + rz * 0.6 * sd - fz * 0.64;
        const qy = this._q.setFromAxisAngle(this._up, p.h).multiply(this._qx);
        this._v.set(x, p.y + 0.03 + (this.skidN % 50) * 0.00004, z);
        this._m.compose(this._v, qy, this._s);
        this.skids.setMatrixAt(this.skidN % this.skidMax, this._m);
        this.skidN++;
      }
      this.skids.count = Math.min(this.skidN, this.skidMax);
      this.skids.instanceMatrix.needsUpdate = true;
    }
    if (k.skidT % 4 === 0 && slip > 3) {
      const s = this.smoke.find(o => o.life <= 0);
      if (s) { s.life = 1; s.s.visible = true; s.s.position.set(p.x - Math.sin(p.h) * 0.9, p.y + 0.35, p.z - Math.cos(p.h) * 0.9); s.s.scale.setScalar(0.6); }
    }
  },
  update(dt) {
    const pos = this.sparksPts.geometry.attributes.position;
    this.sparkData.forEach((d, i) => {
      if (d.life > 0) {
        d.life -= dt; d.vy -= 12 * dt; d.x += d.vx * dt; d.y = Math.max(d.floor + 0.02, d.y + d.vy * dt); d.z += d.vz * dt;
        pos.setXYZ(i, d.x, d.life > 0 ? d.y : -10, d.z);
      } else pos.setXYZ(i, 0, -10, 0);
    });
    pos.needsUpdate = true;
    for (const s of this.smoke) {
      if (s.life <= 0) continue;
      s.life -= dt * 1.1;
      s.s.position.y += dt * 0.6;
      s.s.scale.setScalar(0.6 + (1 - s.life) * 2.2);
      s.s.material.opacity = Math.max(0, s.life * 0.5);
      if (s.life <= 0) s.s.visible = false;
    }
  },
};
