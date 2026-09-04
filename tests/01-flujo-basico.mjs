import { launch, BASE as ENTRY } from './browser.mjs';

/** Raíz del servidor: el helper entrega la URL de index.html. */
const BASE = ENTRY.replace(/\/index\.html$/, '');
const errors = [];
const results = [];

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

// Las fuentes vienen de un CDN que este entorno bloquea: ese fallo es del
// sandbox, no del código, y el juego usa pilas de respaldo.
const isExternalNoise = (text) =>
  /fonts\.googleapis|fonts\.gstatic|ERR_CONNECTION_RESET|net::ERR/i.test(text);

page.on('console', (msg) => {
  if (msg.type() === 'error' && !isExternalNoise(msg.text())) {
    errors.push(`console.error: ${msg.text()}`);
  }
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

// --- Menú ---
check('Menú renderiza el título', (await page.locator('#menu-title').count()) === 1);
check('Menú muestra 2 botones (Niveles + Ajustes) sin progreso',
  (await page.locator('.menu__actions .btn').count()) === 2,
  `count=${await page.locator('.menu__actions .btn').count()}`);

// --- Selector de niveles ---
await page.getByRole('button', { name: /Niveles/i }).click();
await page.waitForTimeout(500);
const cards = await page.locator('.level-card').count();
check('Selector muestra 30 tarjetas', cards === 30, `count=${cards}`);
const locked = await page.locator('.level-card--locked').count();
check('29 niveles bloqueados al empezar', locked === 29, `locked=${locked}`);
check('Nivel 1 desbloqueado', (await page.locator('.level-card--unlocked').count()) === 1);

// --- Ajustes ---
await page.goto(BASE + '/index.html#/settings', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
check('Ajustes muestra estadísticas', (await page.locator('.stats-block__row').count()) === 4);
const soundSwitch = page.locator('button[role="switch"]').first();
await soundSwitch.click();
await page.waitForTimeout(150);
check('Interruptor de sonido cambia', (await soundSwitch.getAttribute('aria-checked')) === 'false');
const persisted = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('mindEscape_progress')).settings.sound);
check('Ajuste persistido en localStorage', persisted === false, `sound=${persisted}`);
await soundSwitch.click();

// --- Nivel bloqueado redirige ---
await page.goto(BASE + '/index.html#/level/5', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
check('Nivel bloqueado redirige al selector',
  page.url().includes('/levels'), page.url());

// --- Nivel 1 ---
await page.goto(BASE + '/index.html#/level/1', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const numbers = await page.locator('.lv01__number').count();
check('Nivel 1 pinta 18 números', numbers === 18, `count=${numbers}`);
check('Nivel 1 muestra la instrucción', (await page.locator('.puzzle-prompt').isVisible()));
check('Cronómetro visible', (await page.locator('.timer').count()) === 1);
check('3 estrellas potenciales al empezar',
  (await page.locator('.level-stats .stars__item--filled').count()) === 3);

// --- Pistas progresivas ---
await page.locator('.hints__header').click();
await page.waitForTimeout(400);
const hintButtons = page.locator('.hint__reveal');
check('3 pistas listadas', (await hintButtons.count()) === 3);
check('Pista 2 bloqueada de inicio', await hintButtons.nth(1).isDisabled());
await hintButtons.nth(0).click();
await page.waitForTimeout(250);
check('Pista 1 revelada', (await page.locator('.hint__text').count()) === 1);
check('Pista 2 se desbloquea tras la 1', !(await page.locator('.hint__reveal').nth(0).isDisabled()));
check('Estrellas bajan a 2 tras 1 pista',
  (await page.locator('.level-stats .stars__item--filled').count()) === 2,
  `stars=${await page.locator('.level-stats .stars__item--filled').count()}`);

// --- Respuesta incorrecta ---
const wrong = page.locator('.lv01__number:not(.lv01__number--target)').first();
await wrong.click();
await page.waitForTimeout(250);
check('Respuesta incorrecta muestra error',
  (await page.locator('.level-feedback--error').count()) === 1);
check('El nivel NO se reinicia al fallar', (await page.locator('.lv01__number').count()) === 18);

// --- Respuesta correcta ---
await page.locator('.lv01__number--target').click();
await page.waitForTimeout(1200);
check('Modal de completado aparece', (await page.locator('.modal').count()) === 1);
const modalStars = await page.locator('.modal__stars .stars__item--filled').count();
check('Modal muestra 2 estrellas (1 pista usada)', modalStars === 2, `stars=${modalStars}`);
check('Modal ofrece siguiente nivel',
  (await page.getByRole('button', { name: /Siguiente nivel/i }).count()) === 1);

// --- Persistencia y desbloqueo ---
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mindEscape_progress')));
check('Nivel 1 marcado completado', saved.completedLevels.includes(1));
check('Nivel 2 desbloqueado', saved.unlockedLevels.includes(2));
check('Estrellas guardadas = 2', saved.levelData['1'].stars === 2, `stars=${saved.levelData['1'].stars}`);
check('bestTime guardado', Number.isFinite(saved.levelData['1'].bestTime));
check('Intento fallido contabilizado', saved.levelData['1'].attempts >= 1,
  `attempts=${saved.levelData['1'].attempts}`);

// --- El modal no debe sobrevivir a la navegación ---
await page.goto(BASE + '/index.html#/settings', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
check('El modal se cierra al navegar', (await page.locator('.modal-backdrop').count()) === 0,
  `backdrops=${await page.locator('.modal-backdrop').count()}`);
await page.goBack();
await page.waitForTimeout(700);

// --- Siguiente nivel (no implementado → estado "en construcción") ---
await page.goto(BASE + '/index.html#/level/1', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.locator('.lv01__number--target').click();
await page.waitForTimeout(1200);
await page.getByRole('button', { name: /Siguiente nivel/i }).click();
await page.waitForTimeout(700);
check('"Siguiente nivel" abre un nivel jugable',
  (await page.locator('.level-pending').count()) === 0
  && (await page.locator('.puzzle-area *').count()) > 0);
check('El nivel siguiente mantiene el panel de pistas', (await page.locator('.hints').count()) === 1);

// Estado "en construcción": el primer nivel aún sin implementar, leído del
// catálogo para que el test no caduque al implementar más niveles.
const meta = await (await fetch(BASE + '/data/levels-meta.json')).json();
const pending = meta.levels.find((l) => !l.implemented);

if (pending) {
  await page.evaluate((id) => {
    const s = JSON.parse(localStorage.getItem('mindEscape_progress'));
    s.unlockedLevels = [...new Set([...s.unlockedLevels, id])];
    localStorage.setItem('mindEscape_progress', JSON.stringify(s));
  }, pending.id);
  await page.goto(`${BASE}/index.html#/level/${pending.id}`, { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  check('Un nivel sin implementar muestra "en construcción"',
    (await page.locator('.level-pending').count()) === 1);
  check('Un nivel sin implementar mantiene el panel de pistas',
    (await page.locator('.hints').count()) === 1);
} else {
  // Con los 30 niveles hechos ya no hay estado "en construcción" que probar:
  // en su lugar se comprueba que un id fuera de catálogo no rompe nada.
  await page.goto(BASE + '/index.html#/level/31', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  check('Los 30 niveles están implementados', true, 'no queda ninguno pendiente');
  check('Un nivel fuera de catálogo redirige al selector',
    (await page.locator('.level-card').count()) === 30);
}

// --- Vuelta al menú: "Continuar" ya existe ---
await page.goto(BASE + '/index.html#/menu', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
check('Menú ofrece Continuar con progreso',
  (await page.getByRole('button', { name: /Continuar/i }).count()) === 1);
check('Menú muestra barra de progreso', (await page.locator('.menu__progress-fill').count()) === 1);

// --- Persistencia entre recargas ---
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.goto(BASE + '/index.html#/levels', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
check('Tras recargar, nivel 1 sigue completado',
  (await page.locator('.level-card--completed').count()) === 1);
// Desbloqueados en este punto: 1 y 2 por juego, y 11 que abrió el propio test.
const lockedNow = await page.locator('.level-card--locked').count();
check('Tras recargar, el resto sigue bloqueado', lockedNow >= 27, `locked=${lockedNow}`);

// --- Borrar progreso ---
await page.goto(BASE + '/index.html#/settings', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.getByRole('button', { name: /Borrar progreso/i }).click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: /Sí, borrar todo/i }).click();
await page.waitForTimeout(400);
const cleared = await page.evaluate(() => localStorage.getItem('mindEscape_progress'));
check('Borrar progreso limpia localStorage', cleared === null, String(cleared).slice(0, 60));

// --- Responsive 320px ---
await page.setViewportSize({ width: 320, height: 640 });
await page.goto(BASE + '/index.html#/levels', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const overflow = await page.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('Sin scroll horizontal a 320px', overflow <= 0, `overflow=${overflow}px`);

await page.goto(BASE + '/index.html#/level/1', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const overflowLevel = await page.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('Nivel 1 sin scroll horizontal a 320px', overflowLevel <= 0, `overflow=${overflowLevel}px`);

// --- Consola limpia ---
check('Sin errores en consola', errors.length === 0, errors.join(' | '));

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} comprobaciones OK`);
process.exit(failed.length ? 1 : 0);
