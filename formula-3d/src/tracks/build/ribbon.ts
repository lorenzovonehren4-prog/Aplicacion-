/**
 * "Cintas" que siguen la pista: para cada fila a lo largo de `s` se toma un
 * perfil transversal (puntos a distintas distancias laterales `d` y alturas)
 * y se unen las filas con triángulos. Con esto se arman asfalto, líneas,
 * pianos, escapatorias, muros, alambrados y tribunas.
 *
 * Orientación: con puntos del perfil ordenados de izquierda a derecha (d
 * creciente) la cara mira hacia arriba. Para una pared vertical, subir en el
 * perfil (y creciente) mira hacia la izquierda de la pista; bajar, hacia la
 * derecha.
 */

import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { TrackGeometry } from '../TrackGeometry';

/** Punto del perfil: distancia lateral, altura y (opcional) color RGB 0–1. */
export type ProfilePoint = readonly [d: number, y: number, color?: readonly [number, number, number]];

export interface RibbonOptions {
  /** Tramo (s, m). Si `to` < `from` el tramo cruza el inicio del trazado. */
  from: number;
  to: number;
  /** Separación entre filas (m). */
  step: number;
  /** Perfil transversal en la muestra `index` (distancia `s`). */
  profile: (index: number, s: number) => readonly ProfilePoint[];
  /** Metros de pista por repetición de la textura a lo largo. */
  vLength: number;
  /**
   * Coordenada U: 'normalized' = 0–1 a lo largo del perfil; 'meters' = distancia
   * recorrida por el perfil dividida por `uLength`.
   */
  u?: 'normalized' | 'meters';
  uLength?: number;
}

/** Tramo completo (vuelta entera). */
export function fullLap(geometry: TrackGeometry): { from: number; to: number } {
  return { from: 0, to: geometry.length };
}

export function buildRibbon(geometry: TrackGeometry, options: RibbonOptions): BufferGeometry {
  const span = options.to >= options.from ? options.to - options.from : geometry.length - options.from + options.to;
  const rows = Math.max(1, Math.ceil(span / options.step));
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const point = { x: 0, z: 0 };
  let columns = -1;
  let hasColor = false;

  for (let k = 0; k <= rows; k++) {
    const along = Math.min(span, k * options.step);
    const s = options.from + along;
    const index = geometry.indexAt(s);
    const profile = options.profile(index, geometry.wrapS(s));
    if (columns < 0) columns = profile.length;
    if (profile.length !== columns) throw new Error('El perfil de una cinta debe tener siempre la misma cantidad de puntos.');

    let travelled = 0;
    let total = 0;
    for (let j = 1; j < profile.length; j++) {
      const a = profile[j - 1];
      const b = profile[j];
      if (a && b) total += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    for (let j = 0; j < profile.length; j++) {
      const p = profile[j];
      if (!p) continue;
      if (j > 0) {
        const prev = profile[j - 1];
        if (prev) travelled += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      }
      geometry.pointAt(s, p[0], point);
      positions.push(point.x, p[1], point.z);
      const u =
        options.u === 'meters' ? travelled / (options.uLength ?? 1) : total > 0 ? travelled / total : j / (profile.length - 1);
      uvs.push(u, (options.from + along) / options.vLength);
      const color = p[2];
      if (color) hasColor = true;
      colors.push(color?.[0] ?? 1, color?.[1] ?? 1, color?.[2] ?? 1);
    }
  }

  for (let k = 0; k < rows; k++) {
    for (let j = 0; j < columns - 1; j++) {
      const a = k * columns + j;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  const result = new BufferGeometry();
  result.setAttribute('position', new Float32BufferAttribute(positions, 3));
  result.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  if (hasColor) result.setAttribute('color', new Float32BufferAttribute(colors, 3));
  result.setIndex(indices);
  result.computeVertexNormals();
  result.computeBoundingSphere();
  return result;
}

/**
 * Tramos contiguos donde se cumple una condición por muestra (p. ej. "hay
 * grava a la izquierda"). Devuelve pares [from, to] en metros.
 */
export function spansWhere(geometry: TrackGeometry, test: (index: number) => boolean, minLength = 4): Array<[number, number]> {
  const n = geometry.count;
  // Se arranca donde la condición es falsa para no partir un tramo en dos.
  let origin = 0;
  while (origin < n && test(origin)) origin++;
  if (origin === n) return [[0, geometry.length]];
  const spans: Array<[number, number]> = [];
  let start = -1;
  for (let k = 0; k <= n; k++) {
    const i = geometry.wrapIndex(origin + k);
    const inside = k < n && test(i);
    if (inside && start < 0) start = origin + k;
    if (!inside && start >= 0) {
      const from = geometry.wrapS(start * geometry.ds);
      const length = (origin + k - start) * geometry.ds;
      if (length >= minLength) spans.push([from, geometry.wrapS(from + length)]);
      start = -1;
    }
  }
  return spans;
}

/**
 * Para caras verticales del lado izquierdo de la pista: el perfil va de
 * arriba hacia abajo (U invertida) y se ven con el sentido de la pista hacia
 * la derecha (V invertida respecto del lado derecho). Invertir ambas deja los
 * textos y logos igual que del lado derecho.
 */
export function mirrorLeftSideUV(geometry: BufferGeometry): BufferGeometry {
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, 1 - uv.getX(i), -uv.getY(i));
  uv.needsUpdate = true;
  return geometry;
}
