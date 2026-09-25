/* Prueba de humo: recorre intro → menú → selección → partida → resultados
 * y todas las pantallas, falla si hay errores en consola.
 * Uso: node tower-defense/tests/humo.mjs  (capturas en tower-defense/tests/capturas/) */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')); }

const dir = path.dirname(fileURLToPath(import.meta.url));
const shots = path.join(dir, 'capturas');
fs.mkdirSync(shots, { recursive: true });
const url = pathToFileURL(path.join(dir, '..', 'index.html')).href;

const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1366, height: 800 } });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = (n) => page.screenshot({ path: path.join(shots, n + '.png') });
const wait = (ms) => page.waitForTimeout(ms);

await page.goto(url);
await wait(1800); await shot('01-intro');
await page.click('#intro-start');
await wait(500); await shot('02-menu');

// Recompensa diaria
const daily = await page.$('[data-act=daily]');
if (daily) { await daily.click(); await wait(400); await shot('03-diaria'); await page.click('#modal [data-act=close]'); }

await page.click('[data-act=play]');
await wait(500); await shot('04-seleccion');
await page.click('[data-act=start]');
await wait(600);

// Coloca el héroe y construye torres con clics reales
const canvas = await page.$('#game-canvas');
const box = await canvas.boundingBox();
const cell = (c, r) => ({ x: box.x + (c + 0.5) * box.width / 20, y: box.y + (r + 0.5) * box.height / 12 });
let p = cell(5, 4); await page.mouse.click(p.x, p.y);
for (const [id, c, r] of [['fusilero', 2, 4], ['fusilero', 4, 6], ['escopeta', 2, 7], ['criogenizador', 7, 5]]) {
  await page.evaluate(() => { TD.app.game.money += 300; });
  await page.click('.tcard[data-id=' + id + ']');
  p = cell(c, r); await page.mouse.move(p.x, p.y); await wait(100);
  if (id === 'criogenizador') await shot('05-alcance-previo');
  await page.mouse.click(p.x, p.y);
}
p = cell(2, 4); await page.mouse.click(p.x, p.y); await wait(200);
await page.click('#btn-upgrade'); await page.click('#btn-upgrade');
await shot('06-panel-torre');
await page.keyboard.press('Escape');
await page.click('#btn-wave');
await page.click('#btn-speed'); await page.click('#btn-speed');
await wait(6000); await shot('07-oleada');
await page.keyboard.press('n'); await wait(4000); await shot('08-adelantar');

// Pausa e instrucciones desde la partida
await page.keyboard.press(' '); await wait(300); await shot('09-pausa');
await page.click('#pause [data-act=help]'); await wait(300);
await page.click('#modal [data-help=zombis]'); await wait(300); await shot('10-ayuda-zombis');
await page.click('#modal [data-act=close]');
await page.click('#pause [data-act=resume]');

// Fuerza la victoria para ver la pantalla final
await page.evaluate(() => TD.app.game.endGame(true));
await wait(3500); await shot('11-resultados');
await page.click('#results [data-act=menu]'); await wait(500);

for (const [go, n] of [['instructions', '12-instrucciones'], ['profile', '13-perfil'], ['barracks', '14-cuartel'], ['achievements', '15-logros'], ['challenges', '16-desafios'], ['settings', '17-ajustes']]) {
  await page.click('#screen-menu [data-go=' + go + ']'); await wait(400); await shot(n);
  await page.click('#screen-' + (go === 'instructions' ? 'instructions' : go) + ' [data-go=menu]'); await wait(300);
}

// Pantalla estrecha (móvil)
await page.setViewportSize({ width: 390, height: 844 });
await page.click('[data-act=play]'); await wait(300);
await page.click('[data-act=start]'); await wait(800); await shot('18-movil');

await browser.close();
if (errors.length) { console.error('ERRORES:\n' + errors.join('\n')); process.exit(1); }
console.log('OK: sin errores en consola. Capturas en', shots);
