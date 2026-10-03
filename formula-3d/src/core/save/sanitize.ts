/**
 * Saneo del guardado: convierte cualquier valor desconocido (lo que venga del
 * almacenamiento, aunque esté corrupto o lo haya editado alguien) en un
 * `SaveData` válido. Cada campo se valida por separado: un campo inválido vuelve
 * a su valor por defecto sin afectar a los demás.
 */

import { ownsItemId, PATTERNS, type GarageSetup } from '../../garage/setup';
import { ACHIEVEMENTS, createDefaultStats, type CareerStats, type TrackStats } from '../../progression/career';
import { DRIVE_ACTIONS, isBindableKey, type KeyBindings } from '../input/bindings';
import { getItem, isItemId, STARTER_ITEM_IDS, type ItemKind } from '../../progression/items';
import { MAX_LEVEL, xpToNextLevel } from '../../progression/levels';
import { createDailyState, type DailyState } from '../../progression/daily';
import { createDefaultWorkshop, UPGRADE_IDS, UPGRADE_MAX_LEVEL, type Workshop } from '../../progression/upgrades';
import { PASS_MAX_XP, passRewardsBetween, SEASON } from '../../progression/seasonPass';
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
  DIFFICULTY_LEVELS,
  RACE_LAPS,
  WEATHERS,
  RIVALS_MAX,
  RIVALS_MIN,
  SPEED_UNITS,
  LANGUAGES,
  type AssistLevel,
  type AssistSettings,
  type AudioSettings,
  type ControlSettings,
  type ExperienceLevel,
  type GameSettings,
  type RaceSettings,
  type ChampionshipState,
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
  const pass = record(r.pass);
  const season = num(pass.season, SEASON.id, 1, 999, true);
  // Pase de otra temporada: empieza de cero (los ítems ganados se conservan).
  const passXp = season === SEASON.id ? num(pass.xp, 0, 0, PASS_MAX_XP, true) : 0;
  // Ítems conocidos, sin repetir; los iniciales siempre están.
  const unlocked = new Set(STARTER_ITEM_IDS);
  if (Array.isArray(r.unlocked)) {
    for (const item of r.unlocked) if (typeof item === 'string' && isItemId(item)) unlocked.add(item);
  }
  // Las recompensas de los niveles del pase ya completados siempre están.
  for (const item of passRewardsBetween(0, passXp)) unlocked.add(item);
  return {
    level,
    xp,
    totalXp: num(r.totalXp, defaults.totalXp, 0, Number.MAX_SAFE_INTEGER, true),
    pass: { season: SEASON.id, xp: passXp },
    unlocked: [...unlocked],
  };
}

/** Nombres de la Fase 1 (antes de que existiera el catálogo de ítems). */
const LEGACY_ITEM_IDS: Readonly<Record<string, string>> = { rookie: 'title-rookie', initials: 'avatar-initials' };

/** El avatar y el título equipados tienen que ser del tipo correcto y estar desbloqueados. */
function equipped(value: string, kind: ItemKind, unlocked: readonly string[], fallback: string): string {
  const itemId = LEGACY_ITEM_IDS[value] ?? value;
  return getItem(itemId)?.kind === kind && unlocked.includes(itemId) ? itemId : fallback;
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
    autoPerformance: bool(r.autoPerformance, defaults.autoPerformance),
  };
}

function sanitizeAudio(raw: unknown, defaults: AudioSettings): AudioSettings {
  const r = record(raw);
  return {
    master: num(r.master, defaults.master, 0, 1),
    engine: num(r.engine, defaults.engine, 0, 1),
    effects: num(r.effects, defaults.effects, 0, 1),
    ui: num(r.ui, defaults.ui, 0, 1),
    music: num(r.music, defaults.music, 0, 1),
  };
}

function sanitizeControls(raw: unknown, defaults: ControlSettings): ControlSettings {
  const r = record(raw);
  return {
    steeringSensitivity: num(r.steeringSensitivity, defaults.steeringSensitivity, 0.5, 1.5),
    steeringDeadzone: num(r.steeringDeadzone, defaults.steeringDeadzone, 0, 0.3),
    vibration: bool(r.vibration, defaults.vibration),
    keys: sanitizeBindings(r.keys, defaults.keys),
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
    language: oneOf(r.language, LANGUAGES, defaults.language),
    mirror: bool(r.mirror, defaults.mirror),
  };
}

function sanitizeRace(raw: unknown, defaults: RaceSettings): RaceSettings {
  const r = record(raw);
  return {
    difficulty: oneOf(r.difficulty, DIFFICULTY_LEVELS, defaults.difficulty),
    customDifficulty: num(r.customDifficulty, defaults.customDifficulty, 0, 100, true),
    rivals: num(r.rivals, defaults.rivals, RIVALS_MIN, RIVALS_MAX, true),
    // El circuito se valida contra el catálogo al usarlo (uno desconocido vuelve al primero).
    trackId: id(r.trackId, defaults.trackId),
    laps: oneOf(r.laps, RACE_LAPS, defaults.laps),
    weather: oneOf(r.weather, WEATHERS, defaults.weather),
  };
}

/**
 * Campeonato guardado: se descarta entero si algo no cierra (mejor empezar
 * otro que continuar uno corrupto).
 */
function sanitizeChampionship(raw: unknown): ChampionshipState | null {
  if (!isRecord(raw)) return null;
  const rivals = Array.isArray(raw.rivals) ? raw.rivals.filter((value): value is string => typeof value === 'string' && /^[a-z0-9_-]{1,32}$/.test(value)) : [];
  const rounds = Array.isArray(raw.rounds) ? raw.rounds : [];
  if (rivals.length < RIVALS_MIN || rivals.length > RIVALS_MAX || rounds.length === 0 || rounds.length > 30) return null;
  const ids = new Set(['player', ...rivals]);
  const parsed: Array<ChampionshipState['rounds'][number]> = [];
  for (const round of rounds) {
    const r = record(round);
    const trackId = id(r.trackId, '');
    if (!trackId) return null;
    if (r.results === null) {
      parsed.push({ trackId, results: null });
      continue;
    }
    if (!Array.isArray(r.results)) return null;
    const results: Array<{ id: string; position: number; points: number }> = [];
    for (const entry of r.results) {
      const e = record(entry);
      if (typeof e.id !== 'string' || !ids.has(e.id)) return null;
      results.push({
        id: e.id,
        position: num(e.position, results.length + 1, 1, 30, true),
        points: num(e.points, 0, 0, 30, true),
      });
    }
    parsed.push({ trackId, results });
  }
  return {
    ...(typeof raw.cup === 'string' && /^[a-z0-9_-]{1,32}$/.test(raw.cup) ? { cup: raw.cup } : {}),
    startedAt: num(raw.startedAt, 0, 0, Number.MAX_SAFE_INTEGER, true),
    laps: oneOf(raw.laps, RACE_LAPS, 3),
    difficulty: num(raw.difficulty, 50, 0, 100),
    weather: oneOf(raw.weather, WEATHERS, 'sunny'),
    rivals,
    rounds: parsed,
  };
}

/** Tiempo de vuelta plausible (10 s – 10 min). */
function plausibleLap(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 10 && value <= 600;
}

/** Texto en base64 de tamaño razonable (fantasmas: hasta ~10 min de vuelta). */
function base64(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 400_000 && /^[A-Za-z0-9+/]*={0,2}$/.test(value);
}

/** Récords por circuito: claves con forma de id y tiempos plausibles (10 s – 10 min). */
function sanitizeRecords(raw: unknown, defaults: Record<string, TrackRecord>): Record<string, TrackRecord> {
  const source = isRecord(raw) ? raw : defaults;
  const records: Record<string, TrackRecord> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!/^[a-z0-9-]{1,32}$/.test(key)) continue;
    const r = record(value);
    const lap = r.bestLap;
    const entry: TrackRecord = {
      bestLap: plausibleLap(lap) ? lap : null,
    };
    if (entry.bestLap !== null && typeof r.assists === 'string' && (ASSIST_LEVELS as readonly string[]).includes(r.assists)) {
      entry.assists = r.assists as AssistLevel;
    }
    const ghost = record(r.ghost);
    if (plausibleLap(ghost.time) && base64(ghost.poses) && base64(ghost.trace)) {
      entry.ghost = { time: ghost.time, poses: ghost.poses, trace: ghost.trace };
    }
    if (Array.isArray(r.bestSectors) && r.bestSectors.length === 3) {
      const sector = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) && value >= 2 && value <= 300 ? value : null);
      const sectors: [number | null, number | null, number | null] = [sector(r.bestSectors[0]), sector(r.bestSectors[1]), sector(r.bestSectors[2])];
      if (sectors.some((value) => value !== null)) entry.bestSectors = sectors;
    }
    records[key] = entry;
  }
  return records;
}

/** Desafío del día: fecha AAAA-MM-DD (o null) y contadores enteros; lo inválido arranca de cero. */
function sanitizeDaily(raw: unknown): DailyState {
  const daily = createDailyState();
  if (!isRecord(raw)) return daily;
  daily.last = typeof raw.last === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.last) ? raw.last : null;
  daily.streak = daily.last === null ? 0 : num(raw.streak, 0, 0, MAX_COUNT, true);
  daily.best = Math.max(daily.streak, num(raw.best, 0, 0, MAX_COUNT, true));
  daily.total = Math.max(daily.best, num(raw.total, 0, 0, MAX_COUNT, true));
  return daily;
}

/**
 * Taller: niveles 0–5 por área y puntos enteros. Un guardado de antes de la
 * Versión 2.2 (sin taller) recibe los puntos de bienvenida más 2 por carrera
 * ya corrida (hasta 40): el que venía jugando arranca con mejoras para elegir.
 */
function sanitizeWorkshop(raw: unknown, stats: CareerStats): Workshop {
  if (!isRecord(raw)) {
    const welcome = createDefaultWorkshop().points + Math.min(40, stats.races * 2);
    return createDefaultWorkshop(welcome);
  }
  const levels = record(raw.levels);
  const workshop = createDefaultWorkshop(0);
  for (const id of UPGRADE_IDS) workshop.levels[id] = num(levels[id], 0, 0, UPGRADE_MAX_LEVEL, true);
  workshop.points = num(raw.points, 0, 0, MAX_COUNT, true);
  workshop.earned = Math.max(workshop.points, num(raw.earned, workshop.points, 0, MAX_COUNT, true));
  return workshop;
}

/** Teclas del manejo: válidas y sin repetir (una repetida vuelve a la de fábrica). */
function sanitizeBindings(raw: unknown, defaults: KeyBindings): KeyBindings {
  const r = record(raw);
  const result = { ...defaults };
  const used = new Set<string>();
  for (const action of DRIVE_ACTIONS) {
    const code = r[action];
    if (typeof code === 'string' && isBindableKey(code) && !used.has(code)) result[action] = code;
    used.add(result[action]);
  }
  // Si una tecla por defecto quedó repetida con una elegida, se vuelve a fábrica completa.
  return new Set(Object.values(result)).size === DRIVE_ACTIONS.length ? result : { ...defaults };
}

const MAX_COUNT = 1_000_000;

function sanitizeStats(raw: unknown): CareerStats {
  const r = record(raw);
  const base = createDefaultStats();
  const counter = (key: keyof Omit<CareerStats, 'tracks' | 'distanceKm'>): number => num(r[key], 0, 0, MAX_COUNT, true);
  const tracks: Record<string, TrackStats> = {};
  for (const [id, value] of Object.entries(record(r.tracks))) {
    if (!/^[a-z0-9-]{1,32}$/.test(id)) continue;
    const t = record(value);
    tracks[id] = { races: num(t.races, 0, 0, MAX_COUNT, true), wins: num(t.wins, 0, 0, MAX_COUNT, true), podiums: num(t.podiums, 0, 0, MAX_COUNT, true) };
  }
  return {
    ...base,
    races: counter('races'),
    wins: counter('wins'),
    podiums: counter('podiums'),
    pointsFinishes: counter('pointsFinishes'),
    fastestLaps: counter('fastestLaps'),
    cleanRaces: counter('cleanRaces'),
    overtakes: counter('overtakes'),
    laps: counter('laps'),
    distanceKm: num(r.distanceKm, 0, 0, 10_000_000),
    legendWins: counter('legendWins'),
    unassistedWins: counter('unassistedWins'),
    longRaces: counter('longRaces'),
    seasons: counter('seasons'),
    championships: counter('championships'),
    tracks,
  };
}

function sanitizeAchievements(raw: unknown): Record<string, number> {
  const r = record(raw);
  const result: Record<string, number> = {};
  for (const achievement of ACHIEVEMENTS) {
    const when = r[achievement.id];
    if (typeof when === 'number' && Number.isFinite(when) && when > 0) result[achievement.id] = Math.round(when);
  }
  return result;
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function color(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX_COLOR.test(value) ? value.toLowerCase() : fallback;
}

/** Garaje: cada pieza tiene que ser del tipo correcto y estar desbloqueada. */
function sanitizeGarage(raw: unknown, defaults: GarageSetup, progression: Progression): GarageSetup {
  const r = record(raw);
  const colors = Array.isArray(r.colors) ? r.colors : [];
  const piece = (value: unknown, kind: ItemKind, fallback: string): string =>
    typeof value === 'string' && getItem(value)?.kind === kind && ownsItemId(value, progression) ? value : fallback;
  return {
    pattern: oneOf(r.pattern, PATTERNS.map((p) => p.id), defaults.pattern),
    colors: [color(colors[0], defaults.colors[0]), color(colors[1], defaults.colors[1]), color(colors[2], defaults.colors[2])],
    material: piece(r.material, 'material', defaults.material),
    rims: piece(r.rims, 'rims', defaults.rims),
    wing: piece(r.wing, 'wing', defaults.wing),
    helmet: piece(r.helmet, 'helmet', defaults.helmet),
    celebration: piece(r.celebration, 'celebration', defaults.celebration),
    number: num(r.number, defaults.number, 1, 99, true),
    tireStripe: color(r.tireStripe, defaults.tireStripe),
  };
}

/**
 * Devuelve un guardado válido a partir de cualquier valor. `defaults` aporta
 * los valores por defecto (por ejemplo, la calidad gráfica detectada).
 */
export function sanitizeSave(raw: unknown, defaults: SaveData): SaveData {
  const r = record(raw);
  const createdAt = num(r.createdAt, defaults.createdAt, 0, Number.MAX_SAFE_INTEGER, true);
  const settings = record(r.settings);
  const progression = sanitizeProgression(r.progression, defaults.progression);
  const stats = sanitizeStats(r.stats);
  const rawProfile = sanitizeProfile(r.profile, defaults.profile);
  const profile: Profile = {
    ...rawProfile,
    avatarId: equipped(rawProfile.avatarId, 'avatar', progression.unlocked, defaults.profile.avatarId),
    titleId: equipped(rawProfile.titleId, 'title', progression.unlocked, defaults.profile.titleId),
  };
  return {
    version: SAVE_VERSION,
    createdAt,
    updatedAt: num(r.updatedAt, createdAt, createdAt, Number.MAX_SAFE_INTEGER, true),
    profile,
    progression,
    settings: {
      graphics: sanitizeGraphics(settings.graphics, defaults.settings.graphics),
      audio: sanitizeAudio(settings.audio, defaults.settings.audio),
      controls: sanitizeControls(settings.controls, defaults.settings.controls),
      assists: sanitizeAssists(settings.assists, defaults.settings.assists),
      game: sanitizeGame(settings.game, defaults.settings.game),
      race: sanitizeRace(settings.race, defaults.settings.race),
    },
    records: sanitizeRecords(r.records, defaults.records),
    championship: sanitizeChampionship(r.championship),
    garage: sanitizeGarage(r.garage, defaults.garage, progression),
    stats,
    achievements: sanitizeAchievements(r.achievements),
    workshop: sanitizeWorkshop(r.workshop, stats),
    daily: sanitizeDaily(r.daily),
  };
}
