// Saca las imágenes del portal (portada, segunda imagen y fondo grande) sin la interfaz.
// Uso: node tools/portadas.mjs  → tests/capturas/portada-*.png (después se pasan a webp)
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
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(120000);
await page.goto(`http://localhost:${server.address().port}/index.html`);
await page.waitForFunction(() => document.body.classList.contains('ready'));
await page.addStyleTag({ content: '.screen,#toast,#count,.warn{display:none!important}' });
// Coloca el carro en un tramo con abismo y fija la cámara.
const pose = (lvId, cam, fr) => page.evaluate(([lvId, cam, fr]) => {
  const L = LEVELS.find(l => l.id === lvId);
  startRun(L); G.mode = 'drive';
  const T = G.T;
  const run = T.runs.find(r => r.s > 120 && (r.ty === 'L' || r.ty === 'R' || r.ty === 'B') && r.len > 120) || T.runs[2];
  const s = run.s + 50, p = roadPoint(T, s, 0.6);
  Object.assign(G.C, { x: p.x, z: p.z, y: p.y, h: p.h, s, i: s, f: 22, steer: 0.15 });
  inp.steer = 0.15;
  G.cam = cam === 'cabina' ? 'cabina' : 'afuera'; setCam();
  G.mode = 'pause';
  poseCar(G.car, G.C, 0); poseCockpit(G.car, G.C);
  if (cam !== 'cabina') {
    const side = run.ty === 'L' ? -1 : 1;
    const q = roadPoint(T, s + fr[0], side * fr[1]);
    W.camera.position.set(q.x, p.y + fr[2], q.z);
    W.camera.lookAt(G.C.x, G.C.y + 0.8, G.C.z);
  } else { G.C.f = 24; G.C.rpm = 4200; poseCockpit(G.car, G.C); }
  updateWorld(G.t, 0.016);
  W.sun.position.set(G.C.x + W.sunDir.x * 120, G.C.y + W.sunDir.y * 120, G.C.z + W.sunDir.z * 120);
  W.sun.target.position.set(G.C.x, G.C.y, G.C.z);
  W.sky.position.copy(W.camera.getWorldPosition(new THREE.Vector3()));
  W.renderer.render(W.scene, W.camera);
}, [lvId, cam, fr]);
const snap = async (name, w, h) => { await page.setViewportSize({ width: w, height: h }); await page.evaluate(() => { resizeWorld(); }); };
await snap('', 1280, 800);
await pose(1, 'afuera', [9, 5.5, 3.2]);
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(out, 'portada-cover.png') });
await pose(3, 'cabina', [0, 0, 0]);
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(out, 'portada-alt.png') });
await snap('', 1325, 700);
await pose(8, 'afuera', [11, 7, 2.6]);
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(out, 'portada-hero.png') });
await browser.close(); server.close();
console.log('listo');
