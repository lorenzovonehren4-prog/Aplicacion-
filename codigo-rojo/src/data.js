'use strict';
// Código Rojo: carros, dificultades, misiones, insignias y guardado.

// Mapa: un cuadrado de calles cada 90 m. El borde (paredes rojas) está en ±LIMIT.
const GRID = [-225, -135, -45, 45, 135, 225];
const ROAD_W = 12;          // ancho de la calle (dos carriles)
const LANE = 3;             // distancia del eje al centro del carril
const LIMIT = 258;
const CANAL = 34;           // el canal ocupa |z| < CANAL (se cruza por los puentes)
const HILL = { x0: 52, x1: 128, z0: 52, z1: 218 };   // cerro con túnel (la calle z = 135 lo atraviesa)

// Carros. top en m/s, acc en m/s², grip en g, hp de vida, mass relativa.
const CARS = [
  { id: 'compacto', name: 'Compacto', price: 0, top: 44, acc: 7.5, grip: 1.0, brake: 12, hp: 100, mass: 1.0, body: 'hatch', color: 0x2f7de1, desc: 'Ágil y barato. Para empezar.' },
  { id: 'sedan', name: 'Sedán', price: 600, top: 48, acc: 8.0, grip: 1.04, brake: 12.5, hp: 120, mass: 1.15, body: 'sedan', color: 0xb8bcc4, desc: 'Equilibrado y más resistente.' },
  { id: 'pickup', name: 'Camioneta', price: 1100, top: 45, acc: 7.6, grip: 0.98, brake: 11.5, hp: 175, mass: 1.6, body: 'pickup', color: 0x3c6b3a, desc: 'Pesada: empuja a los demás.' },
  { id: 'muscle', name: 'Muscle', price: 1800, top: 54, acc: 9.2, grip: 1.0, brake: 12.5, hp: 130, mass: 1.3, body: 'muscle', color: 0xd03a1e, desc: 'Mucha potencia, cola suelta.' },
  { id: 'deportivo', name: 'Deportivo', price: 2800, top: 58, acc: 10.2, grip: 1.15, brake: 14, hp: 110, mass: 1.05, body: 'sport', color: 0xf2c230, desc: 'Rápido y con mucho agarre.' },
  { id: 'super', name: 'Superdeportivo', price: 4500, top: 64, acc: 11.5, grip: 1.22, brake: 15, hp: 115, mass: 1.1, body: 'super', color: 0x7a2fe0, desc: 'Lo más rápido del barrio.' },
];
const carById = id => CARS.find(c => c.id === id) || CARS[0];

// Dificultad de la IA (patrulleros o ladrón).
// speed: multiplica la velocidad punta de la IA; skill: qué tan bien toma curvas y predice;
// aggro: cuánto embiste; arrest: qué tan rápido se llena la barra de arresto.
const DIFFS = {
  facil: { name: 'Fácil', speed: 0.8, skill: 0.55, aggro: 0.35, arrest: 0.62, traffic: 18, reward: 1 },
  normal: { name: 'Normal', speed: 0.92, skill: 0.75, aggro: 0.65, arrest: 1, traffic: 24, reward: 1.5 },
  dificil: { name: 'Difícil', speed: 1.0, skill: 0.9, aggro: 0.85, arrest: 1.2, traffic: 28, reward: 2.2 },
  leyenda: { name: 'Leyenda', speed: 1.07, skill: 1.0, aggro: 1, arrest: 1.4, traffic: 32, reward: 3.2 },
};

// Misiones. role: 'ladron' o 'policia'.
// goal: survive (aguanta t s), bags (aguanta t s y junta n bolsas), escape (llega a la guarida antes de t),
//       arrest (atrápalo en t s), stop (atrápalo antes de que llegue a su guarida).
const MISSIONS = [
  { id: 'l1', role: 'ladron', diff: 'facil', goal: 'survive', t: 60, time: 'dia', name: 'Primer golpe', desc: 'Te vieron saliendo del banco. Aguanta 60 segundos.' },
  { id: 'p1', role: 'policia', diff: 'facil', goal: 'arrest', t: 120, time: 'dia', name: 'Primera patrulla', desc: 'Un ladrón novato se escapa. Atrápalo en 2 minutos.' },
  { id: 'l2', role: 'ladron', diff: 'facil', goal: 'bags', t: 90, n: 5, time: 'tarde', name: 'Bolsas sueltas', desc: 'Se te cayó el botín. Junta 5 bolsas y aguanta 90 segundos.' },
  { id: 'p2', role: 'policia', diff: 'normal', goal: 'arrest', t: 120, time: 'tarde', name: 'Hora punta', desc: 'Más tráfico y un ladrón con más maña. 2 minutos.' },
  { id: 'l3', role: 'ladron', diff: 'normal', goal: 'escape', t: 120, time: 'dia', name: 'A la guarida', desc: 'Llega a la guarida marcada antes de 2 minutos sin que te atrapen.' },
  { id: 'p3', role: 'policia', diff: 'normal', goal: 'stop', t: 150, time: 'noche', name: 'Que no llegue', desc: 'El ladrón va a su guarida. Atrápalo antes de que llegue.' },
  { id: 'l4', role: 'ladron', diff: 'normal', goal: 'survive', t: 120, time: 'noche', name: 'Noche caliente', desc: 'De noche y con sirenas por todos lados. Aguanta 2 minutos.' },
  { id: 'p4', role: 'policia', diff: 'dificil', goal: 'arrest', t: 100, time: 'dia', name: 'Profesional', desc: 'Un ladrón rápido que se mete por el túnel y los puentes.' },
  { id: 'l5', role: 'ladron', diff: 'dificil', goal: 'bags', t: 120, n: 8, time: 'tarde', name: 'El gran botín', desc: '8 bolsas repartidas por el barrio y 3 patrulleros furiosos.' },
  { id: 'p5', role: 'policia', diff: 'dificil', goal: 'stop', t: 150, time: 'noche', name: 'Cierre de puentes', desc: 'Va al otro lado del canal. Que no llegue.' },
  { id: 'l6', role: 'ladron', diff: 'dificil', goal: 'escape', t: 150, time: 'noche', name: 'Fuga nocturna', desc: 'Cruza el barrio hasta la guarida de noche.' },
  { id: 'p6', role: 'policia', diff: 'leyenda', goal: 'arrest', t: 90, time: 'noche', name: 'El fantasma', desc: 'El ladrón más rápido del barrio. 90 segundos.' },
  { id: 'l7', role: 'ladron', diff: 'leyenda', goal: 'survive', t: 180, time: 'tarde', name: 'Leyenda del barrio', desc: 'Tres minutos contra los mejores patrulleros.' },
  { id: 'p7', role: 'policia', diff: 'leyenda', goal: 'stop', t: 140, time: 'dia', name: 'Código rojo', desc: 'La última persecución. Atrápalo antes de su guarida.' },
];

function goalText(m) {
  if (m.goal === 'survive') return `Aguanta ${m.t} s sin que te atrapen`;
  if (m.goal === 'bags') return `Junta ${m.n} bolsas y aguanta ${m.t} s`;
  if (m.goal === 'escape') return `Llega a la guarida antes de ${m.t} s`;
  if (m.goal === 'arrest') return `Atrapa al ladrón en ${m.t} s`;
  if (m.goal === 'stop') return `Atrápalo antes de que llegue a su guarida (${m.t} s)`;
  return '';
}

const ACHS = [
  { id: 'primera', name: 'Primera fuga', desc: 'Gana una misión de ladrón', icon: '💰' },
  { id: 'placa', name: 'Placa nueva', desc: 'Gana una misión de policía', icon: '🚓' },
  { id: 'salto', name: 'Volando', desc: 'Salta 15 m con una rampa', icon: '🛫' },
  { id: 'tunel', name: 'Topo', desc: 'Pasa por el túnel en una persecución', icon: '🕳️' },
  { id: 'puentes', name: 'Puente a puente', desc: 'Cruza 5 puentes en una partida', icon: '🌉' },
  { id: 'rojo', name: 'Pasa en rojo', desc: 'Cruza 10 semáforos en rojo', icon: '🚦' },
  { id: 'chatarra', name: 'Chatarra', desc: 'Deja a un patrullero fuera de combate', icon: '💥' },
  { id: 'veloz', name: 'A 200', desc: 'Llega a 200 km/h', icon: '💨' },
  { id: 'garaje', name: 'Coleccionista', desc: 'Ten 4 carros en el garaje', icon: '🔑' },
  { id: 'leyenda', name: 'Leyenda', desc: 'Gana todas las misiones', icon: '👑' },
];

// ---------- guardado ----------
const SAVE_KEY = 'codigorojo_v1';
function newSave() {
  return {
    v: 1, coins: 0, car: 'compacto', cars: ['compacto'], done: {}, best: {}, stars: {}, ach: {},
    stats: { runs: 0, wins: 0, thiefWins: 0, copWins: 0, arrests: 0, busted: 0, coins: 0, top: 0, reds: 0, wrecked: 0 },
    opt: { sound: true, vol: 0.8, cam: 'afuera', quality: 'alta', sens: 1 },
  };
}
let save = (() => {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && s.v === 1) { const d = newSave(); return Object.assign(d, s, { stats: Object.assign(d.stats, s.stats), opt: Object.assign(d.opt, s.opt) }); }
  } catch (e) { /* sin guardado */ }
  return newSave();
})();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* sin almacenamiento */ } }

// Una misión se abre cuando ganaste la anterior del mismo rol.
function missionOpen(m) {
  const same = MISSIONS.filter(x => x.role === m.role), i = same.indexOf(m);
  return i === 0 || !!save.done[same[i - 1].id];
}

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
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrapAng = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
