'use strict';
// Código Rojo: modelos de los carros (también el patrullero con circulina y los del tráfico),
// la cabina por dentro y la física (agarre, freno de mano para derrapar, saltos en las rampas,
// choques contra casas, árboles, el canal y las paredes rojas).
//
// Rumbo h: el frente apunta a (sin h, cos h) en (x, z); la derecha es (-cos h, sin h).
// Ejes locales del modelo: +z adelante, +x a la izquierda.
//
// Modelo: la carrocería se arma por secciones a lo largo (ver loftBody): costados abombados,
// hombro marcado, guardabarros sobre las ruedas, techo más angosto que la base y vidrios
// como parte de la misma superficie. Las piezas que no son pintura se juntan en una sola malla por material
// (vidrios, molduras y cromo, faros, luces traseras) y se arman una vez por tipo de carro.

// L largo, W ancho, clr altura del piso, belt línea de cintura, roof techo,
// zW base del parabrisas, zR1/zR2 techo adelante/atrás, zB base de la luneta, r radio de rueda, wb distancia entre ejes
const BODY = {
  hatch: { L: 3.95, W: 1.76, clr: 0.27, belt: 0.93, roof: 1.47, zW: 0.55, zR1: -0.12, zR2: -1.3, zB: -1.8, r: 0.31, wb: 2.5 },
  sedan: { L: 4.65, W: 1.82, clr: 0.27, belt: 0.92, roof: 1.43, zW: 0.72, zR1: -0.02, zR2: -1.0, zB: -1.6, r: 0.33, wb: 2.75 },
  muscle: { L: 4.85, W: 1.9, clr: 0.25, belt: 0.88, roof: 1.32, zW: 0.42, zR1: -0.28, zR2: -1.08, zB: -1.72, r: 0.36, wb: 2.85, scoop: true },
  sport: { L: 4.45, W: 1.93, clr: 0.22, belt: 0.82, roof: 1.22, zW: 0.55, zR1: -0.25, zR2: -0.85, zB: -1.66, r: 0.34, wb: 2.6, spoiler: 'lip' },
  super: { L: 4.55, W: 2.0, clr: 0.18, belt: 0.74, roof: 1.12, zW: 0.78, zR1: -0.02, zR2: -0.62, zB: -1.55, r: 0.35, wb: 2.7, spoiler: 'wing' },
  pickup: { L: 5.3, W: 1.98, clr: 0.42, belt: 1.12, roof: 1.88, zW: 1.0, zR1: 0.42, zR2: -0.42, zB: -0.55, r: 0.42, wb: 3.2, bed: true },
  van: { L: 4.9, W: 1.98, clr: 0.32, belt: 1.02, roof: 2.08, zW: 1.62, zR1: 0.95, zR2: -2.3, zB: -2.42, r: 0.36, wb: 3.0 },
};

function decalTex(text, color = '#1f4fbf') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = color; g.font = '900 64px Rubik, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 52);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function plateTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, 256, 64); g.strokeStyle = '#222'; g.lineWidth = 4; g.strokeRect(3, 3, 250, 58);
  g.fillStyle = '#c8202a'; g.fillRect(3, 3, 250, 12);
  g.fillStyle = '#1a1a1a'; g.font = '800 34px "Courier New", monospace'; g.textAlign = 'center';
  g.fillText(['ABC-123', 'LMA-704', 'BRR-777', 'CRJ-202', 'PER-519'][Math.floor(Math.random() * 5)], 128, 54);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
let POLICE_DECAL = null, PLATE = null, BLOB = null;

// Perfil 2D (z, y) extruido a lo ancho w, con bisel. Devuelve geometría centrada en x.
function sideExtrude(shape, w, bevel) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.01, w - bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -(w - bevel * 2) / 2);
  g.rotateY(-Math.PI / 2);
  return g;
}
const MG = (geo, m, c) => ({ geo, m, c });
const T4 = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')).setPosition(x, y, z);

// ---------- carrocería por secciones ----------
// A lo largo del carro (z) se calculan la altura de abajo (con los pasos de rueda), la línea de
// cintura, la altura de arriba (capó, parabrisas, techo, luneta, maletera) y el ancho (más
// angosto en las puntas). En cada sección hay un contorno de 8 puntos por lado: costado
// abombado, hombro, curva hacia el capó (o la base del vidrio en la cabina) y el techo, más
// angosto que la base. Las secciones se unen en mallas suaves y cada franja va a su material.
const smooth01 = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
function bodyShape(type, B) {
  const hl = B.L / 2;
  const nose = type === 'super' || type === 'sport' ? 0.24 : type === 'van' ? 0.02 : type === 'pickup' ? 0.05 : 0.12;
  const cowl = B.belt + (type === 'super' ? 0.0 : 0.035);
  const tailY = B.belt - (type === 'van' ? 0.04 : type === 'super' || type === 'sport' ? 0.08 : 0.09);
  const P = [[hl, B.belt - 0.13 - nose * 0.5], [hl - 0.1, B.belt - 0.06 - nose * 0.4], [hl - 0.4, B.belt - 0.02 - nose * 0.18], [B.zW + 0.03, cowl],
    [B.zR1, B.roof - 0.02], [(B.zR1 + B.zR2) / 2, B.roof], [B.zR2, B.roof - 0.02], [B.zB, B.belt + 0.035]];
  if (-hl + 0.32 < B.zB - 0.1) P.push([-hl + 0.32, B.belt + (B.bed ? 0.03 : 0.015)]);
  if (-hl + 0.07 < B.zB - 0.05) P.push([-hl + 0.07, tailY + 0.05]);
  P.push([-hl, tailY - 0.04]);
  const top = z => {
    for (let i = 0; i < P.length - 1; i++) if (z <= P[i][0] && z >= P[i + 1][0]) { const t = (z - P[i + 1][0]) / (P[i][0] - P[i + 1][0] || 1); return lerp(P[i + 1][1], P[i][1], t); }
    return z > 0 ? P[0][1] : P[P.length - 1][1];
  };
  const arch = z => {
    let y = 0;
    for (const za of [B.wb / 2, -B.wb / 2]) { const d = z - za, rA = B.r + 0.07; if (Math.abs(d) < rA) y = Math.max(y, B.r + Math.sqrt(rA * rA - d * d)); }
    return y;
  };
  const bottom = z => { const e = clamp((Math.abs(z) - (hl - 0.55)) / 0.55, 0, 1); return Math.max(B.clr + 0.02 + 0.13 * e * e, arch(z)); };
  const half = z => { const e = clamp((Math.abs(z) - (hl - 0.65)) / 0.65, 0, 1); return B.W / 2 * (1 - 0.14 * e * e); };
  const cab = z => smooth01((B.zW + 0.06 - z) / 0.1) * smooth01((z - B.zB + 0.06) / 0.1);
  const tumble = type === 'van' ? 0.93 : type === 'pickup' ? 0.88 : type === 'super' ? 0.74 : 0.8;
  // contorno de una sección (lado izquierdo, x >= 0)
  const section = z => {
    const yt = top(z), yb = bottom(z), w = half(z), c = cab(z);
    let ys = Math.min(B.belt - 0.06, yt - 0.04 + c);
    ys = Math.max(ys, yb + 0.1);
    const wr = w * tumble;
    return { z, c, yt, yb, ys, w, pts: [
      [w * 0.93, yb],
      [w * 0.995, yb + 0.35 * (ys - yb)],
      [w, ys - 0.08],
      [w * 0.985, ys],
      [lerp(w * 0.9, w * 0.955, c), lerp(Math.max(ys + 0.02, ys + (yt - ys) * 0.45), ys + 0.035, c)],
      [lerp(w * 0.68, wr + 0.03, c), lerp(Math.max(yt - 0.015, ys + 0.01), yt - 0.06, c)],
      [lerp(w * 0.34, wr * 0.86, c), lerp(Math.max(yt, ys + 0.01), yt - 0.012, c)],
      [0, Math.max(yt, ys + 0.01) + 0.008],
    ] };
  };
  return { top, bottom, half, cab, section, hl };
}
function loftBody(type, B, S, lo) {
  const hl = B.L / 2;
  // secciones: parejas a lo largo y siempre en los quiebres (parabrisas, techo, ruedas)
  const zs = new Set();
  const NS = lo === 2 ? 10 : lo ? 22 : 96;
  for (let i = 0; i <= NS; i++) zs.add(+(-hl + B.L * i / NS).toFixed(4));
  for (const z of [B.zW, B.zR1, B.zR2, B.zB, B.zW + 0.03]) if (z > -hl && z < hl) zs.add(+z.toFixed(4));
  const NA = lo === 2 ? 1 : lo ? 3 : 10;
  for (const za of [B.wb / 2, -B.wb / 2]) for (let k = -NA; k <= NA; k++) zs.add(+(za + k / NA * (B.r + 0.07)).toFixed(4));
  const secs = [...zs].sort((a, b) => a - b).map(S.section);
  const midB = (B.zR1 + B.zR2) / 2;
  const matOf = (bd, zm, cm) => {
    if (bd < 0) return 'trim';
    const inCab = cm > 0.5;
    if (bd === 0) return Math.abs(zm) < B.wb / 2 - B.r - 0.12 ? 'trim' : 'paint';
    if (bd <= 2) return 'paint';
    if (bd === 3) return inCab ? 'trim' : 'paint';
    if (bd === 4) return !inCab ? 'paint' : (type !== 'van' && type !== 'super' && Math.abs(zm - midB) < 0.055) ? 'trim' : 'glass';
    if (!inCab) return B.bed && bd === 6 && zm < B.zB - 0.06 && zm > -hl + 0.12 ? 'trim' : 'paint';
    if (bd === 5) return 'roof';
    return zm < B.zR1 && zm > B.zR2 ? 'roof' : 'glass';
  };
  const G = {};
  const grp = k => G[k] = G[k] || { pos: [], col: [], idx: [], map: new Map(), door: [] };
  const vtx = (g, key, x, y, z) => {
    let i = g.map.get(key);
    if (i === undefined) { i = g.pos.length / 3; g.map.set(key, i); g.pos.push(x, y, z); g.door.push(z < B.zW - 0.05 && z > B.zB + 0.05 && y < B.belt + 0.02 && y > B.clr + 0.12 ? 1 : 0); }
    return i;
  };
  for (let k = 0; k < secs.length - 1; k++) {
    const s0 = secs[k], s1 = secs[k + 1], zm = (s0.z + s1.z) / 2, cm = (s0.c + s1.c) / 2;
    for (let bd = -1; bd < 7; bd++) {
      const g = grp(matOf(bd, zm, cm));
      if (bd < 0) {
        // piso: de p0 izquierdo a p0 derecho
        const a = vtx(g, `${k}|0|L`, s0.pts[0][0], s0.pts[0][1], s0.z), b = vtx(g, `${k}|0|R`, -s0.pts[0][0], s0.pts[0][1], s0.z);
        const c = vtx(g, `${k + 1}|0|R`, -s1.pts[0][0], s1.pts[0][1], s1.z), d = vtx(g, `${k + 1}|0|L`, s1.pts[0][0], s1.pts[0][1], s1.z);
        g.idx.push(a, d, b, b, d, c);
        continue;
      }
      for (const sd of [1, -1]) {
        const S_ = sd > 0 ? 'L' : 'R';
        const a = vtx(g, `${k}|${bd}|${S_}`, sd * s0.pts[bd][0], s0.pts[bd][1], s0.z), b = vtx(g, `${k}|${bd + 1}|${S_}`, sd * s0.pts[bd + 1][0], s0.pts[bd + 1][1], s0.z);
        const c = vtx(g, `${k + 1}|${bd + 1}|${S_}`, sd * s1.pts[bd + 1][0], s1.pts[bd + 1][1], s1.z), d = vtx(g, `${k + 1}|${bd}|${S_}`, sd * s1.pts[bd][0], s1.pts[bd][1], s1.z);
        if (sd > 0) g.idx.push(a, b, d, b, c, d); else g.idx.push(a, d, b, b, d, c);
      }
    }
  }
  // tapas de adelante y de atrás (planas, se cubren con parrilla, faros y luces)
  for (const [sec, dir] of [[secs[secs.length - 1], 1], [secs[0], -1]]) {
    const g = grp('paint'), ring = [];
    for (let i = 0; i < 8; i++) ring.push([sec.pts[i][0], sec.pts[i][1]]);
    for (let i = 6; i >= 0; i--) ring.push([-sec.pts[i][0], sec.pts[i][1]]);
    const cy = (sec.yb + sec.yt) / 2, c0 = vtx(g, `cap${dir}c`, 0, cy, sec.z);
    const ids = ring.map((p, i) => vtx(g, `cap${dir}|${i}`, p[0], p[1], sec.z));
    for (let i = 0; i < ids.length - 1; i++) { if (dir > 0) g.idx.push(c0, ids[i], ids[i + 1]); else g.idx.push(c0, ids[i + 1], ids[i]); }
  }
  const out = {};
  for (const k in G) {
    const g = G[k], geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3));
    geo.setIndex(g.idx); geo.computeVertexNormals();
    const n = g.pos.length / 3;
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
    const col = new Float32Array(n * 3).fill(k === 'trim' ? 0.08 : 1);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (k === 'paint') { const pc = new Float32Array(n * 3); for (let i = 0; i < n; i++) pc.fill(g.door[i] ? 1 : 0.06, i * 3, i * 3 + 3); out.paintPolice = geo.clone(); out.paintPolice.setAttribute('color', new THREE.BufferAttribute(pc, 3)); }
    out[k] = geo;
  }
  return out;
}
function roundRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
// placa redondeada de w x h y espesor d (mirando a +z)
let PLATE_LO = false;
const plate = (w, h, d, r = 0.03) => PLATE_LO ? new THREE.BoxGeometry(w, h, d) : new THREE.ExtrudeGeometry(roundRect(w, h, r), { depth: d, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 6 }).translate(0, 0, -d / 2);

// Geometrías de un tipo de carro (se arman una sola vez).
const CAR_GEO = {};
// lo: false = completo (de cerca); true = liviano (de 45 m en adelante y estacionados cerca):
// menos secciones, piezas simples, ruedas sin rayos; 2 = muy liviano (de lejos): sólo la
// carrocería, vidrios, faros, luces y ruedas de 8 lados.
function carGeo(type, lo = false) {
  const key = type + (lo === 2 ? '_xlo' : lo ? '_lo' : '');
  if (CAR_GEO[key]) return CAR_GEO[key];
  PLATE_LO = !!lo;
  const xlo = lo === 2;
  const B = BODY[type], S = bodyShape(type, B), L = loftBody(type, B, S, lo);
  const hl = B.L / 2, sport = type === 'sport' || type === 'super';
  const paintX = [], trim = [], head = [], tail = [], glassX = [];
  const fS = S.section(hl - 0.001), rS = S.section(-hl + 0.001);
  // ---- frente ----
  const fh = fS.yt - fS.yb, fw = fS.w * 0.93, fz = hl + 0.004;
  const hy = fS.yb + fh * (sport ? 0.66 : 0.62), hh = Math.min(sport ? 0.08 : 0.13, fh * 0.32), hw = sport ? 0.44 : type === 'van' || type === 'pickup' ? 0.32 : 0.38;
  for (const sd of [-1, 1]) {
    const hx = sd * (fw - hw / 2 - 0.05);
    // faro: carcasa cromada oscura, vidrio que brilla, proyector y luz de día
    trim.push(MG(plate(hw + 0.04, hh + 0.04, 0.03, 0.04), T4(hx, hy, fz), 0x2a2e35));
    head.push(MG(plate(hw, hh, 0.035, 0.035), T4(hx, hy, fz + 0.012), 0xffffff));
    if (xlo) continue;
    const pr = new THREE.SphereGeometry(Math.min(hh * 0.38, 0.045), lo ? 5 : 12, lo ? 3 : 8); pr.scale(1, 1, 0.5);
    trim.push(MG(pr, T4(hx - sd * hw * 0.22, hy, fz + 0.03), 0xdfe4ea), MG(pr, T4(hx + sd * hw * 0.12, hy, fz + 0.03), 0xdfe4ea));
    head.push(MG(new THREE.BoxGeometry(hw * 0.9, 0.012, 0.01), T4(hx, hy - hh / 2 - 0.022, fz + 0.012), 0xffffff));
    // neblineros
    if (!sport && !lo) { const fg = new THREE.CylinderGeometry(0.04, 0.04, 0.03, 14).rotateX(Math.PI / 2); trim.push(MG(fg, T4(sd * (fw - 0.16), fS.yb + 0.08, fz + 0.01), 0xd0d4da)); }
  }
  // parrilla con marco cromado y listones
  const gw = sport ? B.W * 0.5 : B.W * 0.36, gh = fh * (sport ? 0.22 : 0.3), gy = sport ? fS.yb + fh * 0.22 : hy - 0.005;
  trim.push(MG(plate(gw + 0.05, gh + 0.05, 0.02, 0.05), T4(0, gy, fz), xlo ? 0x2a2c30 : sport ? 0x1a1b1e : 0xc9ced6));
  if (!xlo) {
    trim.push(MG(plate(gw, gh, 0.03, 0.04), T4(0, gy, fz + 0.004), 0x0b0c0e));
    for (let i = 1; i < 4; i++) trim.push(MG(new THREE.BoxGeometry(gw * 0.94, 0.012, 0.012), T4(0, gy - gh / 2 + gh * i / 4, fz + 0.022), sport ? 0x26282c : 0x8f959d));
    // toma de aire de abajo y alerón delantero
    trim.push(MG(plate(B.W * (sport ? 0.8 : 0.55), Math.max(0.05, fh * 0.14), 0.03, 0.02), T4(0, fS.yb + 0.05, fz), 0x0d0e10));
    if (sport) trim.push(MG(new THREE.BoxGeometry(B.W * 0.86, 0.025, 0.14), T4(0, fS.yb - 0.005, hl - 0.02), 0x111214));
  }
  // ---- atrás ----
  const rh = rS.yt - rS.yb, rw = rS.w * 0.93, rz = -hl - 0.004;
  const ty = rS.yb + rh * 0.68, th = Math.min(0.11, rh * 0.28), tw = sport ? 0.48 : 0.36;
  const back = (g, x, y) => g.rotateY(Math.PI) && MG(g, T4(x, y, rz));
  for (const sd of [-1, 1]) {
    const tx = sd * (rw - tw / 2 - 0.04);
    if (xlo) { tail.push({ ...back(plate(tw, th, 0.035, 0.025), tx, ty), m: T4(tx, ty, rz - 0.012), c: 0xffffff }); continue; }
    trim.push({ ...back(plate(tw + 0.03, th + 0.03, 0.03, 0.03), tx, ty), c: 0x1a1c20 });
    tail.push({ ...back(plate(tw, th, 0.035, 0.025), tx, ty), m: T4(tx, ty, rz - 0.012), c: 0xffffff });
    // reversa (blanca, dentro de la carcasa)
    trim.push(MG(new THREE.BoxGeometry(tw * 0.25, th * 0.5, 0.02), T4(tx - sd * tw * 0.22, ty, rz - 0.03), 0xe8e8e8));
    // escape
    if (sd > 0 || type === 'muscle' || sport) { const ex = new THREE.CylinderGeometry(0.045, 0.052, 0.18, 14, 1, true).rotateX(Math.PI / 2); trim.push(MG(ex, T4(sd * rw * 0.62, rS.yb + 0.05, -hl - 0.02), 0xc8cdd4)); }
  }
  if (sport && !xlo) tail.push(MG(new THREE.BoxGeometry(rw * 1.1, 0.02, 0.02), T4(0, ty + th / 2 - 0.01, rz - 0.015), 0xffffff));
  if (!xlo) trim.push(MG(plate(B.W * 0.6, Math.max(0.06, rh * 0.18), 0.03, 0.02), T4(0, rS.yb + 0.05, rz), 0x101114));
  if (sport && !xlo) for (let i = -2; i <= 2; i++) trim.push(MG(new THREE.BoxGeometry(0.012, 0.06, 0.16), T4(i * 0.14, rS.yb + 0.005, -hl + 0.05), 0x18191c));
  // ---- costados: espejos, manijas, líneas de puertas, limpiaparabrisas ----
  const midZ = (B.zR1 + B.zR2) / 2;
  for (const sd of xlo ? [] : [-1, 1]) {
    const ms = S.section(B.zW - 0.12), mx = sd * (ms.w + 0.1), my = B.belt + 0.1;
    const shell = new THREE.SphereGeometry(0.1, lo ? 6 : 16, lo ? 4 : 10); shell.scale(0.95, 0.7, 0.75);
    paintX.push(MG(shell, T4(mx, my, B.zW - 0.14)));
    trim.push(MG(new THREE.BoxGeometry(0.11, 0.035, 0.05), T4(sd * (ms.w + 0.04), my - 0.04, B.zW - 0.12), 0x15171a));
    glassX.push(MG(new THREE.PlaneGeometry(0.14, 0.08).rotateY(Math.PI), T4(mx, my, B.zW - 0.215)));
    const doors = type === 'van' ? [B.zW - 0.05, B.zW - 1.2] : B.bed ? [B.zW - 0.05, B.zB + 0.02] : [B.zW - 0.05, midZ + 0.04, B.zB + 0.06];
    for (const dz of doors) {
      const ds = S.section(dz), h0 = ds.yb + 0.04, h1 = ds.ys + 0.02;
      if (h1 - h0 > 0.1) trim.push(MG(new THREE.BoxGeometry(0.01, h1 - h0, 0.01), T4(sd * (ds.w + 0.002), (h0 + h1) / 2, dz), 0x0a0a0b));
    }
    for (const dz of type === 'sport' || type === 'super' || B.bed ? [B.zW - 0.75] : [B.zW - 0.75, midZ - 0.45]) {
      const ds = S.section(dz);
      trim.push(MG(new THREE.BoxGeometry(0.025, 0.03, 0.16), T4(sd * (ds.w + 0.008), ds.ys - 0.06, dz), 0xc2c7ce));
    }
    // limpiaparabrisas
    trim.push(MG(new THREE.BoxGeometry(0.012, 0.012, 0.55), T4(sd * 0.22, B.belt + 0.05, B.zW - 0.04, 0, sd * 1.35, 0), 0x0c0c0d));
    // tomas laterales de los deportivos
    if (type === 'super') trim.push(MG(plate(0.5, 0.16, 0.02, 0.06).rotateY(sd * Math.PI / 2), T4(sd * (S.half(-0.7) - 0.005), B.clr + 0.38, -0.7), 0x0b0c0e));
  }
  // ---- extras por tipo ----
  if (B.scoop && !xlo) { const z = hl - 0.85, y = S.top(z); trim.push(MG(plate(0.46, 0.6, 0.06, 0.06).rotateX(-Math.PI / 2 + 0.05), T4(0, y + 0.03, z), 0x15161a)); trim.push(MG(plate(0.36, 0.06, 0.02, 0.02), T4(0, y + 0.065, z + 0.3), 0x050505)); }
  if (B.spoiler === 'wing') {
    const z = -hl + 0.22, y = S.top(z) + 0.28;
    trim.push(MG(new THREE.BoxGeometry(B.W * 0.92, 0.035, 0.3), T4(0, y, z, -0.06, 0, 0), 0x141518));
    for (const sd of [-1, 1]) { trim.push(MG(new THREE.BoxGeometry(0.04, 0.28, 0.1), T4(sd * B.W * 0.3, y - 0.14, z), 0x141518)); trim.push(MG(new THREE.BoxGeometry(0.02, 0.12, 0.34), T4(sd * B.W * 0.46, y + 0.02, z), 0x141518)); }
  }
  if (B.spoiler === 'lip') { const z = -hl + 0.1; trim.push(MG(new THREE.BoxGeometry(B.W * 0.82, 0.03, 0.16), T4(0, S.top(z) + 0.03, z, -0.18, 0, 0), 0x141518)); }
  if (B.bed) {
    // caja de la camioneta: piso y paredes por dentro
    const z0 = B.zB - 0.08, z1 = -hl + 0.12, len = z0 - z1, cz = (z0 + z1) / 2;
    trim.push(MG(new THREE.BoxGeometry(B.W - 0.2, 0.03, len), T4(0, B.belt - 0.3, cz), 0x1d1e21));
    if (!xlo) for (const sd of [-1, 1]) trim.push(MG(new THREE.BoxGeometry(0.04, 0.05, len), T4(sd * (B.W / 2 - 0.08), B.belt + 0.04, cz), 0x15161a));
  }
  if (type === 'van' && !xlo) for (const sd of [-1, 1]) trim.push(MG(new THREE.BoxGeometry(0.04, 0.04, B.zR1 - B.zR2 - 0.4), T4(sd * B.W * 0.36, B.roof + 0.04, midZ), 0x2a2c30));
  // vidrio principal + espejos
  const glass = mergeGeos([{ geo: L.glass, c: 0x0d151d }, ...glassX.map(g => ({ ...g, c: 0xaabbcc }))]);
  const lower = mergeGeos([{ geo: L.paint, c: null }, ...paintX.map(g => ({ ...g, c: 0xffffff }))]);
  const lowerPolice = mergeGeos([{ geo: L.paintPolice, c: null }, ...paintX.map(g => ({ ...g, c: 0x0f1012 }))]);
  const geo = {
    lower, lowerPolice, cabin: mergeGeos([{ geo: L.roof, c: 0xffffff }]),
    glass, trim: mergeGeos([{ geo: L.trim, c: null }, ...trim]), head: mergeGeos(head), tail: mergeGeos(tail),
  };
  // ---- rueda: llanta con dibujo, aro con 5 rayos dobles, tuercas, disco y caliper ----
  const R = B.r, wt = sport ? 0.28 : 0.25, ri = R * 0.7;
  const rimC = sport ? 0x34373c : type === 'muscle' ? 0xd9dde3 : type === 'pickup' || type === 'van' ? 0x2a2c30 : 0xbfc5cc, ox = wt / 2 - 0.035;
  const rim = [];
  if (xlo) {
    rim.push(MG(new THREE.CylinderGeometry(R, R, wt, 8).rotateZ(Math.PI / 2), null, 0x151517));
    rim.push(MG(new THREE.CircleGeometry(ri, 8).rotateY(Math.PI / 2), T4(wt / 2 + 0.002, 0, 0), rimC));
  } else {
    const prof = [new THREE.Vector2(ri, -wt / 2 + 0.01)];
    const NP = lo ? 5 : 12;
    for (let i = 0; i <= NP; i++) {
      const a = -Math.PI / 2 + i / NP * Math.PI, groove = !lo && i > 1 && i < 11 && i % 3 === 0 ? 0.008 : 0;
      prof.push(new THREE.Vector2(R - 0.06 + Math.cos(a) * 0.06 - groove, Math.sin(a) * wt / 2));
    }
    prof.push(new THREE.Vector2(ri, wt / 2 - 0.01));
    const tire = new THREE.LatheGeometry(prof, lo ? 12 : 28); tire.rotateZ(Math.PI / 2);
    rim.push(MG(tire, null, 0x151517));
    const barrel = new THREE.CylinderGeometry(ri, ri, wt - 0.03, lo ? 10 : 24, 1, true).rotateZ(Math.PI / 2); rim.push(MG(barrel, null, 0x4a4d52));
    const lip = new THREE.TorusGeometry(ri - 0.01, 0.014, 5, 28).rotateY(Math.PI / 2); if (!lo) rim.push(MG(lip, T4(ox + 0.01, 0, 0), rimC));
    const disc = new THREE.CylinderGeometry(R * 0.52, R * 0.52, 0.02, 20).rotateZ(Math.PI / 2); if (!lo) rim.push(MG(disc, T4(ox - 0.08, 0, 0), 0x6e7177));
    if (lo) { const face = new THREE.CylinderGeometry(ri, ri, 0.02, 12).rotateZ(Math.PI / 2); rim.push(MG(face, T4(ox, 0, 0), rimC)); }
    else for (let k = 0; k < 5; k++) for (const da of [-0.13, 0.13]) {
      const sp = new THREE.BoxGeometry(0.03, ri - 0.07, 0.035);
      sp.translate(0, (ri - 0.07) / 2 + 0.05, 0);
      rim.push(MG(sp, T4(ox, 0, 0, k * Math.PI * 2 / 5 + da, 0, 0).multiply(new THREE.Matrix4().makeRotationZ(0.12)), rimC));
    }
    const cap = new THREE.CylinderGeometry(0.065, 0.075, 0.04, 14).rotateZ(Math.PI / 2); if (!lo) rim.push(MG(cap, T4(ox + 0.01, 0, 0), rimC));
    if (!lo) for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5 + Math.PI / 5, n = new THREE.CylinderGeometry(0.011, 0.011, 0.03, 6).rotateZ(Math.PI / 2); rim.push(MG(n, T4(ox + 0.02, Math.cos(a) * 0.095, Math.sin(a) * 0.095), 0x9aa0a8)); }
    if (!lo) rim.push(MG(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 10).rotateZ(Math.PI / 2), T4(ox + 0.035, 0, 0), 0x1a1b1e));
  }
  geo.wheel = mergeGeos(rim);
  // caliper (no gira con la rueda)
  const cal = new THREE.BoxGeometry(0.05, 0.17, 0.11); cal.translate(0, R * 0.36, 0);
  geo.caliper = mergeGeos([MG(cal, T4(ox - 0.05, 0, 0, -0.5, 0, 0), sport || type === 'muscle' ? 0xd22a2a : 0x3c3f44)]);
  geo.S = S;
  if (!lo) {
    // de cerca, menos llamadas de dibujo: carrocería y techo juntos (el mismo material), las dos
    // placas juntas y las 4 ruedas con sus calipers en una sola malla con huesos (ver makeCar)
    geo.paintAll = mergeGeos([{ geo: lower, c: null }, { geo: geo.cabin, c: 0xffffff }]);
    geo.paintPolice = mergeGeos([{ geo: lowerPolice, c: null }, { geo: geo.cabin, c: 0xffffff }]);
    geo.plates = mergeGeos([1, -1].map(sd => ({ geo: new THREE.PlaneGeometry(0.42, 0.11), m: T4(0, B.clr + 0.32, sd * (B.L / 2 + 0.065), 0, sd > 0 ? 0 : Math.PI, 0), c: 0xffffff })));
    geo.wheelsSkin = wheelSkinGeo(geo, B);
  }
  PLATE_LO = false;
  CAR_GEO[key] = geo;
  return geo;
}
// Posición de cada rueda: [lado, adelante/atrás]; las de la derecha (x < 0) van giradas.
const WHEEL_POS = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
// Las 4 ruedas en una malla: cada llanta va pegada a un "hueso" que gira (índices 0-3) y cada
// caliper al que dobla con la dirección (4-7). Los huesos son los grupos de cada rueda (makeCar).
function wheelSkinGeo(geo, B) {
  const parts = [], bone = [];
  const cnt = g => (g.index ? g.index.count : g.attributes.position.count);
  WHEEL_POS.forEach(([sx], i) => {
    const flip = sx < 0 ? new THREE.Matrix4().makeRotationY(Math.PI) : null;
    parts.push({ geo: geo.wheel, m: flip, c: null }); bone.push([i, cnt(geo.wheel)]);
    parts.push({ geo: geo.caliper, m: flip, c: null }); bone.push([4 + i, cnt(geo.caliper)]);
  });
  const g = mergeGeos(parts), n = g.attributes.position.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  let o = 0;
  for (const [b, c] of bone) for (let k = 0; k < c; k++, o++) { si[o * 4] = b; sw[o * 4] = 1; }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  return g;
}

// ---------- carros de lejos y estacionados: todo el carro en una malla ----------
// Atributos extra: aPaint (1 = pintura, se tiñe con el color del carro: uniforme uPaint o el color
// de la instancia) y aGlow (luz propia de faros y luces traseras, que se multiplica por
// CAR_LOD.glow: más fuerte de noche). Así un carro lejano es 1 llamada de dibujo.
const CAR_LOD = { glow: { value: 1 }, geo: {} };
const HEAD_GLOW = [0.8, 0.76, 0.66], TAIL_GLOW = [0.6, 0.05, 0.03];
function carLodGeo(type, level, lights = false, police = false) {
  const key = `${type}|${level}|${lights ? 1 : 0}|${police ? 1 : 0}`;
  if (CAR_LOD.geo[key]) return CAR_LOD.geo[key];
  const B = BODY[type], g = carGeo(type, level === 2 ? 2 : true);
  const parts = [];
  const add = (geo, m, c, paint, glow) => parts.push({ geo, m, c, paint, glow });
  add(police ? g.lowerPolice : g.lower, null, null, 1, null);
  add(g.cabin, null, 0xffffff, police ? 0 : 1, null);
  add(g.glass, null, null, 0, null);
  add(g.trim, null, null, 0, null);
  add(g.head, null, 0xf2f0e6, 0, lights ? HEAD_GLOW : null);
  add(g.tail, null, 0x8a1010, 0, lights ? TAIL_GLOW : null);
  for (const [sx, sz] of WHEEL_POS) {
    const m = new THREE.Matrix4().makeRotationY(sx < 0 ? Math.PI : 0).setPosition(sx * (B.W / 2 - 0.14), B.r, sz * B.wb / 2);
    add(g.wheel, m, null, 0, null);
  }
  // mancha oscura debajo (contacto con el piso)
  add(new THREE.PlaneGeometry(B.W * 0.92, B.L * 0.86).rotateX(-Math.PI / 2), new THREE.Matrix4().makeTranslation(0, 0.03, 0), 0x060606, 0, null);
  if (police) for (const p of policeParts(B)) add(p.geo, p.m, p.c, 0, null);
  const merged = mergeGeos(parts), n = merged.attributes.position.count;
  const ap = new Float32Array(n), ag = new Float32Array(n * 3);
  let o = 0;
  for (const p of parts) {
    const c = p.geo.index ? p.geo.index.count : p.geo.attributes.position.count;
    for (let k = 0; k < c; k++, o++) { ap[o] = p.paint; if (p.glow) ag.set(p.glow, o * 3); }
  }
  merged.setAttribute('aPaint', new THREE.BufferAttribute(ap, 1));
  merged.setAttribute('aGlow', new THREE.BufferAttribute(ag, 3));
  merged.computeBoundingSphere();
  return (CAR_LOD.geo[key] = merged);
}
// Sólo las posiciones (para el mapa de sombras).
function carShadowGeo(type) {
  const key = type + '|sombra';
  if (CAR_LOD.geo[key]) return CAR_LOD.geo[key];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', carLodGeo(type, 1).attributes.position);
  g.computeBoundingSphere();
  return (CAR_LOD.geo[key] = g);
}
function carLodMat(paint) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.3, envMapIntensity: 1.1 });
  const uPaint = { value: new THREE.Color(paint === undefined ? 0xffffff : paint) };
  m.userData.paint = uPaint.value;
  m.onBeforeCompile = sh => {
    sh.uniforms.uPaint = uPaint; sh.uniforms.uGlow = CAR_LOD.glow;
    sh.vertexShader = 'attribute float aPaint;\nattribute vec3 aGlow;\nvarying float vPaint;\nvarying vec3 vGlow;\n' + sh.vertexShader.replace('#include <color_vertex>', `#include <color_vertex>
      vPaint = aPaint; vGlow = aGlow;
      #ifdef USE_INSTANCING_COLOR
        vColor.rgb = color.rgb * mix(vec3(1.0), instanceColor.rgb, aPaint);
      #endif`);
    sh.fragmentShader = 'uniform vec3 uPaint;\nuniform float uGlow;\nvarying float vPaint;\nvarying vec3 vGlow;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= mix(vec3(1.0), uPaint, vPaint);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n  roughnessFactor = mix(roughnessFactor, 0.3, vPaint); metalnessFactor = mix(metalnessFactor, 0.5, vPaint);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += vGlow * uGlow;');
  };
  m.customProgramCacheKey = () => 'carLod';
  return m;
}

const SHARED = {};
function sharedMats() {
  if (SHARED.trim) return SHARED;
  SHARED.trim = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.5 });
  SHARED.glass = new THREE.MeshPhysicalMaterial({ color: 0x0b1118, roughness: 0.04, metalness: 0.3, clearcoat: 1, envMapIntensity: 1.6, side: THREE.DoubleSide });
  SHARED.wheel = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.55 });
  SHARED.plate = new THREE.MeshBasicMaterial({ map: PLATE = PLATE || plateTex() });
  SHARED.decal = new THREE.MeshBasicMaterial({ map: POLICE_DECAL = POLICE_DECAL || decalTex('POLICÍA'), transparent: true });
  SHARED.barGeo = new THREE.BoxGeometry(1, 0.12, 0.26);
  SHARED.blob = new THREE.MeshBasicMaterial({ map: BLOB = BLOB || blobTex(), transparent: true, depthWrite: false });
  const blobs = {};
  SHARED.blobGeo = B => blobs[B.L] || (blobs[B.L] = new THREE.PlaneGeometry(B.W * 1.5, B.L * 1.2));
  SHARED.shadow = new THREE.MeshBasicMaterial();
  return SHARED;
}
function blobTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 10, 64, 64, 62);
  r.addColorStop(0, 'rgba(0,0,0,0.75)'); r.addColorStop(0.6, 'rgba(0,0,0,0.4)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); return t;
}

// Piezas del patrullero que no son pintura: base de la circulina, defensa y antena.
function policeParts(B) {
  return [
    { geo: new THREE.BoxGeometry(B.W * 0.72, 0.07, 0.3), m: T4(0, B.roof + 0.04, (B.zR1 + B.zR2) / 2 + 0.1), c: 0x15161a },
    { geo: new THREE.BoxGeometry(B.W * 0.7, 0.32, 0.1), m: T4(0, B.clr + 0.32, B.L / 2 + 0.12), c: 0x0c0c0e },
    { geo: new THREE.CylinderGeometry(0.006, 0.006, 0.4, 5), m: T4(-B.W * 0.3, B.roof + 0.2, B.zR2 + 0.1), c: 0x111111 },
  ];
}
function policeGeo(type) {
  const geo = carGeo(type), B = BODY[type];
  if (geo.police) return geo.police;
  const dz = (B.zW + B.zB) / 2 + 0.1, dl = (B.zW - B.zB) * 0.95;
  return (geo.police = {
    trim: mergeGeos([{ geo: geo.trim, c: null }, ...policeParts(B)]),
    decal: mergeGeos([-1, 1].map(sd => ({ geo: new THREE.PlaneGeometry(dl * 0.85, dl * 0.16), m: T4(sd * (B.W / 2 + 0.025), (B.belt + B.clr) / 2 + 0.05, dz, 0, sd * Math.PI / 2, 0), c: 0xffffff }))),
  });
}

// Arma un carro. spec: un CARS o { body, color }. opts: { police, cockpit }.
// De cerca (car.hi) son 8 llamadas de dibujo (11 el patrullero): carrocería con techo, vidrios,
// molduras, faros, luces traseras, placas, las 4 ruedas (una malla con huesos) y la sombra
// suave. La sombra de verdad la proyecta una copia liviana (shadowOnly). De lejos, setCarLod
// cambia todo por una sola malla (carLodGeo).
function makeCar(spec, opts = {}) {
  const type = BODY[spec.body] ? spec.body : 'sedan', B = BODY[type], geo = carGeo(type), S = sharedMats();
  const root = new THREE.Group(), body = new THREE.Group(), hi = new THREE.Group();
  root.add(body); body.add(hi);
  const police = !!opts.police, pg = police ? policeGeo(type) : null;
  const paint = new THREE.MeshPhysicalMaterial({ color: police ? 0xffffff : spec.color, vertexColors: true, roughness: 0.3, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.25 });
  const mk = (g, m) => { const o = new THREE.Mesh(g, m); hi.add(o); return o; };
  mk(police ? geo.paintPolice : geo.paintAll, paint);
  const cab = mk(geo.glass, S.glass);
  mk(police ? pg.trim : geo.trim, S.trim);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d8, emissiveIntensity: 0.8, roughness: 0.1 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x8a0a0a, emissive: 0xff1a10, emissiveIntensity: 0.5, roughness: 0.2 });
  mk(geo.head, headMat); mk(geo.tail, tailMat);
  mk(geo.plates, S.plate);
  // patrullero: puertas blancas, letras y circulina (la circulina se ve también de lejos)
  const bar = [];
  if (police) {
    mk(pg.decal, S.decal);
    const ry = B.roof + 0.04, rz = (B.zR1 + B.zR2) / 2 + 0.1;
    for (const sd of [-1, 1]) {
      const m = new THREE.MeshStandardMaterial({ color: sd < 0 ? 0xff2030 : 0x2050ff, emissive: sd < 0 ? 0xff1020 : 0x1040ff, emissiveIntensity: 0.4, roughness: 0.15, transparent: true, opacity: 0.92 });
      const l = new THREE.Mesh(S.barGeo, m); l.scale.set(B.W * 0.33, 1, 1);
      l.position.set(sd * B.W * 0.18, ry + 0.09, rz); body.add(l); bar.push(l);
    }
  }
  // ruedas: cada una es un grupo que dobla (w) con un hijo que gira (w.children[0]); la malla de
  // las 4 ruedas está pegada a esos 8 "huesos"
  const wheels = WHEEL_POS.map(([sx, sz]) => {
    const w = new THREE.Group(); w.position.set(sx * (B.W / 2 - 0.14), B.r, sz * B.wb / 2);
    w.add(new THREE.Object3D()); root.add(w);
    return w;
  });
  const bones = [...wheels.map(w => w.children[0]), ...wheels];
  const wheelMesh = new THREE.SkinnedMesh(geo.wheelsSkin, S.wheel);
  wheelMesh.bind(new THREE.Skeleton(bones, bones.map(() => new THREE.Matrix4())), new THREE.Matrix4());
  wheelMesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, B.r, 0), B.L / 2 + 0.3);
  root.add(wheelMesh);
  // sombra suave debajo (se ve aunque no haya sombras de verdad)
  const blob = new THREE.Mesh(S.blobGeo(B), S.blob);
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.04; blob.renderOrder = 1; root.add(blob);
  // la sombra de verdad: una copia liviana que sólo se dibuja en el pase de sombras
  const shadow = shadowOnly(new THREE.Mesh(carShadowGeo(type), S.shadow));
  body.add(shadow);
  const car = { root, body, hi, wheels, wheelMesh, blob, shadow, bar, paint, headMat, tailMat, B, type, police, cab, color: police ? 0xffffff : spec.color, lod: 0, far: null };
  if (opts.cockpit) makeCockpit(car);
  return car;
}
// Nivel de detalle: 0 completo, 1 liviano, 2 muy liviano (una malla con faros que brillan).
function setCarLod(car, k) {
  if (car.lod === k) return;
  car.lod = k;
  car.hi.visible = car.wheelMesh.visible = k === 0;
  car.blob.visible = k < 2;
  if (k > 0) {
    prepareCarLod(car);
    car.far.geometry = carLodGeo(car.type, k, true, car.police);
    car.far.visible = true;
  } else if (car.far) car.far.visible = false;
}
// Arma de antemano la malla de lejos (escondida) para que su material ya esté compilado.
function prepareCarLod(car) {
  if (car.far) return;
  car.farMat = carLodMat(car.color);
  car.far = new THREE.Mesh(carLodGeo(car.type, 1, true, car.police), car.farMat);
  car.far.visible = false; car.body.add(car.far);
}
// Libera lo que es sólo de este carro (las geometrías de afuera son compartidas por tipo; la
// cabina por dentro sí es propia: sus mallas, materiales y las pantallas dibujadas en vivo).
function disposeCar(car) {
  for (const m of [car.paint, car.headMat, car.tailMat, car.farMat, ...car.bar.map(b => b.material)]) if (m) m.dispose();
  car.wheelMesh.skeleton.dispose();
  SHADOW_ONLY.delete(car.shadow);
  if (car.cockpit) {
    car.cockpit.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    car.dashTex.dispose(); car.navTex.dispose();
  }
}

// Cabina por dentro: tablero con tablero de relojes, volante, consola, espejo, parantes,
// techo y puertas. El capó (la carrocería de afuera) se sigue viendo por el parabrisas.
let DASH_TEX = null;
function dashTex() {
  // plástico granulado del tablero
  if (DASH_TEX) return DASH_TEX;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); g.fillStyle = '#4a4d55'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.06})`; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
  DASH_TEX = new THREE.CanvasTexture(c); DASH_TEX.colorSpace = THREE.SRGBColorSpace; DASH_TEX.wrapS = DASH_TEX.wrapT = THREE.RepeatWrapping; DASH_TEX.repeat.set(4, 2);
  return DASH_TEX;
}
function rod(a, b, r, mat) {
  // cilindro de a hasta b (para parantes)
  const d = new THREE.Vector3().subVectors(b, a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.15, d.length(), 10), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}
function makeCockpit(car) {
  // La carrocería se corta por detrás del parabrisas (plano de recorte) y adentro se arma la cabina.
  const B = car.B, ck = new THREE.Group(), y0 = B.belt, front = B.zW;
  const cw = B.W * 0.86, dx = 0.37;                           // ancho de la cabina, el chofer va a la izquierda (+x)
  const eye = new THREE.Vector3(dx, Math.min(y0 + 0.36, B.roof - 0.12), front - 1.3);
  const dash = new THREE.MeshStandardMaterial({ color: 0x9a9ca2, map: dashTex(), roughness: 0.82 });
  const soft = new THREE.MeshStandardMaterial({ color: 0x2a2c31, roughness: 0.9 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xc9ccd2, roughness: 0.25, metalness: 0.9 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.6 });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); ck.add(m); return m; };
  // tablero
  const dz = 0.8, back = front - dz + 0.02;
  add(new THREE.BoxGeometry(B.W - 0.1, 0.44, dz), dash, 0, y0 - 0.16, front - dz / 2 + 0.02);
  add(new THREE.CylinderGeometry(0.09, 0.09, B.W - 0.1, 18, 1, false, 0, Math.PI), dash, 0, y0 + 0.06, back + 0.08, 0, 0, Math.PI / 2);
  // visera de los relojes, relojes, pantalla y salidas de aire
  const vr = Math.min(0.12, (eye.y - y0) * 0.32);
  add(new THREE.CylinderGeometry(vr, vr, 0.16, 20, 1, true, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: 0x1e2024, roughness: 0.85, side: THREE.DoubleSide }), dx, y0 + 0.1, back - 0.02, -Math.PI / 2, 0, 0);
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 192;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  add(new THREE.PlaneGeometry(0.3, 0.112), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), dx, y0 + 0.04, back - 0.005, -0.12, Math.PI, 0);
  const ncv = document.createElement('canvas'); ncv.width = 256; ncv.height = 160;
  const ntex = new THREE.CanvasTexture(ncv); ntex.colorSpace = THREE.SRGBColorSpace;
  add(new THREE.PlaneGeometry(0.22, 0.137), new THREE.MeshBasicMaterial({ map: ntex, toneMapped: false }), 0, y0 - 0.06, back - 0.005, -0.1, Math.PI, 0);
  for (const x of [-cw / 2 + 0.14, -0.17, 0.17, cw / 2 - 0.14]) add(new THREE.BoxGeometry(0.1, 0.045, 0.02), chrome, x, y0 - 0.17, back - 0.005);
  // consola entre los asientos, piso y puertas por dentro
  add(new THREE.BoxGeometry(0.3, 0.3, 1.2), dash, 0, y0 - 0.42, back - 0.6);
  add(new THREE.BoxGeometry(B.W - 0.1, 0.04, front - B.zB), soft, 0, B.clr + 0.16, (front + B.zB) / 2);
  for (const sd of [-1, 1]) {
    add(new THREE.BoxGeometry(0.06, y0 - B.clr - 0.1, front - B.zB), soft, sd * (B.W / 2 - 0.06), (y0 + B.clr + 0.1) / 2 + 0.05, (front + B.zB) / 2);
    add(new THREE.BoxGeometry(0.12, 0.05, front - B.zB - 0.2), dash, sd * (B.W / 2 - 0.1), y0 + 0.08, (front + B.zB) / 2 - 0.1);
    add(new THREE.BoxGeometry(0.03, 0.04, 0.22), chrome, sd * (B.W / 2 - 0.1), y0 - 0.12, back - 0.5);
  }
  // asientos (se ven al costado)
  for (const x of [dx, -dx]) {
    add(new THREE.BoxGeometry(0.5, 0.14, 0.5), leather, x, y0 - 0.32, eye.z - 0.05);
    add(new THREE.BoxGeometry(0.5, 0.7, 0.12), leather, x, y0 + 0.02, eye.z - 0.33, -0.18, 0, 0);
  }
  // volante
  const wheelG = new THREE.Group(); wheelG.position.set(dx, eye.y - 0.38, eye.z + 0.44); wheelG.rotation.x = 0.38;
  const steer = new THREE.Group(); wheelG.add(steer);
  steer.add(new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.026, 12, 40), leather));
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.06, 18).rotateX(Math.PI / 2), soft); steer.add(hub);
  for (const a of [Math.PI / 2, -Math.PI / 2, Math.PI]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.035, 0.02), soft); s.position.set(Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0); s.rotation.z = a; steer.add(s); }
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.03), new THREE.MeshBasicMaterial({ color: 0xff3b3b })); mark.position.set(0, 0.185, 0); steer.add(mark);
  wheelG.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.36, 10).rotateX(Math.PI / 2).translate(0, 0, 0.2), soft));
  ck.add(wheelG);
  // manos con guantes en el volante (a las 10 y 2) y brazos desde los hombros
  const glove = new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.7 });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x2d3a52, roughness: 0.85 });
  const hands = [];
  for (const sd of [-1, 1]) {
    const h = new THREE.Group(); const a = Math.PI / 2 + sd * 1.0;
    h.position.set(Math.cos(a) * 0.185, Math.sin(a) * 0.185, 0.012); h.rotation.z = a - Math.PI / 2;
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), glove); palm.scale.set(1.15, 0.85, 0.75); h.add(palm);
    for (let f = 0; f < 4; f++) { const fg = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.03, 3, 6), glove); fg.position.set(-0.027 + f * 0.018, -0.02, 0.03); fg.rotation.x = 1.2; h.add(fg); }
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.03, 3, 6), glove); th.position.set(-sd * 0.035, 0.015, 0.02); th.rotation.z = sd * 0.9; h.add(th);
    steer.add(h);
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.04, 1, 12), sleeve), upper = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.038, 1, 12), sleeve);
    ck.add(fore, upper);
    hands.push({ h, fore, upper, sd, shoulder: new THREE.Vector3(dx - sd * 0.21, eye.y - 0.34, eye.z - 0.06) });
  }
  car.hands = hands;
  // parantes del parabrisas, parante del medio, techo y espejo
  const pil = new THREE.MeshStandardMaterial({ color: 0x2b2d32, roughness: 0.85 });
  for (const sd of [-1, 1]) {
    ck.add(rod(new THREE.Vector3(sd * (cw / 2 + 0.02), y0 + 0.06, front + 0.02), new THREE.Vector3(sd * (cw / 2 - 0.1), B.roof - 0.04, B.zR1), 0.045, pil));
    ck.add(rod(new THREE.Vector3(sd * (cw / 2), y0, (B.zR1 + B.zR2) / 2 - 0.1), new THREE.Vector3(sd * (cw / 2 - 0.08), B.roof - 0.04, (B.zR1 + B.zR2) / 2 - 0.1), 0.06, pil));
    add(new THREE.BoxGeometry(0.05, 0.11, 0.18), pil, sd * (B.W / 2 + 0.08), y0 + 0.14, front - 0.1, 0, sd * 0.2, 0);
  }
  add(new THREE.BoxGeometry(cw, 0.06, 0.12), pil, 0, B.roof - 0.05, B.zR1 - 0.02);
  add(new THREE.BoxGeometry(cw, 0.03, Math.max(0.3, B.zR1 - B.zR2) + 0.1), new THREE.MeshStandardMaterial({ color: 0x8d8a84, roughness: 0.95 }), 0, B.roof - 0.03, (B.zR1 + B.zR2) / 2);
  add(new THREE.BoxGeometry(0.02, 0.07, 0.02), pil, 0, B.roof - 0.1, B.zR1 - 0.1);
  add(new THREE.BoxGeometry(0.26, 0.075, 0.03), pil, 0, B.roof - 0.16, B.zR1 - 0.12);
  add(new THREE.PlaneGeometry(0.24, 0.06), new THREE.MeshStandardMaterial({ color: 0x9fb6cc, roughness: 0.05, metalness: 1 }), 0, B.roof - 0.16, B.zR1 - 0.137, 0, Math.PI, 0);
  // reflejo leve en el parabrisas
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(cw, Math.hypot(B.roof - y0, B.zR1 - front)), new THREE.MeshPhysicalMaterial({ color: 0x9fc4e8, transparent: true, opacity: 0.07, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide }));
  ws.position.set(0, (B.roof + y0) / 2, (B.zR1 + front) / 2); ws.rotation.x = Math.atan2(front - B.zR1, B.roof - y0) - Math.PI / 2; ck.add(ws);
  car.body.add(ck);
  car.cockpit = ck; car.steerWheel = steer; car.dashCv = cv; car.dashTex = tex; car.navCv = ncv; car.navTex = ntex;
  car.eye = eye;
  car.clip = new THREE.Plane();
  ck.visible = false;
}
// Con la cámara adentro, la pintura de la carrocería se recorta detrás del parabrisas.
function setCockpitClip(car, on) {
  car.paint.clippingPlanes = on ? [car.clip] : null;
  car.paint.needsUpdate = true;
}
const _cn = new THREE.Vector3(), _cp = new THREE.Vector3();
function updateCockpitClip(car) {
  car.body.updateMatrixWorld();
  _cn.set(0, 0, 1).transformDirection(car.body.matrixWorld);
  _cp.set(0, 0, car.B.zW - 0.03).applyMatrix4(car.body.matrixWorld);
  car.clip.setFromNormalAndCoplanarPoint(_cn, _cp);
}

// Dibuja los relojes: velocímetro, tacómetro, marcha y vida.
function drawDash(car, s) {
  const g = car.dashCv.getContext('2d'), W = 512, H = 192;
  const kmh = Math.abs(s.f) * 3.6;
  g.fillStyle = '#05070b'; g.fillRect(0, 0, W, H);
  const dial = (cx, val, max, label, ticks, red, txt) => {
    const r = 82, a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    g.lineWidth = 5; g.strokeStyle = '#1b2230'; g.beginPath(); g.arc(cx, 96, r, a0, a1); g.stroke();
    if (red) { g.strokeStyle = '#b3202a'; g.beginPath(); g.arc(cx, 96, r, a0 + (a1 - a0) * red, a1); g.stroke(); }
    g.strokeStyle = '#d9e4f2'; g.lineWidth = 2;
    for (let i = 0; i <= ticks; i++) { const a = a0 + (a1 - a0) * i / ticks; g.beginPath(); g.moveTo(cx + Math.cos(a) * (r - 4), 96 + Math.sin(a) * (r - 4)); g.lineTo(cx + Math.cos(a) * (r - 14), 96 + Math.sin(a) * (r - 14)); g.stroke(); }
    const a = a0 + (a1 - a0) * clamp(val / max, 0, 1);
    g.strokeStyle = '#ff3b3b'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, 96); g.lineTo(cx + Math.cos(a) * (r - 10), 96 + Math.sin(a) * (r - 10)); g.stroke();
    g.fillStyle = '#ff3b3b'; g.beginPath(); g.arc(cx, 96, 7, 0, 7); g.fill();
    g.fillStyle = '#e8f3ff'; g.font = '700 30px Arial'; g.textAlign = 'center'; g.fillText(txt, cx, 150);
    g.fillStyle = '#7f8ba0'; g.font = '600 13px Arial'; g.fillText(label, cx, 172);
  };
  dial(110, s.rpm, 7500, 'x1000 rpm', 15, 0.8, s.gear < 0 ? 'R' : s.gear);
  dial(402, kmh, 260, 'km/h', 13, 0, Math.round(kmh));
  // vida al medio
  const hp = s.hp / s.hpMax;
  g.fillStyle = '#1b2230'; g.fillRect(226, 70, 60, 10); g.fillStyle = hp < 0.3 ? '#ff4d4d' : hp < 0.6 ? '#ffc53d' : '#3ddc84'; g.fillRect(226, 70, 60 * hp, 10);
  g.fillStyle = '#7f8ba0'; g.font = '600 12px Arial'; g.textAlign = 'center'; g.fillText('MOTOR', 256, 62);
  if (s.nitro !== undefined) { g.fillStyle = '#1b2230'; g.fillRect(226, 108, 60, 10); g.fillStyle = '#3fb6ff'; g.fillRect(226, 108, 60 * s.nitro, 10); g.fillStyle = '#7f8ba0'; g.fillText('NITRO', 256, 100); }
  car.dashTex.needsUpdate = true;
}
// Pantalla de la consola: un mapa chico con el norte arriba.
function drawNav(car, s) {
  const g = car.navCv.getContext('2d'), W = 256, H = 160, k = 0.55;
  g.fillStyle = '#0b1220'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#3a4659'; g.lineWidth = ROAD_W * k;
  const tx = x => W / 2 - (x - s.x) * k, tz = z => H / 2 - (z - s.z) * k;
  for (const c of GRID) { g.beginPath(); g.moveTo(tx(c), 0); g.lineTo(tx(c), H); g.stroke(); g.beginPath(); g.moveTo(0, tz(c)); g.lineTo(W, tz(c)); g.stroke(); }
  if (typeof G !== 'undefined' && G.thief && G.thief.body !== s) { g.fillStyle = '#ff8a00'; g.beginPath(); g.arc(tx(G.thief.body.x), tz(G.thief.body.z), 5, 0, 7); g.fill(); }
  if (typeof G !== 'undefined') for (const c of G.cops || []) if (c.body !== s) { g.fillStyle = '#3070ff'; g.beginPath(); g.arc(tx(c.body.x), tz(c.body.z), 4, 0, 7); g.fill(); }
  g.save(); g.translate(W / 2, H / 2); g.rotate(Math.PI - s.h); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(0, 3); g.lineTo(-6, 7); g.closePath(); g.fill(); g.restore();
  car.navTex.needsUpdate = true;
}

function poseCockpit(car, s) {
  if (!car.cockpit || !car.cockpit.visible) return;
  updateCockpitClip(car);
  car.steerWheel.rotation.z = s.steer * 2.4;
  // brazos: del hombro al codo (afuera y abajo) y del codo a la mano que sigue al volante
  if (car.hands) {
    const ck = car.cockpit, hp = new THREE.Vector3(), el = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    ck.updateMatrixWorld();
    const place = (m, a, b) => { const d = b.clone().sub(a); m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, d.length(), 1); m.quaternion.setFromUnitVectors(up, d.normalize()); };
    for (const H of car.hands) {
      H.h.getWorldPosition(hp); ck.worldToLocal(hp);
      el.copy(H.shoulder).lerp(hp, 0.5); el.x -= H.sd * 0.1; el.y -= 0.14;
      place(H.upper, H.shoulder, el); place(H.fore, el, hp);
    }
  }
  car.dashT = (car.dashT || 0) + 1;
  if (car.dashT % 2 === 0) drawDash(car, s);
  if (car.dashT % 6 === 0) drawNav(car, s);
}

// ---------- física ----------
function newBody(spec, x, z, h) {
  return { spec, x, z, y: groundH(x, z), h, vx: 0, vz: 0, vy: 0, f: 0, l: 0, steer: 0, hp: spec.hp, hpMax: spec.hp,
    air: false, airT: 0, jumpFrom: null, slide: 0, rpm: 900, gear: 1, pitch: 0, roll: 0, grass: false, hit: 0, dead: false, odo: 0, mass: spec.mass || 1 };
}

// Un paso. inp = { thr, brk, steer, hand }. ev(nombre, datos) para choques y saltos.
function stepBody(c, inp, dt, ev) {
  const sp = c.spec;
  const fx = Math.sin(c.h), fz = Math.cos(c.h), rx = -fz, rz = fx;
  let f = c.vx * fx + c.vz * fz, l = c.vx * rx + c.vz * rz;
  // nitro (sólo el jugador lo tiene): más empuje y más velocidad tope mientras dure
  c.boost = !!(inp.nitro && c.nitro > 0.02 && !c.dead && f > -0.5);
  if (c.nitro !== undefined) c.nitro = clamp(c.nitro + (c.boost ? -0.32 : 0.035 + (c.slide > 3 || c.air ? 0.12 : 0)) * dt, 0, 1);
  const top = sp.top * (c.topMul || 1) * (c.dead ? 0.15 : 1) * (c.boost ? 1.22 : 1);
  if (!c.air) {
    c.grass = !onRoad(c.x, c.z);
    const grip = sp.grip * (c.grass ? 0.78 : 1) * (inp.hand ? 0.5 : 1);
    let a = 0;
    if (inp.thr > 0 && f > -0.5) a += sp.acc * inp.thr * Math.max(0, 1 - Math.pow(Math.max(0, f) / top, 2.4));
    if (c.boost) a += sp.acc * 0.9 * Math.max(0, 1 - Math.pow(Math.max(0, f) / top, 2));
    // frenar parado es reversa, salvo que sea "quedarse quieto" (stop)
    if (inp.brk > 0) { if (f > 0.5) a -= sp.brake * inp.brk; else if (inp.stop) a -= Math.sign(f) * Math.min(Math.abs(f) / dt, sp.brake); else if (inp.thr <= 0) a -= 5 * inp.brk; }
    if (inp.thr <= 0 && inp.brk <= 0) a -= Math.sign(f) * Math.min(Math.abs(f) / dt, 1.2 + Math.abs(f) * 0.02);
    if (inp.hand) a -= Math.sign(f) * 3;
    a -= f * Math.abs(f) * 0.0007 + (c.grass ? f * 0.25 : 0);
    f += a * dt;
    if (f < -9) f = -9;
    const fa = Math.max(Math.abs(f), 1);
    const maxA = Math.min(0.6, Math.atan(1.25 * sp.grip * 9.8 * 2.7 / (fa * fa)));
    let yaw = f / 2.7 * Math.tan(inp.steer * maxA) / (1 + Math.abs(l) * 0.15);
    if (inp.hand && Math.abs(f) > 6) yaw *= 1.7;
    c.h -= yaw * dt;
    const nfx = Math.sin(c.h), nfz = Math.cos(c.h), nrx = -nfz, nrz = nfx;
    const vx = f * fx + l * rx, vz = f * fz + l * rz;
    f = vx * nfx + vz * nfz; l = vx * nrx + vz * nrz;
    const lmax = grip * 9.8 * dt;
    if (Math.abs(l) <= lmax) l = 0; else { l -= Math.sign(l) * lmax; f *= 1 - 0.2 * dt; }
    c.slide = Math.abs(l);
    c.vx = f * nfx + l * nrx; c.vz = f * nfz + l * nrz;
    c.yawRate = yaw;
  } else {
    // en el aire: sigue de largo, gira un poco
    c.h -= (c.yawRate || 0) * 0.3 * dt;
    c.vx *= 1 - 0.02 * dt; c.vz *= 1 - 0.02 * dt;
    f = c.vx * fx + c.vz * fz;
  }
  c.f = f; c.l = l;
  const ox = c.x, oz = c.z;
  c.x += c.vx * dt; c.z += c.vz * dt;
  c.odo += Math.abs(f) * dt;
  // altura: sigue el piso; si el piso se cae (punta de la rampa) sale volando
  const g0 = groundH(ox, oz), g1 = groundH(c.x, c.z);
  if (!c.air) {
    if (g1 >= c.y - 0.15) { c.vy = (g1 - c.y) / dt; c.y = g1; }
    else { c.air = true; c.airT = 0; c.jumpFrom = { x: c.x, z: c.z }; }
    c.vy = Math.min(c.vy, 9);
  }
  if (c.air) {
    c.airT += dt;
    c.vy -= 9.8 * dt; c.y += c.vy * dt;
    if (c.y <= g1) {
      const imp = -c.vy;
      c.y = g1; c.air = false;
      const dist = c.jumpFrom ? Math.hypot(c.x - c.jumpFrom.x, c.z - c.jumpFrom.z) : 0;
      ev('aterriza', { c, imp, dist });
      c.vy = 0;
    }
  }
  // inclinación visual
  const slope = (g1 - g0) / Math.max(0.01, Math.hypot(c.x - ox, c.z - oz));
  const tp = c.air ? clamp(-c.vy * 0.03, -0.35, 0.35) : -Math.atan(slope) * Math.sign(f || 1);
  c.pitch += (tp - c.pitch) * Math.min(1, dt * 8);
  c.roll += (clamp(-(c.yawRate || 0) * f * 0.004, -0.08, 0.08) - c.roll) * Math.min(1, dt * 6);
  // caja automática para el sonido y el tacómetro
  const gears = [0, 9, 17, 26, 36, 47, 70].map(v => v * top / 50);
  let g = 1; while (g < 6 && Math.abs(f) > gears[g]) g++;
  c.gear = f < -0.3 ? -1 : g;
  const lo = gears[g - 1], hi = gears[g];
  c.rpm += ((1000 + 5800 * clamp((Math.abs(f) - lo * 0.5) / (hi - lo * 0.5), 0, 1.05) * (inp.thr > 0 ? 1 : 0.8)) - c.rpm) * Math.min(1, dt * 8);
  if (c.air) c.rpm += (7000 - c.rpm) * dt * 3;
}

// Choques contra lo fijo: paredes rojas del borde, casas, árboles, cerro y canal.
// El carro es tres círculos a lo largo (adelante, medio y atrás).
function collideStatic(c, ev) {
  const fx = Math.sin(c.h), fz = Math.cos(c.h), half = c.spec.body ? (BODY[c.spec.body] || BODY.sedan).L / 2 - 0.9 : 1.4;
  const R = 1.0;
  for (const k of [-1, 0, 1]) {
    let px = c.x + fx * half * k, pz = c.z + fz * half * k;
    // pared roja
    const lim = LIMIT - R;
    for (const [ax, sg] of [['x', 1], ['x', -1], ['z', 1], ['z', -1]]) {
      const v = ax === 'x' ? px : pz;
      if (v * sg > lim) {
        const pen = v * sg - lim;
        if (ax === 'x') { c.x -= sg * pen; px -= sg * pen; } else { c.z -= sg * pen; pz -= sg * pen; }
        const vn = (ax === 'x' ? c.vx : c.vz) * sg;
        if (vn > 0) { if (ax === 'x') c.vx -= sg * vn * 1.4; else c.vz -= sg * vn * 1.4; hitDamage(c, vn, ev, 'pared', px, pz); }
      }
    }
    for (const s of solidsNear(px, pz)) {
      if (c.y > s.h) continue;
      const cx = clamp(px, s.x0, s.x1), cz = clamp(pz, s.z0, s.z1);
      let dx = px - cx, dz = pz - cz, d2 = dx * dx + dz * dz;
      if (d2 >= R * R) continue;
      let nx, nz, pen;
      if (d2 > 1e-6) { const d = Math.sqrt(d2); nx = dx / d; nz = dz / d; pen = R - d; }
      else {
        // el centro quedó adentro: sale por el lado más cercano
        const opts = [[px - s.x0, -1, 0], [s.x1 - px, 1, 0], [pz - s.z0, 0, -1], [s.z1 - pz, 0, 1]].sort((a, b) => a[0] - b[0]);
        nx = opts[0][1]; nz = opts[0][2]; pen = opts[0][0] + R;
      }
      c.x += nx * pen; c.z += nz * pen; px += nx * pen; pz += nz * pen;
      const vn = -(c.vx * nx + c.vz * nz);
      if (vn > 0) {
        c.vx += nx * vn * 1.3; c.vz += nz * vn * 1.3;
        const keep = 1 - Math.min(0.5, 0.05 + vn * 0.03); c.vx *= keep; c.vz *= keep;
        hitDamage(c, vn, ev, s.kind, px - nx * R, pz - nz * R);
      }
    }
  }
}
function hitDamage(c, vn, ev, kind, x, z) {
  if (vn < 1.5) return;
  const dmg = vn * 1.5 / (c.mass || 1) * (c.actor && c.actor.role === 'policia' ? 0.6 : 1);
  c.hp = Math.max(0, c.hp - dmg);
  ev('choque', { c, vn, kind, x, z });
}

// Choques entre carros (dos círculos por carro). Los pesados empujan más.
function collideCars(a, b, ev) {
  const dx0 = a.x - b.x, dz0 = a.z - b.z;
  if (dx0 * dx0 + dz0 * dz0 > 49 || Math.abs(a.y - b.y) > 1.6) return;
  const ca = [], cb = [];
  for (const [c, out] of [[a, ca], [b, cb]]) {
    const L = (BODY[c.spec.body] || BODY.sedan).L / 2 - 0.95, fx = Math.sin(c.h), fz = Math.cos(c.h);
    out.push([c.x + fx * L, c.z + fz * L], [c.x - fx * L, c.z - fz * L]);
  }
  const R = 1.0;
  for (const p of ca) for (const q of cb) {
    let dx = p[0] - q[0], dz = p[1] - q[1], d = Math.hypot(dx, dz);
    if (d >= 2 * R || d < 1e-4) continue;
    const nx = dx / d, nz = dz / d, pen = 2 * R - d;
    const ma = a.mass, mb = b.mass, tot = ma + mb;
    a.x += nx * pen * mb / tot; a.z += nz * pen * mb / tot; b.x -= nx * pen * ma / tot; b.z -= nz * pen * ma / tot;
    const rv = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
    if (rv < 0) {
      const j = -(1 + 0.25) * rv / (1 / ma + 1 / mb);
      a.vx += j * nx / ma; a.vz += j * nz / ma; b.vx -= j * nx / mb; b.vz -= j * nz / mb;
      // un empujón de costado hace girar al otro
      a.h += clamp((Math.random() - 0.5) * -rv * 0.02, -0.15, 0.15); b.h += clamp((Math.random() - 0.5) * -rv * 0.02, -0.15, 0.15);
      ev('choqueCarro', { a, b, imp: -rv, x: (p[0] + q[0]) / 2, z: (p[1] + q[1]) / 2 });
    }
  }
}

// Copia la física al modelo 3D.
function poseCar(car, c, dt, t) {
  car.root.position.set(c.x, c.y, c.z);
  car.root.rotation.set(0, c.h, 0, 'YXZ');
  car.body.rotation.set(c.pitch, 0, c.roll, 'YXZ');
  const spin = c.f / car.B.r * dt;
  car.wheels.forEach((w, i) => { w.children[0].rotation.x += spin; if (i < 2) w.rotation.y = -c.steer * 0.5; });
  if (car.bar.length && car.sirenOn) {
    const ph = Math.floor(t * 8) % 2;
    car.bar[0].material.emissiveIntensity = ph ? 3 : 0.15; car.bar[1].material.emissiveIntensity = ph ? 0.15 : 3;
  }
  car.tailMat.emissiveIntensity = c.braking ? 2.2 : (W.time === 'noche' ? 0.8 : 0.3);
}
