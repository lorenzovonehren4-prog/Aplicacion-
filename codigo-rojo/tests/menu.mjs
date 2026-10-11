// Fotos del menú principal (escritorio, pantalla baja y celular).
// Uso: node tests/menu.mjs → tests/capturas/menu-*.png
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(new URL('..', import.meta.url).pathname), out = path.join(root, 'tests', 'capturas');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => { const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); }).listen(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
for (const [name, w, h, touch] of [['pc', 1280, 720], ['bajo', 1024, 560], ['cel', 390, 760, true]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: !!touch, isMobile: !!touch });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${server.address().port}/index.html`);
  if (name === 'pc') { await page.waitForTimeout(400); await page.screenshot({ path: path.join(out, 'menu-carga.png') }); }
  await page.waitForFunction(() => document.body.classList.contains('ready'));
  await page.evaluate(() => goMenu());
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(out, `menu-${name}.png`) });
  await page.close();
}
console.log(errors.length ? errors : 'sin errores');
await browser.close(); server.close();
