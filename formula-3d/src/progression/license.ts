/**
 * Licencia del piloto, como en los juegos de carreras: sube con las medallas
 * de contrarreloj (cada medalla de cada pista suma un punto; una de oro
 * cuenta también como plata y bronce). Sólo se muestra: no cambia nada de la
 * carrera.
 */

import type { Medal } from './medals';

export interface LicenseTier {
  /** "Licencia B", "Súper Licencia"… */
  name: string;
  /** Sello corto para la tarjeta ("B", "SL"). */
  badge: string;
  color: string;
  /** Puntos de medalla desde los que se tiene. */
  from: number;
}

export const LICENSE_TIERS: readonly LicenseTier[] = [
  { name: 'Novato', badge: 'N', color: '#8a95a8', from: 0 },
  { name: 'Licencia C', badge: 'C', color: '#cd7f4a', from: 4 },
  { name: 'Licencia B', badge: 'B', color: '#c9d1dc', from: 16 },
  { name: 'Licencia A', badge: 'A', color: '#ffc53d', from: 36 },
  { name: 'Súper Licencia', badge: 'SL', color: '#b26bff', from: 64 },
];

export interface License {
  tier: LicenseTier;
  points: number;
  /** La próxima y cuántos puntos faltan (null en la última). */
  next: { tier: LicenseTier; missing: number } | null;
  /** Avance hacia la próxima (0–1; 1 en la última). */
  fraction: number;
}

/** Licencia a partir del conteo de medallas (ver `medalTally`). */
export function licenseFor(tally: Readonly<Record<Medal, number>>): License {
  const points = tally.bronze + tally.silver + tally.gold + tally.platinum;
  let index = 0;
  LICENSE_TIERS.forEach((tier, i) => {
    if (points >= tier.from) index = i;
  });
  const tier = LICENSE_TIERS[index] ?? LICENSE_TIERS[0];
  if (!tier) throw new Error('Sin licencias.');
  const nextTier = LICENSE_TIERS[index + 1];
  if (!nextTier) return { tier, points, next: null, fraction: 1 };
  return {
    tier,
    points,
    next: { tier: nextTier, missing: nextTier.from - points },
    fraction: (points - tier.from) / (nextTier.from - tier.from),
  };
}
