// Prueba de humo: abre el juego, juega una carrera con el piloto automático y toma capturas.
// Uso: node tests/smoke.mjs  (sirve la carpeta con un servidor propio)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const out = path.join(root, 'tests', 'capturas');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const port = server.address().port;
const shot = process.argv.includes('--shots');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${port}/index.html`);
await page.waitForFunction(() => document.body.classList.contains('ready'));
await page.waitForTimeout(800);
if (shot) await page.screenshot({ path: path.join(out, '1-menu.png') });
await page.click('[data-act=quick]');
await page.waitForTimeout(300);
if (shot) await page.screenshot({ path: path.join(out, '2-pistas.png') });
await page.click('[data-act=garage]', { force: true }).catch(() => {});
const trackId = process.env.PISTA || 't1';
await page.evaluate(id => { save.xp = 5000; UI.sel.track = id; renderTracks(); }, trackId);
await page.click('#btnGo');
await page.waitForFunction(() => R.on && document.body.classList.contains('ready'));
// piloto automático para el jugador: usa el mismo control que los bots
await page.evaluate(() => { window.__auto = true; const orig = updateRace; window.updateRace = (dt, inp) => orig(dt, R.player && R.state !== 'countdown' ? botInput(R.player, dt) : inp); });
await page.waitForTimeout(5000);
if (shot) await page.screenshot({ path: path.join(out, '3-carrera.png') });
// acelerar la simulación para terminar la carrera
const res = await page.evaluate(async () => {
  const t0 = performance.now();
  while (R.state !== 'results' && performance.now() - t0 < 60000) {
    for (let i = 0; i < 600 && R.state !== 'results'; i++) updateRace(1 / 120, botInput(R.player, 1 / 120));
    await new Promise(r => setTimeout(r, 0));
  }
  return { state: R.state, laps: R.karts.map(k => [k.name, k.lapsDone, k.bestLap && +k.bestLap.toFixed(2), k.finishTime && +k.finishTime.toFixed(2)]), L: R.T.L };
});
console.log(JSON.stringify(res));
await page.waitForTimeout(1500);
if (shot) await page.screenshot({ path: path.join(out, '4-resultados.png') });
await page.evaluate(() => { goTitle(); });
await page.click('[data-act=garage]');
await page.waitForTimeout(500);
if (shot) await page.screenshot({ path: path.join(out, '5-garaje.png') });
console.log(errors.length ? 'ERRORES:\n' + errors.join('\n') : 'sin errores');
await browser.close(); server.close();
process.exit(errors.length || res.state !== 'results' ? 1 : 0);
