// Recorre un campeonato completo (3 carreras) con piloto automático, más pausa y garaje.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const check = (cond, msg) => { if (!cond) errors.push('FALLA: ' + msg); else console.log('ok -', msg); };
await page.goto(`http://localhost:${server.address().port}/index.html`);
await page.waitForFunction(() => document.body.classList.contains('ready'));

check(await page.isDisabled('#btnChamp'), 'campeonato bloqueado al empezar');
await page.evaluate(() => { save.xp = 400; save.coins = 1000; persist(); goTitle(); });
check(!(await page.isDisabled('#btnChamp')), 'campeonato se desbloquea con nivel');

// garaje: comprar y equipar
await page.click('[data-act=garage]');
await page.click('#gItems .item:nth-child(2)');
check(await page.evaluate(() => save.eq.body === 'azul' && save.coins === 850), 'comprar carrocería azul');
await page.keyboard.press('Escape');
check(await page.evaluate(() => UI.screen === 'title'), 'Esc vuelve al menú');

await page.click('[data-act=champ]');
await page.click('#btnGo');
const sim = () => page.evaluate(async () => {
  await new Promise(r => { const w = () => R.on && (R.state === 'countdown' || R.state === 'race') && UI.screen === 'hud' ? r() : setTimeout(w, 50); w(); });
  const t0 = performance.now();
  while (R.state !== 'results' && performance.now() - t0 < 90000) {
    for (let i = 0; i < 600 && R.state !== 'results'; i++) updateRace(1 / 120, R.state === 'countdown' ? INPUT : botInput(R.player, 1 / 120));
    await new Promise(r => setTimeout(r, 0));
  }
  return R.state;
});
for (let race = 0; race < 3; race++) {
  if (race === 0) {
    await page.waitForFunction(() => R.on && UI.screen === 'hud');
    await page.keyboard.press('Escape');
    check(await page.evaluate(() => UI.screen === 'pause' && UI.paused), 'pausa con Esc');
    await page.click('[data-act=resume]');
  }
  check(await sim() === 'results', 'carrera ' + (race + 1) + ' terminada');
  await page.waitForSelector('#results.on', { timeout: 10000 });
  await page.click('#resBtns .b');
  await page.waitForSelector('#standings.on');
  if (race < 2) await page.click('#stBtns .b.go');
}
const final = await page.evaluate(() => ({ title: document.getElementById('stTitle').textContent, rows: document.querySelectorAll('#stBody tr').length, races: save.stats.races }));
check(final.title === 'Campeonato terminado' && final.rows === 6 && final.races === 3, 'clasificación final ' + JSON.stringify(final));
console.log(errors.length ? 'ERRORES:\n' + errors.join('\n') : 'sin errores');
await browser.close(); server.close();
process.exit(errors.length ? 1 : 0);
