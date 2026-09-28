/**
 * Curva de niveles del jugador (1 a 100). Ver PLAN.md §5.7.
 *
 * XP para pasar del nivel n al n+1 = 600 + 120·(n−1)^1.15, redondeado a 50:
 * 600 en el nivel 1, 2 100 en el 10, 11 150 en el 50 y 24 000 en el 99.
 */

export const MAX_LEVEL = 100;

const BASE_XP = 600;
const GROWTH = 120;
const EXPONENT = 1.15;
const ROUNDING = 50;

/** XP necesaria para pasar de `level` al siguiente (0 en el nivel máximo). */
export function xpToNextLevel(level: number): number {
  const n = Math.floor(level);
  if (n < 1 || n >= MAX_LEVEL) return 0;
  const raw = BASE_XP + GROWTH * Math.pow(n - 1, EXPONENT);
  return Math.round(raw / ROUNDING) * ROUNDING;
}

export interface LevelProgress {
  level: number;
  /** XP dentro del nivel actual. */
  xp: number;
  /** XP que pide el nivel actual para subir (0 en el máximo). */
  needed: number;
  /** Avance de 0 a 1 dentro del nivel. */
  fraction: number;
  isMax: boolean;
}

/** Avance dentro del nivel, listo para una barra de XP. */
export function levelProgress(level: number, xp: number): LevelProgress {
  const needed = xpToNextLevel(level);
  const isMax = needed === 0;
  return {
    level,
    xp: isMax ? 0 : xp,
    needed,
    fraction: isMax ? 1 : Math.min(1, Math.max(0, xp / needed)),
    isMax,
  };
}
