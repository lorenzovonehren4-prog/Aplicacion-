/**
 * Evento semanal: un circuito fijo toda la semana (de lunes a domingo, hora
 * local) para correr en contrarreloj, con la tabla de récords de ese circuito.
 * Es una contrarreloj común (no cambia la carrera): el menú sólo elige la
 * pista y el clima de la semana y muestra el tiempo para el cierre.
 */

import type { RaceParams } from '../core/screens/params';
import type { Weather } from '../core/save/schema';
import type { TrackDefinition } from '../tracks/TrackDefinition';

/** Color del evento semanal (menú). */
export const WEEKLY_COLOR = '#2ee6a6';

export interface WeeklyEvent {
  /** Lunes de la semana (AAAA-MM-DD). */
  week: string;
  trackId: string;
  weather: Weather;
  /** Cuándo cierra (el lunes siguiente a la medianoche, hora local). */
  ends: Date;
  race: RaceParams;
}

const WEATHERS: readonly Weather[] = ['sunny', 'cloudy', 'sunset', 'sunny'];

/** Lunes de la semana de `date` (hora local), a la medianoche. */
export function weekStart(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  return start;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** Lunes de la semana como AAAA-MM-DD. */
export function weekKey(date: Date): string {
  const start = weekStart(date);
  return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
}

/** Número de semana desde 1970 (para rotar las pistas sin repetir seguido). */
function weekNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / (7 * 86_400_000));
}

/** El evento de la semana de `date`: recorre el calendario en un orden mezclado, una pista por semana. */
export function weeklyEvent(date: Date, tracks: readonly TrackDefinition[]): WeeklyEvent {
  if (tracks.length === 0) throw new Error('No hay pistas para el evento semanal.');
  const week = weekKey(date);
  const n = weekNumber(week);
  // Paso coprimo con la cantidad de pistas: pasa por todas antes de repetir.
  let step = 7;
  while (gcd(step, tracks.length) !== 1) step++;
  const index = (((n * step) % tracks.length) + tracks.length) % tracks.length;
  const def = tracks[index] ?? tracks[0];
  if (!def) throw new Error('No hay pistas para el evento semanal.');
  const weather = WEATHERS[((n % WEATHERS.length) + WEATHERS.length) % WEATHERS.length] ?? 'sunny';
  const ends = weekStart(date);
  ends.setDate(ends.getDate() + 7);
  return { week, trackId: def.id, weather, ends, race: { trackId: def.id, mode: 'timeTrial', weather } };
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
