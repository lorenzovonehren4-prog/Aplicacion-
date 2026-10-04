'use strict';
// Geometría de la pista: muestras cada metro de la línea central, línea de carrera
// para los bots, perfil de velocidades y búsqueda de la posición de un kart en la pista.

function buildTrackData(def) {
  const curve = new THREE.CatmullRomCurve3(def.pts.map(p => new THREE.Vector3(p[0] * (def.scale || 1), 0, p[1] * (def.scale || 1))), true, 'centripetal');
  const L0 = curve.getLength();
  const N = Math.round(L0);
  const sp = curve.getSpacedPoints(N); // N + 1 puntos, el último repite el primero
  const T = {
    def, N, hw: def.width / 2,
    px: new Float32Array(N), pz: new Float32Array(N),
    tx: new Float32Array(N), tz: new Float32Array(N),
    nx: new Float32Array(N), nz: new Float32Array(N),   // normal hacia la derecha
    s: new Float32Array(N), curv: new Float32Array(N),
  };
  for (let i = 0; i < N; i++) { T.px[i] = sp[i].x; T.pz[i] = sp[i].z; }
  let acc = 0;
  for (let i = 0; i < N; i++) {
    const a = (i - 1 + N) % N, b = (i + 1) % N;
    let dx = T.px[b] - T.px[a], dz = T.pz[b] - T.pz[a];
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    T.tx[i] = dx; T.tz[i] = dz; T.nx[i] = -dz; T.nz[i] = dx;
    T.s[i] = acc;
    acc += Math.hypot(T.px[b] - T.px[i], T.pz[b] - T.pz[i]);
  }
  T.L = acc;
  T.curv = curvatureOf(T.px, T.pz, N, 3);
  computeRacingLine(T);
  T.vprof = speedProfile(T, 1);
  return T;
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
  const N = T.N, off = new Float32Array(N), lim = T.hw - 1.15;
  const lx = new Float32Array(N), lz = new Float32Array(N);
  const upd = () => { for (let i = 0; i < N; i++) { lx[i] = T.px[i] + T.nx[i] * off[i]; lz[i] = T.pz[i] + T.nz[i] * off[i]; } };
  for (const k of [6, 4, 3, 2]) {
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
      v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * brk * 1.0));
    }
  }
  return v;
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
  return { s, lat };
}

// Comprueba que la pista no se cruce consigo misma ni tenga curvas imposibles
function validateTrack(T) {
  const N = T.N, minSep = T.def.width + 3.2;
  let worst = Infinity, where = null, minR = Infinity, rAt = 0;
  for (let i = 0; i < N; i++) {
    const r = 1 / Math.max(Math.abs(T.curv[i]), 1e-6); if (r < minR) { minR = r; rAt = i; }
    for (let j = i + 1; j < N; j++) {
      let ds = Math.abs(T.s[j] - T.s[i]); ds = Math.min(ds, T.L - ds);
      if (ds < minSep * 2.2) continue;
      const d = Math.hypot(T.px[i] - T.px[j], T.pz[i] - T.pz[j]);
      if (d < worst) { worst = d; where = [i, j]; }
    }
  }
  return { length: T.L, minSep: worst, need: minSep, where, minRadius: minR, rAt: [Math.round(T.px[rAt]), Math.round(T.pz[rAt])], ok: worst >= minSep && minR > T.hw + 1.5 };
}
