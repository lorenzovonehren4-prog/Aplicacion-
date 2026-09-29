/**
 * Arma la escena 3D completa de un circuito por etapas. Entre etapa y etapa
 * cede el control al navegador para que la pantalla de carga pueda animarse
 * y mostrar el progreso real.
 */

import { Group, type Texture, type WebGLRenderer } from 'three';
import { Disposer } from '../core/utils/Disposer';
import { Random, seedFrom } from '../core/utils/random';
import type { QualityLevel } from '../core/render/quality';
import { QUALITY_PRESETS } from '../core/render/quality';
import { buildFences, buildWalls } from './build/barriers';
import type { BuildContext } from './build/context';
import {
  buildBridges,
  buildDistanceBoards,
  buildGantry,
  buildGrandstands,
  buildLake,
  buildPitBuilding,
  buildSkyline,
  buildTrees,
  insidePolygon,
  type StandZone,
  type StartGantry,
} from './build/scenery';
import { buildContactShadows, buildEdgeWear } from './build/groundDetail';
import { buildHorizon } from './build/horizon';
import { createSky, type SkyEnvironment } from './build/sky';
import { weatherLook, type WeatherLook } from './weather';
import type { Weather } from '../core/save/schema';
import { buildAsphalt, buildGround, buildKerbs, buildPaint, buildPitLane, buildRunoff } from './build/surfaces';
import { surfaceTextureSize } from './build/textures';
import type { Track } from './Track';

export interface TrackScene {
  readonly root: Group;
  readonly sky: SkyEnvironment;
  readonly gantry: StartGantry;
  /** Luz y cielo del clima elegido. */
  readonly look: WeatherLook;
  /** Anima lo que se mueve solo (ondas del lago, nubes). */
  update(time: number): void;
  dispose(): void;
}

export interface BuildOptions {
  renderer: WebGLRenderer;
  quality: QualityLevel;
  anisotropy: number;
  weather: Weather;
  /** Progreso 0…1 y nombre de la etapa en curso. */
  onProgress?(progress: number, stage: string): void;
  /** Si devuelve true, se aborta la construcción (el jugador salió). */
  cancelled?(): boolean;
}

export class BuildCancelled extends Error {
  constructor() {
    super('Construcción del circuito cancelada.');
    this.name = 'BuildCancelled';
  }
}

/** Margen mínimo entre los árboles y los muros o edificios (m). */
const TREE_CLEARANCE = 9;

/** Cede un cuadro al navegador. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
}

export async function buildTrackScene(track: Track, options: BuildOptions): Promise<TrackScene> {
  const own = new Disposer();
  const root = new Group();
  root.name = `circuito-${track.def.id}`;
  const preset = QUALITY_PRESETS[options.quality];
  const ctx: BuildContext = {
    track,
    root,
    own,
    rng: new Random(seedFrom(track.def.id)),
    anisotropy: options.anisotropy,
    textureSize: surfaceTextureSize(options.quality),
    density: preset.sceneryDensity,
    detailShadows: options.quality === 'high' || options.quality === 'ultra',
    tickers: [],
  };

  let lakeNormals: Texture | null = null;
  let lakePolygon: Array<[number, number]> | null = null;
  let stands: StandZone[] = [];
  let bridges: StandZone[] = [];
  let pitZone: StandZone | null = null;
  let gantry: StartGantry | null = null;
  let sky: SkyEnvironment | null = null;
  const look = weatherLook(track.def.environment, options.weather);

  const stages: Array<[string, () => void]> = [
    ['Cielo e iluminación', () => (sky = createSky(options.renderer, look))],
    ['Terreno', () => buildGround(ctx)],
    ['Asfalto', () => buildAsphalt(ctx)],
    ['Pintura y parrilla', () => buildPaint(ctx)],
    ['Pianos', () => buildKerbs(ctx)],
    ['Escapatorias y grava', () => buildRunoff(ctx)],
    ['Bordes del pasto', () => buildEdgeWear(ctx)],
    [
      'Lago',
      () => {
        const lake = buildLake(ctx);
        lakeNormals = lake?.normals ?? null;
        lakePolygon = lake?.polygon ?? null;
      },
    ],
    ['Muros de contención', () => buildWalls(ctx)],
    ['Sombras de contacto', () => buildContactShadows(ctx)],
    ['Alambrados', () => buildFences(ctx)],
    ['Calle de boxes', () => (pitZone = buildPitBuilding(ctx, buildPitLane(ctx)))],
    ['Tribunas y público', () => (stands = buildGrandstands(ctx))],
    ['Pórtico de largada', () => (gantry = buildGantry(ctx))],
    ['Carteles de frenada', () => buildDistanceBoards(ctx)],
    ['Puentes', () => (bridges = buildBridges(ctx))],
    ['Ciudad', () => buildSkyline(ctx)],
    ['Horizonte', () => buildHorizon(ctx, look.fogColor)],
    [
      'Arboledas',
      () => {
        const g = track.geometry;
        const t = track.trackside;
        const projection = { index: -1, s: 0, d: 0 };
        const zones = pitZone ? [...stands, ...bridges, pitZone] : [...stands, ...bridges];
        buildTrees(ctx, (x, z) => {
          if (lakePolygon && insidePolygon(x, z, lakePolygon)) return false;
          g.project(x, z, projection, projection.index);
          const side = projection.d < 0 ? 'left' : 'right';
          const wall = (side === 'left' ? t.wallLeft : t.wallRight)[projection.index] ?? g.halfWidth + 10;
          const off = Math.abs(projection.d);
          if (off < wall + TREE_CLEARANCE) return false;
          for (const zone of zones) {
            if (zone.side === side && track.inRange(projection.s, zone.from, zone.to) && off < zone.outer + TREE_CLEARANCE) {
              return false;
            }
          }
          return true;
        });
      },
    ],
  ];

  try {
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      if (!stage) continue;
      options.onProgress?.(i / stages.length, stage[0]);
      await nextFrame();
      if (options.cancelled?.()) throw new BuildCancelled();
      stage[1]();
    }
  } catch (error) {
    (sky as SkyEnvironment | null)?.dispose();
    own.dispose();
    throw error;
  }
  options.onProgress?.(1, 'Listo');

  const finalSky = sky as SkyEnvironment | null;
  const finalGantry = gantry as StartGantry | null;
  if (!finalSky || !finalGantry) {
    own.dispose();
    throw new Error('El circuito quedó incompleto.');
  }
  for (const object of finalSky.objects) root.add(object);
  const normals = lakeNormals as Texture | null;

  return {
    root,
    sky: finalSky,
    gantry: finalGantry,
    look,
    update(time: number) {
      if (normals) normals.offset.set(time * 0.011, time * 0.007);
      finalSky.update(time);
      for (const tick of ctx.tickers) tick(time);
    },
    dispose() {
      root.removeFromParent();
      finalSky.dispose();
      own.dispose();
    },
  };
}
