/**
 * core/game.js — Orquestador principal. Punto de entrada de la aplicación.
 *
 * Arranca en este orden y no en otro:
 *   1. Catálogo de niveles (todo lo demás depende de los metadatos).
 *   2. Fondo de partículas.
 *   3. Registro de rutas.
 *   4. Router.
 *
 * También centraliza el "desbloqueo" del audio: los navegadores exigen un
 * gesto del usuario antes de sonar nada, así que escuchamos el primero.
 */

import * as router from './router.js';
import * as audio from './audio.js';
import * as state from './state.js';
import { startParticleField } from '../utils/animations.js';
import { loadCatalog } from '../levels/registry.js';

import { menuScreen } from '../ui/menu.js';
import { levelSelectScreen } from '../ui/level-select.js';
import { levelScreen } from '../ui/level-screen.js';
import { settingsScreen } from '../ui/settings.js';
import { endingScreen } from '../ui/ending.js';
import { closeAllOverlays } from '../ui/completion-modal.js';

const APP_SELECTOR = '#app';
const PARTICLES_SELECTOR = '#particles';

async function boot() {
  const app = document.querySelector(APP_SELECTOR);
  if (!app) throw new Error('Falta el contenedor #app en index.html');

  // El catálogo debe estar en memoria antes de montar cualquier pantalla:
  // el selector y el sistema de progreso lo consultan de forma síncrona.
  await loadCatalog();

  startParticleField(document.querySelector(PARTICLES_SELECTOR));

  // Los modales viven fuera del contenedor de pantallas: hay que cerrarlos
  // explícitamente al navegar o se quedarían flotando sobre la pantalla nueva.
  router.beforeEach(closeAllOverlays);

  router.register('/menu', menuScreen);
  router.register('/levels', levelSelectScreen);
  router.register('/level/:id', levelScreen);
  router.register('/settings', settingsScreen);
  router.register('/final', endingScreen);
  router.setNotFound('/menu');

  router.start(app);

  setupAudioUnlock();
  setupVisibilityHandling();
}

/**
 * Prepara el AudioContext en el primer gesto real del usuario y arranca el
 * ambiente si está activado en ajustes.
 */
function setupAudioUnlock() {
  const unlockOnce = () => {
    audio.unlock();
    audio.syncAmbient();
    for (const event of ['pointerdown', 'keydown', 'touchstart']) {
      window.removeEventListener(event, unlockOnce);
    }
  };

  for (const event of ['pointerdown', 'keydown', 'touchstart']) {
    window.addEventListener(event, unlockOnce, { passive: true });
  }
}

/** Silencia el ambiente cuando la pestaña deja de estar visible. */
function setupVisibilityHandling() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) audio.stopAmbient();
    else audio.syncAmbient();
  });
}

boot().catch((err) => {
  console.error('[game] fallo al arrancar:', err);
  const app = document.querySelector(APP_SELECTOR);
  if (app) {
    app.textContent = '';
    const section = document.createElement('section');
    section.className = 'screen center stack stack--4';
    section.style.justifyContent = 'center';

    const title = document.createElement('h1');
    title.className = 'section-title';
    title.textContent = 'MIND ESCAPE no pudo arrancar';

    const detail = document.createElement('p');
    detail.className = 'text-faint';
    detail.textContent = String(err?.message ?? err);

    const help = document.createElement('p');
    help.className = 'text-faint mono';
    help.style.fontSize = '0.8rem';
    help.textContent = 'Sirve el proyecto por HTTP (por ejemplo: python3 -m http.server 8000).';

    section.append(title, detail, help);
    app.append(section);
  }
});

// Expuesto sólo para depuración manual desde la consola del navegador.
window.MindEscape = { router, state, audio };
