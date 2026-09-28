/**
 * Línea central del circuito: spline Catmull-Rom cerrada muestreada cada
 * ~1 m, con tangentes, curvatura y el sistema de coordenadas de pista (s, d):
 *
 *   s = metros recorridos desde el inicio del trazado (0 … length)
 *   d = desplazamiento lateral desde el centro (positivo = a la derecha)
 *
 * Todo lo que necesita saber "dónde está" algo respecto de la pista
 * (superficies, muros, vueltas, posiciones, IA, línea de trazada) usa esto.
 */

import { CatmullRomCurve3, Vector3 } from 'three';
import { traceLayout } from './layout';
import type { TrackDefinition } from './TrackDefinition';

export interface TrackProjection {
  /** Muestra más cercana. */
  index: number;
  /** Distancia a lo largo de la pista (m). */
  s: number;
  /** Desplazamiento lateral (m, + derecha). */
  d: number;
}

/** Ventana de suavizado de la curvatura (muestras a cada lado). */
const CURVATURE_SMOOTHING = 7;

export class TrackGeometry {
  /** Longitud de la vuelta (m). */
  readonly length: number;
  readonly count: number;
  /** Separación entre muestras (m). */
  readonly ds: number;
  /** Factor de diseño → mundo (las posiciones de los datos se multiplican por esto). */
  readonly designScale: number;
  readonly x: Float64Array;
  readonly z: Float64Array;
  /** Tangente unitaria. */
  readonly tx: Float64Array;
  readonly tz: Float64Array;
  /** Curvatura con signo (1/m, + = curva a la derecha), suavizada. */
  readonly curvature: Float64Array;
  /** Medio ancho del asfalto (m). */
  readonly halfWidth: number;
  /** Puntos de control de la spline (mundo), para quien quiera dibujarla. */
  readonly controlPoints: readonly Vector3[];

  private constructor(def: TrackDefinition, spacing: number) {
    const traced = traceLayout(def.layout, 8);
    const target = def.lengthKm * 1000;
    const scale = target / traced.length;
    const controlPoints = traced.points.map(([px, pz]) => new Vector3(px * scale, 0, pz * scale));
    const curve = new CatmullRomCurve3(controlPoints, true, 'centripetal');
    curve.arcLengthDivisions = controlPoints.length * 24;
    const splineLength = curve.getLength();

    this.controlPoints = controlPoints;
    this.length = splineLength;
    this.count = Math.max(64, Math.round(splineLength / spacing));
    this.ds = splineLength / this.count;
    this.designScale = splineLength / traced.length;
    this.halfWidth = def.width / 2;

    this.x = new Float64Array(this.count);
    this.z = new Float64Array(this.count);
    this.tx = new Float64Array(this.count);
    this.tz = new Float64Array(this.count);
    const point = new Vector3();
    const tangent = new Vector3();
    for (let i = 0; i < this.count; i++) {
      const u = i / this.count;
      curve.getPointAt(u, point);
      curve.getTangentAt(u, tangent);
      const len = Math.hypot(tangent.x, tangent.z) || 1;
      this.x[i] = point.x;
      this.z[i] = point.z;
      this.tx[i] = tangent.x / len;
      this.tz[i] = tangent.z / len;
    }
    this.curvature = this.computeCurvature();
  }

  static build(def: TrackDefinition, spacing = 1): TrackGeometry {
    return new TrackGeometry(def, spacing);
  }

  /** Convierte una posición de los datos (m de diseño) a `s` en el mundo. */
  designToS(designS: number): number {
    return this.wrapS(designS * this.designScale);
  }

  wrapS(s: number): number {
    return ((s % this.length) + this.length) % this.length;
  }

  /** Índice de muestra (con vuelta). */
  wrapIndex(i: number): number {
    return ((i % this.count) + this.count) % this.count;
  }

  indexAt(s: number): number {
    return this.wrapIndex(Math.floor(this.wrapS(s) / this.ds));
  }

  /** Distancia con signo de `from` a `to` a lo largo de la pista, en (−L/2, L/2]. */
  deltaS(from: number, to: number): number {
    let delta = this.wrapS(to) - this.wrapS(from);
    if (delta > this.length / 2) delta -= this.length;
    else if (delta <= -this.length / 2) delta += this.length;
    return delta;
  }

  /** Curvatura interpolada en `s`. */
  curvatureAt(s: number): number {
    const f = this.wrapS(s) / this.ds;
    const i = Math.floor(f);
    const t = f - i;
    const a = this.curvature[this.wrapIndex(i)] ?? 0;
    const b = this.curvature[this.wrapIndex(i + 1)] ?? 0;
    return a + (b - a) * t;
  }

  /**
   * Punto del mundo para (s, d), con la tangente en `tangentOut` si se pasa.
   * Interpola entre muestras (suave aunque se pida entre dos metros).
   */
  pointAt(s: number, d: number, out: { x: number; z: number }, tangentOut?: { x: number; z: number }): void {
    const f = this.wrapS(s) / this.ds;
    const i = Math.floor(f);
    const t = f - i;
    const i0 = this.wrapIndex(i);
    const i1 = this.wrapIndex(i + 1);
    let tx = (this.tx[i0] ?? 0) * (1 - t) + (this.tx[i1] ?? 0) * t;
    let tz = (this.tz[i0] ?? 0) * (1 - t) + (this.tz[i1] ?? 0) * t;
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    // Derecha = tangente girada 90° en sentido horario (visto desde arriba).
    out.x = (this.x[i0] ?? 0) * (1 - t) + (this.x[i1] ?? 0) * t - tz * d;
    out.z = (this.z[i0] ?? 0) * (1 - t) + (this.z[i1] ?? 0) * t + tx * d;
    if (tangentOut) {
      tangentOut.x = tx;
      tangentOut.z = tz;
    }
  }

  /**
   * Proyecta un punto del mundo sobre la pista. Con `hint` (índice de la última
   * proyección del mismo objeto) la búsqueda es local y cuesta casi nada.
   */
  project(x: number, z: number, out: TrackProjection, hint = -1): TrackProjection {
    let i = hint >= 0 ? this.wrapIndex(hint) : this.nearestGlobal(x, z);
    let best = this.dist2(i, x, z);
    // Escalada: se avanza hacia la muestra más cercana.
    for (let steps = 0; steps < 400; steps++) {
      const next = this.wrapIndex(i + 1);
      const prev = this.wrapIndex(i - 1);
      const dn = this.dist2(next, x, z);
      const dp = this.dist2(prev, x, z);
      if (dn < best && dn <= dp) {
        i = next;
        best = dn;
      } else if (dp < best) {
        i = prev;
        best = dp;
      } else {
        break;
      }
    }
    const px = x - (this.x[i] ?? 0);
    const pz = z - (this.z[i] ?? 0);
    const tx = this.tx[i] ?? 0;
    const tz = this.tz[i] ?? 1;
    const along = px * tx + pz * tz;
    out.index = i;
    out.s = this.wrapS(i * this.ds + along);
    out.d = -px * tz + pz * tx;
    return out;
  }

  private dist2(i: number, x: number, z: number): number {
    const dx = x - (this.x[i] ?? 0);
    const dz = z - (this.z[i] ?? 0);
    return dx * dx + dz * dz;
  }

  /** Búsqueda completa (sólo al empezar o si se perdió la referencia). */
  private nearestGlobal(x: number, z: number): number {
    let best = Infinity;
    let index = 0;
    for (let i = 0; i < this.count; i += 4) {
      const d = this.dist2(i, x, z);
      if (d < best) {
        best = d;
        index = i;
      }
    }
    return index;
  }

  private computeCurvature(): Float64Array {
    const raw = new Float64Array(this.count);
    for (let i = 0; i < this.count; i++) {
      const a = this.wrapIndex(i - 1);
      const b = this.wrapIndex(i + 1);
      // Producto cruz de las tangentes vecinas = seno del giro (+ = derecha).
      const cross = (this.tx[a] ?? 0) * (this.tz[b] ?? 0) - (this.tz[a] ?? 0) * (this.tx[b] ?? 0);
      raw[i] = Math.asin(Math.max(-1, Math.min(1, cross))) / (2 * this.ds);
    }
    const smooth = new Float64Array(this.count);
    const n = CURVATURE_SMOOTHING;
    for (let i = 0; i < this.count; i++) {
      let sum = 0;
      let weight = 0;
      for (let k = -n; k <= n; k++) {
        const w = n + 1 - Math.abs(k);
        sum += (raw[this.wrapIndex(i + k)] ?? 0) * w;
        weight += w;
      }
      smooth[i] = sum / weight;
    }
    return smooth;
  }
}
