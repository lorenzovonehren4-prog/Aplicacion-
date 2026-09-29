/**
 * Prueba de humo en Chromium real sobre el build de producción.
 *
 *   npm run build && npm run smoke
 *
 * Recorre: splash → menú → Ajustes (cambia calidad y volumen) → vuelve →
 * recarga → comprueba que lo guardado sigue ahí → Práctica libre (carga del
 * circuito, presentación, manejo, cambio de cámara, pausa) → sale al menú →
 * Carrera rápida (semáforo, largada, rivales en la torre y el minimapa,
 * Ajustes → Ayudas desde la pausa). Falla
 * si aparece cualquier error o advertencia en la consola. Guarda capturas en
 * e2e/capturas/.
 *
 * Chromium: usa el de Playwright (`npx playwright-core install chromium`) o el
 * que indique la variable CHROMIUM_PATH. Sin GPU (servidores, CI) Chromium
 * dibuja por software y va lento: por eso se emula `prefers-reduced-motion`,
 * que el juego respeta acortando las animaciones.
 */

import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { preview } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const shots = fileURLToPath(new URL('./capturas/', import.meta.url));
const STEP_TIMEOUT = 120_000;

const problems = [];
let step = 'inicio';

/**
 * Avisos del driver gráfico por software que provoca la propia prueba al
 * sacar capturas (lectura de píxeles); no vienen del juego.
 */
const HARNESS_NOISE = [/GPU stall due to ReadPixels/];

function log(message) {
  console.info(`  · ${message}`);
}

async function main() {
  await mkdir(shots, { recursive: true });
  const server = await preview({ root, preview: { port: 4179, strictPort: true, open: false }, logLevel: 'error' });
  const url = server.resolvedUrls?.local[0] ?? 'http://localhost:4179/';
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(STEP_TIMEOUT);
    page.on('console', (message) => {
      if (HARNESS_NOISE.some((pattern) => pattern.test(message.text()))) return;
      if (message.type() === 'error' || message.type() === 'warning') {
        problems.push(`[${step}] consola ${message.type()}: ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => problems.push(`[${step}] excepción: ${error.message}`));

    // ─── Primera visita ───
    step = 'splash';
    await page.goto(url);
    await page.waitForSelector('.screen--splash .splash__prompt');
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${shots}01-splash.png` });
    log('splash visible');

    step = 'menú';
    await page.keyboard.press('Enter');
    await waitForScreen(page, 'menu');
    await page.screenshot({ path: `${shots}02-menu.png` });
    const locked = await page.locator('.mbtn.is-locked').count();
    log(`menú visible (${locked} accesos bloqueados para fases futuras)`);

    step = 'ajustes';
    // Desde el primer acceso, ↑ da la vuelta hasta el último: Ajustes.
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    await waitForScreen(page, 'settings');
    // Calidad → Baja (más liviana para Chromium sin GPU). El selector da la vuelta.
    for (let i = 0; i < 4; i++) {
      const value = await page.locator('.srow.is-focused .selector__value').textContent();
      if (value?.trim() === 'Baja') break;
      await page.keyboard.press('ArrowLeft');
    }
    await expectText(page, '.srow.is-focused .selector__value', 'Baja');
    await page.screenshot({ path: `${shots}03-ajustes-graficos.png` });
    await page.keyboard.press('KeyE');
    await page.waitForSelector('.tab.is-active >> text=Sonido');
    await page.keyboard.press('ArrowLeft'); // 80 % → 75 %
    await expectText(page, '.srow.is-focused .slider__value', '75 %');
    await page.screenshot({ path: `${shots}04-ajustes-sonido.png` });
    log('ajustes: calidad Baja y volumen general 75 %');

    step = 'volver';
    await page.keyboard.press('Escape');
    await waitForScreen(page, 'menu');
    log('Esc vuelve al menú');

    // ─── Recarga: lo guardado debe seguir ───
    step = 'recarga';
    await page.waitForTimeout(700); // escritura agrupada del guardado (400 ms)
    await page.reload();
    await page.waitForSelector('.screen--splash .splash__prompt');
    await page.keyboard.press('Enter');
    await waitForScreen(page, 'menu');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    await waitForScreen(page, 'settings');
    await expectText(page, '.srow.is-focused .selector__value', 'Baja');
    await page.keyboard.press('KeyE');
    await expectText(page, '.srow.is-focused .slider__value', '75 %');
    log('el guardado sobrevivió a la recarga (IndexedDB)');

    // ─── Práctica libre ───
    step = 'práctica: carga';
    await page.keyboard.press('Escape');
    await waitForScreen(page, 'menu');
    // Desde Ajustes (último acceso), ↓ da la vuelta hasta el primero: Práctica libre.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await startFromSelection(page, 'práctica');
    await page.waitForSelector('.screen--race .loading', { state: 'attached' });
    // Sin GPU el barrido de la transición es lento: la carga puede terminar antes de verse.
    if (await page.locator('.loading').isVisible()) await page.screenshot({ path: `${shots}05-carga.png` });
    await waitForScreen(page, 'race');
    await page.waitForSelector('.loading', { state: 'detached' });
    await page.waitForSelector('.race__intro-title');
    await page.screenshot({ path: `${shots}06-presentacion.png` });
    log('circuito cargado; presentación en pantalla');

    step = 'práctica: manejo';
    await page.keyboard.press('Enter'); // salta la presentación
    await page.waitForSelector('.hud:not(.is-hidden)');
    await page.keyboard.down('ArrowUp');
    await page.waitForFunction(() => Number(document.querySelector('.dash__speed')?.textContent ?? 0) > 5, null, { polling: 250 });
    await page.keyboard.up('ArrowUp');
    await page.keyboard.press('KeyC');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${shots}07-en-pista.png` });
    log(`en pista a ${await page.locator('.dash__speed').textContent()} km/h; cámara cambiada`);

    step = 'práctica: pausa';
    await page.keyboard.press('Escape');
    await page.waitForSelector('.pause.is-visible');
    await page.screenshot({ path: `${shots}08-pausa.png` });
    // Salir al menú: 3 × ↓ hasta "Salir al menú", confirmar dos veces.
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await waitForScreen(page, 'menu');
    log('pausa → salir al menú');

    // ─── Carrera rápida: semáforo, largada y pestaña Ayudas desde la pausa ───
    step = 'carrera: semáforo';
    // Desde Práctica libre (primer acceso), ↓ va a Carrera rápida.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await startFromSelection(page, 'carrera');
    await page.waitForSelector('.screen--race .loading', { state: 'attached' });
    await waitForScreen(page, 'race');
    await page.waitForSelector('.loading', { state: 'detached' });
    await page.waitForSelector('.race__intro-title');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.hud__lights.is-visible');
    await page.keyboard.down('ArrowUp');
    await page.waitForFunction(() => document.querySelectorAll('.hud__lamp.is-on').length === 10, null, { polling: 200 });
    await page.screenshot({ path: `${shots}09-semaforo.png` });
    await page.waitForFunction(
      () => [...document.querySelectorAll('.hud__message-title')].some((e) => e.textContent?.includes('APAGADAS')),
      null,
      { polling: 150 },
    );
    await page.waitForFunction(() => Number(document.querySelector('.dash__speed')?.textContent ?? 0) > 5, null, { polling: 250 });
    await page.keyboard.up('ArrowUp');
    await expectText(page, '.timing__lap', 'VUELTA 1/3');
    await page.screenshot({ path: `${shots}10-largada.png` });
    log('semáforo de 5 luces → ¡apagadas! → vuelta 1/3');

    step = 'carrera: rivales';
    // Rivales: posición "P7/12", torre de posiciones y puntos en el minimapa.
    await page.waitForSelector('.timing__place.is-visible');
    const place = (await page.locator('.timing__place').textContent())?.replace(/\s+/g, '');
    const rows = await page.locator('.standings.is-visible .standings__row:not(.is-empty)').count();
    const dots = await page.locator('.minimap__rival').count();
    if (!/^P\d+\/12$/.test(place ?? '') || rows < 10 || dots !== 11) {
      throw new Error(`Rivales incompletos: posición "${place}", ${rows} filas en la torre, ${dots} puntos en el minimapa.`);
    }
    log(`rivales en pista: ${place}, torre con ${rows} filas y ${dots} rivales en el minimapa`);

    step = 'carrera: ayudas';
    await page.keyboard.press('Escape');
    await page.waitForSelector('.pause.is-visible');
    for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await waitForScreen(page, 'settings');
    await page.waitForSelector('.acard.is-selected');
    await page.screenshot({ path: `${shots}11-ayudas.png` });
    const level = await page.locator('.acard.is-selected .acard__name').textContent();
    await page.keyboard.press('Escape');
    await waitForScreen(page, 'race');
    await page.keyboard.press('Escape'); // continúa la carrera
    await page.waitForSelector('.pause', { state: 'hidden' });
    log(`Ajustes → Ayudas desde la pausa (nivel ${level}) y vuelta a la carrera`);

    // ─── Respaldo: sin IndexedDB, el guardado va a localStorage ───
    step = 'respaldo localStorage';
    const fallback = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
    await fallback.addInitScript(() => {
      Object.defineProperty(window, 'indexedDB', { get: () => undefined });
    });
    const page2 = await fallback.newPage();
    page2.setDefaultTimeout(STEP_TIMEOUT);
    page2.on('pageerror', (error) => problems.push(`[${step}] excepción: ${error.message}`));
    page2.on('console', (message) => {
      // El aviso de "IndexedDB no disponible" es justamente lo esperado aquí.
      if (message.type() === 'error') problems.push(`[${step}] consola error: ${message.text()}`);
    });
    await page2.goto(url);
    await page2.waitForSelector('.screen--splash .splash__prompt');
    await page2.waitForTimeout(700);
    const stored = await page2.evaluate(() => localStorage.getItem('apice-gp:save'));
    if (!stored?.includes('"version":1')) throw new Error('No se escribió el guardado en localStorage.');
    log('sin IndexedDB, el guardado se escribe en localStorage');
    await fallback.close();
  } finally {
    await browser.close();
    await server.close();
  }
}

/**
 * Selección de carrera: arranca con el circuito guardado enfocado; Enter pasa
 * al botón de salida y Enter de nuevo va a pista.
 */
async function startFromSelection(page, label) {
  await waitForScreen(page, 'rsel');
  const maps = await page.locator('.tmap path').count();
  if (maps < 3) throw new Error(`La selección de ${label} no dibujó el mapa del circuito.`);
  await page.screenshot({ path: `${shots}seleccion-${label}.png` });
  await page.keyboard.press('Enter');
  await page.waitForSelector('.rsel__start.is-focused');
  await page.keyboard.press('Enter');
  log(`selección de ${label}: circuito y opciones → a pista`);
}

/** Espera a que `id` sea la pantalla de arriba y la transición haya terminado. */
async function waitForScreen(page, id) {
  await page.waitForFunction(
    (screenId) => {
      const top = [...document.querySelectorAll('#ui > .screen')].at(-1);
      const wipeBusy = document.querySelector('.wipe')?.classList.contains('is-active');
      return Boolean(top?.classList.contains(`screen--${screenId}`)) && !wipeBusy;
    },
    id,
    { polling: 150, timeout: STEP_TIMEOUT },
  );
  await page.waitForTimeout(400);
}

async function expectText(page, selector, text) {
  await page.waitForFunction(
    ([sel, expected]) => document.querySelector(sel)?.textContent?.trim() === expected,
    [selector, text],
    { polling: 100, timeout: 20_000 },
  ).catch(async () => {
    const actual = await page.locator(selector).first().textContent().catch(() => null);
    throw new Error(`Se esperaba "${text}" en ${selector} y hay "${actual}".`);
  });
}

console.info('Prueba de humo en Chromium…');
main()
  .then(() => {
    if (problems.length > 0) {
      console.error(`\n✖ ${problems.length} problema(s) en la consola:`);
      for (const problem of problems) console.error(`  ${problem}`);
      process.exit(1);
    }
    console.info('\n✔ Prueba de humo superada sin errores ni advertencias en la consola.');
  })
  .catch((error) => {
    console.error(`\n✖ Falló en el paso "${step}":`, error);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  });
