/**
 * Dificultad de cada circuito y los cinco campeonatos del modo Campeonato.
 *
 * La clasificación sale de mirar cada trazado (curvas, rectas, horquillas,
 * secuencias técnicas, relieve) y de medirlo con el propio juego
 * (`TrackAnalysis`/`RacingLine`): curvas lentas (< 120 km/h), frenadas
 * fuertes (pierden más de 80 km/h), radio mínimo, velocidad media y cuánto de
 * la vuelta tiene el muro a menos de 4 m (circuitos urbanos). Ver la tabla
 * completa con la justificación en PLAN.md (Versión 2.0).
 *
 * `rating` (1–10) ordena las pistas de la más fácil a la más difícil; `level`
 * agrupa: Fácil (≤ 4), Media (4–6) y Difícil (> 6).
 */

export type TrackLevel = 'easy' | 'medium' | 'hard';

export interface TrackDifficulty {
  level: TrackLevel;
  /** 1 (muy fácil) – 10 (muy difícil). */
  rating: number;
  /** Por qué (corto, para la interfaz). */
  reason: string;
  /** Fecha del Gran Premio en el calendario de la temporada (como en el póster). */
  date: string;
}

export const LEVEL_LABEL: Readonly<Record<TrackLevel, string>> = {
  easy: 'Fácil',
  medium: 'Media',
  hard: 'Difícil',
};

export const TRACK_DIFFICULTY: Readonly<Record<string, TrackDifficulty>> = {
  monza: { level: 'easy', rating: 1.5, date: '06 SEP', reason: 'Pocas curvas (11), rectas larguísimas y chicanas claras con escapatorias amplias.' },
  spielberg: { level: 'easy', rating: 2, date: '28 JUN', reason: 'Sólo 10 curvas y la vuelta más corta: tres rectas con frenadas evidentes.' },
  sakhir: { level: 'easy', rating: 2.5, date: '12 ABR', reason: 'Frenadas fuertes pero bien marcadas después de rectas, con escapatorias de asfalto enormes.' },
  barcelona: { level: 'easy', rating: 3, date: '14 JUN', reason: 'Curvas medias y rápidas conocidas, buena visibilidad y escapatorias amplias.' },
  lusail: { level: 'easy', rating: 3.2, date: '29 NOV', reason: 'Curvas rápidas y abiertas que se encadenan con fluidez (radio mínimo de 28 m) y mucho espacio.' },
  australia: { level: 'easy', rating: 3.4, date: '08 MAR', reason: 'Trazado fluido alrededor del lago, rápido y con espacio; pocas trampas.' },
  shanghai: { level: 'easy', rating: 3.6, date: '15 MAR', reason: 'El caracol de la curva 1 se cierra, pero las escapatorias perdonan y las rectas son largas.' },
  interlagos: { level: 'easy', rating: 3.9, date: '08 NOV', reason: 'Corto y fluido: sólo 7 curvas lentas; la S do Senna en bajada es lo más delicado.' },
  mexico: { level: 'medium', rating: 4.3, date: '01 NOV', reason: 'La recta más larga, pero 13 curvas lentas y 11 frenadas fuertes (el estadio y las eses).' },
  silverstone: { level: 'medium', rating: 4.6, date: '05 JUL', reason: 'Curvas muy rápidas (Copse, Maggotts-Becketts) que piden valor y precisión.' },
  austin: { level: 'medium', rating: 4.9, date: '25 OCT', reason: '20 curvas con la subida a la 1, eses rápidas y un estadio lento al final.' },
  budapest: { level: 'medium', rating: 5.1, date: '26 JUL', reason: '13 curvas lentas casi sin rectas: muy trabado, cuesta adelantar y mantener el ritmo.' },
  yasmarina: { level: 'medium', rating: 5.3, date: '06 DIC', reason: 'Rectas con frenadas fuertes y un último sector lento entre muros.' },
  miami: { level: 'medium', rating: 5.5, date: '03 MAY', reason: 'Semiurbano: muros cerca en el 74 % de la vuelta y una chicana muy cerrada.' },
  lasvegas: { level: 'medium', rating: 5.7, date: '21 NOV', reason: 'Pocas curvas y rectas enormes, pero de noche y entre muros a más de 340 km/h.' },
  montreal: { level: 'medium', rating: 6, date: '24 MAY', reason: 'Chicanas rápidas con pianos altos y muros pegados (el "muro de los campeones").' },
  madrid: { level: 'hard', rating: 6.6, date: '13 SEP', reason: 'Circuito nuevo y mitad urbano: 22 curvas, 18 lentas, y muros en más de la mitad de la vuelta.' },
  zandvoort: { level: 'hard', rating: 7, date: '23 AGO', reason: 'Angosto, con curvas peraltadas, subidas y bajadas y casi nada de lugar para errores.' },
  spa: { level: 'hard', rating: 7.3, date: '19 JUL', reason: 'El más largo (7 km): Eau Rouge, Pouhon y la Parada de Autobús, con mucho desnivel.' },
  suzuka: { level: 'hard', rating: 7.8, date: '29 MAR', reason: 'El "ocho": eses encadenadas donde un error se arrastra varias curvas, la Degner y la 130R.' },
  baku: { level: 'hard', rating: 8.2, date: '27 SEP', reason: 'Ángulos rectos entre muros, el paso angosto del castillo y una recta de 2 km a fondo.' },
  jeddah: { level: 'hard', rating: 8.6, date: '19 ABR', reason: 'El urbano más rápido: 27 curvas ciegas entre muros a casi 240 km/h de promedio.' },
  singapore: { level: 'hard', rating: 9, date: '11 OCT', reason: '19 curvas lentas entre muros (75 % de la vuelta), de noche y larga: no da respiro.' },
  monaco: { level: 'hard', rating: 9.6, date: '07 JUN', reason: 'La más lenta y angosta: 18 curvas lentas, la horquilla más cerrada (8 m) y muros en todas partes.' },
};

export interface Championship {
  id: string;
  name: string;
  /** "Fácil", "Media", "Difícil", "Total" o "Autor". */
  tag: string;
  description: string;
  /** Circuitos en el orden de las rondas. */
  tracks: readonly string[];
}

/** Ids ordenados de menor a mayor dificultad (y, a igualdad, por fecha del calendario). */
function byRating(level?: TrackLevel): string[] {
  return Object.entries(TRACK_DIFFICULTY)
    .filter(([, info]) => !level || info.level === level)
    .sort(([, a], [, b]) => a.rating - b.rating)
    .map(([id]) => id);
}

export const CHAMPIONSHIPS: readonly Championship[] = [
  {
    id: 'easy',
    name: 'Copa Iniciación',
    tag: 'Fácil',
    description: 'Las 8 pistas fáciles, de la más simple a la más exigente: rectas largas, frenadas claras y escapatorias amplias para aprender.',
    tracks: byRating('easy'),
  },
  {
    id: 'medium',
    name: 'Copa Desafío',
    tag: 'Media',
    description: 'Las 8 pistas de dificultad media: curvas rápidas, desniveles y los primeros muros cerca de la pista.',
    tracks: byRating('medium'),
  },
  {
    id: 'hard',
    name: 'Copa Élite',
    tag: 'Difícil',
    description: 'Las 8 pistas más difíciles: circuitos urbanos entre muros y trazados técnicos donde no se perdona un error.',
    tracks: byRating('hard'),
  },
  {
    id: 'total',
    name: 'Temporada Completa',
    tag: 'Total',
    description: 'Las 24 pistas en una sola temporada, ordenadas de la más fácil a la más difícil: de Monza a Mónaco.',
    tracks: byRating(),
  },
  {
    id: 'author',
    name: 'Gran Gira',
    tag: 'Autor',
    description:
      'Diez carreras elegidas para que la emoción suba: se alternan pistas rápidas y técnicas, de día y de noche, permanentes y urbanas, con descansos de velocidad entre los desafíos y Mónaco como gran final.',
    tracks: ['sakhir', 'australia', 'suzuka', 'miami', 'spa', 'monza', 'singapore', 'interlagos', 'lasvegas', 'monaco'],
  },
];

export function getChampionship(id: string | undefined): Championship {
  return CHAMPIONSHIPS.find((cup) => cup.id === id) ?? (CHAMPIONSHIPS[3] as Championship);
}
