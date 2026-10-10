'use strict';
// Editor de pistas: se dibuja la pista con el mouse sobre un plano (1 cuadro = 20 m) y se prueba con bots.
// Clic en un lugar vacío agrega un punto (entre los dos más cercanos), arrastrar lo mueve, clic derecho
// o Supr lo borra. ↑ ↓ suben o bajan el punto seleccionado (rampas y puentes) y T marca túneles
// (primer T = entrada, segundo T en otro punto = salida). Se valida en vivo con validateTrack.
// Las pistas se guardan en save.custom y aparecen en el selector de pistas (no en el campeonato).

const ED = { def: null, sel: -1, drag: false, tunA: -1, T: null, res: null, view: { cx: 0, cz: 0, ppm: 2 }, dirty: false };
const ED_THEMES = [['azul', 'Galpón azul'], ['fabrica', 'Fábrica'], ['neon', 'Neón'], ['parking', 'Estacionamiento'], ['parque', 'Parque'], ['desierto', 'Desierto'], ['noche', 'Ciudad de noche']];
const ED_INDOOR = ['azul', 'fabrica', 'neon', 'parking'];

function edTemplate() {
  return {
    id: 'c' + Date.now().toString(36), custom: true, name: 'Mi pista', title: 'Mi pista ' + ((save.custom || []).length + 1),
    theme: 'parque', width: 11, scale: 1, stars: 1, tunnels: [],
    pts: [[-150, -75], [0, -75], [112, -75], [175, -38], [175, 38], [125, 88], [50, 62], [-25, 100], [-112, 112], [-188, 62], [-200, -25]],
  };
}
// Formas listas del editor y generador al azar (se prueban también desde node)
const ED_SHAPES = {
  ovalo: { name: 'Óvalo', make() { const p = []; for (let k = 0; k < 14; k++) { const t = Math.PI / 2 + k / 14 * Math.PI * 2, c = Math.cos(t), s = Math.sin(t); p.push([Math.round(200 * Math.sign(c) * Math.abs(c) ** 0.55), Math.round(95 * Math.sign(s) * Math.abs(s) ** 0.55)]); } return { pts: p, tunnels: [] }; } },
  rinon: { name: 'Riñón', make() { return { pts: [[-120, -60], [0, -60], [90, -60], [140, -30], [140, 30], [100, 70], [40, 50], [-20, 80], [-90, 90], [-150, 50], [-160, -20]].map(p => [Math.round(p[0] * 1.25), Math.round(p[1] * 1.25)]), tunnels: [] }; } },
  ocho: { name: 'Ocho con puente', make() { const p = []; const n = 18; for (let k = 0; k < n; k++) { const t = k / n * Math.PI * 2; const y = 5.6 * clamp((-Math.cos(t) - 0.15) / 0.6, 0, 1); p.push(y > 0.05 ? [Math.round(175 * Math.sin(t)), Math.round(95 * Math.sin(2 * t)), +y.toFixed(1)] : [Math.round(175 * Math.sin(t)), Math.round(95 * Math.sin(2 * t))]); } return { pts: p, tunnels: [] }; } },
  zigzag: { name: 'Zigzag', make() { return { pts: [[-150, -90], [-40, -90], [70, -90], [160, -80], [205, -40], [195, 10], [150, 25], [120, 70], [70, 95], [20, 60], [-20, 25], [-70, 40], [-110, 90], [-170, 90], [-215, 45], [-215, -40]], tunnels: [] }; } },
  colina: { name: 'Colina y túnel', make() { return { pts: [[-160, -80], [-40, -80], [80, -80], [170, -55], [200, 0, 1], [175, 55, 3], [110, 80, 3.5], [40, 70, 2], [-20, 85], [-90, 95], [-160, 70], [-205, 15], [-200, -45]], tunnels: [[9, 11]] }; } },
};
// Pista al azar: puntos alrededor de un centro con radios distintos, una subida y a veces un túnel.
// Se prueba hasta que pase la validación (y dure ~45-70 s).
function edRandomTrack() {
  for (let tries = 0; tries < 200; tries++) {
    const n = 9 + (Math.random() * 6 | 0), R0 = 120 + Math.random() * 50, sx = 1.2 + Math.random() * 0.5;
    let pts = [];
    for (let k = 0; k < n; k++) {
      const t = (k + Math.random() * 0.5 - 0.25) / n * Math.PI * 2;
      const r = R0 * (0.55 + Math.random() * 0.45);
      pts.push([Math.round(Math.cos(t) * r * sx), Math.round(Math.sin(t) * r)]);
    }
    // la largada en el medio del tramo más largo (para que la grilla quede en recta)
    let li = 0, ll = 0;
    pts.forEach((p, i) => { const q = pts[(i + 1) % n]; const l = Math.hypot(q[0] - p[0], q[1] - p[1]); if (l > ll) { ll = l; li = i; } });
    const a = pts[li], b = pts[(li + 1) % n];
    pts = [[Math.round((a[0] + b[0]) / 2), Math.round((a[1] + b[1]) / 2)], ...pts.slice(li + 1), ...pts.slice(0, li + 1)];
    // una subida suave en el lado opuesto a la largada
    const m = pts.length, h = Math.floor(m / 2);
    if (Math.random() < 0.8) { const H = 2 + Math.random() * 2.5; pts[h] = [...pts[h].slice(0, 2), +H.toFixed(1)]; pts[h - 1] = [...pts[h - 1].slice(0, 2), +(H * 0.5).toFixed(1)]; }
    const tunnels = Math.random() < 0.4 ? [[h + 1, Math.min(h + 3, m - 1)]] : [];
    const def = { pts, tunnels };
    const T = (() => { try { return buildTrackData(edFinish(Object.assign(edTemplate(), def))); } catch (e) { return null; } })();
    if (!T) continue;
    const v = validateTrack(T), lap = lapEstimate(T, 1);
    if (v.ok && lap > 42 && lap < 72) return def;
  }
  return ED_SHAPES.rinon.make();
}

// completa los datos que el juego necesita según el tema
function edFinish(def) {
  const base = TRACKS.find(t => t.theme === def.theme) || TRACKS[0];
  def.indoor = ED_INDOOR.includes(def.theme);
  def.barrier = base.barrier.slice();
  def.time = base.time;
  def.kerbs = !def.indoor;
  def.name = 'Tu pista';
  def.desc = 'Pista hecha en el editor: ' + def.pts.length + ' puntos' + (def.tunnels.length ? ', ' + def.tunnels.length + ' túnel(es)' : '') + '.';
  return def;
}

function openEditor(def) {
  ED.def = JSON.parse(JSON.stringify(def || edTemplate()));
  ED.sel = -1; ED.tunA = -1;
  edFillForm();
  edCheck();
  show('editor', true);
  edResize();
  $('edGuide').classList.toggle('show', !save.opt.edGuide);
}
function edFillForm() {
  $('edName').value = ED.def.title;
  $('edTheme').innerHTML = ED_THEMES.map(([v, n]) => `<option value="${v}"${v === ED.def.theme ? ' selected' : ''}>${n}</option>`).join('');
  $('edWidth').value = ED.def.width <= 9 ? 9 : ED.def.width >= 13 ? 13 : 11;
  const list = save.custom || [];
  $('edLoad').innerHTML = '<option value="">Nueva pista…</option>' + list.map(t => `<option value="${t.id}"${t.id === ED.def.id ? ' selected' : ''}>${esc(t.title)}</option>`).join('');
  $('edDel').disabled = !list.some(t => t.id === ED.def.id);
}
function edResize() {
  const cv = $('edCanvas'), r = cv.getBoundingClientRect();
  if (!r.width) return;
  cv.width = Math.round(r.width * (window.devicePixelRatio || 1)); cv.height = Math.round(r.height * (window.devicePixelRatio || 1));
  // que entre toda la pista con margen
  const P = ED.def.pts;
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (const p of P) { a = Math.min(a, p[0]); b = Math.max(b, p[0]); c = Math.min(c, p[1]); d = Math.max(d, p[1]); }
  ED.view.cx = (a + b) / 2; ED.view.cz = (c + d) / 2;
  ED.view.ppm = Math.min(cv.width / Math.max(b - a + 160, 300), cv.height / Math.max(d - c + 160, 200));
  edDraw();
}
const edToScreen = (x, z) => { const v = ED.view, cv = $('edCanvas'); return [cv.width / 2 + (x - v.cx) * v.ppm, cv.height / 2 + (z - v.cz) * v.ppm]; };
const edToWorld = (sx, sy) => { const v = ED.view, cv = $('edCanvas'); return [(sx - cv.width / 2) / v.ppm + v.cx, (sy - cv.height / 2) / v.ppm + v.cz]; };
function edMouse(e) { const cv = $('edCanvas'), r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; }
function edPick(sx, sy) {
  let best = -1, bd = 14 * (window.devicePixelRatio || 1);
  ED.def.pts.forEach((p, i) => { const [x, y] = edToScreen(p[0], p[1]); const d = Math.hypot(x - sx, y - sy); if (d < bd) { bd = d; best = i; } });
  return best;
}

// cambia índices de túneles al insertar o borrar puntos
function edShift(from, by) {
  ED.def.tunnels = ED.def.tunnels.map(t => t.map(k => k >= from ? k + by : k));
}
function edInsert(x, z) {
  const P = ED.def.pts, n = P.length;
  let at = n, bd = Infinity;
  for (let i = 0; i < n; i++) {
    const a = P[i], b = P[(i + 1) % n];
    const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / l2, 0, 1);
    const d = Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z);
    if (d < bd) { bd = d; at = i + 1; }
  }
  const prev = P[at - 1], y = prev && prev[2] && P[at % n] && P[at % n][2] ? Math.min(prev[2], P[at % n][2]) : 0;
  edShift(at, 1);
  P.splice(at, 0, y ? [Math.round(x), Math.round(z), y] : [Math.round(x), Math.round(z)]);
  ED.sel = at;
  edChanged();
}
function edDelete(i) {
  if (i < 0) return;
  if (ED.def.pts.length <= 5) { toast('Una pista necesita al menos 5 puntos'); return; }
  ED.def.tunnels = ED.def.tunnels.filter(t => !t.includes(i));
  ED.def.pts.splice(i, 1);
  edShift(i + 1, -1);
  ED.sel = -1; ED.tunA = -1;
  edChanged();
}
function edHeight(d) {
  const p = ED.def.pts[ED.sel]; if (!p) return;
  const y = clamp(Math.round(((p[2] || 0) + d) * 10) / 10, 0, 8);
  if (y) p[2] = y; else p.length = 2;
  edChanged();
}
function edTunnel() {
  const i = ED.sel; if (i < 0) { toast('Elige un punto primero'); return; }
  const had = ED.def.tunnels.findIndex(t => t[0] === i || t[1] === i);
  if (had >= 0 && ED.tunA < 0) { ED.def.tunnels.splice(had, 1); toast('Túnel quitado'); edChanged(); return; }
  if (ED.tunA < 0) { ED.tunA = i; toast('Entrada del túnel. Elige la salida y pulsa T otra vez'); edDraw(); return; }
  if (ED.tunA !== i) ED.def.tunnels.push([ED.tunA, i]);
  ED.tunA = -1;
  edChanged();
}

function edLoadShape(def) {
  ED.def.pts = def.pts; ED.def.tunnels = def.tunnels || [];
  ED.sel = -1; ED.tunA = -1;
  edCheck(); edResize();
}
// agranda o achica toda la pista desde su centro (las alturas no cambian)
function edScale(f) {
  const P = ED.def.pts;
  const cx = P.reduce((a, p) => a + p[0], 0) / P.length, cz = P.reduce((a, p) => a + p[1], 0) / P.length;
  P.forEach(p => { p[0] = Math.round(cx + (p[0] - cx) * f); p[1] = Math.round(cz + (p[1] - cz) * f); });
  edChanged(); edResize();
}
// Arregla sola lo que la validación marca: suaviza curvas cerradas, agranda si hay tramos que se
// chocan o es muy corta, y baja las subidas muy empinadas.
function edAutoFix() {
  const P = ED.def.pts;
  for (let it = 0; it < 20 && (!ED.ok || ED.res.length < 800); it++) {
    const r = ED.res; if (!r) break;
    if (r.maxGrade >= 0.16) P.forEach(p => { if (p[2]) p[2] = +(p[2] * 0.8).toFixed(1); });
    if (r.minRadius <= ED.T.hw + 1.5) {
      const c = P.map(p => p.slice());
      P.forEach((p, i) => { const a = c[(i - 1 + P.length) % P.length], b = c[(i + 1) % P.length]; p[0] = Math.round(p[0] * 0.7 + (a[0] + b[0]) * 0.15); p[1] = Math.round(p[1] * 0.7 + (a[1] + b[1]) * 0.15); });
    }
    if (r.minSep < r.need || r.length < 800 || r.minRadius <= ED.T.hw + 1.5) {
      const cx = P.reduce((a, p) => a + p[0], 0) / P.length, cz = P.reduce((a, p) => a + p[1], 0) / P.length;
      P.forEach(p => { p[0] = Math.round(cx + (p[0] - cx) * 1.1); p[1] = Math.round(cz + (p[1] - cz) * 1.1); });
    }
    edCheck();
  }
  edResize();
  if (ED.ok) { SFX.coin(); toast('¡Arreglada! Ya puedes correr'); }
  else toast('No pude arreglarla sola: prueba otra forma o 🎲');
}

let edTimer = 0;
function edChanged() { ED.dirty = true; edDraw(); clearTimeout(edTimer); edTimer = setTimeout(edCheck, 120); }
function edCheck() {
  const def = edFinish(ED.def);
  let T = null, res = null;
  try { T = buildTrackData(def); res = validateTrack(T); } catch (e) { T = null; }
  ED.T = T; ED.res = res;
  const out = [];
  let ok = !!res;
  if (res) {
    const lap = lapEstimate(T, 1);
    def.stars = res.brakes >= 3 ? 3 : res.brakes >= 2 ? 2 : 1;
    out.push(`Largo <b>${Math.round(res.length)} m</b> · vuelta de unos <b>${Math.round(lap)} s</b> · dificultad ${'★'.repeat(def.stars)}${'☆'.repeat(3 - def.stars)}`);
    if (res.length < 600) { ok = false; out.push('<span class="red">⚠ Es muy corta. Pulsa ➕ Agrandar.</span>'); }
    if (res.minSep < res.need) out.push('<span class="red">⚠ Dos partes de la pista se chocan (círculo rojo). Pulsa 🔧 Arreglar sola, o separa los puntos.</span>');
    if (res.minRadius <= T.hw + 1.5) out.push('<span class="red">⚠ Hay una curva demasiado cerrada (círculo rojo). Pulsa 🔧 Arreglar sola.</span>');
    if (res.maxGrade >= 0.16) out.push('<span class="red">⚠ Una subida es muy empinada. Pulsa 🔧 Arreglar sola.</span>');
    ok = ok && res.ok;
    if (ok) out.push('<span class="green">✔ ¡Todo bien! Pulsa ¡Correr!</span>');
  } else out.push('<span class="red">No se pudo armar la pista.</span>');
  ED.ok = ok;
  $('edFix').style.display = res && !ok ? '' : 'none';
  $('edStatus').innerHTML = out.join('<br>');
  $('edTry').disabled = !ok;
  $('edSave').disabled = !ok;
  const p = ED.def.pts[ED.sel];
  $('edSel').textContent = p ? `· punto ${ED.sel + 1}${ED.sel === 0 ? ' (largada)' : ''}, altura ${(p[2] || 0).toFixed(1)} m` + (ED.def.tunnels.some(t => t.includes(ED.sel)) ? ', túnel' : '') : '· haz clic en un punto azul';
  ['edUp', 'edDown', 'edTun', 'edRem'].forEach(id => $(id).disabled = !p);
  edDraw();
}

function edDraw() {
  const cv = $('edCanvas'); if (!cv || !cv.width) return;
  const g = cv.getContext('2d'), W2 = cv.width, H = cv.height, v = ED.view, dpr = window.devicePixelRatio || 1;
  const theme = ED.def.theme, indoor = ED_INDOOR.includes(theme);
  g.fillStyle = indoor ? '#1A1622' : theme === 'desierto' ? '#6B5636' : theme === 'noche' ? '#141A24' : '#24452E';
  g.fillRect(0, 0, W2, H);
  // cuadrícula cada 20 m
  g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
  const [x0, z0] = edToWorld(0, 0), [x1, z1] = edToWorld(W2, H);
  for (let x = Math.floor(x0 / 20) * 20; x <= x1; x += 20) { const [sx] = edToScreen(x, 0); g.beginPath(); g.moveTo(sx, 0); g.lineTo(sx, H); g.stroke(); }
  for (let z = Math.floor(z0 / 20) * 20; z <= z1; z += 20) { const [, sy] = edToScreen(0, z); g.beginPath(); g.moveTo(0, sy); g.lineTo(W2, sy); g.stroke(); }
  // escala
  const [ex] = edToScreen(v.cx + 50, 0), [ex0] = edToScreen(v.cx, 0);
  g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(16 * dpr, H - 20 * dpr, ex - ex0, 3 * dpr);
  g.font = `${12 * dpr}px Rubik, sans-serif`; g.fillText('50 m', 16 * dpr, H - 26 * dpr);
  const T = ED.T;
  if (T) {
    const f = (x, z) => edToScreen(x, z);
    drawTrackShape(g, T, f, T.def.width * v.ppm, T.def.barrier);
    const res = ED.res;
    if (res && res.minSep < res.need && res.where) for (const i of res.where) { const [x, y] = f(T.px[i], T.pz[i]); g.strokeStyle = '#FF3B3B'; g.lineWidth = 4 * dpr; g.beginPath(); g.arc(x, y, 18 * dpr, 0, 7); g.stroke(); }
    if (res && res.minRadius <= T.hw + 1.5) { const [x, y] = f(res.rAt[0], res.rAt[1]); g.strokeStyle = '#FF3B3B'; g.lineWidth = 4 * dpr; g.beginPath(); g.arc(x, y, 18 * dpr, 0, 7); g.stroke(); }
    // sentido de marcha
    const [ax, ay] = f(T.px[0], T.pz[0]), [bx, by] = f(T.px[14 % T.N], T.pz[14 % T.N]);
    g.strokeStyle = '#fff'; g.lineWidth = 3 * dpr; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
    const an = Math.atan2(by - ay, bx - ax);
    g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - Math.cos(an - 0.5) * 10 * dpr, by - Math.sin(an - 0.5) * 10 * dpr); g.moveTo(bx, by); g.lineTo(bx - Math.cos(an + 0.5) * 10 * dpr, by - Math.sin(an + 0.5) * 10 * dpr); g.stroke();
  }
  // puntos de control
  ED.def.pts.forEach((p, i) => {
    const [x, y] = edToScreen(p[0], p[1]), r = (i === ED.sel ? 9 : 7) * dpr;
    g.beginPath(); g.arc(x, y, r, 0, 7);
    g.fillStyle = i === 0 ? '#fff' : (p[2] || 0) > 0.05 ? `hsl(${45 - (p[2] / 8) * 45}, 95%, 60%)` : '#2AD4FF';
    g.fill();
    g.lineWidth = (i === ED.sel ? 4 : 2) * dpr; g.strokeStyle = i === ED.tunA ? '#B36BFF' : i === ED.sel ? '#FF4B43' : '#111'; g.stroke();
    if (i === 0) { g.fillStyle = '#111'; g.fillRect(x - 3 * dpr, y - 3 * dpr, 3 * dpr, 3 * dpr); g.fillRect(x, y, 3 * dpr, 3 * dpr); }
    if ((p[2] || 0) > 0.05 || i === ED.sel) { g.fillStyle = '#fff'; g.font = `700 ${11 * dpr}px Rubik, sans-serif`; g.fillText((p[2] || 0).toFixed(1) + ' m', x + 11 * dpr, y - 8 * dpr); }
  });
}

function edSaveTrack() {
  if (!ED.ok) return null;
  const def = edFinish(JSON.parse(JSON.stringify(ED.def)));
  def.title = ($('edName').value || 'Mi pista').trim().slice(0, 24) || 'Mi pista';
  ED.def.title = def.title;
  save.custom = save.custom || [];
  const i = save.custom.findIndex(t => t.id === def.id);
  if (i >= 0) save.custom[i] = def; else save.custom.push(def);
  delete TDATA[def.id];
  persist();
  ED.dirty = false;
  edFillForm();
  return def;
}
function edTry() {
  const def = edSaveTrack(); if (!def) return;
  SFX.init(); SFX.click();
  UI.mode = 'quick'; UI.sel.track = def.id; UI.sel.format = 'race'; UI.sel.players = 1; UI.sel.time = def.time || 'mediodia';
  UI.sel.diff = UI.sel.diff || save.last.diff; UI.sel.laps = 3;
  UI.fromEditor = def.id;
  go();
}

function editorKey(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return false;
  if (e.code === 'Delete' || e.code === 'Backspace') { edDelete(ED.sel); e.preventDefault(); return true; }
  if (e.code === 'ArrowUp' || e.code === 'PageUp') { edHeight(0.5); e.preventDefault(); return true; }
  if (e.code === 'ArrowDown' || e.code === 'PageDown') { edHeight(-0.5); e.preventDefault(); return true; }
  if (e.code === 'ArrowRight') { ED.sel = (ED.sel + 1) % ED.def.pts.length; edCheck(); e.preventDefault(); return true; }
  if (e.code === 'ArrowLeft') { ED.sel = (ED.sel - 1 + ED.def.pts.length) % ED.def.pts.length; edCheck(); e.preventDefault(); return true; }
  if (e.code === 'KeyT') { edTunnel(); return true; }
  return false;
}

function initEditor() {
  const cv = $('edCanvas');
  cv.addEventListener('pointerdown', e => {
    if (e.button === 2) return;
    const [sx, sy] = edMouse(e), i = edPick(sx, sy);
    if (i >= 0) { ED.sel = i; ED.drag = true; cv.setPointerCapture(e.pointerId); edCheck(); }
    else { const [x, z] = edToWorld(sx, sy); edInsert(x, z); ED.drag = true; cv.setPointerCapture(e.pointerId); }
  });
  cv.addEventListener('pointermove', e => {
    const [sx, sy] = edMouse(e);
    cv.style.cursor = edPick(sx, sy) >= 0 ? 'grab' : 'crosshair';
    if (!ED.drag || ED.sel < 0) return;
    const [x, z] = edToWorld(sx, sy), p = ED.def.pts[ED.sel];
    p[0] = Math.round(x); p[1] = Math.round(z);
    edChanged();
  });
  cv.addEventListener('pointerup', () => { ED.drag = false; });
  cv.addEventListener('contextmenu', e => { e.preventDefault(); const [sx, sy] = edMouse(e); edDelete(edPick(sx, sy)); });
  cv.addEventListener('wheel', e => { e.preventDefault(); ED.view.ppm = clamp(ED.view.ppm * (e.deltaY < 0 ? 1.1 : 0.9), 0.5, 8); edDraw(); }, { passive: false });
  $('edTheme').onchange = () => { ED.def.theme = $('edTheme').value; edChanged(); };
  $('edWidth').onchange = () => { ED.def.width = +$('edWidth').value; edChanged(); };
  $('edName').onchange = () => { ED.def.title = $('edName').value; };
  $('edLoad').onchange = () => { const t = (save.custom || []).find(c => c.id === $('edLoad').value); ED.def = JSON.parse(JSON.stringify(t || edTemplate())); ED.sel = -1; edFillForm(); edCheck(); edResize(); };
  const sh = $('edShapes'); sh.innerHTML = '';
  const shapeBtn = (label, fn, draw) => {
    const b = document.createElement('button'); b.innerHTML = `<canvas width="120" height="60"></canvas>${label}`;
    b.onclick = () => { SFX.click(); fn(); };
    sh.appendChild(b);
    const cv = b.querySelector('canvas'), g = cv.getContext('2d');
    if (!draw) { g.font = '34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🎲', 60, 32); return; }
    const T = buildTrackData(edFinish(Object.assign(edTemplate(), draw))), f = fitTransform(T, 120, 60, 8);
    drawTrackShape(g, T, f, 4, ['#E23B2E', '#fff']);
  };
  for (const s of Object.values(ED_SHAPES)) { const d = s.make(); shapeBtn(s.name, () => edLoadShape(s.make()), d); }
  shapeBtn('Al azar', () => { toast('Creando una pista…'); setTimeout(() => { edLoadShape(edRandomTrack()); toast('¡Pista nueva! Si no te gusta, pulsa 🎲 otra vez'); }, 30); });
  $('edBig').onclick = () => edScale(1.1);
  $('edSmall').onclick = () => edScale(1 / 1.1);
  $('edFix').onclick = edAutoFix;
  $('edGuideOk').onclick = () => { $('edGuide').classList.remove('show'); save.opt.edGuide = true; persist(); };
  $('edHelpBtn').onclick = () => $('edGuide').classList.add('show');
  $('edUp').onclick = () => edHeight(1);
  $('edDown').onclick = () => edHeight(-1);
  $('edTun').onclick = edTunnel;
  $('edRem').onclick = () => edDelete(ED.sel);
  $('edSave').onclick = () => { if (edSaveTrack()) { SFX.coin(); toast('Pista guardada'); } };
  $('edTry').onclick = edTry;
  $('edDel').onclick = () => {
    const b = $('edDel');
    if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = '¿Seguro?'; setTimeout(() => { delete b.dataset.sure; b.textContent = 'Borrar'; }, 3000); return; }
    delete b.dataset.sure; b.textContent = 'Borrar';
    save.custom = (save.custom || []).filter(t => t.id !== ED.def.id); persist();
    ED.def = edTemplate(); ED.sel = -1; edFillForm(); edCheck(); edResize(); toast('Pista borrada');
  };
  window.addEventListener('resize', () => { if (UI.screen === 'editor') edResize(); });
}
