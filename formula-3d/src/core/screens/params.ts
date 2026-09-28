/**
 * Parámetros que recibe cada pantalla al entrar. Sólo figuran las pantallas que
 * ya existen: navegar a una que no está aquí es un error de compilación. Cada
 * fase agrega las suyas.
 */

export type SettingsTab = 'graphics' | 'audio' | 'controls' | 'game';

/** Modos de sesión en pista. La Fase 2 trae la práctica libre; carrera y contrarreloj llegan en la Fase 5. */
export type SessionMode = 'practice';

export interface RaceParams {
  trackId: string;
  mode: SessionMode;
}

export interface ScreenParams {
  splash: undefined;
  menu: undefined;
  settings: { tab?: SettingsTab } | undefined;
  race: RaceParams;
}
