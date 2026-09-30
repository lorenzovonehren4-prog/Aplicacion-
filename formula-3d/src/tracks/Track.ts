/**
 * Circuito listo para usar: datos + geometría + análisis + entorno de pista,
 * con todas las posiciones ya convertidas a metros del mundo.
 */

import { F1_SPEC, performanceModel, type CarSpec } from '../race/physics/CarSpec';
import { RacingLine } from './RacingLine';
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

/** Circuitos ya armados, por definición y por auto. */
const LOADED = new WeakMap<TrackDefinition, WeakMap<CarSpec, Track>>();

export class Track {
  readonly geometry: TrackGeometry;
  readonly analysis: TrackAnalysis;
  readonly trackside: Trackside;
  /** Trazada ideal (curvatura mínima) con su perfil de velocidad. */
  readonly racingLine: RacingLine;
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
    const model = performanceModel(spec);
    this.analysis = analyzeTrack(g, model, this.startS);
    this.trackside = planTrackside(def, g, this.analysis);
    this.racingLine = RacingLine.compute(g, this.trackside, model);
    this.sectorEnds = [g.designToS(def.sectors[0]), g.designToS(def.sectors[1])];
    this.drsZones = def.drsZones.map((zone) => ({
      detection: g.designToS(zone.detection),
      start: g.designToS(zone.start),
      end: g.designToS(zone.end),
    }));
    this.pits = { side: def.pits.side, from: g.designToS(def.pits.from), to: g.designToS(def.pits.to) };
  }

  /**
   * Arma el circuito (geometría, análisis, trazada ideal…). Es de sólo
   * lectura y cuesta ~1–2 s de cálculo, así que se guarda: volver a correr en
   * el mismo circuito no lo recalcula.
   */
  static load(def: TrackDefinition, spec: CarSpec = F1_SPEC): Track {
    let bySpec = LOADED.get(def);
    if (!bySpec) {
      bySpec = new WeakMap();
      LOADED.set(def, bySpec);
    }
    let track = bySpec.get(spec);
    if (!track) {
      track = new Track(def, spec);
      bySpec.set(spec, track);
    }
    return track;
  }

  get length(): number {
    return this.geometry.length;
  }

  /** Velocidad del perfil por la línea central en s (m/s): referencia prudente. */
  centerSpeedAt(s: number): number {
    const g = this.geometry;
    const f = g.wrapS(s) / g.ds;
    const i = Math.floor(f);
    const a = this.analysis.speed[g.wrapIndex(i)] ?? 0;
    const b = this.analysis.speed[g.wrapIndex(i + 1)] ?? 0;
    return a + (b - a) * (f - i);
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
