/**
 * Lo que hay a los costados del asfalto, calculado a partir de las curvas:
 * pianos (interior del ápice y exterior de la salida), escapatorias (grava por
 * fuera de las frenadas fuertes, asfalto en curvas rápidas, pasto en el
 * resto), muro de boxes y muros de contención. Se guarda por muestra (cada ~1 m)
 * para que física, mallas y efectos lo consulten al instante.
 */

import type { Corner, TrackAnalysis } from './TrackAnalysis';
import type { RunoffKind, Side, TrackDefinition } from './TrackDefinition';
import type { TrackGeometry } from './TrackGeometry';

export type SurfaceType = 'asphalt' | 'kerb' | RunoffKind | 'wall';

export const RUNOFF_KINDS: readonly RunoffKind[] = ['grass', 'gravel', 'tarmac'];

export interface KerbSpan {
  side: Side;
  /** Inicio y fin (s, m); si `to` < `from` el piano cruza la línea de inicio del trazado. */
  from: number;
  to: number;
  width: number;
}

export interface Trackside {
  kerbs: KerbSpan[];
  /** Ancho del piano en cada muestra (0 = sin piano). */
  kerbLeft: Float32Array;
  kerbRight: Float32Array;
  /** Tipo de escapatoria (índice en `RUNOFF_KINDS`). */
  runoffLeft: Uint8Array;
  runoffRight: Uint8Array;
  /** Distancia del centro de la pista a la cara del muro (m, siempre positiva). */
  wallLeft: Float32Array;
  wallRight: Float32Array;
  /**
   * 1 = sin muro en esa muestra (otro tramo de la pista cruza por ahí, como en
   * el cruce de Suzuka): ni la física ni las mallas ponen muro.
   */
  gapLeft: Uint8Array;
  gapRight: Uint8Array;
}

/** Escapatoria por defecto (borde de pista → muro) en rectas (m). */
const DEFAULT_RUNOFF = 9;
/** En los circuitos urbanos el muro va casi pegado (m) y las frenadas tienen salida de asfalto. */
const STREET_RUNOFF = 3;
const STREET_ESCAPE = 9;
/** Tramos de pista más cercanos que esto a lo largo de la vuelta son "el mismo" (m). */
const NEIGHBOUR_SKIP = 120;
/** Hasta dónde se buscan otros tramos a los costados (m). */
const NEIGHBOUR_REACH = 90;
/** Separación mínima del muro al borde del asfalto para poner un muro divisorio (m). */
const MEDIAN_MIN = 1.2;
/** Coseno del ángulo entre tramos por debajo del cual se cruzan (más de ~35°). */
const CROSSING_DOT = 0.82;
const KERB_INSIDE = 1.2;
const KERB_OUTSIDE = 1.7;
/** Curvas más abiertas que esto no llevan pianos (m). */
const KERB_MAX_RADIUS = 360;
/** Ventana de suavizado de los muros (m a cada lado). */
const WALL_SMOOTHING = 24;
/** Tramo (m, a cada lado) donde se busca la curva más cerrada para limitar el muro interior. */
const INSIDE_REACH = 30;

export function planTrackside(def: TrackDefinition, geometry: TrackGeometry, analysis: TrackAnalysis): Trackside {
  const n = geometry.count;
  const hw = geometry.halfWidth;
  const street = def.scenery.street !== undefined;
  const base = street ? STREET_RUNOFF : DEFAULT_RUNOFF;
  const runoffWidth = { left: new Float32Array(n).fill(base), right: new Float32Array(n).fill(base) };
  // En la ciudad, lo que hay entre la pista y el muro es asfalto.
  const kind = { left: new Uint8Array(n).fill(street ? 2 : 0), right: new Uint8Array(n).fill(street ? 2 : 0) };
  const kerbs: KerbSpan[] = [];

  const range = (from: number, to: number, fn: (i: number) => void): void => {
    const length = geometry.wrapS(to - from);
    const steps = Math.ceil(length / geometry.ds);
    const start = geometry.indexAt(from);
    for (let k = 0; k <= steps; k++) fn(geometry.wrapIndex(start + k));
  };
  const setRunoff = (side: Side, from: number, to: number, runoff: RunoffKind, width: number, onlyWider = true): void => {
    const index = RUNOFF_KINDS.indexOf(runoff);
    range(from, to, (i) => {
      const current = runoffWidth[side][i] ?? base;
      if (!onlyWider || width >= current || runoff === 'gravel') {
        runoffWidth[side][i] = onlyWider ? Math.max(current, width) : width;
        kind[side][i] = index;
      }
    });
  };

  for (const corner of analysis.corners) planCorner(corner, geometry, kerbs, setRunoff, street);

  // Muro de boxes: pegado a la pista a lo largo de la zona de pits.
  const pitFrom = geometry.designToS(def.pits.from);
  const pitTo = geometry.designToS(def.pits.to);
  setRunoff(def.pits.side, pitFrom, pitTo, 'tarmac', 3.5, false);

  for (const override of def.runoff ?? []) {
    setRunoff(override.side, geometry.designToS(override.from), geometry.designToS(override.to), override.kind, override.width, false);
  }

  const kerbLeft = new Float32Array(n);
  const kerbRight = new Float32Array(n);
  for (const kerb of kerbs) {
    const target = kerb.side === 'left' ? kerbLeft : kerbRight;
    range(kerb.from, kerb.to, (i) => (target[i] = Math.max(target[i] ?? 0, kerb.width)));
  }

  const wallLeft = smoothWalls(geometry, runoffWidth.left, kerbLeft, -1, hw);
  const wallRight = smoothWalls(geometry, runoffWidth.right, kerbRight, 1, hw);
  const gapLeft = new Uint8Array(n);
  const gapRight = new Uint8Array(n);
  separateNeighbours(geometry, wallLeft, gapLeft, kind.left, -1);
  separateNeighbours(geometry, wallRight, gapRight, kind.right, 1);
  return { kerbs, kerbLeft, kerbRight, runoffLeft: kind.left, runoffRight: kind.right, wallLeft, wallRight, gapLeft, gapRight };
}

/**
 * Distancia libre hacia un costado (`side` = +1 derecha, −1 izquierda) hasta
 * otro tramo de la misma pista: en los trazados reales hay rectas paralelas a
 * pocos metros (horquillas, calles vecinas). Se busca en una grilla con los
 * puntos de la línea central; sólo cuentan los que están más o menos de frente
 * (a menos de 45° de la perpendicular) y lejos a lo largo de la vuelta.
 */
function neighbourClearance(geometry: TrackGeometry, side: 1 | -1): { clearance: Float32Array; crossing: Uint8Array } {
  const n = geometry.count;
  const cell = 20;
  const grid = new Map<string, number[]>();
  const key = (cx: number, cz: number): string => `${cx},${cz}`;
  const stride = Math.max(1, Math.round(2 / geometry.ds));
  for (let i = 0; i < n; i += stride) {
    const k = key(Math.floor((geometry.x[i] ?? 0) / cell), Math.floor((geometry.z[i] ?? 0) / cell));
    const list = grid.get(k);
    if (list) list.push(i);
    else grid.set(k, [i]);
  }
  const reach = Math.ceil(NEIGHBOUR_REACH / cell);
  const clearance = new Float32Array(n).fill(Infinity);
  const crossing = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const x = geometry.x[i] ?? 0;
    const z = geometry.z[i] ?? 0;
    const tx = geometry.tx[i] ?? 0;
    const tz = geometry.tz[i] ?? 1;
    // Derecha = (−tz, tx) (ver `TrackGeometry.pointAt`).
    const rx = -tz * side;
    const rz = tx * side;
    const cx = Math.floor(x / cell);
    const cz = Math.floor(z / cell);
    let best = Infinity;
    let bestJ = -1;
    for (let gx = cx - reach; gx <= cx + reach; gx++) {
      for (let gz = cz - reach; gz <= cz + reach; gz++) {
        const list = grid.get(key(gx, gz));
        if (!list) continue;
        for (const j of list) {
          if (Math.abs(geometry.deltaS(i * geometry.ds, j * geometry.ds)) < NEIGHBOUR_SKIP) continue;
          const dx = (geometry.x[j] ?? 0) - x;
          const dz = (geometry.z[j] ?? 0) - z;
          const lateral = dx * rx + dz * rz;
          if (lateral <= 0 || Math.abs(dx * tx + dz * tz) > lateral) continue;
          const distance = Math.hypot(dx, dz);
          if (distance < best) {
            best = distance;
            bestJ = j;
          }
        }
      }
    }
    clearance[i] = best;
    // Un tramo que pasa de través (no paralelo) es un cruce, no una calle vecina.
    if (bestJ >= 0) {
      const dot = Math.abs(tx * (geometry.tx[bestJ] ?? 0) + tz * (geometry.tz[bestJ] ?? 0));
      if (dot < CROSSING_DOT) crossing[i] = 1;
    }
  }
  return { clearance, crossing };
}

/**
 * Que ningún muro quede dentro de otro tramo de la pista: si otro tramo pasa
 * cerca, el muro va a mitad de camino (muro divisorio compartido); si lo
 * cruza (no hay lugar para un muro entre los dos asfaltos), ese tramo queda
 * sin muro y con pasto, para que se pueda pasar.
 */
function separateNeighbours(geometry: TrackGeometry, wall: Float32Array, gap: Uint8Array, kind: Uint8Array, side: 1 | -1): void {
  const n = geometry.count;
  const hw = geometry.halfWidth;
  const near = neighbourClearance(geometry, side);
  const limit = new Float32Array(n).fill(Infinity);
  const crossing = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const c = near.clearance[i] ?? Infinity;
    if (!Number.isFinite(c)) continue;
    const middle = c / 2 - 0.25;
    if (middle >= hw + MEDIAN_MIN) limit[i] = middle;
    else if (near.crossing[i] === 1) crossing[i] = 1;
    // Calles paralelas muy juntas: muro divisorio igual (aunque achique un poco el paso).
    else limit[i] = Math.max(middle, hw * 0.75);
  }
  // El muro divisorio empieza un poco antes y termina un poco después (mínimo
  // móvil), y sin escalones (promedio móvil).
  const window = Math.max(1, Math.round(10 / geometry.ds));
  const eased = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let low = Infinity;
    for (let k = -window; k <= window; k++) low = Math.min(low, limit[geometry.wrapIndex(i + k)] ?? Infinity);
    eased[i] = low;
  }
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let k = -window; k <= window; k++) {
      const value = eased[geometry.wrapIndex(i + k)] ?? Infinity;
      sum += Math.min(value, wall[i] ?? value);
    }
    const target = sum / (2 * window + 1);
    wall[i] = Math.max(hw * 0.75, Math.min(wall[i] ?? target, target));
  }
  // Cruces: sin muro en todo el ancho del otro asfalto (y un margen).
  const spread = Math.max(1, Math.round((hw + 6) / geometry.ds));
  for (let i = 0; i < n; i++) {
    if (!crossing[i]) continue;
    for (let k = -spread; k <= spread; k++) {
      const j = geometry.wrapIndex(i + k);
      gap[j] = 1;
      kind[j] = 0;
    }
  }
}

function planCorner(
  corner: Corner,
  geometry: TrackGeometry,
  kerbs: KerbSpan[],
  setRunoff: (side: Side, from: number, to: number, runoff: RunoffKind, width: number) => void,
  street: boolean,
): void {
  const inside: Side = corner.direction;
  const outside: Side = corner.direction === 'right' ? 'left' : 'right';
  const toApex = geometry.wrapS(corner.apex - corner.start);
  const fromApex = geometry.wrapS(corner.end - corner.apex);
  const slowdown = corner.entrySpeed - corner.safeSpeed;

  if (street) {
    // En la ciudad: salida de asfalto recta en las frenadas fuertes; el resto, muro pegado.
    if (corner.brakingPoint !== null && slowdown > 12) setRunoff(outside, corner.start - 30, corner.end + 20, 'tarmac', STREET_ESCAPE);
  } else if (corner.brakingPoint !== null && slowdown > 12) {
    // Frenada fuerte: cama de grava por fuera, desde antes del ápice hasta la salida.
    const brakeLength = geometry.wrapS(corner.apex - corner.brakingPoint);
    const width = Math.min(32, Math.max(18, 10 + corner.entrySpeed * 0.28));
    setRunoff(outside, corner.apex - brakeLength * 0.35, corner.end + 60, 'gravel', width);
  } else if (corner.radius < 600) {
    // Curva rápida: escapatoria asfaltada por fuera.
    setRunoff(outside, corner.start - 20, corner.end + 40, 'tarmac', 13);
  }

  if (corner.radius > KERB_MAX_RADIUS) return;
  kerbs.push({
    side: inside,
    from: geometry.wrapS(corner.start + toApex * 0.35),
    to: geometry.wrapS(corner.apex + fromApex * 0.35),
    width: KERB_INSIDE,
  });
  kerbs.push({
    side: outside,
    from: geometry.wrapS(corner.apex + fromApex * 0.2),
    to: geometry.wrapS(corner.end + 18),
    width: KERB_OUTSIDE,
  });
}

/**
 * Convierte las escapatorias en la distancia del muro al centro, suavizada
 * (sin escalones) y sin cruzarse en el interior de curvas cerradas.
 */
function smoothWalls(geometry: TrackGeometry, runoff: Float32Array, kerb: Float32Array, side: 1 | -1, hw: number): Float32Array {
  const n = geometry.count;
  const window = Math.max(1, Math.round(WALL_SMOOTHING / geometry.ds));
  // Dilatación: el muro toma el máximo de su vecindario (no se "come" las gravas)…
  const dilated = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let max = 0;
    for (let k = -window; k <= window; k++) {
      const j = geometry.wrapIndex(i + k);
      max = Math.max(max, (runoff[j] ?? 0) + (kerb[j] ?? 0));
    }
    dilated[i] = max;
  }
  // Curvatura hacia este lado más cerrada en los alrededores: en una S (curva
  // a un lado pegada a otra al otro) la escapatoria de afuera de una queda
  // adentro de la siguiente, y mirar sólo el punto dejaba el muro más allá
  // del centro de giro unos metros más adelante (la cinta se plegaba).
  const reach = Math.max(1, Math.round(INSIDE_REACH / geometry.ds));
  const inside = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let max = 0;
    for (let k = -reach; k <= reach; k++) max = Math.max(max, (geometry.curvature[geometry.wrapIndex(i + k)] ?? 0) * side);
    inside[i] = max;
  }
  // …y luego un promedio para que las transiciones sean curvas suaves.
  const wall = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let k = -window; k <= window; k++) sum += dilated[geometry.wrapIndex(i + k)] ?? 0;
    let distance = hw + sum / (2 * window + 1);
    // En el interior de una curva el muro no puede pasar el centro de giro.
    const k = inside[i] ?? 0;
    if (k > 0) distance = Math.min(distance, Math.max(hw + 2.5, 0.7 / k));
    wall[i] = distance;
  }
  return wall;
}

/** Superficie en la muestra `index` a una distancia lateral `d`. */
export function surfaceAt(trackside: Trackside, halfWidth: number, index: number, d: number): SurfaceType {
  const offset = Math.abs(d);
  if (offset <= halfWidth) return 'asphalt';
  const right = d > 0;
  const beyond = offset - halfWidth;
  const kerb = (right ? trackside.kerbRight : trackside.kerbLeft)[index] ?? 0;
  if (beyond <= kerb) return 'kerb';
  const wall = (right ? trackside.wallRight : trackside.wallLeft)[index] ?? Infinity;
  const gap = (right ? trackside.gapRight : trackside.gapLeft)[index] === 1;
  if (offset >= wall && !gap) return 'wall';
  return RUNOFF_KINDS[(right ? trackside.runoffRight : trackside.runoffLeft)[index] ?? 0] ?? 'grass';
}
