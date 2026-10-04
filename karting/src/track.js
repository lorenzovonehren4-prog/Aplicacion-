'use strict';
// Geometría de la pista: muestras cada metro de la línea central (con altura para
// rampas, puentes y segundos pisos), túneles, línea de carrera para los bots, perfil de
// velocidades y búsqueda de la posición de un kart en la pista.

function buildTrackData(def) {
  const sc = def.scale || 1;
  const curve = new THREE.CatmullRomCurve3(def.pts.map(p => new THREE.Vector3(p[0] * sc, p[2] || 0, p[1] * sc)), true, 'centripetal');
  const L0 = curve.getLength();
  const N = Math.round(L0);
  const sp = curve.getSpacedPoints(N); // N + 1 puntos, el último repite el primero
  const T = {
    def, N, hw: def.width / 2,
    px: new Float32Array(N), pz: new Float32Array(N), py: new Float32Array(N),
    tx: new Float32Array(N), tz: new Float32Array(N),
    nx: new Float32Array(N), nz: new Float32Array(N),   // normal hacia la derecha
    s: new Float32Array(N), curv: new Float32Array(N), grade: new Float32Array(N),
    tunnel: new Uint8Array(N),
  };
  for (let i = 0; i < N; i++) { T.px[i] = sp[i].x; T.pz[i] = sp[i].z; T.py[i] = sp[i].y < 0.04 ? 0 : sp[i].y; }
  // la altura se suaviza un poco para que las rampas no tengan quiebres
  for (let pass = 0; pass < 4; pass++) {
    const c = T.py.slice();
    for (let i = 0; i < N; i++) T.py[i] = Math.max(0, (c[(i - 2 + N) % N] + c[(i - 1 + N) % N] + c[i] * 2 + c[(i + 1) % N] + c[(i + 2) % N]) / 6);
  }
  for (let i = 0; i < N; i++) if (T.py[i] < 0.04) T.py[i] = 0;
  let acc = 0;
  for (let i = 0; i < N; i++) {
    const a = (i - 1 + N) % N, b = (i + 1) % N;
    let dx = T.px[b] - T.px[a], dz = T.pz[b] - T.pz[a];
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    T.tx[i] = dx; T.tz[i] = dz; T.nx[i] = -dz; T.nz[i] = dx;
    T.grade[i] = (T.py[b] - T.py[a]) / l;
    T.s[i] = acc;
    acc += Math.hypot(T.px[b] - T.px[i], T.pz[b] - T.pz[i]);
  }
  T.L = acc;
  T.curv = curvatureOf(T.px, T.pz, N, 3);
  // túneles: entre dos puntos de control (índices)
  for (const [k0, k1] of def.tunnels || []) {
    const i0 = nearestControl(T, def.pts[k0], sc), i1 = nearestControl(T, def.pts[k1], sc);
    for (let i = i0; i !== i1; i = (i + 1) % N) T.tunnel[i] = 1;
  }
  computeRacingLine(T);
  T.vprof = speedProfile(T, 1);
  return T;
}

function nearestControl(T, p, sc) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < T.N; i++) {
    const d = (T.px[i] - p[0] * sc) ** 2 + (T.pz[i] - p[1] * sc) ** 2 + (T.py[i] - (p[2] || 0)) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

// Curvatura con signo (positiva = gira a la derecha) usando puntos separados k muestras
function curvatureOf(xs, zs, N, k) {
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = (i - k + N) % N, b = (i + k) % N;
    const ax = xs[i] - xs[a], az = zs[i] - zs[a], bx = xs[b] - xs[i], bz = zs[b] - zs[i];
    const cx = xs[b] - xs[a], cz = zs[b] - zs[a];
    const cross = ax * bz - az * bx;
    const den = Math.hypot(ax, az) * Math.hypot(bx, bz) * Math.hypot(cx, cz);
    out[i] = den > 1e-6 ? 2 * cross / den : 0;
  }
  return out;
}

// Línea de carrera: se suaviza el desplazamiento lateral hasta acercarse a la de mínima curvatura
function computeRacingLine(T) {
  const N = T.N, off = new Float32Array(N), lim = T.hw - 1.2;
  const lx = new Float32Array(N), lz = new Float32Array(N);
  const upd = () => { for (let i = 0; i < N; i++) { lx[i] = T.px[i] + T.nx[i] * off[i]; lz[i] = T.pz[i] + T.nz[i] * off[i]; } };
  for (const k of [8, 6, 4, 3, 2]) {
    for (let it = 0; it < 120; it++) {
      upd();
      for (let i = 0; i < N; i++) {
        const a = (i - k + N) % N, b = (i + k) % N;
        const mx = (lx[a] + lx[b]) / 2, mz = (lz[a] + lz[b]) / 2;
        const want = (mx - T.px[i]) * T.nx[i] + (mz - T.pz[i]) * T.nz[i];
        off[i] = clamp(off[i] + (want - off[i]) * 0.6, -lim, lim);
      }
    }
  }
  upd();
  T.lineOff = off; T.lx = lx; T.lz = lz;
  T.lcurv = curvatureOf(lx, lz, N, 4);
}

// Velocidad máxima en cada muestra de la línea de carrera usando "pace" del agarre
function speedProfile(T, pace) {
  const N = T.N, v = new Float32Array(N);
  const g = KART.grip * pace;
  for (let i = 0; i < N; i++) {
    const k = Math.abs(T.lcurv[i]);
    v[i] = Math.min(KART.vmax, Math.sqrt(g / Math.max(k, 1e-4)));
  }
  const brk = KART.brake * 0.72;
  for (let pass = 0; pass < 3; pass++) {
    for (let i = N - 1; i >= 0; i--) {
      const j = (i + 1) % N;
      v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * (brk + 9.8 * T.grade[i]) * 1.0));
    }
  }
  return v;
}

// Curvas de la pista: velocidad de entrada, de vértice y cuántos metros hay que soltar el
// acelerador para llegar sin frenar. Si son muchos metros, esa curva "es de freno".
function cornerReport(T) {
  const N = T.N, v = T.vprof;
  // perfil real: acelera lo que puede y frena justo antes de cada curva
  const f = new Float32Array(N);
  let cur = v[0];
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < N; i++) {
    const a = KART.accel * Math.max(0, 1 - (cur / KART.vmax) ** 2) - KART.roll - 0.0016 * cur * cur - 9.8 * T.grade[i];
    cur = Math.min(v[i], Math.sqrt(Math.max(1, cur * cur + 2 * a)));
    f[i] = cur;
  }
  const out = [];
  for (let i = 0; i < N; i++) {
    let isMin = f[i] < KART.vmax * 0.9;
    for (let o = -12; o <= 12 && isMin; o++) if (o && f[(i + o + N) % N] < f[i]) isMin = false;
    if (!isMin || out.some(c => Math.abs(c.i - i) < 25)) continue;
    // velocidad de entrada: la máxima desde el último punto más lento que este vértice
    let va = f[i];
    for (let o = 1; o < N; o++) { const w = f[(i - o + N) % N]; if (w < f[i] - 0.01) break; va = Math.max(va, w); }
    const coast = (va * va - f[i] * f[i]) / (2 * KART.coastDecel);
    out.push({ i, vin: va, vmin: f[i], coast, brake: coast > 42 });
  }
  return out;
}

// Busca la muestra más cercana a (x, z) cerca de la anterior (o en toda la pista)
function nearestIndex(T, x, z, hint) {
  const N = T.N;
  let best = -1, bd = Infinity;
  if (hint == null || hint < 0) {
    for (let i = 0; i < N; i++) {
      const d = (T.px[i] - x) ** 2 + (T.pz[i] - z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  for (let o = -18; o <= 18; o++) {
    const i = (hint + o + N) % N;
    const d = (T.px[i] - x) ** 2 + (T.pz[i] - z) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

// Distancia a lo largo de la pista y desplazamiento lateral de un punto
function trackCoords(T, x, z, i) {
  const dx = x - T.px[i], dz = z - T.pz[i];
  const along = dx * T.tx[i] + dz * T.tz[i];
  const lat = dx * T.nx[i] + dz * T.nz[i];
  let s = T.s[i] + along;
  if (s < 0) s += T.L; else if (s >= T.L) s -= T.L;
  return { s, lat, along };
}

// Altura del suelo de la pista en un punto (interpolada con la pendiente)
function trackHeight(T, i, along) { return Math.max(0, T.py[i] + T.grade[i] * along); }

// Comprueba que la pista no se cruce consigo misma (salvo por puentes con altura suficiente)
// ni tenga curvas imposibles o rampas muy empinadas
const BRIDGE_CLEAR = 4.6;
function validateTrack(T) {
  const N = T.N, minSep = T.def.width + 3.2;
  let worst = Infinity, where = null, minR = Infinity, rAt = 0, maxGrade = 0;
  for (let i = 0; i < N; i++) {
    const r = 1 / Math.max(Math.abs(T.curv[i]), 1e-6); if (r < minR) { minR = r; rAt = i; }
    maxGrade = Math.max(maxGrade, Math.abs(T.grade[i]));
    for (let j = i + 1; j < N; j++) {
      let ds = Math.abs(T.s[j] - T.s[i]); ds = Math.min(ds, T.L - ds);
      if (ds < minSep * 2.2) continue;
      if (Math.abs(T.py[i] - T.py[j]) >= BRIDGE_CLEAR) continue;
      const d = Math.hypot(T.px[i] - T.px[j], T.pz[i] - T.pz[j]);
      if (d < worst) { worst = d; where = [i, j]; }
    }
  }
  const corners = cornerReport(T);
  return {
    length: T.L, minSep: worst, need: minSep, where, minRadius: minR, rAt: [Math.round(T.px[rAt]), Math.round(T.pz[rAt])],
    maxGrade, corners, brakes: corners.filter(c => c.brake).length,
    ok: worst >= minSep && minR > T.hw + 1.5 && maxGrade < 0.16,
  };
}
