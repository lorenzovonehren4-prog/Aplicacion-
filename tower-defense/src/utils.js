/* =====================================================================
 * utils.js — Funciones auxiliares compartidas por todos los módulos.
 * ===================================================================== */
window.TD = window.TD || {};

TD.U = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
  dist2: (ax, ay, bx, by) => (bx - ax) * (bx - ax) + (by - ay) * (by - ay),
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],

  // Diferencia angular normalizada a [-PI, PI]
  angleDiff(a, b) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  },

  // Formatea números grandes: 12500 -> "12.5k"
  fmt(n) {
    n = Math.floor(n);
    if (n >= 100000) return (n / 1000).toFixed(0) + 'k';
    if (n >= 10000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  },

  // Mezcla un color hex con blanco (t>0) o negro (t<0)
  shade(hex, t) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const target = t < 0 ? 0 : 255;
    const k = Math.abs(t);
    r = Math.round(r + (target - r) * k);
    g = Math.round(g + (target - g) * k);
    b = Math.round(b + (target - b) * k);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  },

  // Fecha local "AAAA-MM-DD" (para recompensas y misiones diarias)
  today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },

  // Calcula las estadísticas de una torre en un nivel dado a partir de config
  towerStats(def, level) {
    const s = Object.assign({}, def.stats);
    const steps = level - 1;
    const mul = (def.growth && def.growth.mul) || {};
    const add = (def.growth && def.growth.add) || {};
    for (const k in mul) if (s[k] !== undefined) s[k] = s[k] * Math.pow(mul[k], steps);
    for (const k in add) if (s[k] !== undefined) s[k] = s[k] + add[k] * steps;
    if (s.pellets !== undefined) s.pellets = Math.floor(s.pellets);
    if (s.chain !== undefined) s.chain = Math.floor(s.chain);
    if (s.maxMines !== undefined) s.maxMines = Math.floor(s.maxMines);
    if (s.slow !== undefined) s.slow = Math.max(0.15, s.slow);
    return s;
  },

  // Coste de mejorar desde "level" al siguiente
  upgradeCost(def, level, discount) {
    const f = TD.CONFIG.upgradeCostFactors[level - 1];
    if (f === undefined) return Infinity;
    return Math.round(def.cost * f * (1 - (discount || 0)) / 5) * 5;
  },

  // Nombre legible de una estadística para los paneles
  statLabel: {
    damage: 'Daño', range: 'Alcance', rate: 'Cadencia', splash: 'Área', pellets: 'Perdigones',
    chain: 'Saltos', slow: 'Ralentización', slowTime: 'Duración', income: 'Ingresos',
    interest: 'Interés', cap: 'Tope', maxMines: 'Minas', groundTime: 'Derribo',
    rangeBonus: 'Bonus alcance', dmgBonus: 'Bonus daño', rateBonus: 'Bonus cadencia', burnDps: 'Quemadura'
  },

  // Formatea el valor de una estadística
  statValue(key, v) {
    if (key === 'slow') return Math.round((1 - v) * 100) + '%';
    if (key === 'interest' || key === 'rangeBonus' || key === 'dmgBonus' || key === 'rateBonus') return Math.round(v * 100) + '%';
    if (key === 'rate') return v.toFixed(v >= 10 ? 0 : 1) + '/s';
    if (key === 'slowTime' || key === 'groundTime') return v.toFixed(1) + 's';
    if (Number.isInteger(v)) return String(v);
    return v >= 10 ? String(Math.round(v)) : v.toFixed(1);
  }
};
