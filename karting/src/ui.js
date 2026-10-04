'use strict';
// Interfaz: pantallas, controles (teclado y mando), cámara, HUD, garaje, campeonato y bucle principal.

const $ = id => document.getElementById(id);
const UI = { screen: null, stack: [], tab: 'body', sel: { track: null, diff: null, laps: 3 }, champ: null, paused: false, camMode: 0, toastT: 0 };

// ---------- pantallas ----------
function show(id, push) {
  if (push && UI.screen) UI.stack.push(UI.screen);
  document.querySelectorAll('.scr').forEach(s => s.classList.toggle('on', s.id === id || (id === 'pause' && s.id === 'hud') || (id === 'results' && s.id === 'hud') || (id === 'standings' && false)));
  UI.screen = id;
  const first = document.querySelector('#' + id + ' .trk.on, #' + id + ' button:not(:disabled)');
  if (first && id !== 'hud') first.focus({ preventScroll: true });
}
function back() {
  SFX.click();
  if (UI.screen === 'pause') return resume();
  const prev = UI.stack.pop();
  if (prev) show(prev); else goTitle();
}

function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show'); UI.toastT = 2.6;
}

// ---------- menú principal y garaje 3D ----------
let showKart = null;
function goTitle() {
  if (R.on) endRace();
  SFX.silence();
  UI.stack = []; UI.paused = false;
  W.garage.visible = true;
  W.scene.background = new THREE.Color('#15121C'); W.scene.fog = new THREE.Fog('#15121C', 12, 30);
  W.hemi.color.set('#B7A8FF'); W.hemi.groundColor.set('#2A2230'); W.hemi.intensity = 0.35;
  W.sun.color.set('#ffffff'); W.sun.intensity = 1.8; W.sunDir = new THREE.Vector3(0.4, 1, 0.6).normalize();
  W.scene.environment = makeEnv('garaje'); W.renderer.toneMappingExposure = 1.0;
  refreshShowKart();
  refreshProfile();
  CAM.snapMenu = true;
  show('title');
}
// Tarjeta de perfil: fondo, marco y título elegidos en el garaje
function paintProfile(el) {
  if (!el) return;
  const li = levelInfo(save.xp);
  const fr = cosById('frame', save.eq.frame), bn = cosById('banner', save.eq.banner), ti = cosById('title', save.eq.title);
  el.className = 'profile ' + bn.cls;
  el.querySelector('.avatar').className = 'avatar ' + fr.cls;
  el.querySelector('.lvl').textContent = li.lvl;
  el.querySelector('.pname').textContent = save.name;
  const t = el.querySelector('.ptitle'); t.textContent = ti.name; t.classList.toggle('goldtxt', !!ti.gold);
  const xp = el.querySelector('.pxp'); if (xp) xp.textContent = `Nivel ${li.lvl} · ${li.cur} / ${li.need} XP`;
  const bar = el.querySelector('.bar i'); if (bar) bar.style.width = (li.cur / li.need * 100) + '%';
  const hb = el.querySelector('.helm'); if (hb) { const h = cosById('helmet', save.eq.helmet); hb.style.background = `linear-gradient(90deg, ${h.a} 0 38%, ${h.b} 38% 62%, ${h.a} 62%)`; }
}
function refreshShowKart() {
  if (showKart) W.garage.remove(showKart);
  showKart = makeKart(save.eq);
  showKart.position.y = 0.12;
  W.garage.add(showKart);
}
function refreshProfile() {
  const li = levelInfo(save.xp);
  $('pCoins').textContent = save.coins;
  $('gCoins').textContent = save.coins;
  $('champSub').textContent = CHAMP_TRACKS.length + ' carreras · por puntos';
  paintProfile($('profileCard'));
  paintProfile($('gProfile'));
  $('statLine').textContent = `${save.stats.races} carreras · ${save.stats.wins} victorias · ${save.stats.cups} copas`;
}

// ---------- elegir pista ----------
function openTracks(mode) {
  UI.mode = mode;
  UI.sel.track = UI.sel.track || save.last.track;
  UI.sel.diff = UI.sel.diff || save.last.diff;
  UI.sel.laps = save.last.laps || 3;
  $('trkHead').textContent = mode === 'champ' ? 'Campeonato · ' + CHAMP_TRACKS.length + ' carreras' : 'Elige tu pista';
  $('btnGo').textContent = mode === 'champ' ? 'Empezar campeonato' : 'Correr';
  renderTracks();
  show('tracks', true);
}
function renderTracks() {
  const champ = UI.mode === 'champ';
  const list = $('trkList'); list.innerHTML = '';
  TRACKS.forEach((t, k) => {
    const b = document.createElement('button');
    b.className = 'trk' + (t.id === UI.sel.track ? ' on' : '');
    b.innerHTML = `${t.name}<span>${champ ? 'Carrera ' + (k + 1) : t.id === UI.sel.track ? 'Actual' : t.title}</span>`;
    b.onclick = () => { SFX.click(); UI.sel.track = t.id; renderTracks(); };
    b.onfocus = () => { if (!champ && !b.disabled && UI.sel.track !== t.id) { UI.sel.track = t.id; renderTrackInfo(); list.querySelectorAll('.trk').forEach(x => x.classList.toggle('on', x === b)); } };
    list.appendChild(b);
  });
  const dr = $('diffRow'); dr.innerHTML = '';
  DIFFS.forEach(d => {
    const c = document.createElement('button');
    c.className = 'chip' + (d.id === UI.sel.diff ? ' on' : '');
    c.textContent = d.name;
    c.onclick = () => { SFX.click(); UI.sel.diff = d.id; renderTracks(); c.focus(); };
    dr.appendChild(c);
  });
  const lr = $('lapsRow'); lr.innerHTML = '';
  $('lapsLbl').style.display = lr.style.display = champ ? 'none' : '';
  LAP_OPTIONS.forEach(n => {
    const c = document.createElement('button');
    c.className = 'chip' + (n === UI.sel.laps ? ' on' : '');
    c.textContent = n + ' vueltas';
    c.onclick = () => { SFX.click(); UI.sel.laps = n; renderTracks(); };
    lr.appendChild(c);
  });
  renderTrackInfo();
}
function renderTrackInfo() {
  const t = trackById(UI.sel.track);
  $('trkName').textContent = t.name + ' · ' + t.title;
  const T = trackData(t), tags = [t.indoor ? 'Bajo techo' : 'Al aire libre', Math.round(T.L) + ' m'];
  if (T.py.some(y => y > 2.8)) tags.push('Segundo piso'); if (T.tunnel.some(Boolean)) tags.push('Túnel');
  $('trkSub').textContent = tags.join(' · ');
  $('trkDesc').textContent = UI.mode === 'champ' ? 'Las ' + CHAMP_TRACKS.length + ' pistas seguidas. Puntos: 10, 7, 5, 3, 2, 1. El campeón se lleva un premio grande.' : t.desc;
  const pb = save.pb[t.id];
  $('trkPb').textContent = pb && pb.lap ? fmtTime(pb.lap) : '--.---';
  const pot = pb && pb.sec && pb.sec.every(v => v != null) ? pb.sec.reduce((a, b) => a + b, 0) : null;
  $('trkPot').textContent = fmtTime(pot);
  drawTrackPreview($('trkPreview'), t);
}
const TDATA = {};
function trackData(t) { return TDATA[t.id] || (TDATA[t.id] = buildTrackData(t)); }
function trackLength(t) { return trackData(t).L; }

function drawTrackPreview(cv, def) {
  const T = trackData(def), g = cv.getContext('2d'), w = cv.width, h = cv.height;
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, def.indoor ? '#1E1828' : '#2E5A3A'); gr.addColorStop(1, def.indoor ? '#0E0C14' : '#1C3A24');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const f = fitTransform(T, w, h, 26);
  drawTrackShape(g, T, f, T.def.width * f.s, def.barrier);
  // meta y sentido
  const [sx, sy] = f(T.px[0], T.pz[0]);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(sx, sy, 6, 0, 7); g.fill();
  const [ax, ay] = f(T.px[8], T.pz[8]);
  g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ax, ay); g.stroke();
}
// Dibuja la pista de arriba: lo de abajo primero, los puentes encima y los túneles punteados
function drawTrackShape(g, T, f, width, cols) {
  const N = T.N;
  const runs = [];
  let cur = null;
  for (let i = 0; i <= N; i++) {
    const k = i % N, lvl = T.py[k] > 2.8 ? 1 : 0;
    if (!cur || cur.lvl !== lvl) { if (cur) { cur.pts.push(k); } cur = { lvl, pts: [] }; runs.push(cur); }
    cur.pts.push(k);
  }
  g.lineJoin = 'round'; g.lineCap = 'butt';
  for (const lvl of [0, 1]) for (const r of runs) {
    if (r.lvl !== lvl) continue;
    const path = () => { g.beginPath(); r.pts.forEach((k, j) => { const [x, y] = f(T.px[k], T.pz[k]); j ? g.lineTo(x, y) : g.moveTo(x, y); }); };
    if (lvl) { path(); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = width + 14; g.stroke(); }
    path(); g.strokeStyle = cols[0]; g.lineWidth = width + 8; g.stroke();
    path(); g.strokeStyle = cols[1]; g.lineWidth = width + 3; g.stroke();
    path(); g.strokeStyle = lvl ? '#5A5666' : '#3E3B48'; g.lineWidth = width; g.stroke();
  }
  // túneles
  g.setLineDash([Math.max(4, width * 0.5), Math.max(4, width * 0.5)]);
  g.beginPath(); let on = false;
  for (let i = 0; i <= N; i++) { const k = i % N; const [x, y] = f(T.px[k], T.pz[k]); if (T.tunnel[k]) { on ? g.lineTo(x, y) : g.moveTo(x, y); on = true; } else on = false; }
  g.strokeStyle = 'rgba(10,8,16,.85)'; g.lineWidth = width + 8; g.stroke(); g.setLineDash([]);
}
function fitTransform(T, w, h, pad) {
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (let i = 0; i < T.N; i++) { a = Math.min(a, T.px[i]); b = Math.max(b, T.px[i]); c = Math.min(c, T.pz[i]); d = Math.max(d, T.pz[i]); }
  const s = Math.min((w - pad * 2) / (b - a), (h - pad * 2) / (d - c));
  const ox = (w - (b - a) * s) / 2, oy = (h - (d - c) * s) / 2;
  // x de la pista hacia la izquierda en pantalla para que coincida con la vista desde arriba
  const f = (x, z) => [w - (ox + (x - a) * s), oy + (d - z) * s];
  f.s = s;
  return f;
}

// ---------- empezar carreras ----------
function pickBots(n) {
  const names = BOT_NAMES.slice().sort(() => Math.random() - 0.5).slice(0, n);
  return names.map(name => ({ name, look: botLook() }));
}
function playerEntry() { return { name: save.name, isPlayer: true, look: Object.assign({}, save.eq) }; }

function go() {
  SFX.init(); SFX.click();
  save.last = { track: UI.sel.track, diff: UI.sel.diff, laps: UI.sel.laps };
  persist();
  if (UI.mode === 'champ') {
    const drivers = [...pickBots(5), playerEntry()];
    UI.champ = { diff: UI.sel.diff, race: 0, drivers, pts: drivers.map(() => 0) };
    startChampRace();
  } else {
    UI.champ = null;
    UI.lastGrid = [...pickBots(5), playerEntry()];
    launch(trackById(UI.sel.track), diffById(UI.sel.diff), UI.sel.laps, 'quick', UI.lastGrid);
  }
}
function startChampRace() {
  const C = UI.champ;
  // grilla: el que va último en el campeonato larga adelante
  const order = C.drivers.map((d, i) => i).sort((a, b) => C.pts[a] - C.pts[b] || (C.drivers[a].isPlayer ? 1 : -1));
  const grid = C.race === 0 ? C.drivers : order.map(i => C.drivers[i]);
  UI.lastGrid = grid;
  launch(trackById(CHAMP_TRACKS[C.race]), diffById(C.diff), 3, 'champ', grid);
}
function launch(def, diff, laps, mode, grid) {
  W.garage.visible = false;
  $('loading').textContent = 'Cargando ' + def.title + '…';
  document.body.classList.remove('ready');
  setTimeout(() => {
    startRace(def, diff, laps, mode, grid);
    CAM.snap = true;
    UI.paused = false;
    UI.stack = [];
    show('hud');
    $('hint').style.opacity = 1;
    UI.hintT = 6;
    drawMinimapBase();
    document.body.classList.add('ready');
  }, 30);
}

// ---------- pausa ----------
function pause() {
  if (!R.on || R.state === 'results' || UI.paused) return;
  UI.paused = true; SFX.silence();
  $('btnRestart').textContent = R.mode === 'champ' ? 'Reiniciar esta carrera' : 'Reiniciar carrera';
  show('pause');
}
function resume() { UI.paused = false; show('hud'); }
function restart() {
  UI.paused = false;
  launch(R.def, R.diff, R.laps, R.mode, UI.lastGrid);
}

// ---------- resultados ----------
function showResults() {
  const pl = R.player, pos = R.finishOrder.indexOf(pl) + 1;
  const champ = R.mode === 'champ';
  const before = levelInfo(save.xp).lvl;
  const coins = Math.round(COINS_BY_POS[pos - 1] * R.diff.coin);
  const xp = Math.round(XP_BY_POS[pos - 1] * (0.75 + R.diff.coin * 0.25)) + (pos === 1 ? 25 : 0);
  save.coins += coins; save.xp += xp;
  save.stats.races++; if (pos === 1) save.stats.wins++; if (pos <= 3) save.stats.podiums++;
  persist();
  const after = levelInfo(save.xp).lvl;
  $('resTitle').textContent = pos === 1 ? '¡Ganaste!' : pos <= 3 ? '¡Podio! Llegaste ' + pos + '.º' : 'Llegaste ' + pos + '.º';
  $('resSub').textContent = R.def.name + ' · ' + R.def.title + ' · ' + R.diff.name;
  $('resPtsH').style.display = champ ? '' : 'none';
  const lead = R.finishOrder[0];
  $('resBody').innerHTML = R.finishOrder.map((k, i) => {
    const t = k.finishTime == null ? 'No terminó' : i === 0 ? fmtTime(k.finishTime) : '+' + fmtTime(k.finishTime - lead.finishTime);
    const pts = champ ? `<td>${POINTS[i]}</td>` : '';
    return `<tr class="${k.isPlayer ? 'me' : ''}"><td class="p">${i + 1}</td><td><span class="dot" style="background:${cosById('body', k.look.body.id || k.look.body).c}"></span>${esc(k.name)}</td><td>${fmtTime(k.bestLap)}</td><td>${t}</td>${pts}</tr>`;
  }).join('');
  $('resReward').innerHTML = `<span><span class="coin"></span>+${coins}</span><span class="purple">+${xp} XP</span><span class="muted">Mejor vuelta: ${fmtTime(pl.bestLap)}</span>`;
  $('resUnlocks').innerHTML = unlockText(before, after);
  if (pos === 1) SFX.fanfare(); else SFX.coin();
  const btns = $('resBtns'); btns.innerHTML = '';
  const mk = (txt, cls, fn) => { const b = document.createElement('button'); b.className = 'b ' + cls; b.textContent = txt; b.onclick = () => { SFX.click(); fn(); }; btns.appendChild(b); };
  if (champ) {
    const C = UI.champ;
    R.finishOrder.forEach((k, i) => { const di = C.drivers.findIndex(d => d.name === k.name); C.pts[di] += POINTS[i]; });
    C.race++;
    mk('Ver clasificación', 'go', showStandings);
  } else {
    mk('Correr otra vez', 'go', restart);
    mk('Cambiar pista', 'ghost', () => { endRace(); goTitle(); openTracks('quick'); });
    mk('Menú', 'red', goTitle);
  }
  show('results');
}
function unlockText(before, after) {
  if (after <= before) return '';
  const out = [`¡Subiste a nivel ${after}!`];
  for (let l = before + 1; l <= after; l++) {
    const cos = Object.values(COSMETICS).flat().filter(c => c.lvl === l && c.cost > 0);
    if (cos.length) out.push(cos.length + ' piezas nuevas en el garaje: ' + cos.slice(0, 3).map(c => c.name).join(', ') + (cos.length > 3 ? '…' : ''));
  }
  return out.join(' · ');
}
function showStandings() {
  const C = UI.champ, done = C.race >= CHAMP_TRACKS.length;
  const order = C.drivers.map((d, i) => i).sort((a, b) => C.pts[b] - C.pts[a]);
  $('stTitle').textContent = done ? 'Campeonato terminado' : 'Clasificación';
  $('stSub').textContent = done ? 'Resultado final · ' + diffById(C.diff).name : `Después de la carrera ${C.race} de ${CHAMP_TRACKS.length} · siguiente: ${trackById(CHAMP_TRACKS[C.race]).title}`;
  $('stBody').innerHTML = order.map((di, i) => {
    const d = C.drivers[di];
    return `<tr class="${d.isPlayer ? 'me' : ''}"><td class="p">${i + 1}</td><td><span class="dot" style="background:${cosById('body', d.look.body.id || d.look.body).c}"></span>${esc(d.name)}</td><td><b>${C.pts[di]}</b></td></tr>`;
  }).join('');
  const btns = $('stBtns'); btns.innerHTML = '';
  const mk = (txt, cls, fn) => { const b = document.createElement('button'); b.className = 'b ' + cls; b.textContent = txt; b.onclick = () => { SFX.click(); fn(); }; btns.appendChild(b); };
  const rw = $('stReward'); rw.style.display = 'none';
  if (done) {
    const place = order.findIndex(di => C.drivers[di].isPlayer) + 1;
    const bonus = Math.round(CHAMP_BONUS[place - 1] * diffById(C.diff).coin);
    const before = levelInfo(save.xp).lvl;
    const xp = place === 1 ? 150 : place <= 3 ? 80 : 30;
    save.coins += bonus; save.xp += xp; if (place === 1) save.stats.cups++;
    persist();
    rw.style.display = '';
    rw.innerHTML = `<span>${place === 1 ? '🏆 ¡Campeón!' : 'Terminaste ' + place + '.º'}</span><span><span class="coin"></span>+${bonus}</span><span class="purple">+${xp} XP</span><span class="unlocks">${unlockText(before, levelInfo(save.xp).lvl)}</span>`;
    if (place === 1) SFX.fanfare();
    UI.champ = null;
    mk('Menú', 'go', goTitle);
  } else {
    mk('Siguiente carrera', 'go', startChampRace);
    mk('Abandonar', 'red', () => { UI.champ = null; goTitle(); });
  }
  show('standings');
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- garaje ----------
function openGarage() {
  $('gName').value = save.name; $('gNum').value = save.eq.num;
  renderGarage();
  show('garage', true);
}
function renderGarage() {
  document.querySelectorAll('#gTabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === UI.tab));
  const lvl = playerLevel(), list = COSMETICS[UI.tab], box = $('gItems');
  box.innerHTML = '';
  for (const c of list) {
    const owned = save.owned[UI.tab].includes(c.id), eq = save.eq[UI.tab] === c.id, locked = c.lvl > lvl;
    const b = document.createElement('button');
    b.className = 'item' + (eq ? ' eq' : '') + (locked ? ' locked' : '');
    const price = eq ? '<span class="green">Equipado</span>' : owned ? '<span class="muted">Equipar</span>' : locked ? `<span class="muted">Nivel ${c.lvl}</span>` : `<span class="gold"><span class="coin"></span>${c.cost}</span>`;
    b.innerHTML = `${swatch(UI.tab, c)}<div class="nm">${c.name}</div><div class="pr">${price}</div>`;
    b.onclick = () => buyOrEquip(c);
    box.appendChild(b);
  }
  $('gCoins').textContent = save.coins;
}
// Muestra de cada pieza en el garaje (los acabados brillan con CSS)
function swatch(kind, c) {
  const fin = c.f ? ' fin-' + c.f : '';
  if (kind === 'helmet') return `<div class="sw${fin}" style="--c:${c.a};background-color:${c.a};background-image:linear-gradient(90deg, transparent 0 40%, ${c.b} 40% 60%, transparent 60%)"></div>`;
  if (kind === 'glow') return `<div class="sw glowsw${c.c === 'rainbow' ? ' rainbow' : ''}" style="--c:${c.c && c.c !== 'rainbow' ? c.c : 'transparent'}"><i></i></div>`;
  if (kind === 'frame') return `<div class="sw framesw"><span class="avatar ${c.cls}"><span class="lvl">${playerLevel()}</span></span></div>`;
  if (kind === 'banner') return `<div class="sw ${c.cls}"></div>`;
  if (kind === 'title') return `<div class="sw titlesw"><span class="${c.gold ? 'goldtxt' : ''}">${c.name}</span></div>`;
  return `<div class="sw${fin}" style="--c:${c.c};background-color:${c.c}"></div>`;
}
function buyOrEquip(c) {
  const kind = UI.tab, owned = save.owned[kind].includes(c.id);
  if (!owned) {
    if (c.lvl > playerLevel()) { toast('Necesitas nivel ' + c.lvl + ' de piloto'); return; }
    if (save.coins < c.cost) { toast('Te faltan ' + (c.cost - save.coins) + ' monedas'); return; }
    save.coins -= c.cost; save.owned[kind].push(c.id); SFX.coin(); toast('¡Compraste ' + c.name + '!');
  } else SFX.click();
  save.eq[kind] = c.id; persist();
  refreshShowKart(); refreshProfile();
  const idx = COSMETICS[kind].indexOf(c);
  renderGarage();
  const el = $('gItems').children[idx]; if (el) el.focus({ preventScroll: true });
}

// ---------- opciones ----------
function openOptions() {
  $('oVol').value = save.opt.vol; $('oQ').value = save.opt.quality; $('oCam').value = save.opt.cam; $('oNames').value = save.opt.names ? '1' : '0';
  show('options', true);
}

// ---------- entrada ----------
const KEYS = new Set();
const INPUT = { throttle: 0, brake: 0, steer: 0, handbrake: false, kSteer: 0 };
const PAD = { prev: {}, navT: 0 };
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' && e.key !== 'Escape') return;
  KEYS.add(e.code);
  if (UI.screen === 'hud') {
    if (e.code === 'Escape' || e.code === 'KeyP') { pause(); e.preventDefault(); }
    if (e.code === 'KeyC') cycleCam();
    if (e.code === 'KeyR') resetPlayer();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    return;
  }
  if (e.code === 'Escape' || e.code === 'Backspace') { if (UI.screen !== 'title' && UI.screen !== 'results' && UI.screen !== 'standings') { back(); e.preventDefault(); } return; }
  const dir = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.code];
  if (dir && e.target.tagName !== 'SELECT' && e.target.type !== 'range') { navMove(dir[0], dir[1]); e.preventDefault(); }
});
window.addEventListener('keyup', e => KEYS.delete(e.code));
window.addEventListener('blur', () => { KEYS.clear(); if (UI.screen === 'hud') pause(); });
window.addEventListener('pointerdown', () => SFX.init(), { once: false });

function cycleCam() { UI.camMode = (UI.camMode + 1) % 3; save.opt.cam = UI.camMode; persist(); }

// navegación espacial de menús con flechas o mando
function navMove(dx, dy) {
  const scr = document.querySelector('.scr.on:not(#hud)') || document.querySelector('.scr.on');
  if (!scr) return;
  const els = [...document.querySelectorAll('.scr.on button:not(:disabled), .scr.on input, .scr.on select')].filter(e => e.offsetParent !== null && !e.closest('#hud'));
  if (!els.length) return;
  const cur = document.activeElement;
  if (!els.includes(cur)) { els[0].focus(); return; }
  const r0 = cur.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
  let best = null, bs = Infinity;
  for (const e of els) {
    if (e === cur) continue;
    const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const ddx = x - cx, ddy = y - cy;
    const along = ddx * dx + ddy * dy;
    if (along <= 4) continue;
    const across = Math.abs(ddx * dy) + Math.abs(ddy * dx);
    const score = along + across * 2.5;
    if (score < bs) { bs = score; best = e; }
  }
  if (best) { best.focus(); SFX.click(); if (best.closest('#gItems')) best.scrollIntoView({ block: 'nearest' }); }
}

function readPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = [...pads].find(p => p && p.connected);
  if (!gp) return null;
  const b = i => gp.buttons[i] ? gp.buttons[i].value || (gp.buttons[i].pressed ? 1 : 0) : 0;
  const ax = Math.abs(gp.axes[0]) > 0.12 ? gp.axes[0] : 0, ay = Math.abs(gp.axes[1]) > 0.5 ? gp.axes[1] : 0;
  return { gp, steer: ax, ay, rt: b(7), lt: b(6), a: b(0), bb: b(1), x: b(2), y: b(3), back: b(8), start: b(9), up: b(12), down: b(13), left: b(14), right: b(15) };
}
function padEdge(pad, key) { const now = pad[key] > 0.5, was = PAD.prev[key]; PAD.prev[key] = now; return now && !was; }

function updateInput(dt) {
  const pad = readPad();
  const up = KEYS.has('KeyW') || KEYS.has('ArrowUp'), dn = KEYS.has('KeyS') || KEYS.has('ArrowDown');
  const lf = KEYS.has('KeyA') || KEYS.has('ArrowLeft'), rt = KEYS.has('KeyD') || KEYS.has('ArrowRight');
  // dirección del teclado con rampa (más suave a alta velocidad)
  const target = (rt ? 1 : 0) - (lf ? 1 : 0);
  // al apretar entra suave (un toque en recta mueve poco); al soltar vuelve rápido al centro
  const rate = target === 0 ? 6.5 : (Math.sign(target) !== Math.sign(INPUT.kSteer) && INPUT.kSteer !== 0 ? 7 : 2.8);
  INPUT.kSteer += clamp(target - INPUT.kSteer, -rate * dt, rate * dt);
  INPUT.throttle = up ? 1 : 0; INPUT.brake = dn ? 1 : 0; INPUT.steer = INPUT.kSteer; INPUT.handbrake = KEYS.has('Space');
  if (pad) {
    if (Math.abs(pad.steer) > 0) INPUT.steer = Math.sign(pad.steer) * Math.pow(Math.abs(pad.steer), 1.4);
    INPUT.throttle = Math.max(INPUT.throttle, pad.rt, pad.a);
    INPUT.brake = Math.max(INPUT.brake, pad.lt, pad.x);
    INPUT.handbrake = INPUT.handbrake || pad.bb > 0.5;
    if (UI.screen === 'hud') {
      if (padEdge(pad, 'start')) pause();
      if (padEdge(pad, 'y')) cycleCam();
      if (padEdge(pad, 'back')) resetPlayer();
      padEdge(pad, 'a'); padEdge(pad, 'bb');
    } else {
      PAD.navT -= dt;
      const dx = (pad.right ? 1 : 0) - (pad.left ? 1 : 0) || (Math.abs(pad.steer) > 0.6 ? Math.sign(pad.steer) : 0);
      const dy = (pad.down ? 1 : 0) - (pad.up ? 1 : 0) || (pad.ay ? Math.sign(pad.ay) : 0);
      if ((dx || dy) && PAD.navT <= 0) { navMove(dx, dy); PAD.navT = 0.22; } else if (!dx && !dy) PAD.navT = 0;
      if (padEdge(pad, 'a')) { const el = document.activeElement; if (el && el.click) el.click(); }
      if (padEdge(pad, 'bb')) { if (UI.screen !== 'title' && UI.screen !== 'results' && UI.screen !== 'standings') back(); }
      if (padEdge(pad, 'start') && UI.screen === 'pause') resume();
      padEdge(pad, 'y'); padEdge(pad, 'back');
    }
  }
}

// ---------- cámara ----------
const CAM = { h: 0, pos: new THREE.Vector3(), look: new THREE.Vector3(), snap: true, snapMenu: true, menuA: 0 };
const CAM_MODES = [{ d: 4.8, y: 2.1, la: 2.4, ly: 0.7 }, { d: 3.3, y: 1.45, la: 2.2, ly: 0.75 }, { d: -0.05, y: 1.08, la: 6, ly: 0.9 }];
function updateCamera(dt) {
  const cam = W.camera;
  if (!R.on) {
    CAM.menuA += dt;
    const showcase = UI.screen === 'garage';
    const lx = showcase ? 2.1 : -1.7;
    CAM.look.lerp(_v3.set(lx, 0.45, 0), CAM.snapMenu ? 1 : 1 - Math.exp(-dt * 4)); CAM.snapMenu = false;
    cam.position.set(Math.sin(CAM.menuA * 0.3) * 0.25, 1.75 + Math.sin(CAM.menuA * 0.5) * 0.05, 5.2);
    cam.lookAt(CAM.look);
    cam.fov = 50; cam.updateProjectionMatrix();
    return;
  }
  const k = R.player, p = k.p;
  const m = CAM_MODES[UI.camMode];
  // el rumbo de la cámara sigue al kart con algo de retraso (y a la velocidad cuando derrapa)
  let want = p.h;
  if (p.speed > 4 && UI.camMode !== 2) { const vh = Math.atan2(p.vx, p.vz); let d = vh - p.h; d = Math.atan2(Math.sin(d), Math.cos(d)); if (p.fwd > 0) want = p.h + d * 0.5; }
  let dh = want - CAM.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
  CAM.h += CAM.snap ? dh : dh * (1 - Math.exp(-dt * (UI.camMode === 2 ? 20 : 6)));
  const fx = Math.sin(CAM.h), fz = Math.cos(CAM.h);
  const sl = Math.tan(p.slope);
  const tp = new THREE.Vector3(p.x - fx * m.d, p.y + m.y - sl * m.d, p.z - fz * m.d);
  const tl = new THREE.Vector3(p.x + fx * m.la, p.y + m.ly + sl * m.la, p.z + fz * m.la);
  if (UI.camMode === 2) { tp.set(p.x - Math.sin(p.h) * 0.12, p.y + m.y, p.z - Math.cos(p.h) * 0.12); tl.set(p.x + Math.sin(p.h) * m.la, p.y + m.ly + sl * m.la, p.z + Math.cos(p.h) * m.la); }
  if (CAM.snap) { CAM.pos.copy(tp); CAM.look.copy(tl); CAM.snap = false; }
  const s = UI.camMode === 2 ? 1 : 1 - Math.exp(-dt * 10);
  CAM.pos.lerp(tp, s); CAM.pos.y = lerp(CAM.pos.y, tp.y, UI.camMode === 2 ? 1 : 1 - Math.exp(-dt * 16)); CAM.look.lerp(tl, UI.camMode === 2 ? 1 : 1 - Math.exp(-dt * 14));
  cam.position.copy(CAM.pos);
  // temblor al chocar
  if (p.hitT > 0) cam.position.y += (Math.random() - 0.5) * p.hitT * 0.4;
  cam.lookAt(CAM.look);
  cam.fov = 62 + clamp(p.speed / KART.vmax, 0, 1) * 10;
  cam.updateProjectionMatrix();
  R.player.mesh.userData.head.visible = UI.camMode !== 2;
}

// ---------- HUD ----------
const tagEls = new Map();
let mmBase = null, mmF = null;
function drawMinimapBase() {
  const cv = $('minimap'), T = R.T;
  mmBase = document.createElement('canvas'); mmBase.width = cv.width; mmBase.height = cv.height;
  const g = mmBase.getContext('2d');
  mmF = fitTransform(T, cv.width, cv.height, 24);
  drawTrackShape(g, T, mmF, 10, ['rgba(255,255,255,.95)', 'rgba(255,255,255,.95)']);
  const [sx, sy] = mmF(T.px[0], T.pz[0]);
  g.fillStyle = '#fff'; g.fillRect(sx - 5, sy - 5, 10, 10);
  for (const el of tagEls.values()) el.remove();
  tagEls.clear();
}
const _v3 = new THREE.Vector3();
function updateHud(dt) {
  const k = R.player; if (!k) return;
  const T = R.T;
  // tiempos por sector de la vuelta actual
  const secs = k.sec, cls = k.secCls || [];
  ['tS1', 'tS2', 'tS3'].forEach((id, i) => { const el = $(id); el.textContent = fmtTime(secs[i]); el.className = secs[i] != null ? (cls[i] || 'slow') : ''; });
  $('tLast').textContent = fmtTime(k.lastLap); $('tLast').className = k.lastLap != null ? (k.lastCls || 'slow') : '';
  $('tPb').textContent = fmtTime(isFinite(R.bestLap) ? R.bestLap : null);
  $('hPos').innerHTML = k.pos + '<small>/' + R.karts.length + '</small>';
  $('hLap').textContent = 'VUELTA ' + clamp(k.lapsDone + 1, 1, R.laps) + '/' + R.laps;
  $('hTime').textContent = fmtTime(R.state === 'countdown' ? 0 : (k.finished ? k.finishTime : R.t));
  const kmh = Math.round(Math.abs(k.p.fwd) * 3.6);
  $('hSpeed').textContent = kmh;
  $('hRpm').style.width = clamp(Math.abs(k.p.fwd) / KART.vmax * 100, 0, 100) + '%';
  $('wrong').classList.toggle('show', k.wrong > 40);
  // orden de carrera
  const order = R.karts.slice().sort((a, b) => a.pos - b.pos);
  $('hOrder').innerHTML = order.map(o => {
    const gap = o === k ? '' : ((o.dist - k.dist) > 0 ? '+' : '') + Math.round(o.dist - k.dist) + ' m';
    return `<div class="${o === k ? 'me' : ''}"><i>${o.pos}</i>${esc(o.name)}<span class="gap">${gap}</span></div>`;
  }).join('');
  // minimapa
  const cv = $('minimap'), g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height); g.drawImage(mmBase, 0, 0);
  for (const o of order.slice().reverse()) {
    const [x, y] = mmF(o.p.x, o.p.z);
    g.beginPath(); g.arc(x, y, o.isPlayer ? 11 : 8, 0, 7);
    g.fillStyle = cosById('body', o.look.body.id || o.look.body).c; g.fill();
    g.lineWidth = o.isPlayer ? 4 : 2; g.strokeStyle = o.isPlayer ? '#fff' : '#111'; g.stroke();
  }
  // nombres sobre los rivales
  const w = window.innerWidth, h = window.innerHeight;
  for (const o of R.karts) {
    if (o.isPlayer) continue;
    let el = tagEls.get(o);
    if (!el) { el = document.createElement('div'); el.className = 'tagname'; el.textContent = o.name; $('labels').appendChild(el); tagEls.set(o, el); }
    _v3.set(o.p.x, o.p.y + 1.55, o.p.z);
    const d = _v3.distanceTo(W.camera.position);
    _v3.project(W.camera);
    const vis = save.opt.names && UI.screen === 'hud' && _v3.z < 1 && d < 70 && Math.abs(_v3.x) < 1.1 && Math.abs(_v3.y) < 1.1;
    el.style.display = vis ? '' : 'none';
    if (vis) { el.style.left = ((_v3.x + 1) / 2 * w) + 'px'; el.style.top = ((1 - _v3.y) / 2 * h) + 'px'; el.style.opacity = clamp(1.4 - d / 50, 0.25, 1); }
  }
  if (UI.hintT > 0) { UI.hintT -= dt; if (UI.hintT <= 0) $('hint').style.opacity = 0; }
}
function clearTags() { for (const el of tagEls.values()) el.remove(); tagEls.clear(); }

let bannerT = 0;
function banner(html, t) { const b = $('banner'); b.innerHTML = html; b.classList.add('show'); bannerT = t || 1.6; }

function handleEvents() {
  for (const e of R.events) {
    if (e.type === 'beep') { SFX.beep(e.n); }
    if (e.type === 'go') { SFX.beep(0); banner('¡YA!', 0.9); }
    if (e.type === 'hit') SFX.hit(e.v);
    if (e.type === 'bump') SFX.hit(e.v * 0.6);
    if (e.type === 'lastlap') banner('ÚLTIMA VUELTA', 1.8);
    if (e.type === 'lap' && e.cls === 'record') banner('<span class="purple">¡RÉCORD!</span><small>' + fmtTime(e.lt) + '</small>', 1.8);
    else if (e.type === 'lap' && e.cls === 'best') banner('<span class="green">MEJOR VUELTA</span><small>' + fmtTime(e.lt) + '</small>', 1.5);
    if (e.type === 'finish') { banner(e.pos === 1 ? '¡GANASTE!' : 'META · ' + e.pos + '.º', 2.5); }
    if (e.type === 'results') { setTimeout(() => { if (R.state === 'results') { clearTags(); showResults(); } }, 600); }
  }
  R.events.length = 0;
}

function updateLights() {
  const el = $('lights');
  if (R.state === 'countdown') {
    el.classList.add('show');
    const n = clamp(Math.floor((3.6 - R.countdown) / 0.75) + 1, 0, 4);
    [...el.children].forEach((c, i) => c.className = i < n ? 'r' : '');
    setStartLights(Math.min(5, n + 1), false);
  } else if (R.state === 'race' && R.t < 1) {
    [...el.children].forEach(c => c.className = 'g');
    setStartLights(5, true);
  } else { el.classList.remove('show'); if (R.state === 'race' && R.t < 1.2) setStartLights(0, false); }
}

// ---------- bucle ----------
let lastT = performance.now(), acc = 0;
const STEP = 1 / 120;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  updateInput(dt);
  if (R.on && !UI.paused && UI.screen !== 'results' && UI.screen !== 'standings') {
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 12) { updateRace(STEP, INPUT); acc -= STEP; n++; }
    if (n >= 12) acc = 0;
    handleEvents();
    updateLights();
    const p = R.player.p;
    let near = 999; for (const o of R.karts) if (!o.isPlayer) near = Math.min(near, Math.hypot(o.p.x - p.x, o.p.z - p.z));
    SFX.drive(Math.abs(p.fwd), R.state === 'countdown' ? 0.2 : R.player.inp ? R.player.inp.throttle : 0, p.slip, near, true);
  } else if (R.on && R.state === 'results') {
    // los karts siguen dando vueltas detrás de los resultados
    acc += dt; while (acc >= STEP) { updateRace(STEP, INPUT); acc -= STEP; }
    R.events.length = 0;
  }
  if (R.on) updateHud(dt);
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('show'); }
  if (UI.toastT > 0) { UI.toastT -= dt; if (UI.toastT <= 0) $('toast').classList.remove('show'); }
  updateCamera(dt);
  // la sombra sigue a la cámara
  const c = R.on ? R.player.p : { x: 0, z: 0 };
  const sd = W.sunDir || new THREE.Vector3(0.3, 1, 0.3);
  W.sun.target.position.set(c.x, 0, c.z);
  W.sun.position.set(c.x + sd.x * 60, sd.y * 60, c.z + sd.z * 60);
  if (!R.on && showKart) { showKart.rotation.y += dt * 0.3; if (showKart.userData.glowParts) poseKart(showKart, { x: 0, y: 0.12, z: 0, h: showKart.rotation.y, slope: 0, roll: 0, pitch: 0, steer: 0, wheelRot: 0 }, dt, now / 1000); }
  const tt = now / 1000; for (const f of W.anim) f(tt);
  W.renderer.render(W.scene, W.camera);
}

// ---------- arranque ----------
function boot() {
  initRenderer($('game'));
  resizeRenderer();
  window.addEventListener('resize', resizeRenderer);
  buildGarage();
  FX.init(W.scene);
  UI.camMode = save.opt.cam | 0;

  document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => { if (!b.dataset.act) back(); }));
  document.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
    SFX.init();
    const a = b.dataset.act;
    if (a === 'quick') { SFX.click(); openTracks('quick'); }
    if (a === 'champ') { SFX.click(); UI.sel.track = 't1'; openTracks('champ'); }
    if (a === 'garage') { SFX.click(); openGarage(); }
    if (a === 'options') { SFX.click(); openOptions(); }
    if (a === 'resume') resume();
    if (a === 'restart') restart();
    if (a === 'optionsInRace') { SFX.click(); openOptions(); }
    if (a === 'quit') { UI.champ = null; clearTags(); goTitle(); }
  }));
  $('btnGo').onclick = go;
  document.querySelectorAll('#gTabs button').forEach(b => b.onclick = () => { SFX.click(); UI.tab = b.dataset.tab; renderGarage(); });
  $('gName').addEventListener('change', () => { save.name = ($('gName').value || 'Piloto').trim().slice(0, 14) || 'Piloto'; persist(); refreshProfile(); });
  $('gNum').addEventListener('change', () => { save.eq.num = clamp(parseInt($('gNum').value, 10) || 7, 1, 99); $('gNum').value = save.eq.num; persist(); refreshShowKart(); });
  $('oVol').addEventListener('input', () => { save.opt.vol = +$('oVol').value; SFX.setVol(save.opt.vol); persist(); });
  $('oQ').addEventListener('change', () => { save.opt.quality = $('oQ').value; persist(); location.reload(); });
  $('oCam').addEventListener('change', () => { UI.camMode = save.opt.cam = +$('oCam').value; persist(); });
  $('oNames').addEventListener('change', () => { save.opt.names = $('oNames').value === '1'; persist(); });
  $('oReset').addEventListener('click', () => {
    const b = $('oReset');
    if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = '¿Seguro? Pulsa otra vez'; setTimeout(() => { delete b.dataset.sure; b.textContent = 'Borrar progreso'; }, 3000); return; }
    delete b.dataset.sure; b.textContent = 'Borrar progreso';
    save = defaultSave(); persist(); refreshShowKart(); refreshProfile(); toast('Progreso borrado');
  });
  // en opciones durante la pausa, "volver" regresa a la pausa
  goTitle();
  document.body.classList.add('ready');
  requestAnimationFrame(frame);
}

if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('700 20px Fredoka'), document.fonts.load('600 16px Rubik')]).catch(() => {}).finally(boot);
else boot();
