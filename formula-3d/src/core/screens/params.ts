/**
 * Parámetros que recibe cada pantalla al entrar. Sólo figuran las pantallas que
 * ya existen: navegar a una que no está aquí es un error de compilación. Cada
 * fase agrega las suyas.
 */

import type { LiveryConfig } from '../../garage/livery';
import type { ProgressSnapshot, XpAward } from '../../progression/xp';
import type { StoredGhost } from '../../race/session/Ghost';
import type { Weather } from '../save/schema';

export type SettingsTab = 'graphics' | 'audio' | 'controls' | 'assists' | 'game';

/**
 * Modos de sesión en pista: práctica libre (sin rivales), carrera (con
 * rivales; también cada ronda del campeonato) y contrarreloj (sin rivales,
 * con fantasma).
 */
export type SessionMode = 'practice' | 'race' | 'timeTrial';

/** Modos que se eligen en la pantalla de selección de carrera. */
export type RaceSelectMode = 'practice' | 'quickRace' | 'timeTrial';

export interface RaceParams {
  trackId: string;
  mode: SessionMode;
  /** Vueltas de la carrera (sólo en modo carrera). */
  laps?: number;
  /** Rivales y dificultad (0–100); si faltan, los de Ajustes → Juego. */
  rivals?: number;
  difficulty?: number;
  /** Clima (soleado si no se indica). */
  weather?: Weather;
  /** Carrera del campeonato en curso (índice en el calendario). */
  championshipRound?: number;
  /** El jugador larga último (desafío de remontada). */
  startLast?: boolean;
  /** Desafío del día que se está corriendo (su fecha, AAAA-MM-DD). */
  daily?: string;
  /** Contrarreloj contra el fantasma de otro jugador (el del récord de la tabla en línea). */
  rivalGhost?: { name: string; ghost: StoredGhost };
}

/** Un piloto del podio (lo necesario para dibujar su auto y su cartel). */
export interface PodiumEntry {
  name: string;
  teamName: string;
  teamColor: string;
  livery: LiveryConfig;
  isPlayer: boolean;
}

/** Resultados de una sesión, con la XP ya sumada al guardado. */
export interface ResultsParams {
  /** La sesión que terminó (para repetirla o seguir con la siguiente). */
  race: RaceParams;
  trackName: string;
  /** "Carrera rápida", "Campeonato · Ronda 2"… */
  modeLabel: string;
  /** Posición final y autos (null sin rivales). */
  position: number | null;
  starters: number;
  totalTime: number | null;
  bestLap: number | null;
  personalBest: boolean;
  award: XpAward;
  before: ProgressSnapshot;
  after: ProgressSnapshot;
  /** Ítems nuevos del pase. */
  rewards: string[];
  /** Puntos de desarrollo ganados (para las mejoras del auto) y total disponible. */
  devPoints?: { gained: number; available: number };
  /** Los tres primeros (vacío sin rivales): para la pantalla del podio. */
  podium: PodiumEntry[];
}

export interface ScreenParams {
  splash: undefined;
  menu: undefined;
  settings: { tab?: SettingsTab } | undefined;
  raceSelect: { mode: RaceSelectMode };
  championship: undefined;
  race: RaceParams;
  results: ResultsParams;
  podium: ResultsParams;
  pass: undefined;
  garage: undefined;
  /** Guía de circuitos (abre en el circuito pedido o en el último elegido). */
  circuits: { trackId?: string } | undefined;
  profile: undefined;
  assistsManual: undefined;
  tutorial: undefined;
}
