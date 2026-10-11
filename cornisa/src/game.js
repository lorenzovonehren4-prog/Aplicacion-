'use strict';
// Cornisa: partida. Entrada, bucle principal, cámaras, monedas, rocas, meta, caída y resultado.

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
  if (!G.T || G.L !== L || L.free) loadLevel(L);
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
  if (G.mode === 'drive' || G.mode === 'fall') {
    G.time += G.mode === 'drive' ? dt : 0;
    G.acc += dt;
    while (G.acc >= STEP) {
      G.acc -= STEP;
      const i = G.mode === 'drive' ? readInput(STEP) : { thr: 0, brk: 0, steer: 0 };
      stepCar(C, i, T, G.st, STEP, onCarEvent);
      C.steer = inp.steer;
      if (G.mode === 'drive') { pickCoins(); hitRocks(); }
    }
    if (G.mode === 'drive') {
      if (C.hp <= 0) return endRun(false, 'Tu carro quedó destrozado');
      if (C.s >= T.n - 45) { G.mode = 'finish'; G.endT = 0; onFinish(); }
      save.stats.top = Math.max(save.stats.top, C.f * 3.6);
      if (C.f * 3.6 >= 150) unlockAch('veloz');
    }
    if (G.mode === 'fall' && C.fallT > 3) endRun(false, 'Te caíste al abismo');
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
  if (name === 'choque') {
    SFX.hit(v.vn);
    flashHit();
    if (v.vn > 2.4) shake(Math.min(1, v.vn / 8));
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
  }
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
      C.hp -= (8 + v * 0.65) * G.st.armor;
      C.hits++;
      const keep = 0.4;
      C.vx *= keep; C.vz *= keep;
      // empuja de costado, lejos de la roca
      const si = Math.min(G.T.n - 1, Math.round(C.s)), sg = dd > 0 ? -1 : 1;
      C.vx += G.T.nx[si] * sg * 2.5; C.vz += G.T.nz[si] * sg * 2.5;
      SFX.hit(v * 0.6 + 3); flashHit(); shake(0.8);
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
