/**
 * systems/scoring.js — Cálculo de estrellas (§6.2 del documento maestro).
 *
 * Reglas:
 *   ★★★  sin pistas y tiempo ≤ umbral del nivel
 *   ★★   1 pista usada, o tiempo por encima del umbral
 *   ★    2 o 3 pistas usadas, o tiempo muy por encima del umbral
 *
 * Y dos matices del documento:
 *   - Si el nivel tiene límite y se agota, el máximo es ★★ (nunca hace fallar).
 *   - El sistema es generoso: mínimo siempre ★, y al reintentar sólo se sube.
 */

export const MAX_STARS = 3;

/** Multiplicador sobre el umbral a partir del cual se cae a una estrella. */
const SLOW_FACTOR = 2;

/**
 * @param {{
 *   timeSeconds: number,
 *   hintsUsed: number,
 *   timeThreshold: number,
 *   timeLimit?: number|null,
 *   timeExpired?: boolean
 * }} params
 * @returns {1|2|3}
 */
export function calculateStars({
  timeSeconds,
  hintsUsed = 0,
  timeThreshold = 120,
  timeLimit = null,
  timeExpired = false,
}) {
  let stars = MAX_STARS;

  const time = Math.max(0, Number(timeSeconds) || 0);
  const hints = Math.max(0, Number(hintsUsed) || 0);
  const threshold = Math.max(1, Number(timeThreshold) || 120);

  // Penalización por pistas.
  if (hints >= 2) stars = 1;
  else if (hints === 1) stars = Math.min(stars, 2);

  // Penalización por tiempo.
  if (time > threshold * SLOW_FACTOR) stars = 1;
  else if (time > threshold) stars = Math.min(stars, 2);

  // Límite agotado: tope de ★★, pero el nivel sigue siendo superable.
  if ((timeLimit && time > timeLimit) || timeExpired) stars = Math.min(stars, 2);

  return Math.max(1, stars);
}

/**
 * Fusiona un intento nuevo con lo ya guardado. Nunca se pierden estrellas ni
 * empeora el mejor tiempo (§6.1).
 *
 * @param {object} previous Datos guardados del nivel.
 * @param {{ stars:number, timeSeconds:number, hintsUsed:number }} attempt
 * @returns {{ stars:number, bestTime:number, hintsUsed:number, improved:boolean, isNewRecord:boolean }}
 */
export function mergeResult(previous, attempt) {
  const prevStars = Number(previous?.stars) || 0;
  // Ojo con el cero: un nivel resuelto en menos de un segundo tiene bestTime 0,
  // que es un récord perfectamente válido y no debe confundirse con "sin marca".
  const prevBest = Number.isFinite(previous?.bestTime) && previous.bestTime >= 0
    ? previous.bestTime
    : null;

  const stars = Math.max(prevStars, attempt.stars);
  const isNewRecord = prevBest === null || attempt.timeSeconds < prevBest;
  const bestTime = isNewRecord ? attempt.timeSeconds : prevBest;

  return {
    stars,
    bestTime,
    // Guardamos las pistas de la mejor ejecución, no las del último intento.
    hintsUsed: stars > prevStars ? attempt.hintsUsed : (previous?.hintsUsed ?? attempt.hintsUsed),
    improved: stars > prevStars || isNewRecord,
    isNewRecord: Boolean(prevBest !== null && isNewRecord),
  };
}

/** Estrellas máximas que aún se pueden conseguir en el intento en curso. */
export function potentialStars({ hintsUsed = 0, timeSeconds = 0, timeThreshold = 120, timeExpired = false }) {
  return calculateStars({ timeSeconds, hintsUsed, timeThreshold, timeExpired });
}

/** Total de estrellas ganadas en toda la partida. */
export function totalStars(levelData = {}) {
  return Object.values(levelData).reduce((sum, entry) => sum + (Number(entry?.stars) || 0), 0);
}
