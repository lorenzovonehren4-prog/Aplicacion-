// Prueba de humo de Último Disparo: menú, informe, mira, tiro a la cabeza con cámara de bala,
// misión fallida (inocente y por fallar), armería y un vistazo a cada escenario.
// Uso: node tests/smoke.mjs [--shots]   (CHROMIUM_PATH en contenedores)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const out = path.join(root, 'tests', 'capturas');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const shots = process.argv.includes('--shots');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: Number(process.env.W || 1280), height: Number(process.env.H || 720) } });
page.setDefaultTimeout(120000);
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
let fails = 0;
const check = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) fails++; };
const shot = async n => { if (shots) await page.screenshot({ path: path.join(out, n + '.png') }); };

await page.goto(`http://localhost:${server.address().port}/index.html`);
await page.waitForFunction(() => document.body.classList.contains('ready'));
await page.waitForTimeout(1200);
await shot('0-intro');
await page.click('#intro');
await page.waitForTimeout(1500);
check(await page.evaluate(() => UD.UI.cur === 'menu'), 'el menú abre');
await shot('1-menu');

// misión 1: tiro a la cabeza
await page.click('[data-go=play]');
await page.waitForTimeout(800);
check(await page.evaluate(() => UD.UI.cur === 'brief' && UD.G.L.n === 1), 'informe de la misión 1');
await shot('2-brief');
await page.click('#bGo');
await page.waitForTimeout(1200);
check(await page.evaluate(() => UD.G.mode === 'play'), 'la misión empieza');
await shot('3-sin-mira');
await page.evaluate(() => { setScope(true); UD.G.zoom = 5; UD.aim('head'); UD.G.pitch += 0.002; });
await page.waitForTimeout(900);
await shot('4-mira');
await page.evaluate(() => { UD.aim('head'); });
await page.waitForTimeout(200);
await page.evaluate(() => { UD.aim('head'); fire(); });
check(await page.evaluate(() => UD.G.mode === 'bulletcam'), 'cámara de bala al darle al secuestrador');
await page.evaluate(() => { UD.G.freeze = true; UD.step(10, () => UD.G.bc.t > UD.G.bc.dur * 0.45); });
await page.waitForTimeout(2500);
await shot('5-bala');
await page.evaluate(() => { UD.step(10, () => UD.G.bc.phase === 'after'); UD.step(0.8); });
await page.waitForTimeout(2500);
await shot('6-impacto');
await page.evaluate(() => { UD.step(8, () => UD.UI.cur === 'result'); UD.G.freeze = false; });
check(await page.evaluate(() => UD.UI.cur === 'result'), 'pantalla de resultado');
await page.waitForTimeout(2500);
check(await page.evaluate(() => UD.save.lv[1] && UD.save.lv[1].done && UD.save.lv[1].stars >= 2), 'misión 1 cumplida con tiro a la cabeza');
check(await page.evaluate(() => UD.save.coins > 0), 'monedas ganadas');
await shot('7-cumplida');

// misión 2: dispararle al rehén = falla
await page.click('#rNext');
await page.waitForTimeout(600);
await page.click('#bGo');
await page.waitForTimeout(800);
await page.evaluate(() => { setScope(true); aimAtPoint(UD.G.hostage.chestWorld(V())); UD.G.stats.sway = 0; });
await page.waitForTimeout(200);
await page.evaluate(() => { aimAtPoint(UD.G.hostage.chestWorld(V())); cameraAim(0); aimAtPoint(UD.G.hostage.chestWorld(V())); fire(); UD.step(4, () => UD.UI.cur === 'result'); });
check(await page.evaluate(() => UD.G.result.reason === 'inocente'), 'darle al rehén falla la misión');
await page.waitForTimeout(500);
await shot('8-fallida');
// volver a intentar y fallar al aire
await page.click('#rRetry');
await page.waitForTimeout(800);
await page.evaluate(() => { setScope(true); UD.G.pitch = 0.2; UD.G.stats.sway = 0; fire(); UD.step(4, () => UD.UI.cur === 'result'); });
check(await page.evaluate(() => UD.G.result.reason === 'fallaste'), 'fallar el tiro falla la misión');

// armería
await page.evaluate(() => { UD.save.coins = 5000; });
await page.click('#rArm');
await page.waitForTimeout(800);
await page.click('[data-wbuy=sombra]');
await page.click('[data-up=zoom]');
await page.waitForTimeout(600);
check(await page.evaluate(() => UD.save.owned.includes('sombra') && UD.save.weapon === 'sombra' && UD.save.up.zoom === 1), 'comprar arma y mejora');
await shot('9-armeria');

// cada escenario
for (const n of [7, 9, 13, 17, 24, 30]) {
  await page.evaluate(n => { UD.UI.brief(n); UD.UI.go(); }, n);
  await page.waitForTimeout(4000);
  await shot(`10-nivel${n}-vista`);
  await page.evaluate(() => { setScope(true); UD.G.zoom = UD.G.stats.zoomMax; UD.aim('chest'); });
  await page.waitForTimeout(4000);
  await shot(`11-nivel${n}-mira`);
}
// la Sombra SD da un segundo tiro
await page.evaluate(() => { UD.UI.brief(3); UD.UI.go(); });
await page.waitForTimeout(500);
await page.evaluate(() => { setScope(true); UD.G.pitch = 0.2; fire(); });
await page.waitForTimeout(300);
check(await page.evaluate(() => UD.G.mode === 'play' && UD.G.shots === 1), 'con silenciador, fallar deja otro tiro');

check(errors.length === 0, 'sin errores en consola' + (errors.length ? ': ' + errors.slice(0, 5).join(' | ') : ''));
await browser.close();
server.close();
process.exit(fails ? 1 : 0);
