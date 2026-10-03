/**
 * Desafío del día: un objetivo distinto cada día (el mismo para la misma
 * fecha), en una pista del calendario, con premio de XP y puntos de
 * desarrollo. Cumplir días seguidos arma una racha que sube el premio: un
 * motivo para volver mañana.
 *
 * Tipos (rotan día a día):
 * - Medalla: una vuelta en contrarreloj por debajo de un tiempo (la próxima
 *   medalla del jugador en esa pista).
 * - Podio: terminar entre los tres primeros.
 * - Remontada: largar último y terminar entre los seis primeros.
 * - Carrera limpia: terminar entre los seis primeros sin tocar a nadie y sin
 *   vueltas anuladas.
 * - Victoria: ganar una carrera corta contra rivales un poco más lentos.
 * Las carreras usan la dificultad que el jugador eligió (o el nivel de abajo,
 * en la remontada y la victoria), así el desafío es de su nivel.
 */

import type { RaceParams } from '../core/screens/params';
import type { Weather } from '../core/save/schema';
import { formatLapTime } from '../core/utils/format';
import type { TrackDefinition } from '../tracks/TrackDefinition';
import { DIFFICULTY_INFO } from '../race/ai/difficulty';
import { medalTimes, nextMedal, MEDAL_INFO } from './medals';

/** Color del desafío del día (menú, premio en los resultados). */
export const DAILY_COLOR = '#ff7b1c';

export const CHALLENGE_KINDS = ['medal', 'podium', 'comeback', 'clean', 'win'] as const;
export type ChallengeKind = (typeof CHALLENGE_KINDS)[number];

/** Lo que se guarda del desafío: el último día cumplido y la racha. */
export interface DailyState {
  /** Último día cumplido (AAAA-MM-DD, hora local), o null. */
  last: string | null;
  /** Días seguidos cumplidos hasta `last`. */
  streak: number;
  /** La racha más larga. */
  best: number;
  /** Desafíos cumplidos en total. */
  total: number;
}

export function createDailyState(): DailyState {
  return { last: null, streak: 0, best: 0, total: 0 };
}

export interface DailyChallenge {
  date: string;
  kind: ChallengeKind;
  trackId: string;
  /** "Vuelta de plata", "Remontada"… */
  title: string;
  /** Qué hay que hacer, en una frase. */
  goal: string;
  /** Sesión que se corre al aceptarlo. */
  race: RaceParams;
  /** Medalla: tiempo a bajar (s). */
  target?: number;
  /** Carreras: puesto máximo para cumplirlo. */
  position?: number;
}

/** Cómo terminó la sesión, para ver si se cumplió. */
export interface DailyOutcome {
  /** Mejor vuelta válida de la sesión (s), o null. */
  bestLap: number | null;
  /** Puesto final (null sin carrera terminada). */
  position: number | null;
  /** Choques del jugador en la carrera. */
  contacts: number;
  /** Todas las vueltas de la carrera fueron válidas. */
  allValid: boolean;
}

/** Día local como AAAA-MM-DD (el desafío cambia a la medianoche del jugador). */
export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Número de día (desde 1970) de una fecha AAAA-MM-DD. */
function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / 86_400_000);
}

/** El día anterior (AAAA-MM-DD). */
export function previousDay(key: string): string {
  const day = new Date((dayNumber(key) - 1) * 86_400_000);
  return `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, '0')}-${String(day.getUTCDate()).padStart(2, '0')}`;
}

/** Hash entero de un texto (FNV-1a): reparte las pistas sin patrones visibles. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Pista del día: nunca la misma que ayer. */
function trackFor(key: string, tracks: readonly TrackDefinition[]): TrackDefinition {
  const pick = (k: string): number => hash(`pista:${k}`) % tracks.length;
  let index = pick(key);
  if (index === pick(previousDay(key))) index = (index + 1) % tracks.length;
  const track = tracks[index] ?? tracks[0];
  if (!track) throw new Error('No hay pistas para el desafío del día.');
  return track;
}

const WEATHER_BY_DAY: readonly Weather[] = ['sunny', 'sunny', 'cloudy', 'sunny', 'sunset'];

/**
 * Valores de los niveles con nombre (Novato, Amateur, Profesional, Leyenda),
 * de menor a mayor. Se leen al usarlos: el guardado importa este módulo y la
 * dificultad importa el guardado (un ciclo que al cargar todavía no resolvió).
 */
function namedLevels(): number[] {
  return (['novice', 'amateur', 'pro', 'legend'] as const).map((level) => DIFFICULTY_INFO[level].value);
}

/**
 * El desafío de una fecha.
 * @param bestLap mejor vuelta guardada del jugador en una pista (para la medalla a buscar)
 * @param difficulty dificultad de los rivales que eligió el jugador (0–100)
 */
export function dailyChallenge(
  key: string,
  tracks: readonly TrackDefinition[],
  bestLap: (trackId: string) => number | null | undefined,
  difficulty: number,
): DailyChallenge {
  const day = dayNumber(key);
  const kind = CHALLENGE_KINDS[((day % CHALLENGE_KINDS.length) + CHALLENGE_KINDS.length) % CHALLENGE_KINDS.length] ?? 'podium';
  const def = trackFor(key, tracks);
  const weather = WEATHER_BY_DAY[hash(`clima:${key}`) % WEATHER_BY_DAY.length] ?? 'sunny';
  const base = { trackId: def.id, weather, daily: key };
  // Un nivel con nombre por debajo del elegido (no un número suelto: en los resultados se lee "Novato", no "Personalizada (18)").
  const easier = (): number => {
    const levels = namedLevels();
    const below = levels.filter((value) => value < difficulty - 5);
    return below[below.length - 1] ?? levels[0] ?? 0;
  };
  switch (kind) {
    case 'medal': {
      const next = nextMedal(def, bestLap(def.id));
      const medal = next?.medal ?? 'platinum';
      const target = next?.time ?? medalTimes(def).platinum;
      return {
        date: key,
        kind,
        trackId: def.id,
        title: `Vuelta de ${MEDAL_INFO[medal].label.toLowerCase()}`,
        goal: `Marca una vuelta válida en ${formatLapTime(target)} o menos en ${def.short} (contrarreloj).`,
        race: { ...base, mode: 'timeTrial' },
        target,
      };
    }
    case 'podium':
      return {
        date: key,
        kind,
        trackId: def.id,
        title: 'Al podio',
        goal: `Termina entre los tres primeros en ${def.short}, 3 vueltas contra 11 rivales de tu nivel.`,
        race: { ...base, mode: 'race', laps: 3, rivals: 11, difficulty },
        position: 3,
      };
    case 'comeback':
      return {
        date: key,
        kind,
        trackId: def.id,
        title: 'Remontada',
        goal: `Larga último y termina entre los seis primeros en ${def.short} (3 vueltas, 11 rivales).`,
        race: { ...base, mode: 'race', laps: 3, rivals: 11, difficulty: easier(), startLast: true },
        position: 6,
      };
    case 'clean':
      return {
        date: key,
        kind,
        trackId: def.id,
        title: 'Carrera limpia',
        goal: `Termina entre los seis primeros en ${def.short} sin tocar a nadie y sin vueltas anuladas (3 vueltas).`,
        race: { ...base, mode: 'race', laps: 3, rivals: 11, difficulty },
        position: 6,
      };
    case 'win':
      return {
        date: key,
        kind,
        trackId: def.id,
        title: 'Victoria',
        goal: `Gana una carrera de 2 vueltas en ${def.short} contra 9 rivales.`,
        race: { ...base, mode: 'race', laps: 2, rivals: 9, difficulty: easier() },
        position: 1,
      };
  }
}

/** ¿Se cumplió el desafío con esta sesión? */
export function dailyCompleted(challenge: DailyChallenge, outcome: DailyOutcome): boolean {
  switch (challenge.kind) {
    case 'medal':
      return outcome.bestLap !== null && challenge.target !== undefined && outcome.bestLap <= challenge.target;
    case 'clean':
      return outcome.position !== null && outcome.position <= (challenge.position ?? 6) && outcome.contacts === 0 && outcome.allValid;
    default:
      return outcome.position !== null && outcome.position <= (challenge.position ?? 1);
  }
}

/** Racha vigente: la guardada si el último día cumplido fue hoy o ayer; si no, se cortó. */
export function currentStreak(state: Readonly<DailyState>, today: string): number {
  return state.last === today || state.last === previousDay(today) ? state.streak : 0;
}

/** ¿Ya se cumplió el de hoy? */
export function doneToday(state: Readonly<DailyState>, today: string): boolean {
  return state.last === today;
}

/** Anota el desafío de hoy como cumplido (una sola vez por día). */
export function completeDaily(state: Readonly<DailyState>, today: string): DailyState {
  if (state.last === today) return { ...state };
  const streak = state.last === previousDay(today) ? state.streak + 1 : 1;
  return { last: today, streak, best: Math.max(state.best, streak), total: state.total + 1 };
}

/** Premio por cumplirlo con esa racha: más XP cada día seguido (hasta el quinto) y un punto extra desde el tercero. */
export function dailyReward(streak: number): { xp: number; points: number } {
  const days = Math.max(1, Math.floor(streak));
  return { xp: 300 + 60 * Math.min(4, days - 1), points: days >= 3 ? 3 : 2 };
}
