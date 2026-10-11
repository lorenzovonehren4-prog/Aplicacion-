'use strict';
// Drive In The Serrín: pantallas (intro, menú, mapa de montañas, taller, insignias, opciones, pausa,
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
  G.attract = view !== 'garage';
  if (G.attract) startAttract();
  renderMenu();
  if (view === 'garage') renderGarage();
  showScreen(view);
}

// ---------- dibujos de cada montaña ----------
// Paisaje en SVG con los colores del ambiente: cielo, sol o luna, tres cordilleras y la carretera.
function mountArt(L) {
  const th = THEMES[L.theme], r = rng(L.seed + 7), id = 'g' + L.seed;
  const ridge = (y0, amp, n) => { let d = `M0 160L0 ${y0}`; for (let i = 1; i <= n; i++) d += `L${(i / n * 400).toFixed(0)} ${(y0 - r() * amp).toFixed(0)}`; return d + 'L400 160Z'; };
  const sun = th.night ? `<circle cx="320" cy="34" r="14" fill="#e8eeff"/><circle cx="326" cy="30" r="12" fill="${hex(th.skyTop)}"/>` : th.rain ? '' : `<circle cx="${L.theme === 'cima' ? 300 : 330}" cy="${L.theme === 'cima' ? 92 : 36}" r="20" fill="${hex(th.sun)}" opacity=".9"/>`;
  const stars = th.night ? Array.from({ length: 30 }, () => `<circle cx="${(r() * 400).toFixed(0)}" cy="${(r() * 70).toFixed(0)}" r="${(0.5 + r()).toFixed(1)}" fill="#fff" opacity=".8"/>`).join('') : '';
  const snow = th.snow ? `<path d="${ridge(70, 46, 7)}" fill="#fff" opacity=".85" transform="translate(0,-4) scale(1,.98)"/>` : '';
  const lava = th.lava ? '<rect y="140" width="400" height="20" fill="#ff6a1a"/><rect y="136" width="400" height="6" fill="#ffb24a" opacity=".7"/>' : '';
  const rain = th.rain ? Array.from({ length: 40 }, () => { const x = r() * 420, y = r() * 160; return `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x - 6).toFixed(0)}" y2="${(y + 16).toFixed(0)}" stroke="#cfd8e6" stroke-width="1" opacity=".5"/>`; }).join('') : '';
  const fog = L.theme === 'niebla' ? '<rect width="400" height="160" fill="#c8cfcc" opacity=".55"/>' : '';
  return `<svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hex(th.skyTop)}"/><stop offset="1" stop-color="${hex(th.skyBot)}"/></linearGradient></defs>
    <rect width="400" height="160" fill="url(#${id})"/>${stars}${sun}
    <path d="${ridge(70, 46, 7)}" fill="${hex(th.far)}"/>${snow}
    <path d="${ridge(105, 34, 9)}" fill="${hex(th.rock[1])}"/>
    <path d="${ridge(132, 22, 12)}" fill="${hex(th.rock[0])}"/>${lava}
    <path d="M150 160 C170 140 230 140 215 128 C200 118 250 112 262 104" fill="none" stroke="#3b3b3e" stroke-width="7" stroke-linecap="round"/>
    <path d="M150 160 C170 140 230 140 215 128 C200 118 250 112 262 104" fill="none" stroke="#e9b52c" stroke-width="1.2" stroke-dasharray="4 4"/>${fog}${rain}</svg>`;
}
// Cuánto cuesta cada montaña (1 a 5) para los puntitos de las fichas.
function difficulty(L) {
  const curv = Math.max(1, Math.min(5, Math.round(1 + (L.hair || 0) * 7 + (40 - L.rMin) / 10)));
  const drop = 1 - (L.mix.C || 0), abyss = Math.max(1, Math.min(5, Math.round(drop * (1 - L.guard) * 6 + (L.mix.B || 0) * 6)));
  const clima = L.grip < 0.9 ? 'resbala' : THEMES[L.theme].night ? 'de noche' : L.theme === 'niebla' ? 'niebla' : L.rocks ? 'rocas' : 'despejado';
  return { curv, abyss, clima };
}
const pips = n => '●'.repeat(n) + `<i>${'●'.repeat(5 - n)}</i>`;
// La forma de la ruta (se arma sólo los datos, sin 3D) y se guarda.
const routeCache = {};
function routeOf(L) { return routeCache[L.seed] || (routeCache[L.seed] = buildRoad(L)); }
function drawRoute(cv, L) {
  const T = routeOf(L), g = cv.getContext('2d'), w = cv.width, h = cv.height, pad = 18;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let s = 0; s < T.n; s += 5) { x0 = Math.min(x0, T.x[s]); x1 = Math.max(x1, T.x[s]); z0 = Math.min(z0, T.z[s]); z1 = Math.max(z1, T.z[s]); }
  // la ruta va "hacia arriba" en el dibujo
  const sc = Math.min((w - pad * 2) / (x1 - x0 || 1), (h - pad * 2) / (z1 - z0 || 1));
  const P = s => [w / 2 - (T.x[s] - (x0 + x1) / 2) * sc, h / 2 + (T.z[s] - (z0 + z1) / 2) * sc];
  g.clearRect(0, 0, w, h);
  g.lineCap = g.lineJoin = 'round';
  const path = () => { g.beginPath(); for (let s = 0; s < T.n; s += 4) { const p = P(s); s ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } };
  path(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 9; g.stroke();
  path(); g.strokeStyle = '#59606e'; g.lineWidth = 6; g.stroke();
  // tramos con abismo sin baranda
  g.strokeStyle = '#ff4d4d'; g.lineWidth = 3;
  for (let s = 0; s < T.n - 4; s += 4) { const d = (T.wL[s] > 0.5 && !T.gL[s]) || (T.wR[s] > 0.5 && !T.gR[s]); if (!d) continue; const a = P(s), b = P(s + 4); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  path(); g.strokeStyle = '#1ec8ff'; g.lineWidth = 1.6; g.setLineDash([5, 4]); g.stroke(); g.setLineDash([]);
  for (const n of T.notes) if (n.lvl >= 5) { const p = P(Math.round((n.s + n.end) / 2)); g.fillStyle = n.lvl >= 6 ? '#ff4d4d' : '#ffb020'; g.beginPath(); g.arc(p[0], p[1], 4.5, 0, 7); g.fill(); }
  const a = P(0), b = P(T.n - 1);
  g.fillStyle = '#3ddc84'; g.beginPath(); g.arc(a[0], a[1], 6, 0, 7); g.fill();
  g.font = '16px sans-serif'; g.textAlign = 'center'; g.fillText('🏁', b[0], b[1] + 5);
}

// La próxima montaña para "Continuar": la primera abierta sin terminar, o la última abierta.
function nextLevel() { return LEVELS.find(L => isOpen(L) && !lvSave(L.id).done) || [...LEVELS].reverse().find(isOpen) || LEVELS[0]; }

function renderMenu() {
  const nx = nextLevel(), done = LEVELS.filter(L => lvSave(L.id).done).length;
  const allDone = done === 8;
  $('#mmGoT').textContent = done ? 'Continuar' : 'Jugar';
  $('#mmNext').textContent = `Montaña ${nx.id} · ${nx.name}`;
  $('#mmMaps').textContent = `${done}/8 terminadas · ★ ${totalStars()}/24`;
  const cheap = UPGRADES.map(u => save.upg[u.id] < UPG_MAX ? u.cost[save.upg[u.id]] : Infinity).reduce((a, b) => Math.min(a, b), Infinity);
  $('#mmGar').textContent = cheap === Infinity ? 'Todo al máximo' : save.coins >= cheap ? '¡Tienes para una mejora!' : `Próxima mejora: ${cheap} monedas`;
  $('#mmAch').textContent = `${Object.keys(save.ach).length}/${ACHS.length} ganadas`;
  $('#starsN').textContent = `★ ${totalStars()}/24`;
  $('#lvlN').textContent = save.beat ? '🦅 Juego pasado' : `⛰️ ${done}/8`;
  const s = lvSave(nx.id);
  $('#mmCard').innerHTML = `<div class="art">${mountArt(nx)}</div><div class="in">
    <div class="k">${allDone ? 'MEJORA TU MARCA' : 'SIGUIENTE MONTAÑA'} · ${nx.id}/8</div><h3>${nx.name}</h3>
    <div class="stars">${s.stars.map(v => v ? '★' : '☆').join('')}</div>
    <ul>${nx.obj.map((o, i) => `<li class="${s.stars[i] ? 'ok' : ''}">${s.stars[i] ? '✔' : '○'} ${objText(o)}</li>`).join('')}</ul></div>`;
}

function renderMap() {
  const el = $('#levels'), nx = nextLevel();
  const cards = LEVELS.map(L => {
    const open = isOpen(L), s = lvSave(L.id), df = difficulty(L);
    const st = s.stars.map(v => v ? '★' : '<i>★</i>').join('');
    const req = `<ul class="req">${unlockReqs(L).map(r => `<li class="${r.ok ? 'ok' : 'no'}">${r.ok ? '✔' : '✘'} ${r.txt}</li>`).join('')}</ul>`;
    return `<button class="lv ${open ? '' : 'locked'} ${open && L === nx && !s.done ? 'next' : ''}" data-lv="${L.id}">
      <div class="art">${mountArt(L)}</div>
      <span class="badge">${L.id === 8 ? 'FINAL' : 'MONTAÑA ' + L.id}</span>${s.done && !(L === nx && !s.done) ? '<span class="done">✔ Pasada</span>' : ''}
      ${open ? '' : '<span class="lock">🔒</span>'}
      <div class="in"><h3>${L.name}</h3>
      ${open ? `<div class="row2"><span class="stars">${st}</span><span class="best">${s.best ? '⏱ ' + fmtTime(Math.round(s.best * 10) / 10) : ''}</span></div>
        <div class="pips"><small>Curvas</small><span>${pips(df.curv)}</span><small>Abismo</small><span>${pips(df.abyss)}</span><small>Clima</small><small>${df.clima}</small></div>` : req}
      </div></button>`;
  });
  if (save.beat) {
    cards.push(`<button class="lv" data-lv="free"><div class="art">${mountArt(Object.assign({}, LEVELS[7], { seed: 4242 }))}</div><span class="badge">DESBLOQUEADO</span><div class="in"><h3>🧭 Ruta libre</h3><div class="best">Una montaña nueva cada vez · ${save.stats.free} terminadas</div></div></button>`);
  }
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
  const L = detailL, s = L.free ? null : lvSave(L.id), T = routeOf(L), df = difficulty(L);
  $('#dArt').innerHTML = mountArt(L);
  $('#dNum').textContent = L.free ? 'Ruta libre' : `Montaña ${L.id} de 8`;
  $('#dName').textContent = L.name;
  $('#dDesc').textContent = L.desc;
  const hp = T.notes.filter(n => n.lvl >= 6).length, tight = T.notes.filter(n => n.lvl === 5).length;
  let guard = 0, drop = 0;
  for (let q = 0; q < T.n; q += 2) for (const [w, g] of [[T.wL, T.gL], [T.wR, T.gR]]) if (w[q] > 0.5) { drop++; if (g[q]) guard++; }
  $('#dFacts').innerHTML = `<div><span>Largo</span><b>${(L.len / 1000).toFixed(1)} km</b></div>
    <div><span>Curvas</span><b>${T.notes.length}</b></div>
    <div><span>Horquillas</span><b style="color:#ff7a6a">${hp}</b></div>
    <div><span>Muy cerradas</span><b style="color:#ffb020">${tight}</b></div>
    <div><span>Abismo con baranda</span><b>${drop ? Math.round(guard / drop * 100) : 100}%</b></div>
    <div><span>Clima</span><b>${df.clima}</b></div>
    ${s && s.best ? `<div><span>Tu mejor tiempo</span><b>${fmtTime(Math.round(s.best * 10) / 10)}</b></div>` : ''}`;
  drawRoute($('#dRoute'), L);
  $('#dObjs').innerHTML = L.obj.map((o, i) => `<li class="${s && s.stars[i] ? 'got' : ''}"><span class="st">⭐</span>${objText(o)}</li>`).join('');
  SFX.click();
  showScreen('detail');
}

// Barras de lo que hace el carro; `prev` muestra en verde cómo quedaría con una mejora más.
function statBars(prev) {
  const u = save.upg, cur = carStats(u), nx = prev ? carStats(Object.assign({}, u, { [prev]: Math.min(UPG_MAX, u[prev] + 1) })) : cur;
  const max = carStats({ motor: UPG_MAX, frenos: UPG_MAX, llantas: UPG_MAX, chasis: UPG_MAX }), min = carStats({ motor: 0, frenos: 0, llantas: 0, chasis: 0 });
  const rows = [['Velocidad', 'top', v => Math.round(v * 3.6) + ' km/h'], ['Aceleración', 'acc', v => v.toFixed(1)], ['Frenada', 'brake', v => v.toFixed(1)], ['Agarre', 'grip', v => v.toFixed(2) + ' g'], ['Carrocería', 'hp', v => Math.round(v)]];
  const pct = (k, v) => 18 + (v - min[k]) / (max[k] - min[k]) * 82;
  $('#cbars').innerHTML = rows.map(([n, k, f]) => `<div class="cbar"><span>${n}</span><span class="tr"><i class="nx" style="width:${pct(k, nx[k])}%"></i><i class="cu" style="width:${pct(k, cur[k])}%"></i></span><b>${f(nx[k])}</b></div>`).join('');
}
const UPG_ICO = { motor: '⚙️', frenos: '🛑', llantas: '🛞', chasis: '🛡️' };
function renderGarage() {
  const u = save.upg;
  $('#upgs').innerHTML = UPGRADES.map(up => {
    const lv = u[up.id], max = lv >= UPG_MAX, cost = max ? 0 : up.cost[lv];
    return `<div class="upg"><span class="ui">${UPG_ICO[up.id]}</span><b>${up.name} <small style="display:inline;color:var(--muted)">nivel ${lv}/${UPG_MAX}</small></b><small>${up.desc}</small>
      <div class="bars">${Array.from({ length: UPG_MAX }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div>
      <button class="btn small ${!max && save.coins >= cost ? 'main' : ''}" data-buy="${up.id}" ${max ? 'disabled' : ''}>${max ? 'Máximo' : `<i class="coin"></i>${cost}`}</button></div>`;
  }).join('');
  $('#paints').innerHTML = PAINTS.map(p => {
    const own = save.paints.includes(p.id);
    const price = own ? '' : p.cost < 0 ? '<span class="pr">final</span>' : `<span class="pr">${p.cost}</span>`;
    return `<button class="sw ${save.paint === p.id ? 'sel' : ''} ${own ? '' : 'lockd'}" data-paint="${p.id}" title="${p.name}" aria-label="${p.name}" style="background:${p.metal ? 'linear-gradient(135deg,#fff3b0,#e5b53a 50%,#9a6a10)' : hex(p.c)}">${price}</button>`;
  }).join('');
  statBars(null);
  for (const b of $$('[data-buy]')) {
    const show = () => statBars(b.dataset.buy), hide = () => statBars(null);
    b.addEventListener('mouseenter', show); b.addEventListener('focus', show);
    b.addEventListener('mouseleave', hide); b.addEventListener('blur', hide);
  }
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
    <div class="opt"><span>Línea de guía</span>${seg('line', [['simple', 'Simple'], ['color', 'Con colores'], ['no', 'No']])}</div>
    <div class="opt"><span>Voz del copiloto</span>${seg('copi', [[true, 'Sí'], [false, 'No']])}</div>
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
  $('#rTitle').textContent = res.win ? (L.id === 8 ? '¡Llegaste a la cima!' : '¡Llegaste a la meta!') : res.why.includes('caíste') ? '¡Te caíste!' : res.why.includes('Chocaste') ? '¡Chocaste!' : '¡Se acabó!';
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
    case 'continue': { const nx = nextLevel(); openDetail(nx.id); break; }
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
    if (k === 'line') applyLineOpt();
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
  const driving = G.mode === 'drive' || G.mode === 'count' || G.mode === 'fall' || G.mode === 'crash' || G.mode === 'finish';
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
    else if (G.mode === 'menu' && G.attract) attractStep(dt);
    poseCar(G.car, G.C, G.mode === 'pause' ? 0 : dt);
    if (G.cam === 'cabina' || G.mode === 'menu') poseCockpit(G.car, G.C);
    updateCamera(dt);
    // a más velocidad se abre un poco el ángulo de la cámara (sensación de velocidad)
    const fovT = W.baseFov + (G.mode === 'drive' ? Math.max(0, G.C.f / G.st.top - 0.35) * 14 : 0);
    if (Math.abs(W.camera.fov - fovT) > 0.05) { W.camera.fov += (fovT - W.camera.fov) * Math.min(1, dt * 3); W.camera.updateProjectionMatrix(); }
    if (W.line) { W.line.material.uniforms.uS.value = G.C.s; W.line.material.uniforms.uV.value = G.C.f; }
    // la sombra sigue al carro
    W.sun.position.set(G.C.x + W.sunDir.x * 120, G.C.y + W.sunDir.y * 120, G.C.z + W.sunDir.z * 120);
    W.sun.target.position.set(G.C.x, G.C.y, G.C.z);
    W.sky.position.copy(W.camera.getWorldPosition(_cv));
    const driving = G.mode === 'drive' || G.mode === 'count' || G.mode === 'fall' || G.mode === 'crash' || G.mode === 'finish';
    SFX.drive(G.C, driving, W.theme && W.theme.rain && G.mode !== 'menu', G.mode === 'drive' || G.mode === 'count' ? inp.thr : 0);
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
