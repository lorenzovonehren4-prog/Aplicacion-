/**
 * Convierte la descripción por tramos de un circuito (rectas y arcos) en
 * puntos de control densos para la spline. Es como dibujar con una tortuga:
 * se avanza, se gira con un radio dado, se avanza...
 *
 * Si el trazado de diseño no cierra exactamente (siempre queda un pequeño
 * desfase de redondeo), el error se reparte a lo largo de toda la vuelta.
 *
 * Los trazados reales (`kind: 'points'`) ya vienen como puntos: sólo se
 * miden las distancias.
 */

import type { PointsLayout, TrackLayout } from './TrackDefinition';

export interface TracedLayout {
  /** Puntos en coordenadas de diseño (x, z), sin repetir el primero al final. */
  points: Array<[number, number]>;
  /** Distancia de diseño de cada punto desde el inicio. */
  distances: number[];
  /** Longitud total de diseño (m). */
  length: number;
  /** Separación entre el final y el inicio antes de corregir (m). */
  closureError: number;
  /** Diferencia de rumbo entre el final y el inicio (grados, idealmente 0). */
  headingError: number;
}

const DEG = Math.PI / 180;

/** Vector "adelante" para un rumbo (0 = −Z). */
function forward(theta: number): [number, number] {
  return [Math.sin(theta), -Math.cos(theta)];
}

/** Vector "derecha" para un rumbo. */
function right(theta: number): [number, number] {
  return [Math.cos(theta), Math.sin(theta)];
}

/** Trazado real: los puntos tal cual, con su distancia acumulada (cierra solo). */
function tracePoints(layout: PointsLayout): TracedLayout {
  const points = layout.points.map(([px, pz]) => [px, pz] as [number, number]);
  const distances: number[] = [];
  let travelled = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i] ?? [0, 0];
    const previous = points[i - 1];
    if (previous) travelled += Math.hypot(p[0] - previous[0], p[1] - previous[1]);
    distances.push(travelled);
  }
  const first = points[0] ?? [0, 0];
  const last = points[points.length - 1] ?? first;
  const length = travelled + Math.hypot(first[0] - last[0], first[1] - last[1]);
  return { points, distances, length, closureError: 0, headingError: 0 };
}

export function traceLayout(layout: TrackLayout, step = 8): TracedLayout {
  if (layout.kind === 'points') return tracePoints(layout);
  let x = layout.start[0];
  let z = layout.start[1];
  let theta = layout.heading * DEG;
  const points: Array<[number, number]> = [[x, z]];
  const distances: number[] = [0];
  let travelled = 0;

  const push = (): void => {
    points.push([x, z]);
    distances.push(travelled);
  };

  for (const segment of layout.segments) {
    if (segment.kind === 'straight') {
      const n = Math.max(1, Math.ceil(segment.length / step));
      const [fx, fz] = forward(theta);
      for (let i = 1; i <= n; i++) {
        const d = segment.length / n;
        x += fx * d;
        z += fz * d;
        travelled += d;
        push();
      }
      continue;
    }
    const sign = segment.direction === 'right' ? 1 : -1;
    const total = segment.angle * DEG;
    const arc = segment.radius * total;
    const n = Math.max(2, Math.ceil(arc / step));
    const [rx, rz] = right(theta);
    // Centro del arco: a la derecha (giro a la derecha) o a la izquierda.
    const cx = x + rx * segment.radius * sign;
    const cz = z + rz * segment.radius * sign;
    const theta0 = theta;
    for (let i = 1; i <= n; i++) {
      theta = theta0 + sign * total * (i / n);
      const [qx, qz] = right(theta);
      x = cx - qx * segment.radius * sign;
      z = cz - qz * segment.radius * sign;
      travelled += arc / n;
      push();
    }
  }

  // El último punto debería coincidir con el primero: se mide y se corrige.
  const last = points.pop() ?? [x, z];
  distances.pop();
  const first = points[0] ?? [0, 0];
  const ex = last[0] - first[0];
  const ez = last[1] - first[1];
  for (let i = 0; i < points.length; i++) {
    const t = (distances[i] ?? 0) / travelled;
    const p = points[i];
    if (p) {
      p[0] -= ex * t;
      p[1] -= ez * t;
    }
  }
  const turned = (theta - layout.heading * DEG) / DEG;
  const headingError = ((((turned % 360) + 540) % 360) - 180);
  return {
    points,
    distances,
    length: travelled,
    closureError: Math.hypot(ex, ez),
    headingError,
  };
}
