// Capturas de los efectos: aviso "FRENA", choque con fuego y explosión, caída que explota
// al fondo y fuegos artificiales en la meta.  Uso: node tests/efectos.mjs → tests/capturas/fx-*.png
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(new URL('..', import.meta.url).pathname), out = path.join(root, 'tests', 'capturas');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => { const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); }).listen(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 620 } });
page.setDefaultTimeout(200000);
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto(`http://localhost:${server.address().port}/index.html`);
await page.waitForFunction(() => document.body.classList.contains('ready'));
const shot = n => page.screenshot({ path: path.join(out, `fx-${n}.png`) });
// 1) aviso FRENA: llegar rápido a una curva cerrada
await page.evaluate(() => {
  startRun(LEVELS[1]); G.mode = 'drive'; G.cam = 'cabina'; setCam();
  const T = G.T, n = T.notes.find(m => m.lvl >= 4 && m.s > 200);
  const s = n.s - 160, p = roadPoint(T, s, T.lo[s]);
  Object.assign(G.C, { x: T.lx[s], z: T.lz[s], h: p.h, vx: Math.sin(p.h) * 40, vz: Math.cos(p.h) * 40, s, i: s, f: 40 });
  for (let i = 0; i < 400 && !document.getElementById('cue').classList.contains('brake'); i++) { stepCar(G.C, { thr: 1, brk: 0, steer: 0 }, T, G.st, 1 / 120, onCarEvent); G.C.h = T.h[Math.round(G.C.s)]; paceNote(); }
  G.mode = 'pause';
  clearTimeout(showCue.t);   // que el aviso se quede para la foto
  return document.getElementById('cue').className + ' ' + document.getElementById('cueTxt').textContent;
}).then(r => console.log('aviso:', r));
await page.waitForTimeout(700); await shot('1-frena');
// 2) choque fuerte: fuego y explosión
await page.evaluate(() => {
  startRun(LEVELS[0]); G.mode = 'drive'; G.cam = 'afuera'; setCam();
  const T = G.T, run = T.runs.find(r => r.ty === 'C' && r.s > 50) || T.runs[0];
  const s = run.s + 30, p = roadPoint(T, s, 0), h = p.h + 0.5;
  Object.assign(G.C, { x: p.x, z: p.z, h, vx: Math.sin(h) * 44, vz: Math.cos(h) * 44, s, i: s });
  for (let i = 0; i < 240 && G.mode === 'drive'; i++) stepCar(G.C, { thr: 1, brk: 0, steer: 0 }, T, G.st, 1 / 120, onCarEvent);
});
await page.waitForTimeout(600);
await page.evaluate(() => { for (let i = 0; i < 70; i++) { simulate(1 / 30); updateWorld(G.t += 1 / 30, 1 / 30); } });
await page.waitForTimeout(1300); await shot('2-choque');
await page.evaluate(() => { for (let i = 0; i < 60; i++) { simulate(1 / 30); updateWorld(G.t += 1 / 30, 1 / 30); } });
await page.waitForTimeout(1000); await shot('3-choque-fuego');
// 3) caída que explota al fondo
await page.evaluate(() => {
  startRun(LEVELS[1]); G.mode = 'drive';
  const T = G.T, r = T.runs.find(x => x.ty === 'L' || x.ty === 'R'), side = r.ty === 'L' ? -1 : 1;
  T.gL.fill(0); T.gR.fill(0);
  const s = r.s + 40, p = roadPoint(T, s, 0), h = p.h - side * 0.5;
  Object.assign(G.C, { x: p.x, z: p.z, h, vx: Math.sin(h) * 20, vz: Math.cos(h) * 20, s, i: s });
  for (let i = 0; i < 240 && G.mode === 'drive'; i++) stepCar(G.C, { thr: 1, brk: 0, steer: 0 }, T, G.st, 1 / 120, onCarEvent);
  for (let i = 0; i < 400 && !G.boom; i++) { simulate(1 / 60); }
  for (let i = 0; i < 8; i++) updateWorld(G.t += 1 / 30, 1 / 30);
});
await page.waitForTimeout(1300); await shot('4-caida-explota');
// 4) meta con fuegos artificiales
await page.evaluate(() => {
  startRun(LEVELS[0]); G.mode = 'drive';
  const T = G.T, s = T.n - 47, p = roadPoint(T, s, 0);
  Object.assign(G.C, { x: p.x, z: p.z, h: p.h, vx: Math.sin(p.h) * 20, vz: Math.cos(p.h) * 20, s, i: s });
  for (let i = 0; i < 60; i++) simulate(1 / 60);
  for (let i = 0; i < 70; i++) { simulate(1 / 60); updateWorld(G.t += 1 / 60, 1 / 60); }
});
await page.waitForTimeout(1300); await shot('5-meta');
console.log(errors.length ? errors : 'sin errores');
await browser.close(); server.close();
