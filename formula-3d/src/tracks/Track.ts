/**
 * Circuito listo para usar: datos + geometría + análisis + entorno de pista,
 * con todas las posiciones ya convertidas a metros del mundo.
 */

import { F1_SPEC, performanceModel, type CarSpec } from '../race/physics/CarSpec';
import { analyzeTrack, type TrackAnalysis } from './TrackAnalysis';
import type { Side, TrackDefinition } from './TrackDefinition';
import { TrackGeometry } from './TrackGeometry';
import { planTrackside, surfaceAt, type SurfaceType, type Trackside } from './Trackside';

export interface DrsZone {
  detection: number;
  start: number;
  end: number;
}

export interface GridSlot {
  /** Posición a lo largo de la pista (s) y lateral (d). */
  s: number;
  d: number;
}

/** Separación entre autos en la parrilla (m) y desplazamiento lateral alternado. */
const GRID_SPACING = 8;
const GRID_OFFSET = 2.6;
/** Distancia de la pole a la línea de meta (m). */
const POLE_BEHIND_LINE = 6;

export class Track {
  readonly geometry: TrackGeometry;
  readonly analysis: TrackAnalysis;
  readonly trackside: Trackside;
  /** Línea de meta (s). */
  readonly startS: number;
  /** Fin de los sectores 1 y 2 (s). */
  readonly sectorEnds: readonly [number, number];
  readonly drsZones: readonly DrsZone[];
  readonly pits: { side: Side; from: number; to: number };

  private constructor(
    readonly def: TrackDefinition,
    spec: CarSpec,
  ) {
    this.geometry = TrackGeometry.build(def);
    const g = this.geometry;
    this.startS = g.designToS(def.startLine);
    this.analysis = analyzeTrack(g, performanceModel(spec), this.startS);
    this.trackside = planTrackside(def, g, this.analysis);
    this.sectorEnds = [g.designToS(def.sectors[0]), g.designToS(def.sectors[1])];
    this.drsZones = def.drsZones.map((zone) => ({
      detection: g.designToS(zone.detection),
      start: g.designToS(zone.start),
      end: g.designToS(zone.end),
    }));
    this.pits = { side: def.pits.side, from: g.designToS(def.pits.from), to: g.designToS(def.pits.to) };
  }

  static load(def: TrackDefinition, spec: CarSpec = F1_SPEC): Track {
    return new Track(def, spec);
  }

  get length(): number {
    return this.geometry.length;
  }

  /** Superficie bajo un punto dado en coordenadas de pista. */
  surfaceAt(index: number, d: number): SurfaceType {
    return surfaceAt(this.trackside, this.geometry.halfWidth, index, d);
  }

  /** Casillero de largada (0 = pole). Autos alternados a izquierda y derecha. */
  gridSlot(position: number): GridSlot {
    const side = position % 2 === 0 ? -1 : 1;
    return {
      s: this.geometry.wrapS(this.startS - POLE_BEHIND_LINE - position * GRID_SPACING),
      d: side * GRID_OFFSET,
    };
  }

  /** ¿`s` está dentro de la zona [from, to] (considerando la vuelta)? */
  inRange(s: number, from: number, to: number): boolean {
    const g = this.geometry;
    return g.wrapS(s - from) <= g.wrapS(to - from);
  }
}
