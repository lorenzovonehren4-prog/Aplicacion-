/**
 * Análisis automático del circuito a partir de la curvatura (nada se marca a
 * mano). Ver PLAN.md §5.1.
 *
 * - Velocidad máxima en cada punto por equilibrio de fuerzas con carga
 *   aerodinámica: v²·κ = μ·(g + k·v²)  →  v = √(μg / (κ − μk)).
 * - Perfil de velocidad con una pasada hacia adelante (aceleración limitada por
 *   potencia y agarre) y otra hacia atrás (frenada limitada por agarre).
 * - Curvas: zonas de curvatura sostenida, con ápice, velocidad segura y punto
 *   de frenada (donde manda la pasada hacia atrás).
 */

import type { PerformanceModel } from '../race/physics/CarSpec';
import type { Side } from './TrackDefinition';
import type { TrackGeometry } from './TrackGeometry';

export interface Corner {
  /** Número de curva (1 = la primera después de la línea de meta). */
  number: number;
  direction: Side;
  /** Inicio, ápice y fin de la curva (s, m). */
  start: number;
  apex: number;
  end: number;
  /** Radio mínimo (m). */
  radius: number;
  /** Velocidad máxima segura: la más baja del perfil dentro de la curva (m/s). */
  safeSpeed: number;
  /** Velocidad al llegar (antes de frenar), m/s. */
  entrySpeed: number;
  /** Dónde empieza la frenada (s), o null si la curva se hace a fondo. */
  brakingPoint: number | null;
}

export interface TrackAnalysis {
  corners: Corner[];
  /** Velocidad límite por curvatura en cada muestra (m/s). */
  cornerLimit: Float32Array;
  /** Perfil de velocidad de una vuelta rápida (m/s). */
  speed: Float32Array;
  /** 1 si en esa muestra se está frenando para la curva siguiente. */
  braking: Uint8Array;
  /** Tiempo teórico de vuelta con el perfil (s). */
  lapTime: number;
}

/** Curvatura mínima (1/m) para considerar que hay curva: radio < 500 m. */
const CORNER_CURVATURE = 1 / 500;
/** Dos zonas del mismo sentido separadas por menos de esto son una sola curva (m). */
const MERGE_GAP = 25;
/** Curvas más cortas que esto se ignoran (ruido de la spline), m. */
const MIN_CORNER_LENGTH = 12;

/** Velocidad de curva segura para una curvatura dada. */
export function cornerSpeed(curvature: number, model: PerformanceModel): number {
  const k = Math.abs(curvature);
  const limit = model.topSpeed * 1.05;
  const denominator = k - model.grip * model.downforcePerMass;
  if (k < 1e-5 || denominator <= 0) return limit;
  return Math.min(limit, Math.sqrt((model.grip * model.gravity) / denominator));
}

/**
 * Aceleración longitudinal disponible (m/s²) a velocidad `v` cuando ya se usa
 * `lateral` m/s² para doblar (elipse de fricción).
 */
function longitudinalLimit(v: number, lateral: number, model: PerformanceModel): number {
  const load = model.gravity + model.downforcePerMass * v * v;
  const usage = Math.min(1, lateral / (model.grip * load));
  return model.longitudinalGrip * load * Math.sqrt(1 - usage * usage);
}

/**
 * Analiza el circuito. `startS` es la línea de meta: las curvas se numeran a
 * partir de ahí (la curva 1 es la primera después de la largada).
 */
export function analyzeTrack(geometry: TrackGeometry, model: PerformanceModel, startS = 0): TrackAnalysis {
  const n = geometry.count;
  const ds = geometry.ds;
  const cornerLimit = new Float32Array(n);
  for (let i = 0; i < n; i++) cornerLimit[i] = cornerSpeed(geometry.curvature[i] ?? 0, model);

  // Pasada hacia adelante (acelerar). Dos vueltas para que el cierre se estabilice.
  const forward = new Float32Array(n);
  let v = 0;
  for (let lap = 0; lap < 2; lap++) {
    for (let i = 0; i < n; i++) {
      const limit = cornerLimit[i] ?? 0;
      const lateral = v * v * Math.abs(geometry.curvature[i] ?? 0);
      const tractionLeft = longitudinalLimit(v, lateral, model);
      const powerAccel = model.powerPerMass / Math.max(v, 5);
      const accel = Math.min(tractionLeft, powerAccel) - model.dragPerMass * v * v;
      v = Math.min(limit, Math.sqrt(Math.max(0, v * v + 2 * Math.max(0, accel) * ds)));
      forward[i] = v;
    }
  }

  // Pasada hacia atrás (frenar).
  const speed = new Float32Array(forward);
  const braking = new Uint8Array(n);
  let next = speed[0] ?? 0;
  for (let lap = 0; lap < 2; lap++) {
    for (let i = n - 1; i >= 0; i--) {
      const lateral = next * next * Math.abs(geometry.curvature[i] ?? 0);
      // Se frena al 92 % de lo posible: margen realista para un piloto.
      const brakeAccel = longitudinalLimit(next, lateral, model) * 0.92 + model.dragPerMass * next * next;
      const reachable = Math.sqrt(next * next + 2 * brakeAccel * ds);
      const current = speed[i] ?? 0;
      if (reachable < current) {
        speed[i] = reachable;
        braking[i] = 1;
      }
      next = speed[i] ?? 0;
    }
  }

  let lapTime = 0;
  for (let i = 0; i < n; i++) lapTime += ds / Math.max(1, speed[i] ?? 1);

  return {
    corners: findCorners(geometry, speed, startS),
    cornerLimit,
    speed,
    braking,
    lapTime,
  };
}

function findCorners(
  geometry: TrackGeometry,
  speed: Float32Array,
  startS: number,
): Corner[] {
  const n = geometry.count;
  const ds = geometry.ds;
  const sign = (i: number): number => {
    const k = geometry.curvature[geometry.wrapIndex(i)] ?? 0;
    return Math.abs(k) < CORNER_CURVATURE ? 0 : Math.sign(k);
  };

  // Se arranca en una muestra recta para no partir una curva al medio.
  let origin = 0;
  while (origin < n && sign(origin) !== 0) origin++;

  // Zonas contiguas del mismo signo.
  const zones: Array<{ from: number; to: number; dir: number }> = [];
  for (let k = 0; k < n; k++) {
    const i = origin + k;
    const s = sign(i);
    if (s === 0) continue;
    const last = zones[zones.length - 1];
    if (last && last.dir === s && i - last.to <= Math.ceil(MERGE_GAP / ds)) last.to = i;
    else zones.push({ from: i, to: i, dir: s });
  }

  const corners: Corner[] = [];
  for (const zone of zones) {
    if ((zone.to - zone.from + 1) * ds < MIN_CORNER_LENGTH) continue;
    let apex = zone.from;
    let maxK = 0;
    for (let i = zone.from; i <= zone.to; i++) {
      const k = Math.abs(geometry.curvature[geometry.wrapIndex(i)] ?? 0);
      if (k > maxK) {
        maxK = k;
        apex = i;
      }
    }
    // Punto más lento de la curva: ahí termina la frenada (si la hay).
    let slowest = zone.from;
    for (let i = zone.from; i <= zone.to; i++) {
      if ((speed[geometry.wrapIndex(i)] ?? 0) < (speed[geometry.wrapIndex(slowest)] ?? 0)) slowest = i;
    }
    const safeSpeed = speed[geometry.wrapIndex(slowest)] ?? 0;

    // Desde ahí hacia atrás: primero la meseta del arco (velocidad casi
    // constante), después la desaceleración; donde ésta empieza, se frena.
    const at = (i: number): number => speed[geometry.wrapIndex(i)] ?? 0;
    let j = slowest;
    const plateauLimit = zone.from - Math.ceil(20 / ds);
    while (j > plateauLimit && at(j - 1) <= at(j) + 0.3) j--;
    let steps = 0;
    while (steps < n / 2 && at(j - 1) > at(j) + 1e-4) {
      j--;
      steps++;
    }
    const entrySpeed = Math.max(safeSpeed, at(j));
    const brakingPoint = entrySpeed - safeSpeed > 1 ? geometry.wrapIndex(j) * ds : null;

    // Ápice: el punto más lento si hay que frenar; si no, el de mayor curvatura.
    const apexIndex = geometry.wrapIndex(brakingPoint === null ? apex : slowest);
    corners.push({
      number: 0,
      direction: zone.dir > 0 ? 'right' : 'left',
      start: geometry.wrapIndex(zone.from) * ds,
      apex: apexIndex * ds,
      end: geometry.wrapIndex(zone.to) * ds,
      radius: maxK > 0 ? 1 / maxK : Infinity,
      safeSpeed,
      entrySpeed,
      brakingPoint,
    });
  }
  const fromStart = (corner: Corner): number => geometry.wrapS(corner.apex - startS);
  corners.sort((a, b) => fromStart(a) - fromStart(b));
  corners.forEach((corner, i) => (corner.number = i + 1));
  return corners;
}
