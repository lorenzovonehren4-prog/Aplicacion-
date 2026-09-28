/**
 * Esquema del guardado. Cada fase lo amplía (ver PLAN.md §4.6): agregar un campo
 * con su valor por defecto aquí y su saneo en `sanitize.ts` alcanza; los
 * guardados viejos se completan solos. Sólo un cambio de significado o de nombre
 * necesita una migración (`migrations.ts`) y subir `SAVE_VERSION`.
 */

import {
  QUALITY_PRESETS,
  type FpsTarget,
  type QualityLevel,
  type ShadowLevel,
} from '../render/quality';

export const SAVE_VERSION = 1;

/** Clave del guardado principal en el almacenamiento. */
export const SAVE_KEY = 'save';

export const EXPERIENCE_LEVELS = ['none', 'some', 'lots'] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export interface GraphicsSettings {
  quality: QualityLevel;
  shadows: ShadowLevel;
  postprocessing: boolean;
  fpsTarget: FpsTarget;
  /** Escala de resolución interna, de 0.5 a 1. */
  resolutionScale: number;
  showFps: boolean;
}

/** Volúmenes de 0 a 1. */
export interface AudioSettings {
  master: number;
  engine: number;
  /** Derrapes, pianos, viento, choques. */
  effects: number;
  ui: number;
}

export interface ControlSettings {
  /** Sensibilidad de la dirección, de 0.5 a 1.5. */
  steeringSensitivity: number;
  /** Zona muerta del stick del gamepad, de 0 a 0.3. */
  steeringDeadzone: number;
  /** Vibración del gamepad en pianos y choques. */
  vibration: boolean;
}

export const CAMERA_MODES = ['cockpit', 'tcam', 'chase'] as const;
export type CameraMode = (typeof CAMERA_MODES)[number];

export const SPEED_UNITS = ['kmh', 'mph'] as const;
export type SpeedUnit = (typeof SPEED_UNITS)[number];

export interface GameSettings {
  defaultCamera: CameraMode;
  units: SpeedUnit;
}

export interface Settings {
  graphics: GraphicsSettings;
  audio: AudioSettings;
  controls: ControlSettings;
  game: GameSettings;
}

/** Récords del jugador en un circuito. */
export interface TrackRecord {
  /** Mejor vuelta (s) o null si todavía no completó ninguna. */
  bestLap: number | null;
}

export interface Profile {
  /** Nombre del piloto (lo pide el tutorial de la Fase 8). */
  name: string;
  avatarId: string;
  titleId: string;
  tutorialDone: boolean;
  experience: ExperienceLevel | null;
}

export interface Progression {
  /** Nivel del jugador, de 1 a 100. */
  level: number;
  /** XP acumulada dentro del nivel actual. */
  xp: number;
}

export interface SaveData {
  version: number;
  createdAt: number;
  updatedAt: number;
  profile: Profile;
  progression: Progression;
  settings: Settings;
  /** Récords por circuito (clave = id del circuito). */
  records: Record<string, TrackRecord>;
}

export const PROFILE_NAME_MAX_LENGTH = 16;
export const DEFAULT_PILOT_NAME = 'PILOTO';

export function createDefaultGraphics(quality: QualityLevel): GraphicsSettings {
  const preset = QUALITY_PRESETS[quality];
  return {
    quality,
    shadows: preset.shadows,
    postprocessing: preset.postprocessing,
    fpsTarget: 60,
    resolutionScale: 1,
    showFps: false,
  };
}

export function createDefaultAudio(): AudioSettings {
  return { master: 0.8, engine: 0.8, effects: 0.8, ui: 0.6 };
}

export function createDefaultControls(): ControlSettings {
  return { steeringSensitivity: 1, steeringDeadzone: 0.08, vibration: true };
}

export function createDefaultGame(): GameSettings {
  return { defaultCamera: 'cockpit', units: 'kmh' };
}

export function createDefaultSave(now: number, quality: QualityLevel): SaveData {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    profile: {
      name: DEFAULT_PILOT_NAME,
      avatarId: 'initials',
      titleId: 'rookie',
      tutorialDone: false,
      experience: null,
    },
    progression: { level: 1, xp: 0 },
    settings: {
      graphics: createDefaultGraphics(quality),
      audio: createDefaultAudio(),
      controls: createDefaultControls(),
      game: createDefaultGame(),
    },
    records: {},
  };
}
