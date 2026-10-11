// Fotos rápidas de la cabina (cada carro), el garaje y la pantalla de resultados.
// Uso: node tests/pantallas.mjs → tests/capturas/pant-*.png
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(new URL('..', import.meta.url).pathname), out = path.join(root, 'tests', 'capturas');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => { const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); }).listen(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on('pageerror', e => { errors.push(e.message); console.log('ERR', e.message, (e.stack || '').split('\n').slice(0, 4).join(' | ')); });
await page.goto(`http://localhost:${server.address().port}/index.html`);
await page.waitForFunction(() => document.body.classList.contains('ready'));
const only = process.argv[2] || 'cabina,garaje,resultado';
if (only.includes('cabina')) for (const id of ['compacto', 'super', 'pickup']) {
  await page.evaluate(id => { save.car = id; save.cars = CARS.map(c => c.id); save.opt.cam = 'cabina'; goMenu('menu'); startGame({ role: 'ladron', diff: 'facil', goal: 'survive', t: 60, time: 'dia' }); showScreen('hud'); document.body.classList.add('playing'); G.mode = 'play'; KEYS.ArrowUp = true; }, id);
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(out, `pant-cabina-${id}.png`) });
  await page.evaluate(() => { KEYS.ArrowUp = false; });
}
if (only.includes('garaje')) {
  await page.evaluate(() => { save.car = 'muscle'; goMenu('garage'); });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(out, 'pant-garaje.png') });
}
if (only.includes('resultado')) {
  await page.evaluate(() => { goMenu('menu'); startGame({ role: 'policia', diff: 'normal', goal: 'arrest', t: 120, time: 'tarde', mission: 'p2' }); showScreen('hud'); G.mode = 'play'; G.time = 40; G.stats.top = 163; finish(true, '¡Ladrón atrapado!'); });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(out, 'pant-resultado.png') });
}
console.log(errors.length ? errors : 'sin errores');
await browser.close(); server.close();
