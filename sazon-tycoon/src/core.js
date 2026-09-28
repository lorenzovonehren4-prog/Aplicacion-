'use strict';
/* ================== UTILIDADES ================== */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const chance = p => Math.random() < p;
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const soles = n => (n < 0 ? '-' : '') + 'S/ ' + Math.abs(n).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ================== CALIDAD GRÁFICA ==================
   Se lee antes de crear el renderizador (el antialias no se puede cambiar después).
   Cambiar la calidad guarda y recarga la página. */
const IS_TOUCH = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
const QUALITIES = {
  // dpr: resolución máx. · pbr: materiales físicos · round: personas con cápsulas · simple: 5 mallas por persona en vez de 10
  // walkers: gente máx. en la vereda · tilt: desenfoque de maqueta · aa: antialias
  baja: { name: 'Baja', dpr: 1, shadows: false, shadowSize: 0, pbr: false, round: true, simple: true, walkers: 14, tilt: false, aa: false },
  media: { name: 'Media', dpr: 1.25, shadows: true, shadowSize: 1024, pbr: true, round: true, simple: false, walkers: 22, tilt: false, aa: true },
  alta: { name: 'Alta', dpr: 2, shadows: true, shadowSize: 2048, pbr: true, round: true, simple: false, walkers: 28, tilt: true, aa: true },
};
const QUALITY = (() => { try { const q = JSON.parse(localStorage.getItem('sazon_tycoon_v1')).quality; if (QUALITIES[q]) return q; } catch (e) { } // en celular: media si el equipo es potente, si no baja
  return IS_TOUCH ? ((navigator.hardwareConcurrency || 4) >= 6 && (navigator.deviceMemory || 4) >= 4 ? 'media' : 'baja') : 'alta'; })();
const QCFG = QUALITIES[QUALITY];

/* ================== DATOS DEL JUEGO ================== */
const FLOOR_H = 170;
const DISHES = [
  { id: 'ceviche', name: 'Ceviche', price: 18, cost: 6, cook: 6, unlock: 0, col: '#F4EAD2', top: '#FF7A1A', pop: 5 },
  { id: 'chicha', name: 'Chicha morada', price: 5, cost: 1, cook: 2, unlock: 0, drink: true, col: '#5B1E6B', pop: 4 },
  { id: 'causa', name: 'Causa limeña', price: 12, cost: 4, cook: 4, unlock: 120, col: '#F2C230', top: '#19A35A', pop: 3 },
  { id: 'chaufa', name: 'Arroz chaufa', price: 14, cost: 4, cook: 5, unlock: 220, col: '#C8903A', top: '#6FA84A', pop: 4 },
  { id: 'aji', name: 'Ají de gallina', price: 16, cost: 5, cook: 6, unlock: 380, col: '#F2C230', top: '#FFFFFF', pop: 3 },
  { id: 'lomo', name: 'Lomo saltado', price: 22, cost: 8, cook: 7, unlock: 600, col: '#8B3A1F', top: '#FFE14D', pop: 5 },
  { id: 'papa', name: 'Papa a la huancaína', price: 10, cost: 3, cook: 3, unlock: 900, col: '#FFD23F', top: '#FFFFFF', pop: 2 },
  { id: 'anticuchos', name: 'Anticuchos', price: 14, cost: 5, cook: 5, unlock: 1300, col: '#7A2E1A', top: '#F2C230', pop: 3 },
  { id: 'picarones', name: 'Picarones', price: 9, cost: 2, cook: 4, unlock: 1800, col: '#C8703A', top: '#5B2E0F', pop: 3 },
  { id: 'pollo', name: 'Pollo a la brasa', price: 26, cost: 9, cook: 8, unlock: 2800, col: '#B5652A', top: '#F2C230', pop: 5 },
  { id: 'jalea', name: 'Jalea mixta', price: 28, cost: 10, cook: 8, unlock: 4500, col: '#E0A040', top: '#FF7A1A', pop: 3 },
  { id: 'tallarines', name: 'Tallarines verdes', price: 16, cost: 5, cook: 6, unlock: 6500, col: '#4F8A3A', top: '#8B3A1F', pop: 3 },
];
const DISH = Object.fromEntries(DISHES.map(d => [d.id, d]));
const ROLES = {
  cocinero: { name: 'Cocinero', desc: 'Cocina los pedidos en su estación.', hire: 150, wage: 45, shirt: '#FFFFFF', pants: '#2A2A2E', hat: 'chef' },
  mozo: { name: 'Mozo', desc: 'Toma los pedidos en la mesa y lleva los platos.', hire: 100, wage: 35, shirt: '#F4F4F4', pants: '#1B1523', hat: null, vest: '#1B1523' },
  limpiador: { name: 'Limpiador', desc: 'Limpia mesas sucias y el piso.', hire: 80, wage: 25, shirt: '#2E6BFF', pants: '#23324A', hat: 'gorra', hatColor: '#2E6BFF' },
  cajero: { name: 'Cajero', desc: 'Cobra la caja solo y la pasa a tu cuenta.', hire: 120, wage: 35, shirt: '#E23B3B', pants: '#2A2A2E', hat: null },
  ventana: { name: 'Ventanilla', desc: 'Atiende a los autos del drive-thru.', hire: 150, wage: 40, shirt: '#FF7A1A', pants: '#2A2A2E', hat: 'gorra', hatColor: '#FF7A1A' },
  repartidor: { name: 'Motorizado', desc: 'Lleva los pedidos de delivery en moto.', hire: 180, wage: 45, shirt: '#19A35A', pants: '#23324A', hat: 'casco', hatColor: '#19A35A' },
};
const ROLE_KEYS = Object.keys(ROLES);
function roleMax(k) {
  const s = save;
  if (k === 'cocinero') return s.stations;
  if (k === 'mozo') return 2 + s.floors * 2;
  if (k === 'limpiador') return s.floors + 1;
  if (k === 'cajero') return 1;
  if (k === 'ventana') return s.drive ? 1 : 0;
  if (k === 'repartidor') return s.motos;
  return 0;
}
const TRAIN_COST = lvl => Math.round(180 * Math.pow(lvl + 1, 1.7));
const STATION_COST = [0, 300, 700, 1200, 2000, 3200];
const FLOOR_COST = [0, 3000, 9000];
const DRIVE_COST = 2000, DELIVERY_COST = 1500, MOTO_COST = 900;
function tableCost(n) { return n < 2 ? 0 : Math.round(60 * Math.pow(1.24, n - 2) / 5) * 5; }
// Mesas para 4: se compran agrandando una mesa de 2 cuando ya tienes 6 mesas
const BIG_UNLOCK = 6;
function bigCost(n) { return Math.round(250 * Math.pow(1.3, n) / 5) * 5; }
// Decoración: cada objeto suma puntos al piso donde está
const DECOR = [
  { id: 'planta', name: 'Plantas', desc: 'Macetas verdes en las esquinas.', cost: 40, pts: 1, max: 4, icon: 'planta' },
  { id: 'cuadro', name: 'Cuadros', desc: 'Arte peruano en las paredes.', cost: 70, pts: 2, max: 4, icon: 'cuadro' },
  { id: 'lampara', name: 'Lámparas colgantes', desc: 'Luz cálida sobre las mesas.', cost: 120, pts: 2, max: 4, icon: 'lampara' },
  { id: 'piso', name: 'Piso de madera', desc: 'Cambia todo el piso del salón.', cost: 500, pts: 6, max: 1, icon: 'piso' },
  { id: 'pintura', name: 'Pintura nueva', desc: 'Paredes pintadas con color.', cost: 150, pts: 3, max: 1, icon: 'pintura' },
  { id: 'parlante', name: 'Música criolla', desc: 'Un parlante con valses y cumbia.', cost: 300, pts: 3, max: 1, icon: 'parlante' },
  { id: 'acuario', name: 'Acuario', desc: 'Peces de colores. A todos les encanta.', cost: 1200, pts: 8, max: 1, icon: 'acuario' },
  { id: 'letrero', name: 'Letrero luminoso', desc: 'Tu nombre en neón en la fachada.', cost: 600, pts: 5, max: 1, icon: 'letrero', floor0: true },
];
const WALL_COLORS = ['#F2C230', '#E8A0B8', '#6FB3E0', '#19A35A', '#FF7A1A', '#EDE6D6', '#C0392B', '#7B3FF2'];
const PRICE_LVL = { barato: { mul: 0.85, carta: 0.7, flow: 1.25, name: 'Barato' }, normal: { mul: 1, carta: 0, flow: 1, name: 'Normal' }, caro: { mul: 1.25, carta: -0.8, flow: 0.78, name: 'Caro' } };
const DAY_LEN = 180;
/* ---------- distritos (Etapa 2: cadena de locales) ----------
   priceMul: cuánto pagan · flow: cuánta gente entra · decoNeed: cuánta decoración exigen
   decoW: peso de la decoración en la reseña · priceSens: cuánto les importa el nivel de precios
   dinner: fuerza del pico de la cena · music: bonus de paciencia del parlante */
const DISTRICTS = {
  centro: { name: 'Cercado de Lima', short: 'Centro', street: 'Jr. de la Unión', desc: 'Donde empezó todo.', priceMul: 1, flow: 1, decoNeed: 1, decoW: 0.2, priceSens: 1, dinner: 1, music: 0.3, seed: 42, facades: ['#F2C230', '#2E6BFF', '#19A35A', '#E23B3B', '#FF7A1A', '#EDE6D6', '#7B3FF2', '#3C8D93', '#E8A0B8'] },
  miraflores: { name: 'Miraflores', short: 'Miraflores', street: 'Av. Larco', desc: 'Turistas y oficinistas: pagan más, pero exigen un local bonito.', priceMul: 1.35, flow: 0.9, decoNeed: 1.7, decoW: 0.34, priceSens: 0.6, dinner: 1.1, music: 0.3, seed: 7, palms: true, facades: ['#EDE6D6', '#F4F4F2', '#C9C3B6', '#6FB3E0', '#3C8D93', '#DDE3E8'] },
  barranco: { name: 'Barranco', short: 'Barranco', street: 'Av. Grau', desc: 'Bohemio y nocturno: se llena en la cena y adora la música criolla.', priceMul: 1.15, flow: 1.05, decoNeed: 1.2, decoW: 0.25, priceSens: 0.9, dinner: 1.9, music: 0.8, seed: 19, facades: ['#E8A0B8', '#F2C230', '#6FB3E0', '#FF7A1A', '#19A35A', '#C0392B', '#F4EAD2'] },
  gamarra: { name: 'Gamarra', short: 'Gamarra', street: 'Jr. Gamarra', desc: 'Mucha gente apurada: vienen en masa y buscan precio.', priceMul: 0.85, flow: 1.65, decoNeed: 0.6, decoW: 0.1, priceSens: 2.2, dinner: 0.7, music: 0.2, seed: 88, busy: true, facades: ['#A49E94', '#8C857A', '#2E6BFF', '#E23B3B', '#FFE14D', '#6A6474', '#B5553A'] },
};
const DIST = () => DISTRICTS[save.district] || DISTRICTS.centro;
// Para abrir locales nuevos: 4.5 estrellas y S/ 20 000 en la mano; el precio sube con cada local
const CHAIN_RATING = 4.5, CHAIN_MONEY = 20000;
const OPEN_COST = [0, 15000, 25000, 40000];
/* ---------- eventos (Etapa 3): uno cada 2 o 3 días, duran el día entero ---------- */
const EVENTS = {
  partido: { name: '¡Juega la selección!', short: 'Partido', desc: 'Hoy juega Perú y todo el mundo quiere pollo a la brasa. Si no está en tu carta, agrégalo ya.', color: '#E23B3B' },
  critico: { name: 'Crítico de incógnito', short: 'Crítico', desc: 'Dicen que hoy viene un crítico gastronómico disfrazado de cliente. Su reseña vale por 10. Que todo esté impecable.', color: '#7B3FF2' },
  apagon: { name: 'Apagón en la tarde', short: 'Apagón', desc: 'La compañía de luz anunció un corte. Sin luz la cocina se detiene… a menos que tengas un generador.', color: '#3A3A44' },
  feriado: { name: 'Feriado largo', short: 'Feriado', desc: 'Todo Lima salió a comer: hoy llega el doble de clientes. Prepara mesas y personal.', color: '#19A35A' },
};
const EVENT_FIRST_DAY = 4, GENERATOR_COST = 800;
/* ---------- fama: niveles, títulos y combo (de toda la cadena) ---------- */
const TITLES = [[1, 'Huarique de barrio'], [3, 'Picantería'], [5, 'Restaurante del distrito'], [8, 'Cevichería famosa'], [12, 'Joya de Lima'], [16, 'Leyenda criolla'], [20, 'Patrimonio culinario']];
const xpNeed = lvl => Math.round(80 * Math.pow(1.3, lvl - 1) / 10) * 10;
function famaTitle(l) { let t = TITLES[0][1]; for (const [n, s] of TITLES) if (l >= n) t = s; return t; }
const levelReward = lvl => 60 * lvl;
const levelTipBonus = () => Math.min(0.2, (save.level - 1) * 0.01); // +1 % de propina por nivel (máx. 20 %)
const XP = { plate: 4, party: 6, fiveStar: 10, goal: 40, buy: 12 };
// combo: mesas atendidas rápido una tras otra; cada nivel suma 5 % de propina y más XP
const COMBO_WINDOW = 28, COMBO_MAX = 8, COMBO_FAST = 22;
// nota del día: S, A, B, C o D
const GRADES = [['S', 88, '#FFB800'], ['A', 75, '#19D46E'], ['B', 60, '#2E6BFF'], ['C', 45, '#FF7A1A'], ['D', 0, '#C0392B']];
const GRADE_XP = { S: 60, A: 40, B: 25, C: 10, D: 0 };
const GOALS = [
  { id: 'g0', t: 'Toma el pedido de una mesa', r: 10, ok: () => save.stats.ordersTaken >= 1 },
  { id: 'g1', t: 'Lleva tu primer plato a una mesa', r: 20, ok: () => save.stats.served >= 1 },
  { id: 'g2', t: 'Limpia una mesa sucia', r: 10, ok: () => save.stats.cleaned >= 1 },
  { id: 'g3', t: 'Cobra la plata de la caja', r: 10, ok: () => save.stats.collected >= 1 },
  { id: 'g4', t: 'Compra una mesa nueva', r: 20, ok: () => totalTables() >= 3 },
  { id: 'g5', t: 'Contrata un mozo', r: 30, ok: () => (save.staff.mozo || 0) >= 1 },
  { id: 'g6', t: 'Agrega un plato nuevo a la carta', r: 30, ok: () => save.menu.length >= 3 },
  { id: 'g7', t: 'Contrata un limpiador', r: 40, ok: () => (save.staff.limpiador || 0) >= 1 },
  { id: 'g8', t: 'Llega a 4 estrellas de calificación', r: 60, ok: () => save.rating >= 4 },
  { id: 'g9', t: 'Ten 8 mesas', r: 80, ok: () => totalTables() >= 8 },
  { id: 'g9b', t: 'Compra una mesa para 4', r: 100, ok: () => totalBig() >= 1 },
  { id: 'g10', t: 'Compra la segunda estación de cocina', r: 80, ok: () => save.stations >= 2 },
  { id: 'g11', t: 'Abre el drive-thru', r: 150, ok: () => save.drive },
  { id: 'g12', t: 'Construye el segundo piso', r: 300, ok: () => save.floors >= 2 },
  { id: 'g13', t: 'Abre el delivery', r: 200, ok: () => save.motos >= 1 },
  { id: 'g14', t: 'Sirve 500 platos', r: 500, ok: () => save.stats.served >= 500 },
  { id: 'g15', t: 'Construye la terraza del tercer piso', r: 800, ok: () => save.floors >= 3 },
  { id: 'g16', t: 'Llega a 5 estrellas', r: 1000, ok: () => save.rating >= 4.9 },
  { id: 'g17', t: 'Abre tu segundo local', r: 2000, ok: () => save.chain.length >= 2 },
  { id: 'g18', t: 'Ten locales en 4 distritos', r: 10000, ok: () => save.chain.length >= 4 },
];

/* ================== GUARDADO ================== */
const SAVE_KEY = 'sazon_tycoon_v1';
function freshSave() {
  return {
    name: 'El Rincón Criollo', money: 200, register: 0, rating: 3, reviews: [], day: 1, dayT: 0,
    floors: 1, tables: [2, 0, 0], big: [0, 0, 0], stations: 1, drive: false, motos: 0,
    staff: { cocinero: 1 }, train: {}, menu: ['ceviche', 'chicha'], recipe: {}, price: 'normal',
    decor: [{}, {}, {}], wall: ['#EDE6D6', '#EDE6D6', '#EDE6D6'],
    goals: [], stats: { served: 0, cleaned: 0, collected: 0, customers: 0, lost: 0, ordersTaken: 0 },
    dayLog: { income: 0, costs: 0, served: 0, lost: 0, tips: 0 }, profitEma: 0,
    district: 'centro', generator: false, chain: [], active: 0, chainDay: 0, chainTold: false, event: null, nextEvent: EVENT_FIRST_DAY, quality: QUALITY, tutorial: 0, xp: 0, level: 1, bestDay: 0, lastT: Date.now(), music: true, sfx: true, started: false, speed: 1,
  };
}
let save = freshSave();
function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && typeof s === 'object') save = Object.assign(freshSave(), s, { stats: Object.assign(freshSave().stats, s.stats || {}), dayLog: Object.assign(freshSave().dayLog, s.dayLog || {}) }); } catch (e) { }
  // partidas de antes del tutorial: no se les muestra
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.tutorial === undefined && s.started) save.tutorial = -1; } catch (e) { }
  if (!Array.isArray(save.chain) || !save.chain.length) { save.chain = [snapshotLocal()]; save.active = 0; }
  save.active = clamp(save.active | 0, 0, save.chain.length - 1);
}
function persist() { try { save.lastT = Date.now(); save.chain[save.active] = snapshotLocal(); localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } }

/* ---------- cadena de locales ----------
   El local activo vive en los campos de arriba de `save`; save.chain guarda una copia de cada local
   (la del activo se actualiza al guardar y al cambiar de local). La plata, el día y las metas son de toda la cadena. */
const LOCAL_KEYS = ['name', 'district', 'register', 'rating', 'reviews', 'floors', 'tables', 'big', 'stations', 'drive', 'motos', 'staff', 'train', 'menu', 'recipe', 'price', 'decor', 'wall', 'profitEma', 'dayLog', 'generator'];
const clone = v => JSON.parse(JSON.stringify(v));
function snapshotLocal() { return snapshotLocalFrom(save); }
function applyLocal(o) { const f = freshSave(); for (const k of LOCAL_KEYS) save[k] = o[k] !== undefined ? clone(o[k]) : f[k]; }
function chainList() { return save.chain.map((c, i) => i === save.active ? snapshotLocal() : c); }
function newLocal(district) {
  const f = freshSave(), base = save.chain[0] ? save.chain[0].name : save.name;
  return Object.assign(snapshotLocalFrom(f), { name: (base + ' ' + DISTRICTS[district].short).slice(0, 26), district, rating: 3.5, tables: [4, 0, 0], staff: { cocinero: 1, mozo: 1 }, menu: clone(save.menu), recipe: clone(save.recipe) });
}
function snapshotLocalFrom(src) { const o = {}; for (const k of LOCAL_KEYS) o[k] = clone(src[k]); return o; }
// Ganancia diaria estimada de un local que no estás mirando (lo atiende su personal)
function localeDaily(loc) {
  const D = DISTRICTS[loc.district] || DISTRICTS.centro, st = loc.staff || {};
  const nT = loc.tables[0] + loc.tables[1] + loc.tables[2], nB = (loc.big || [0, 0, 0]).reduce((a, b) => a + b, 0);
  const seats = nT * 2 + nB * 2, cooks = st.cocinero || 0;
  let price = 0, cost = 0; for (const id of loc.menu) { price += DISH[id].price * (1 + ((loc.recipe || {})[id] || 0) * 0.12); cost += DISH[id].cost; }
  price = price / loc.menu.length * PRICE_LVL[loc.price].mul * D.priceMul; cost /= loc.menu.length;
  const service = Math.min(1, ((st.mozo || 0) + 0.5) / Math.max(1, seats / 8));
  const customers = Math.min(seats * 3.5, cooks * 40) * (0.4 + loc.rating / 5 * 0.6) * service * Math.min(1.4, D.flow);
  let wages = 0; for (const k of ROLE_KEYS) wages += (st[k] || 0) * ROLES[k].wage;
  const est = customers * (price * 1.1 - cost) - wages;
  return Math.max(0, loc.profitEma > 0 ? (loc.profitEma + est) / 2 : est);
}
const BG_SHARE = 0.7; // lo que rinde un local sin ti
function chainBgDaily() { let t = 0; save.chain.forEach((c, i) => { if (i !== save.active) t += localeDaily(c) * BG_SHARE; }); return t; }
function totalTables() { return save.tables[0] + save.tables[1] + save.tables[2]; }
function totalBig() { return save.big[0] + save.big[1] + save.big[2]; }
// La mesa i del piso f es para 4 si ya se agrandó (se agrandan en orden)
const tableCap = (f, i) => i < (save.big[f] || 0) ? 4 : 2;
function decoPts(f) { let p = 0; const d = save.decor[f] || {}; for (const it of DECOR) p += (d[it.id] || 0) * it.pts; return p; }
function recipeLvl(id) { return save.recipe[id] || 0; }
function dishPrice(id) { return Math.round(DISH[id].price * (1 + recipeLvl(id) * 0.12) * PRICE_LVL[save.price].mul * DIST().priceMul); }
function checkGoals() { const out = []; for (const g of GOALS) if (!save.goals.includes(g.id) && g.ok()) { save.goals.push(g.id); save.money += g.r; out.push(g); } return out; }

/* ================== AUDIO ================== */
const AU = { ctx: null };
function audioInit() {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try {
    const c = AU.ctx = new AC();
    AU.master = c.createGain(); AU.master.gain.value = 0.9; AU.master.connect(c.destination);
    AU.sfx = c.createGain(); AU.sfx.gain.value = save.sfx ? 0.8 : 0; AU.sfx.connect(AU.master);
    AU.mus = c.createGain(); AU.mus.gain.value = save.music ? 0.22 : 0; AU.mus.connect(AU.master);
    const len = c.sampleRate, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; AU.noise = b;
    AU.next = c.currentTime + 0.1; AU.step = 0; setInterval(musicTick, 40);
  } catch (e) { AU.ctx = null; }
}
function tone(t, f, dur, type, gain, dest, slide) { const c = AU.ctx; if (!c) return; const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.03); }
function noiseHit(t, dur, gain, ff, dest) { const c = AU.ctx; if (!c) return; const s = c.createBufferSource(); s.buffer = AU.noise; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = ff; const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02); }
const now = () => AU.ctx ? AU.ctx.currentTime : 0;
const SFX = {
  coin() { if (!AU.ctx) return; const t = now(); tone(t, 988, 0.07, 'square', 0.06, AU.sfx); tone(t + 0.07, 1319, 0.12, 'square', 0.06, AU.sfx); },
  cash() { if (!AU.ctx) return; const t = now(); [784, 988, 1175, 1568].forEach((f, i) => tone(t + i * 0.05, f, 0.12, 'square', 0.05, AU.sfx)); noiseHit(t, 0.2, 0.2, 3000, AU.sfx); },
  build() { if (!AU.ctx) return; const t = now(); noiseHit(t, 0.25, 0.35, 400, AU.sfx); tone(t, 180, 0.25, 'triangle', 0.15, AU.sfx, 90); [523, 659, 784].forEach((f, i) => tone(t + 0.15 + i * 0.07, f, 0.14, 'square', 0.05, AU.sfx)); },
  pick() { if (!AU.ctx) return; tone(now(), 660, 0.06, 'triangle', 0.08, AU.sfx, 990); },
  serve() { if (!AU.ctx) return; const t = now(); tone(t, 880, 0.06, 'triangle', 0.08, AU.sfx); tone(t + 0.06, 1100, 0.1, 'triangle', 0.07, AU.sfx); },
  bell() { if (!AU.ctx) return; const t = now(); tone(t, 1760, 0.4, 'sine', 0.07, AU.sfx); tone(t, 2640, 0.3, 'sine', 0.03, AU.sfx); },
  clean() { if (!AU.ctx) return; noiseHit(now(), 0.3, 0.12, 5000, AU.sfx); },
  no() { if (!AU.ctx) return; const t = now(); tone(t, 300, 0.12, 'square', 0.06, AU.sfx); tone(t + 0.12, 220, 0.18, 'square', 0.06, AU.sfx); },
  click() { if (!AU.ctx) return; tone(now(), 520, 0.04, 'square', 0.04, AU.sfx); },
  angry() { if (!AU.ctx) return; tone(now(), 220, 0.3, 'sawtooth', 0.05, AU.sfx, 140); },
  levelUp() { if (!AU.ctx) return; const t = now(); [523, 659, 784, 1047, 1319].forEach((f, i) => { tone(t + i * 0.09, f, 0.22, 'square', 0.05, AU.sfx); tone(t + i * 0.09, f / 2, 0.22, 'triangle', 0.05, AU.sfx); }); noiseHit(t + 0.45, 0.4, 0.12, 6000, AU.sfx); },
  combo(n) { if (!AU.ctx) return; const t = now(), f = 660 * Math.pow(2, Math.min(n, 8) / 12); tone(t, f, 0.08, 'square', 0.05, AU.sfx); tone(t + 0.07, f * 1.5, 0.14, 'square', 0.05, AU.sfx); },
  stamp() { if (!AU.ctx) return; const t = now(); noiseHit(t, 0.18, 0.4, 900, AU.sfx); tone(t, 140, 0.2, 'triangle', 0.2, AU.sfx, 70); },
  tick() { if (!AU.ctx) return; tone(now(), 1400, 0.025, 'square', 0.025, AU.sfx); },
  horn() { if (!AU.ctx) return; const t = now(); tone(t, 392, 0.2, 'square', 0.05, AU.sfx); tone(t, 494, 0.2, 'square', 0.04, AU.sfx); },
};
// vals criollo suave de fondo
const hz = s => 440 * Math.pow(2, s / 12);
const SONG = [[-12, [7, null, 4, 5, 7, null]], [-17, [5, null, 2, 4, 5, null]], [-19, [3, null, 7, 5, 3, 2]], [-12, [0, null, 4, 7, 12, null]]];
function musicTick() {
  const c = AU.ctx; if (!c) return;
  const e = 60 / 150;
  if (AU.next < c.currentTime - 0.2) AU.next = c.currentTime + 0.05;
  while (AU.next < c.currentTime + 0.2) {
    const t = AU.next, s = AU.step, bar = SONG[Math.floor(s / 6) % 4], i = s % 6;
    if (save.music) {
      if (i === 0) tone(t, hz(bar[0] - 12), e * 1.8, 'triangle', 0.18, AU.mus);
      if (i === 2 || i === 4) { tone(t, hz(bar[0] + 7), e * 0.8, 'triangle', 0.06, AU.mus); tone(t, hz(bar[0] + 12), e * 0.8, 'triangle', 0.05, AU.mus); }
      const n = bar[1][i]; if (n !== null) tone(t, hz(n + 12), e * 0.9, 'sine', 0.05, AU.mus);
    }
    AU.next += e; AU.step++;
  }
}
function setGains() { if (!AU.ctx) return; AU.sfx.gain.value = save.sfx ? 0.8 : 0; AU.mus.gain.value = save.music ? 0.22 : 0; }
