// Prueba de Brújula Política: responde el test entero y saca capturas.
// Uso: CHROMIUM_PATH=... node portal/tests/brujula.mjs  → portal/tests/capturas/brujula-*.png
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const out = path.join(root, 'portal/tests/capturas');
fs.mkdirSync(out, { recursive: true });
const url = pathToFileURL(path.join(root, 'brujula-politica/index.html')).href;
let fails = 0;
const check = (ok, msg) => { console.log((ok ? '✔ ' : '✘ ') + msg); if (!ok) fails++; };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [tag, vp] of [['pc', { width: 1280, height: 860 }], ['cel', { width: 360, height: 760 }]]) {
  const page = await browser.newPage({ viewport: vp });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url);
  await page.screenshot({ path: path.join(out, `brujula-${tag}-inicio.png`) });
  check(!(await page.isVisible('#resume')), `${tag}: sin test a medias no aparece "Seguir"`);
  await page.click('#go');
  await page.waitForSelector('#s-quiz.on');
  for (let i = 0; i < 30; i++) { await page.keyboard.press(String(1 + (i % 5))); await page.waitForTimeout(200); }
  if (tag === 'cel') await page.screenshot({ path: path.join(out, `brujula-${tag}-pregunta.png`) });
  check(await page.textContent('#qn') === '31/60', `${tag}: va en la pregunta 31`);
  await page.click('#exit');
  check(await page.isVisible('#resume'), `${tag}: se puede seguir donde se quedó`);
  await page.click('#resume');
  check(await page.textContent('#qn') === '31/60', `${tag}: retoma en la 31`);
  for (let i = 0; i < 30; i++) { await page.locator('#ans button').nth(i % 2 ? 0 : 3).click(); await page.waitForTimeout(200); }
  await page.waitForSelector('#s-res.on');
  await page.waitForTimeout(900);
  check(await page.locator('.ax__row').count() === 6, `${tag}: tarjeta con los 6 ejes`);
  check(await page.locator('.card #compass circle').count() > 10, `${tag}: la brújula está en la tarjeta`);
  check(await page.locator('.lst--def > div').count() === 3, `${tag}: muestra lo que más te define`);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  check(sw <= vp.width, `${tag}: sin scroll horizontal (${sw})`);
  await page.screenshot({ path: path.join(out, `brujula-${tag}-resultado.png`), fullPage: true });
  await page.click('#home');
  check(await page.locator('#hist button').count() === 1, `${tag}: el resultado queda en el historial`);
  check(errors.length === 0, `${tag}: sin errores` + (errors.length ? ': ' + errors.join(' | ') : ''));
  await page.close();
}
await browser.close();
process.exit(fails ? 1 : 0);
