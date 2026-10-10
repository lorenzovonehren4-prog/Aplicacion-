/**
 * core/storage.js — Wrapper de localStorage.
 *
 * Único punto del código que toca localStorage. Todo va bajo una sola clave
 * (`mindEscape_progress`) con la forma descrita en §6.1 del documento maestro.
 * Si el almacenamiento no está disponible (modo privado, cuota llena) el juego
 * sigue funcionando en memoria; sólo se pierde la persistencia.
 */

const STORAGE_KEY = 'mindEscape_progress';
const SCHEMA_VERSION = 1;

/** Estado inicial de una partida nueva. */
export function defaultProgress() {
  return {
    schemaVersion: SCHEMA_VERSION,
    unlockedLevels: [1],
    completedLevels: [],
    levelData: {},
    settings: { sound: true, music: true },
    totalPlayTime: 0,
    lastPlayedLevel: null,
  };
}

/** Estructura por nivel. */
export function defaultLevelData() {
  return {
    bestTime: null,
    stars: 0,
    hintsUsed: 0,
    attempts: 0,
    completed: false,
    completedAt: null,
  };
}

let available = null;

/** ¿Tenemos localStorage utilizable? Se comprueba una sola vez. */
export function isAvailable() {
  if (available !== null) return available;
  try {
    const probe = '__mindescape_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    available = true;
  } catch {
    available = false;
    console.warn('[storage] localStorage no disponible: el progreso no se guardará.');
  }
  return available;
}

/** Copia en memoria: fuente de verdad cuando no hay localStorage. */
let memoryFallback = null;

/**
 * Lee el progreso guardado, normalizado y con migraciones aplicadas.
 * Nunca lanza: ante un JSON corrupto devuelve un progreso limpio.
 */
export function load() {
  if (!isAvailable()) return memoryFallback ?? (memoryFallback = defaultProgress());

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw);
    return migrate(normalize(parsed));
  } catch (err) {
    console.warn('[storage] progreso corrupto, se reinicia:', err);
    return defaultProgress();
  }
}

/**
 * Guarda el progreso completo.
 * @returns {boolean} true si se persistió en disco.
 */
export function save(progress) {
  memoryFallback = progress;
  if (!isAvailable()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch (err) {
    console.warn('[storage] no se pudo guardar:', err);
    return false;
  }
}

/** Borra todo el progreso y devuelve un estado limpio. */
export function clearAll() {
  memoryFallback = defaultProgress();
  if (isAvailable()) {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch (err) {
      console.warn('[storage] no se pudo borrar:', err);
    }
  }
  return defaultProgress();
}

/* --------------------------------------------------------------------------
   Normalización y migraciones
   -------------------------------------------------------------------------- */

/** Rellena huecos y descarta tipos inesperados sin perder lo que sí es válido. */
function normalize(data) {
  const base = defaultProgress();
  if (!data || typeof data !== 'object') return base;

  const levelData = {};
  if (data.levelData && typeof data.levelData === 'object') {
    for (const [id, entry] of Object.entries(data.levelData)) {
      if (!entry || typeof entry !== 'object') continue;
      levelData[id] = { ...defaultLevelData(), ...entry };
    }
  }

  const asIntArray = (value, fallback) =>
    Array.isArray(value)
      ? [...new Set(value.map(Number).filter((n) => Number.isInteger(n) && n > 0))].sort((a, b) => a - b)
      : fallback;

  return {
    schemaVersion: Number(data.schemaVersion) || 0,
    unlockedLevels: asIntArray(data.unlockedLevels, base.unlockedLevels),
    completedLevels: asIntArray(data.completedLevels, base.completedLevels),
    levelData,
    settings: { ...base.settings, ...(data.settings ?? {}) },
    totalPlayTime: Number(data.totalPlayTime) || 0,
    lastPlayedLevel: Number(data.lastPlayedLevel) || null,
  };
}

/**
 * Aplica migraciones de esquema. Hoy sólo sella la versión; el punto es que
 * añadir campos en el futuro no invalide partidas existentes.
 */
function migrate(data) {
  const out = { ...data };

  if (out.schemaVersion < 1) {
    // v0 → v1: el nivel 1 siempre debe estar desbloqueado.
    if (!out.unlockedLevels.includes(1)) out.unlockedLevels = [1, ...out.unlockedLevels];
    out.schemaVersion = 1;
  }

  return out;
}

export { STORAGE_KEY, SCHEMA_VERSION };
