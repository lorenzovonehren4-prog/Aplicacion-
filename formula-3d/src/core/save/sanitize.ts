/**
 * Saneo del guardado: convierte cualquier valor desconocido (lo que venga del
 * almacenamiento, aunque esté corrupto o lo haya editado alguien) en un
 * `SaveData` válido. Cada campo se valida por separado: un campo inválido vuelve
 * a su valor por defecto sin afectar a los demás.
 */

import { MAX_LEVEL, xpToNextLevel } from '../../progression/levels';
import { FPS_TARGETS, QUALITY_LEVELS, SHADOW_LEVELS } from '../render/quality';
import {
  ASSIST_LEVELS,
  BRAKING_ASSISTS,
  LINE_MODES,
  LINE_TYPES,
  TRACTION_ASSISTS,
  DEFAULT_PILOT_NAME,
  EXPERIENCE_LEVELS,
  PROFILE_NAME_MAX_LENGTH,
  SAVE_VERSION,
  CAMERA_MODES,
  SPEED_UNITS,
  type AssistSettings,
  type AudioSettings,
  type ControlSettings,
  type ExperienceLevel,
  type GameSettings,
  type TrackRecord,
  type GraphicsSettings,
  type Profile,
  type Progression,
  type SaveData,
} from './schema';

type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function record(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function num(value: unknown, fallback: number, min: number, max: number, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const n = integer ? Math.round(value) : value;
  return Math.min(max, Math.max(min, n));
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function oneOf<T extends string | number>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function text(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== 'string') return fallback;
  // Sin caracteres de control; espacios colapsados.
  // eslint-disable-next-line no-control-regex
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  return clean.length > 0 ? clean.slice(0, maxLength) : fallback;
}

/** Identificador corto (avatar, título, ítem): letras, números, guiones. */
function id(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^[a-z0-9_-]{1,32}$/i.test(value) ? value : fallback;
}

function sanitizeProfile(raw: unknown, defaults: Profile): Profile {
  const r = record(raw);
  return {
    name: text(r.name, DEFAULT_PILOT_NAME, PROFILE_NAME_MAX_LENGTH),
    avatarId: id(r.avatarId, defaults.avatarId),
    titleId: id(r.titleId, defaults.titleId),
    tutorialDone: bool(r.tutorialDone, defaults.tutorialDone),
    experience: EXPERIENCE_LEVELS.includes(r.experience as ExperienceLevel)
      ? (r.experience as ExperienceLevel)
      : defaults.experience,
  };
}

function sanitizeProgression(raw: unknown, defaults: Progression): Progression {
  const r = record(raw);
  const level = num(r.level, defaults.level, 1, MAX_LEVEL, true);
  const needed = xpToNextLevel(level);
  // La XP dentro del nivel nunca alcanza lo que pide el nivel (y es 0 en el máximo).
  const xp = needed === 0 ? 0 : num(r.xp, 0, 0, needed - 1, true);
  return { level, xp };
}

function sanitizeGraphics(raw: unknown, defaults: GraphicsSettings): GraphicsSettings {
  const r = record(raw);
  return {
    quality: oneOf(r.quality, QUALITY_LEVELS, defaults.quality),
    shadows: oneOf(r.shadows, SHADOW_LEVELS, defaults.shadows),
    postprocessing: bool(r.postprocessing, defaults.postprocessing),
    fpsTarget: oneOf(r.fpsTarget, FPS_TARGETS, defaults.fpsTarget),
    resolutionScale: num(r.resolutionScale, defaults.resolutionScale, 0.5, 1),
    showFps: bool(r.showFps, defaults.showFps),
  };
}

function sanitizeAudio(raw: unknown, defaults: AudioSettings): AudioSettings {
  const r = record(raw);
  return {
    master: num(r.master, defaults.master, 0, 1),
    engine: num(r.engine, defaults.engine, 0, 1),
    effects: num(r.effects, defaults.effects, 0, 1),
    ui: num(r.ui, defaults.ui, 0, 1),
  };
}

function sanitizeControls(raw: unknown, defaults: ControlSettings): ControlSettings {
  const r = record(raw);
  return {
    steeringSensitivity: num(r.steeringSensitivity, defaults.steeringSensitivity, 0.5, 1.5),
    steeringDeadzone: num(r.steeringDeadzone, defaults.steeringDeadzone, 0, 0.3),
    vibration: bool(r.vibration, defaults.vibration),
  };
}

function sanitizeAssists(raw: unknown, defaults: AssistSettings): AssistSettings {
  const r = record(raw);
  const custom = record(r.custom);
  return {
    level: oneOf(r.level, ASSIST_LEVELS, defaults.level),
    custom: {
      braking: oneOf(custom.braking, BRAKING_ASSISTS, defaults.custom.braking),
      traction: oneOf(custom.traction, TRACTION_ASSISTS, defaults.custom.traction),
      abs: bool(custom.abs, defaults.custom.abs),
      line: oneOf(custom.line, LINE_MODES, defaults.custom.line),
      lineType: oneOf(custom.lineType, LINE_TYPES, defaults.custom.lineType),
    },
  };
}

function sanitizeGame(raw: unknown, defaults: GameSettings): GameSettings {
  const r = record(raw);
  return {
    defaultCamera: oneOf(r.defaultCamera, CAMERA_MODES, defaults.defaultCamera),
    units: oneOf(r.units, SPEED_UNITS, defaults.units),
  };
}

/** Récords por circuito: claves con forma de id y tiempos plausibles (10 s – 10 min). */
function sanitizeRecords(raw: unknown, defaults: Record<string, TrackRecord>): Record<string, TrackRecord> {
  const source = isRecord(raw) ? raw : defaults;
  const records: Record<string, TrackRecord> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!/^[a-z0-9-]{1,32}$/.test(key)) continue;
    const r = record(value);
    const lap = r.bestLap;
    records[key] = {
      bestLap: typeof lap === 'number' && Number.isFinite(lap) && lap >= 10 && lap <= 600 ? lap : null,
    };
  }
  return records;
}

/**
 * Devuelve un guardado válido a partir de cualquier valor. `defaults` aporta
 * los valores por defecto (por ejemplo, la calidad gráfica detectada).
 */
export function sanitizeSave(raw: unknown, defaults: SaveData): SaveData {
  const r = record(raw);
  const createdAt = num(r.createdAt, defaults.createdAt, 0, Number.MAX_SAFE_INTEGER, true);
  const settings = record(r.settings);
  return {
    version: SAVE_VERSION,
    createdAt,
    updatedAt: num(r.updatedAt, createdAt, createdAt, Number.MAX_SAFE_INTEGER, true),
    profile: sanitizeProfile(r.profile, defaults.profile),
    progression: sanitizeProgression(r.progression, defaults.progression),
    settings: {
      graphics: sanitizeGraphics(settings.graphics, defaults.settings.graphics),
      audio: sanitizeAudio(settings.audio, defaults.settings.audio),
      controls: sanitizeControls(settings.controls, defaults.settings.controls),
      assists: sanitizeAssists(settings.assists, defaults.settings.assists),
      game: sanitizeGame(settings.game, defaults.settings.game),
    },
    records: sanitizeRecords(r.records, defaults.records),
  };
}
