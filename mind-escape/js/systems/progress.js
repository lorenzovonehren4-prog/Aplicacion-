/**
 * systems/progress.js — Desbloqueo de niveles y estadísticas globales.
 *
 * Es el único módulo que decide qué niveles están accesibles. Los niveles
 * nunca tocan esto: reportan que se resolvieron y aquí se traduce a progreso.
 */

import * as state from '../core/state.js';
import { calculateStars, mergeResult, totalStars, MAX_STARS } from './scoring.js';
import { getLevelMeta, getTotalLevels } from '../levels/registry.js';

export const isUnlocked = (levelId) =>
  levelId === 1 || state.get().unlockedLevels.includes(Number(levelId));

export const isCompleted = (levelId) =>
  state.get().completedLevels.includes(Number(levelId));

/** Primer nivel desbloqueado sin completar; si están todos, el último. */
export function getNextLevel() {
  const { unlockedLevels, completedLevels } = state.get();
  const pending = unlockedLevels.filter((id) => !completedLevels.includes(id));
  if (pending.length) return Math.min(...pending);
  return unlockedLevels.length ? Math.max(...unlockedLevels) : 1;
}

/** Nivel al que apunta "Continuar" en el menú. */
export function getContinueLevel() {
  const { lastPlayedLevel } = state.get();
  if (lastPlayedLevel && isUnlocked(lastPlayedLevel) && !isCompleted(lastPlayedLevel)) {
    return lastPlayedLevel;
  }
  return getNextLevel();
}

export const hasProgress = () => {
  const s = state.get();
  return s.completedLevels.length > 0 || s.totalPlayTime > 0;
};

/** Marca el nivel como el último visitado (para "Continuar"). */
export function touchLevel(levelId) {
  state.update((s) => { s.lastPlayedLevel = Number(levelId); }, { silent: true });
}

/** Suma un intento fallido a las estadísticas del nivel. */
export function recordAttempt(levelId) {
  const data = state.getLevelData(levelId);
  state.setLevelData(levelId, { attempts: (data.attempts ?? 0) + 1 }, { silent: true });
}

/** Guarda cuántas pistas se llevan usadas en el intento actual. */
export function recordHintUsage(levelId, hintsUsed) {
  const data = state.getLevelData(levelId);
  // Sólo crece dentro de una misma sesión de nivel; nunca baja el histórico
  // si el nivel ya se había completado con menos pistas.
  if (data.completed) return;
  state.setLevelData(levelId, { hintsUsed }, { silent: true });
}

/**
 * Registra la resolución de un nivel: calcula estrellas, fusiona con lo
 * anterior, desbloquea el siguiente y persiste.
 *
 * @returns {{
 *   stars:number, previousStars:number, bestTime:number, timeSeconds:number,
 *   hintsUsed:number, attempts:number, isFirstCompletion:boolean,
 *   isNewRecord:boolean, unlockedLevel:number|null, nextLevel:number|null
 * }}
 */
export function completeLevel(levelId, { timeSeconds, hintsUsed = 0, timeExpired = false }) {
  const id = Number(levelId);
  const meta = getLevelMeta(id);
  const previous = state.getLevelData(id);

  const stars = calculateStars({
    timeSeconds,
    hintsUsed,
    timeThreshold: meta?.timeThreshold ?? 120,
    timeLimit: meta?.timeLimit ?? null,
    timeExpired,
  });

  const merged = mergeResult(previous, { stars, timeSeconds, hintsUsed });
  const isFirstCompletion = !previous.completed;
  const attempts = (previous.attempts ?? 0) + 1;

  const nextId = id + 1;
  const canUnlockNext = nextId <= getTotalLevels();

  state.update((s) => {
    s.levelData[String(id)] = {
      ...previous,
      bestTime: merged.bestTime,
      stars: merged.stars,
      hintsUsed: merged.hintsUsed,
      attempts,
      completed: true,
      completedAt: previous.completedAt ?? new Date().toISOString(),
    };

    if (!s.completedLevels.includes(id)) {
      s.completedLevels = [...s.completedLevels, id].sort((a, b) => a - b);
    }
    if (canUnlockNext && !s.unlockedLevels.includes(nextId)) {
      s.unlockedLevels = [...s.unlockedLevels, nextId].sort((a, b) => a - b);
    }
    s.totalPlayTime += Math.max(0, Math.round(timeSeconds));
    s.lastPlayedLevel = canUnlockNext ? nextId : id;
  });

  return {
    stars: merged.stars,
    previousStars: previous.stars ?? 0,
    bestTime: merged.bestTime,
    timeSeconds,
    hintsUsed,
    attempts,
    isFirstCompletion,
    isNewRecord: merged.isNewRecord,
    unlockedLevel: canUnlockNext && isFirstCompletion ? nextId : null,
    nextLevel: canUnlockNext ? nextId : null,
  };
}

/** Resumen global para menú, selector y ajustes. */
export function getSummary() {
  const s = state.get();
  const total = getTotalLevels();
  const completed = s.completedLevels.length;
  const stars = totalStars(s.levelData);

  return {
    completed,
    total,
    stars,
    maxStars: total * MAX_STARS,
    percent: total ? Math.round((completed / total) * 100) : 0,
    totalPlayTime: s.totalPlayTime,
    isFinished: completed >= total,
    favoriteLevel: findFavoriteLevel(s.levelData),
  };
}

/**
 * "Nivel favorito": el que más se ha reintentado entre los completados.
 * Es el que más peleó el jugador — y el que suele recordar.
 */
function findFavoriteLevel(levelData) {
  let best = null;
  for (const [id, entry] of Object.entries(levelData)) {
    if (!entry?.completed) continue;
    const attempts = entry.attempts ?? 0;
    if (!best || attempts > best.attempts) best = { id: Number(id), attempts };
  }
  return best?.id ?? null;
}

/** Estado visual de una tarjeta del selector. */
export function getLevelStatus(levelId) {
  const id = Number(levelId);
  if (isCompleted(id)) return 'completed';
  if (isUnlocked(id)) return 'unlocked';
  return 'locked';
}
