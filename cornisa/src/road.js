'use strict';
// Drive In The Serrín: genera la carretera de cada montaña (línea central cada 1 m), los bordes
// (pared o abismo), el perfil del cerro a cada lado, monedas, rocas y letreros.
//
// Convenciones: rumbo h, el frente apunta a (sin h, cos h) en (x, z); la normal derecha
// es (-cos h, sin h). d > 0 es a la derecha del eje. k > 0 gira a la izquierda.

const DEG = Math.PI / 180;
const SHOULDER = 0.7;          // berma de tierra a cada lado del asfalto
const PROF_STEP = 2;           // el perfil del cerro se calcula cada 2 m
const PROF_N = 8;              // puntos del perfil a cada lado
const OFF_WALL = [0, 1.0, 2.6, 6, 12, 22, 40, 70];
const OFF_DROP = [0, 1.2, 3.0, 7, 14, 26, 45, 0];   // el último se calcula (llega al valle)
const H_WALL = [0.12, 0.9, 4.2, 11, 21, 33, 48, 62];
const H_DROP = [-0.05, -1.8, -10, -24, -42, -62, -82, 0];
const N_AMP = [0, 0.15, 0.9, 2.5, 4.5, 7, 9, 6];

// Ruido de valor 2D (suave) para que la roca no se vea lisa.
function hash2(x, z) { let h = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sz;
}
const fbm = (x, z) => vnoise(x, z) * 0.6 + vnoise(x * 2.3 + 7, z * 2.3 - 3) * 0.3 + vnoise(x * 5.1, z * 5.1) * 0.1;

function buildRoad(L) {
  const r = rng(L.seed);
  const n = L.len + 1;
  const k = new Float32Array(n);
  const curves = [];
  const HM = 1.3;              // el rumbo no se aleja más de ~75° de la dirección general: la ruta nunca se cruza
  const end = n - 80;
  let i = 60, h = 0;
  while (i < end) {
    i += Math.round(18 + r() * 75);
    let A = (0.3 + r() * 0.7) * L.ang * DEG;
    let sg = r() < 0.5 ? -1 : 1;
    if (Math.abs(h + sg * A) > HM) sg = -sg;
    if (Math.abs(h + sg * A) > HM) A = Math.max(0.25, HM - sg * h - 0.05);
    const R = L.rMin + r() * (L.rMax - L.rMin) * (A > 1.3 ? 0.35 : A > 0.9 ? 0.7 : 1);
    const T = Math.min(22, Math.max(8, R * 0.35));
    const P = Math.max(0, Math.round(A * R - T));
    const len = Math.round(2 * T + P);
    if (i + len >= end) break;
    for (let j = 0; j < len; j++) {
      const f = j < T ? j / T : j > T + P ? (len - j) / T : 1;
      k[i + j] = sg / R * f;
    }
    curves.push({ s0: i, len, sg, R, A });
    i += len;
    h += sg * A;
  }
  // Integra la línea central.
  const x = new Float32Array(n), z = new Float32Array(n), y = new Float32Array(n), hd = new Float32Array(n);
  const g = new Float32Array(n);
  let hh = 0, gs = 0, gt = 0, nextG = 0;
  y[0] = L.y0;
  for (let s = 0; s < n; s++) {
    if (s > 0) {
      const hm = hh + k[s] * 0.5;
      x[s] = x[s - 1] + Math.sin(hm); z[s] = z[s - 1] + Math.cos(hm);
      hh += k[s];
    }
    hd[s] = hh;
    if (s >= nextG) {
      nextG = s + 120 + Math.floor(r() * 140);
      gt = r() < 0.18 ? -0.02 - r() * 0.02 : L.grade[0] + r() * (L.grade[1] - L.grade[0]);
    }
    const flat = s < 45 || s > n - 60;
    gs += ((flat ? 0 : gt) - gs) * 0.02;
    g[s] = gs;
    if (s > 0) y[s] = y[s - 1] + gs;
  }
  // Bordes: tramos de pared o abismo. wL/wR = 1 es abismo.
  const tL = new Float32Array(n), tR = new Float32Array(n), gL = new Uint8Array(n), gR = new Uint8Array(n);
  const types = Object.keys(L.mix), runs = [];
  for (let s = 0; s < n;) {
    const len = 90 + Math.floor(r() * 160);
    let ty = 'C';
    if (s >= 40) {
      let p = r(), acc = 0;
      for (const t of types) { acc += L.mix[t]; if (p <= acc) { ty = t; break; } }
    }
    const guardL = r() < L.guard, guardR = r() < L.guard;
    runs.push({ s, len, ty });
    for (let j = s; j < Math.min(n, s + len); j++) {
      tL[j] = ty === 'L' || ty === 'B' ? 1 : 0;
      tR[j] = ty === 'R' || ty === 'B' ? 1 : 0;
      gL[j] = guardL ? 1 : 0; gR[j] = guardR ? 1 : 0;
    }
    s += len;
  }
  const smooth = (src, rad) => {
    const out = new Float32Array(n);
    let acc = 0, cnt = 0;
    for (let j = -rad; j < n + rad; j++) {
      const a = j + rad, b = j - rad - 1;
      if (a < n && a >= 0) { acc += src[a]; cnt++; }
      if (b >= 0 && b < n) { acc -= src[b]; cnt--; }
      if (j >= 0 && j < n) out[j] = acc / cnt;
    }
    return out;
  };
  const wL = smooth(tL, 14), wR = smooth(tR, 14);
  for (let s = 0; s < n; s++) { gL[s] = gL[s] && wL[s] > 0.3 ? 1 : 0; gR[s] = gR[s] && wR[s] > 0.3 ? 1 : 0; }
  // Curvatura suavizada (el mayor valor cerca) para no doblar el cerro en el lado de adentro.
  const kAbs = new Float32Array(n);
  for (let s = 0; s < n; s++) {
    let m = 0;
    for (let j = Math.max(0, s - 24); j <= Math.min(n - 1, s + 24); j += 3) if (Math.abs(k[j]) > Math.abs(m)) m = k[j];
    kAbs[s] = m;
  }
  const nx = new Float32Array(n), nz = new Float32Array(n);
  for (let s = 0; s < n; s++) { nx[s] = -Math.cos(hd[s]); nz[s] = Math.sin(hd[s]); }
  let ymin = Infinity, ymax = -Infinity;
  for (let s = 0; s < n; s++) { ymin = Math.min(ymin, y[s]); ymax = Math.max(ymax, y[s]); }
  const T = { L, n, x, z, y, h: hd, k, g, nx, nz, wL, wR, gL, gR, kAbs, curves, runs, hw: L.hw,
    valleyY: ymin - L.depth, ymax };
  buildProfile(T);
  placeItems(T, r);
  return T;
}

// Perfil del cerro a cada lado (cada 2 m): posiciones del mundo y alturas.
function buildProfile(T) {
  const m = Math.floor((T.n - 1) / PROF_STEP) + 1;
  T.pm = m;
  T.po = [new Float32Array(m * PROF_N), new Float32Array(m * PROF_N)];   // desplazamiento desde el eje
  T.ph = [new Float32Array(m * PROF_N), new Float32Array(m * PROF_N)];   // altura absoluta
  const edge = T.hw + SHOULDER;
  for (let j = 0; j < m; j++) {
    const s = Math.min(T.n - 1, j * PROF_STEP);
    const ys = T.y[s];
    for (let side = 0; side < 2; side++) {
      const w = side === 0 ? T.wL[s] : T.wR[s];
      const sgn = side === 0 ? -1 : 1;
      // lado de adentro de la curva: comprime el perfil para que no se doble sobre sí mismo
      const kk = T.kAbs[s];
      const inner = (kk > 0 && side === 0) || (kk < 0 && side === 1);
      const dropFar = 50 + Math.max(30, (ys - T.valleyY) * 0.7);
      let sc = 1;
      if (inner && Math.abs(kk) > 1e-4) {
        const lim = 0.8 / Math.abs(kk) - edge;
        sc = Math.max(0.1, Math.min(1, lim / (OFF_WALL[PROF_N - 1] * (1 - w) + dropFar * w)));
      }
      for (let q = 0; q < PROF_N; q++) {
        const oW = OFF_WALL[q], oD = q === PROF_N - 1 ? dropFar : OFF_DROP[q];
        const off = edge + (oW + (oD - oW) * w) * (q < 2 ? Math.max(sc, 0.5) : sc);
        const wx = T.x[s] + T.nx[s] * off * sgn, wz = T.z[s] + T.nz[s] * off * sgn;
        const nn = (fbm(wx * 0.045, wz * 0.045) - 0.5) * 2;
        const hw = H_WALL[q] * (1 + nn * 0.35) + nn * N_AMP[q];
        let hd = q === PROF_N - 1 ? T.valleyY - ys : Math.max(H_DROP[q] + nn * N_AMP[q] * 0.6, T.valleyY - ys + 3);
        if (q > 0 && q < PROF_N - 1) hd = Math.min(hd, -0.6);
        const idx = j * PROF_N + q;
        T.po[side][idx] = off;
        T.ph[side][idx] = ys + hw + (hd - hw) * w;
      }
    }
  }
}

// Altura del cerro a un costado (side 0 = izquierda) a una distancia `off` del eje.
function profileHeight(T, s, side, off) {
  const j = Math.max(0, Math.min(T.pm - 1, Math.round(s / PROF_STEP)));
  const po = T.po[side], ph = T.ph[side], b = j * PROF_N;
  if (off <= po[b]) return ph[b];
  for (let q = 1; q < PROF_N; q++) {
    if (off <= po[b + q]) {
      const f = (off - po[b + q - 1]) / Math.max(0.01, po[b + q] - po[b + q - 1]);
      return ph[b + q - 1] + (ph[b + q] - ph[b + q - 1]) * f;
    }
  }
  return ph[b + PROF_N - 1];
}

function placeItems(T, r) {
  const hw = T.hw, n = T.n;
  // Monedas: filas de 4 cada 70-110 m; a veces pegadas al borde del abismo (riesgo).
  T.coins = [];
  for (let s = 90; s < n - 90;) {
    const pat = r(), base = (r() * 2 - 1) * (hw - 1.3);
    const edgeSide = T.wL[s] > 0.6 ? -1 : T.wR[s] > 0.6 ? 1 : 0;
    for (let q = 0; q < 4; q++) {
      let d = base;
      if (pat < 0.3) d = Math.sin(q * 0.9) * (hw - 1.4);
      else if (pat < 0.45 && edgeSide) d = edgeSide * (hw - 0.9);
      T.coins.push({ s: s + q * 7, d, got: false });
    }
    s += 70 + Math.floor(r() * 40);
  }
  // Rocas caídas en la pista.
  T.rocks = [];
  const nr = Math.round(T.L.rocks * T.L.len / 1000);
  for (let q = 0; q < nr; q++) {
    const s = 160 + r() * (n - 300);
    const rad = 0.6 + r() * 0.5;
    const d = (r() * 2 - 1) * (hw - rad - 0.8);
    if (T.rocks.some(o => Math.abs(o.s - s) < 30)) continue;
    T.rocks.push({ s, d, rad });
  }
  T.rocks.sort((a, b) => a.s - b.s);
  // Letreros de curva (flechas amarillas) en el lado de afuera de las curvas cerradas.
  T.signs = [];
  for (const c of T.curves) {
    if (c.R > 85 && c.A < 1.0) continue;
    const out = c.sg > 0 ? 1 : -1;        // curva a la izquierda → letreros a la derecha
    const cnt = Math.max(2, Math.min(6, Math.round(c.len / 14)));
    for (let q = 0; q < cnt; q++) {
      const s = Math.round(c.s0 + 4 + (c.len - 8) * q / (cnt - 1));
      T.signs.push({ s, side: out, dir: -out });
    }
  }
}

// Busca el punto de la línea central más cercano cerca de `hint`.
function locate(T, x, z, hint) {
  let bi = hint | 0, best = Infinity;
  const a = Math.max(0, bi - 30), b = Math.min(T.n - 1, bi + 45);
  for (let i = a; i <= b; i++) {
    const dx = x - T.x[i], dz = z - T.z[i], q = dx * dx + dz * dz;
    if (q < best) { best = q; bi = i; }
  }
  const dx = x - T.x[bi], dz = z - T.z[bi];
  const s = Math.max(0, Math.min(T.n - 1, bi + dx * Math.sin(T.h[bi]) + dz * Math.cos(T.h[bi])));
  const d = dx * T.nx[bi] + dz * T.nz[bi];
  return { i: bi, s, d };
}
function roadY(T, s) {
  const i = Math.max(0, Math.min(T.n - 2, Math.floor(s))), f = Math.max(0, Math.min(1, s - i));
  return T.y[i] + (T.y[i + 1] - T.y[i]) * f;
}
// Punto del mundo a distancia s por el eje y d hacia la derecha.
function roadPoint(T, s, d) {
  const i = Math.max(0, Math.min(T.n - 1, Math.round(s)));
  return { x: T.x[i] + T.nx[i] * d, y: T.y[i], z: T.z[i] + T.nz[i] * d, h: T.h[i] };
}
