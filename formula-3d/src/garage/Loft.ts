/**
 * Superficies paramétricas "loft": una sucesión de secciones transversales
 * (superelipses) a lo largo del eje Z, interpoladas con curvas cúbicas monótonas
 * (sin sobreoscilaciones). Con esto se modela la carrocería del monoplaza
 * (morro, monocasco, pontones, cubierta del motor) con formas orgánicas y pocas
 * líneas de código.
 *
 * Coordenadas UV de la superficie:
 *   u (x) = avance a lo largo del loft (0 = primera sección, 1 = última)
 *   v (y) = vuelta alrededor de la sección: 0 abajo, 0.25 derecha (+X),
 *           0.5 arriba, 0.75 izquierda (−X), 1 abajo otra vez.
 *
 * Como la superficie es una función S(z, t), también sirve para generar
 * calcomanías (números, logos) que se adaptan exactamente a la carrocería.
 */

import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';

export interface LoftSection {
  /** Posición a lo largo del auto (m). Las secciones van en Z creciente. */
  z: number;
  /** Centro lateral de la sección (0 = eje del auto). */
  cx?: number;
  /** Medio ancho de la sección (m). */
  halfWidth: number;
  /** Altura del borde inferior (m). */
  bottom: number;
  /** Altura del borde superior (m). */
  top: number;
  /** Exponente de la superelipse arriba: 2 = elipse, 4+ = casi rectangular. */
  topRound?: number;
  /** Exponente de la superelipse abajo. */
  bottomRound?: number;
  /** Ancho de la parte de arriba relativo a la de abajo (1 = igual; < 1 = se angosta). */
  topScale?: number;
}

type ParamKey = 'cx' | 'halfWidth' | 'bottom' | 'top' | 'topRound' | 'bottomRound' | 'topScale';
const PARAM_KEYS: readonly ParamKey[] = ['cx', 'halfWidth', 'bottom', 'top', 'topRound', 'bottomRound', 'topScale'];
const DEFAULTS: Record<ParamKey, number> = {
  cx: 0,
  halfWidth: 0.1,
  bottom: 0,
  top: 0.1,
  topRound: 2.4,
  bottomRound: 4,
  topScale: 1,
};

/** Parámetros de una sección ya interpolada. */
interface SectionParams {
  cx: number;
  halfWidth: number;
  bottom: number;
  top: number;
  topRound: number;
  bottomRound: number;
  topScale: number;
}

export interface LoftBuildOptions {
  /** Divisiones a lo largo. */
  segmentsAlong?: number;
  /** Divisiones alrededor. */
  segmentsAround?: number;
  /** Tapa al principio (morro) y al final (cola). */
  capStart?: boolean;
  capEnd?: boolean;
}

export interface PatchOptions {
  zFrom: number;
  zTo: number;
  /** Rango alrededor (v de la superficie). */
  tFrom: number;
  tTo: number;
  /** Separación sobre la superficie para evitar z-fighting (m). */
  offset?: number;
  segmentsAlong?: number;
  segmentsAround?: number;
  /** Invierte la U de la calcomanía (para que el texto se lea bien del otro lado). */
  flipU?: boolean;
  /** Invierte la V de la calcomanía. */
  flipV?: boolean;
  /** Intercambia U y V (rota la calcomanía 90°). */
  swapUV?: boolean;
}

export class LoftSurface {
  private readonly zs: number[];
  private readonly values: Record<ParamKey, number[]>;
  private readonly slopes: Record<ParamKey, number[]>;

  constructor(sections: readonly LoftSection[]) {
    if (sections.length < 2) throw new Error('Un loft necesita al menos dos secciones.');
    for (let i = 1; i < sections.length; i++) {
      if ((sections[i]?.z ?? 0) <= (sections[i - 1]?.z ?? 0)) {
        throw new Error('Las secciones del loft deben ir en Z estrictamente creciente.');
      }
    }
    this.zs = sections.map((s) => s.z);
    this.values = {} as Record<ParamKey, number[]>;
    this.slopes = {} as Record<ParamKey, number[]>;
    for (const key of PARAM_KEYS) {
      const ys = sections.map((s) => s[key] ?? DEFAULTS[key]);
      this.values[key] = ys;
      this.slopes[key] = monotoneSlopes(this.zs, ys);
    }
  }

  get zStart(): number {
    return this.zs[0] ?? 0;
  }

  get zEnd(): number {
    return this.zs[this.zs.length - 1] ?? 0;
  }

  /** Parámetros de la sección en `z` (interpolación cúbica monótona). */
  paramsAt(z: number, out: SectionParams = emptyParams()): SectionParams {
    const zs = this.zs;
    const clampedZ = Math.min(this.zEnd, Math.max(this.zStart, z));
    let i = 0;
    while (i < zs.length - 2 && clampedZ > (zs[i + 1] ?? 0)) i++;
    const z0 = zs[i] ?? 0;
    const z1 = zs[i + 1] ?? z0;
    const h = z1 - z0;
    const t = h > 0 ? (clampedZ - z0) / h : 0;
    for (const key of PARAM_KEYS) {
      out[key] = hermite(
        this.values[key][i] ?? 0,
        this.values[key][i + 1] ?? 0,
        (this.slopes[key][i] ?? 0) * h,
        (this.slopes[key][i + 1] ?? 0) * h,
        t,
      );
    }
    return out;
  }

  /** Punto de la superficie en `z` y vuelta `t` (0–1). */
  pointAt(z: number, t: number, out: Vector3 = new Vector3(), params: SectionParams = this.paramsAt(z)): Vector3 {
    const theta = -Math.PI / 2 + t * Math.PI * 2;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const upper = s > 0;
    const exponent = 2 / (upper ? params.topRound : params.bottomRound);
    const halfHeight = (params.top - params.bottom) / 2;
    const centerY = (params.bottom + params.top) / 2;
    // La parte de arriba se angosta según topScale (forma de "bañera" del monocasco).
    const widthScale = upper ? 1 + (params.topScale - 1) * Math.pow(s, 1.5) : 1;
    out.set(
      params.cx + params.halfWidth * widthScale * signedPow(c, exponent),
      centerY + halfHeight * signedPow(s, exponent),
      z,
    );
    return out;
  }

  /** Normal hacia afuera en (z, t), por diferencias finitas. */
  normalAt(z: number, t: number, out: Vector3 = new Vector3()): Vector3 {
    const dz = 0.004;
    const dt = 0.0025;
    const pz0 = this.pointAt(z - dz, t, TMP_A);
    const pz1 = this.pointAt(z + dz, t, TMP_B);
    const alongZ = TMP_C.subVectors(pz1, pz0);
    const pt0 = this.pointAt(z, t - dt, TMP_A);
    const pt1 = this.pointAt(z, t + dt, TMP_B);
    const around = TMP_D.subVectors(pt1, pt0);
    out.crossVectors(around, alongZ);
    if (out.lengthSq() < 1e-14) {
      // Sección degenerada (punta): se usa la dirección radial.
      const params = this.paramsAt(z);
      const p = this.pointAt(z, t, TMP_A, params);
      out.set(p.x - params.cx, p.y - (params.top + params.bottom) / 2, 0);
    }
    return out.normalize();
  }

  /** Malla completa del loft. */
  build(options: LoftBuildOptions = {}): BufferGeometry {
    const along = options.segmentsAlong ?? 48;
    const around = options.segmentsAround ?? 40;
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const p = new Vector3();
    const n = new Vector3();
    const params = emptyParams();

    for (let i = 0; i <= along; i++) {
      const u = i / along;
      const z = this.zStart + (this.zEnd - this.zStart) * u;
      this.paramsAt(z, params);
      for (let j = 0; j <= around; j++) {
        const t = j / around;
        this.pointAt(z, t, p, params);
        this.normalAt(z, t, n);
        positions.push(p.x, p.y, p.z);
        normals.push(n.x, n.y, n.z);
        uvs.push(u, t);
      }
    }
    const row = around + 1;
    for (let i = 0; i < along; i++) {
      for (let j = 0; j < around; j++) {
        const a = i * row + j;
        const b = a + row;
        // Sentido antihorario visto desde afuera (normal = alrededor × a lo largo).
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }

    if (options.capStart ?? true) this.appendCap(this.zStart, -1, around, positions, normals, uvs, indices);
    if (options.capEnd ?? true) this.appendCap(this.zEnd, 1, around, positions, normals, uvs, indices);

    return makeGeometry(positions, normals, uvs, indices);
  }

  /**
   * Tapa plana con la forma de la sección en `z` (escalada por `scale`), mirando
   * hacia `direction` (−1 = adelante, +1 = atrás). Sirve para cerrar puntas y
   * para las bocas oscuras de las tomas de aire.
   */
  buildCap(z: number, direction: 1 | -1, scale = 1, segments = 40): BufferGeometry {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    this.appendCap(z, direction, segments, positions, normals, uvs, indices, scale);
    return makeGeometry(positions, normals, uvs, indices);
  }

  /** Calcomanía que sigue exactamente la superficie (UV 0–1 sobre el parche). */
  buildPatch(options: PatchOptions): BufferGeometry {
    const along = options.segmentsAlong ?? 12;
    const around = options.segmentsAround ?? 12;
    const offset = options.offset ?? 0.002;
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const p = new Vector3();
    const n = new Vector3();

    for (let i = 0; i <= along; i++) {
      const a = i / along;
      const z = options.zFrom + (options.zTo - options.zFrom) * a;
      const params = this.paramsAt(z);
      for (let j = 0; j <= around; j++) {
        const b = j / around;
        const t = options.tFrom + (options.tTo - options.tFrom) * b;
        this.pointAt(z, t, p, params);
        this.normalAt(z, t, n);
        p.addScaledVector(n, offset);
        positions.push(p.x, p.y, p.z);
        normals.push(n.x, n.y, n.z);
        let u = options.flipU ? 1 - a : a;
        let v = options.flipV ? 1 - b : b;
        if (options.swapUV) [u, v] = [v, u];
        uvs.push(u, v);
      }
    }
    const row = around + 1;
    for (let i = 0; i < along; i++) {
      for (let j = 0; j < around; j++) {
        const a = i * row + j;
        const b = a + row;
        // El sentido de los triángulos depende de hacia dónde crece t.
        if (options.tTo >= options.tFrom) indices.push(a, a + 1, b, b, a + 1, b + 1);
        else indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    return makeGeometry(positions, normals, uvs, indices);
  }

  private appendCap(
    z: number,
    direction: 1 | -1,
    segments: number,
    positions: number[],
    normals: number[],
    uvs: number[],
    indices: number[],
    scale = 1,
  ): void {
    const params = this.paramsAt(z);
    const base = positions.length / 3;
    const cy = (params.top + params.bottom) / 2;
    positions.push(params.cx, cy, z);
    normals.push(0, 0, direction);
    uvs.push(direction < 0 ? 0 : 1, 0.5);
    const p = new Vector3();
    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      this.pointAt(z, t, p, params);
      positions.push(params.cx + (p.x - params.cx) * scale, cy + (p.y - cy) * scale, z);
      normals.push(0, 0, direction);
      uvs.push(direction < 0 ? 0 : 1, t);
    }
    for (let j = 0; j < segments; j++) {
      const a = base + 1 + j;
      if (direction > 0) indices.push(base, a, a + 1);
      else indices.push(base, a + 1, a);
    }
  }
}

// ─── Utilidades ──────────────────────────────────────────────────────────

const TMP_A = new Vector3();
const TMP_B = new Vector3();
const TMP_C = new Vector3();
const TMP_D = new Vector3();

function emptyParams(): SectionParams {
  return { ...DEFAULTS };
}

function signedPow(value: number, exponent: number): number {
  return Math.sign(value) * Math.pow(Math.abs(value), exponent);
}

/** Interpolación de Hermite cúbica en [0, 1]. */
function hermite(p0: number, p1: number, m0: number, m1: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1;
}

/** Pendientes de Fritsch–Carlson: la curva no sobrepasa los valores de las secciones. */
function monotoneSlopes(xs: readonly number[], ys: readonly number[]): number[] {
  const n = xs.length;
  const deltas: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    deltas.push(((ys[i + 1] ?? 0) - (ys[i] ?? 0)) / ((xs[i + 1] ?? 0) - (xs[i] ?? 0)));
  }
  const slopes: number[] = new Array<number>(n).fill(0);
  slopes[0] = deltas[0] ?? 0;
  slopes[n - 1] = deltas[n - 2] ?? 0;
  for (let i = 1; i < n - 1; i++) {
    const d0 = deltas[i - 1] ?? 0;
    const d1 = deltas[i] ?? 0;
    slopes[i] = d0 * d1 <= 0 ? 0 : (d0 + d1) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    const d = deltas[i] ?? 0;
    if (d === 0) {
      slopes[i] = 0;
      slopes[i + 1] = 0;
      continue;
    }
    const a = (slopes[i] ?? 0) / d;
    const b = (slopes[i + 1] ?? 0) / d;
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      slopes[i] = tau * a * d;
      slopes[i + 1] = tau * b * d;
    }
  }
  return slopes;
}

function makeGeometry(positions: number[], normals: number[], uvs: number[], indices: number[]): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}
