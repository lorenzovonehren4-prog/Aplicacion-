// Captura de una carrera del Kartódromo para la portada del portal.
// Uso: node portal/tools/capturas-karting.mjs [pista]  → portal/tests/capturas/kart-<pista>.png
// En el contenedor el navegador dibuja por software: cada cuadro tarda varios segundos.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('../../karting', import.meta.url).pathname);
const out = path.resolve(new URL('../tests/capturas', import.meta.url).pathname);
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const port = server.address().port;
const track = process.argv[2] || 't3';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(240000);
await page.goto(`http://localhost:${port}/index.html`);
await page.waitForFunction(() => document.body.classList.contains('ready'));
await page.screenshot({ path: path.join(out, 'kart-menu.png') });
await page.click('[data-act=quick]');
await page.evaluate(id => { UI.sel.track = id; renderTracks(); }, track);
await page.click('#btnGo');
await page.waitForFunction(() => R.on && document.body.classList.contains('ready'));
await page.evaluate(async () => {
  const t0 = performance.now();
  while (R.state === 'countdown' && performance.now() - t0 < 60000) { updateRace(1 / 120, {}); await new Promise(r => setTimeout(r, 0)); }
  for (let i = 0; i < 120 * 7; i++) updateRace(1 / 120, botInput(R.player, 1 / 120));
});
await page.waitForTimeout(4000);
await page.screenshot({ path: path.join(out, `kart-${track}.png`) });
await browser.close(); server.close();
console.log('listo', track);
