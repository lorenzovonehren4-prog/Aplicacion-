// Saca una captura del menú de cada juego para usarla de portada en el portal.
// Uso: node portal/tools/portadas.mjs [id …]  → portal/tests/capturas/menu-<id>.png
// En el contenedor el navegador dibuja por software: los juegos 3D tardan.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const out = path.join(root, 'portal', 'tests', 'capturas');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webp': 'image/webp', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const GAMES = {
  'tower-defense': 'tower-defense/index.html',
  'futbol': 'modo-carrera-futbol/index.html',
  'fuga-urbana': 'fuga-urbana/index.html',
  'apice-gp': 'formula-3d/apice-gp.html',
  'escalada': 'escalada/index.html',
  'combi-rush': 'combi-rush/combi-rush.html',
};
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(GAMES);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.setDefaultTimeout(240000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${server.address().port}/${GAMES[id]}`);
  await page.waitForTimeout(+(process.env.ESPERA || 9000));
  await page.screenshot({ path: path.join(out, `menu-${id}.png`) });
  // Segunda imagen (la que aparece al pasar el mouse por la ficha): un toque y otra captura.
  if (process.env.ALT) {
    await page.mouse.click(640, 400); await page.keyboard.press('Enter');
    await page.waitForTimeout(+(process.env.ESPERA_ALT || 8000));
    await page.screenshot({ path: path.join(out, `alt-${id}.png`) });
  }
  console.log(id, errors.length ? errors.slice(0, 3) : 'sin errores');
  await page.close();
}
await browser.close(); server.close();
