'use strict';
// Cornisa: pantallas (intro, menú, mapa de montañas, taller, insignias, opciones, pausa,
// resultado y final), navegación con flechas, controles táctiles y bucle principal.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
let screen = 'intro';
const hex = c => '#' + c.toString(16).padStart(6, '0');

function showScreen(id) {
  screen = id;
  for (const s of $$('.screen')) s.classList.toggle('on', s.id === id || (id === 'detail' && s.id === 'map') || (id === 'pause' && s.id === 'hud'));
  if (id === 'detail') $('#map').classList.add('on');
  const first = $(`#${id} .btn.main:not([disabled])`) || $(`#${id} .lv:not(.locked)`) || $(`#${id} .btn`);
  if (first && !('ontouchstart' in window)) setTimeout(() => first.focus({ preventScroll: true }), 60);
  $$('.coinN').forEach(e => { e.textContent = save.coins.toLocaleString('es-PE'); });
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2400);
}

function unlockAch(id) {
  if (save.ach[id]) return;
  save.ach[id] = Date.now();
  persist();
  const a = ACHS.find(x => x.id === id);
  if (a) setTimeout(() => toast(`${a.icon} Insignia: ${a.name}`), 300);
}

// ---------- menú ----------
function goMenu(view = 'menu') {
  G.mode = 'menu'; G.menuView = view;
  document.body.classList.remove('driving');
  SFX.stopDrive();
  const best = [...LEVELS].reverse().find(isOpen) || LEVELS[0];
  const want = G.menuLevel ? LEVELS.find(l => l.id === G.menuLevel) || best : best;
  if (!G.T || G.L !== want) loadLevel(want);
  // el carro estacionado un poco más adelante de la largada
  const p = roadPoint(G.T, 34, -0.6);
  Object.assign(G.C, { x: p.x, z: p.z, y: p.y, h: p.h, f: 0, vx: 0, vz: 0, steer: 0, pitch: 0, roll: 0, state: 'drive', s: 34, i: 34 });
  poseCar(G.car, G.C, 0);
  W.scene.attach(W.camera);
  W.camera.rotation.order = 'XYZ';
  G.snap = true;
  document.body.classList.remove('cam-afuera');
  $('#starsN').textContent = `★ ${totalStars()}/24`;
  if (view === 'garage') renderGarage();
  showScreen(view);
}

function renderMap() {
  const el = $('#levels');
  const cards = LEVELS.map(L => {
    const th = THEMES[L.theme], open = isOpen(L), s = lvSave(L.id);
    const st = s.stars.map(v => v ? '★' : '☆').join('');
    const mount = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 80' preserveAspectRatio='none'><path d='M0 80L0 50L30 30L55 46L90 8L120 40L150 24L200 52L200 80Z' fill='${hex(th.far)}'/><path d='M0 80L0 64L40 52L80 66L120 50L160 62L200 56L200 80Z' fill='${hex(th.rock[0])}'/></svg>`)}")`;
    const req = open ? '' : `<ul class="req">${unlockReqs(L).map(r => `<li class="${r.ok ? 'ok' : 'no'}">${r.ok ? '✔' : '✘'} ${r.txt}</li>`).join('')}</ul>`;
    return `<button class="lv ${open ? '' : 'locked'}" data-lv="${L.id}" style="--g:linear-gradient(160deg,${hex(th.skyTop)},${hex(th.skyBot)});--m:${mount}">
      ${open ? '' : '<span class="lock">🔒</span>'}
      <div class="num">MONTAÑA ${L.id}${L.id === 8 ? ' · FINAL' : ''}</div><h3>${L.name}</h3>
      ${open ? `<div class="stars">${st}</div><div class="best">${s.best ? 'Mejor tiempo ' + fmtTime(Math.round(s.best * 10) / 10) : 'Sin terminar'}</div>` : req}
    </button>`;
  });
  if (save.beat) cards.push(`<button class="lv free" data-lv="free" style="--m:none"><div class="num">DESBLOQUEADO</div><h3>🧭 Ruta libre</h3><div class="best">Una montaña nueva cada vez · ${save.stats.free} terminadas</div></button>`);
  el.innerHTML = cards.join('');
}

let detailL = null;
function openDetail(id) {
  if (id === 'free') { detailL = freeLevel(1 + Math.floor(Math.random() * 1e6)); }
  else {
    const L = LEVELS.find(l => l.id === +id);
    if (!isOpen(L)) { SFX.no(); toast('Todavía está cerrada: cumple lo que pide'); return; }
    detailL = L;
  }
  const L = detailL, s = L.free ? null : lvSave(L.id);
  $('#dNum').textContent = L.free ? 'Ruta libre' : `Montaña ${L.id} de 8`;
  $('#dName').textContent = L.name;
  $('#dDesc').textContent = L.desc;
  $('#dObjs').innerHTML = L.obj.map((o, i) => `<li class="${s && s.stars[i] ? 'got' : ''}"><span class="st">⭐</span>${objText(o)}</li>`).join('');
  SFX.click();
  showScreen('detail');
}

function renderGarage() {
  const u = save.upg;
  $('#upgs').innerHTML = UPGRADES.map(up => {
    const lv = u[up.id], max = lv >= UPG_MAX, cost = max ? 0 : up.cost[lv];
    return `<div class="upg"><b>${up.name}</b><small>${up.desc}</small>
      <div class="bars">${Array.from({ length: UPG_MAX }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div>
      <button class="btn small ${!max && save.coins >= cost ? 'main' : ''}" data-buy="${up.id}" ${max ? 'disabled' : ''}>${max ? 'Máximo' : `<i class="coin"></i>${cost}`}</button></div>`;
  }).join('');
  $('#paints').innerHTML = PAINTS.map(p => {
    const own = save.paints.includes(p.id);
    const price = own ? '' : p.cost < 0 ? '<span class="pr">final</span>' : `<span class="pr">${p.cost}</span>`;
    return `<button class="sw ${save.paint === p.id ? 'sel' : ''} ${own ? '' : 'lockd'}" data-paint="${p.id}" title="${p.name}" aria-label="${p.name}" style="background:${p.metal ? 'linear-gradient(135deg,#fff3b0,#e5b53a 50%,#9a6a10)' : hex(p.c)}">${price}</button>`;
  }).join('');
  const s = carStats(u);
  $('#cstats').innerHTML = `<div><b>${Math.round(s.top * 3.6)}</b><small>km/h máx.</small></div><div><b>${s.grip.toFixed(2)} g</b><small>agarre</small></div><div><b>${s.hp}</b><small>carrocería</small></div>`;
  $$('.coinN').forEach(e => { e.textContent = save.coins.toLocaleString('es-PE'); });
}

function buy(id) {
  const up = UPGRADES.find(x => x.id === id), lv = save.upg[id];
  if (lv >= UPG_MAX) return;
  const cost = up.cost[lv];
  if (save.coins < cost) { SFX.no(); toast(`Te faltan ${cost - save.coins} monedas`); return; }
  save.coins -= cost; save.upg[id]++;
  persist(); SFX.buy();
  unlockAch('mecanico');
  if (save.upg[id] >= UPG_MAX) unlockAch('tope');
  toast(`${up.name} subió a nivel ${save.upg[id]}`);
  renderGarage();
  $(`[data-buy=${id}]`)?.focus();
}
function pickPaint(id) {
  const p = PAINTS.find(x => x.id === id);
  if (!save.paints.includes(id)) {
    if (p.cost < 0) { SFX.no(); toast('Se gana al pasarte el juego'); return; }
    if (save.coins < p.cost) { SFX.no(); toast(`Te faltan ${p.cost - save.coins} monedas`); return; }
    save.coins -= p.cost; save.paints.push(id); SFX.buy();
  } else SFX.click();
  save.paint = id; persist();
  setCarPaint(G.car, id);
  renderGarage();
  $(`[data-paint=${id}]`)?.focus();
}

function renderBadges() {
  const n = Object.keys(save.ach).length;
  $('#achN').textContent = `🏅 ${n}/${ACHS.length}`;
  $('#achs').innerHTML = ACHS.map(a => `<div class="ach ${save.ach[a.id] ? 'on' : ''}"><span class="ico">${save.ach[a.id] ? a.icon : '🔒'}</span><span><b>${a.name}</b><small>${a.desc}</small></span></div>`).join('');
}

let resetArm = 0;
function renderOptions() {
  const o = save.opt;
  const seg = (k, vals) => `<div class="seg">${vals.map(([v, t]) => `<button class="btn ${o[k] === v ? 'sel' : ''}" data-opt="${k}" data-val="${v}">${t}</button>`).join('')}</div>`;
  $('#opts').innerHTML = `<h2>Opciones</h2>
    <div class="opt"><span>Sonido</span>${seg('sound', [[true, 'Sí'], [false, 'No']])}</div>
    <div class="opt"><span>Volumen</span><input type="range" min="0" max="1" step="0.05" value="${o.vol}" id="vol"></div>
    <div class="opt"><span>Cámara</span>${seg('cam', [['cabina', 'Cabina'], ['afuera', 'Afuera']])}</div>
    <div class="opt"><span>Dirección</span>${seg('sens', [[0.75, 'Suave'], [1, 'Normal'], [1.35, 'Rápida']])}</div>
    <div class="opt"><span>Gráficos</span>${seg('quality', [['alta', 'Altos'], ['baja', 'Bajos']])}</div>
    <p class="hint">Teclas: ↑ acelerar · ↓ frenar y reversa · ← → girar · C cámara · P o Esc pausa. También W A S D.</p>
    <button class="btn" id="reset">Borrar progreso</button>`;
  $('#vol').oninput = e => { save.opt.vol = +e.target.value; SFX.setVol(); persist(); };
  $('#reset').onclick = () => {
    if (Date.now() - resetArm < 2500) {
      save = newSave(); persist(); setCarPaint(G.car, save.paint); toast('Progreso borrado'); renderOptions();
      return;
    }
    resetArm = Date.now();
    toast('Toca otra vez para borrar todo');
  };
}

// ---------- resultado ----------
function showResult(res) {
  const L = G.L, C = G.C, el = $('#result');
  el.classList.toggle('win', res.win); el.classList.toggle('lose', !res.win);
  $('#rTitle').textContent = res.win ? (L.id === 8 ? '¡Llegaste a la cima!' : '¡Llegaste a la meta!') : res.why.includes('caíste') ? '¡Te caíste!' : '¡Se acabó!';
  $('#rSub').textContent = res.win ? `Tiempo ${fmtTime(Math.round(G.time * 10) / 10)} · ${G.coins} monedas · ${C.hits} choques` : res.why;
  const stars = $$('#rStars span');
  stars.forEach(s => s.classList.remove('on'));
  if (res.win) res.got.forEach((g, i) => { if (g) setTimeout(() => { stars[i].classList.add('on'); SFX.star(i); }, 500 + i * 380); });
  $('#rStars').style.display = res.win ? '' : 'none';
  $('#rList').innerHTML = res.win ? L.obj.map((o, i) => `<li class="${res.got[i] ? 'ok' : 'no'}"><span>${objText(o)}</span><b>${res.got[i] ? '✔' : '✘'}${res.newStars[i] ? ' ¡nueva!' : ''}</b></li>`).join('') : '';
  $('#rReward').innerHTML = `<i class="coin"></i>+${res.earned} monedas`;
  const um = $('#rUnlock');
  um.className = 'unlockmsg';
  if (res.opened) um.innerHTML = `🔓 ¡Desbloqueaste ${res.opened.name}!`;
  else {
    const next = LEVELS[LEVELS.indexOf(L) + 1];
    if (!L.free && next && !isOpen(next)) { um.classList.add('no'); um.innerHTML = `Para abrir ${next.name}: ${unlockReqs(next).map(r => `${r.ok ? '✔' : '✘'} ${r.txt}`).join(' · ')}`; }
    else um.style.display = 'none';
  }
  if (res.opened || (!L.free && LEVELS[LEVELS.indexOf(L) + 1] && !isOpen(LEVELS[LEVELS.indexOf(L) + 1]))) um.style.display = '';
  const next = L.free ? null : LEVELS[LEVELS.indexOf(L) + 1];
  const btns = [`<button class="btn" data-act="retry">Reintentar</button>`, `<button class="btn" data-act="map">Mapa</button>`];
  if (res.firstBeat) btns.push(`<button class="btn main" data-act="ending">Continuar</button>`);
  else if (res.win && next && isOpen(next)) btns.push(`<button class="btn main" data-act="next">Siguiente</button>`);
  else btns.push(`<button class="btn ${res.win ? '' : 'main'}" data-act="garage">Taller</button>`);
  if (!res.win) btns.reverse();
  $('#rBtns').innerHTML = btns.join('');
  $$('.coinN').forEach(e => { e.textContent = save.coins.toLocaleString('es-PE'); });
  setTimeout(() => showScreen('result'), res.win ? 400 : 100);
}

function showEnding() {
  showScreen('ending');
  SFX.fanfare();
  const c = $('#confetti');
  const cols = ['#ff7a2f', '#ffc53d', '#3ddc84', '#7ec8ff', '#ff4d8d', '#fff'];
  c.innerHTML = Array.from({ length: 120 }, () => `<i style="left:${Math.random() * 100}%;background:${cols[Math.random() * cols.length | 0]};animation-duration:${2.5 + Math.random() * 3}s;animation-delay:${Math.random() * 2}s"></i>`).join('');
  setTimeout(() => { c.innerHTML = ''; }, 8000);
}

// ---------- acciones ----------
function act(a, el) {
  SFX.init();
  switch (a) {
    case 'play': SFX.click(); G.menuView = 'map'; renderMap(); showScreen('map'); break;
    case 'menu': SFX.click(); goMenu('menu'); break;
    case 'map': SFX.click(); if (G.mode !== 'menu') goMenu('map'); renderMap(); showScreen('map'); break;
    case 'garage': SFX.click(); goMenu('garage'); break;
    case 'badges': SFX.click(); renderBadges(); showScreen('badges'); break;
    case 'options': SFX.click(); renderOptions(); showScreen('options'); break;
    case 'go': SFX.ok(); if (!detailL.free) G.menuLevel = detailL.id; fadeThen(() => startRun(detailL)); break;
    case 'retry': SFX.ok(); fadeThen(() => startRun(G.L)); break;
    case 'next': { SFX.ok(); const n = LEVELS[LEVELS.indexOf(G.L) + 1]; G.menuLevel = n.id; fadeThen(() => startRun(n)); break; }
    case 'resume': resume(); break;
    case 'quit': SFX.click(); fadeThen(() => { G.menuLevel = G.L.free ? G.menuLevel : G.L.id; goMenu('map'); renderMap(); showScreen('map'); }); break;
    case 'cam': toggleCam(); break;
    case 'ending': showEnding(); break;
  }
}
function fadeThen(fn) {
  const f = $('#fade');
  f.classList.add('on');
  setTimeout(() => { fn(); setTimeout(() => f.classList.remove('on'), 60); }, 380);
}
function pause() {
  if (G.mode !== 'drive' && G.mode !== 'count') return;
  G.pausedFrom = G.mode; G.mode = 'pause';
  SFX.stopDrive();
  setCam();
  showScreen('pause');
}
function resume() {
  if (G.mode !== 'pause') return;
  G.mode = G.pausedFrom; G.acc = 0;
  showScreen('hud');
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (b) return act(b.dataset.act, b);
  const lv = e.target.closest('[data-lv]');
  if (lv) return openDetail(lv.dataset.lv);
  const bu = e.target.closest('[data-buy]');
  if (bu) return buy(bu.dataset.buy);
  const pa = e.target.closest('[data-paint]');
  if (pa) return pickPaint(pa.dataset.paint);
  const op = e.target.closest('[data-opt]');
  if (op) {
    const k = op.dataset.opt, raw = op.dataset.val;
    save.opt[k] = raw === 'true' ? true : raw === 'false' ? false : isNaN(+raw) ? raw : +raw;
    persist(); SFX.setVol(); SFX.click();
    if (k === 'quality') applyQuality();
    if (k === 'cam') G.cam = save.opt.cam;
    renderOptions();
    $(`[data-opt=${k}][data-val="${raw}"]`)?.focus();
  }
});
$('#pauseBtn').addEventListener('click', e => { e.stopPropagation(); pause(); });

// Navegación con flechas entre los botones visibles (el más cercano en esa dirección).
function navMove(dx, dy) {
  const root = $(`#${screen}`);
  const items = $$('button:not([disabled]), input', root).filter(b => b.offsetParent !== null);
  if (!items.length) return;
  const cur = document.activeElement && items.includes(document.activeElement) ? document.activeElement : null;
  if (!cur) { items[0].focus(); return; }
  const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bd = Infinity;
  for (const b of items) {
    if (b === cur) continue;
    const r = b.getBoundingClientRect(), bx = r.left + r.width / 2, by = r.top + r.height / 2;
    const ddx = bx - ax, ddy = by - ay;
    if (dx && Math.sign(ddx) !== dx) continue;
    if (dy && Math.sign(ddy) !== dy) continue;
    if (dx && Math.abs(ddx) < 4) continue;
    if (dy && Math.abs(ddy) < 4) continue;
    const d = dx ? Math.abs(ddx) + Math.abs(ddy) * 2.5 : Math.abs(ddy) + Math.abs(ddx) * 2.5;
    if (d < bd) { bd = d; best = b; }
  }
  if (best) { best.focus(); best.scrollIntoView({ block: 'nearest' }); SFX.tone && SFX.tone(440, 0.03, 'triangle', 0.05); }
}

const DRIVE_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
window.addEventListener('keydown', e => {
  if (screen === 'intro') { e.preventDefault(); leaveIntro(); return; }
  const driving = G.mode === 'drive' || G.mode === 'count' || G.mode === 'fall' || G.mode === 'finish';
  if (driving) {
    if (DRIVE_KEYS.includes(e.code)) { KEYS[e.code] = true; e.preventDefault(); }
    if (e.code === 'KeyC') toggleCam();
    if (e.code === 'Escape' || e.code === 'KeyP') pause();
    return;
  }
  if (G.mode === 'pause' && (e.code === 'Escape' || e.code === 'KeyP')) { resume(); return; }
  if (e.target.tagName === 'INPUT' && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) return;
  const nav = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.code];
  if (nav) { e.preventDefault(); navMove(...nav); return; }
  if (e.code === 'Escape' || e.code === 'Backspace') {
    if (screen === 'detail') act('map');
    else if (['map', 'garage', 'badges', 'options'].includes(screen)) act('menu');
  }
});
window.addEventListener('keyup', e => { KEYS[e.code] = false; });
window.addEventListener('blur', () => { for (const k in KEYS) KEYS[k] = false; pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

// controles táctiles
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) document.body.classList.add('touch');
for (const b of $$('#touch button')) {
  const k = b.dataset.k;
  const on = e => { e.preventDefault(); TOUCH[k] = true; b.classList.add('on'); SFX.init(); };
  const off = e => { e.preventDefault(); TOUCH[k] = false; b.classList.remove('on'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
}

function leaveIntro() {
  if (screen !== 'intro') return;
  SFX.init(); SFX.ok();
  goMenu('menu');
}
$('#intro').addEventListener('pointerdown', leaveIntro);

// ---------- bucle ----------
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - (G.last || now)) / 1000);
  G.last = now;
  G.t += dt;
  step(dt);
}
function step(dt) {
  if (G.C) {
    if (G.mode !== 'pause' && G.mode !== 'menu') simulate(dt);
    poseCar(G.car, G.C, G.mode === 'pause' ? 0 : dt);
    if (G.cam === 'cabina' || G.mode === 'menu') poseCockpit(G.car, G.C);
    updateCamera(dt);
    // la sombra sigue al carro
    W.sun.position.set(G.C.x + W.sunDir.x * 120, G.C.y + W.sunDir.y * 120, G.C.z + W.sunDir.z * 120);
    W.sun.target.position.set(G.C.x, G.C.y, G.C.z);
    W.sky.position.copy(W.camera.getWorldPosition(_cv));
    const driving = G.mode === 'drive' || G.mode === 'count' || G.mode === 'fall' || G.mode === 'finish';
    SFX.drive(G.C, driving, W.theme && W.theme.rain && G.mode !== 'menu');
    if (driving) hud();
  }
  if (G.mode !== 'pause') updateWorld(G.t, dt);
  W.renderer.render(W.scene, W.camera);
}

function boot() {
  initWorld($('#gl'));
  resizeWorld();
  window.addEventListener('resize', resizeWorld);
  G.cam = save.opt.cam || 'cabina';
  const best = [...LEVELS].reverse().find(isOpen) || LEVELS[0];
  loadLevel(best);
  G.mode = 'menu';
  goMenu('menu');
  showScreen('intro');
  document.body.classList.add('ready');
  requestAnimationFrame(frame);
}
boot();
