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
import { STARTER_ITEM_IDS } from '../../progression/items';
import { createDefaultGarage, type GarageSetup } from '../../garage/setup';
import { createDefaultStats, type CareerStats } from '../../progression/career';
import { createDefaultBindings, type KeyBindings } from '../input/bindings';

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
  /** Ajuste automático: baja resolución y calidad en carrera si faltan FPS. */
  autoPerformance: boolean;
}

/** Volúmenes de 0 a 1. */
export interface AudioSettings {
  master: number;
  engine: number;
  /** Derrapes, pianos, viento, choques. */
  effects: number;
  ui: number;
  /** Música generativa del menú. */
  music: number;
}

export interface ControlSettings {
  /** Sensibilidad de la dirección, de 0.5 a 1.5. */
  steeringSensitivity: number;
  /** Zona muerta del stick del gamepad, de 0 a 0.3. */
  steeringDeadzone: number;
  /** Vibración del gamepad en pianos y choques. */
  vibration: boolean;
  /** Teclas del manejo (reasignables). */
  keys: KeyBindings;
}

export const CAMERA_MODES = ['cockpit', 'tcam', 'chase'] as const;
export type CameraMode = (typeof CAMERA_MODES)[number];

export const SPEED_UNITS = ['kmh', 'mph'] as const;
export type SpeedUnit = (typeof SPEED_UNITS)[number];

export const LANGUAGES = ['es'] as const;
export type Language = (typeof LANGUAGES)[number];

export interface GameSettings {
  defaultCamera: CameraMode;
  units: SpeedUnit;
  /** Idioma de la interfaz (por ahora sólo español). */
  language: Language;
}

// ─── Rivales (ver PLAN.md §5.5) ───────────────────────────────────────────

export const DIFFICULTY_LEVELS = ['novice', 'amateur', 'pro', 'legend', 'custom'] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

/** Cantidad de rivales (bots) en carrera: 10 a 20 autos en pista con el jugador. */
export const RIVALS_MIN = 9;
export const RIVALS_MAX = 19;

export const WEATHERS = ['sunny', 'cloudy', 'sunset'] as const;
export type Weather = (typeof WEATHERS)[number];

/** Vueltas que se pueden elegir para una carrera. */
export const RACE_LAPS = [3, 5, 10] as const;
export type RaceLaps = (typeof RACE_LAPS)[number];

/**
 * Última configuración de carrera elegida (la pantalla de selección de
 * carrera arranca con ella).
 */
export interface RaceSettings {
  difficulty: DifficultyLevel;
  /** Dificultad Personalizada (0–100). */
  customDifficulty: number;
  rivals: number;
  trackId: string;
  laps: RaceLaps;
  weather: Weather;
}

// ─── Ayudas (ver PLAN.md §5.4) ────────────────────────────────────────────

export const ASSIST_LEVELS = ['beginner', 'intermediate', 'advanced', 'custom'] as const;
export type AssistLevel = (typeof ASSIST_LEVELS)[number];

export const BRAKING_ASSISTS = ['off', 'low', 'medium', 'full'] as const;
export type BrakingAssist = (typeof BRAKING_ASSISTS)[number];

export const TRACTION_ASSISTS = ['off', 'medium', 'full'] as const;
export type TractionAssist = (typeof TRACTION_ASSISTS)[number];

export const LINE_MODES = ['off', 'corners', 'full'] as const;
export type LineMode = (typeof LINE_MODES)[number];

export const LINE_TYPES = ['fixed', 'dynamic'] as const;
export type LineType = (typeof LINE_TYPES)[number];

/** Valor de cada ayuda. */
export interface AssistConfig {
  braking: BrakingAssist;
  traction: TractionAssist;
  abs: boolean;
  line: LineMode;
  lineType: LineType;
}

export interface AssistSettings {
  level: AssistLevel;
  /** Valores del nivel Personalizado (se conservan aunque se elija otro nivel). */
  custom: AssistConfig;
}

export interface Settings {
  graphics: GraphicsSettings;
  audio: AudioSettings;
  controls: ControlSettings;
  assists: AssistSettings;
  game: GameSettings;
  race: RaceSettings;
}

/** Récords del jugador en un circuito. */
export interface TrackRecord {
  /** Mejor vuelta (s) o null si todavía no completó ninguna. */
  bestLap: number | null;
  /**
   * Fantasma de la mejor vuelta de contrarreloj: tiempo y datos en base64
   * (ver `race/session/Ghost.ts`).
   */
  ghost?: { time: number; poses: string; trace: string };
}

export interface Profile {
  /** Nombre del piloto (lo pide el tutorial inicial; se cambia en Perfil). */
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
  /** XP ganada en total (todas las sesiones). */
  totalXp: number;
  /** Pase de temporada: temporada y XP acumulada en ella (1 000 por nivel). */
  pass: { season: number; xp: number };
  /** Ítems desbloqueados (ids de `progression/items.ts`). */
  unlocked: string[];
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
  /** Campeonato en curso (o terminado, hasta empezar otro). */
  championship: ChampionshipState | null;
  /** Lo que el jugador armó en el garaje (pintura, material, llantas…). */
  garage: GarageSetup;
  /** Estadísticas de toda la trayectoria. */
  stats: CareerStats;
  /** Logros conseguidos: id → fecha (ms). */
  achievements: Record<string, number>;
}

/** Resultado de un piloto en una carrera del campeonato. */
export interface ChampionshipResult {
  /** Id del piloto (`data/teams.ts`) o "player". */
  id: string;
  position: number;
  points: number;
}

export interface ChampionshipState {
  startedAt: number;
  laps: RaceLaps;
  /** Dificultad 0–100, fija para toda la temporada. */
  difficulty: number;
  weather: Weather;
  /** Rivales (ids de pilotos), los mismos en todas las carreras. */
  rivals: readonly string[];
  /** Calendario: circuito y resultado (null = todavía no se corrió). */
  rounds: ReadonlyArray<{ trackId: string; results: readonly ChampionshipResult[] | null }>;
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
    autoPerformance: true,
  };
}

export function createDefaultAudio(): AudioSettings {
  return { master: 0.8, engine: 0.8, effects: 0.8, ui: 0.6, music: 0.5 };
}

export function createDefaultControls(): ControlSettings {
  return { steeringSensitivity: 1, steeringDeadzone: 0.08, vibration: true, keys: createDefaultBindings() };
}

/** "¿Nuevo? Empieza en Principiante": el tutorial inicial recomienda otro nivel según la experiencia. */
export function createDefaultAssists(): AssistSettings {
  return {
    level: 'beginner',
    custom: { braking: 'medium', traction: 'medium', abs: true, line: 'full', lineType: 'fixed' },
  };
}

export function createDefaultGame(): GameSettings {
  return { defaultCamera: 'cockpit', units: 'kmh', language: 'es' };
}

export function createDefaultProgression(): Progression {
  return { level: 1, xp: 0, totalXp: 0, pass: { season: 1, xp: 0 }, unlocked: [...STARTER_ITEM_IDS] };
}

export function createDefaultRace(): RaceSettings {
  return { difficulty: 'amateur', customDifficulty: 50, rivals: 11, trackId: 'australia', laps: 3, weather: 'sunny' };
}

export function createDefaultSave(now: number, quality: QualityLevel): SaveData {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    profile: {
      name: DEFAULT_PILOT_NAME,
      avatarId: 'avatar-initials',
      titleId: 'title-rookie',
      tutorialDone: false,
      experience: null,
    },
    progression: createDefaultProgression(),
    settings: {
      graphics: createDefaultGraphics(quality),
      audio: createDefaultAudio(),
      controls: createDefaultControls(),
      assists: createDefaultAssists(),
      game: createDefaultGame(),
      race: createDefaultRace(),
    },
    records: {},
    championship: null,
    garage: createDefaultGarage(),
    stats: createDefaultStats(),
    achievements: {},
  };
}
