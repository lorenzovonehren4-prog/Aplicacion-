'use strict';
// Anonymous Games: el portal que junta todos los juegos.
// Rutas por ancla: #inicio, #biblioteca, #logros y #juego-<id> (reproductor). Sin compilación ni
// módulos, para que también abra con doble clic (file://).

/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmtTime = s => {
  s = Math.floor(s);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60), h = Math.floor(m / 60);
  return h ? `${h} h ${m % 60} min` : `${m} min`;
};

/* ---------- iconos ---------- */
const ICONS = {
  mask: '<svg viewBox="0 0 64 64"><path d="M32 6C17 6 8 17 8 30c0 15 11 28 24 28s24-13 24-28C56 17 47 6 32 6z" fill="currentColor"/><path d="M16 28q7-6 13 0q-7 4-13 0zM35 28q6-6 13 0q-6 4-13 0z" fill="var(--mask-ink,#07060d)"/><path d="M23 42q9 6 18 0" stroke="var(--mask-ink,#07060d)" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M27 48q5 2 10 0" stroke="var(--mask-ink,#07060d)" stroke-width="2" fill="none" stroke-linecap="round" opacity=".6"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="m17 9 5 6M22 9l-5 6"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 7h14M5 12h14M5 17h14"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 7 4.5c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.6 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" fill="currentColor"/></svg>',
  heartO: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 7 4.5c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.6 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>',
  full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  restart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h13l-2.5 4.5L18 13H5" fill="currentColor"/></svg>',
  chef: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14h10v5a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z"/><path d="M12 3a4.5 4.5 0 0 1 4.3 3.2A3.8 3.8 0 0 1 17 13H7a3.8 3.8 0 0 1 .7-6.8A4.5 4.5 0 0 1 12 3z"/></svg>',
  puzzle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 3a2 2 0 0 1 2 2v1h4a1 1 0 0 1 1 1v4h1a2 2 0 1 1 0 4h-1v4a1 1 0 0 1-1 1h-4v-1a2 2 0 1 0-4 0v1H4a1 1 0 0 1-1-1v-4h1a2 2 0 1 0 0-4H3V7a1 1 0 0 1 1-1h4V5a2 2 0 0 1 2-2z"/></svg>',
  cube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7z"/><path d="M3.5 7 12 11.5 20.5 7M12 11.5v10" /><path d="M12 2.5 20.5 7 12 11.5 3.5 7z" fill="currentColor" opacity=".35"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="8.5" cy="8" r="3.5"/><circle cx="16.5" cy="9" r="3"/><path d="M1.5 20c.6-4 3.4-6.5 7-6.5s6.4 2.5 7 6.5zM14.5 13.6c3.6-.4 6.8 1.9 7.5 5.4h-5.5c-.3-2-1-3.8-2-5.4z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 3h10v6a5 5 0 0 1-10 0z"/><path d="M5 4H2.5v2A4 4 0 0 0 7 10M19 4h2.5v2A4 4 0 0 1 17 10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10.5 14h3v3h-3zM7.5 18h9v3h-9z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10V8a5 5 0 0 1 10 0v2" fill="none" stroke="currentColor" stroke-width="2.4"/><rect x="4.5" y="10" width="15" height="11" rx="3"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.3L12 17.1l-5.7 3.1 1.2-6.3-4.7-4.4 6.4-.8z"/></svg>',
  fire: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2.4 1.2-4 2.5-5 0 2 .8 3.2 2 3.5C11 8.5 11 5 12 2z"/></svg>',
  gamepad: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10a5 5 0 0 1 4.9 6l-.8 4a2.5 2.5 0 0 1-4.3 1.2L14.5 16h-5l-2.3 2.2A2.5 2.5 0 0 1 2.9 17l-.8-4A5 5 0 0 1 7 7z"/><path d="M8 10v4M6 12h4" stroke="var(--mask-ink,#07060d)" stroke-width="1.8" stroke-linecap="round"/><circle cx="15.5" cy="11" r="1.1" fill="var(--mask-ink,#07060d)"/><circle cx="17.5" cy="13" r="1.1" fill="var(--mask-ink,#07060d)"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 2 4 14h7l-1 8 9.5-12h-7z"/></svg>',
  pencil: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 4.5l4 4L9 19H5v-4z"/><path d="M14 6l4 4" stroke="var(--mask-ink,#07060d)" stroke-width="1.5"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5 20 5.5v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10v-6z"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4v-5h4v-5h4V5h4"/><path d="M15 3l3-1 1 3" /></svg>',
  blank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18"/><circle cx="6.5" cy="6.5" r=".6" fill="currentColor"/><circle cx="9" cy="6.5" r=".6" fill="currentColor"/><path d="M13 13h5v5"/><path d="m18 13-6 6"/></svg>',
};
const ic = (n, cls = '') => `<span class="ic ${cls}" aria-hidden="true">${ICONS[n] || ''}</span>`;
function paintIcons(root = document) { for (const e of $$('[data-icon]', root)) { e.innerHTML = ICONS[e.dataset.icon] || ''; e.classList.add('ic'); e.setAttribute('aria-hidden', 'true'); e.removeAttribute('data-icon'); } }

/* ---------- avatares: máscaras de colores ---------- */
const AVATARS = [
  ['#7c3aed', '#f3f1fa', 0], ['#ff3d71', '#fff4f7', 1], ['#22d3ee', '#06222a', 2], ['#ffb020', '#2a1a00', 0],
  ['#10b981', '#f0fff8', 3], ['#3b82f6', '#eef4ff', 1], ['#111018', '#e5e1ff', 2], ['#f43f5e', '#1a0408', 3],
  ['#a3e635', '#142000', 1], ['#e879f9', '#26002b', 0], ['#f97316', '#fff7ed', 2], ['#94a3b8', '#0f172a', 3],
];
function avatarSVG(i) {
  const [bg, face, style] = AVATARS[i % AVATARS.length];
  const ink = bg;
  const eyes = [
    `<path d="M17 29q6-5 11 0q-6 3-11 0zM36 29q5-5 11 0q-5 3-11 0z" fill="${ink}"/>`,
    `<circle cx="23" cy="29" r="4" fill="${ink}"/><circle cx="41" cy="29" r="4" fill="${ink}"/>`,
    `<path d="M17 31l11-4M47 31l-11-4" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`,
    `<path d="M19 26l7 6M26 26l-7 6M38 26l7 6M45 26l-7 6" stroke="${ink}" stroke-width="3.2" stroke-linecap="round"/>`,
  ][style];
  const mouth = [
    `<path d="M24 42q8 6 16 0" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`,
    `<path d="M25 43h14" stroke="${ink}" stroke-width="3.2" stroke-linecap="round"/>`,
    `<path d="M23 40q9 9 18 0z" fill="${ink}"/>`,
    `<path d="M24 44q4-4 8 0t8 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  ][style];
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="${bg}"/><path d="M32 8C18 8 11 18 11 31c0 14 10 26 21 26s21-12 21-26C53 18 46 8 32 8z" fill="${face}"/>${eyes}${mouth}</svg>`;
}

/* ---------- perfil del portal ---------- */
const KEY = 'anonymousGames_v1';
function freshProfile() {
  return { v: 1, name: 'Anónimo#' + String(1000 + Math.floor(Math.random() * 9000)), avatar: Math.floor(Math.random() * AVATARS.length), xp: 0, favs: [], recent: [], stats: {}, ach: {}, sound: true, customized: false, seenAch: 0, created: Date.now() };
}
function loadProfile() {
  const base = freshProfile();
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s === 'object') return Object.assign(base, s); } catch (e) { /* sin guardado */ }
  return base;
}
let P = loadProfile();
function persist() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* sin guardado */ } }
const gstat = id => (P.stats[id] = P.stats[id] || { plays: 0, time: 0, last: 0 });
const totalTime = () => Object.values(P.stats).reduce((a, s) => a + (s.time || 0), 0);
const totalPlays = () => Object.values(P.stats).reduce((a, s) => a + (s.plays || 0), 0);
const playedCount = () => GAMES.filter(g => (P.stats[g.id] || {}).plays).length;

const LEVEL_TITLES = [[1, 'Novato sin rostro'], [3, 'Jugador fantasma'], [5, 'Hacker de sala'], [8, 'Sombra veloz'], [12, 'Leyenda anónima'], [18, 'El que todo lo juega']];
function levelOf(xp) {
  let lvl = 1, need = 100;
  while (xp >= need) { xp -= need; lvl++; need = 100 + (lvl - 1) * 40; }
  let title = LEVEL_TITLES[0][1];
  for (const [n, t] of LEVEL_TITLES) if (lvl >= n) title = t;
  return { lvl, cur: xp, need, title };
}
function addXP(n) {
  const before = levelOf(P.xp).lvl;
  P.xp += n;
  const after = levelOf(P.xp);
  if (after.lvl > before) { toast(`¡Subiste al nivel ${after.lvl}!`, after.title, 'bolt'); SFX.level(); }
  paintMe();
}

/* ---------- insignias ---------- */
const prog = id => { const g = gameById(id); try { return g && g.progress(); } catch (e) { return null; } };
const flag = (id, k) => ((prog(id) || {}).flags || {})[k] || 0;
const ACH = [
  { id: 'hola', name: 'Sin rostro', desc: 'Entra a Anonymous Games', icon: 'mask', test: () => true },
  { id: 'primera', name: 'Primera partida', desc: 'Juega cualquier juego', icon: 'play', test: () => playedCount() >= 1 },
  { id: 'curioso', name: 'Curioso', desc: 'Prueba 5 juegos distintos', icon: 'gamepad', test: () => playedCount() >= 5 },
  { id: 'explorador', name: 'Explorador', desc: `Prueba los ${GAMES.length} juegos`, icon: 'star', test: () => playedCount() >= GAMES.length },
  { id: 'identidad', name: 'Nueva identidad', desc: 'Cambia tu nombre o tu máscara', icon: 'pencil', test: () => P.customized },
  { id: 'flechado', name: 'Flechado', desc: 'Marca un juego como favorito', icon: 'heart', test: () => P.favs.length > 0 },
  { id: 'fantasma', name: 'Fantasma', desc: 'Abre el portal en about:blank', icon: 'blank', test: () => P.cloaked },
  { id: 'maraton', name: 'Maratón', desc: 'Juega 1 hora en total', icon: 'clock', test: () => totalTime() >= 3600 },
  { id: 'bandera', name: 'Bandera a cuadros', desc: 'Gana una carrera en Ápice GP', icon: 'flag', test: () => flag('apice-gp', 'wins') >= 1 },
  { id: 'podio', name: 'Primera victoria', desc: 'Gana una carrera en Kartódromo', icon: 'flag', test: () => flag('karting', 'wins') >= 1 },
  { id: 'copa', name: 'Campeón', desc: 'Gana un campeonato en Kartódromo', icon: 'trophy', test: () => flag('karting', 'cups') >= 1 },
  { id: 'cobrador', name: 'Cobrador', desc: 'Haz 10 viajes en Combi Rush', icon: 'users', test: () => flag('combi-rush', 'trips') >= 10 },
  { id: 'chef', name: 'Chef de barrio', desc: 'Llega al día 5 en Sazón Tycoon', icon: 'chef', test: () => flag('sazon', 'day') >= 5 },
  { id: 'cadena', name: 'Cadenero', desc: 'Abre un segundo local en Sazón Tycoon', icon: 'fire', test: () => flag('sazon', 'locales') >= 2 },
  { id: 'leyenda', name: 'Leyenda', desc: 'Termina una carrera en Modo Carrera Fútbol', icon: 'trophy', test: () => flag('futbol', 'careers') >= 1 },
  { id: 'muralla', name: 'Muralla', desc: 'Gana una partida en Reino en Guardia', icon: 'shield', test: () => flag('tower-defense', 'wins') >= 1 },
  { id: 'cornisa', name: 'Rey del Serrín', desc: 'Llega a la Cima del Cóndor en Drive In The Serrín', icon: 'up', test: () => flag('cornisa', 'beat') >= 1 },
  { id: 'cumbre', name: 'No miré abajo', desc: "Llega a la cima en Don't Look Up", icon: 'up', test: () => flag('escalada', 'done') >= 1 },
  { id: 'mente', name: 'Mente abierta', desc: 'Supera 10 niveles de Mind Escape', icon: 'puzzle', test: () => flag('mind-escape', 'done') >= 10 },
  { id: 'escape', name: 'Escapaste', desc: 'Supera los 30 niveles de Mind Escape', icon: 'bolt', test: () => flag('mind-escape', 'done') >= 30 },
];
const ACH_XP = 50;
function checkAch(quiet) {
  let got = 0;
  for (const a of ACH) {
    if (P.ach[a.id]) continue;
    let ok = false;
    try { ok = a.test(); } catch (e) { /* nada */ }
    if (!ok) continue;
    P.ach[a.id] = Date.now();
    got++;
    if (!quiet) { setTimeout(() => { toast('¡Insignia desbloqueada!', `${a.name} · +${ACH_XP} XP`, a.icon, 'ach'); SFX.ach(); }, got * 500); }
    P.xp += ACH_XP;
  }
  if (got) { persist(); paintMe(); }
}

/* ---------- sonido de la interfaz (Web Audio) ---------- */
const SFX = (() => {
  let ctx = null, master = null, lastTick = 0;
  const ensure = () => {
    if (!P.sound) return null;
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  const tone = (f, d, { type = 'sine', vol = 0.12, at = 0, to = null } = {}) => {
    const c = ensure(); if (!c) return;
    const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.02);
  };
  return {
    unlock: ensure,
    tick() { const n = performance.now(); if (n - lastTick < 70 || !ctx) return; lastTick = n; tone(1900, 0.035, { vol: 0.025 }); },
    click() { tone(520, 0.07, { type: 'triangle', vol: 0.1, to: 880 }); },
    open() { tone(420, 0.09, { type: 'triangle', vol: 0.08 }); tone(640, 0.12, { type: 'triangle', vol: 0.08, at: 0.06 }); },
    close() { tone(640, 0.08, { type: 'triangle', vol: 0.07 }); tone(400, 0.1, { type: 'triangle', vol: 0.07, at: 0.05 }); },
    play() { tone(220, 0.35, { type: 'sawtooth', vol: 0.05, to: 880 }); tone(660, 0.18, { type: 'triangle', vol: 0.1, at: 0.22 }); tone(990, 0.3, { type: 'triangle', vol: 0.09, at: 0.32 }); },
    fav() { tone(880, 0.08, { vol: 0.1 }); tone(1320, 0.14, { vol: 0.1, at: 0.07 }); },
    ach() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.1, at: i * 0.09 })); },
    level() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { type: 'square', vol: 0.04, at: i * 0.07 })); },
    intro() { tone(110, 1.1, { type: 'sawtooth', vol: 0.04, to: 440 }); tone(880, 0.5, { type: 'triangle', vol: 0.06, at: 0.9 }); },
  };
})();

/* ---------- avisos ---------- */
function toast(title, text, icon = 'star', kind = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.innerHTML = `<span class="toast__ico">${ic(icon)}</span><span><b>${esc(title)}</b>${text ? `<small>${esc(text)}</small>` : ''}</span>`;
  $('#toasts').append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 3600);
}

/* ---------- botón de perfil (arriba a la derecha) ---------- */
function paintMe() {
  const L = levelOf(P.xp);
  $('#meAv').innerHTML = avatarSVG(P.avatar) + `<b class="me__lv">${L.lvl}</b>`;
  $('#meName').textContent = P.name;
  $('#meLvl').textContent = `Nivel ${L.lvl}`;
  $('#meBar').style.width = Math.round(L.cur / L.need * 100) + '%';
  const unseen = Object.keys(P.ach).length > (P.seenAch || 0);
  $('#btnMe').classList.toggle('has-news', unseen);
  $('#btnMe').setAttribute('aria-label', `Mi perfil: ${P.name}, nivel ${L.lvl}`);
  $('#btnSound').innerHTML = ic(P.sound ? 'sound' : 'mute');
  $('#btnSound').setAttribute('aria-pressed', String(P.sound));
}

/* ---------- vistas ---------- */
const view = $('#view');
const UI = { cat: 'todos', q: '', sel: 0, game: null, frame: null, playing: false, autoplay: false, tab: 'inicio' };
const gameHref = g => '#juego-' + g.id;

function tileHTML(g, size = '') {
  const p = prog(g.id), fav = P.favs.includes(g.id);
  const sub = p ? p.label : g.tagline;
  // la ficha grande usa la carátula (ya trae el nombre escrito)
  const box = size === 'tile--w3' && g.box;
  return `<a class="tile ${size} ${box ? 'has-box' : ''}" href="${gameHref(g)}" data-tile="${g.id}" style="--c:${g.color};--c2:${g.color2}" aria-label="Jugar ${esc(g.title)}">
    <span class="tile__art"><img class="tile__img" src="${box ? g.box : g.cover}" alt="" loading="lazy" decoding="async"><img class="tile__alt" src="${g.alt}" alt="" loading="lazy" decoding="async"></span>
    ${g.badge ? `<span class="tile__badge">${g.badge}</span>` : ''}
    ${fav ? `<span class="tile__fav">${ic('heart')}</span>` : ''}
    <span class="tile__play">${ic('play')}</span>
    <span class="tile__meta"><b>${esc(g.title)}</b><small>${esc(sub)}</small></span>
    ${p && p.pct ? `<span class="tile__prog"><i style="width:${Math.max(4, Math.round(p.pct * 100))}%"></i></span>` : ''}
  </a>`;
}

function filtered() {
  const q = norm(UI.q.trim());
  return GAMES.filter(g => {
    if (UI.cat === 'favs' && !P.favs.includes(g.id)) return false;
    if (UI.cat !== 'todos' && UI.cat !== 'favs' && !g.cats.includes(UI.cat)) return false;
    if (q && !norm([g.title, g.tagline, g.tags.join(' '), g.desc].join(' ')).includes(q)) return false;
    return true;
  });
}

function leaveGame(title) {
  stopGame();
  UI.game = null;
  document.title = title ? `${title} · Anonymous Games` : 'Anonymous Games';
}
function paintTabs() {
  for (const a of $$('.tabs a')) {
    const on = a.dataset.tab === UI.tab;
    a.classList.toggle('is-on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
}

/* ---------- inicio: menú de consola ---------- */
// El juego elegido llena la pantalla; abajo, el estante con todos los juegos.
function renderDash() {
  leaveGame();
  UI.tab = 'inicio';
  const recent = P.recent.map(gameById).filter(Boolean);
  const L = levelOf(P.xp);
  const nAch = Object.keys(P.ach).length;
  view.innerHTML = `
    <section class="dash" id="dash" aria-label="Juegos">
      <div class="dash__bg" aria-hidden="true"><img class="dash__art" id="art0" alt=""><img class="dash__art" id="art1" alt=""></div>
      <div class="dash__shade" aria-hidden="true"></div>
      <div class="dash__info" id="dashInfo" aria-live="polite"></div>
      <div class="shelf" id="shelf" role="listbox" aria-label="Elige un juego" tabindex="0">
        ${GAMES.map((g, i) => {
          const p = prog(g.id), fav = P.favs.includes(g.id);
          return `<button class="gcard" type="button" role="option" data-sel="${i}" id="card-${g.id}" style="--c:${g.color};--c2:${g.color2}" aria-label="${esc(g.title)}" tabindex="-1">
            <img src="${g.box || g.cover}" alt="" ${i > 4 ? 'loading="lazy"' : ''} decoding="async"><span class="gcard__shine"></span>
            ${g.badge ? `<span class="gcard__badge">${g.badge}</span>` : ''}
            ${fav ? `<span class="gcard__fav">${ic('heart')}</span>` : ''}
            ${p && p.pct ? `<span class="gcard__prog"><i style="width:${Math.max(4, Math.round(p.pct * 100))}%"></i></span>` : ''}
            <span class="gcard__name">${esc(g.title)}</span>
          </button>`;
        }).join('')}
        <a class="gcard gcard--all" href="#biblioteca" tabindex="-1">${ic('grid')}<span>Biblioteca</span><small>${GAMES.length} juegos</small></a>
      </div>
      <div class="hints" aria-hidden="true">
        <span><kbd>←</kbd><kbd>→</kbd> Elegir</span>
        <span><kbd>Enter</kbd> Jugar</span>
        <span><kbd>I</kbd> Detalles</span>
        <span><kbd>F</kbd> Favorito</span>
        <span><kbd>Q</kbd><kbd>E</kbd> Pestañas</span>
        <span class="hints__pad" id="padHint" hidden>${ic('gamepad')} Mando conectado</span>
      </div>
    </section>
    <section class="sec">
      <h2 class="sec__title">${ic('bolt')} Novedades</h2>
      <div class="news">${NEWS.map(n => { const g = gameById(n.game); return g ? `<a class="news__item" href="${gameHref(g)}" style="--c:${g.color};--c2:${g.color2}">
        <img src="${g.cover}" alt="" loading="lazy">
        <span class="news__body"><small>${esc(n.date)} · ${esc(g.title)}</small><b>${esc(n.title)}</b>
        <ul>${n.items.map(t => `<li>${esc(t)}</li>`).join('')}</ul></span></a>` : ''; }).join('')}</div>
    </section>
    ${recent.length ? `<section class="sec">
      <h2 class="sec__title">${ic('clock')} Sigue jugando</h2>
      <div class="row">${recent.map(g => {
        const p = prog(g.id), st = gstat(g.id);
        return `<a class="cont" href="${gameHref(g)}" data-play="${g.id}" style="--c:${g.color}">
          <img src="${g.cover}" alt="" loading="lazy">
          <span class="cont__txt"><b>${esc(g.title)}</b><small>${esc(p ? p.label : 'Jugado ' + fmtTime(st.time))}</small>
          ${p && p.pct ? `<span class="tile__prog static"><i style="width:${Math.max(4, Math.round(p.pct * 100))}%"></i></span>` : ''}</span>
          <span class="cont__go">${ic('play')}</span></a>`;
      }).join('')}</div></section>` : ''}
    <section class="sec">
      <h2 class="sec__title">${ic('trophy')} Tu sala</h2>
      <div class="hall">
        <button class="hall__me" type="button" data-act="profile">
          <span class="hall__av">${avatarSVG(P.avatar)}</span>
          <span><b>${esc(P.name)}</b><small>Nivel ${L.lvl} · ${esc(L.title)}</small><span class="xpbar"><i style="width:${Math.round(L.cur / L.need * 100)}%"></i></span><small class="dim">${L.cur} / ${L.need} XP</small></span>
        </button>
        <div class="hall__stat">${ic('clock')}<b>${fmtTime(totalTime())}</b><small>jugando</small></div>
        <div class="hall__stat">${ic('gamepad')}<b>${playedCount()}/${GAMES.length}</b><small>juegos probados</small></div>
        <a class="hall__stat" href="#logros">${ic('trophy')}<b>${nAch}/${ACH.length}</b><small>insignias</small></a>
      </div>
    </section>`;
  bindTiles();
  const shelf = $('#shelf');
  for (const c of $$('.gcard[data-sel]', shelf)) {
    c.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') setSel(+c.dataset.sel, { center: false }); });
  }
  shelf.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { shelf.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
  setSel(UI.sel, { quiet: true, instant: true });
  paintPadHint();
}

let artFlip = 0;
function setSel(i, { quiet = false, instant = false, center = true } = {}) {
  const dash = $('#dash'); if (!dash) return;
  i = (i + GAMES.length) % GAMES.length;
  const changed = i !== UI.sel || instant;
  UI.sel = i;
  const g = GAMES[i];
  if (!changed) return;
  if (!quiet) SFX.tick();
  dash.style.setProperty('--c', g.color);
  dash.style.setProperty('--c2', g.color2);
  // Dos capas de fondo que se cruzan: la nueva entra mientras la vieja se apaga.
  const next = $('#art' + (artFlip ^ 1)), prev = $('#art' + artFlip);
  next.src = g.hero || g.cover;
  next.classList.add('is-on'); prev.classList.remove('is-on');
  artFlip ^= 1;
  for (const c of $$('.gcard[data-sel]')) {
    const on = +c.dataset.sel === i;
    c.classList.toggle('is-sel', on);
    c.setAttribute('aria-selected', String(on));
  }
  const card = $('#card-' + g.id);
  const shelf = $('#shelf');
  // Con teclado o mando la carta elegida va al centro. Con el mouse sólo se mueve el
  // estante si la carta quedó cortada: si no, las cartas se correrían bajo el puntero.
  const left = card.offsetLeft - (shelf.clientWidth - card.offsetWidth) / 2;
  const cut = card.offsetLeft < shelf.scrollLeft || card.offsetLeft + card.offsetWidth > shelf.scrollLeft + shelf.clientWidth;
  if (center || cut) shelf.scrollTo({ left, behavior: instant || REDUCED ? 'auto' : 'smooth' });
  shelf.setAttribute('aria-activedescendant', card.id);
  const p = prog(g.id), st = gstat(g.id), fav = P.favs.includes(g.id);
  $('#dashInfo').innerHTML = `
    <div class="dash__kicker">${g.badge ? `<span class="pill">${g.badge}</span>` : ''}<span>${esc(g.tags.join(' · '))}</span></div>
    <h1 class="dash__title">${esc(g.title)}</h1>
    <p class="dash__tag">${esc(g.tagline)}</p>
    <div class="dash__meta">
      ${p ? `<span class="meta meta--prog">${ic('star')}${esc(p.label)}</span>` : `<span class="meta">${ic('bolt')}Nuevo para ti</span>`}
      ${st.time ? `<span class="meta">${ic('clock')}${fmtTime(st.time)} jugado</span>` : ''}
      ${p && p.pct ? `<span class="meta meta--bar"><i style="width:${Math.max(4, Math.round(p.pct * 100))}%"></i></span>` : ''}
    </div>
    <div class="dash__cta">
      <a class="btn btn--play" href="${gameHref(g)}" data-play="${g.id}">${ic('play')} ${st.plays ? 'Continuar' : 'Jugar'}</a>
      <a class="btn btn--ghost" href="${gameHref(g)}">${ic('grid')}<span>Detalles</span></a>
      <button class="iconbtn lg ${fav ? 'is-fav' : ''}" type="button" data-fav="${g.id}" aria-pressed="${fav}" aria-label="Favorito" title="Favorito (F)">${ic(fav ? 'heart' : 'heartO')}</button>
    </div>`;
  const info = $('#dashInfo');
  info.classList.remove('swap'); void info.offsetWidth; info.classList.add('swap');
}

/* ---------- biblioteca ---------- */
function renderLibrary() {
  leaveGame('Biblioteca');
  UI.tab = 'biblioteca';
  const searching = UI.q.trim().length > 0;
  view.innerHTML = `
    <header class="pagehead">
      <h1>${searching ? `Resultados para “${esc(UI.q.trim())}”` : 'Biblioteca'}</h1>
      <p>${GAMES.length} juegos, gratis y sin descargas. Tu progreso de cada uno aparece en su ficha.</p>
    </header>
    <nav class="chips" aria-label="Categorías">${CATS.map(c => {
      const n = c.id === 'todos' ? GAMES.length : c.id === 'favs' ? P.favs.length : GAMES.filter(g => g.cats.includes(c.id)).length;
      return `<button class="chip ${UI.cat === c.id ? 'is-on' : ''}" data-cat="${c.id}" type="button" aria-pressed="${UI.cat === c.id}">${ic(c.icon)}<span>${c.name}</span><em>${n}</em></button>`;
    }).join('')}</nav>
    <section class="sec">${gridHTML()}</section>`;
  bindTiles();
}

function gridHTML() {
  const list = filtered();
  if (!list.length) {
    return `<div class="empty">${ic('mask')}<b>${UI.cat === 'favs' ? 'Aún no tienes favoritos' : 'No encontramos ese juego'}</b><small>${UI.cat === 'favs' ? 'Toca el corazón en cualquier juego para guardarlo aquí.' : 'Prueba con “carreras”, “zombis” o “3D”.'}</small></div>`;
  }
  return `<div class="grid">${list.map((g, i) => tileHTML(g, i === 0 ? 'tile--w3' : 'tile--w2')).join('')}</div>`;
}

/* ---------- logros ---------- */
function renderAch() {
  leaveGame('Logros');
  UI.tab = 'logros';
  const L = levelOf(P.xp), n = Object.keys(P.ach).length, pct = Math.round(n / ACH.length * 100);
  view.innerHTML = `
    <header class="pagehead pagehead--ach">
      <div class="ring" style="--p:${pct}"><b>${pct}%</b><small>${n}/${ACH.length}</small></div>
      <div>
        <h1>Logros</h1>
        <p>Nivel ${L.lvl} · ${esc(L.title)}. Cada insignia da ${ACH_XP} XP; muchas se ganan dentro de los juegos.</p>
        <span class="xpbar"><i style="width:${Math.round(L.cur / L.need * 100)}%"></i></span>
      </div>
    </header>
    <section class="sec"><div class="achgrid">${ACH.map(a => { const on = !!P.ach[a.id]; return `<div class="ach ${on ? 'is-on' : ''}"><span class="ach__ico">${ic(on ? a.icon : 'lock')}</span><span><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></span>${on ? `<em>+${ACH_XP}</em>` : ''}</div>`; }).join('')}</div></section>`;
  P.seenAch = n; persist(); paintMe();
}

/* ---------- efectos de las fichas ---------- */
function bindTiles() {
  for (const t of $$('.tile[data-tile], .cont, .mini')) {
    t.addEventListener('pointerenter', () => SFX.tick());
    if (REDUCED || !t.classList.contains('tile')) continue;
    t.addEventListener('pointermove', e => {
      const r = t.getBoundingClientRect();
      t.style.setProperty('--rx', ((e.clientY - r.top) / r.height - 0.5) * -7 + 'deg');
      t.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 9 + 'deg');
      t.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
      t.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
    });
    t.addEventListener('pointerleave', () => { t.style.removeProperty('--rx'); t.style.removeProperty('--ry'); });
  }
}

/* ---------- página de un juego ---------- */
function renderGame(g) {
  stopGame();
  UI.game = g;
  UI.tab = '';
  document.title = `${g.title} · Anonymous Games`;
  const p = prog(g.id), st = gstat(g.id), fav = P.favs.includes(g.id);
  const blocked = g.needsServer && location.protocol === 'file:';
  const others = GAMES.filter(o => o.id !== g.id);
  view.innerHTML = `<section class="game" style="--c:${g.color};--c2:${g.color2}">
    <div class="game__main">
      <div class="player" id="player">
        <div class="player__cover" id="cover">
          <img class="player__bg" src="${g.hero || g.cover}" alt="">
          <div class="player__center">
            <img class="player__thumb" src="${g.cover}" alt="">
            <h1 class="player__title">${esc(g.title)}</h1>
            <p class="player__tag">${esc(g.tagline)}</p>
            ${blocked
              ? `<p class="player__warn">${ic('lock')} Este juego necesita un servidor. Abre la carpeta con <code>npm start</code> y entra a <code>http://localhost:8000</code>.</p>`
              : `<button class="bigplay" id="btnPlay" type="button">${ic('play')}<span>${st.plays ? 'Continuar' : 'Jugar'}</span></button>`}
          </div>
        </div>
        <div class="player__load" id="load" hidden><span class="logo__mask">${ICONS.mask}</span><b>Cargando ${esc(g.title)}…</b><i class="loadbar"><i></i></i></div>
        <button class="player__exit" id="btnExitFs" type="button">${ic('close')} Salir</button>
      </div>

      <div class="gbar">
        <img class="gbar__img" src="${g.cover}" alt="">
        <div class="gbar__txt"><h2>${esc(g.title)}</h2><div class="slide__tags small">${g.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div></div>
        <div class="gbar__act">
          <button class="iconbtn lg ${fav ? 'is-fav' : ''}" type="button" data-fav="${g.id}" aria-pressed="${fav}" aria-label="Favorito" title="Favorito">${ic(fav ? 'heart' : 'heartO')}</button>
          <button class="iconbtn lg" type="button" data-act="restart" aria-label="Reiniciar" title="Reiniciar">${ic('restart')}</button>
          <button class="iconbtn lg" type="button" data-act="full" aria-label="Pantalla completa" title="Pantalla completa (F)">${ic('full')}</button>
          <a class="btn btn--ghost sm" href="#inicio">${ic('back')}<span>Inicio</span></a>
        </div>
      </div>

      <div class="ginfo">
        <article class="card">
          <h3>Sobre el juego</h3>
          <p>${esc(g.desc)}</p>
        </article>
        <article class="card">
          <h3>Cómo se juega</h3>
          <ul class="keys">${g.controls.map(([ks, what]) => `<li><span>${ks.map(k => `<kbd>${esc(k)}</kbd>`).join('')}</span><em>${esc(what)}</em></li>`).join('')}</ul>
          <p class="dim">${esc(g.tip)}</p>
        </article>
        <article class="card">
          <h3>Tu progreso</h3>
          <div class="pstats">
            ${(p ? p.stats : []).map(([k, v]) => `<div><b>${esc(v)}</b><small>${esc(k)}</small></div>`).join('')}
            <div><b>${st.plays}</b><small>Partidas</small></div>
            <div><b>${fmtTime(st.time)}</b><small>Tiempo</small></div>
          </div>
          ${p ? '' : '<p class="dim">Todavía no hay partida guardada. ¡Dale a jugar!</p>'}
        </article>
      </div>
    </div>

    <aside class="game__side">
      <h3 class="sec__title">${ic('gamepad')} Más juegos</h3>
      ${others.slice(0, 6).map(o => `<a class="mini" href="${gameHref(o)}" style="--c:${o.color}"><img src="${o.cover}" alt="" loading="lazy"><span><b>${esc(o.title)}</b><small>${esc(o.tagline)}</small></span></a>`).join('')}
    </aside>
  </section>`;
  bindTiles();
  const btn = $('#btnPlay');
  if (btn) btn.addEventListener('click', () => startGame(g));
  if (UI.autoplay && btn) { UI.autoplay = false; startGame(g); }
  UI.autoplay = false;
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function startGame(g) {
  if (UI.frame) return;
  SFX.play();
  const player = $('#player'), cover = $('#cover'), load = $('#load');
  cover.classList.add('is-gone');
  load.hidden = false;
  $('.game').classList.add('is-playing');
  const f = document.createElement('iframe');
  f.className = 'player__frame';
  f.title = g.title;
  f.allow = 'fullscreen; autoplay; gamepad; accelerometer; gyroscope';
  f.setAttribute('allowfullscreen', '');
  f.src = g.url;
  f.addEventListener('load', () => {
    load.classList.add('is-done');
    setTimeout(() => { load.hidden = true; }, 450);
    try { f.contentWindow.focus(); } catch (e) { f.focus({ preventScroll: true }); }
    showPlayer();
  }, { once: true });
  player.append(f);
  showPlayer();
  UI.frame = f; UI.playing = true;
  const st = gstat(g.id);
  const first = !st.plays;
  st.plays++; st.last = Date.now();
  P.recent = [g.id, ...P.recent.filter(id => id !== g.id)].slice(0, 6);
  if (first) addXP(25);
  persist();
  checkAch();
}
// Deja el reproductor entero a la vista, justo debajo de la cabecera.
function showPlayer() {
  const player = $('#player'); if (!player) return;
  const top = player.getBoundingClientRect().top + window.scrollY - $('#top').offsetHeight - 12;
  window.scrollTo({ top: Math.max(0, top), behavior: REDUCED ? 'auto' : 'smooth' });
}
function stopGame() {
  const wasApice = UI.frame && UI.game && UI.game.id === 'apice-gp';
  if (UI.frame) { UI.frame.src = 'about:blank'; UI.frame.remove(); UI.frame = null; }
  if (wasApice) loadApice(refreshAfterLoad);
  UI.playing = false;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  document.body.classList.remove('pseudo-fs');
}
function restartGame() {
  if (!UI.game) return;
  if (!UI.frame) { startGame(UI.game); return; }
  SFX.click();
  const load = $('#load');
  load.hidden = false; load.classList.remove('is-done');
  UI.frame.addEventListener('load', () => { load.classList.add('is-done'); setTimeout(() => { load.hidden = true; }, 450); }, { once: true });
  UI.frame.src = UI.game.url;
}
function toggleFull() {
  const player = $('#player'); if (!player) return;
  if (!UI.frame && UI.game && !(UI.game.needsServer && location.protocol === 'file:')) startGame(UI.game);
  if (document.fullscreenElement || document.body.classList.contains('pseudo-fs')) {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    document.body.classList.remove('pseudo-fs');
    return;
  }
  const req = player.requestFullscreen || player.webkitRequestFullscreen;
  if (req) {
    Promise.resolve(req.call(player)).catch(() => document.body.classList.add('pseudo-fs'));
  } else document.body.classList.add('pseudo-fs');
  setTimeout(() => { try { UI.frame && UI.frame.contentWindow.focus(); } catch (e) { /* nada */ } }, 200);
}

// Cuenta el tiempo de juego (sólo con la pestaña visible) y da XP: 10 por minuto.
setInterval(() => {
  if (!UI.playing || !UI.game || document.visibilityState !== 'visible') return;
  const st = gstat(UI.game.id);
  st.time++;
  if (st.time % 6 === 0) { P.xp++; }
  if (st.time % 10 === 0) { persist(); paintMe(); checkAch(); }
}, 1000);

/* ---------- panel del perfil ---------- */
function openDrawer() {
  const d = $('#drawer'), s = $('#scrim');
  renderDrawer();
  d.hidden = false; s.hidden = false;
  requestAnimationFrame(() => { d.classList.add('is-open'); s.classList.add('is-open'); });
  P.seenAch = Object.keys(P.ach).length; persist(); paintMe();
  SFX.open();
  setTimeout(() => $('#btnCloseDrawer').focus(), 50);
}
function closeDrawer() {
  const d = $('#drawer'), s = $('#scrim');
  if (d.hidden) return;
  d.classList.remove('is-open'); s.classList.remove('is-open');
  SFX.close();
  setTimeout(() => { d.hidden = true; s.hidden = true; }, 300);
  $('#btnMe').focus();
}
function renderDrawer() {
  const L = levelOf(P.xp), tt = totalTime();
  const maxT = Math.max(1, ...GAMES.map(g => gstat(g.id).time));
  $('#drawerBody').innerHTML = `
    <div class="prof">
      <div class="prof__av">${avatarSVG(P.avatar)}<b>${L.lvl}</b></div>
      <div class="prof__id">
        <label class="field"><span>Tu nombre</span><input id="inName" maxlength="18" value="${esc(P.name)}" autocomplete="off" spellcheck="false"></label>
        <div class="prof__lvl"><b>Nivel ${L.lvl}</b> · ${esc(L.title)}</div>
        <span class="xpbar"><i style="width:${Math.round(L.cur / L.need * 100)}%"></i></span>
        <small class="dim">${L.cur} / ${L.need} XP para el nivel ${L.lvl + 1}</small>
      </div>
    </div>
    <h3 class="dh">Elige tu máscara</h3>
    <div class="avs">${AVATARS.map((_, i) => `<button class="av ${i === P.avatar ? 'is-on' : ''}" type="button" data-av="${i}" aria-label="Máscara ${i + 1}" aria-pressed="${i === P.avatar}">${avatarSVG(i)}</button>`).join('')}</div>
    <h3 class="dh">Estadísticas</h3>
    <div class="pstats">
      <div><b>${fmtTime(tt)}</b><small>Tiempo total</small></div>
      <div><b>${totalPlays()}</b><small>Partidas</small></div>
      <div><b>${playedCount()}/${GAMES.length}</b><small>Juegos probados</small></div>
      <div><b>${Object.keys(P.ach).length}/${ACH.length}</b><small>Insignias</small></div>
    </div>
    <div class="tbars">${GAMES.map(g => { const s = gstat(g.id); return `<div class="tbar" style="--c:${g.color}"><span>${esc(g.title)}</span><i><i style="width:${Math.round(s.time / maxT * 100)}%"></i></i><em>${fmtTime(s.time)}</em></div>`; }).join('')}</div>
    <h3 class="dh">Insignias</h3>
    <div class="achs">${ACH.map(a => { const on = !!P.ach[a.id]; return `<div class="ach ${on ? 'is-on' : ''}"><span class="ach__ico">${ic(on ? a.icon : 'lock')}</span><span><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></span>${on ? '<em>+50</em>' : ''}</div>`; }).join('')}</div>
    <h3 class="dh">Ajustes</h3>
    <div class="opts">
      <button class="opt" type="button" data-act="sound">${ic(P.sound ? 'sound' : 'mute')}<span>Sonidos del portal</span><em class="sw ${P.sound ? 'is-on' : ''}"><i></i></em></button>
      <button class="opt" type="button" data-act="blank">${ic('blank')}<span>Abrir en about:blank</span></button>
      <button class="opt" type="button" data-act="intro">${ic('mask')}<span>Ver la intro otra vez</span></button>
      <button class="opt danger" type="button" data-act="wipe">${ic('restart')}<span id="wipeTxt">Borrar mi perfil del portal</span></button>
    </div>
    <p class="dim small">El progreso de cada juego se guarda en el propio juego; borrar el perfil no lo toca.</p>
  `;
  const inp = $('#inName');
  inp.addEventListener('input', () => { const v = inp.value.trim(); if (v) { P.name = v; P.customized = true; persist(); paintMe(); } });
  inp.addEventListener('change', () => { if (!inp.value.trim()) inp.value = P.name; checkAch(); });
}

/* ---------- about:blank ----------
   Abre el portal en una pestaña nueva cuya barra dice about:blank y cuyo título es
   "Classes": el sitio va dentro de un iframe que ocupa toda la ventana. */
function openBlank() {
  SFX.click();
  const url = location.href.split('#')[0] + (UI.game ? gameHref(UI.game) : '#' + (UI.tab || 'inicio'));
  let w = null;
  try { w = window.open('about:blank', '_blank'); } catch (e) { w = null; }
  if (!w) { toast('No se pudo abrir la pestaña', 'Permite las ventanas emergentes de esta página y vuelve a intentarlo.', 'blank'); return; }
  const d = w.document;
  d.open();
  d.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Classes</title>' +
    '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 16 16%27%3E%3Crect width=%2716%27 height=%2716%27 rx=%273%27 fill=%27%231e8e3e%27/%3E%3C/svg%3E">' +
    '<style>html,body{margin:0;height:100%;background:#07060d;overflow:hidden}iframe{display:block;width:100vw;height:100vh;border:0}</style></head>' +
    '<body><iframe src="' + url.replace(/"/g, '&quot;') + '" allow="fullscreen; autoplay; gamepad; accelerometer; gyroscope" allowfullscreen></iframe></body></html>');
  d.close();
  P.cloaked = true; persist(); checkAch();
  stopGame();
}

/* ---------- intro ---------- */
function playIntro(force) {
  const el = $('#intro');
  let seen = false;
  try { seen = sessionStorage.getItem('ag_intro') === '1'; sessionStorage.setItem('ag_intro', '1'); } catch (e) { /* nada */ }
  if ((seen || REDUCED) && !force) { el.remove(); return; }
  el.classList.remove('is-out');
  el.classList.add('is-on');
  if (force) SFX.intro();
  let done = false;
  const end = () => { if (done) return; done = true; el.classList.add('is-out'); setTimeout(() => { el.classList.remove('is-on', 'is-out'); if (!force) el.remove(); }, 600); };
  el.addEventListener('click', end, { once: true });
  setTimeout(end, 2300);
}

/* ---------- enrutado ---------- */
// Anclas simples (#inicio, #biblioteca, #logros, #juego-<id>): son las únicas que
// el visor de Claude deja pasar.
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const g = h.startsWith('juego-') && gameById(h.slice(6));
  closeDrawer();
  if (g) renderGame(g);
  else if (h === 'biblioteca') renderLibrary();
  else if (h === 'logros') renderAch();
  else renderDash();
  paintTabs();
  view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter');
}

/* ---------- jugar, pestañas y mando ---------- */
function playGame(g) {
  if (!g) return;
  UI.autoplay = true;
  if (location.hash === gameHref(g)) route(); else location.hash = gameHref(g);
}
function playSel() { playGame(GAMES[UI.sel]); }
const TABS = ['inicio', 'biblioteca', 'logros'];
function switchTab(d) {
  const i = Math.max(0, TABS.indexOf(UI.tab || 'inicio'));
  SFX.click();
  location.hash = '#' + TABS[(i + d + TABS.length) % TABS.length];
}
function paintPadHint() {
  const h = $('#padHint'); if (!h) return;
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  h.hidden = !pads.length;
}
// Con el menú abierto se lee el mando: cruceta o stick para elegir, A jugar, B volver,
// Y favorito, LB/RB cambian de pestaña. Mientras se juega no se lee (el juego lo usa).
(function padLoop() {
  const last = {};
  let repeatAt = 0;
  const press = (k, on, fn) => { if (on && !last[k]) fn(); last[k] = on; };
  function tick(t) {
    requestAnimationFrame(tick);
    if (UI.playing || !navigator.getGamepads) return;
    const gp = [...navigator.getGamepads()].find(Boolean);
    if (!gp) return;
    const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const x = gp.axes[0] || 0;
    const dir = b(15) || x > 0.6 ? 1 : b(14) || x < -0.6 ? -1 : 0;
    if (dir && $('#dash')) { if (t > repeatAt) { setSel(UI.sel + dir); repeatAt = t + (last.dir === dir ? 140 : 320); } }
    last.dir = dir;
    press('a', b(0), () => { if ($('#dash')) playSel(); else if (UI.game && !UI.frame) startGame(UI.game); });
    press('b', b(1), () => { if (!$('#drawer').hidden) closeDrawer(); else if (UI.game || UI.tab !== 'inicio') location.hash = '#inicio'; });
    press('y', b(3), () => { const f = $('#dashInfo [data-fav]'); if (f) f.click(); });
    press('lb', b(4), () => switchTab(-1));
    press('rb', b(5), () => switchTab(1));
  }
  requestAnimationFrame(tick);
  addEventListener('gamepadconnected', () => { paintPadHint(); toast('Mando conectado', 'Cruceta para elegir, A para jugar', 'gamepad'); });
  addEventListener('gamepaddisconnected', paintPadHint);
})();

/* ---------- reloj ---------- */
function paintClock() { const c = $('#clock'); if (c) c.textContent = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }); }
setInterval(paintClock, 15000);

/* ---------- eventos globales ---------- */
document.addEventListener('pointerdown', () => SFX.unlock(), { once: true, capture: true });
window.addEventListener('hashchange', route);

view.addEventListener('click', e => {
  const t = e.target.closest('[data-cat],[data-fav],[data-sel],[data-play],[data-act]');
  if (!t) return;
  if (t.dataset.cat) { UI.cat = t.dataset.cat; SFX.click(); renderLibrary(); return; }
  if (t.dataset.sel) { const i = +t.dataset.sel; if (i === UI.sel && t.classList.contains('is-sel')) playSel(); else { SFX.click(); setSel(i); } return; }
  if (t.dataset.play) { e.preventDefault(); playGame(gameById(t.dataset.play)); return; }
  if (t.dataset.fav) {
    const id = t.dataset.fav, on = !P.favs.includes(id);
    P.favs = on ? [...P.favs, id] : P.favs.filter(x => x !== id);
    persist(); on ? SFX.fav() : SFX.click();
    t.setAttribute('aria-pressed', String(on));
    t.classList.toggle('is-fav', on);
    t.querySelector('.ic').outerHTML = ic(on ? 'heart' : 'heartO');
    const label = t.querySelector('span:not(.ic)'); if (label) label.textContent = on ? 'En favoritos' : 'Favorito';
    if (on) toast('Guardado en favoritos', gameById(id).title, 'heart');
    if ($('#card-' + id)) { const card = $('#card-' + id); const f = card.querySelector('.gcard__fav'); if (on && !f) card.insertAdjacentHTML('beforeend', `<span class="gcard__fav">${ic('heart')}</span>`); if (!on && f) f.remove(); }
    checkAch();
    return;
  }
  const act = t.dataset.act;
  if (act === 'restart') restartGame();
  else if (act === 'full') toggleFull();
  else if (act === 'profile') openDrawer();
});

$('#drawerBody').addEventListener('click', e => {
  const t = e.target.closest('[data-av],[data-act]');
  if (!t) return;
  if (t.dataset.av) { P.avatar = +t.dataset.av; P.customized = true; persist(); SFX.click(); paintMe(); renderDrawer(); checkAch(); if (!UI.game) route(); return; }
  const act = t.dataset.act;
  if (act === 'sound') { P.sound = !P.sound; persist(); paintMe(); renderDrawer(); SFX.click(); }
  else if (act === 'blank') openBlank();
  else if (act === 'intro') { closeDrawer(); setTimeout(() => playIntro(true), 320); }
  else if (act === 'wipe') {
    // Doble toque para confirmar (sin confirm()).
    if (t.classList.contains('armed')) {
      try { localStorage.removeItem(KEY); } catch (e) { /* nada */ }
      P = freshProfile(); persist(); checkAch(true); paintMe(); renderDrawer();
      toast('Perfil borrado', 'Empiezas de cero como un nuevo anónimo', 'mask');
      if (!UI.game) route();
    } else {
      t.classList.add('armed'); $('#wipeTxt').textContent = 'Toca otra vez para borrar';
      setTimeout(() => { if (t.isConnected) { t.classList.remove('armed'); $('#wipeTxt').textContent = 'Borrar mi perfil del portal'; } }, 3000);
    }
  }
});

$('#btnMe').addEventListener('click', openDrawer);
$('#btnBlank').addEventListener('click', openBlank);
$('#btnCloseDrawer').addEventListener('click', closeDrawer);
$('#scrim').addEventListener('click', closeDrawer);
$('#btnSound').addEventListener('click', () => { P.sound = !P.sound; persist(); paintMe(); SFX.click(); toast(P.sound ? 'Sonido activado' : 'Sonido apagado', '', P.sound ? 'sound' : 'mute'); });
$('#btnSearchMobile').addEventListener('click', () => { $('#top').classList.toggle('searching'); if ($('#top').classList.contains('searching')) $('#q').focus(); });

const q = $('#q');
q.addEventListener('input', () => {
  UI.q = q.value;
  if (UI.tab !== 'biblioteca') { UI.cat = 'todos'; location.hash = '#biblioteca'; return; }
  renderLibrary();
});
q.addEventListener('keydown', e => {
  if (e.key === 'Enter') { const g = filtered()[0]; if (g) { location.hash = gameHref(g); q.blur(); $('#top').classList.remove('searching'); } }
  if (e.key === 'Escape') { q.value = ''; UI.q = ''; q.blur(); $('#top').classList.remove('searching'); if (UI.tab === 'biblioteca') renderLibrary(); }
});

document.addEventListener('keydown', e => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  if (e.key === 'Escape') { if (!$('#drawer').hidden) { closeDrawer(); return; } if (document.body.classList.contains('pseudo-fs')) { document.body.classList.remove('pseudo-fs'); return; } }
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === '/') { e.preventDefault(); $('#top').classList.add('searching'); q.focus(); q.select(); }
  else if (e.key === 'm' || e.key === 'M') $('#btnSound').click();
  else if ((e.key === 'f' || e.key === 'F') && UI.game) toggleFull();
  else if (e.key === 'q' || e.key === 'Q') switchTab(-1);
  else if (e.key === 'e' || e.key === 'E') switchTab(1);
  else if ($('#dash') && $('#drawer').hidden) {
    const inDash = !document.activeElement || document.activeElement === document.body || document.activeElement.closest('#dash');
    if (!inDash) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); setSel(UI.sel + (e.key === 'ArrowRight' ? 1 : -1)); }
    else if (e.key === 'Enter' && !document.activeElement.closest('a,button:not(.gcard)')) { e.preventDefault(); playSel(); }
    else if (e.key === 'i' || e.key === 'I') location.hash = gameHref(GAMES[UI.sel]);
    else if (e.key === 'f' || e.key === 'F') { const b = $('#dashInfo [data-fav]'); if (b) b.click(); }
  }
});
document.addEventListener('click', e => { if (e.target.closest('#btnExitFs')) toggleFull(); });
document.addEventListener('fullscreenchange', () => document.body.classList.toggle('is-fs', !!document.fullscreenElement));
// Un juego dentro del iframe que guarda progreso dispara 'storage' aquí: refresca insignias.
window.addEventListener('storage', () => checkAch());

// Cuando llega el guardado de Ápice GP se vuelve a dibujar la vista (si no se está jugando)
function refreshAfterLoad() { checkAch(); if (!UI.playing && $('#drawer').hidden) route(); }

/* ---------- arranque ---------- */
paintIcons();
persist();
paintMe();
paintClock();
playIntro(false);
route();
// Las insignias ganadas jugando (o en otra visita) aparecen después de la intro.
setTimeout(() => checkAch(), $('#intro') ? 2600 : 700);
loadApice(() => { if (apiceCache) refreshAfterLoad(); });
