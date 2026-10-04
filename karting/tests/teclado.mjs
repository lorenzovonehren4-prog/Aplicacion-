// Comprueba los controles de teclado: acelerar, girar, derrapar con freno de mano y reubicar.
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
const check = (c, m) => { if (!c) errors.push('FALLA: ' + m); else console.log('ok -', m); };
await page.goto(`http://localhost:${server.address().port}/index.html`);
await page.waitForFunction(() => document.body.classList.contains('ready'));
await page.screenshot({ path: 'tests/capturas/menu.png' });
await page.keyboard.press('Enter'); // botón enfocado: carrera rápida
await page.waitForSelector('#tracks.on');
await page.click('#btnGo');
await page.waitForFunction(() => R.on && UI.screen === 'hud', null, { timeout: 120000 });
await page.evaluate(() => { while (R.state === 'countdown') updateRace(1 / 120, INPUT); });
// simulamos a mano para no depender de la velocidad del navegador sin GPU
const step = (sec, keys) => page.evaluate(([sec, keys]) => {
  KEYS.clear(); keys.forEach(k => KEYS.add(k));
  let slip = 0;
  for (let t = 0; t < sec; t += 1 / 120) { updateInput(1 / 120); updateRace(1 / 120, INPUT); slip = Math.max(slip, R.player.p.slip); }
  const p = R.player.p; return { v: p.fwd, h: p.h, slip, idx: R.player.idx, dist: R.player.dist };
}, [sec, keys]);
const a = await step(2.5, ['KeyW']);
check(a.v > 12, 'acelera con W: ' + a.v.toFixed(1) + ' m/s');
const b = await step(0.6, ['KeyW', 'KeyD']);
check(b.h < a.h - 0.2, 'D gira a la derecha (rumbo ' + a.h.toFixed(2) + ' → ' + b.h.toFixed(2) + ')');
const c = await step(0.6, ['KeyW', 'KeyD', 'Space']);
check(c.slip > 2, 'freno de mano derrapa: ' + c.slip.toFixed(1) + ' m/s de lado');
const d = await step(1.5, ['KeyS']);
check(d.v < c.v, 'S frena');
await page.evaluate(() => { const p = R.player.p; p.h += 2; });
await page.keyboard.press('KeyR');
const e = await page.evaluate(() => { const T = R.T, i = R.player.idx; return Math.abs(Math.atan2(Math.sin(R.player.p.h - Math.atan2(T.tx[i], T.tz[i])), Math.cos(R.player.p.h - Math.atan2(T.tx[i], T.tz[i])))); });
check(e < 0.01, 'R endereza el kart en la pista');
await page.keyboard.press('KeyC');
check(await page.evaluate(() => UI.camMode) !== 0, 'C cambia la cámara');
await page.keyboard.press('KeyC'); await page.keyboard.press('KeyC');
await step(3, ['KeyW']);
await page.waitForTimeout(400);
console.log('cam', await page.evaluate(() => [UI.camMode, save.opt.cam])); await page.screenshot({ path: 'tests/capturas/teclado.png' });
await page.evaluate(() => goTitle());
await page.click('[data-act=garage]'); await page.waitForTimeout(400);
await page.screenshot({ path: 'tests/capturas/garaje.png' });
// sensación de la dirección medida en una pista enorme de prueba (sin barreras cerca)
const feel = await page.evaluate(() => {
  const T = buildTrackData({ id: 'x', width: 300, pts: [[0, 0], [800, 0], [800, 800], [0, 800]] });
  const run = (tapSec, holdSec, throttle) => {
    const p = newPhys(T.px[0], T.pz[0], Math.atan2(T.tx[0], T.tz[0])); p.vx = Math.sin(p.h) * 22; p.vz = Math.cos(p.h) * 22;
    let idx = 0, ks = 0; const h0 = p.h; let maxLat = 0;
    for (let t = 0; t < 2.5; t += 1 / 120) {
      const press = t < tapSec || t < holdSec;
      const target = press ? 1 : 0, rate = target === 0 ? 6.5 : 2.8;
      ks += Math.max(-rate / 120, Math.min(rate / 120, target - ks));
      idx = stepPhys(p, { throttle, brake: 0, steer: ks, handbrake: false }, 1 / 120, T, idx).idx;
      maxLat = Math.max(maxLat, Math.abs(p.yaw * p.fwd));
    }
    return { giro: +((h0 - p.h) * 180 / Math.PI).toFixed(1), v: +(p.fwd * 3.6).toFixed(0), aLat: +maxLat.toFixed(1) };
  };
  const toque = run(0.1, 0, 1), recta = run(0, 2.5, 0);
  T.curveF.fill(1); // como si viniera una curva cerrada
  return { toque, recta, curva: run(0, 2.5, 0) };
});
const wall = await page.evaluate(() => {
  const T = R.T, i = 40, p = newPhys(T.px[i] + T.nx[i] * (T.hw - 1), T.pz[i] + T.nz[i] * (T.hw - 1), Math.atan2(T.tx[i], T.tz[i]) - 0.35);
  p.vx = Math.sin(p.h) * 20; p.vz = Math.cos(p.h) * 20;
  let idx = i, hits = 0;
  for (let t = 0; t < 0.8; t += 1 / 120) { const r = stepPhys(p, { throttle: 1, brake: 0, steer: 0, handbrake: false }, 1 / 120, T, idx); idx = r.idx; if (r.hit) hits++; }
  return { v: p.speed, hits };
});
check(wall.hits > 0 && wall.v > 15, 'rozar la pared a 72 km/h no arruina la carrera (sigue a ' + (wall.v * 3.6).toFixed(0) + ' km/h)');
console.log('dirección a 80 km/h →', JSON.stringify(feel));
check(feel.toque.giro < 4, 'un toque en recta gira poco (' + feel.toque.giro + '°)');
check(feel.recta.aLat < 14, 'en recta, aun sosteniendo, la dirección es suave (' + feel.recta.aLat + ' m/s²)');
check(feel.curva.aLat > 22, 'en curva se gira con más agarre (' + feel.curva.aLat + ' m/s²)');
console.log(errors.length ? 'ERRORES:\n' + errors.join('\n') : 'sin errores');
await browser.close(); server.close();
process.exit(errors.length ? 1 : 0);
