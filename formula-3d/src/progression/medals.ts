/**
 * Medallas de tiempo por circuito: bronce, plata, oro y platino según la
 * mejor vuelta válida guardada (de práctica, contrarreloj o carrera). Dan una
 * meta clara en cada pista y un motivo para volver a ella.
 *
 * Los tiempos salen de una referencia por pista: el ritmo de un piloto
 * "profesional" (el piloto automático con dificultad 85, sin errores, con el
 * auto de fábrica), medido en las 24 pistas como fracción del récord real.
 * El récord solo no sirve: con el auto del juego, Bakú se acerca al récord
 * (1,07×) y Madrid queda lejos (1,26×). Si cambian la física o los trazados,
 * `tests/medals.test.ts` avisa cuando la referencia se corre.
 *
 * - Bronce: 12 % más lento que el profesional (alcanzable con vueltas limpias).
 * - Plata: 6 % más lento.
 * - Oro: 2 % más lento.
 * - Platino: 1 % más rápido que el profesional (ritmo de Leyenda).
 * Con las mejoras del auto se llega antes: también es parte de progresar.
 */

import type { TrackDefinition } from '../tracks/TrackDefinition';

export const MEDALS = ['bronze', 'silver', 'gold', 'platinum'] as const;
export type Medal = (typeof MEDALS)[number];

export interface MedalInfo {
  label: string;
  /** Color de la medalla (HUD, listas, perfil). */
  color: string;
  /** Tiempo de la medalla respecto del ritmo profesional de la pista. */
  factor: number;
  /** XP al ganarla por primera vez. */
  xp: number;
}

export const MEDAL_INFO: Readonly<Record<Medal, MedalInfo>> = {
  bronze: { label: 'Bronce', color: '#cd8a52', factor: 1.12, xp: 100 },
  silver: { label: 'Plata', color: '#c9d2dc', factor: 1.06, xp: 150 },
  gold: { label: 'Oro', color: '#f5c542', factor: 1.02, xp: 250 },
  platinum: { label: 'Platino', color: '#9fe8ff', factor: 0.99, xp: 400 },
};

/**
 * Ritmo profesional de cada pista: tiempo de vuelta del piloto automático
 * (dificultad 85) dividido por el récord real. Medido con `tests/medals.test.ts`.
 */
export const MEDAL_PACE: Readonly<Record<string, number>> = {
  australia: 1.165,
  shanghai: 1.192,
  suzuka: 1.154,
  sakhir: 1.142,
  jeddah: 1.166,
  miami: 1.123,
  montreal: 1.11,
  monaco: 1.122,
  barcelona: 1.161,
  spielberg: 1.178,
  silverstone: 1.229,
  spa: 1.144,
  budapest: 1.208,
  zandvoort: 1.234,
  monza: 1.091,
  madrid: 1.257,
  baku: 1.071,
  singapore: 1.134,
  austin: 1.176,
  mexico: 1.12,
  interlagos: 1.179,
  lasvegas: 1.117,
  lusail: 1.242,
  yasmarina: 1.179,
};

/** Ritmo cuando una pista no figura en la tabla (no debería pasar: lo controla una prueba). */
const DEFAULT_PACE = 1.16;

/** Tiempo de vuelta del ritmo profesional en la pista (s). */
export function referenceLap(def: Pick<TrackDefinition, 'id' | 'lapRecord'>): number {
  return def.lapRecord.seconds * (MEDAL_PACE[def.id] ?? DEFAULT_PACE);
}

/** Tiempo (s) para cada medalla, redondeado a la décima (metas fáciles de leer). */
export function medalTimes(def: Pick<TrackDefinition, 'id' | 'lapRecord'>): Record<Medal, number> {
  const reference = referenceLap(def);
  const times = {} as Record<Medal, number>;
  for (const medal of MEDALS) times[medal] = Math.round(reference * MEDAL_INFO[medal].factor * 10) / 10;
  return times;
}

/** La mejor medalla de una vuelta (null si no llega al bronce o no hay vuelta). */
export function medalFor(def: Pick<TrackDefinition, 'id' | 'lapRecord'>, lap: number | null | undefined): Medal | null {
  if (lap === null || lap === undefined || !Number.isFinite(lap)) return null;
  const times = medalTimes(def);
  let best: Medal | null = null;
  for (const medal of MEDALS) if (lap <= times[medal]) best = medal;
  return best;
}

/** La próxima medalla a conseguir y su tiempo (null si ya tiene el platino). */
export function nextMedal(def: Pick<TrackDefinition, 'id' | 'lapRecord'>, lap: number | null | undefined): { medal: Medal; time: number } | null {
  const current = medalFor(def, lap);
  const index = current === null ? 0 : MEDALS.indexOf(current) + 1;
  const medal = MEDALS[index];
  return medal ? { medal, time: medalTimes(def)[medal] } : null;
}

/** Medallas ganadas al bajar el récord de `before` a `after` (de la menor a la mayor). */
export function medalsEarned(def: Pick<TrackDefinition, 'id' | 'lapRecord'>, before: number | null | undefined, after: number): Medal[] {
  const from = medalFor(def, before);
  const to = medalFor(def, after);
  if (to === null) return [];
  const start = from === null ? 0 : MEDALS.indexOf(from) + 1;
  return MEDALS.slice(start, MEDALS.indexOf(to) + 1);
}

/** Cuántas pistas tienen cada medalla o mejor (para el perfil y el menú). */
export function medalTally(
  tracks: ReadonlyArray<Pick<TrackDefinition, 'id' | 'lapRecord'>>,
  bestLap: (id: string) => number | null | undefined,
): Record<Medal, number> {
  const tally: Record<Medal, number> = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  for (const def of tracks) {
    const medal = medalFor(def, bestLap(def.id));
    if (!medal) continue;
    // Una de oro también cuenta como plata y bronce ("oro o mejor").
    for (const m of MEDALS.slice(0, MEDALS.indexOf(medal) + 1)) tally[m]++;
  }
  return tally;
}
