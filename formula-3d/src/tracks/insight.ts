/**
 * Ficha técnica y guía curva por curva de un circuito, calculadas con el
 * mismo análisis que usa la carrera (perfil de velocidad del auto de fábrica
 * por la línea central): nada se escribe a mano. Cuesta unas decenas de
 * milisegundos por pista (sin la trazada ideal) y se guarda.
 */

import { F1_SPEC, performanceModel } from '../race/physics/CarSpec';
import { analyzeTrack, type Corner, type TrackAnalysis } from './TrackAnalysis';
import type { Side, TrackDefinition } from './TrackDefinition';
import { TrackGeometry } from './TrackGeometry';

export type CornerKind = 'hairpin' | 'slow' | 'medium' | 'fast' | 'flat';

export const CORNER_KIND_LABEL: Readonly<Record<CornerKind, string>> = {
  hairpin: 'Horquilla',
  slow: 'Lenta',
  medium: 'Media',
  fast: 'Rápida',
  flat: 'A fondo',
};

export interface CornerInfo {
  /** Número de curva (1 = la primera después de la meta), como en el mapa. */
  number: number;
  direction: Side;
  kind: CornerKind;
  /** Radio mínimo (m). */
  radius: number;
  /** Velocidad al llegar y mínima en la curva (km/h). */
  entryKmh: number;
  minKmh: number;
  /** Marcha en el punto más lento. */
  gear: number;
  /** Metros de frenada (null si se hace sin frenar). */
  brakingMeters: number | null;
  /** Metros hasta la curva siguiente. */
  nextGap: number;
  /** Consejo para manejarla. */
  tip: string;
}

export interface TrackInsight {
  /** Velocidad máxima de la vuelta (km/h). */
  topSpeedKmh: number;
  /** Promedio de la vuelta récord (km/h). */
  recordAverageKmh: number;
  /** Fracción de la vuelta a fondo (0–1). */
  fullThrottle: number;
  /** Tramo más largo a fondo (m). */
  longestFlatOut: number;
  /** Curvas con frenada, y de ésas, las que bajan 100 km/h o más. */
  brakingZones: number;
  heavyBraking: number;
  slowest: CornerInfo | null;
  /** La curva más rápida que pide frenar o levantar. */
  fastest: CornerInfo | null;
  kind: 'Urbano' | 'Semiurbano' | 'Permanente';
  corners: CornerInfo[];
  /** Curvas del análisis numeradas como en el mapa (para ubicarlas). */
  numbered: Corner[];
  /** Largo de la vuelta del análisis (m) y posición de la meta, para ubicar las curvas. */
  length: number;
  startS: number;
}

/**
 * Curvas "oficiales" a partir de las detectadas: las `count` más cerradas, en
 * el orden de la vuelta. Así no llevan número los quiebres de recta (radios
 * grandes) y la cuenta coincide con la del circuito (`turns`): en Monza son
 * justo las once de verdad, con la Curva Grande incluida.
 */
export function numberedCorners(corners: readonly Corner[], count: number): Corner[] {
  const keep = new Set([...corners].sort((a, b) => a.radius - b.radius).slice(0, count));
  return corners.filter((corner) => keep.has(corner));
}

/** rpm mínimas con las que se elige la marcha (por debajo, una menos). */
const GEAR_MIN_RPM = 7500;

/** Marcha que usa un piloto a esa velocidad: la más larga que todavía tiene empuje. */
export function gearForSpeed(speed: number): number {
  const wheelRpm = (speed / (2 * Math.PI * F1_SPEC.wheelRadius)) * 60;
  let gear = 1;
  F1_SPEC.gearRatios.forEach((ratio, i) => {
    if (wheelRpm * ratio >= GEAR_MIN_RPM) gear = i + 1;
  });
  return gear;
}

const KMH = 3.6;

function kindOf(corner: Corner, minKmh: number): CornerKind {
  if (corner.brakingPoint === null && minKmh > 240) return 'flat';
  if (corner.radius < 20 || minKmh < 72) return 'hairpin';
  if (minKmh < 145) return 'slow';
  if (minKmh < 215) return 'medium';
  return 'fast';
}

/** Consejo armado con los datos de la curva y de lo que viene después. */
function tipFor(info: Omit<CornerInfo, 'tip'>, next: Omit<CornerInfo, 'tip'> | undefined): string {
  const side = info.direction === 'left' ? 'izquierda' : 'derecha';
  const drop = info.entryKmh - info.minKmh;
  let tip: string;
  switch (info.kind) {
    case 'hairpin':
      tip = `Horquilla a la ${side}: frena fuerte y en línea recta desde ${info.entryKmh} km/h, entra lento en ${info.gear}.ª y piensa en la salida antes que en la entrada.`;
      break;
    case 'slow':
      tip =
        drop >= 120
          ? `Gran frenada: de ${info.entryKmh} a ${info.minKmh} km/h en unos ${info.brakingMeters ?? 0} m. Suelta el freno de a poco al doblar y acelera con el auto derecho.`
          : `Curva lenta a la ${side} en ${info.gear}.ª: no te pases en la entrada, que la salida decide la recta que sigue.`;
      break;
    case 'medium':
      tip =
        info.brakingMeters !== null && info.brakingMeters > 60
          ? `Frena corto (${info.brakingMeters} m) y dobla con la trazada amplia; vuelve al acelerador apenas pases el ápice.`
          : `Un toque de freno o sólo levantar: mantén ${info.minKmh} km/h por el medio y abre el volante al salir.`;
      break;
    case 'fast':
      tip = `Rápida a la ${side}: entra con confianza a unos ${info.minKmh} km/h; un toque de freno basta y el auto se apoya en la carga aerodinámica.`;
      break;
    case 'flat':
      tip = `A fondo: mantén la línea, no toques el freno y apunta al interior sin subirte de más al piano.`;
      break;
  }
  if (next && info.nextGap < 140 && next.direction !== info.direction && next.kind !== 'flat') {
    tip += ` Enlaza enseguida con la ${next.number}: sacrifica un poco esta salida para quedar bien puesto.`;
  } else if (info.nextGap > 900 && info.kind !== 'flat') {
    tip += ` Después viene una recta de ${(info.nextGap / 1000).toFixed(1)} km: cuida la tracción, ahí se gana el tiempo.`;
  }
  return tip;
}

const cache = new Map<string, TrackInsight>();
const analyses = new Map<string, { geometry: TrackGeometry; analysis: TrackAnalysis; startS: number }>();

/** Geometría y análisis del circuito con el auto de fábrica (lo mismo que arma la carrera). */
export function trackAnalysis(def: TrackDefinition): { geometry: TrackGeometry; analysis: TrackAnalysis; startS: number } {
  const cached = analyses.get(def.id);
  if (cached) return cached;
  const geometry = TrackGeometry.build(def);
  const startS = geometry.designToS(def.startLine);
  const result = { geometry, analysis: analyzeTrack(geometry, performanceModel(F1_SPEC), startS), startS };
  analyses.set(def.id, result);
  return result;
}

export function trackInsight(def: TrackDefinition): TrackInsight {
  const cached = cache.get(def.id);
  if (cached) return cached;
  const { geometry: g, analysis: a, startS } = trackAnalysis(def);
  const n = a.speed.length;
  const flat = new Uint8Array(n);
  let topSpeed = 0;
  let flatCount = 0;
  for (let i = 0; i < n; i++) {
    const v = a.speed[i] ?? 0;
    topSpeed = Math.max(topSpeed, v);
    // A fondo: no se frena y la curva no limita (se acelera o se va al tope).
    if (!a.braking[i] && v < (a.cornerLimit[i] ?? 0) * 0.985) {
      flat[i] = 1;
      flatCount++;
    }
  }
  // Tramo más largo a fondo (la vuelta es cerrada: se recorre dos veces).
  let run = 0;
  let longest = 0;
  for (let k = 0; k < n * 2; k++) {
    run = flat[k % n] ? run + 1 : 0;
    longest = Math.max(longest, Math.min(run, n));
  }

  const numbered = numberedCorners(a.corners, def.turns);
  const base = numbered.map((corner, i) => {
    const nextCorner = numbered[(i + 1) % numbered.length];
    const minKmh = Math.round(corner.safeSpeed * KMH);
    const entryKmh = Math.round(corner.entrySpeed * KMH);
    return {
      number: i + 1,
      direction: corner.direction,
      kind: kindOf(corner, minKmh),
      radius: Math.round(corner.radius),
      entryKmh,
      minKmh,
      gear: gearForSpeed(corner.safeSpeed),
      brakingMeters: corner.brakingPoint === null ? null : Math.round(g.wrapS(corner.apex - corner.brakingPoint)),
      nextGap: nextCorner && nextCorner !== corner ? Math.round(g.wrapS(nextCorner.start - corner.end)) : 0,
    };
  });
  const corners: CornerInfo[] = base.map((info, i) => ({ ...info, tip: tipFor(info, base[(i + 1) % base.length]) }));
  const braked = corners.filter((c) => c.brakingMeters !== null);
  const slowest = corners.reduce<CornerInfo | null>((best, c) => (!best || c.minKmh < best.minKmh ? c : best), null);
  const fastest = braked.reduce<CornerInfo | null>((best, c) => (!best || c.minKmh > best.minKmh ? c : best), null);
  // Yeda corre entera por calles (sin edificios dibujados junto a la pista).
  const street = def.id === 'jeddah' ? 'city' : def.scenery.street;
  const insight: TrackInsight = {
    topSpeedKmh: Math.round(topSpeed * KMH),
    recordAverageKmh: Math.round((def.lengthKm * 3600) / def.lapRecord.seconds),
    fullThrottle: flatCount / n,
    longestFlatOut: Math.round(longest * g.ds),
    brakingZones: braked.length,
    heavyBraking: braked.filter((c) => c.entryKmh - c.minKmh >= 100).length,
    slowest,
    fastest,
    kind: street === 'city' ? 'Urbano' : street === 'walls' ? 'Semiurbano' : 'Permanente',
    corners,
    numbered,
    length: g.length,
    startS,
  };
  cache.set(def.id, insight);
  return insight;
}
