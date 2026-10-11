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
  add(obj, vel, spin, floor = 0.06) {
    const wp = obj.getWorldPosition(V()), wq = obj.getWorldQuaternion(new THREE.Quaternion()), ws = obj.getWorldScale(V());
    obj.parent.remove(obj); W.scene.add(obj);
    obj.position.copy(wp); obj.quaternion.copy(wq); obj.scale.copy(ws);
    this.list.push({ obj, vel, spin, rest: false, floor });
  },
  update(dt) {
    for (const l of this.list) {
      if (l.rest) continue;
      l.vel.y -= 9.8 * dt;
      l.obj.position.addScaledVector(l.vel, dt);
      l.obj.rotation.x += l.spin.x * dt; l.obj.rotation.z += l.spin.z * dt;
      if (l.obj.position.y < l.floor) { l.obj.position.y = l.floor; l.vel.multiplyScalar(-0.3); l.vel.y = Math.abs(l.vel.y) < 0.6 ? 0 : l.vel.y; l.spin.multiplyScalar(0.4); if (l.vel.length() < 0.3) l.rest = true; }
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
  // gente paseando por el parque (lejos de la línea de tiro)
  for (const path of (lay.parkPaths || [])) {
    const p = new Person('civil');
    p.path = { a: V(path.a[0], 0, path.a[1]), b: V(path.b[0], 0, path.b[1]) };
    p.u = rand(); p.dirSign = rand() < 0.5 ? 1 : -1; p.speed = 0.9 + rand() * 0.4; p.state = 'walk'; p.wait = 0;
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
  if (G.worldRifle) { W.scene.remove(G.worldRifle); G.worldRifle = null; }
  if (POST.on && POST.mats.final) { POST.mats.final.uniforms.speed.value = 0; POST.mats.final.uniforms.ca.value = 0; }
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
  muzzleFx(origin, dir);
  const person = hit && hit.object.userData.person;
  if (person === G.enemy) {
    const head = hit.object.userData.part === 'head';
    save.stats.hits++; if (head) save.stats.heads++;
    startBulletCam(origin, dir, hit, head);
  } else if (person) {
    save.stats.innocents++;
    person.vel.set(0, 0, 0); person.hit(dir, hit.object.userData.part === 'head');
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
// fogonazo, humo y casquillo que sale volando del rifle
let SHELL_GEO = null;
function muzzleFx(origin, dir) {
  const right = V().crossVectors(dir, V(0, 1, 0)).normalize();
  const tip = origin.clone().addScaledVector(dir, G.scoped ? 0.9 : 0.55).addScaledVector(right, G.scoped ? 0 : 0.12).add(V(0, G.scoped ? -0.06 : -0.08, 0));
  FX.spawn(tip, 0xffc56a, 4, 1.4, 0.12, 0.12, true, 0.3);
  FX.spawn(tip.clone().addScaledVector(dir, 0.4), 0xa0a0a0, 8, 0.8, 2.2, 0.1, false, 0.5);
  const fl = new THREE.PointLight(0xffb060, 25, 8, 2); fl.position.copy(tip); W.scene.add(fl);
  let k = 1; const fade = () => { k *= 0.6; fl.intensity = 25 * k; if (k > 0.02) requestAnimationFrame(fade); else W.scene.remove(fl); }; requestAnimationFrame(fade);
  if (!G.scoped && G.rifle) {
    SHELL_GEO = SHELL_GEO || new THREE.CylinderGeometry(0.006, 0.006, 0.05, 10).rotateX(Math.PI / 2);
    const sh = new THREE.Mesh(SHELL_GEO, new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 0.9, roughness: 0.25 }));
    sh.position.set(0.04, 0.03, 0.1); G.rifle.add(sh);
    Loose.add(sh, right.clone().multiplyScalar(2.2).add(V(0, 2.2, 0)).addScaledVector(dir, -0.5), V(14, 0, 9), G.lay.H - 1.75);
  }
  const sc = document.getElementById('scope');
  if (G.scoped && sc) { sc.classList.remove('kick'); void sc.offsetWidth; sc.classList.add('kick'); }
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
// La bala: perfil torneado de un proyectil real (base cónica, cuerpo y punta ojival) con
// camisa de cobre y estrías del cañón; se agranda un poco para que se lea en cámara.
let BULLET_GEO = null, BULLET_MAT = null;
function bulletMesh() {
  if (!BULLET_GEO) {
    const P = [[0, 0], [0.0029, 0], [0.0039, 0.0045], [0.0039, 0.016], [0.0037, 0.02], [0.0032, 0.0245], [0.0024, 0.0285], [0.0014, 0.0315], [0.0005, 0.0333], [0, 0.0338]];
    BULLET_GEO = new THREE.LatheGeometry(P.map(([r, y]) => new THREE.Vector2(r, y)), 32);
    BULLET_GEO.rotateX(-Math.PI / 2); // la punta hacia -Z
    const t = canvasTex(256, 64, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#c56a2c'); g.addColorStop(0.5, '#e89a5a'); g.addColorStop(1, '#b85f25');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(70,30,10,.45)'; x.fillRect(i * w / 6, h * 0.25, 5, h * 0.45); x.fillStyle = 'rgba(255,220,180,.35)'; x.fillRect(i * w / 6 + 5, h * 0.25, 2, h * 0.45); }
    });
    BULLET_MAT = new THREE.MeshPhysicalMaterial({ map: t, metalness: 0.9, roughness: 0.22, clearcoat: 0.5, envMapIntensity: 1.6 });
  }
  const m = new THREE.Mesh(BULLET_GEO, BULLET_MAT);
  m.scale.setScalar(2.2);
  return m;
}
function startBulletCam(origin, dir, hit, head) {
  G.mode = 'bulletcam';
  G.scoped = false; UI.scope(false); setThermal(false);
  G.rifleHolder.visible = false;
  // el rifle en el mundo (apoyado en el parapeto) para ver salir la bala
  if (G.worldRifle) W.scene.remove(G.worldRifle);
  const wr = G.worldRifle = makeRifle(G.stats.w);
  wr.position.copy(origin).add(V(0, -0.14, 0));
  wr.lookAt(wr.position.clone().sub(dir));
  W.scene.add(wr);
  wr.updateMatrixWorld();
  const start = wr.localToWorld(V(0, 0.012, wr.userData.tipZ));
  const local = hit.object.worldToLocal(hit.point.clone());
  const dist = start.distanceTo(hit.point);
  G.bc = {
    t: 0, dur: 1.9 + Math.min(1, dist / 250) * 0.8, start, mesh: hit.object, local, head, dist, dir: dir.clone(),
    end: hit.point.clone(), side: null, phase: 'fly', after: 0, ringT: 0, puffT: 0, stop: 0, shake: 0,
  };
  // fogonazo, humo y anillo de humo en la boca del cañón
  FX.spawn(start, 0xffd27a, 6, 1.2, 0.5, 0.18, true, 0.4);
  FX.spawn(start, 0xfff6d8, 2, 0.2, 0.3, 0.18, true, 0.1);
  FX.spawn(start.clone().addScaledVector(dir, 0.3), 0x9a9a9a, 14, 0.7, 6, 0.12, false, 0.3);
  const flash = new THREE.PointLight(0xffc070, 30, 6, 2); flash.position.copy(start); W.scene.add(flash);
  const b = bulletMesh();
  const wake = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.5, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xdfefff, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  wake.geometry.rotateX(Math.PI / 2); wake.geometry.translate(0, 0, 0.25);
  W.scene.add(b, wake);
  G.bc.bullet = b; G.bc.wake = wake; G.bc.rings = []; G.bc.flash = flash;
  G.ts = 0.02;
  SFX.whoosh(G.bc.dur);
  UI.bulletCam(true);
}
function updateBulletCam(dt) {
  const bc = G.bc, cam = W.cine;
  const PF = POST.on && POST.mats.final ? POST.mats.final.uniforms : null;
  if (bc.flash) { bc.flash.intensity *= Math.exp(-dt * 18); if (bc.flash.intensity < 0.05) { W.scene.remove(bc.flash); bc.flash = null; } }
  if (bc.phase === 'fly') {
    bc.t += dt;
    const tau = Math.min(1, bc.t / bc.dur);
    // recorrido: rápido al salir, lento al acercarse (pero sin detenerse)
    // al principio sale despacio del cañón (para verla salir), después vuela y frena al llegar
    const t1 = clamp((tau - 0.1) / 0.9, 0, 1);
    const u0 = Math.min(0.6 / Math.max(1, bc.dist), 0.01);
    const u = tau < 0.1 ? u0 * tau / 0.1 : u0 + (1 - u0) * (t1 * 0.3 + (1 - Math.pow(1 - t1, 2.4)) * 0.7);
    bc.end.copy(bc.mesh.localToWorld(bc.local.clone()));
    const d = bc.end.clone().sub(bc.start); const len = d.length(); d.normalize();
    const pos = bc.start.clone().addScaledVector(d, len * u);
    bc.bullet.position.copy(pos);
    bc.bullet.lookAt(pos.clone().sub(d));
    bc.bullet.rotateZ(bc.t * 40);
    bc.wake.position.copy(pos); bc.wake.quaternion.copy(bc.bullet.quaternion);
    const up = V(0, 1, 0), side = V().crossVectors(d, up).normalize();
    if (!bc.side) bc.side = side.clone();
    // estela de aire en espiral (partículas) y ondas de choque
    bc.puffT -= dt;
    if (bc.puffT <= 0) {
      bc.puffT = 0.012;
      const a = bc.t * 26;
      for (const ph of [0, Math.PI]) {
        const off = bc.side.clone().applyAxisAngle(d, a + ph).multiplyScalar(0.012);
        FX.spawn(pos.clone().add(off).addScaledVector(d, -0.03), 0xeaf4ff, 1, 0.02, 1.1, 0.012, true, 0);
      }
    }
    bc.ringT -= dt;
    if (bc.ringT <= 0) {
      bc.ringT = 0.07;
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0025, 6, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false, fog: false }));
      r.position.copy(pos).addScaledVector(d, -0.04); r.quaternion.setFromUnitVectors(V(0, 0, 1), d);
      W.scene.add(r); bc.rings.push({ r, t: 0 });
    }
    // cámara: sale al lado del cañón, persigue la bala girando a su alrededor y al final se abre
    const k0 = clamp((tau - 0.08) / 0.12, 0, 1), e0 = k0 * k0 * (3 - 2 * k0);
    const ang = Math.PI * 0.15 + tau * Math.PI * 1.1;
    const chase = pos.clone().add(bc.side.clone().applyAxisAngle(d, ang).multiplyScalar(0.085)).addScaledVector(up, 0.012).addScaledVector(d, -0.09);
    const muzzle = bc.start.clone().addScaledVector(bc.side, 0.42).addScaledVector(up, 0.1).addScaledVector(d, -0.75);
    const k = clamp((tau - 0.8) / 0.2, 0, 1), e = k * k * (3 - 2 * k);
    const wide = bc.end.clone().addScaledVector(bc.side, 2.2).addScaledVector(up, 0.35).addScaledVector(d, -1.4);
    const p0 = muzzle.lerp(chase, e0);
    cam.position.lerpVectors(p0, wide, e);
    const look = pos.clone().addScaledVector(d, 0.6 * (1 - e0) + 0.02).lerp(bc.end, e);
    cam.lookAt(look);
    cam.fov = lerp(lerp(30, 42, e0), 32, e); cam.updateProjectionMatrix();
    if (PF) { PF.speed.value = 0.03 * e0 * (1 - e); PF.ca.value = 0.0011 * (1 - e * 0.7); }
    if (tau >= 1) hitEnemy();
  } else {
    // pausa de impacto: todo se congela un instante
    if (bc.stop > 0) { bc.stop -= dt; dt = 0; }
    bc.after += dt;
    bc.shake = Math.max(0, bc.shake - dt * 2.2);
    if (PF) { PF.speed.value = 0; PF.ca.value = 0.0025 * bc.shake; }
    // órbita lenta alrededor del secuestrador mientras cae
    const c = G.enemy.chestWorld(V());
    c.y = Math.max(0.4, c.y);
    const a0 = Math.atan2(bc.camStart.x - c.x, bc.camStart.z - c.z) + bc.after * 0.2;
    const r = lerp(bc.camStart.distanceTo(c), 4.0, Math.min(1, bc.after / 2.2));
    const sh = bc.shake * bc.shake * 0.05;
    cam.position.set(c.x + Math.sin(a0) * r + (Math.random() - 0.5) * sh, lerp(bc.camStart.y, 1.6, Math.min(1, bc.after / 2.2)) + (Math.random() - 0.5) * sh, c.z + Math.cos(a0) * r);
    cam.lookAt(c);
    cam.fov = lerp(cam.fov, 38, 1 - Math.exp(-dt * 2)); cam.updateProjectionMatrix();
    G.ts = bc.stop > 0 ? 0 : bc.after < 1.0 ? 0.28 : lerp(G.ts, 1, 1 - Math.exp(-dt * 2));
    if (bc.after > 3.6 && G.mode === 'bulletcam') { G.mode = 'result'; UI.bulletCam(false); }
  }
  for (let i = bc.rings.length - 1; i >= 0; i--) {
    const o = bc.rings[i]; o.t += dt; o.r.scale.setScalar(1 + o.t * 7); o.r.material.opacity = 0.3 * (1 - o.t / 0.5);
    if (o.t > 0.5) { W.scene.remove(o.r); o.r.geometry.dispose(); o.r.material.dispose(); bc.rings.splice(i, 1); }
  }
}
function hitEnemy() {
  const bc = G.bc, e = G.enemy, h = G.hostage;
  bc.phase = 'after'; bc.after = 0; bc.camStart = W.cine.position.clone(); bc.stop = 0.12; bc.shake = 1;
  W.scene.remove(bc.bullet, bc.wake);
  SFX.impact();
  // impacto sin sangre: destello, polvo y pedacitos de tela oscura
  FX.spawn(bc.end, 0xfff1c0, 4, 1.5, 0.25, 0.22, true, 1);
  FX.spawn(bc.end, 0xcfcfcf, 10, 2.2, 1.4, 0.18, false, 1.2);
  FX.spawn(bc.end, 0x2a2a2e, 14, 3.2, 1.6, 0.035, false, 1.4);
  e.hit(bc.dir, bc.head); e.dead = true;
  if (bc.head && e.hat) Loose.add(e.hat, V((Math.random() - 0.5) * 1.2, 2.6, 0).addScaledVector(bc.dir, 3), V(7, 0, 5));
  if (e.gun) Loose.add(e.gun, V(0.6, 1.4, 0.8).applyAxisAngle(V(0, 1, 0), e.heading), V(6, 0, 8));
  // el rehén se agacha del susto, después corre a salvo y festeja
  h.state = 'cower'; h.cowerT = 0.8; h.panic = false;
  const away = V(G.ai.x >= 0 ? -1 : 1, 0, 0.9).normalize();
  h.runDir = away;
  h.cheerIn = 2.4;
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
    if (h.state === 'cower' && h.cowerT !== undefined) { h.cowerT -= wdt; if (h.cowerT <= 0) { h.cowerT = undefined; h.state = 'run'; h.vel.copy(h.runDir).multiplyScalar(3.2); h.heading = Math.atan2(h.runDir.x, h.runDir.z); } }
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
  const dt = G.freeze ? 0 : Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now;
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
    renderFrame(A.scene, A.cam);
    return;
  }
  if (G.mode === 'paused') { renderFrame(W.scene, W.camera); return; }
  if (G.mode === 'menu' || G.mode === 'brief') {
    updatePeople(dt);
    if (G.mode === 'menu') menuCamera(dt);
    else { G.t += dt; cameraAim(dt); }
    renderFrame(W.scene, W.camera);
    return;
  }
  const cine = step(dt);
  renderFrame(W.scene, cine ? W.cine : W.camera);
  if (G.mode === 'play' || G.mode === 'ending') UI.hud(dt);
}

// Avanza la partida dt segundos (sin dibujar). Devuelve true si se ve por la cámara de cine.
function step(dt) {
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
    return true;
  }
  cameraAim(dt);
  return false;
}

function skipBulletCam() {
  if (G.mode !== 'bulletcam' || !G.bc) return;
  if (G.bc.phase === 'fly') { G.bc.t = G.bc.dur; updateBulletCam(0); }
  G.bc.after = Math.max(G.bc.after, 3.4); G.bc.stop = 0; G.bc.shake = 0;
  for (let i = 0; i < 60; i++) G.enemy.update(0.05);
  if (POST.on && POST.mats.final) { POST.mats.final.uniforms.speed.value = 0; POST.mats.final.uniforms.ca.value = 0; }
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
