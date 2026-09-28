import type { Game } from '../../core/Game';
import { MainMenuScreen } from './MainMenuScreen';
import { SettingsScreen } from './SettingsScreen';
import { SplashScreen } from './SplashScreen';

/** Registra las pantallas implementadas. Cada fase suma las suyas aquí. */
export function registerScreens(game: Game): void {
  game.screens.register('splash', () => new SplashScreen(game));
  game.screens.register('menu', () => new MainMenuScreen(game));
  game.screens.register('settings', () => new SettingsScreen(game));
}
