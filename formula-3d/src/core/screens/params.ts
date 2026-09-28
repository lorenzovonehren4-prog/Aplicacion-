/**
 * Parámetros que recibe cada pantalla al entrar. Sólo figuran las pantallas que
 * ya existen: navegar a una que no está aquí es un error de compilación. Cada
 * fase agrega las suyas.
 */

export type SettingsTab = 'graphics' | 'audio';

export interface ScreenParams {
  splash: undefined;
  menu: undefined;
  settings: { tab?: SettingsTab } | undefined;
}
