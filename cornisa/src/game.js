'use strict';
// Drive In The Serrín: partida. Entrada, bucle principal, cámaras, monedas, rocas, meta, caída y resultado.

const G = {
  mode: 'boot',          // boot | menu | count | drive | fall | finish | pause | result
  L: null, T: null, C: null, car: null, st: null,
  t: 0, time: 0, coins: 0, countT: 0, endT: 0, coinIdx: 0, last: 0, acc: 0,
  cam: 'cabina', fallCam: null, menuAng: 0, menuLevel: 0, menuView: 'menu', failWhy: '',
};
const KEYS = {};
const TOUCH = { left: false, right: false, gas: false, brake: false };
const STEP = 1 / 120;

function curStats() { return carStats(save.upg); }

// ---------- entrada ----------
const inp = { thr: 0, brk: 0, steer: 0 };
function readInput(dt) {
  const L = KEYS.ArrowLeft || KEYS.KeyA || TOUCH.left, R = KEYS.ArrowRight || KEYS.KeyD || TOUCH.right;
  const target = (R ? 1 : 0) - (L ? 1 : 0);
  const sens = save.opt.sens || 1;
  // al girar sube de a poco; al soltar vuelve rápido al centro
  const rate = target === 0 || Math.sign(target) !== Math.sign(inp.steer) ? 6.5 : 2.6 * sens;
  const d = target - inp.steer;
  inp.steer += Math.sign(d) * Math.min(Math.abs(d), rate * dt);
  inp.thr = KEYS.ArrowUp || KEYS.KeyW || TOUCH.gas ? 1 : 0;
  inp.brk = KEYS.ArrowDown || KEYS.KeyS || KEYS.Space || TOUCH.brake ? 1 : 0;
  return inp;
}

// ---------- partida ----------
function loadLevel(L) {
  G.L = L;
  G.T = buildLevel(L);
  if (!G.car) { G.car = makeCar(save.paint); }
  setCarPaint(G.car, save.paint);
  W.scene.add(G.car.root);
  G.st = curStats();
  G.C = newCarState(G.T, G.st);
  const dark = W.theme.night || W.theme.rain || L.theme === 'niebla' || W.theme.lava;
  G.car.lamp.intensity = dark ? (W.theme.night ? 260 : 90) : 0;
  G.car.dashLight.intensity = W.theme.night ? 0.6 : W.theme.rain ? 0.25 : 0;
  poseCar(G.car, G.C, 0);
  G.car.root.traverse(o => { if (o.isMesh && o.castShadow !== undefined) o.receiveShadow = false; });
}

function startRun(L) {
  fxClear();
  if (G.car) resetCarLook(G.car);
  document.getElementById('crack').classList.remove('on');
  if (!G.T || G.L !== L || L.free || G.T.broken) loadLevel(L);
  else {
    // reiniciar la misma montaña sin volver a armarla
    G.st = curStats();
    G.C = newCarState(G.T, G.st);
    for (const c of G.T.coins) { c.got = false; c.pop = 0; }
  }
  G.time = 0; G.coins = 0; G.coinIdx = 0; G.endT = 0; G.fallCam = null;
  for (const c of G.T.coins) { c.got = false; c.pop = 0; }
  for (const rk of G.T.rocks) rk.cool = 0;
  inp.steer = 0;
  G.prof = speedProfile(G.T, G.st);
  setLineSpeeds(G.prof);
  W.line.material.uniforms.uOn.value = save.opt.line === false ? 0 : 1;
  G.noteIdx = 0; G.noteSaid = -1; G.slow = 1; G.crashCam = null;
  G.mode = 'count'; G.countT = 0;
  G.cam = save.opt.cam || 'cabina';
  setCam();
  save.stats.runs++; persist();
  showScreen('hud');
  document.body.classList.add('driving');
  hudStatic();
  SFX.init();
}

function setCam() {
  const cam = W.camera;
  document.body.classList.toggle('cam-afuera', G.cam === 'afuera' && G.mode !== 'menu');
  if (G.cam === 'cabina' && (G.mode === 'count' || G.mode === 'drive' || G.mode === 'pause')) {
    G.car.body.add(cam);
    cam.position.copy(EYE);
    cam.rotation.set(-0.22, Math.PI, 0, 'YXZ');
    G.car.cockpit.visible = true;
  } else {
    W.scene.attach(cam);
    cam.rotation.order = 'XYZ';
    G.snap = true;     // la cámara de afuera aparece de una vez detrás del carro
  }
  const lbl = document.getElementById('camLbl');
  if (lbl) lbl.textContent = G.cam === 'cabina' ? 'cabina' : 'afuera';
}

function toggleCam() {
  G.cam = G.cam === 'cabina' ? 'afuera' : 'cabina';
  save.opt.cam = G.cam; persist();
  setCam();
}

function simulate(dt) {
  const C = G.C, T = G.T;
  if (G.mode === 'count') {
    const prev = G.countT;
    G.countT += dt;
    for (let k = 0; k < 4; k++) if (prev < k * 0.85 + 0.3 && G.countT >= k * 0.85 + 0.3) showCount(k);
    const i = readInput(dt);
    C.rpm += ((i.thr ? 4200 : 900) - C.rpm) * Math.min(1, dt * 6);
    if (G.countT >= 3 * 0.85 + 0.3) G.mode = 'drive';
    return;
  }
  if (G.mode === 'drive' || G.mode === 'fall' || G.mode === 'crash') {
    G.time += G.mode === 'drive' ? dt : 0;
    // cámara lenta al principio del choque o la caída
    if (G.mode !== 'drive') { G.slowT = (G.slowT || 0) + dt; dt *= G.slowT < 1.3 ? 0.35 : 1; } else G.slowT = 0;
    G.acc += dt;
    while (G.acc >= STEP) {
      G.acc -= STEP;
      const i = G.mode === 'drive' ? readInput(STEP) : { thr: 0, brk: 0, steer: 0 };
      stepCar(C, i, T, G.st, STEP, onCarEvent);
      C.steer = inp.steer;
      if (G.mode === 'drive') { pickCoins(); hitRocks(); }
    }
    if (G.mode === 'drive') {
      if (C.s >= T.n - 45) { G.mode = 'finish'; G.endT = 0; onFinish(); }
      save.stats.top = Math.max(save.stats.top, C.f * 3.6);
      if (C.f * 3.6 >= 180) unlockAch('veloz');
    }
    if (G.mode === 'fall' && C.fallT > 3.2) endRun(false, 'Te caíste al abismo');
    if (G.mode === 'crash' && C.crashT > 3.6) endRun(false, 'Chocaste y el carro quedó destrozado');
    return;
  }
  if (G.mode === 'finish') {
    G.endT += dt;
    G.acc += dt;
    while (G.acc >= STEP) { G.acc -= STEP; stepCar(C, { thr: 0, brk: 0.6, steer: 0 }, T, G.st, STEP, () => {}); C.steer *= 0.98; }
    if (G.endT > 2.6) endRun(true);
  }
}

function onCarEvent(name, v) {
  const C = G.C;
  if (name === 'choque') {
    SFX.hit(v.vn);
    flashHit();
    if (v.vn > 2.4) shake(Math.min(1, v.vn / 8));
    const si = Math.min(G.T.n - 1, Math.round(C.s)), sg = v.side ? 1 : -1;
    fxSparks(C.x + G.T.nx[si] * sg * 0.9, C.y + 0.5, C.z + G.T.nz[si] * sg * 0.9, 10 + v.vn * 6, 5);
  } else if (name === 'crash') {
    G.mode = 'crash';
    save.stats.crashes = (save.stats.crashes || 0) + 1; persist();
    SFX.crash(v.vn);
    shake(1); flashHit();
    document.getElementById('warn').classList.remove('on');
    const w = wreckCar(G.car, Math.min(1.5, v.vn / 8));
    fxSparks(C.x, C.y + 0.6, C.z, 120, 9);
    fxSmoke(C.x, C.y + 0.8, C.z, 8, 0x8a7a6a, 2.2, 2.5);
    const paint = G.car.paint, glass = new THREE.MeshStandardMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.7, roughness: 0.1 });
    const blk = new THREE.MeshStandardMaterial({ color: 0x1b1b1d });
    fxBits(C.x, C.y + 0.8, C.z, 16, [paint, glass, blk, glass], 7 + v.vn * 0.4);
    if (w) fxDebris(w.wheel, w.pos.x, w.pos.y, w.pos.z, C.vx * 0.8 + (Math.random() - 0.5) * 6, 4 + Math.random() * 3, C.vz * 0.8 + (Math.random() - 0.5) * 6);
    FX.emit.push({ every: 0.12, col: 0x2a2a2a, size: 1.8, at: () => ({ x: G.C.x, y: G.C.y + 1.1, z: G.C.z }) });
    // en la cabina primero se raja el parabrisas, luego la cámara sale afuera
    if (G.cam === 'cabina') {
      document.getElementById('crack').classList.add('on');
      setTimeout(() => { if (G.mode === 'crash') { document.getElementById('crack').classList.remove('on'); crashCamera(); } }, 650);
    } else crashCamera();
  } else if (name === 'baranda') {
    breakGuard(G.T, v.s, v.side, C.vx, C.vz);
    G.T.broken = true;
    SFX.crash(v.vn * 0.7);
    fxSparks(C.x, C.y + 0.6, C.z, 80, 8);
    shake(1);
  } else if (name === 'caida') {
    G.mode = 'fall';
    SFX.fall();
    save.stats.falls++; persist();
    if (save.stats.falls >= 10) unlockAch('caidas');
    // cámara quieta en el borde que mira cómo cae
    const C = G.C, T = G.T, si = Math.min(T.n - 1, Math.round(C.s));
    const sg = C.d < 0 ? -1 : 1;
    const back = Math.max(0, si - 10);
    G.snap = true;
    G.fallCam = new THREE.Vector3(T.x[back] + T.nx[back] * sg * (T.hw * 0.2), T.y[back] + 4.5, T.z[back] + T.nz[back] * sg * (T.hw * 0.2));
    W.scene.attach(W.camera);
    W.camera.rotation.order = 'XYZ';
    document.getElementById('warn').classList.remove('on');
  } else if (name === 'golpe') {
    SFX.thud(v.v);
    fxSmoke(C.x, C.y, C.z, 3, G.T.L.theme === 'nieve' ? 0xffffff : 0xb9a58a, 2.4, 2);
    if (v.v > 5) fxBits(C.x, C.y + 0.5, C.z, 3, [G.car.paint], 5);
    if (G.mode === 'fall') shake(0.6);
  }
}

function crashCamera() {
  const C = G.C;
  W.scene.attach(W.camera);
  W.camera.rotation.order = 'XYZ';
  G.snap = true;
  const p = roadPoint(G.T, C.s - 9, 0);
  G.crashCam = new THREE.Vector3(p.x, C.y + 3.2, p.z);
}

function pickCoins() {
  const C = G.C, coins = G.T.coins;
  while (G.coinIdx < coins.length && coins[G.coinIdx].s < C.s - 4) G.coinIdx++;
  for (let j = G.coinIdx; j < coins.length && coins[j].s < C.s + 3; j++) {
    const c = coins[j];
    if (!c.got && Math.abs(c.s - C.s) < 2.2 && Math.abs(c.d - C.d) < 1.35) {
      c.got = true; c.pop = 0; G.coins++;
      SFX.coin();
      document.getElementById('hCoins').textContent = G.coins;
    }
  }
}

function hitRocks() {
  const C = G.C;
  for (const rk of G.T.rocks) {
    if (rk.s > C.s + 4) break;
    if (rk.s < C.s - 4) continue;
    const ds = rk.s - C.s, dd = rk.d - C.d;
    if (Math.abs(ds) < rk.rad + 2 && Math.abs(dd) < rk.rad + 0.85 && !(rk.cool > G.time)) {
      rk.cool = G.time + 1.2;
      const v = Math.abs(C.f);
      const si0 = Math.min(G.T.n - 1, Math.round(C.s));
      if (v > 22) { startCrash(C, dd > 0 ? 1 : -1, G.T.nx[si0] * (dd > 0 ? 1 : -1), G.T.nz[si0] * (dd > 0 ? 1 : -1), v * 0.35, onCarEvent); return; }
      C.hp -= (8 + v * 0.65) * G.st.armor;
      C.hits++;
      const keep = 0.4;
      C.vx *= keep; C.vz *= keep;
      // empuja de costado, lejos de la roca
      const si = Math.min(G.T.n - 1, Math.round(C.s)), sg = dd > 0 ? -1 : 1;
      C.vx += G.T.nx[si] * sg * 2.5; C.vz += G.T.nz[si] * sg * 2.5;
      SFX.hit(v * 0.6 + 3); flashHit(); shake(0.8);
      fxSparks(rk.x, C.y + 0.5, rk.z, 30, 6); fxBits(rk.x, C.y + 0.4, rk.z, 4, [W.rockMeshes[0].material], 5);
      if (C.hp <= 0) { startCrash(C, 1, G.T.nx[si0], G.T.nz[si0], 6, onCarEvent); return; }
    }
  }
}

let shakeAmt = 0;
function shake(a) { shakeAmt = Math.max(shakeAmt, a); }
function flashHit() {
  const v = document.getElementById('vign');
  v.classList.add('hit');
  clearTimeout(flashHit.t); flashHit.t = setTimeout(() => v.classList.remove('hit'), 220);
}

function showCount(k) {
  const el = document.getElementById('count');
  el.innerHTML = `<b>${k < 3 ? 3 - k : '¡YA!'}</b>`;
  SFX.beep(k === 3);
  if (k === 3) setTimeout(() => { if (el.textContent === '¡YA!') el.innerHTML = ''; }, 800);
}

function onFinish() {
  SFX.win();
  G.snap = true;
  W.scene.attach(W.camera);
  W.camera.rotation.order = 'XYZ';
  document.getElementById('warn').classList.remove('on');
}

// ---------- cámaras ----------
const _cv = new THREE.Vector3(), _ct = new THREE.Vector3();
function updateCamera(dt) {
  const C = G.C, cam = W.camera;
  if (!C) return;
  shakeAmt = Math.max(0, shakeAmt - dt * 2.5);
  const sh = shakeAmt * 0.04;
  if (G.mode === 'crash' && G.crashCam) {
    // cámara que da vueltas despacio alrededor del carro destrozado
    const a = (G.slowT || 0) * 0.4;
    const p = roadPoint(G.T, C.s - Math.cos(a) * 7, Math.sin(a) * Math.min(G.T.hw - 0.5, 3));
    _cv.set(p.x, roadY(G.T, C.s) + 2.6, p.z);
    if (G.snap) { cam.position.copy(_cv); G.snap = false; }
    cam.position.lerp(_cv, Math.min(1, dt * 2));
    cam.position.x += (Math.random() - 0.5) * sh * 3; cam.position.y += (Math.random() - 0.5) * sh * 3;
    cam.lookAt(C.x, C.y + 0.6, C.z);
    return;
  }
  if (G.mode === 'crash') {
    // primeros instantes del choque desde la cabina: sacudón fuerte
    cam.position.set(EYE.x + (Math.random() - 0.5) * 0.12, EYE.y + (Math.random() - 0.5) * 0.12, EYE.z);
    return;
  }
  if (G.mode === 'fall' && G.fallCam) {
    if (G.snap) { cam.position.copy(G.fallCam); G.snap = false; }
    cam.position.lerp(G.fallCam, Math.min(1, dt * 3));
    cam.lookAt(C.x, C.y, C.z);
    return;
  }
  if (G.mode === 'finish' || G.mode === 'result') {
    const a = G.t * 0.35 + 1, r = 9;
    const p = roadPoint(G.T, C.s + Math.cos(a) * r, Math.sin(a) * Math.min(G.T.hw, 4));
    _cv.set(p.x, C.y + 3, p.z);
    if (G.snap) { cam.position.copy(_cv); G.snap = false; }
    cam.position.lerp(_cv, Math.min(1, dt * 2));
    cam.lookAt(C.x, C.y + 1, C.z);
    return;
  }
  if (G.mode === 'menu') {
    // la cámara pasea por encima de la carretera alrededor del carro (nunca entra al cerro)
    G.menuAng += dt * 0.16;
    const gar = G.menuView === 'garage', T = G.T;
    const a = G.menuAng + (gar ? 1.1 : 0);
    const along = Math.cos(a) * (gar ? 6 : 9), lat = Math.sin(a) * Math.min(T.hw + 0.4, gar ? 3.6 : 4.4);
    const p = roadPoint(T, C.s + along, lat);
    _cv.set(p.x, roadY(T, C.s + along) + (gar ? 1.7 : 2.4) + Math.sin(a * 0.7) * 0.4, p.z);
    if (G.snap) { cam.position.copy(_cv); G.snap = false; }
    cam.position.lerp(_cv, Math.min(1, dt * 4));
    _ct.set(C.x, C.y + (gar ? 0.9 : 1.5), C.z);
    if (gar && window.innerWidth > 760) {
      // corre el carro a la izquierda del panel
      _cv.subVectors(_ct, cam.position).normalize();
      _ct.x += _cv.z * 1.6; _ct.z -= _cv.x * 1.6;
    }
    cam.lookAt(_ct);
    return;
  }
  if (G.cam === 'cabina' && cam.parent === G.car.body) {
    const v = Math.abs(C.f);
    cam.position.set(EYE.x + (Math.random() - 0.5) * sh, EYE.y + (Math.random() - 0.5) * sh + Math.sin(G.t * 23) * v * 0.00004, EYE.z);
    cam.rotation.set(-0.22 + C.pitch * 0.3, Math.PI - inp.steer * 0.07, -C.roll * 0.6 + inp.steer * v * 0.0006, 'YXZ');
    return;
  }
  // afuera: cámara que persigue al carro
  const fx = Math.sin(C.h), fz = Math.cos(C.h);
  _cv.set(C.x - fx * 7.2, C.y + 2.9, C.z - fz * 7.2);
  if (G.snap) { cam.position.copy(_cv); G.snap = false; }
  cam.position.lerp(_cv, Math.min(1, dt * 6));
  cam.position.x += (Math.random() - 0.5) * sh * 3; cam.position.y += (Math.random() - 0.5) * sh * 3;
  cam.lookAt(C.x + fx * 4, C.y + 1.2, C.z + fz * 4);
}

// ---------- HUD ----------
function hudStatic() {
  const L = G.L;
  document.getElementById('hName').textContent = L.free ? 'Ruta libre' : `${L.id}. ${L.name}`;
  document.getElementById('hCoins').textContent = '0';
  document.getElementById('count').innerHTML = '';
}
function hud() {
  const C = G.C, T = G.T, L = G.L;
  if (!C) return;
  document.getElementById('hTime').textContent = fmtTime(Math.floor(G.time * 10) / 10).replace(/(\.\d)?$/, m => m || '.0');
  const p = Math.max(0, Math.min(1, C.s / (T.n - 45)));
  const pr = document.getElementById('hProg');
  pr.firstElementChild.style.width = (p * 100) + '%';
  pr.children[1].style.left = (p * 100) + '%';
  const hp = Math.max(0, C.hp / C.hpMax), hb = document.getElementById('hHp');
  hb.firstElementChild.style.width = (hp * 100) + '%';
  hb.classList.toggle('low', hp < 0.35);
  document.getElementById('hSpd').textContent = Math.round(Math.abs(C.f) * 3.6);
  // objetivos en vivo
  const o = L.obj.filter(x => x.t !== 'finish').map(x => {
    let ok, txt;
    if (x.t === 'time') { ok = G.time <= x.v; txt = `⏱ ${fmtTime(x.v)}`; }
    if (x.t === 'coins') { ok = G.coins >= x.v; txt = `🪙 ${G.coins}/${x.v}`; }
    if (x.t === 'clean') { ok = C.hits <= x.v; txt = `💥 ${C.hits}/${x.v}`; }
    return `<span class="${ok ? 'ok' : 'no'}">${txt}</span>`;
  });
  const h = o.join(' · ');
  const el = document.getElementById('hObj');
  if (el.innerHTML !== h) el.innerHTML = h;
  // aviso de abismo cerca
  let warn = false;
  if (G.mode === 'drive') {
    const si = Math.min(T.n - 1, Math.round(C.s)), side = C.d < 0 ? 0 : 1;
    const w = side ? T.wR[si] : T.wL[si], gd = side ? T.gR[si] : T.gL[si];
    warn = w > 0.5 && !gd && Math.abs(C.d) > T.hw - 0.4;
  }
  document.getElementById('warn').classList.toggle('on', warn);
  paceNote();
  drawNav();
}

// ---------- copiloto: la próxima curva ----------
function noteIcon(n) {
  // flecha que sube y dobla según lo cerrada que es la curva
  const ang = [0, 0, 30, 55, 85, 120, 175][n.lvl] * DEG * (n.sg > 0 ? -1 : 1);
  const pts = [[50, 94], [50, 62]];
  const r = n.lvl >= 6 ? 16 : 24;
  let x = 50, y = 62, h = 0;
  for (let i = 1; i <= 12; i++) {
    const nh = ang * i / 12, mid = (h + nh) / 2, step = Math.abs(ang) * r / 12;
    x += Math.sin(mid) * step; y -= Math.cos(mid) * step; h = nh; pts.push([x, y]);
  }
  const ex = x + Math.sin(h) * 8, ey = y - Math.cos(h) * 8;
  const lx = ex - Math.sin(h) * 16 + Math.cos(h) * 12, ly = ey + Math.cos(h) * 16 + Math.sin(h) * 12;
  const rx = ex - Math.sin(h) * 16 - Math.cos(h) * 12, ry = ey + Math.cos(h) * 16 - Math.sin(h) * 12;
  return `<path d="M${pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L')}" fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M${lx.toFixed(1)} ${ly.toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)} L${rx.toFixed(1)} ${ry.toFixed(1)}Z" fill="currentColor" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>`;
}
function paceNote() {
  const C = G.C, T = G.T, el = document.getElementById('note');
  const notes = T.notes;
  while (G.noteIdx < notes.length && notes[G.noteIdx].end < C.s) G.noteIdx++;
  const n = notes[G.noteIdx];
  const dist = n ? n.s - C.s : 1e9;
  const show = G.mode === 'drive' && n && dist < Math.max(90, C.f * 4.5);
  el.classList.toggle('on', !!show);
  if (!show) return;
  const brake = G.prof[Math.min(T.n - 1, n.s + 4)] < C.f - 4;
  el.classList.toggle('brake', brake && dist > -5);
  const key = G.noteIdx + (brake ? 'b' : '');
  if (el.dataset.k !== key) {
    el.dataset.k = key;
    document.getElementById('noteIco').innerHTML = noteIcon(n);
    document.getElementById('noteTxt').textContent = `${n.kind} ${n.dir}${n.then ? ' · luego ' + n.then : ''}`;
  }
  document.getElementById('noteDist').textContent = brake && dist > 0 ? `¡FRENA! · ${Math.max(0, Math.round(dist / 10) * 10)} m` : dist > 0 ? `${Math.round(dist / 10) * 10} m` : 'ahora';
  if (G.noteSaid !== G.noteIdx) {
    G.noteSaid = G.noteIdx;
    SFX.say(`${n.kind} ${n.dir}${brake ? ', frena' : ''}${n.then ? ', luego ' + n.then : ''}`);
  }
}

// ---------- mapa estilo GPS: la ruta que viene, girando con el carro ----------
function drawNav() {
  const cv = document.getElementById('nav');
  if (!cv || !document.body.classList.contains('driving')) return;
  const g = cv.getContext('2d'), W2 = cv.width, C = G.C, T = G.T;
  const k = W2 / 380, cx = W2 / 2, cy = W2 * 0.7;
  const sh = Math.sin(C.h), ch = Math.cos(C.h);
  const P = s => { const i = Math.max(0, Math.min(T.n - 1, Math.round(s))), dx = T.x[i] - C.x, dz = T.z[i] - C.z; return [cx + (dx * -ch + dz * sh) * k, cy - (dx * sh + dz * ch) * k]; };
  const Po = (s, d) => { const i = Math.max(0, Math.min(T.n - 1, Math.round(s))), x = T.x[i] + T.nx[i] * d - C.x, z = T.z[i] + T.nz[i] * d - C.z; return [cx + (x * -ch + z * sh) * k, cy - (x * sh + z * ch) * k]; };
  g.clearRect(0, 0, W2, W2);
  g.save();
  g.beginPath(); g.arc(W2 / 2, W2 / 2, W2 / 2 - 2, 0, 7); g.clip();
  g.fillStyle = 'rgba(18,22,30,0.82)'; g.fillRect(0, 0, W2, W2);
  const s0 = Math.max(0, C.s - 70), s1 = Math.min(T.n - 1, C.s + 330);
  const path = (from, to, step = 4) => { g.beginPath(); for (let s = from; s <= to; s += step) { const p = P(s); s === from ? g.moveTo(p[0], p[1]) : g.lineTo(p[0], p[1]); } };
  g.lineCap = g.lineJoin = 'round';
  path(s0, s1); g.strokeStyle = '#59606e'; g.lineWidth = (T.hw * 2 + 3) * k + 4; g.stroke();
  // bordes con abismo sin baranda en rojo
  g.strokeStyle = '#ff4d4d'; g.lineWidth = 2.2;
  for (const [w, gd, sg] of [[T.wL, T.gL, -1], [T.wR, T.gR, 1]]) {
    let on = false;
    g.beginPath();
    for (let s = Math.round(s0); s <= s1; s += 4) {
      const danger = w[s] > 0.5 && !gd[s];
      const p = Po(s, sg * (T.hw + 2));
      if (danger) { on ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); on = true; } else on = false;
    }
    g.stroke();
  }
  path(Math.max(s0, C.s), s1); g.strokeStyle = '#1ec8ff'; g.lineWidth = 6; g.stroke();
  path(s0, C.s); g.strokeStyle = '#8a93a3'; g.lineWidth = 4; g.stroke();
  // horquillas y meta
  for (const n of T.notes) if (n.lvl >= 5 && n.s > C.s && n.s < s1) { const p = P(n.s + (n.end - n.s) / 2); g.fillStyle = n.lvl >= 6 ? '#ff4d4d' : '#ffb020'; g.beginPath(); g.arc(p[0], p[1], 6, 0, 7); g.fill(); g.fillStyle = '#111'; g.font = 'bold 9px Rubik,sans-serif'; g.textAlign = 'center'; g.fillText('!', p[0], p[1] + 3); }
  if (T.n - 45 < s1) { const p = P(T.n - 45); g.font = '18px sans-serif'; g.textAlign = 'center'; g.fillText('🏁', p[0], p[1] + 6); }
  // el carro
  g.translate(cx, cy);
  g.fillStyle = '#fff'; g.strokeStyle = '#1ec8ff'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 8); g.lineTo(0, 4); g.lineTo(-8, 8); g.closePath(); g.stroke(); g.fill();
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.beginPath(); g.arc(W2 / 2, W2 / 2, W2 / 2 - 2, 0, 7); g.stroke();
}

// Piloto automático (lo usan las pruebas): sigue la línea de guía a la velocidad recomendada.
function aiInput(C, T, prof) {
  const v = Math.max(1, C.f), look = Math.max(6, v * 0.5);
  const i = Math.min(T.n - 1, Math.round(C.s + look));
  let tx = T.lx[i], tz = T.lz[i];
  const rk = T.rocks.find(r => r.s > C.s - 2 && r.s < C.s + 70);
  if (rk) { let d = rk.d > 0 ? rk.d - rk.rad - 1.7 : rk.d + rk.rad + 1.7; d = Math.max(-T.hw + 1, Math.min(T.hw - 1, d)); tx = T.x[i] + T.nx[i] * d; tz = T.z[i] + T.nz[i] * d; }
  let ang = Math.atan2(tx - C.x, tz - C.z) - C.h;
  while (ang > Math.PI) ang -= 2 * Math.PI; while (ang < -Math.PI) ang += 2 * Math.PI;
  const need = prof[Math.min(T.n - 1, Math.round(C.s + 2))];
  return { thr: v < need - 0.5 ? 1 : 0, brk: v > need + 1 ? 1 : 0, steer: Math.max(-1, Math.min(1, -ang * 3)) };
}

// ---------- fin de la partida ----------
function endRun(win, why) {
  if (G.mode === 'result') return;
  const C = G.C, L = G.L;
  G.mode = 'result';
  document.body.classList.remove('driving');
  document.getElementById('warn').classList.remove('on');
  SFX.stopDrive();
  W.scene.attach(W.camera);
  save.stats.km += C.odo / 1000;
  let earned = G.coins * 5;
  const res = { win, why, got: [false, false, false], newStars: [], opened: null, firstBeat: false };
  if (win) {
    save.stats.wins++;
    const prevOpen = LEVELS.map(isOpen);
    res.got = L.obj.map(o => o.t === 'finish' || (o.t === 'time' && G.time <= o.v) || (o.t === 'coins' && G.coins >= o.v) || (o.t === 'clean' && C.hits <= o.v));
    if (L.free) {
      earned += 150;
      save.stats.free++;
      unlockAch('libre');
    } else {
      const s = lvSave(L.id);
      res.newStars = res.got.map((g, i) => g && !s.stars[i]);
      s.stars = s.stars.map((v, i) => v || res.got[i]);
      s.best = s.best ? Math.min(s.best, G.time) : G.time;
      const first = !s.done;
      s.done = true;
      save.lv[L.id] = s;
      earned += 40 + L.id * 15 + res.newStars.filter(Boolean).length * 40 + (first ? 60 : 0);
      if (L.id === 1) unlockAch('primer');
      if (L.id === 3) unlockAch('hielo');
      if (L.id === 5) unlockAch('lava');
      if (L.id === 6) unlockAch('buho');
      if (C.hits === 0) unlockAch('limpio');
      if (res.got.every(Boolean)) unlockAch('tres');
      if (totalStars() >= 24) unlockAch('leyenda');
      if (L.id === 8 && !save.beat) {
        save.beat = true; res.firstBeat = true;
        save.paints = PAINTS.map(p => p.id);
        unlockAch('condor');
      }
      const nowOpen = LEVELS.map(isOpen);
      const idx = nowOpen.findIndex((o, i) => o && !prevOpen[i]);
      if (idx >= 0) res.opened = LEVELS[idx];
    }
  } else if (!L.free) {
    res.got = [false, false, false];
  }
  save.coins += earned;
  save.stats.coins += earned;
  if (save.stats.coins >= 500) unlockAch('monedero');
  persist();
  res.earned = earned;
  if (!win) SFX.lose();
  showResult(res);
}
