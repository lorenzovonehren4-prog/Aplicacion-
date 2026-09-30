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
}

/** Escapatoria por defecto (borde de pista → muro) en rectas (m). */
const DEFAULT_RUNOFF = 9;
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
  const runoffWidth = { left: new Float32Array(n).fill(DEFAULT_RUNOFF), right: new Float32Array(n).fill(DEFAULT_RUNOFF) };
  const kind = { left: new Uint8Array(n), right: new Uint8Array(n) };
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
      const current = runoffWidth[side][i] ?? DEFAULT_RUNOFF;
      if (!onlyWider || width >= current || runoff === 'gravel') {
        runoffWidth[side][i] = onlyWider ? Math.max(current, width) : width;
        kind[side][i] = index;
      }
    });
  };

  for (const corner of analysis.corners) planCorner(corner, geometry, kerbs, setRunoff);

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

  return {
    kerbs,
    kerbLeft,
    kerbRight,
    runoffLeft: kind.left,
    runoffRight: kind.right,
    wallLeft: smoothWalls(geometry, runoffWidth.left, kerbLeft, -1, hw),
    wallRight: smoothWalls(geometry, runoffWidth.right, kerbRight, 1, hw),
  };
}

function planCorner(
  corner: Corner,
  geometry: TrackGeometry,
  kerbs: KerbSpan[],
  setRunoff: (side: Side, from: number, to: number, runoff: RunoffKind, width: number) => void,
): void {
  const inside: Side = corner.direction;
  const outside: Side = corner.direction === 'right' ? 'left' : 'right';
  const toApex = geometry.wrapS(corner.apex - corner.start);
  const fromApex = geometry.wrapS(corner.end - corner.apex);
  const slowdown = corner.entrySpeed - corner.safeSpeed;

  if (corner.brakingPoint !== null && slowdown > 12) {
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
  if (offset >= wall) return 'wall';
  return RUNOFF_KINDS[(right ? trackside.runoffRight : trackside.runoffLeft)[index] ?? 0] ?? 'grass';
}
