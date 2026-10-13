'use strict';
// Último Disparo: datos del juego (misiones, armas, mejoras) y guardado.

const MAPS = {
  dia: { name: 'Ciudad de día', short: 'Ciudad', icon: '☀️', color: '#ffb547' },
  puerto: { name: 'Puerto y almacenes', short: 'Puerto', icon: '⚓', color: '#3fb6ff' },
  noche: { name: 'Ciudad de noche', short: 'Noche', icon: '🌙', color: '#8b7bff' },
  desierto: { name: 'Desierto', short: 'Desierto', icon: '🌵', color: '#ff7a3d' },
};

// mode: quieto (de pie con el rehén), vaiven (se asoma de un lado a otro detrás del rehén),
// camina (cruza arrastrando al rehén), cubre (camina entre cosas que lo tapan a ratos).
// dist: metros hasta el objetivo. time: segundos. civ: civiles que pasan. speed: paso (m/s).
const LEVELS = [
  // ---- Ciudad de día ----
  { map: 'dia', name: 'Primer encargo', mode: 'quieto', dist: 55, time: 45, civ: 0, speed: 0, brief: 'Un ladrón tiene a una señora en la vereda. Está quieto: respira, apunta a la cabeza y dispara.' },
  { map: 'dia', name: 'La esquina del banco', mode: 'quieto', dist: 70, time: 40, civ: 1, speed: 0, brief: 'Asaltaron el banco. Cuidado con la gente que pasa por la vereda.' },
  { map: 'dia', name: 'El paradero', mode: 'vaiven', dist: 75, time: 40, civ: 1, speed: 0.6, brief: 'Se esconde detrás del rehén y se asoma a los lados. Espera a que asome la cabeza.' },
  { map: 'dia', name: 'El quiosco', mode: 'vaiven', dist: 85, time: 36, civ: 2, speed: 0.8, brief: 'Más gente en la calle. No le des a ningún inocente.' },
  { map: 'dia', name: 'La avenida', mode: 'camina', dist: 80, time: 40, civ: 2, speed: 0.9, brief: 'Se lleva al rehén caminando por la avenida. Síguelo con la mira.' },
  { map: 'dia', name: 'Hora punta', mode: 'camina', dist: 95, time: 36, civ: 4, speed: 1.1, brief: 'Hora punta: muchos civiles cruzan delante. Elige bien el momento.' },
  { map: 'dia', name: 'Detrás del bus', mode: 'cubre', dist: 100, time: 38, civ: 3, speed: 1.0, brief: 'Camina entre carros estacionados que lo tapan. Dispara cuando quede a la vista.' },
  { map: 'dia', name: 'Plaza Mayor', mode: 'cubre', dist: 115, time: 34, civ: 5, speed: 1.25, brief: 'El jefe de la banda cruza la plaza llena de gente. Último trabajo en la ciudad.' },
  // ---- Puerto ----
  { map: 'puerto', name: 'Muelle 3', mode: 'quieto', dist: 110, time: 40, civ: 1, speed: 0, brief: 'En el puerto los tiros son más largos. Sube el zoom.' },
  { map: 'puerto', name: 'Contenedores', mode: 'vaiven', dist: 120, time: 38, civ: 2, speed: 0.9, brief: 'Se asoma entre contenedores. Paciencia.' },
  { map: 'puerto', name: 'La grúa', mode: 'camina', dist: 115, time: 36, civ: 2, speed: 1.1, brief: 'Se mueve bajo la grúa con un estibador de rehén.' },
  { map: 'puerto', name: 'Cambio de turno', mode: 'camina', dist: 130, time: 34, civ: 4, speed: 1.2, brief: 'Los trabajadores cambian de turno y pasan por todos lados.' },
  { map: 'puerto', name: 'Pasillo de acero', mode: 'cubre', dist: 125, time: 36, civ: 3, speed: 1.15, brief: 'Camina entre pilas de contenedores. Sólo lo verás en los huecos.' },
  { map: 'puerto', name: 'El montacargas', mode: 'vaiven', dist: 140, time: 30, civ: 3, speed: 1.3, brief: 'Nervioso y rápido. Se asoma poco tiempo.' },
  { map: 'puerto', name: 'Carga ilegal', mode: 'cubre', dist: 145, time: 34, civ: 4, speed: 1.3, brief: 'Quiere llegar al barco con el rehén. No lo dejes.' },
  { map: 'puerto', name: 'El capitán', mode: 'cubre', dist: 155, time: 32, civ: 5, speed: 1.4, brief: 'El capitán de la banda cruza el muelle entre contenedores y gente.' },
  // ---- Ciudad de noche ----
  { map: 'noche', name: 'Luces de neón', mode: 'quieto', dist: 95, time: 38, civ: 1, speed: 0, brief: 'De noche se ve poco. Los faroles te ayudan; la mira térmica, más.' },
  { map: 'noche', name: 'Callejón', mode: 'vaiven', dist: 105, time: 36, civ: 2, speed: 1.0, brief: 'Se esconde en la sombra detrás del rehén.' },
  { map: 'noche', name: 'Farol roto', mode: 'camina', dist: 110, time: 34, civ: 3, speed: 1.2, brief: 'Camina por la parte oscura de la calle.' },
  { map: 'noche', name: 'Salida del cine', mode: 'camina', dist: 120, time: 32, civ: 5, speed: 1.3, brief: 'Termina la función y sale mucha gente. Cero errores.' },
  { map: 'noche', name: 'Taxis', mode: 'cubre', dist: 125, time: 34, civ: 4, speed: 1.3, brief: 'Se cubre entre los taxis estacionados.' },
  { map: 'noche', name: 'Apagón', mode: 'vaiven', dist: 140, time: 28, civ: 4, speed: 1.5, brief: 'Se fue la luz en media calle. Muy rápido y muy oscuro.' },
  { map: 'noche', name: 'Medianoche', mode: 'cubre', dist: 150, time: 30, civ: 6, speed: 1.5, brief: 'El más buscado de la ciudad. Es ahora o nunca.' },
  // ---- Desierto ----
  { map: 'desierto', name: 'La gasolinera', mode: 'quieto', dist: 160, time: 40, civ: 1, speed: 0, brief: 'Tiros muy largos en el desierto. Cada mejora cuenta.' },
  { map: 'desierto', name: 'Surtidores', mode: 'vaiven', dist: 175, time: 36, civ: 2, speed: 1.1, brief: 'Se esconde entre los surtidores con el empleado.' },
  { map: 'desierto', name: 'Camión cisterna', mode: 'cubre', dist: 185, time: 36, civ: 2, speed: 1.2, brief: 'Camina detrás de los camiones estacionados.' },
  { map: 'desierto', name: 'Ruta 66', mode: 'camina', dist: 195, time: 32, civ: 3, speed: 1.4, brief: 'Cruza la carretera arrastrando a la rehén.' },
  { map: 'desierto', name: 'Espejismo', mode: 'vaiven', dist: 210, time: 28, civ: 4, speed: 1.6, brief: 'Lejísimos y moviéndose rápido. Contén el aliento.' },
  { map: 'desierto', name: 'Tormenta de arena', mode: 'cubre', dist: 220, time: 30, civ: 4, speed: 1.6, brief: 'Se cubre entre camiones y surtidores con muchos testigos.' },
  { map: 'desierto', name: 'Último disparo', mode: 'cubre', dist: 240, time: 30, civ: 6, speed: 1.75, brief: 'El jefe de todo. Una bala, un rehén, ningún error.' },
];
LEVELS.forEach((l, i) => { l.n = i + 1; });

const MODE_TXT = { quieto: 'De pie', vaiven: 'Se asoma', camina: 'Caminando', cubre: 'Se cubre' };

// zoom: aumento máximo de la mira; sway: cuánto tiembla (1 = normal); extra: lo especial.
const WEAPONS = [
  { id: 'halcon', name: 'Halcón M1', price: 0, zoom: 6, sway: 1, color: 0x3d4a3a, extra: null, desc: 'Rifle de cerrojo confiable. Para empezar.' },
  { id: 'sombra', name: 'Sombra SD', price: 1200, zoom: 7, sway: 0.88, color: 0x22262c, extra: 'silencio', desc: 'Con silenciador: si fallas, el malo no te escucha y tienes un segundo tiro.' },
  { id: 'titan', name: 'Titán .50', price: 2600, zoom: 10, sway: 0.74, color: 0x6b5a3e, extra: 'penetra', desc: 'Calibre pesado: la bala atraviesa carros, camionetas, contenedores y surtidores.' },
  { id: 'buho', name: 'Búho T-9', price: 3800, zoom: 9, sway: 0.68, color: 0x1d3046, extra: 'termica', desc: 'Mira térmica (tecla T): las personas brillan aunque sea de noche.' },
];
const EXTRA_TXT = { silencio: 'Segundo tiro', penetra: 'Atraviesa cosas', termica: 'Mira térmica' };

const UPGRADES = [
  { id: 'zoom', name: 'Zoom', icon: '🔭', desc: '+1.5 aumentos en la mira', max: 5 },
  { id: 'stab', name: 'Estabilidad', icon: '🎯', desc: 'La mira tiembla menos', max: 5 },
  { id: 'breath', name: 'Aliento', icon: '🫁', desc: 'Contienes la respiración (cámara lenta) más tiempo', max: 5 },
  { id: 'time', name: 'Tiempo', icon: '⏱️', desc: '+3 segundos en cada misión', max: 5 },
];
const UP_COST = [150, 320, 550, 850, 1250];

const SAVE_KEY = 'ultimo_disparo_v1';
const save = (() => {
  const def = {
    coins: 0, lv: {}, owned: ['halcon'], weapon: 'halcon', up: { zoom: 0, stab: 0, breath: 0, time: 0 },
    stats: { shots: 0, hits: 0, heads: 0, missions: 0, fails: 0, innocents: 0 },
    opt: { sound: true, vol: 0.8, sens: 1, quality: 'alta' }, beat: false,
  };
  let s = null;
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { /* nada */ }
  if (!s || typeof s !== 'object') s = {};
  const out = Object.assign({}, def, s);
  out.up = Object.assign({}, def.up, s.up);
  out.stats = Object.assign({}, def.stats, s.stats);
  out.opt = Object.assign({}, def.opt, s.opt);
  if (!Array.isArray(out.owned) || !out.owned.length) out.owned = ['halcon'];
  if (!out.lv || typeof out.lv !== 'object') out.lv = {};
  return out;
})();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* nada */ } }

const unlockedUpTo = () => { let n = 1; while (n < LEVELS.length && save.lv[n] && save.lv[n].done) n++; return n; };
const totalStars = () => Object.values(save.lv).reduce((a, l) => a + (l.stars || 0), 0);
const weaponById = id => WEAPONS.find(w => w.id === id) || WEAPONS[0];

// Lo que rinde el arma elegida con las mejoras compradas.
function gunStats() {
  const w = weaponById(save.weapon), u = save.up;
  return {
    w,
    zoomMax: w.zoom + u.zoom * 1.5,
    sway: w.sway * (1 - 0.13 * u.stab),
    breath: 2.5 + 0.9 * u.breath,
    extraTime: 3 * u.time,
  };
}
// monedas al cumplir una misión
function reward(l, stars, first) {
  const base = 80 + l.n * 12;
  const k = [0, 1, 1.4, 1.8][stars];
  return Math.round(base * k * (first ? 1 : 0.4) / 5) * 5;
}
