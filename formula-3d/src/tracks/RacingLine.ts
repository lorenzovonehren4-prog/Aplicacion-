/**
 * Trazada ideal: la línea de curvatura mínima dentro de la pista. Es la que
 * dibuja la ayuda de la línea, la que usa la ayuda de frenado como referencia
 * y (desde la Fase 4) la que siguen los bots.
 *
 * Método: la línea es un desplazamiento lateral d(s) sobre muestras de la
 * línea central. Se minimiza la suma de las segundas diferencias al cuadrado
 * (≈ curvatura²) con descenso por coordenadas: cada punto va al mínimo con
 * sus vecinos fijos, proyectado sobre la normal y limitado a los bordes
 * (pianos incluidos). Resolver primero con puntos cada 32 m y refinar a 16,
 * 8 y 4 m hace que las curvas largas converjan en pocas iteraciones.
 *
 * Cada segunda diferencia se pesa con 1/Δ³ (Δ = separación real de los puntos
 * sobre la trazada): así la suma mide ∫κ² ds de verdad. Sin el peso, por
 * dentro de una horquilla los puntos se juntan, sus segundas diferencias se
 * achican y la línea "abrazaba" el borde interior con radios de 3–7 m, que el
 * auto (giro mínimo ≈ 9,6 m) no puede seguir: los bots se abrían y se salían.
 *
 * Después se calcula su curvatura, su perfil de velocidad y el color "fijo"
 * de cada tramo: verde (acelerar), amarillo (levantar / al límite) y rojo
 * (frenar).
 */

import type { PerformanceModel } from '../race/physics/CarSpec';
import { speedProfile } from './TrackAnalysis';
import type { TrackGeometry } from './TrackGeometry';
import type { Trackside } from './Trackside';

/** Estados de color de la línea (el shader interpola entre ellos). */
export const LINE_GREEN = 0;
export const LINE_YELLOW = 1;
export const LINE_RED = 2;

/** Distancia del centro del auto al borde del asfalto en la trazada (m). */
const EDGE_MARGIN = 1.3;
/** Fracción del ancho de un piano que la trazada puede usar. */
const KERB_USE = 0.6;
/** Resoluciones (m entre puntos) y pasadas en cada una: de grueso a fino. */
const LEVELS: ReadonlyArray<readonly [number, number]> = [
  [32, 500],
  [16, 400],
  [8, 300],
  [4, 250],
];
/**
 * Radio mínimo de la trazada (m). El auto gira, a fondo de volante, en
 * ≈ 9,6 m: la línea nunca pide algo más cerrado (con margen). En una
 * horquilla como la de Mónaco la trazada se abre en vez de pegarse al borde
 * interior.
 */
const MIN_RADIUS = 11;
/** Cuánto se cierra el lado de adentro en cada vuelta del ajuste de radio (m). */
const RADIUS_STEP = 0.15;
/** Frenada fuerte (m/s²): rojo. */
const HARD_BRAKING = 11;
/** Desaceleración leve (m/s²): amarillo (levantar el pie). */
const LIFT = 1.5;
/** En "sólo curvas", la línea aparece este tramo antes y después (m). */
const CORNER_FADE = 35;

interface Frame {
  n: number;
  step: number;
  cx: Float64Array;
  cz: Float64Array;
  /** Normal hacia la derecha (d > 0). */
  nx: Float64Array;
  nz: Float64Array;
  lo: Float64Array;
  hi: Float64Array;
}

function buildFrame(geometry: TrackGeometry, trackside: Trackside, spacing: number): Frame {
  const n = Math.max(16, Math.round(geometry.length / spacing));
  const step = geometry.length / n;
  const frame: Frame = {
    n,
    step,
    cx: new Float64Array(n),
    cz: new Float64Array(n),
    nx: new Float64Array(n),
    nz: new Float64Array(n),
    lo: new Float64Array(n),
    hi: new Float64Array(n),
  };
  const point = { x: 0, z: 0 };
  const tangent = { x: 0, z: 0 };
  const hw = geometry.halfWidth;
  for (let k = 0; k < n; k++) {
    const s = k * step;
    geometry.pointAt(s, 0, point, tangent);
    const i = geometry.indexAt(s);
    frame.cx[k] = point.x;
    frame.cz[k] = point.z;
    frame.nx[k] = -tangent.z;
    frame.nz[k] = tangent.x;
    frame.lo[k] = -(hw - EDGE_MARGIN + KERB_USE * (trackside.kerbLeft[i] ?? 0));
    frame.hi[k] = hw - EDGE_MARGIN + KERB_USE * (trackside.kerbRight[i] ?? 0);
  }
  return frame;
}

/** Descenso por coordenadas del funcional de curvatura sobre un nivel. */
function relax(frame: Frame, d: Float64Array, passes: number): void {
  const { n, step, cx, cz, nx, nz, lo, hi } = frame;
  // Posiciones de los puntos (se actualiza sólo el que cambia).
  const px = new Float64Array(n);
  const pz = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    px[k] = (cx[k] ?? 0) + (d[k] ?? 0) * (nx[k] ?? 0);
    pz[k] = (cz[k] ?? 0) + (d[k] ?? 0) * (nz[k] ?? 0);
  }
  // Peso de la segunda diferencia centrada en j: 1/Δ³ (relativo al paso del nivel).
  const weight = new Float64Array(n);
  const minSpacing = step * 0.2;
  const updateWeights = (): void => {
    for (let j = 0; j < n; j++) {
      const a = j === 0 ? n - 1 : j - 1;
      const b = j === n - 1 ? 0 : j + 1;
      const before = Math.hypot((px[j] ?? 0) - (px[a] ?? 0), (pz[j] ?? 0) - (pz[a] ?? 0));
      const after = Math.hypot((px[b] ?? 0) - (px[j] ?? 0), (pz[b] ?? 0) - (pz[j] ?? 0));
      const spacing = Math.max(minSpacing, (before + after) / 2) / step;
      weight[j] = 1 / (spacing * spacing * spacing);
    }
  };
  for (let pass = 0; pass < passes; pass++) {
    // Los pesos cambian poco entre pasadas: se recalculan cada 8.
    if (pass % 8 === 0) updateWeights();
    for (let k = 0; k < n; k++) {
      const m2 = (k - 2 + n) % n;
      const m1 = (k - 1 + n) % n;
      const p1 = (k + 1) % n;
      const p2 = (k + 2) % n;
      // Mínimo con los vecinos fijos de Σ wⱼ·|Pⱼ₋₁ − 2Pⱼ + Pⱼ₊₁|²
      // (con pesos iguales: (4·(P₋₁ + P₊₁) − (P₋₂ + P₊₂)) / 6).
      const wa = weight[m1] ?? 1;
      const wb = weight[k] ?? 1;
      const wc = weight[p1] ?? 1;
      const total = wa + 4 * wb + wc;
      const xm1 = px[m1] ?? 0;
      const xp1 = px[p1] ?? 0;
      const zm1 = pz[m1] ?? 0;
      const zp1 = pz[p1] ?? 0;
      const tx = (wa * (2 * xm1 - (px[m2] ?? 0)) + 2 * wb * (xm1 + xp1) + wc * (2 * xp1 - (px[p2] ?? 0))) / total;
      const tz = (wa * (2 * zm1 - (pz[m2] ?? 0)) + 2 * wb * (zm1 + zp1) + wc * (2 * zp1 - (pz[p2] ?? 0))) / total;
      const ox = cx[k] ?? 0;
      const oz = cz[k] ?? 0;
      const ux = nx[k] ?? 0;
      const uz = nz[k] ?? 0;
      const value = Math.max(lo[k] ?? 0, Math.min(hi[k] ?? 0, (tx - ox) * ux + (tz - oz) * uz));
      d[k] = value;
      px[k] = ox + value * ux;
      pz[k] = oz + value * uz;
    }
  }
}

/**
 * Curvatura con signo en el punto k (+ = derecha), por el círculo que pasa por
 * k − 1, k y k + 1.
 */
function curvatureAt(frame: Frame, d: Float64Array, k: number): number {
  const { n, cx, cz, nx, nz } = frame;
  const at = (j: number): [number, number] => {
    const i = ((j % n) + n) % n;
    return [(cx[i] ?? 0) + (d[i] ?? 0) * (nx[i] ?? 0), (cz[i] ?? 0) + (d[i] ?? 0) * (nz[i] ?? 0)];
  };
  const [ax, az] = at(k - 1);
  const [bx, bz] = at(k);
  const [qx, qz] = at(k + 1);
  const ux = bx - ax;
  const uz = bz - az;
  const vx = qx - bx;
  const vz = qz - bz;
  const cross = ux * vz - uz * vx;
  const chord = Math.hypot(qx - ax, qz - az) * Math.hypot(ux, uz) * Math.hypot(vx, vz);
  return chord > 1e-9 ? (2 * cross) / chord : 0;
}

/**
 * Abre la trazada donde dobla más cerrado que `MIN_RADIUS`: en esos puntos (y
 * sus vecinos) se corre de a poco el límite del lado de adentro y se vuelve a
 * relajar, hasta que ningún punto pida más de lo que el auto puede girar.
 */
function limitRadius(frame: Frame, d: Float64Array): void {
  const { n, lo, hi } = frame;
  const cap = 1 / MIN_RADIUS;
  for (let round = 0; round < 120; round++) {
    let tight = 0;
    for (let k = 0; k < n; k++) {
      const kappa = curvatureAt(frame, d, k);
      if (Math.abs(kappa) <= cap) continue;
      tight++;
      for (let j = k - 2; j <= k + 2; j++) {
        const i = ((j % n) + n) % n;
        const low = lo[i] ?? 0;
        const high = hi[i] ?? 0;
        const now = d[i] ?? 0;
        // Curva a la derecha: adentro es +d (se baja el tope); a la izquierda, al revés.
        if (kappa > 0) hi[i] = Math.max(low, Math.min(high, now - RADIUS_STEP));
        else lo[i] = Math.min(high, Math.max(low, now + RADIUS_STEP));
      }
    }
    if (tight === 0) return;
    relax(frame, d, 24);
  }
}

/** Interpola un desplazamiento de un nivel grueso en la posición s. */
function sampleOffset(d: Float64Array, step: number, s: number): number {
  const n = d.length;
  const f = s / step;
  const i = Math.floor(f);
  const t = f - i;
  const a = d[((i % n) + n) % n] ?? 0;
  const b = d[(((i + 1) % n) + n) % n] ?? 0;
  return a + (b - a) * t;
}

export class RacingLine {
  readonly count: number;
  /** Distancia a lo largo de la línea central entre puntos (m). */
  readonly step: number;
  /** Desplazamiento lateral respecto del centro (m, + derecha). */
  readonly offset: Float32Array;
  readonly x: Float64Array;
  readonly z: Float64Array;
  /** Distancia real entre el punto k y el siguiente sobre la trazada (m). */
  readonly spacing: Float32Array;
  readonly curvature: Float32Array;
  readonly speed: Float32Array;
  readonly braking: Uint8Array;
  /** Tiempo teórico de vuelta sobre la trazada (s). */
  readonly lapTime: number;
  /** Color fijo por punto: 0 verde … 1 amarillo … 2 rojo (suavizado). */
  readonly state: Float32Array;
  /** Visibilidad en el modo "sólo curvas" (0–1, con desvanecido). */
  readonly cornerMask: Float32Array;

  private constructor(
    private readonly geometry: TrackGeometry,
    trackside: Trackside,
    model: PerformanceModel,
  ) {
    // ─── Desplazamientos: de grueso a fino ───
    let previous: { d: Float64Array; step: number } | null = null;
    let frame: Frame | null = null;
    let d = new Float64Array(0);
    for (const [spacing, passes] of LEVELS) {
      frame = buildFrame(geometry, trackside, spacing);
      d = new Float64Array(frame.n);
      if (previous) {
        const from = previous;
        for (let k = 0; k < frame.n; k++) d[k] = sampleOffset(from.d, from.step, k * frame.step);
      }
      relax(frame, d, passes);
      previous = { d, step: frame.step };
    }
    if (!frame) throw new Error('La trazada necesita al menos un nivel de resolución.');
    limitRadius(frame, d);

    const n = frame.n;
    this.count = n;
    this.step = frame.step;
    this.offset = new Float32Array(d);
    this.x = new Float64Array(n);
    this.z = new Float64Array(n);
    for (let k = 0; k < n; k++) {
      this.x[k] = (frame.cx[k] ?? 0) + (d[k] ?? 0) * (frame.nx[k] ?? 0);
      this.z[k] = (frame.cz[k] ?? 0) + (d[k] ?? 0) * (frame.nz[k] ?? 0);
    }

    // ─── Espaciado y curvatura (+ = derecha, como la línea central) ───
    this.spacing = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const j = (k + 1) % n;
      this.spacing[k] = Math.hypot((this.x[j] ?? 0) - (this.x[k] ?? 0), (this.z[j] ?? 0) - (this.z[k] ?? 0));
    }
    const raw = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const a = (k - 1 + n) % n;
      const b = (k + 1) % n;
      const ax = (this.x[k] ?? 0) - (this.x[a] ?? 0);
      const az = (this.z[k] ?? 0) - (this.z[a] ?? 0);
      const bx = (this.x[b] ?? 0) - (this.x[k] ?? 0);
      const bz = (this.z[b] ?? 0) - (this.z[k] ?? 0);
      const la = Math.hypot(ax, az) || 1;
      const lb = Math.hypot(bx, bz) || 1;
      const cross = (ax * bz - az * bx) / (la * lb);
      raw[k] = Math.asin(Math.max(-1, Math.min(1, cross))) / ((la + lb) / 2);
    }
    this.curvature = smoothRing(raw, 2);

    // ─── Perfil de velocidad ───
    const profile = speedProfile(this.curvature, this.spacing, model);
    this.speed = profile.speed;
    this.braking = profile.braking;
    this.lapTime = profile.lapTime;

    // ─── Colores fijos ───
    const state = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const v = this.speed[k] ?? 0;
      const next = this.speed[(k + 1) % n] ?? 0;
      const decel = (v * v - next * next) / (2 * Math.max(0.1, this.spacing[k] ?? 1));
      const atLimit = v >= (profile.cornerLimit[k] ?? Infinity) * 0.985 && Math.abs(this.curvature[k] ?? 0) > 1 / 800;
      state[k] = decel > HARD_BRAKING ? LINE_RED : decel > LIFT || atLimit ? LINE_YELLOW : LINE_GREEN;
    }
    this.state = smoothRing(state, 2);

    // ─── Máscara de "sólo curvas": frenadas y curvas, con desvanecido ───
    const active = new Uint8Array(n);
    for (let k = 0; k < n; k++) {
      active[k] = (state[k] ?? 0) > 0 || Math.abs(this.curvature[k] ?? 0) > 1 / 350 ? 1 : 0;
    }
    this.cornerMask = fadeAround(active, this.step, CORNER_FADE);
  }

  static compute(geometry: TrackGeometry, trackside: Trackside, model: PerformanceModel): RacingLine {
    return new RacingLine(geometry, trackside, model);
  }

  /** Índice del punto de la trazada en la posición s de la línea central. */
  indexAt(s: number): number {
    return Math.floor(this.geometry.wrapS(s) / this.step) % this.count;
  }

  /** Velocidad del perfil en s (m/s), interpolada. */
  speedAt(s: number): number {
    return this.sample(this.speed, s);
  }

  /** Desplazamiento lateral de la trazada en s (m), interpolado. */
  offsetAt(s: number): number {
    return this.sample(this.offset, s);
  }

  private sample(values: Float32Array, s: number): number {
    const f = this.geometry.wrapS(s) / this.step;
    const i = Math.floor(f) % this.count;
    const t = f - Math.floor(f);
    const a = values[i] ?? 0;
    const b = values[(i + 1) % this.count] ?? 0;
    return a + (b - a) * t;
  }
}

/** Promedio móvil triangular sobre un anillo (±radius muestras). */
function smoothRing(values: Float32Array, radius: number): Float32Array {
  const n = values.length;
  const out = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    let sum = 0;
    let weight = 0;
    for (let o = -radius; o <= radius; o++) {
      const w = radius + 1 - Math.abs(o);
      sum += (values[(k + o + n) % n] ?? 0) * w;
      weight += w;
    }
    out[k] = sum / weight;
  }
  return out;
}

/** 1 en los puntos activos, bajando a 0 a `fade` m de distancia (con vuelta). */
function fadeAround(active: Uint8Array, step: number, fade: number): Float32Array {
  const n = active.length;
  const distance = new Float32Array(n).fill(Infinity);
  // Dos pasadas (adelante y atrás), dos vueltas cada una para cubrir el cierre.
  let last = Infinity;
  for (let pass = 0; pass < 2 * n; pass++) {
    const k = pass % n;
    last = active[k] ? 0 : last + step;
    distance[k] = Math.min(distance[k] ?? Infinity, last);
  }
  last = Infinity;
  for (let pass = 2 * n - 1; pass >= 0; pass--) {
    const k = pass % n;
    last = active[k] ? 0 : last + step;
    distance[k] = Math.min(distance[k] ?? Infinity, last);
  }
  const mask = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const t = Math.max(0, Math.min(1, 1 - (distance[k] ?? Infinity) / fade));
    mask[k] = t * t * (3 - 2 * t);
  }
  return mask;
}
