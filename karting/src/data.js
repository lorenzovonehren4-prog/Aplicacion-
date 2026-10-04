'use strict';
// Datos del juego: pistas, dificultades, bots, estética del kart y del perfil,
// constantes del kart y guardado.

const SAVE_KEY = 'kartodromo-save-v1';

// Pistas. Los puntos son (x, z, altura) en metros; se unen con una curva Catmull-Rom cerrada.
// La carrera sale en el primer punto y va hacia el segundo. Un tramo con altura >= 4,6 m
// puede pasar por encima de otro (puente / segundo piso). "tunnels" marca tramos techados
// entre dos índices de puntos de control. Todas las pistas están libres desde el principio.
const TRACKS = [
  {
    id: 't1', name: 'Pista 1', title: 'Galpón Azul', theme: 'azul', indoor: true, width: 10, scale: 2.0,
    barrier: ['#2F6BE8', '#EEF2FA'],
    desc: 'Galpón de dos pisos: sube la rampa, cruza el puente sobre la recta y baja a la horquilla, la única curva donde hay que frenar.',
    pts: [[-60, -50], [0, -50], [35, -50], [58, -42], [68, -22, 0.4], [70, 2, 2.6], [64, 24, 4.6], [46, 38, 5], [20, 40, 5],
      [4, 28, 5], [0, 4, 5], [0, -30, 5], [0, -64, 5], [0, -84, 2.8], [-1, -104, 0.3], [-6, -114],
      [-15, -118], [-23, -110], [-24, -96], [-34, -86], [-46, -86], [-68, -88], [-94, -82], [-110, -66], [-108, -46], [-88, -40]],
  },
  {
    id: 't2', name: 'Pista 2', title: 'Fábrica Roja', theme: 'fabrica', indoor: true, width: 10, scale: 1.9,
    barrier: ['#E23B2E', '#FFD21F'], tunnels: [[12, 15]],
    desc: 'Fábrica con túnel de contenedores, un segundo piso que pasa sobre la largada y llantas en cada curva.',
    pts: [[-70, -40], [-20, -40], [15, -40], [50, -40], [55, -36], [56, -26], [57, -10], [58, 8], [42, 22], [20, 20], [0, 24], [-16, 38],
      [-18, 58], [0, 72], [30, 76], [56, 70], [74, 52, 0.6], [80, 28, 3], [76, 4, 5.2], [62, -18, 5.4], [40, -44, 5.4],
      [20, -62, 4.6], [-4, -74, 2.4], [-30, -80, 0.4], [-66, -82], [-84, -80], [-91, -67], [-84, -53]],
  },
  {
    id: 't3', name: 'Pista 3', title: 'Parque del Litoral', theme: 'parque', indoor: false, width: 12, scale: 1.35,
    barrier: ['#E23B2E', '#F4F4F4'], tunnels: [[7, 10]], kerbs: true,
    desc: 'Al aire libre junto al mar: túnel bajo el cerro, viaducto de segundo piso sobre la meta y curvas rápidas.',
    pts: [[-80, -90], [0, -90], [60, -90], [100, -76], [118, -42], [108, -8], [82, 12], [64, 36], [68, 66], [88, 88],
      [98, 116], [78, 140], [40, 140, 1.5], [8, 120, 5], [-6, 88, 6.5], [-4, 48, 6.5], [6, 8, 6.5], [10, -40, 6.5],
      [10, -90, 6.5], [4, -120, 4], [-16, -140, 1], [-46, -150], [-84, -144], [-112, -126], [-120, -104], [-104, -92]],
  },
  {
    id: 't4', name: 'Pista 4', title: 'Lima de Noche', theme: 'noche', indoor: false, width: 11, scale: 1.4,
    barrier: ['#FF2E88', '#2AD4FF'], tunnels: [[17, 20]], kerbs: true,
    desc: 'Ciudad de noche con letreros de neón, un paso a desnivel bajo los edificios y una vía expresa elevada.',
    pts: [[-76, -72], [-30, -70], [30, -70], [62, -62], [78, -40], [78, -10], [74, 8, 0.8], [58, 22, 3.2], [30, 28, 5.6],
      [0, 30, 6], [-30, 34, 6], [-56, 44, 5.4], [-74, 70, 4.4], [-62, 96, 1.6], [-34, 100], [0, 98], [30, 96], [56, 100],
      [84, 92], [96, 70], [92, 46], [70, 40], [40, 46], [-4, 54], [-36, 56], [-78, 26], [-94, 4], [-102, -24], [-106, -50], [-96, -66]],
  },
  {
    id: 't5', name: 'Pista 5', title: 'Dunas de Paracas', theme: 'desierto', indoor: false, width: 12, scale: 1.0,
    barrier: ['#F28C28', '#F4F4F4'], tunnels: [[8, 10]], kerbs: true,
    desc: 'Desierto al atardecer: rectas largas entre dunas, un túnel bajo la arena y un viaducto que cruza la meta.',
    pts: [[-150, -100], [-60, -105], [30, -100], [110, -85], [155, -50], [165, 0], [140, 45], [95, 60], [70, 95], [80, 140], [55, 180],
      [10, 190], [-25, 170], [-35, 130, 1.5], [-40, 80, 5], [-40, 20, 6], [-40, -40, 6], [-40, -105, 6], [-45, -150, 4], [-70, -180, 1],
      [-110, -185], [-150, -170], [-180, -140], [-180, -110]],
  },
  {
    id: 't6', name: 'Pista 6', title: 'Galpón Neón', theme: 'neon', indoor: true, width: 10, scale: 1.6,
    barrier: ['#B026FF', '#2AF5FF'], tunnels: [[6, 8]],
    desc: 'Galpón a oscuras con tubos de neón, un túnel de anillos de luz y un segundo piso que pasa sobre la largada.',
    pts: [[-80, -60], [0, -60], [55, -56], [82, -38], [86, -8], [66, 12], [34, 12], [12, 26], [14, 50], [40, 58], [72, 60, 0.6],
      [92, 76, 2.6], [88, 100, 4.6], [60, 110, 5.4], [20, 104, 5.6], [-12, 84, 5.6], [-30, 40, 5.6], [-36, -10, 5.4], [-40, -60, 5.2],
      [-46, -92, 3.4], [-66, -108, 1], [-90, -110], [-101, -102], [-103, -86], [-96, -70]],
  },
];

const DIFFS = [
  { id: 'facil', name: 'Fácil', pace: 0.70, top: 0.80, err: 1.3, coin: 0.8, band: [25, 0.82], info: 'Bots tranquilos que te esperan' },
  { id: 'normal', name: 'Normal', pace: 0.79, top: 0.88, err: 0.9, coin: 1.0, band: [45, 0.9], info: 'Para aprender las pistas' },
  { id: 'dificil', name: 'Difícil', pace: 0.89, top: 0.95, err: 0.4, coin: 1.4, band: [90, 0.96], info: 'Rápidos, casi no fallan' },
  { id: 'experto', name: 'Experto', pace: 0.97, top: 1.0, err: 0.1, coin: 1.9, band: null, info: 'Vueltas casi perfectas' },
];

const LAP_OPTIONS = [2, 3, 5];
const CHAMP_TRACKS = ['t1', 't2', 't3', 't4', 't5', 't6'];
const POINTS = [10, 7, 5, 3, 2, 1];
const COINS_BY_POS = [120, 80, 60, 40, 30, 20];
const XP_BY_POS = [70, 55, 45, 35, 28, 22];
const CHAMP_BONUS = [600, 360, 220, 0, 0, 0];

const BOT_NAMES = ['TurboCuy', 'LlamaDrift', 'ChichaRacer', 'PapaRellena', 'NeblinaGP', 'ElPicaronazo',
  'Choclito99', 'Ceviche_V8', 'MotoTaxiPro', 'Huayco'];

// ---------- estética del kart ----------
// Acabados: mate, brillo, metal, cromo, oro, perla (tornasol), neon (brilla en la oscuridad), carbono.
// "lvl" es el nivel de piloto que hace falta; "cost" en monedas.
const BODIES = [
  { id: 'rojo', name: 'Rojo clásico', c: '#E8322F', f: 'brillo', cost: 0, lvl: 1 },
  { id: 'azul', name: 'Azul eléctrico', c: '#2F6BE8', f: 'brillo', cost: 120, lvl: 1 },
  { id: 'verde', name: 'Verde lima', c: '#36C24A', f: 'brillo', cost: 120, lvl: 1 },
  { id: 'naranja', name: 'Naranja fuego', c: '#FF7A1A', f: 'brillo', cost: 150, lvl: 1 },
  { id: 'negro', name: 'Negro mate', c: '#24242C', f: 'mate', cost: 200, lvl: 2 },
  { id: 'rosa', name: 'Rosa chicle', c: '#FF2E88', f: 'brillo', cost: 200, lvl: 2 },
  { id: 'azul-metal', name: 'Azul metalizado', c: '#2457D6', f: 'metal', cost: 350, lvl: 2 },
  { id: 'rojo-metal', name: 'Rojo candy', c: '#C4121F', f: 'metal', cost: 350, lvl: 3 },
  { id: 'carbono', name: 'Fibra de carbono', c: '#1C1C22', f: 'carbono', cost: 500, lvl: 3 },
  { id: 'perla', name: 'Perla tornasol', c: '#F2EEF8', f: 'perla', cost: 700, lvl: 4 },
  { id: 'neon-verde', name: 'Neón tóxico', c: '#39FF6A', f: 'neon', cost: 800, lvl: 4 },
  { id: 'neon-rosa', name: 'Neón rosa', c: '#FF3DCB', f: 'neon', cost: 800, lvl: 5 },
  { id: 'cromo', name: 'Cromo espejo', c: '#E6E9EF', f: 'cromo', cost: 1200, lvl: 5 },
  { id: 'oro-rosa', name: 'Oro rosa', c: '#E8A08C', f: 'oro', cost: 1400, lvl: 6 },
  { id: 'dorado', name: 'Oro de campeón', c: '#F5C542', f: 'oro', cost: 2000, lvl: 7 },
];
const HELMETS = [
  { id: 'franja-roja', name: 'Franja roja', p: 'franja', a: '#E8322F', b: '#F4F4F4', cost: 0, lvl: 1 },
  { id: 'liso-blanco', name: 'Liso blanco', p: 'liso', a: '#F4F4F4', b: '#F4F4F4', cost: 0, lvl: 1 },
  { id: 'mitad-azul', name: 'Mitad azul', p: 'mitad', a: '#2F6BE8', b: '#F4F4F4', cost: 100, lvl: 1 },
  { id: 'doble-verde', name: 'Doble franja verde', p: 'doble', a: '#F4F4F4', b: '#36C24A', cost: 150, lvl: 1 },
  { id: 'franja-amarilla', name: 'Franja amarilla', p: 'franja', a: '#1E1E26', b: '#FFD21F', cost: 220, lvl: 2 },
  { id: 'cuadros', name: 'Cuadros de meta', p: 'cuadros', a: '#1E1E26', b: '#F4F4F4', cost: 300, lvl: 2 },
  { id: 'bicolor', name: 'Bicolor', p: 'mitad', a: '#D91E2A', b: '#F4F4F4', cost: 300, lvl: 3 },
  { id: 'rayo', name: 'Rayo morado', p: 'rayo', a: '#8E44EC', b: '#FFD21F', cost: 500, lvl: 3 },
  { id: 'neon', name: 'Casco neón', p: 'rayo', a: '#14141C', b: '#39FF6A', f: 'neon', cost: 700, lvl: 4 },
  { id: 'cromo', name: 'Casco cromado', p: 'liso', a: '#E6E9EF', b: '#E6E9EF', f: 'cromo', cost: 1000, lvl: 5 },
  { id: 'oro', name: 'Casco de oro', p: 'doble', a: '#F5C542', b: '#1E1E26', f: 'oro', cost: 1400, lvl: 6 },
];
const RIMS = [
  { id: 'gris', name: 'Aros grises', c: '#B8BCC6', cost: 0, lvl: 1 },
  { id: 'negro', name: 'Aros negros', c: '#2B2B30', f: 'mate', cost: 80, lvl: 1 },
  { id: 'blanco', name: 'Aros blancos', c: '#F4F4F4', cost: 100, lvl: 1 },
  { id: 'rojo', name: 'Aros rojos', c: '#E8322F', cost: 150, lvl: 2 },
  { id: 'cromo', name: 'Aros cromados', c: '#E6E9EF', f: 'cromo', cost: 450, lvl: 3 },
  { id: 'dorado', name: 'Aros dorados', c: '#F5C542', f: 'oro', cost: 700, lvl: 4 },
];
// Luces de neón debajo del kart (se ven en el piso)
const GLOWS = [
  { id: 'ninguna', name: 'Sin luces', c: null, cost: 0, lvl: 1 },
  { id: 'azul', name: 'Neón azul', c: '#2AA8FF', cost: 300, lvl: 2 },
  { id: 'morado', name: 'Neón morado', c: '#A04BFF', cost: 300, lvl: 2 },
  { id: 'verde', name: 'Neón verde', c: '#39FF6A', cost: 400, lvl: 3 },
  { id: 'rosa', name: 'Neón rosa', c: '#FF3DCB', cost: 400, lvl: 3 },
  { id: 'dorado', name: 'Neón dorado', c: '#FFC933', cost: 900, lvl: 5 },
  { id: 'arcoiris', name: 'Arcoíris', c: 'rainbow', cost: 1500, lvl: 6 },
];

// ---------- estética del perfil ----------
const FRAMES = [
  { id: 'basico', name: 'Marco básico', cls: 'fr-basico', cost: 0, lvl: 1 },
  { id: 'bronce', name: 'Marco de bronce', cls: 'fr-bronce', cost: 150, lvl: 1 },
  { id: 'plata', name: 'Marco de plata', cls: 'fr-plata', cost: 400, lvl: 2 },
  { id: 'oro', name: 'Marco de oro', cls: 'fr-oro', cost: 900, lvl: 4 },
  { id: 'neon', name: 'Marco neón', cls: 'fr-neon', cost: 1100, lvl: 5 },
  { id: 'diamante', name: 'Marco diamante', cls: 'fr-diamante', cost: 1800, lvl: 7 },
];
const BANNERS = [
  { id: 'noche', name: 'Noche', cls: 'bn-noche', cost: 0, lvl: 1 },
  { id: 'galpon', name: 'Galpón azul', cls: 'bn-galpon', cost: 120, lvl: 1 },
  { id: 'fuego', name: 'Fuego', cls: 'bn-fuego', cost: 250, lvl: 2 },
  { id: 'cuadros', name: 'Bandera a cuadros', cls: 'bn-cuadros', cost: 350, lvl: 3 },
  { id: 'neon', name: 'Ciudad neón', cls: 'bn-neon', cost: 600, lvl: 4 },
  { id: 'oro', name: 'Oro brillante', cls: 'bn-oro', cost: 1500, lvl: 6 },
];
const TITLES = [
  { id: 'novato', name: 'Novato del galpón', cost: 0, lvl: 1 },
  { id: 'piloto', name: 'Piloto de fin de semana', cost: 80, lvl: 1 },
  { id: 'derrape', name: 'Rey del derrape', cost: 300, lvl: 2 },
  { id: 'curvas', name: 'Maestro de las curvas', cost: 450, lvl: 3 },
  { id: 'tunel', name: 'Fantasma del túnel', cost: 600, lvl: 4 },
  { id: 'segundo', name: 'Dueño del segundo piso', cost: 800, lvl: 5 },
  { id: 'leyenda', name: 'Leyenda dorada', cost: 2000, lvl: 7, gold: true },
];

const COSMETICS = { body: BODIES, helmet: HELMETS, rims: RIMS, glow: GLOWS, frame: FRAMES, banner: BANNERS, title: TITLES };

// Física del kart (metros, segundos). Los karts reales no tienen cambios: transmisión directa.
const KART = {
  vmax: 25,         // m/s (~90 km/h)
  accel: 9.5,       // aceleración en arranque
  brake: 18,        // frenada
  engineBrake: 2.6, // freno motor al soltar el acelerador
  coastDecel: 3.4,  // desaceleración típica soltando el acelerador (para diseñar curvas)
  reverse: 4.5,     // velocidad máxima en reversa
  roll: 0.5,        // resistencia a la rodadura
  grip: 22,         // aceleración lateral máxima con agarre (m/s²)
  slideGrip: 8,     // agarre con el freno de mano
  wheelbase: 1.06,
  steerLow: 0.6,    // ángulo de dirección máximo a baja velocidad (rad)
  radius: 0.85,     // radio para choques entre karts
};

const XP_BASE = 100, XP_STEP = 60;
function levelInfo(xp) {
  let lvl = 1, need = XP_BASE;
  while (xp >= need) { xp -= need; lvl++; need = XP_BASE + (lvl - 1) * XP_STEP; }
  return { lvl, cur: xp, need };
}

function defaultSave() {
  return {
    v: 2, coins: 0, xp: 0, name: 'Piloto',
    owned: { body: ['rojo'], helmet: ['franja-roja', 'liso-blanco'], rims: ['gris'], glow: ['ninguna'], frame: ['basico'], banner: ['noche'], title: ['novato'] },
    eq: { body: 'rojo', helmet: 'franja-roja', rims: 'gris', glow: 'ninguna', frame: 'basico', banner: 'noche', title: 'novato', num: 7 },
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
    // piezas que ya no existen vuelven a las de fábrica
    for (const kind of Object.keys(COSMETICS)) {
      s.owned[kind] = (s.owned[kind] || []).filter(id => COSMETICS[kind].some(c => c.id === id));
      for (const id of base.owned[kind]) if (!s.owned[kind].includes(id)) s.owned[kind].push(id);
      if (!s.owned[kind].includes(s.eq[kind])) s.eq[kind] = base.eq[kind];
    }
    if ((s.v || 1) < 2) s.pb = {}; // las pistas cambiaron
    s.v = 2;
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
