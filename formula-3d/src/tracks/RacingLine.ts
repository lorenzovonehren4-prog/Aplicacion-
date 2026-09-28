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
  const { n, cx, cz, nx, nz, lo, hi } = frame;
  const px = (k: number): number => {
    const j = ((k % n) + n) % n;
    return (cx[j] ?? 0) + (d[j] ?? 0) * (nx[j] ?? 0);
  };
  const pz = (k: number): number => {
    const j = ((k % n) + n) % n;
    return (cz[j] ?? 0) + (d[j] ?? 0) * (nz[j] ?? 0);
  };
  for (let pass = 0; pass < passes; pass++) {
    for (let k = 0; k < n; k++) {
      // Mínimo con los vecinos fijos: (4·(P₋₁ + P₊₁) − (P₋₂ + P₊₂)) / 6.
      const tx = (4 * (px(k - 1) + px(k + 1)) - (px(k - 2) + px(k + 2))) / 6;
      const tz = (4 * (pz(k - 1) + pz(k + 1)) - (pz(k - 2) + pz(k + 2))) / 6;
      const along = (tx - (cx[k] ?? 0)) * (nx[k] ?? 0) + (tz - (cz[k] ?? 0)) * (nz[k] ?? 0);
      d[k] = Math.max(lo[k] ?? 0, Math.min(hi[k] ?? 0, along));
    }
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
