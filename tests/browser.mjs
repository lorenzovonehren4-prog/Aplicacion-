/**
 * tests/browser.mjs — Arranque del navegador, compartido por todas las suites.
 *
 * Por defecto usa el Chromium que instala Playwright. Si el entorno ya tiene uno
 * (un contenedor de CI, por ejemplo), basta con exportar CHROMIUM_PATH.
 */

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

export function launch(options = {}) {
  return chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    ...options,
  });
}

/** Puerto del servidor estático que levanta tests/run.mjs. */
export const BASE = process.env.MIND_ESCAPE_URL || 'http://127.0.0.1:8765/index.html';

/**
 * Ruta donde dejar una captura. Van todas a tests/capturas/ (ignorado por git)
 * para no ensuciar la raíz del proyecto en cada tanda.
 */
export function shot(nombre) {
  const dir = new URL('./capturas/', import.meta.url);
  mkdirSync(dir, { recursive: true });
  return fileURLToPath(new URL(nombre, dir));
}
