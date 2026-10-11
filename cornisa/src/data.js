'use strict';
// Drive In The Serrín: montañas, mejoras, pinturas, insignias y guardado.

// Ambientes. Colores en hex; rock = estratos de la roca (de abajo hacia arriba).
const THEMES = {
  canon: {
    skyTop: 0x5d8fd0, skyBot: 0xdfe6ea, fog: 0xd8d4c8, fogNear: 160, fogFar: 1100,
    rock: [0xb98652, 0xcf9c62, 0xa47548, 0xdcb27a], top: 0xd9b47c, ground: 0xc8a676, shoulder: 0xb7a58a,
    sun: 0xfff1d6, sunI: 2.3, hemiSky: 0xcfe2ff, hemiGround: 0x9a7650, hemiI: 1.1, props: 'arbusto', far: 0xb48a62,
  },
  bosque: {
    skyTop: 0x4d86c9, skyBot: 0xd7e7ee, fog: 0xc6d7d6, fogNear: 120, fogFar: 900,
    rock: [0x6d6a62, 0x80796c, 0x5c5a55, 0x8a8273], top: 0x4c7a3a, ground: 0x46703a, shoulder: 0x8a7b62,
    sun: 0xfff4e0, sunI: 2.1, hemiSky: 0xd6ecff, hemiGround: 0x3e5a30, hemiI: 1.1, props: 'pino', far: 0x4f6f4a,
  },
  nieve: {
    skyTop: 0x6f9fd8, skyBot: 0xeef3f8, fog: 0xe6edf3, fogNear: 90, fogFar: 700,
    rock: [0x7c8590, 0x9aa3ad, 0x6a727c, 0xb7c0c8], top: 0xf4f8fc, ground: 0xe9eff5, shoulder: 0xdfe6ee,
    sun: 0xffffff, sunI: 2.0, hemiSky: 0xeaf3ff, hemiGround: 0xb8c4d0, hemiI: 1.3, props: 'pinoNieve', far: 0xcfd9e4, snow: true,
  },
  niebla: {
    skyTop: 0x9aa9b0, skyBot: 0xc9d0cf, fog: 0xc3cac8, fogNear: 12, fogFar: 150,
    rock: [0x5f6656, 0x6f7763, 0x535a4d, 0x7a8169], top: 0x52703e, ground: 0x4a6638, shoulder: 0x7d7660,
    sun: 0xf2f2ea, sunI: 1.2, hemiSky: 0xdfe7e6, hemiGround: 0x4c5a40, hemiI: 1.5, props: 'pino', far: 0x7f8b82,
  },
  volcan: {
    skyTop: 0x3b2a33, skyBot: 0xb0644a, fog: 0x6a3f35, fogNear: 60, fogFar: 600,
    rock: [0x2c2627, 0x3a3132, 0x241f20, 0x4a3b37], top: 0x2a2424, ground: 0xff5a14, shoulder: 0x4a403c,
    sun: 0xffb08a, sunI: 1.5, hemiSky: 0xffa070, hemiGround: 0x3a1a10, hemiI: 1.0, props: 'roca', far: 0x3a2a2a, lava: true,
  },
  noche: {
    skyTop: 0x050a1c, skyBot: 0x1a2742, fog: 0x0d1424, fogNear: 30, fogFar: 380,
    rock: [0x3b3a44, 0x46454f, 0x32313a, 0x55535c], top: 0x30402e, ground: 0x1d2a20, shoulder: 0x4a4a4e,
    sun: 0x9fb4ff, sunI: 0.35, hemiSky: 0x40508a, hemiGround: 0x101018, hemiI: 0.35, props: 'pino', far: 0x161c2c, night: true,
  },
  tormenta: {
    skyTop: 0x2c333d, skyBot: 0x6b737c, fog: 0x555d66, fogNear: 25, fogFar: 320,
    rock: [0x4e4a44, 0x5d574e, 0x433f3a, 0x6a6357], top: 0x3e5432, ground: 0x34482c, shoulder: 0x5a554c,
    sun: 0xc8d0dc, sunI: 0.9, hemiSky: 0x9aa6b4, hemiGround: 0x2e3428, hemiI: 0.9, props: 'pino', far: 0x40474f, rain: true,
  },
  cima: {
    skyTop: 0x2a3f86, skyBot: 0xffb27a, fog: 0xe7b08e, fogNear: 200, fogFar: 1400,
    rock: [0x8a6f62, 0xa1806c, 0x75605a, 0xb8937a], top: 0xf2ece6, ground: 0x7a6a72, shoulder: 0x9a8a7c,
    sun: 0xffc48a, sunI: 2.4, hemiSky: 0xffd2b0, hemiGround: 0x6a5060, hemiI: 1.0, props: 'roca', far: 0x8a6f7e, snow: true,
  },
};

// Tipo de borde por tramo: C = cañón (pared a los dos lados), L/R = abismo a la izquierda/derecha,
// B = cresta (abismo a los dos lados). mix da la probabilidad de cada tipo.
// grip: agarre del piso (nieve, lluvia). guard: probabilidad de baranda en un tramo con abismo.
// rocks: rocas caídas en la pista por km. obj: objetivos (estrellas). unlock: qué pide para abrirse.
const LEVELS = [
  { id: 1, name: 'Cañón del Sol', theme: 'canon', len: 1900, hw: 4.3, rMin: 38, rMax: 150, ang: 85, hair: 0.05, grade: [0.01, 0.04],
    mix: { C: 0.5, L: 0.25, R: 0.25 }, guard: 0.75, rocks: 0, grip: 1, seed: 101, y0: 120, depth: 140,
    desc: 'Un cañón de roca roja con curvas suaves. Casi todo el abismo tiene baranda.',
    obj: [{ t: 'finish' }, { t: 'time', v: 80 }, { t: 'coins', v: 30 }] },
  { id: 2, name: 'Bosque de Pinos', theme: 'bosque', len: 2100, hw: 4.1, rMin: 28, rMax: 130, ang: 100, hair: 0.2, grade: [0.02, 0.06],
    mix: { C: 0.3, L: 0.35, R: 0.35 }, guard: 0.6, rocks: 0, grip: 1, seed: 202, y0: 220, depth: 180,
    desc: 'Pinos, más curvas y el abismo aparece más seguido.',
    obj: [{ t: 'finish' }, { t: 'time', v: 97 }, { t: 'clean', v: 3 }],
    unlock: { stars: 1 } },
  { id: 3, name: 'Paso Nevado', theme: 'nieve', len: 2200, hw: 3.9, rMin: 24, rMax: 115, ang: 110, hair: 0.25, grade: [0.03, 0.07],
    mix: { C: 0.2, L: 0.4, R: 0.4 }, guard: 0.5, rocks: 0, grip: 0.8, seed: 303, y0: 900, depth: 260,
    desc: 'La nieve resbala: frena antes de las curvas y no gires de golpe.',
    obj: [{ t: 'finish' }, { t: 'coins', v: 35 }, { t: 'time', v: 112 }],
    unlock: { stars: 2 } },
  { id: 4, name: 'Valle de Niebla', theme: 'niebla', len: 2300, hw: 3.8, rMin: 22, rMax: 105, ang: 115, hair: 0.3, grade: [0.0, 0.06],
    mix: { C: 0.2, L: 0.4, R: 0.4 }, guard: 0.45, rocks: 0, grip: 0.95, seed: 404, y0: 400, depth: 220,
    desc: 'No se ve casi nada. Las flechas amarillas avisan las curvas.',
    obj: [{ t: 'finish' }, { t: 'clean', v: 2 }, { t: 'time', v: 107 }],
    unlock: { stars: 2, upg: { motor: 1 } } },
  { id: 5, name: 'Volcán Despierto', theme: 'volcan', len: 2400, hw: 3.7, rMin: 20, rMax: 100, ang: 120, hair: 0.3, grade: [0.02, 0.08],
    mix: { C: 0.15, L: 0.4, R: 0.4, B: 0.05 }, guard: 0.35, rocks: 7, grip: 1, seed: 505, y0: 300, depth: 240,
    desc: 'Lava abajo y rocas caídas en la pista. Esquívalas o te rompes el carro.',
    obj: [{ t: 'finish' }, { t: 'coins', v: 42 }, { t: 'clean', v: 2 }],
    unlock: { stars: 2, upg: { llantas: 1 } } },
  { id: 6, name: 'Cumbre de Noche', theme: 'noche', len: 2500, hw: 3.6, rMin: 18, rMax: 95, ang: 125, hair: 0.35, grade: [0.02, 0.08],
    mix: { C: 0.1, L: 0.42, R: 0.42, B: 0.06 }, guard: 0.3, rocks: 5, grip: 1, seed: 606, y0: 650, depth: 300,
    desc: 'De noche, sólo con tus faros. Las barandas brillan con la luz.',
    obj: [{ t: 'finish' }, { t: 'time', v: 130 }, { t: 'coins', v: 42 }],
    unlock: { stars: 2, upg: { frenos: 2 } } },
  { id: 7, name: 'Tormenta', theme: 'tormenta', len: 2600, hw: 3.5, rMin: 17, rMax: 90, ang: 130, hair: 0.38, grade: [0.01, 0.08],
    mix: { C: 0.1, L: 0.4, R: 0.4, B: 0.1 }, guard: 0.25, rocks: 7, grip: 0.82, seed: 707, y0: 500, depth: 280,
    desc: 'Lluvia, rayos y la pista mojada. El abismo casi no tiene baranda.',
    obj: [{ t: 'finish' }, { t: 'clean', v: 3 }, { t: 'time', v: 143 }],
    unlock: { stars: 2, total: 11 } },
  { id: 8, name: 'Cima del Cóndor', theme: 'cima', len: 3000, hw: 3.4, rMin: 15, rMax: 85, ang: 140, hair: 0.42, grade: [0.03, 0.09],
    mix: { C: 0.05, L: 0.3, R: 0.3, B: 0.35 }, guard: 0.15, rocks: 6, grip: 0.92, seed: 808, y0: 1500, depth: 420,
    desc: 'La montaña final: una cresta angosta con abismo a los dos lados hasta la cima.',
    obj: [{ t: 'finish' }, { t: 'time', v: 170 }, { t: 'coins', v: 55 }],
    unlock: { stars: 2, total: 14, upg: { motor: 3, chasis: 2 } } },
];

// Ruta libre (se abre al pasarte el juego): montaña al azar con todo mezclado.
function freeLevel(seed) {
  const themes = Object.keys(THEMES);
  const r = rng(seed);
  const th = themes[Math.floor(r() * themes.length)];
  return { id: 0, free: true, name: 'Ruta libre', theme: th, len: 2600, hw: 3.6, rMin: 18, rMax: 110, ang: 120, hair: 0.2, grade: [0.0, 0.08],
    mix: { C: 0.15, L: 0.35, R: 0.35, B: 0.15 }, guard: 0.3, rocks: 5, grip: th === 'nieve' || th === 'tormenta' ? 0.84 : 1,
    seed, y0: 400, depth: 300, desc: 'Una montaña nueva cada vez.', obj: [{ t: 'finish' }, { t: 'coins', v: 25 }, { t: 'clean', v: 3 }] };
}

const UPGRADES = [
  { id: 'motor', name: 'Motor', desc: 'Más aceleración y velocidad punta', cost: [90, 200, 360, 560, 820] },
  { id: 'frenos', name: 'Frenos', desc: 'Frenas en menos metros', cost: [70, 160, 290, 450, 650] },
  { id: 'llantas', name: 'Llantas', desc: 'Más agarre en las curvas', cost: [90, 200, 360, 560, 820] },
  { id: 'chasis', name: 'Carrocería', desc: 'Aguanta más choques', cost: [70, 160, 290, 450, 650] },
];
const UPG_MAX = 5;

const PAINTS = [
  { id: 'naranja', name: 'Naranja', c: 0xff6f1e, cost: 0 },
  { id: 'rojo', name: 'Rojo', c: 0xc8202a, cost: 120 },
  { id: 'azul', name: 'Azul', c: 0x2463c9, cost: 120 },
  { id: 'verde', name: 'Verde militar', c: 0x56663a, cost: 150 },
  { id: 'blanco', name: 'Blanco', c: 0xe9ecef, cost: 150 },
  { id: 'negro', name: 'Negro', c: 0x1c1d22, cost: 200 },
  { id: 'arena', name: 'Arena', c: 0xd2b27a, cost: 200 },
  { id: 'dorado', name: 'Dorado', c: 0xe5b53a, cost: -1, metal: true }, // se gana al pasarte el juego
];

// Valores del carro según las mejoras.
function carStats(u) {
  return {
    acc: 7.2 + u.motor * 0.8,           // m/s² a baja velocidad
    top: 46 + u.motor * 3,              // m/s (166 → 220 km/h)
    brake: 12 + u.frenos * 1.2,         // m/s²
    grip: 1.0 + u.llantas * 0.06,       // en g
    hp: 100 + u.chasis * 24,            // vida de la carrocería
    armor: 1 - u.chasis * 0.07,         // multiplica el daño
    crash: 7 + u.chasis * 0.8,          // golpe de costado (m/s) que destroza el carro
  };
}

const ACHS = [
  { id: 'primer', name: 'Primer ascenso', desc: 'Termina la primera montaña', icon: '⛰️' },
  { id: 'limpio', name: 'Sin un rasguño', desc: 'Termina una montaña sin chocar', icon: '✨' },
  { id: 'tres', name: 'Perfecto', desc: 'Saca 3 estrellas en una montaña', icon: '⭐' },
  { id: 'mecanico', name: 'Mecánico', desc: 'Compra tu primera mejora', icon: '🔧' },
  { id: 'tope', name: 'Al máximo', desc: 'Sube una mejora al nivel 5', icon: '🏁' },
  { id: 'veloz', name: 'Más de 180', desc: 'Llega a 180 km/h', icon: '💨' },
  { id: 'monedero', name: 'Monedero', desc: 'Junta 500 monedas en total', icon: '🪙' },
  { id: 'hielo', name: 'Pies en la nieve', desc: 'Pasa el Paso Nevado', icon: '❄️' },
  { id: 'lava', name: 'Piel de lava', desc: 'Pasa el Volcán Despierto', icon: '🌋' },
  { id: 'buho', name: 'Búho', desc: 'Pasa la Cumbre de Noche', icon: '🦉' },
  { id: 'caidas', name: 'Gravedad', desc: 'Cáete 10 veces (pasa)', icon: '🪂' },
  { id: 'condor', name: 'Cóndor', desc: 'Pásate el juego: llega a la Cima del Cóndor', icon: '🦅' },
  { id: 'leyenda', name: 'Leyenda del Serrín', desc: 'Junta las 24 estrellas', icon: '👑' },
  { id: 'libre', name: 'Explorador', desc: 'Termina una ruta libre', icon: '🧭' },
];

// ---------- guardado ----------
const SAVE_KEY = 'cornisa_v1';
function newSave() {
  return {
    v: 1, coins: 0,
    upg: { motor: 0, frenos: 0, llantas: 0, chasis: 0 },
    paint: 'naranja', paints: ['naranja'],
    lv: {},            // id → { stars: [b, b, b], best: segundos, done }
    ach: {}, beat: false,
    stats: { runs: 0, falls: 0, wins: 0, coins: 0, top: 0, km: 0, free: 0 },
    opt: { sound: true, vol: 0.8, cam: 'cabina', quality: 'alta', sens: 1, line: 'simple', copi: true },
  };
}
let save = (() => {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && s.v === 1) {
      const d = newSave();
      const o = Object.assign(d.opt, s.opt); if (typeof o.line === 'boolean') o.line = o.line ? 'simple' : 'no';
      return Object.assign(d, s, { upg: Object.assign(d.upg, s.upg), stats: Object.assign(d.stats, s.stats), opt: o });
    }
  } catch (e) { /* guardado roto o sin acceso: se empieza de cero */ }
  return newSave();
})();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* sin almacenamiento */ } }

const lvSave = id => save.lv[id] || { stars: [false, false, false], best: 0, done: false };
const starCount = id => lvSave(id).stars.filter(Boolean).length;
const totalStars = () => LEVELS.reduce((a, L) => a + starCount(L.id), 0);

// Requisitos para abrir una montaña: lista de { txt, ok }.
function unlockReqs(L) {
  const u = L.unlock, idx = LEVELS.indexOf(L);
  if (!u) return [];
  const prev = LEVELS[idx - 1], out = [];
  out.push({ txt: `${u.stars} ★ en ${prev.name}`, ok: starCount(prev.id) >= u.stars });
  if (u.total) out.push({ txt: `${u.total} ★ en total`, ok: totalStars() >= u.total });
  if (u.upg) for (const k in u.upg) {
    const up = UPGRADES.find(x => x.id === k);
    out.push({ txt: `${up.name} nivel ${u.upg[k]}`, ok: save.upg[k] >= u.upg[k] });
  }
  return out;
}
const isOpen = L => save.beat || unlockReqs(L).every(r => r.ok);

function objText(o) {
  if (o.t === 'finish') return 'Llega a la meta';
  if (o.t === 'time') return `Llega en menos de ${fmtTime(o.v)}`;
  if (o.t === 'coins') return `Junta ${o.v} monedas`;
  if (o.t === 'clean') return o.v === 0 ? 'No choques' : `Choca ${o.v} veces o menos`;
  return '';
}
function fmtTime(t) {
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(t % 1 ? 1 : 0)}`;
}

// Generador pseudoaleatorio con semilla (mulberry32): la misma montaña siempre sale igual.
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
