/**
 * Parámetros que recibe cada pantalla al entrar. Sólo figuran las pantallas que
 * ya existen: navegar a una que no está aquí es un error de compilación. Cada
 * fase agrega las suyas.
 */

import type { Weather } from '../save/schema';

export type SettingsTab = 'graphics' | 'audio' | 'controls' | 'assists' | 'game';

/**
 * Modos de sesión en pista: práctica libre (Fase 2, sin rivales) y carrera
 * (Fase 3; con rivales desde la Fase 4). Contrarreloj y campeonato llegan en
 * la Fase 5.
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
}

export interface ScreenParams {
  splash: undefined;
  menu: undefined;
  settings: { tab?: SettingsTab } | undefined;
  raceSelect: { mode: RaceSelectMode };
  championship: undefined;
  race: RaceParams;
}
