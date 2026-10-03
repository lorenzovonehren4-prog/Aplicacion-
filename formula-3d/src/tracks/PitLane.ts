/**
 * Calle de boxes de un circuito: dónde se entra, dónde empieza y termina el
 * muro de boxes, los carriles y el lugar de parada de cada equipo. La usan el
 * entorno de pista (muros y escapatorias), las mallas y las paradas en boxes.
 *
 * A lo largo de la recta principal, del lado de los boxes:
 *
 *   entrada ── calle ── muro (punta) ════ boxes de los equipos ════ muro (fin) ── calle ── salida
 *
 * Entre la entrada y la punta del muro (y entre el fin del muro y la salida)
 * hay un desvío de asfalto: el auto se abre de la pista hacia la calle sin
 * cruzar ningún muro. El desvío se acorta donde la pista dobla hacia el lado
 * de boxes (en el interior de una curva cerrada no hay lugar para él).
 */

import type { Side, TrackDefinition } from './TrackDefinition';
import type { TrackGeometry } from './TrackGeometry';

/** Escapatoria entre el borde de la pista y el muro de boxes (m). */
export const PIT_WALL_RUNOFF = 3.5;
/** Ancho de la calle de boxes (m), sin el muro. */
const LANE_WIDTH = 13;
/** Tramo de calle antes de la punta del muro y después de su fin (m). */
const NOSE = 30;
/** Largo buscado de los desvíos de entrada y salida (m) y el mínimo. */
const RAMP_LENGTH = 150;
const RAMP_MIN = 50;
/**
 * Curvatura hacia el lado de boxes × distancia del muro de afuera que todavía
 * deja lugar al desvío (una cinta a más distancia que el radio se pliega).
 */
const RAMP_BEND = 0.55;
/** Separación entre los lugares de parada de los equipos (m): la normal y la mínima (calles cortas). */
const BOX_SPACING = 16;
const BOX_MIN_SPACING = 9;
/** Zona con límite de velocidad: desde antes del primer box hasta después del último (m). */
const LIMIT_MARGIN = 60;
/** Lugares de parada (uno por equipo). */
export const PIT_BOXES = 10;

export interface PitLane {
  side: Side;
  /** +1 si los boxes están a la derecha, −1 a la izquierda. */
  sign: 1 | -1;
  /** Comienzo del desvío de entrada (s). */
  entry: number;
  /** Calle de boxes (s): desde el fin del desvío de entrada hasta el comienzo del de salida. */
  from: number;
  to: number;
  /** Muro de boxes (s): de la punta (entrada) al final (salida). */
  wallFrom: number;
  wallTo: number;
  /** Fin del desvío de salida (s): ahí el auto ya volvió a la pista. */
  exit: number;
  /** Distancias al centro de la pista (m, sin signo): bordes de la calle, carril rápido, carril de trabajo y muro de afuera. */
  inner: number;
  outer: number;
  fast: number;
  box: number;
  outerWall: number;
  /** Zona con límite de velocidad (s). */
  limitFrom: number;
  limitTo: number;
  /** Lugar de parada de cada equipo (s), en el orden de los equipos. */
  boxes: number[];
}

/** Calle de boxes del circuito a partir de su zona de boxes. */
export function planPitLane(def: TrackDefinition, geometry: TrackGeometry): PitLane {
  const g = geometry;
  const hw = g.halfWidth;
  const sign: 1 | -1 = def.pits.side === 'right' ? 1 : -1;
  const from = g.designToS(def.pits.from);
  const to = g.designToS(def.pits.to);
  const inner = hw + PIT_WALL_RUNOFF + 0.6;
  const outer = inner + LANE_WIDTH;
  const outerWall = outer + 1;
  // Hasta dónde puede llegar el desvío sin plegarse en el interior de una curva.
  const ramp = (start: number, direction: 1 | -1): number => {
    let length = 0;
    for (let k = 0; k <= RAMP_LENGTH; k += 2) {
      const bend = g.curvatureAt(start + direction * k) * sign;
      if (bend * outerWall > RAMP_BEND) break;
      length = k;
    }
    return Math.max(RAMP_MIN, length);
  };
  const wallFrom = g.wrapS(from + NOSE);
  const wallTo = g.wrapS(to - NOSE);
  const span = g.wrapS(wallTo - wallFrom);
  // Los boxes, centrados en el muro (en calles cortas, más juntos).
  const spacing = Math.min(BOX_SPACING, Math.max(BOX_MIN_SPACING, (span - 40) / PIT_BOXES));
  const boxes = Array.from({ length: PIT_BOXES }, (_, i) => g.wrapS(wallFrom + span / 2 + (i - (PIT_BOXES - 1) / 2) * spacing));
  const half = ((PIT_BOXES - 1) / 2) * spacing + LIMIT_MARGIN;
  return {
    side: def.pits.side,
    sign,
    entry: g.wrapS(from - ramp(from, -1)),
    from,
    to,
    wallFrom,
    wallTo,
    exit: g.wrapS(to + ramp(to, 1)),
    inner,
    outer,
    fast: inner + 3.2,
    box: outer - 3.2,
    outerWall,
    limitFrom: g.wrapS(wallFrom + Math.max(0, span / 2 - half)),
    limitTo: g.wrapS(wallFrom + Math.min(span, span / 2 + half)),
    boxes,
  };
}
