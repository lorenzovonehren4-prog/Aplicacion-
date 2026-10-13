'use strict';
// Código Rojo: el barrio. Siempre el mismo (semilla fija): calles en cuadrícula, casas, tiendas,
// un parque, una grifo, un colegio, el canal con 6 puentes, un cerro con túnel, rampas,
// semáforos, postes de luz y las paredes rojas del borde.
//
// También arma los datos para la física: altura del piso (puentes y rampas), cajas sólidas
// (casas, cerro, canal, árboles) en una grilla para buscarlas rápido, y el grafo de calles.

const CITY = { solids: [], hash: new Map(), ramps: [], nodes: [], lights: [], lots: [], hideouts: [], bagSpots: [] };
const HCELL = 20;

function addSolid(x0, z0, x1, z1, h = 6, kind = 'casa') {
  const s = { x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), h, kind };
  CITY.solids.push(s);
  for (let i = Math.floor(s.x0 / HCELL); i <= Math.floor(s.x1 / HCELL); i++)
    for (let j = Math.floor(s.z0 / HCELL); j <= Math.floor(s.z1 / HCELL); j++) {
      const k = i * 1000 + j;
      if (!CITY.hash.has(k)) CITY.hash.set(k, []);
      CITY.hash.get(k).push(s);
    }
  return s;
}
function solidsNear(x, z) { return CITY.hash.get(Math.floor(x / HCELL) * 1000 + Math.floor(z / HCELL)) || []; }

// ¿Hay algo sólido entre dos puntos? (para ver si un patrullero "ve" al ladrón)
function lineFree(ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 4);
  for (let i = 1; i < n; i++) {
    const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n;
    for (const s of solidsNear(x, z)) if (x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1) return false;
  }
  return true;
}

// Altura del piso: 0, salvo puentes (arco sobre el canal) y rampas.
function groundH(x, z) {
  let h = 0;
  const span = CANAL + 7;
  if (Math.abs(z) < span) {
    for (const gx of GRID) if (Math.abs(x - gx) <= ROAD_W / 2 + 0.5) { h = 3.4 * Math.cos(z / span * Math.PI / 2); break; }
  }
  for (const r of CITY.ramps) {
    const dx = x - r.x, dz = z - r.z;
    const u = r.ax === 'x' ? dx * r.sg : dz * r.sg, v = r.ax === 'x' ? dz : dx;
    if (u >= 0 && u <= r.len && Math.abs(v) <= r.w / 2) h = Math.max(h, r.h * u / r.len);
  }
  return h;
}
const onRoad = (x, z) => GRID.some(g => Math.abs(x - g) <= ROAD_W / 2) || GRID.some(g => Math.abs(z - g) <= ROAD_W / 2);

// ---------- grafo de calles ----------
// Nodos: los 36 cruces. Vecinos por la cuadrícula.
function buildGraph() {
  const N = GRID.length;
  CITY.nodes = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) CITY.nodes.push({ id: i * N + j, i, j, x: GRID[i], z: GRID[j], nb: [], off: (i * 7 + j * 3) % 14 });
  for (const n of CITY.nodes) {
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = n.i + di, b = n.j + dj;
      if (a >= 0 && a < N && b >= 0 && b < N) n.nb.push(a * N + b);
    }
  }
}
const nodeAt = id => CITY.nodes[id];
function nearestNode(x, z) {
  let best = null, bd = Infinity;
  for (const n of CITY.nodes) { const d = (n.x - x) ** 2 + (n.z - z) ** 2; if (d < bd) { bd = d; best = n; } }
  return best;
}
// A* por la cuadrícula. cost(a, b) opcional suma castigo (por ejemplo, pasar cerca del policía).
function findPath(from, to, cost) {
  const open = [from.id], g = { [from.id]: 0 }, came = {}, f = { [from.id]: 0 };
  const h = n => Math.abs(n.x - to.x) + Math.abs(n.z - to.z);
  const closed = new Set();
  while (open.length) {
    open.sort((a, b) => f[a] - f[b]);
    const cur = open.shift();
    if (cur === to.id) { const p = [cur]; let c = cur; while (came[c] !== undefined) { c = came[c]; p.unshift(c); } return p.map(nodeAt); }
    closed.add(cur);
    const cn = nodeAt(cur);
    for (const nb of cn.nb) {
      if (closed.has(nb)) continue;
      const nn = nodeAt(nb), ng = g[cur] + 90 + (cost ? cost(cn, nn) : 0);
      if (g[nb] === undefined || ng < g[nb]) { g[nb] = ng; came[nb] = cur; f[nb] = ng + h(nn); if (!open.includes(nb)) open.push(nb); }
    }
  }
  return [from, to];
}
// Semáforo: ¿está en verde para quien va por el eje 'z' (calles norte-sur) o 'x'?
// Ciclo de 14 s: 0-6 verde N-S, 6-7 ámbar N-S, 7-13 verde E-O, 13-14 ámbar E-O.
function lightState(node, axis, t) {
  const p = (t + node.off) % 14;
  if (axis === 'z') return p < 6 ? 'verde' : p < 7 ? 'ambar' : 'rojo';
  return p >= 7 && p < 13 ? 'verde' : p >= 13 ? 'ambar' : 'rojo';
}

// ---------- el barrio ----------
function cellKind(ci, cj) {
  const x0 = GRID[ci], z0 = GRID[cj];
  if (z0 === -45) return 'canal';
  if (x0 === 45 && (z0 === 45 || z0 === 135)) return 'cerro';
  if (x0 === -45 && z0 === 45) return 'parque';
  if (x0 === -135 && z0 === -135) return 'grifo';
  if (x0 === 135 && z0 === -225) return 'colegio';
  if (x0 === -225 && z0 === 135) return 'tiendas';
  if (x0 === 135 && z0 === 135) return 'tiendas';
  return 'casas';
}

function buildCityData() {
  CITY.solids = []; CITY.hash = new Map(); CITY.ramps = []; CITY.lots = []; CITY.bagSpots = []; CITY.hideouts = [];
  buildGraph();
  const r = rng(2024);
  // canal: cajas sólidas entre los puentes (hacen de baranda)
  const xs = [-LIMIT - 5, ...GRID, LIMIT + 5];
  for (let k = 0; k < xs.length - 1; k++) {
    const a = xs[k] + (k === 0 ? 0 : ROAD_W / 2 + 0.6), b = xs[k + 1] - (k === xs.length - 2 ? 0 : ROAD_W / 2 + 0.6);
    addSolid(a, -CANAL, b, CANAL, 2, 'canal');
  }
  // cerro con túnel por la calle z = 135
  addSolid(HILL.x0, HILL.z0, HILL.x1, 135 - ROAD_W / 2 - 0.5, 30, 'cerro');
  addSolid(HILL.x0, 135 + ROAD_W / 2 + 0.5, HILL.x1, HILL.z1, 30, 'cerro');
  // manzanas
  for (let ci = 0; ci < GRID.length - 1; ci++) for (let cj = 0; cj < GRID.length - 1; cj++) {
    const kind = cellKind(ci, cj), X0 = GRID[ci] + 9, X1 = GRID[ci + 1] - 9, Z0 = GRID[cj] + 9, Z1 = GRID[cj + 1] - 9;
    if (kind === 'canal' || kind === 'cerro') continue;
    if (kind === 'casas' || kind === 'tiendas') {
      // 4x4 lotes de 18 m; los de afuera tienen casa mirando a la calle
      for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
        const lx0 = X0 + a * 18, lz0 = Z0 + b * 18, cx = lx0 + 9, cz = lz0 + 9;
        const outer = a === 0 || a === 3 || b === 0 || b === 3;
        if (!outer) { CITY.lots.push({ kind: r() < 0.35 ? 'piscina' : 'patio', x: cx, z: cz }); continue; }
        // hacia dónde mira: la calle más cercana
        const face = a === 0 ? 'w' : a === 3 ? 'e' : b === 0 ? 's' : 'n';
        const shop = kind === 'tiendas' && (face === 'w' || face === 'e' ? (b === 1 || b === 2) : (a === 1 || a === 2));
        const w = shop ? 15 : 9 + r() * 4, d = shop ? 13 : 8.5 + r() * 3.5, floors = shop ? 1 + (r() < 0.5 ? 1 : 0) : r() < 0.45 ? 2 : 1;
        // retiro desde la vereda
        const set = shop ? 2 : 4;
        let hx = cx, hz = cz;
        if (face === 'w') hx = lx0 + set + d / 2; if (face === 'e') hx = lx0 + 18 - set - d / 2;
        if (face === 's') hz = lz0 + set + d / 2; if (face === 'n') hz = lz0 + 18 - set - d / 2;
        const sx = face === 'w' || face === 'e' ? d : w, sz = face === 'w' || face === 'e' ? w : d;
        const lot = { kind: shop ? 'tienda' : 'casa', x: hx, z: hz, sx, sz, floors, face, hue: r(), roof: r(), seed: Math.floor(r() * 1e6) };
        CITY.lots.push(lot);
        addSolid(hx - sx / 2, hz - sz / 2, hx + sx / 2, hz + sz / 2, floors * 3.2 + 1.5, 'casa');
      }
    } else if (kind === 'parque') {
      CITY.lots.push({ kind: 'parque', x: (X0 + X1) / 2, z: (Z0 + Z1) / 2, sx: X1 - X0, sz: Z1 - Z0 });
      addSolid((X0 + X1) / 2 - 4, (Z0 + Z1) / 2 - 4, (X0 + X1) / 2 + 4, (Z0 + Z1) / 2 + 4, 2, 'pileta');
    } else if (kind === 'grifo') {
      CITY.lots.push({ kind: 'grifo', x: (X0 + X1) / 2, z: (Z0 + Z1) / 2, sx: X1 - X0, sz: Z1 - Z0 });
      addSolid(X0 + 44, Z0 + 46, X0 + 70, Z0 + 70, 5, 'tienda');           // tienda de la grifo
      for (const [px, pz] of [[X0 + 20, Z0 + 30], [X0 + 34, Z0 + 30]]) addSolid(px - 1, pz - 2.5, px + 1, pz + 2.5, 1.5, 'surtidor');
    } else if (kind === 'colegio') {
      CITY.lots.push({ kind: 'colegio', x: (X0 + X1) / 2, z: (Z0 + Z1) / 2, sx: X1 - X0, sz: Z1 - Z0 });
      addSolid(X0 + 2, Z1 - 22, X1 - 2, Z1 - 2, 9, 'colegio');
    }
  }
  // árboles en patios y veredas (pequeños sólidos)
  CITY.trees = [];
  for (const l of CITY.lots) if (l.kind === 'patio' || l.kind === 'piscina') {
    const n = l.kind === 'patio' ? 2 : 1;
    for (let k = 0; k < n; k++) { const tx = l.x + (r() - 0.5) * 12, tz = l.z + (r() - 0.5) * 12; if (l.kind === 'piscina' && Math.abs(tx - l.x) < 5 && Math.abs(tz - l.z) < 4) continue; CITY.trees.push({ x: tx, z: tz, s: 0.8 + r() * 0.6 }); }
  }
  for (const l of CITY.lots) if (l.kind === 'parque') for (let k = 0; k < 26; k++) { const tx = l.x + (r() - 0.5) * (l.sx - 6), tz = l.z + (r() - 0.5) * (l.sz - 6); if (Math.abs(tx - l.x) < 9 && Math.abs(tz - l.z) < 9) continue; CITY.trees.push({ x: tx, z: tz, s: 0.9 + r() * 0.8 }); }
  // franja de afuera (entre la última calle y la pared): árboles
  for (let k = 0; k < 90; k++) {
    const side = Math.floor(r() * 4), t = (r() - 0.5) * 2 * 240, o = 236 + r() * 16;
    const tx = side === 0 ? o : side === 1 ? -o : t, tz = side === 2 ? o : side === 3 ? -o : t;
    if (Math.abs(tz) < CANAL + 2) continue;
    CITY.trees.push({ x: tx, z: tz, s: 0.9 + r() * 0.7 });
  }
  for (const t of CITY.trees) addSolid(t.x - 0.45 * t.s, t.z - 0.45 * t.s, t.x + 0.45 * t.s, t.z + 0.45 * t.s, 6, 'arbol');
  // rampas en el medio de algunas cuadras (en un carril)
  const RAMPS = [[-180, -225, 'x', 1], [180, 45, 'x', -1], [-135, 180, 'z', -1], [225, -90, 'z', 1], [-45, -180, 'z', 1], [90, -135, 'x', 1], [-225, 90, 'z', 1], [0, 225, 'x', -1]];
  for (const [x, z, ax, sg] of RAMPS) {
    // en el carril de la derecha según el sentido de la rampa
    const lane = ax === 'x' ? { x: x - sg * 3.5, z: z + sg * LANE } : { x: x - sg * LANE, z: z - sg * 3.5 };
    CITY.ramps.push({ x: lane.x, z: lane.z, ax, sg, len: 7, w: 4.2, h: 1.5 });
  }
  // guaridas (para las misiones de escape) y lugares de bolsas
  CITY.hideouts = [{ x: -238, z: -238, name: 'el galpón del suroeste' }, { x: 238, z: 238, name: 'el taller del noreste' }, { x: 238, z: -238, name: 'el depósito del sureste' }, { x: -238, z: 238, name: 'la cochera del noroeste' }];
  for (const gx of GRID) for (const gz of GRID) {
    for (const [dx, dz] of [[45, 0], [0, 45]]) {
      const x = gx + dx, z = gz + dz;
      if (Math.abs(x) <= 225 && Math.abs(z) <= 225 && !(Math.abs(z) < CANAL + 8 && dx)) CITY.bagSpots.push({ x: x + (dz ? (r() < 0.5 ? -LANE : LANE) : 0), z: z + (dx ? (r() < 0.5 ? -LANE : LANE) : 0) });
    }
  }
}
