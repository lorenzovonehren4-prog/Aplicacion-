/**
 * Dificultad de los rivales. Cada nivel es un punto de una escala 0–100 (el
 * nivel Personalizado usa el valor del control deslizante) y la escala se
 * convierte en parámetros de manejo: ritmo en curva, velocidad máxima, puntos
 * de frenada, agresividad y frecuencia de errores. El talento y el carácter
 * de cada piloto mueven esos valores un poco hacia arriba o hacia abajo.
 */

import { DIFFICULTY_LEVELS, type DifficultyLevel, type RaceSettings } from '../../core/save/schema';
import type { DriverDef } from '../../data/teams';

export const DIFFICULTY_INFO: Readonly<Record<DifficultyLevel, { label: string; value: number; description: string }>> = {
  novice: { label: 'Novato', value: 8, description: 'Rivales tranquilos que frenan temprano y se equivocan seguido.' },
  amateur: { label: 'Amateur', value: 38, description: 'Ritmo de club: pelean, pero dejan huecos.' },
  pro: { label: 'Profesional', value: 68, description: 'Rápidos y constantes; defienden su posición.' },
  legend: { label: 'Leyenda', value: 95, description: 'Al límite en cada curva. Casi no fallan.' },
  custom: { label: 'Personalizada', value: 50, description: 'Elige la dificultad exacta (0–100).' },
};

/** Valor 0–100 de la dificultad elegida en los ajustes. */
export function difficultyValue(settings: Pick<RaceSettings, 'difficulty' | 'customDifficulty'>): number {
  return settings.difficulty === 'custom' ? settings.customDifficulty : DIFFICULTY_INFO[settings.difficulty].value;
}

/** Cómo maneja un bot. */
export interface BotParams {
  /** Fracción de la velocidad de la trazada ideal a la que dobla (0–1). */
  pace: number;
  /** Tope del acelerador en recta (la "velocidad máxima" del bot). */
  topThrottle: number;
  /** Fracción de la frenada disponible con la que planea las frenadas (menos = frena antes). */
  braking: number;
  /** 0–1: ganas de adelantar, de cerrar la puerta y de frenar tarde en una pelea. */
  aggression: number;
  /** Errores por vuelta (frenadas pasadas, salidas anchas). */
  mistakesPerLap: number;
  /** Tiempo de reacción a la largada (s). */
  reaction: number;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Parámetros de un piloto para una dificultad.
 * @param value dificultad 0–100
 * @param driver talento y agresividad propios
 * @param random 0–1, para la variación de la reacción (inyectable en las pruebas)
 */
export function botParams(value: number, driver: Pick<DriverDef, 'skill' | 'aggression'>, random = 0.5): BotParams {
  const t = Math.min(1, Math.max(0, value / 100));
  // El talento separa a los pilotos ±1,5 % alrededor del ritmo de la dificultad.
  const talent = (driver.skill - 0.84) * 0.12;
  return {
    pace: Math.min(0.97, lerp(0.77, 0.955, t) + talent),
    topThrottle: Math.min(1, lerp(0.86, 1, t) + talent * 0.5),
    braking: Math.min(0.95, lerp(0.62, 0.92, t) + talent),
    aggression: Math.min(1, Math.max(0, lerp(0.15, 0.75, t) * 0.5 + driver.aggression * 0.5)),
    mistakesPerLap: lerp(0.45, 0.03, t),
    reaction: lerp(0.45, 0.2, t) + (random - 0.5) * 0.16,
  };
}

/** Nombre de una dificultad 0–100: el nivel más cercano, o el número si no coincide con ninguno. */
export function difficultyLabel(value: number): string {
  let best: DifficultyLevel = 'amateur';
  for (const level of DIFFICULTY_LEVELS) {
    if (level === 'custom') continue;
    if (Math.abs(DIFFICULTY_INFO[level].value - value) < Math.abs(DIFFICULTY_INFO[best].value - value)) best = level;
  }
  return Math.abs(DIFFICULTY_INFO[best].value - value) < 3 ? DIFFICULTY_INFO[best].label : `Personalizada (${Math.round(value)})`;
}
