'use strict';
// Datos del juego: pistas, dificultades, bots, estética, constantes del kart y guardado.

const SAVE_KEY = 'kartodromo-save-v1';

// Pistas. Los puntos son (x, z) en metros; se unen con una curva Catmull-Rom cerrada.
// La carrera sale en el primer punto y va hacia el segundo.
const TRACKS = [
  {
    id: 't1', name: 'Pista 1', title: 'Galpón Azul', indoor: true, width: 8, scale: 1.4, unlock: 1,
    barrier: ['#2F6BE8', '#EEF2FA'], floor: '#2A2733', fog: '#1C1626',
    desc: 'Bajo techo, curvas cerradas y una horquilla al fondo. Ideal para aprender a frenar.',
    pts: [[-30, -22], [20, -22], [40, -18], [46, -4], [36, 6], [14, 8], [4, 18], [14, 28], [42, 30], [50, 42],
      [38, 52], [-14, 52], [-32, 46], [-34, 30], [-20, 22], [-14, 10], [-26, 0], [-44, -2], [-48, -14]],
  },
  {
    id: 't2', name: 'Pista 2', title: 'Fábrica Roja', indoor: true, width: 8, scale: 1.4, unlock: 2,
    barrier: ['#E23B2E', '#FFD21F'], floor: '#24222A', fog: '#140F1A', tires: true,
    desc: 'Galpón grande con barreras rojas y amarillas, chicanas y llantas en cada curva.',
    pts: [[-50, -40], [10, -40], [36, -36], [44, -22], [30, -12], [14, -16], [2, -14], [-4, -5], [2, 5], [14, 7], [40, 6], [56, 16],
      [56, 34], [40, 44], [16, 40], [2, 50], [-16, 56], [-36, 50], [-40, 34], [-26, 22], [-34, 8], [-56, 4],
      [-64, -12], [-62, -30]],
  },
  {
    id: 't3', name: 'Pista 3', title: 'Parque del Litoral', indoor: false, width: 10, scale: 1.3, unlock: 3,
    barrier: ['#E23B2E', '#F4F4F4'], floor: '#4FA34A', fog: '#BFDDF2', kerbs: true,
    desc: 'Al aire libre: rectas largas, curvas rápidas y una chicana antes de la meta.',
    pts: [[-60, -70], [40, -70], [80, -62], [96, -40], [86, -14], [56, -6], [40, 14], [56, 36], [92, 46], [104, 72],
      [86, 96], [40, 100], [0, 90], [-20, 64], [-50, 56], [-80, 64], [-104, 46], [-100, 14], [-76, -2], [-90, -30],
      [-86, -58]],
  },
];

const DIFFS = [
  { id: 'facil', name: 'Fácil', pace: 0.74, top: 0.82, err: 1.0, coin: 0.8, unlock: 1 },
  { id: 'normal', name: 'Normal', pace: 0.84, top: 0.90, err: 0.6, coin: 1.0, unlock: 1 },
  { id: 'dificil', name: 'Difícil', pace: 0.92, top: 0.96, err: 0.3, coin: 1.4, unlock: 2 },
  { id: 'experto', name: 'Experto', pace: 0.98, top: 1.0, err: 0.1, coin: 1.9, unlock: 4 },
];

const LAP_OPTIONS = [2, 3, 5];
const CHAMP_TRACKS = ['t1', 't2', 't3'];
const CHAMP_UNLOCK = 3;            // nivel de piloto para el campeonato
const POINTS = [10, 7, 5, 3, 2, 1];
const COINS_BY_POS = [120, 80, 60, 40, 30, 20];
const XP_BY_POS = [70, 55, 45, 35, 28, 22];
const CHAMP_BONUS = [500, 300, 180, 0, 0, 0];

const BOT_NAMES = ['TurboCuy', 'LlamaDrift', 'ChichaRacer', 'PapaRellena', 'NeblinaGP', 'ElPicaronazo',
  'Choclito99', 'Ceviche_V8', 'MotoTaxiPro', 'Huayco'];

// Estética: carrocería, casco y aros. "lvl" es el nivel de piloto que hace falta.
const BODIES = [
  { id: 'rojo', name: 'Rojo clásico', c: '#E8322F', cost: 0, lvl: 1 },
  { id: 'azul', name: 'Azul eléctrico', c: '#2F6BE8', cost: 150, lvl: 1 },
  { id: 'verde', name: 'Verde lima', c: '#36C24A', cost: 150, lvl: 1 },
  { id: 'naranja', name: 'Naranja fuego', c: '#FF7A1A', cost: 220, lvl: 1 },
  { id: 'amarillo', name: 'Amarillo pollito', c: '#FFD21F', cost: 220, lvl: 2 },
  { id: 'morado', name: 'Morado chicha', c: '#8E44EC', cost: 320, lvl: 2 },
  { id: 'rosa', name: 'Rosa neón', c: '#FF2E88', cost: 320, lvl: 3 },
  { id: 'negro', name: 'Negro mate', c: '#2A2A33', cost: 450, lvl: 3 },
  { id: 'blanco', name: 'Blanco perla', c: '#F2F2F2', cost: 450, lvl: 4 },
  { id: 'dorado', name: 'Dorado campeón', c: '#D9AE3B', cost: 1500, lvl: 6, metal: true },
];
const HELMETS = [
  { id: 'franja-roja', name: 'Franja roja', p: 'franja', a: '#E8322F', b: '#F4F4F4', cost: 0, lvl: 1 },
  { id: 'liso-blanco', name: 'Liso blanco', p: 'liso', a: '#F4F4F4', b: '#F4F4F4', cost: 0, lvl: 1 },
  { id: 'mitad-azul', name: 'Mitad azul', p: 'mitad', a: '#2F6BE8', b: '#F4F4F4', cost: 120, lvl: 1 },
  { id: 'doble-verde', name: 'Doble franja verde', p: 'doble', a: '#F4F4F4', b: '#36C24A', cost: 200, lvl: 2 },
  { id: 'franja-amarilla', name: 'Franja amarilla', p: 'franja', a: '#1E1E26', b: '#FFD21F', cost: 260, lvl: 2 },
  { id: 'cuadros', name: 'Cuadros de meta', p: 'cuadros', a: '#1E1E26', b: '#F4F4F4', cost: 400, lvl: 3 },
  { id: 'peru', name: 'Bicolor', p: 'mitad', a: '#D91E2A', b: '#F4F4F4', cost: 350, lvl: 3 },
  { id: 'rayo', name: 'Rayo morado', p: 'rayo', a: '#8E44EC', b: '#FFD21F', cost: 600, lvl: 4 },
  { id: 'oro', name: 'Casco de oro', p: 'doble', a: '#D9AE3B', b: '#1E1E26', cost: 1200, lvl: 5, metal: true },
];
const RIMS = [
  { id: 'gris', name: 'Aros grises', c: '#B8BCC6', cost: 0, lvl: 1 },
  { id: 'negro', name: 'Aros negros', c: '#2B2B30', cost: 100, lvl: 1 },
  { id: 'blanco', name: 'Aros blancos', c: '#F4F4F4', cost: 120, lvl: 2 },
  { id: 'rojo', name: 'Aros rojos', c: '#E8322F', cost: 180, lvl: 2 },
  { id: 'dorado', name: 'Aros dorados', c: '#D9AE3B', cost: 600, lvl: 4, metal: true },
];
const COSMETICS = { body: BODIES, helmet: HELMETS, rims: RIMS };

// Física del kart (metros, segundos). Los karts reales no tienen cambios: transmisión directa.
const KART = {
  vmax: 24,        // m/s (~86 km/h)
  accel: 9.0,      // aceleración en arranque
  brake: 18,       // frenada
  reverse: 4.5,    // velocidad máxima en reversa
  roll: 0.5,       // resistencia a la rodadura
  grip: 14,        // aceleración lateral máxima con agarre (m/s²)
  slideGrip: 5,  // agarre con el freno de mano
  wheelbase: 1.06,
  steerLow: 0.62,  // ángulo de dirección máximo a baja velocidad (rad)
  steerHigh: 0.17, // a velocidad punta
  radius: 0.85,    // radio para choques entre karts
};

const XP_BASE = 100, XP_STEP = 60;
function levelInfo(xp) {
  let lvl = 1, need = XP_BASE;
  while (xp >= need) { xp -= need; lvl++; need = XP_BASE + (lvl - 1) * XP_STEP; }
  return { lvl, cur: xp, need };
}

function defaultSave() {
  return {
    v: 1, coins: 0, xp: 0, name: 'Piloto',
    owned: { body: ['rojo'], helmet: ['franja-roja', 'liso-blanco'], rims: ['gris'] },
    eq: { body: 'rojo', helmet: 'franja-roja', rims: 'gris', num: 7 },
    pb: {},          // por pista: { lap, sec: [s1, s2, s3] }
    stats: { races: 0, wins: 0, podiums: 0, cups: 0 },
    last: { track: 't1', diff: 'normal', laps: 3 },
    opt: { vol: 0.7, quality: 'alta', cam: 0, names: true },
  };
}

function loadSave() {
  const base = defaultSave();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return base;
    const s = JSON.parse(raw);
    for (const k of ['owned', 'eq', 'stats', 'last', 'opt']) s[k] = Object.assign({}, base[k], s[k] || {});
    return Object.assign(base, s);
  } catch (e) { return base; }
}

let save = loadSave();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* sin guardado */ } }

const trackById = id => TRACKS.find(t => t.id === id) || TRACKS[0];
const diffById = id => DIFFS.find(d => d.id === id) || DIFFS[1];
const cosById = (kind, id) => COSMETICS[kind].find(c => c.id === id) || COSMETICS[kind][0];
const playerLevel = () => levelInfo(save.xp).lvl;

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
function fmtTime(t) {
  if (t == null || !isFinite(t)) return '--.---';
  const m = Math.floor(t / 60), s = t - m * 60;
  const ss = s.toFixed(3);
  return m > 0 ? m + ':' + (s < 10 ? '0' : '') + ss : ss;
}
