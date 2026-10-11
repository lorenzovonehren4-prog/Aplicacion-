'use strict';
// Último Disparo: la partida. Apuntar, mira con zoom, temblor y aliento, el disparo (a quién le
// diste), la cámara de bala, el reloj, los civiles y el fondo del menú y de la armería.

const G = {
  mode: 'menu', L: null, lay: null, enemy: null, hostage: null, civs: [], people: [],
  yaw: 0, pitch: 0, scoped: false, zoom: 4, fov: 55, breath: 3, holding: false, gasp: 0, ts: 1,
  timeLeft: 0, timeTotal: 0, shots: 1, boltT: 0, thermal: false, t: 0, menuT: 0, recoil: 0,
  cam: null, endT: 0, hitInfo: null, rifle: null, stats: null,
};
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
const ray = new THREE.Raycaster();
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const baseFov = () => (window.innerWidth < window.innerHeight ? 68 : 55);
const scopeFov = z => THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(baseFov()) / 2) / z));

// ---------------------------------------------------------------- partículas (chispas y polvo, sin sangre)
const FX = {
  list: [],
  tex: null,
  init() {
    this.tex = canvasTex(64, 64, (x, w, h) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }, false);
  },
  spawn(pos, color, n, speed, life, size, add = false, up = 0.5) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.SpriteMaterial({ map: this.tex, color, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, fog: !add });
      const s = new THREE.Sprite(m); s.position.copy(pos); s.scale.setScalar(size);
      const v = V(Math.random() - 0.5, Math.random() * up, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.3 + Math.random() * 0.7));
      W.scene.add(s);
      this.list.push({ s, v, life, t: 0, size, grow: add ? 0.5 : 2.2 });
    }
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]; p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) { W.scene.remove(p.s); p.s.material.dispose(); this.list.splice(i, 1); continue; }
      p.s.position.addScaledVector(p.v, dt); p.v.multiplyScalar(1 - dt * 2.5); p.v.y -= dt * 0.6;
      p.s.scale.setScalar(p.size * (1 + k * p.grow));
      p.s.material.opacity = 1 - k;
    }
  },
  clear() { for (const p of this.list) { W.scene.remove(p.s); p.s.material.dispose(); } this.list = []; },
};

// objetos sueltos que caen (gorro, pistola)
const Loose = {
  list: [],
  add(obj, vel, spin) {
    const wp = obj.getWorldPosition(V()), wq = obj.getWorldQuaternion(new THREE.Quaternion()), ws = obj.getWorldScale(V());
    obj.parent.remove(obj); W.scene.add(obj);
    obj.position.copy(wp); obj.quaternion.copy(wq); obj.scale.copy(ws);
    this.list.push({ obj, vel, spin, rest: false });
  },
  update(dt) {
    for (const l of this.list) {
      if (l.rest) continue;
      l.vel.y -= 9.8 * dt;
      l.obj.position.addScaledVector(l.vel, dt);
      l.obj.rotation.x += l.spin.x * dt; l.obj.rotation.z += l.spin.z * dt;
      if (l.obj.position.y < 0.06) { l.obj.position.y = 0.06; l.vel.multiplyScalar(-0.3); l.vel.y = Math.abs(l.vel.y) < 0.6 ? 0 : l.vel.y; l.spin.multiplyScalar(0.4); if (l.vel.length() < 0.3) l.rest = true; }
    }
  },
  clear() { for (const l of this.list) W.scene.remove(l.obj); this.list = []; },
};

// ---------------------------------------------------------------- arranque
function initGame() {
  FX.init();
  // rifle en primera persona (se ve cuando no estás mirando por la mira)
  G.rifleHolder = new THREE.Group();
  W.camera.add(G.rifleHolder);
  W.camera.near = 0.05; W.camera.updateProjectionMatrix();
  const lt = new THREE.PointLight(0xffffff, 1.2, 2, 2); lt.position.set(0.3, 0.3, 0.2); W.camera.add(lt);
  setRifle();
  // armería: escena aparte con el rifle girando
  const A = G.arm = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(30, 1, 0.05, 50), rot: 0.6, drag: 0 };
  A.scene.background = new THREE.Color(0x161b21);
  A.scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a3028, 2.4));
  const key = new THREE.DirectionalLight(0xfff0dd, 4.5); key.position.set(1.5, 3, 3); A.scene.add(key);
  const rim = new THREE.DirectionalLight(0x6fb7ff, 4); rim.position.set(-3, 1, -2); A.scene.add(rim);
  const top = new THREE.SpotLight(0xffffff, 40, 8, 0.6, 0.6, 1.5); top.position.set(0, 3, 1); A.scene.add(top);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(3, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x15191e, roughness: 0.6, metalness: 0.3 }));
  floor.position.y = -0.28; A.scene.add(floor);
  A.cam.position.set(0, 0.25, 2.4); A.cam.lookAt(0, 0, 0);
  A.holder = new THREE.Group(); A.scene.add(A.holder);
  setArmRifle(save.weapon);
}
function setRifle() {
  if (G.rifle) G.rifleHolder.remove(G.rifle);
  G.rifle = makeRifle(weaponById(save.weapon));
  G.rifle.scale.setScalar(0.42);
  G.rifle.position.set(0.12, -0.11, -0.2);
  G.rifle.rotation.set(0.02, 0.05, 0);
  G.rifle.traverse(o => { o.renderOrder = 10; if (o.material) { o.material.depthTest = true; } });
  G.rifleHolder.add(G.rifle);
}
function setArmRifle(id) {
  const A = G.arm;
  A.holder.clear();
  const r = makeRifle(weaponById(id));
  r.rotation.y = Math.PI / 2; r.position.x = 0; r.scale.setScalar(1.25);
  const bb = new THREE.Box3().setFromObject(r); const c = bb.getCenter(V()); r.position.sub(c);
  A.holder.add(r);
}

// ---------------------------------------------------------------- personas del nivel
function spawnPeople(L, lay) {
  for (const p of G.people) { W.level.remove(p.root); p.dispose(); }
  G.people = []; G.civs = [];
  const rand = rng(L.n * 31 + 7);
  const hostage = G.hostage = new Person('hostage');
  const enemy = G.enemy = new Person('enemy', { hat: [0x2a2a2e, 0x6b1f1f, 0x1f3b6b, 0x2f4f2f][L.n % 4] });
  hostage.state = 'held'; enemy.state = 'hold';
  for (const p of [hostage, enemy]) { W.level.add(p.root); G.people.push(p); }
  const start = L.mode === 'quieto' ? (rand() - 0.5) * 6 : L.mode === 'vaiven' ? (rand() - 0.5) * 4 : -lay.half + rand() * lay.half * 2;
  G.ai = { x: start, dir: rand() < 0.5 ? -1 : 1, wait: 0.8, peekT: 1.5 + rand(), peek: 0, peekTo: 0, crouch: L.mode === 'vaiven' ? 0.8 : 0.15, alert: false, half: L.mode === 'cubre' ? 7.8 : lay.half };
  placePair(0);
  // civiles
  const paths = lay.civPaths.slice();
  for (let i = paths.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [paths[i], paths[j]] = [paths[j], paths[i]]; }
  for (let i = 0; i < L.civ; i++) {
    const p = new Person('civil');
    const path = paths[i % paths.length];
    p.path = { a: V(path.a[0], 0, path.a[1]), b: V(path.b[0], 0, path.b[1]) };
    p.u = rand();
    p.dirSign = rand() < 0.5 ? 1 : -1;
    p.speed = 1.05 + rand() * 0.5 + L.n * 0.008;
    p.state = 'walk'; p.wait = 0;
    W.level.add(p.root); G.people.push(p); G.civs.push(p);
    civStep(p, 0);
  }
  if (G.thermal) setThermal(true);
}

// El rehén va adelante (hacia la cámara) y el secuestrador detrás, asomándose.
function placePair(dt) {
  const L = G.L, ai = G.ai, lay = G.lay, e = G.enemy, h = G.hostage;
  if (!ai.alert) {
    const sp = L.speed;
    if (L.mode === 'quieto') {
      ai.peekT -= dt; if (ai.peekT <= 0) { ai.peekTo = (Math.random() - 0.5) * 0.7; ai.peekT = 1.5 + Math.random() * 2; }
      h.side = 0; e.side = 0;
    } else if (L.mode === 'vaiven') {
      ai.peekT -= dt;
      if (ai.peekT <= 0) {
        if (ai.peekTo === 0) { ai.peekTo = Math.random() < 0.5 ? -1 : 1; ai.peekT = clamp(2.2 - sp * 0.9, 0.7, 1.8); }
        else { ai.peekTo = 0; ai.peekT = 1.2 + Math.random() * 1.6; }
      }
      // da pasos cortos de un lado a otro
      ai.wait -= dt;
      if (ai.wait <= 0) { ai.x += ai.dir * sp * 0.5 * dt; if (Math.abs(ai.x) > 2.5) { ai.dir *= -1; ai.wait = 1 + Math.random(); } h.side = e.side = ai.dir; }
      else h.side = e.side = 0;
    } else {
      ai.wait -= dt;
      if (ai.wait <= 0) {
        ai.x += ai.dir * sp * dt;
        if (Math.abs(ai.x) >= ai.half) { ai.x = Math.sign(ai.x) * ai.half; ai.dir *= -1; ai.wait = L.mode === 'cubre' ? 0.6 + Math.random() * 1.2 : 0.5; }
        h.side = e.side = ai.dir;
      } else h.side = e.side = 0;
      ai.peekT -= dt; if (ai.peekT <= 0) { ai.peekTo = (Math.random() - 0.5) * 0.8; ai.peekT = 1 + Math.random() * 1.5; }
    }
    ai.peek = lerp(ai.peek, ai.peekTo, 1 - Math.exp(-dt * 5));
    const wantCrouch = L.mode === 'vaiven' ? (ai.peekTo === 0 ? 0.85 : 0.3) : 0.12;
    ai.crouch = lerp(ai.crouch, wantCrouch, 1 - Math.exp(-dt * 4));
  }
  const z = lay.Zt;
  const toCam = tmpV.set(-ai.x, lay.H, -z).setY(0).normalize();
  const right = tmpV2.set(toCam.z, 0, -toCam.x);
  const head = Math.atan2(toCam.x, toCam.z);
  h.pos.set(ai.x, 0, z);
  h.heading = head;
  e.pos.set(ai.x, 0, z).addScaledVector(toCam, -0.36).addScaledVector(right, -ai.peek * 0.22 + 0.06);
  e.heading = head + ai.peek * 0.15;
  e.peek = ai.peek; e.crouch = ai.crouch;
}

function civStep(p, dt) {
  if (p.state === 'run') { p.update(dt); return; }
  if (p.state === 'down' || p.state === 'fall' || p.state === 'cower') { p.update(dt); return; }
  const a = p.path.a, b = p.path.b, len = a.distanceTo(b);
  if (p.wait > 0) { p.wait -= dt; p.state = 'idle'; p.vel.set(0, 0, 0); p.update(dt); return; }
  p.state = 'walk';
  p.u += p.dirSign * p.speed * dt / len;
  if (p.u > 1 || p.u < 0) { p.u = clamp(p.u, 0, 1); p.dirSign *= -1; p.wait = 0.5 + Math.random() * 2; }
  const from = p.dirSign > 0 ? a : b, to = p.dirSign > 0 ? b : a;
  p.pos.lerpVectors(a, b, p.u);
  p.heading = Math.atan2(to.x - from.x, to.z - from.z);
  p.vel.set(0, 0, 0); // la posición la pone el camino
  p.animSpeed = p.speed;
  p.update(dt);
}

function panicCivs(origin) {
  for (const c of G.civs) {
    if (c.state === 'down' || c.state === 'fall') continue;
    const away = c.pos.clone().sub(origin).setY(0);
    if (away.lengthSq() < 0.01) away.set(1, 0, 0);
    away.normalize();
    if (Math.random() < 0.35) { c.state = 'cower'; continue; }
    c.state = 'run'; c.panic = true; c.animSpeed = 0;
    c.vel.copy(away).multiplyScalar(3.6 + Math.random());
    c.heading = Math.atan2(away.x, away.z);
  }
}

// ---------------------------------------------------------------- iniciar una misión
function loadLevel(n) {
  const L = G.L = LEVELS[n - 1];
  FX.clear(); Loose.clear();
  G.lay = buildLevel(L);
  G.menuLevel = null;
  G.stats = gunStats();
  W.camera.position.copy(G.lay.cam);
  spawnPeople(L, G.lay);
  // apuntar cerca del objetivo pero sin regalarlo
  const tx = G.ai.x + (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 6);
  aimAtPoint(V(tx, 1.2, G.lay.Zt + 4));
}
function aimAtPoint(p) {
  const c = W.camera.position, dx = p.x - c.x, dy = p.y - c.y, dz = p.z - c.z;
  G.yaw = Math.atan2(-dx, -dz);
  G.pitch = Math.atan2(dy, Math.hypot(dx, dz));
}
function startMission() {
  const st = G.stats = gunStats();
  G.mode = 'play';
  G.scoped = false; G.zoom = Math.min(4, st.zoomMax); G.fov = baseFov();
  G.breath = st.breath; G.holding = false; G.gasp = 0; G.ts = 1; G.recoil = 0;
  G.timeTotal = G.L.time + st.extraTime; G.timeLeft = G.timeTotal;
  G.shots = st.w.extra === 'silencio' ? 2 : 1; G.boltT = 0;
  G.thermal = false; setThermal(false);
  G.t = 0; G.heartT = 0; G.tickT = 0; G.hitInfo = null; G.missFx = 0;
  G.rifleHolder.visible = true;
  SFX.ambience(G.L.map, true);
  UI.startHud();
}

// ---------------------------------------------------------------- controles
function aimBy(dx, dy) {
  if (G.mode !== 'play') return;
  const k = 0.0021 * save.opt.sens * (G.fov / 55);
  G.yaw -= dx * k; G.pitch -= dy * k;
  G.yaw = clamp(G.yaw, -1.0, 1.0); G.pitch = clamp(G.pitch, -0.9, 0.25);
}
function setScope(on) {
  if (G.mode !== 'play' || on === G.scoped) return;
  G.scoped = on; SFX.scope(on);
  if (!on) { G.holding = false; if (G.thermal) setThermal(false, true); }
  else if (G.thermalWanted && G.stats.w.extra === 'termica') setThermal(true);
  UI.scope(on);
}
function zoomBy(d) {
  if (G.mode !== 'play') return;
  if (!G.scoped) { if (d > 0) setScope(true); return; }
  const z = clamp(G.zoom + d, 2, G.stats.zoomMax);
  if (z !== G.zoom) { G.zoom = z; SFX.zoom(); }
}
function holdBreath(on) {
  if (G.mode !== 'play') return;
  if (on && (!G.scoped || G.gasp > 0 || G.breath < 0.2)) return;
  if (on === G.holding) return;
  G.holding = on;
  if (on) SFX.breathIn(); else SFX.breathOut();
}
function toggleThermal() {
  if (G.mode !== 'play') return;
  if (G.stats.w.extra !== 'termica') { UI.toast('Sólo la Búho T-9 tiene mira térmica'); return; }
  G.thermalWanted = !G.thermalWanted;
  if (G.scoped) setThermal(G.thermalWanted);
  SFX.click();
}
function setThermal(on, keepWanted) {
  G.thermal = on;
  for (const p of G.people) p.thermal(on);
  W.renderer.domElement.classList.toggle('thermal', on);
  if (!on && !keepWanted) G.thermalWanted = false;
}

// ---------------------------------------------------------------- el disparo
function fire() {
  if (G.mode !== 'play' || G.boltT > 0) return;
  G.boltT = 1.1;
  G.recoil = 1;
  const st = G.stats;
  save.stats.shots++;
  SFX.shot(st.w.extra === 'silencio');
  // la bala sale hacia donde está la mira en este instante
  W.camera.rotation.order = 'YXZ';
  W.camera.rotation.set(G.pitch + (G.swY || 0), G.yaw + (G.swX || 0), 0);
  W.camera.updateMatrixWorld();
  const origin = W.camera.getWorldPosition(V());
  const dir = W.camera.getWorldDirection(V());
  ray.set(origin, dir); ray.far = 2000;
  const targets = W.solids.concat(...G.people.map(p => p.meshes));
  const hits = ray.intersectObjects(targets, false);
  let hit = null;
  for (const h of hits) {
    if (h.distance < 3) continue;
    const ud = h.object.userData;
    if (ud.person) { hit = h; break; }
    if (ud.thin && st.w.extra === 'penetra') continue;
    hit = h; break;
  }
  const person = hit && hit.object.userData.person;
  if (person === G.enemy) {
    const head = hit.object.userData.part === 'head';
    save.stats.hits++; if (head) save.stats.heads++;
    startBulletCam(origin, dir, hit, head);
  } else if (person) {
    save.stats.innocents++;
    person.state = 'fall'; person.fallT = 0; person.vel.set(0, 0, 0);
    impactFx(hit.point, false);
    panicCivs(hit.point); SFX.panic();
    endMission(false, 'inocente', 1.6);
  } else {
    if (hit) impactFx(hit.point, true);
    G.shots--;
    if (G.shots > 0) {
      UI.toast('Fallaste… no te escuchó. Te queda 1 tiro');
      UI.hudShots();
    } else {
      alertEnemy();
      if (hit) panicCivs(hit.point);
      SFX.panic();
      endMission(false, 'fallaste', 1.9);
    }
  }
  persist();
}
function impactFx(p, env) {
  FX.spawn(p, 0xfff1b0, 3, 2, 0.18, 0.25, true, 1);
  FX.spawn(p, env ? 0xb9a58a : 0xcfcfcf, env ? 10 : 6, 2.4, 0.9, 0.35, false, 1.2);
  if (env) SFX.ricochet();
}
function alertEnemy() {
  const ai = G.ai; ai.alert = true;
  const dir = ai.x >= 0 ? 1 : -1;
  for (const p of [G.enemy, G.hostage]) {
    p.state = 'run'; p.panic = false;
    p.vel.set(dir * 3.4, 0, -0.6);
    p.heading = Math.atan2(dir, -0.18);
  }
}

// ---------------------------------------------------------------- cámara de bala
function startBulletCam(origin, dir, hit, head) {
  G.mode = 'bulletcam';
  G.scoped = false; UI.scope(false); setThermal(false);
  G.rifleHolder.visible = false;
  const local = hit.object.worldToLocal(hit.point.clone());
  const start = origin.clone().addScaledVector(dir, 1.5).add(V(0, -0.05, 0));
  const dist = start.distanceTo(hit.point);
  G.bc = {
    t: 0, dur: 1.5 + Math.min(1, dist / 250) * 0.7, start, mesh: hit.object, local, head, dist,
    end: hit.point.clone(), side: null, phase: 'fly', after: 0, ringT: 0,
  };
  // la bala
  const b = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({ color: 0xf0c060, metalness: 0.45, roughness: 0.28, emissive: 0x3a2400 });
  const copper = new THREE.MeshStandardMaterial({ color: 0xe08850, metalness: 0.45, roughness: 0.3 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.045, 24), brass); body.rotation.x = Math.PI / 2; b.add(body);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.035, 16), copper); tip.rotation.x = -Math.PI / 2; tip.position.z = -0.04; b.add(tip);
  b.scale.setScalar(1.1);
  const glow = new THREE.PointLight(0xfff0d0, 0.25, 0.8, 2); glow.position.set(0.08, 0.1, -0.02); b.add(glow);
  const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.025, 1, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false, fog: false }));
  W.scene.add(b, trail);
  G.bc.bullet = b; G.bc.trail = trail; G.bc.rings = [];
  G.ts = 0.02;
  SFX.whoosh(G.bc.dur);
  UI.bulletCam(true);
}
function updateBulletCam(dt) {
  const bc = G.bc, cam = W.cine;
  if (bc.phase === 'fly') {
    bc.t += dt;
    const tau = Math.min(1, bc.t / bc.dur);
    const u = tau * 0.35 + (1 - (1 - tau) * (1 - tau)) * 0.65;
    bc.end.copy(bc.mesh.localToWorld(bc.local.clone()));
    const d = bc.end.clone().sub(bc.start); const len = d.length(); d.normalize();
    const pos = bc.start.clone().addScaledVector(d, len * u);
    bc.bullet.position.copy(pos);
    bc.bullet.lookAt(pos.clone().sub(d));
    bc.bullet.rotateZ(bc.t * 30);
    // estela de aire detrás de la bala
    const tl = Math.min(len * u, 14);
    bc.trail.position.copy(pos).addScaledVector(d, -tl / 2);
    bc.trail.scale.set(1, tl, 1);
    bc.trail.quaternion.setFromUnitVectors(V(0, 1, 0), d);
    bc.ringT -= dt;
    if (bc.ringT <= 0) {
      bc.ringT = 0.09;
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.004, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false, fog: false }));
      r.position.copy(pos).addScaledVector(d, -0.05); r.quaternion.setFromUnitVectors(V(0, 0, 1), d);
      W.scene.add(r); bc.rings.push({ r, t: 0 });
    }
    // cámara: atrás y al costado, girando alrededor de la bala; al final se abre para ver el impacto
    const up = V(0, 1, 0), side = V().crossVectors(d, up).normalize();
    if (!bc.side) bc.side = side.clone();
    const ang = tau * 1.4;
    const off = bc.side.clone().applyAxisAngle(d, ang).multiplyScalar(0.13).addScaledVector(up, 0.035).addScaledVector(d, -0.34);
    const chase = pos.clone().add(off);
    const k = clamp((tau - 0.82) / 0.18, 0, 1), e = k * k * (3 - 2 * k);
    const wide = bc.end.clone().addScaledVector(bc.side, 2.6).addScaledVector(up, 0.5).addScaledVector(d, -1.6);
    cam.position.lerpVectors(chase, wide, e);
    const look = pos.clone().addScaledVector(d, 0.9).lerp(bc.end, e);
    cam.lookAt(look);
    cam.fov = lerp(40, 34, e); cam.updateProjectionMatrix();
    if (tau >= 1) hitEnemy();
  } else {
    bc.after += dt;
    // orbita lenta alrededor del secuestrador mientras cae
    const c = G.enemy.chestWorld(V());
    c.y = Math.max(0.4, c.y);
    const a0 = Math.atan2(bc.camStart.x - c.x, bc.camStart.z - c.z) + bc.after * 0.22;
    const r = lerp(bc.camStart.distanceTo(c), 4.2, Math.min(1, bc.after / 2));
    cam.position.set(c.x + Math.sin(a0) * r, lerp(bc.camStart.y, 1.7, Math.min(1, bc.after / 2)), c.z + Math.cos(a0) * r);
    cam.lookAt(c);
    G.ts = bc.after < 0.9 ? 0.3 : lerp(G.ts, 1, 1 - Math.exp(-dt * 2));
    if (bc.after > 3.4 && G.mode === 'bulletcam') { G.mode = 'result'; UI.bulletCam(false); }
  }
  for (let i = bc.rings.length - 1; i >= 0; i--) {
    const o = bc.rings[i]; o.t += dt; o.r.scale.setScalar(1 + o.t * 6); o.r.material.opacity = 0.35 * (1 - o.t / 0.6);
    if (o.t > 0.6) { W.scene.remove(o.r); o.r.geometry.dispose(); o.r.material.dispose(); bc.rings.splice(i, 1); }
  }
}
function hitEnemy() {
  const bc = G.bc, e = G.enemy, h = G.hostage;
  bc.phase = 'after'; bc.after = 0; bc.camStart = W.cine.position.clone();
  W.scene.remove(bc.bullet, bc.trail);
  SFX.impact();
  impactFx(bc.end, false);
  e.state = 'fall'; e.fallT = 0; e.dead = true;
  if (bc.head && e.hat) Loose.add(e.hat, V((Math.random() - 0.5) * 1.5, 2.4, -2.2).applyAxisAngle(V(0, 1, 0), e.heading), V(6, 0, 4));
  if (e.gun) Loose.add(e.gun, V(0.6, 1, 0.8).applyAxisAngle(V(0, 1, 0), e.heading), V(5, 0, 7));
  // el rehén se suelta y corre a salvo
  h.state = 'run'; h.panic = false;
  const away = V(G.ai.x >= 0 ? -1 : 1, 0, 0.9).normalize();
  h.vel.copy(away).multiplyScalar(3.2); h.heading = Math.atan2(away.x, away.z);
  h.cheerIn = 2.2;
  panicCivs(bc.end);
  const head = bc.head;
  const timeOk = G.timeLeft >= G.timeTotal * 0.5;
  const stars = 1 + (head ? 1 : 0) + (timeOk ? 1 : 0);
  G.result = { ok: true, head, timeOk, stars, dist: Math.round(bc.dist), time: G.timeTotal - G.timeLeft };
  finishSuccess();
}
function finishSuccess() {
  const L = G.L, r = G.result;
  const prev = save.lv[L.n];
  const first = !(prev && prev.done);
  r.coins = reward(L, r.stars, first);
  r.first = first;
  r.best = Math.max(r.stars, prev && prev.stars || 0);
  save.lv[L.n] = { done: true, stars: r.best };
  save.coins += r.coins;
  save.stats.missions++;
  if (L.n === LEVELS.length) save.beat = true;
  persist();
  setTimeout(() => { SFX.win(); }, 1400);
}

function endMission(ok, reason, delay) {
  G.mode = 'ending';
  G.endT = delay;
  G.result = { ok, reason };
  if (!ok) { save.stats.fails++; persist(); }
}

// ---------------------------------------------------------------- bucle
function updatePlay(dt) {
  const st = G.stats;
  G.t += dt;
  // aliento: contener la respiración = cámara lenta y casi sin temblor
  if (G.holding) {
    G.breath -= dt;
    G.heartT -= dt; if (G.heartT <= 0) { G.heartT = 0.85; SFX.heart(); }
    if (G.breath <= 0) { G.breath = 0; G.holding = false; G.gasp = 2; SFX.breathOut(); UI.toast('¡Te quedaste sin aire!'); }
  } else {
    if (G.gasp > 0) G.gasp -= dt;
    else G.breath = Math.min(st.breath, G.breath + dt * 0.55);
  }
  G.ts = lerp(G.ts, G.holding ? 0.33 : 1, 1 - Math.exp(-dt * 6));
  // reloj
  G.timeLeft -= dt;
  if (G.timeLeft <= 5 && G.timeLeft > 0) { G.tickT -= dt; if (G.tickT <= 0) { G.tickT = 1; SFX.tick(G.timeLeft < 2.5); } }
  if (G.timeLeft <= 0) {
    G.timeLeft = 0;
    alertEnemy(); panicCivs(G.enemy.pos.clone());
    setScope(false);
    endMission(false, 'tiempo', 2.2);
  }
  if (G.boltT > 0) G.boltT -= dt;
}

function cameraAim(dt) {
  const st = G.stats || gunStats();
  const target = G.scoped ? scopeFov(G.zoom) : baseFov();
  G.fov = lerp(G.fov, target, 1 - Math.exp(-dt * 14));
  W.camera.fov = G.fov; W.camera.updateProjectionMatrix();
  // temblor de la mira: respiración + pulso; se agranda sin aire
  const t = G.t;
  let amp = 0.0042 * st.sway * (G.scoped ? 1 : 0.35);
  if (G.holding) amp *= 0.12;
  if (G.gasp > 0) amp *= 2.2;
  const sx = (Math.sin(t * 0.63) * 0.7 + Math.sin(t * 1.37 + 1) * 0.3 + Math.sin(t * 3.1) * 0.06) * amp;
  const sy = (Math.sin(t * 0.91 + 2) * 0.6 + Math.sin(t * 1.73) * 0.3 + Math.sin(t * 2.7 + 0.5) * 0.08) * amp;
  G.recoil = Math.max(0, G.recoil - dt * 2.6);
  const kick = Math.sin(Math.min(1, G.recoil) * Math.PI) * 0.035 * (G.scoped ? 0.5 : 1);
  G.swX = sx; G.swY = sy;
  W.camera.rotation.order = 'YXZ';
  W.camera.rotation.set(G.pitch + sy + kick, G.yaw + sx, 0);
  // rifle: se esconde al mirar por la mira, retrocede al disparar
  const s = G.scoped ? 1 : 0;
  G.rifleK = lerp(G.rifleK || 0, s, 1 - Math.exp(-dt * 12));
  if (G.rifle) {
    G.rifle.position.set(lerp(0.12, 0, G.rifleK), lerp(-0.11, -0.05, G.rifleK), -0.2 + G.recoil * 0.04 + G.rifleK * 0.06);
    G.rifle.rotation.x = 0.02 + G.recoil * 0.08;
    G.rifleHolder.visible = !G.scoped && G.rifleK < 0.9 && (G.mode === 'play' || G.mode === 'ending' || G.mode === 'brief' || G.mode === 'paused');
  }
}

function updatePeople(dt) {
  const wdt = dt * G.ts;
  if (G.enemy) {
    if (G.enemy.state === 'hold') placePair(wdt);
    G.enemy.update(wdt);
    const h = G.hostage;
    if (h.state === 'run' && h.cheerIn !== undefined) { h.cheerIn -= wdt; if (h.cheerIn <= 0) { h.state = 'cheer'; h.heading = Math.atan2(-h.pos.x, -h.pos.z); h.vel.set(0, 0, 0); } }
    h.update(wdt);
  }
  for (const c of G.civs) civStep(c, wdt);
  FX.update(dt * (G.mode === 'bulletcam' ? Math.max(G.ts, 0.25) : 1));
  Loose.update(wdt);
  for (const f of W.anim) f(dt);
}

function menuCamera(dt) {
  G.menuT += dt;
  const lay = G.lay; if (!lay) return;
  const t = G.menuT;
  W.camera.position.set(Math.sin(t * 0.05) * 3, lay.H, 0);
  W.camera.fov = 26; W.camera.updateProjectionMatrix();
  const p = G.enemy ? G.enemy.pos : V(0, 0, lay.Zt);
  aimAtPoint(V(p.x + 4 + Math.sin(t * 0.08) * 7, 1.4, p.z + Math.cos(t * 0.06) * 3));
  W.camera.rotation.order = 'YXZ';
  W.camera.rotation.set(G.pitch, G.yaw, 0);
  G.rifleHolder.visible = false;
}

let lastT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now;
  if (G.mode === 'armory') {
    const A = G.arm, w = window.innerWidth, h = window.innerHeight;
    if (A.w !== w || A.h !== h) {
      // en vertical el rifle va arriba (el panel ocupa abajo); en horizontal, a la izquierda
      A.w = w; A.h = h; A.cam.aspect = w / h;
      if (w <= 640) { const z = Math.max(2.4, 0.9 / (0.268 * Math.min(1, w / h))); A.cam.position.set(0, 0.15, z); A.cam.lookAt(0, -0.145 * z, 0); }
      else { A.cam.position.set(0, 0.35, 4.2); A.cam.lookAt(0.5, -0.05, 0); }
      A.cam.updateProjectionMatrix();
    }
    if (!A.drag) A.rot += dt * 0.35;
    A.holder.rotation.y = A.rot;
    A.holder.position.y = Math.sin(now / 900) * 0.015;
    W.renderer.render(A.scene, A.cam);
    return;
  }
  if (G.mode === 'paused') { W.renderer.render(W.scene, W.camera); return; }
  if (G.mode === 'menu' || G.mode === 'brief') {
    updatePeople(dt);
    if (G.mode === 'menu') menuCamera(dt);
    else { G.t += dt; cameraAim(dt); }
    W.renderer.render(W.scene, W.camera);
    return;
  }
  if (G.mode === 'play') updatePlay(dt);
  if (G.mode === 'ending') {
    G.endT -= dt;
    if (G.endT <= 0) { G.mode = 'result'; G.scoped = false; G.holding = false; UI.scope(false); setThermal(false); UI.result(G.result); SFX.fail(); }
  }
  updatePeople(dt);
  if (G.mode === 'bulletcam' || (G.mode === 'result' && G.result && G.result.ok)) {
    if (G.mode === 'bulletcam') updateBulletCam(dt);
    else { G.bc.after += dt; const c = G.enemy.chestWorld(V()); c.y = Math.max(0.4, c.y); const a0 = Math.atan2(W.cine.position.x - c.x, W.cine.position.z - c.z) + dt * 0.12; const r = Math.hypot(W.cine.position.x - c.x, W.cine.position.z - c.z); W.cine.position.set(c.x + Math.sin(a0) * r, W.cine.position.y, c.z + Math.cos(a0) * r); W.cine.lookAt(c); }
    if (G.mode === 'result' && !UI.resultShown) UI.result(G.result);
    W.renderer.render(W.scene, W.cine);
  } else {
    cameraAim(dt);
    W.renderer.render(W.scene, W.camera);
  }
  if (G.mode === 'play' || G.mode === 'ending') UI.hud(dt);
}

function skipBulletCam() {
  if (G.mode !== 'bulletcam' || !G.bc) return;
  if (G.bc.phase === 'fly') { G.bc.t = G.bc.dur; updateBulletCam(0); }
  G.bc.after = Math.max(G.bc.after, 3.4);
  G.enemy.fallT = 1; G.enemy.update(0.01);
  G.mode = 'result'; UI.bulletCam(false);
}

// Fondo del menú: el escenario de la próxima misión, con su gente.
function menuScene(n) {
  const L = LEVELS[(n || unlockedUpTo()) - 1];
  if (G.menuLevel !== L.n || !G.lay) {
    G.L = L; FX.clear(); Loose.clear();
    G.lay = buildLevel(L);
    spawnPeople(L, G.lay);
    G.menuLevel = L.n;
  }
  setThermal(false);
  SFX.ambience(L.map, true);
}
