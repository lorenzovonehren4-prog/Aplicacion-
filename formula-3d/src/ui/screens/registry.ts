import type { Game } from '../../core/Game';
import { ChampionshipScreen } from './ChampionshipScreen';
import { GarageScreen } from './GarageScreen';
import { MainMenuScreen } from './MainMenuScreen';
import { RaceScreen } from './RaceScreen';
import { RaceSelectScreen } from './RaceSelectScreen';
import { ResultsScreen } from './ResultsScreen';
import { SeasonPassScreen } from './SeasonPassScreen';
import { SettingsScreen } from './SettingsScreen';
import { SplashScreen } from './SplashScreen';

/** Registra las pantallas implementadas. Cada fase suma las suyas aquí. */
export function registerScreens(game: Game): void {
  game.screens.register('splash', () => new SplashScreen(game));
  game.screens.register('menu', () => new MainMenuScreen(game));
  game.screens.register('settings', () => new SettingsScreen(game));
  game.screens.register('race', () => new RaceScreen(game));
  game.screens.register('raceSelect', () => new RaceSelectScreen(game));
  game.screens.register('championship', () => new ChampionshipScreen(game));
  game.screens.register('results', () => new ResultsScreen(game));
  game.screens.register('pass', () => new SeasonPassScreen(game));
  game.screens.register('garage', () => new GarageScreen(game));
}
