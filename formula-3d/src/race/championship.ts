/**
 * Campeonato: una temporada con los circuitos del campeonato elegido, los mismos
 * rivales en cada carrera y puntos estilo F1 (25-18-15-12-10-8-6-4-2-1 del
 * primero al décimo). Lógica pura sobre el estado guardado (ver
 * `SaveData.championship`): crear, anotar una carrera y calcular la tabla.
 */

import type { ChampionshipState } from '../core/save/schema';

/** Puntos por posición (1.º a 10.º). */
export const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1] as const;

/** Identificador del jugador en las clasificaciones del campeonato. */
export const PLAYER_ID = 'player';

export function pointsFor(position: number): number {
  return POINTS[position - 1] ?? 0;
}

export interface ChampionshipSetup {
  /** Campeonato elegido (`data/championships.ts`). */
  cup?: string;
  laps: ChampionshipState['laps'];
  difficulty: number;
  weather: ChampionshipState['weather'];
  /** Pilotos rivales (ids de `data/teams.ts`), los mismos toda la temporada. */
  rivals: readonly string[];
  /** Circuitos en el orden del calendario. */
  calendar: readonly string[];
}

export function createChampionship(setup: ChampionshipSetup, now: number): ChampionshipState {
  return {
    ...(setup.cup ? { cup: setup.cup } : {}),
    startedAt: now,
    laps: setup.laps,
    difficulty: setup.difficulty,
    weather: setup.weather,
    rivals: [...setup.rivals],
    rounds: setup.calendar.map((trackId) => ({ trackId, results: null })),
  };
}

/** Índice de la próxima carrera, o −1 si la temporada terminó. */
export function nextRound(state: ChampionshipState): number {
  return state.rounds.findIndex((round) => round.results === null);
}

export function isFinished(state: ChampionshipState): boolean {
  return nextRound(state) === -1;
}

/**
 * Anota el resultado de una carrera.
 * @param order ids en el orden de llegada (el jugador es `PLAYER_ID`)
 */
export function recordRound(state: ChampionshipState, round: number, order: readonly string[]): ChampionshipState {
  const rounds = state.rounds.map((entry, i) =>
    i === round
      ? {
          trackId: entry.trackId,
          results: order.map((id, index) => ({ id, position: index + 1, points: pointsFor(index + 1) })),
        }
      : entry,
  );
  return { ...state, rounds };
}

export interface ChampionshipRow {
  id: string;
  points: number;
  wins: number;
  podiums: number;
  /** Mejor posición en la temporada (desempate). */
  best: number;
  /** Posición en la tabla (1 = puntero). */
  position: number;
}

/** Tabla de pilotos: por puntos; a igualdad, más victorias, más podios y mejor resultado. */
export function standings(state: ChampionshipState): ChampionshipRow[] {
  const rows = new Map<string, ChampionshipRow>();
  const row = (id: string): ChampionshipRow => {
    let entry = rows.get(id);
    if (!entry) {
      entry = { id, points: 0, wins: 0, podiums: 0, best: Infinity, position: 0 };
      rows.set(id, entry);
    }
    return entry;
  };
  for (const id of [PLAYER_ID, ...state.rivals]) row(id);
  for (const round of state.rounds) {
    for (const result of round.results ?? []) {
      const entry = row(result.id);
      entry.points += result.points;
      if (result.position === 1) entry.wins++;
      if (result.position <= 3) entry.podiums++;
      entry.best = Math.min(entry.best, result.position);
    }
  }
  const sorted = [...rows.values()].sort(
    (a, b) => b.points - a.points || b.wins - a.wins || b.podiums - a.podiums || a.best - b.best || a.id.localeCompare(b.id),
  );
  sorted.forEach((entry, i) => (entry.position = i + 1));
  return sorted;
}
