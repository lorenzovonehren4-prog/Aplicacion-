/**
 * Pase de temporada: 50 niveles de 1 000 XP. Cada nivel da un ítem
 * (`progression/items.ts`); todo se gana corriendo, no hay pagos. La XP del
 * pase es la misma que suma el piloto en cada carrera.
 */

import { SEASON_ONE_REWARDS } from './items';

export interface Season {
  id: number;
  name: string;
  tiers: number;
  xpPerTier: number;
  /** Id del ítem de cada nivel (índice 0 = nivel 1). */
  rewards: readonly string[];
}

export const SEASON: Season = {
  id: 1,
  name: 'Temporada 1 · Ignición',
  tiers: SEASON_ONE_REWARDS.length,
  xpPerTier: 1000,
  rewards: SEASON_ONE_REWARDS,
};

/** XP con la que se completa el pase. */
export const PASS_MAX_XP = SEASON.tiers * SEASON.xpPerTier;

export interface PassProgress {
  /** Niveles completados (0–50). */
  tier: number;
  /** XP dentro del nivel en curso. */
  xp: number;
  /** Avance de 0 a 1 dentro del nivel en curso (1 con el pase completo). */
  fraction: number;
  complete: boolean;
}

export function passProgress(passXp: number): PassProgress {
  const xp = Math.max(0, Math.min(PASS_MAX_XP, Math.floor(passXp)));
  const tier = Math.floor(xp / SEASON.xpPerTier);
  const complete = tier >= SEASON.tiers;
  const inTier = complete ? 0 : xp - tier * SEASON.xpPerTier;
  return { tier, xp: inTier, fraction: complete ? 1 : inTier / SEASON.xpPerTier, complete };
}

/** Recompensas de los niveles que se completan al pasar de `fromXp` a `toXp`. */
export function passRewardsBetween(fromXp: number, toXp: number): string[] {
  const from = passProgress(fromXp).tier;
  const to = passProgress(toXp).tier;
  return SEASON.rewards.slice(from, to);
}

/** XP que falta para completar el nivel `tier` del pase (1–50). */
export function xpUntilTier(passXp: number, tier: number): number {
  return Math.max(0, tier * SEASON.xpPerTier - passXp);
}
