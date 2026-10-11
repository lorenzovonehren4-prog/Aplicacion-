// Capturas de los menús (inicio con el carro en demostración, mapa, detalle y taller) en compu y celular.
// Uso: node tests/menus.mjs  → tests/capturas/
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(new URL('..', import.meta.url).pathname), out = path.join(root, 'tests', 'capturas');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => { const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); }).listen(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
for (const [w, h, tag] of [[1280, 720, 'pc'], [390, 844, 'cel']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${server.address().port}/index.html`);
  await page.waitForFunction(() => document.body.classList.contains('ready'));
  await page.evaluate(() => { save.lv[1] = { stars: [true, true, false], best: 70, done: true }; save.coins = 260; save.upg.motor = 1; leaveIntro(); });
  await page.evaluate(() => { for (let i = 0; i < 300; i++) attractStep(1 / 60); G.attractT = 6.5; });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(out, `menu-${tag}.png`) });
  await page.evaluate(() => act('play')); await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(out, `mapa-${tag}.png`) });
  await page.evaluate(() => openDetail(2)); await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(out, `detalle-${tag}.png`) });
  await page.evaluate(() => act('garage')); await page.waitForTimeout(800);
  await page.hover('[data-buy=motor]').catch(() => {}); await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(out, `taller-${tag}.png`) });
  await page.close();
}
console.log(errors.length ? errors : 'sin errores');
await browser.close(); server.close();
