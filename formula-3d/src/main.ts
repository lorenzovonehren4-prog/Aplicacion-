/**
 * Punto de entrada: fuentes y estilos, comprobación de WebGL 2, arranque de los
 * servicios y primera pantalla.
 */

import '@fontsource/titillium-web/400.css';
import '@fontsource/titillium-web/600.css';
import '@fontsource/titillium-web/700.css';
import '@fontsource/titillium-web/900.css';
import '@fontsource/orbitron/600.css';
import '@fontsource/orbitron/700.css';
import '@fontsource/orbitron/900.css';
import './styles/base.css';
import './styles/components.css';
import './styles/transitions.css';
import './styles/screens/splash.css';
import './styles/screens/menu.css';
import './styles/screens/settings.css';
import './styles/screens/race.css';

import { Game, type GameLayers } from './core/Game';
import { GAME_NAME } from './data/game';
import { RenderHost } from './core/render/RenderHost';
import { h } from './ui/dom';
import { registerScreens } from './ui/screens/registry';

/** Fuentes que se usan al dibujar texturas en canvas (deben estar listas antes). */
const CANVAS_FONTS = ['900 64px "Titillium Web"', '700 64px "Titillium Web"', '900 64px "Orbitron"'];
const FONT_TIMEOUT_MS = 2500;

function layers(): GameLayers {
  const find = <T extends HTMLElement>(id: string): T => {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Falta el elemento #${id} en index.html.`);
    return element as T;
  };
  return {
    stage: find('stage'),
    canvas: find<HTMLCanvasElement>('gl'),
    ui: find('ui'),
    overlay: find('overlay'),
  };
}

function showFatal(title: string, message: string, detail?: string): void {
  document.body.replaceChildren(
    h(
      'div',
      { class: 'fatal', attrs: { role: 'alert' } },
      h('div', { class: 'fatal__box' }, h('h1', { text: title }), h('p', { text: message }), detail ? h('code', { text: detail }) : null),
    ),
  );
}

async function loadFonts(): Promise<void> {
  const loads = Promise.all(CANVAS_FONTS.map((font) => document.fonts.load(font)));
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS));
  // Si las fuentes tardan, se sigue igual con las de respaldo.
  await Promise.race([loads.then(() => undefined), timeout]);
}

async function main(): Promise<void> {
  if (!RenderHost.isSupported()) {
    showFatal(
      'Tu navegador no soporta WebGL 2',
      `${GAME_NAME} necesita WebGL 2 para dibujar en 3D. Prueba con una versión reciente de Chrome, Edge, Firefox o Safari, y revisa que la aceleración por hardware esté activada.`,
    );
    return;
  }
  await loadFonts();
  const game = await Game.boot(layers());
  registerScreens(game);
  // Sólo en desarrollo: acceso al juego desde la consola para medir y depurar.
  if (import.meta.env.DEV) (window as unknown as { __apice?: Game }).__apice = game;
  game.start();
  await game.screens.goTo('splash', undefined);

  // En desarrollo, al recargar un módulo se libera el juego anterior (contexto WebGL, audio…).
  import.meta.hot?.dispose(() => void game.dispose());
}

main().catch((error: unknown) => {
  console.error(`[${GAME_NAME}] Error al arrancar:`, error);
  showFatal(
    'No se pudo iniciar el juego',
    'Ocurrió un error inesperado al arrancar. Recarga la página; si se repite, prueba con otro navegador.',
    error instanceof Error ? error.message : String(error),
  );
});
