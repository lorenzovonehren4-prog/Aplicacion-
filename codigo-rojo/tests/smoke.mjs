// Prueba de humo de Código Rojo: menú con la demostración, una misión de ladrón y una de
// policía manejadas por la IA (avanzando la simulación a mano), capturas y sin errores.
// Uso: node tests/smoke.mjs [--shots]
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
page.setDefaultTimeout(300000);
const errors = [];
page.on('pageerror', e => errors.push(e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
let fails = 0;
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FALLA') + ' ' + what); if (!ok) fails++; };
const shot = async n => { if (shots) await page.screenshot({ path: path.join(out, n + '.png') }); };
await page.goto(`http://localhost:${server.address().port}/index.html`);
await page.waitForFunction(() => document.body.classList.contains('ready'));
await page.waitForTimeout(1200);
await shot('0-intro');
await page.keyboard.press('Enter');
await page.evaluate(() => { for (let i = 0; i < 600; i++) attractStep(1 / 60); G.attractT = 0.5; });
await page.waitForTimeout(1500);
await shot('1-menu');
const demo = await page.evaluate(() => ({ cops: G.cops.length, traffic: G.traffic.length, thiefMoved: G.thief.body.odo }));
check(demo.thiefMoved > 50, `demostración: el ladrón maneja solo (${Math.round(demo.thiefMoved)} m)`);

// Misión de ladrón: el jugador maneja con la IA de ladrón.
await page.evaluate(() => { playMission('l1'); });
await page.waitForFunction(() => G.cfg && G.cfg.mission === 'l1' && G.mode === 'count', null, { timeout: 60000 }).catch(() => console.log('ERR', errors.join('\n')));
const r1 = await page.evaluate(() => {
  G.mode = 'play';
  const ai = newThief(G.player.body, 'normal', null);
  const out = { minDist: 1e9, maxSpeed: 0 };
  for (let i = 0; i < 120 * 30 && G.mode === 'play'; i++) {
    const lead = G.cops.reduce((a, c) => !a || Math.hypot(c.body.x - G.player.body.x, c.body.z - G.player.body.z) < Math.hypot(a.body.x - G.player.body.x, a.body.z - G.player.body.z) ? c : a, null);
    const a = thiefInput(G.player.body, ai, lead.body, G.all.map(o => o.body), W.t, 1 / 120);
    KEYS.ArrowUp = a.thr > 0; KEYS.ArrowDown = a.brk > 0;
    inp.steer = a.steer;
    // dirección directa: pisa readInput
    const orig = readInput; window.readInput = () => ({ thr: a.thr, brk: a.brk, steer: a.steer, hand: a.hand });
    simulate(1 / 120);
    window.readInput = orig;
    out.minDist = Math.min(out.minDist, lead ? Math.hypot(lead.body.x - G.player.body.x, lead.body.z - G.player.body.z) : 1e9);
    out.maxSpeed = Math.max(out.maxSpeed, G.player.body.f * 3.6);
  }
  out.time = +G.time.toFixed(1); out.bar = +G.bar.toFixed(2); out.mode = G.mode; out.hp = Math.round(G.player.body.hp);
  out.copsMoved = G.cops.map(c => Math.round(c.body.odo));
  return out;
});
console.log('ladrón:', JSON.stringify(r1));
check(r1.copsMoved.every(m => m > 100), 'los patrulleros persiguen');
check(r1.minDist < 60, `un patrullero llegó cerca (${Math.round(r1.minDist)} m)`);
await page.waitForTimeout(1500);
await shot('2-ladron');
await page.evaluate(() => { G.cam = 'cabina'; setCam(); });
await page.waitForTimeout(1200);
await shot('3-cabina');
await page.evaluate(() => { G.cam = 'afuera'; setCam(); });

// Misión de policía: el jugador maneja con la IA de patrullero; tiene que poder atraparlo.
await page.evaluate(() => { save.done.l1 = true; playMission('p1'); });
await page.waitForFunction(() => G.cfg && G.cfg.mission === 'p1' && G.mode === 'count', null, { timeout: 60000 }).catch(() => console.log('ERR', errors.join('\n')));
const r2 = await page.evaluate(() => {
  G.mode = 'play';
  const ai = newCop(G.player.body, 'chase', 'dificil');
  let minD = 1e9, close = 0;
  for (let i = 0; i < 120 * 110 && G.mode === 'play'; i++) {
    const dd = Math.hypot(G.thief.body.x - G.player.body.x, G.thief.body.z - G.player.body.z); minD = Math.min(minD, dd); if (dd < 12) close += 1 / 120;
    const a = copInput(G.player.body, ai, G.thief.body, G.all.map(o => o.body), W.t, 1 / 120);
    const orig = readInput; window.readInput = () => a;
    simulate(1 / 120);
    window.readInput = orig;
  }
  return { minD: Math.round(minD), close: +close.toFixed(1), thp: Math.round(G.thief.body.hp), mode: G.mode, why: G.endWhy, time: +G.time.toFixed(1), bar: +G.bar.toFixed(2), dist: Math.round(Math.hypot(G.thief.body.x - G.player.body.x, G.thief.body.z - G.player.body.z)), thiefOdo: Math.round(G.thief.body.odo) };
});
console.log('policía:', JSON.stringify(r2));
check(r2.thiefOdo > 200, 'el ladrón huye');
check(r2.mode === 'busted' && /atrapado/.test(r2.why), 'el patrullero (con IA) lo atrapa');
await page.waitForTimeout(1200);
await shot('4-policia');
await page.evaluate(() => { for (let i = 0; i < 400 && G.mode === 'busted'; i++) simulate(1 / 60); });
await page.waitForTimeout(1200);
await shot('5-resultado');
// noche
await page.evaluate(() => { startGame({ role: 'ladron', diff: 'normal', goal: 'escape', t: 120, time: 'noche', name: 'Prueba' }); showScreen('hud'); G.mode = 'play'; for (let i = 0; i < 300; i++) { KEYS.ArrowUp = true; simulate(1 / 60); } KEYS.ArrowUp = false; });
await page.waitForTimeout(1500);
await shot('6-noche');
// clima: tormenta de noche (gotas, calle mojada, menos agarre, relámpagos) y limpiaparabrisas en la cabina
const wx = await page.evaluate(() => {
  startGame({ role: 'ladron', diff: 'normal', goal: 'survive', t: 120, time: 'noche', weather: 'tormenta', name: 'Prueba clima' }); showScreen('hud'); G.mode = 'play';
  G.cam = 'cabina'; setCam();
  const rf = renderFrame, w0 = G.player.car.wipers[0].pv.rotation.z;
  let moved = false, spray = 0;
  window.renderFrame = () => {};
  for (let i = 0; i < 60 * 25; i++) { KEYS.ArrowUp = i < 400; step(1 / 60); if (Math.abs(G.player.car.wipers[0].pv.rotation.z - w0) > 0.2) moved = true; spray = Math.max(spray, FX.spray.length); }
  window.renderFrame = rf; KEYS.ArrowUp = false; G.cam = 'afuera'; setCam();
  return { drops: WX.rain.visible ? WX.rain.geometry.instanceCount : 0, wet: W.roadMeshes[0].material === WX.asphaltWet, grip: W.gripMul, strikes: WX.strikes, moved, spray };
});
console.log('clima:', JSON.stringify(wx));
check(wx.drops > 0 && wx.wet && wx.grip < 1, 'lluvia: gotas, calle mojada y menos agarre');
check(wx.strikes > 0, 'tormenta: relámpagos');
check(wx.moved, 'limpiaparabrisas en la cabina');
await page.waitForTimeout(1500);
await shot('6b-tormenta');
await page.evaluate(() => { act('menu'); });
await page.waitForTimeout(800);
await page.evaluate(() => { act('garage'); });
await page.waitForTimeout(1500);
await shot('7-garaje');
await page.evaluate(() => { act('missions'); });
await page.waitForTimeout(800);
await shot('8-misiones');
check(errors.length === 0, 'sin errores' + (errors.length ? ':\n' + errors.slice(0, 5).join('\n') : ''));
await browser.close(); server.close();
process.exit(fails ? 1 : 0);
