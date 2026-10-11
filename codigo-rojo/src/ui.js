'use strict';
// Código Rojo: pantallas (intro, menú, misiones, partida libre, garaje, insignias, opciones,
// pausa, resultado), teclado y botones táctiles, y el bucle principal.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
let screen = 'intro';
const hex = c => '#' + c.toString(16).padStart(6, '0');
const TIME_ICON = { dia: '☀️', tarde: '🌇', noche: '🌙' };

function showScreen(id) {
  screen = id;
  for (const s of $$('.screen')) s.classList.toggle('on', s.id === id || (id === 'pause' && s.id === 'hud'));
  document.body.classList.toggle('playing', id === 'hud');
  const first = $(`#${id} .btn.main:not([disabled]), #${id} .mm-b.main`) || $(`#${id} .ms:not(.locked)`) || $(`#${id} button`);
  if (first && !('ontouchstart' in window)) setTimeout(() => first.focus({ preventScroll: true }), 60);
  $$('.coinN').forEach(e => { e.textContent = save.coins.toLocaleString('es-PE'); });
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200);
}
function unlockAch(id) {
  if (save.ach[id]) return;
  save.ach[id] = Date.now(); persist();
  const a = ACHS.find(x => x.id === id);
  if (a) setTimeout(() => toast(`${a.icon} Insignia: ${a.name}`), 200);
}

// ---------- menú ----------
function goMenu(view = 'menu') {
  G.mode = 'menu';
  SFX.stopDrive();
  if (view === 'garage') { if (!G.garage) showGarageCar(); }
  else if (G.garage || !G.thief || G.cfg && G.cfg.role !== 'demo') { G.garage = false; startAttract(); }
  renderMenu();
  if (view === 'garage') renderGarage();
  showScreen(view);
}
function renderMenu() {
  const done = MISSIONS.filter(m => save.done[m.id]).length;
  $('#mmMis').textContent = `${done}/${MISSIONS.length} completas · ladrón o policía`;
  $('#mmGar').textContent = `${save.cars.length}/${CARS.length} carros · ${carById(save.car).name}`;
  $('#mmAch').textContent = `${Object.keys(save.ach).length}/${ACHS.length} ganadas`;
  $('#winsN').textContent = `🏆 ${save.stats.wins}`;
  const R = rankOf(save.stats.wins);
  $('#mmRank').innerHTML = `<i>${R.icon}</i>${R.name}`;
  // misión destacada: la siguiente sin ganar (alternando ladrón y policía)
  const m = MISSIONS.find(x => missionOpen(x) && !save.done[x.id]) || MISSIONS[MISSIONS.length - 1];
  const art = { dia: 'linear-gradient(160deg,#4a8fd9,#d3e7f4)', tarde: 'linear-gradient(160deg,#34508f,#ffad72)', noche: 'linear-gradient(160deg,#04070f,#2a3560)' }[m.time];
  $('#mmFeat').innerHTML = `<div class="art" style="background:${art}">${m.role === 'ladron' ? '💰' : '🚓'}</div><div class="in">
    <div class="k">${save.done[m.id] ? 'REPETIR' : 'SIGUIENTE MISIÓN'} · ${m.role === 'ladron' ? 'LADRÓN' : 'POLICÍA'}</div><h3>${m.name}</h3><p>${m.desc}</p>
    <div class="tags"><span class="tag ${m.diff}">${DIFFS[m.diff].name}</span><span class="tag">${TIME_ICON[m.time]} ${TIMES[m.time].name}</span><span class="tag">⏱ ${m.t} s</span><span class="tag">🪙 ${Math.round(150 * DIFFS[m.diff].reward)}+</span></div>
    <button class="btn main" data-mis="${m.id}">▶ Jugar ahora</button></div>`;
}
const RANKS = [[0, 'Novato', '🔰'], [2, 'Callejero', '🛞'], [5, 'Profesional', '⭐'], [9, 'Experto', '🔥'], [14, 'Leyenda', '👑']];
function rankOf(w) { let r = RANKS[0]; for (const x of RANKS) if (w >= x[0]) r = x; return { name: r[1], icon: r[2] }; }

function renderMissions() {
  for (const role of ['ladron', 'policia']) {
    const list = MISSIONS.filter(m => m.role === role);
    $(role === 'ladron' ? '#misL' : '#misP').innerHTML = list.map((m, i) => {
      const open = missionOpen(m), done = save.done[m.id];
      return `<button class="ms ${open ? '' : 'locked'}" data-mis="${m.id}"><span class="n">${open ? i + 1 : '🔒'}</span>
        <span><b>${m.name}</b><small>${open ? m.desc : 'Gana la misión anterior para abrirla'}</small>
        <span class="tags"><span class="tag ${m.diff}">${DIFFS[m.diff].name}</span><span class="tag">${TIME_ICON[m.time]} ${TIMES[m.time].name}</span><span class="tag">⏱ ${m.t} s</span></span></span>
        <span class="st">${done ? `<span class="mstars">${[0, 1, 2].map(k => `<i class="${k < (save.stars[m.id] || 1) ? 'on' : ''}">★</i>`).join('')}</span>` : ''}</span></button>`;
    }).join('');
  }
}

const FREE = { role: 'ladron', diff: 'normal', goal: 'survive', t: 120, time: 'noche' };
function renderFree() {
  const seg = (k, vals) => `<div class="seg">${vals.map(([v, t]) => `<button class="btn ${FREE[k] === v ? 'sel' : ''}" data-free="${k}" data-val="${v}">${t}</button>`).join('')}</div>`;
  const goals = FREE.role === 'ladron' ? [['survive', 'Aguantar'], ['bags', 'Bolsas'], ['escape', 'Guarida']] : [['arrest', 'Atrapar'], ['stop', 'Que no llegue']];
  if (!goals.some(g => g[0] === FREE.goal)) FREE.goal = goals[0][0];
  $('#freeForm').innerHTML = `<h2>Partida libre</h2>
    <div class="opt"><span>Rol</span>${seg('role', [['ladron', '💰 Ladrón'], ['policia', '🚓 Policía']])}</div>
    <div class="opt"><span>Dificultad</span>${seg('diff', Object.keys(DIFFS).map(k => [k, DIFFS[k].name]))}</div>
    <div class="opt"><span>Meta</span>${seg('goal', goals)}</div>
    <div class="opt"><span>Tiempo</span>${seg('t', [[60, '1 min'], [90, '1:30'], [120, '2 min'], [180, '3 min']])}</div>
    <div class="opt"><span>Hora</span>${seg('time', [['dia', '☀️ Día'], ['tarde', '🌇 Tarde'], ['noche', '🌙 Noche']])}</div>
    <p class="hint">${goalText(Object.assign({ n: 5 }, FREE))}</p>
    <button class="btn main" data-act="playfree">¡A jugar!</button>`;
}

let garageCar = null;
function showGarageCar() {
  clearGame();
  G.garage = true;
  G.thief = null;
  showroomCar(carById(save.car));
  garageCar = SHOW.car;
  setPostLook({ bloom: 0.5, threshold: 0.9, vignette: 0.42, sat: 1.12, tint: [1, 1, 1.03] });
}
function renderGarage() {
  const cur = carById(save.car);
  const max = { top: 64, acc: 11.5, grip: 1.22, hp: 175, mass: 1.6 };
  const rows = [['Velocidad', cur.top / max.top, Math.round(cur.top * 3.6) + ' km/h'], ['Aceleración', cur.acc / max.acc, cur.acc.toFixed(1)], ['Agarre', cur.grip / max.grip, cur.grip.toFixed(2) + ' g'], ['Resistencia', cur.hp / max.hp, cur.hp], ['Peso', cur.mass / max.mass, cur.mass > 1.4 ? 'pesado' : cur.mass > 1.15 ? 'medio' : 'liviano']];
  $('#cbars').innerHTML = rows.map(([n, p, v]) => `<div class="cbar"><span>${n}</span><span class="tr"><i style="width:${Math.round(p * 100)}%"></i></span><b>${v}</b></div>`).join('');
  $('#cars').innerHTML = CARS.map(c => {
    const own = save.cars.includes(c.id);
    return `<button class="carrow ${save.car === c.id ? 'sel' : ''}" data-car="${c.id}"><span class="sw" style="background:${hex(c.color)}"></span><span><b>${c.name}</b><small>${c.desc}</small></span><span class="pr">${own ? (save.car === c.id ? '✔ En uso' : 'Usar') : `<i class="coin" style="display:inline-block;vertical-align:-3px"></i> ${c.price}`}</span></button>`;
  }).join('');
  $$('.coinN').forEach(e => { e.textContent = save.coins.toLocaleString('es-PE'); });
}
function pickCar(id) {
  const c = carById(id);
  if (!save.cars.includes(id)) {
    if (save.coins < c.price) { SFX.no(); toast(`Te faltan ${c.price - save.coins} monedas`); return; }
    save.coins -= c.price; save.cars.push(id); SFX.buy(); toast(`¡${c.name} es tuyo!`);
    if (save.cars.length >= 4) unlockAch('garaje');
  } else SFX.click();
  save.car = id; persist();
  // cambia el carro de la vitrina
  if (G.garage) { showroomCar(c); garageCar = SHOW.car; }
  renderGarage();
  $(`[data-car=${id}]`)?.focus();
}

function renderBadges() {
  $('#achN').textContent = `🏅 ${Object.keys(save.ach).length}/${ACHS.length}`;
  $('#achs').innerHTML = ACHS.map(a => `<div class="ach ${save.ach[a.id] ? 'on' : ''}"><span class="ico">${save.ach[a.id] ? a.icon : '🔒'}</span><span><b>${a.name}</b><small>${a.desc}</small></span></div>`).join('');
}
let resetArm = 0;
function renderOptions() {
  const o = save.opt;
  const seg = (k, vals) => `<div class="seg">${vals.map(([v, t]) => `<button class="btn ${o[k] === v ? 'sel' : ''}" data-opt="${k}" data-val="${v}">${t}</button>`).join('')}</div>`;
  $('#opts').innerHTML = `<h2>Opciones</h2>
    <div class="opt"><span>Sonido</span>${seg('sound', [[true, 'Sí'], [false, 'No']])}</div>
    <div class="opt"><span>Volumen</span><input type="range" min="0" max="1" step="0.05" value="${o.vol}" id="vol"></div>
    <div class="opt"><span>Voz de la central</span>${seg('voz', [[true, 'Sí'], [false, 'No']])}</div>
    <div class="opt"><span>Cámara</span>${seg('cam', [['afuera', 'Atrás'], ['cabina', 'Cabina']])}</div>
    <div class="opt"><span>Dirección</span>${seg('sens', [[0.75, 'Suave'], [1, 'Normal'], [1.35, 'Rápida']])}</div>
    <div class="opt"><span>Gráficos</span>${seg('quality', [['alta', 'Altos'], ['baja', 'Bajos']])}</div>
    <p class="hint">↑ acelerar · ↓ frenar y reversa · ← → girar · Espacio freno de mano · Shift nitro · C cámara · H bocina · R volver a la calle · P o Esc pausa. También W A S D.</p>
    <button class="btn" id="reset">Borrar progreso</button>`;
  if (o.voz === undefined) o.voz = true;
  $('#vol').oninput = e => { save.opt.vol = +e.target.value; SFX.setVol(); persist(); };
  $('#reset').onclick = () => {
    if (Date.now() - resetArm < 2500) { save = newSave(); persist(); toast('Progreso borrado'); renderOptions(); return; }
    resetArm = Date.now(); toast('Toca otra vez para borrar todo');
  };
}

function showResult(res) {
  const el = $('#result');
  el.classList.toggle('win', res.win); el.classList.toggle('lose', !res.win);
  const cfg0 = G.cfg, mis = cfg0.mission && MISSIONS.find(m => m.id === cfg0.mission);
  $('#rKick').textContent = (mis ? mis.name : 'Partida libre') + ' · ' + (cfg0.role === 'ladron' ? 'Ladrón' : 'Policía') + ' · ' + DIFFS[cfg0.diff].name;
  $('#rBadge').textContent = res.win ? (cfg0.role === 'ladron' ? '💰' : '🚔') : (cfg0.role === 'ladron' ? '🚨' : '💨');
  $('#rTitle').textContent = res.win ? (cfg0.role === 'ladron' ? '¡Escapaste!' : '¡Caso cerrado!') : (cfg0.role === 'ladron' ? '¡Te atraparon!' : 'Se escapó');
  $('#rSub').textContent = res.why;
  $('#rStars').innerHTML = res.starWhy.map(([t, on], i) => `<span class="star ${on ? 'on' : ''}" style="--d:${0.35 + i * 0.32}s" title="${t}">★</span>`).join('');
  $('#rStarWhy').innerHTML = res.starWhy.map(([t, on]) => `<span class="${on ? 'on' : ''}">${on ? '✔' : '✖'} ${t}</span>`).join('');
  $('#rStats').innerHTML = res.stats.map(([i, a, b]) => `<div><i>${i}</i><b>${b}</b><small>${a}</small></div>`).join('');
  $('#rList').innerHTML = res.lines.map(([a, b], i) => `<li style="--d:${1.2 + i * 0.12}s"><span>${a}</span><b>${b}</b></li>`).join('');
  // estrellas con sonido y monedas que suben contando
  for (let i = 0; i < res.stars; i++) setTimeout(() => SFX.star(i), 350 + i * 320);
  const t0 = performance.now() + 1300, el2 = $('#rCoins');
  el2.textContent = '+0';
  const tick = now => { const k = clamp((now - t0) / 900, 0, 1); el2.textContent = '+' + Math.round(res.coins * (1 - Math.pow(1 - k, 3))).toLocaleString('es-PE'); if (k < 1) requestAnimationFrame(tick); else if (res.coins) SFX.coin(); };
  requestAnimationFrame(tick);
  const cfg = G.cfg, btns = ['<button class="btn" data-act="retry">Reintentar</button>'];
  if (cfg.mission) {
    const same = MISSIONS.filter(m => m.role === cfg.role), i = same.findIndex(m => m.id === cfg.mission), nx = same[i + 1];
    if (res.win && nx) btns.push(`<button class="btn main" data-mis="${nx.id}">Siguiente</button>`);
    btns.push('<button class="btn" data-act="missions">Misiones</button>');
  } else btns.push('<button class="btn" data-act="free">Cambiar</button>');
  if (!res.win || !cfg.mission) btns.push('<button class="btn main" data-act="retry">Otra vez</button>');
  $('#rBtns').innerHTML = btns.slice(btns[btns.length - 1].includes('Otra vez') ? 1 : 0).join('');
  showScreen('result');
}

// ---------- acciones ----------
function play(cfg) {
  fadeThen(() => { G.garage = false; startGame(cfg); showScreen('hud'); document.body.classList.add('playing'); });
}
function playMission(id) {
  const m = MISSIONS.find(x => x.id === id);
  if (!missionOpen(m)) { SFX.no(); toast('Gana la misión anterior para abrirla'); return; }
  SFX.ok();
  play(Object.assign({ mission: m.id }, m));
}
function act(a) {
  SFX.init();
  switch (a) {
    case 'menu': SFX.click(); if (G.mode !== 'menu') fadeThen(() => goMenu('menu')); else goMenu('menu'); break;
    case 'missions': SFX.click(); if (G.mode !== 'menu') goMenu('missions'); renderMissions(); showScreen('missions'); break;
    case 'free': SFX.click(); if (G.mode !== 'menu') goMenu('free'); renderFree(); showScreen('free'); break;
    case 'garage': SFX.click(); goMenu('garage'); break;
    case 'badges': SFX.click(); renderBadges(); showScreen('badges'); break;
    case 'options': SFX.click(); renderOptions(); showScreen('options'); break;
    case 'playfree': SFX.ok(); play(Object.assign({ name: 'Partida libre', n: 5 }, FREE)); break;
    case 'retry': SFX.ok(); play(G.cfg); break;
    case 'resume': resume(); break;
    case 'cam': toggleCam(); $('#camLbl').textContent = G.cam === 'cabina' ? 'cabina' : 'atrás'; break;
  }
}
function fadeThen(fn) { const f = $('#fade'); f.classList.add('on'); setTimeout(() => { fn(); setTimeout(() => f.classList.remove('on'), 60); }, 360); }
function pause() {
  if (G.mode !== 'play' && G.mode !== 'count') return;
  G.paused = G.mode; G.mode = 'pause'; SFX.stopDrive(); setCam();
  $('#camLbl').textContent = G.cam === 'cabina' ? 'cabina' : 'atrás';
  showScreen('pause');
}
function resume() { if (G.mode !== 'pause') return; G.mode = G.paused; G.acc = 0; setCam(); showScreen('hud'); }

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (b) return act(b.dataset.act);
  const m = e.target.closest('[data-mis]'); if (m) return playMission(m.dataset.mis);
  const c = e.target.closest('[data-car]'); if (c) return pickCar(c.dataset.car);
  const f = e.target.closest('[data-free]');
  if (f) { const k = f.dataset.free, v = f.dataset.val; FREE[k] = isNaN(+v) ? v : +v; SFX.click(); renderFree(); $(`[data-free=${k}][data-val="${v}"]`)?.focus(); return; }
  const o = e.target.closest('[data-opt]');
  if (o) {
    const k = o.dataset.opt, raw = o.dataset.val;
    save.opt[k] = raw === 'true' ? true : raw === 'false' ? false : isNaN(+raw) ? raw : +raw;
    persist(); SFX.setVol(); SFX.click();
    if (k === 'quality') applyQuality();
    if (k === 'cam') G.cam = save.opt.cam;
    renderOptions(); $(`[data-opt=${k}][data-val="${raw}"]`)?.focus();
  }
});
$('#pauseBtn').addEventListener('click', e => { e.stopPropagation(); pause(); });

function navMove(dx, dy) {
  const root = $(`#${screen}`);
  const items = $$('button:not([disabled]), input', root).filter(b => b.offsetParent !== null);
  if (!items.length) return;
  const cur = items.includes(document.activeElement) ? document.activeElement : null;
  if (!cur) { items[0].focus(); return; }
  const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bd = Infinity;
  for (const b of items) {
    if (b === cur) continue;
    const r = b.getBoundingClientRect(), ddx = r.left + r.width / 2 - ax, ddy = r.top + r.height / 2 - ay;
    if (dx && (Math.sign(ddx) !== dx || Math.abs(ddx) < 4)) continue;
    if (dy && (Math.sign(ddy) !== dy || Math.abs(ddy) < 4)) continue;
    const d = dx ? Math.abs(ddx) + Math.abs(ddy) * 2.5 : Math.abs(ddy) + Math.abs(ddx) * 2.5;
    if (d < bd) { bd = d; best = b; }
  }
  if (best) { best.focus(); best.scrollIntoView({ block: 'nearest' }); SFX.tone(440, 0.03, 'triangle', 0.05); }
}
const DRIVE_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'KeyN'];
window.addEventListener('keydown', e => {
  if (screen === 'intro') { e.preventDefault(); leaveIntro(); return; }
  if (G.mode === 'play' || G.mode === 'count' || G.mode === 'busted') {
    if (DRIVE_KEYS.includes(e.code)) { KEYS[e.code] = true; e.preventDefault(); }
    if (e.code === 'KeyC') toggleCam();
    if (e.code === 'KeyH') SFX.setHorn(true);
    if (e.code === 'KeyR' && G.mode === 'play') resetToRoad();
    if (e.code === 'Escape' || e.code === 'KeyP') pause();
    return;
  }
  if (G.mode === 'pause' && (e.code === 'Escape' || e.code === 'KeyP')) { resume(); return; }
  if (e.target.tagName === 'INPUT' && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) return;
  const nav = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.code];
  if (nav) { e.preventDefault(); navMove(...nav); return; }
  if ((e.code === 'Escape' || e.code === 'Backspace') && ['missions', 'free', 'garage', 'badges', 'options'].includes(screen)) act('menu');
});
window.addEventListener('keyup', e => { KEYS[e.code] = false; if (e.code === 'KeyH') SFX.setHorn(false); });
window.addEventListener('blur', () => { for (const k in KEYS) KEYS[k] = false; pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

// R: si quedaste trabado, vuelves al carril más cercano (cuesta un poco de vida)
function resetToRoad() {
  const P = G.player.body, seg = segmentOf(P);
  const a = seg[0], b = seg[1], dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz);
  const t = clamp(((P.x - a.x) * dx + (P.z - a.z) * dz) / (L * L), 0.1, 0.9);
  const s = laneSpot(a, b, t);
  Object.assign(P, { x: s.x, z: s.z, h: s.h, vx: 0, vz: 0, vy: 0, y: groundH(s.x, s.z), air: false });
  P.hp = Math.max(1, P.hp - 10);
  toast('De vuelta a la calle');
}

if ('ontouchstart' in window || navigator.maxTouchPoints > 0) document.body.classList.add('touch');
for (const b of $$('#touch button')) {
  const k = b.dataset.k;
  const on = e => { e.preventDefault(); TOUCH[k] = true; b.classList.add('on'); SFX.init(); };
  const off = e => { e.preventDefault(); TOUCH[k] = false; b.classList.remove('on'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
}
function leaveIntro() { if (screen !== 'intro') return; SFX.init(); SFX.ok(); goMenu('menu'); }
$('#intro').addEventListener('pointerdown', leaveIntro);

// ---------- bucle ----------
const _cam = new THREE.Vector3();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - (G.last || now)) / 1000);
  G.last = now; G.t += dt;
  step(dt);
}
function step(dt) {
  if (G.mode === 'menu') { if (!G.garage && G.thief) attractStep(dt); }
  else if (G.mode !== 'pause' && G.mode !== 'result') simulate(dt);
  else if (G.mode === 'result') stepTraffic(dt);
  for (const a of G.all) poseCar(a.car, a.body, G.mode === 'pause' ? 0 : dt, W.t);
  if (G.mode !== 'pause' && G.mode !== 'result' && !G.garage) for (const a of G.all) carFx(a, dt);
  if (G.player) { const bo = !!G.player.body.boost; if (bo && !G.wasBoost) SFX.nitro(); G.wasBoost = bo; }
  if (G.player) poseCockpit(G.player.car, G.player.body);
  // cámara
  if (G.mode === 'menu' && G.garage && SHOW.car) { renderShowroom(dt); return; }
  if (G.mode === 'menu' && G.thief) updateCamera(dt);
  else if (G.player) {
    updateCamera(dt);
    const fovT = W.baseFov + (G.mode === 'play' ? Math.max(0, Math.abs(G.player.body.f) / G.player.body.spec.top - 0.4) * 14 + (G.player.body.boost ? 9 : 0) : 0);
    if (Math.abs(W.camera.fov - fovT) > 0.05) { W.camera.fov += (fovT - W.camera.fov) * Math.min(1, dt * 3); W.camera.updateProjectionMatrix(); }
  }
  // sol que sigue al jugador (sombras), cielo y faros
  W.camera.getWorldPosition(_cam);
  const focus = G.player ? G.player.body : G.thief ? G.thief.body : { x: 0, y: 0, z: 0 };
  W.sun.position.set(focus.x + W.sunDir.x * 150, W.sunDir.y * 150, focus.z + W.sunDir.z * 150);
  W.sun.target.position.set(focus.x, 0, focus.z);
  W.sky.position.copy(_cam); W.stars.position.copy(_cam);
  if (G.head && G.player) { const b = G.player.body; G.head.position.set(b.x + Math.sin(b.h) * 2, b.y + 1, b.z + Math.cos(b.h) * 2); G.head.target.position.set(b.x + Math.sin(b.h) * 25, b.y - 1, b.z + Math.cos(b.h) * 25); }
  (G.copLights || []).forEach((l, i) => { const c = G.cops.filter(x => !x.player)[i]; if (!c) { l.intensity = 0; return; } l.position.set(c.body.x, c.body.y + 2.5, c.body.z); l.color.set(Math.floor(W.t * 8) % 2 ? 0xff2030 : 0x2050ff); l.intensity = c.body.dead ? 0 : 40; });
  // sonido
  const playing = G.mode === 'play' || G.mode === 'count' || G.mode === 'busted';
  if (G.player && playing) {
    SFX.drive(G.player.body, true, false, G.mode === 'play' ? inp.thr : 0);
    const P = G.player.body;
    let sir = 0, fast = false;
    if (G.cfg.role === 'policia') { sir = 0.8; fast = true; }
    else for (const c of G.cops) { const d = Math.hypot(c.body.x - P.x, c.body.z - P.z); if (!c.body.dead && !(c.wait > 0)) { sir = Math.max(sir, clamp(1 - d / 160, 0, 1)); if (d < 45) fast = true; } }
    SFX.setSiren(sir, fast);
    hud();
  }
  if (G.mode !== 'pause') updateWorld(G.t, dt);
  renderFrame(W.scene, W.camera);
}

const TIPS = ['De ladrón, los puentes y el túnel sirven para perder a los patrulleros.', 'De policía: chócalo de costado para frenarlo y quédate pegado para llenar la barra.', 'El freno de mano (Espacio) te ayuda a doblar en las esquinas sin frenar tanto.', 'Las rampas te hacen saltar por encima del tráfico.', 'Si te trabas, la tecla R te devuelve a la calle.', 'De noche los patrulleros iluminan la calle con su circulina: los ves venir.', 'Shift (o el botón NITRO) te da un empujón. Se recarga solo, y más rápido si derrapas o saltas.', 'Gana con el motor sano y rápido para sacar las 3 estrellas.'];
function boot() {
  $('#ldTip').textContent = 'Consejo: ' + TIPS[Math.floor(Math.random() * TIPS.length)];
  // deja que se pinte la pantalla de carga antes de armar el barrio
  setTimeout(boot2, 60);
}
function boot2() {
  initWorld($('#gl'));
  resizeWorld();
  window.addEventListener('resize', resizeWorld);
  G.mode = 'menu';
  startAttract();
  showScreen('intro');
  document.body.classList.add('ready');
  requestAnimationFrame(frame);
}
boot();
