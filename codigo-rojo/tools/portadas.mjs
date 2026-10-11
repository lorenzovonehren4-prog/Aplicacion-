// Imágenes del portal: una persecución de tarde (portada), una de noche (segunda imagen)
// y una toma ancha (fondo grande), sin la interfaz.
// Uso: node tools/portadas.mjs → tests/capturas/portada-*.png (después se pasan a webp)
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
page.setDefaultTimeout(200000);
await page.goto(`http://localhost:${server.address().port}/index.html`);
await page.waitForFunction(() => document.body.classList.contains('ready'));
await page.addStyleTag({ content: '.screen,#toast,#count,#big{display:none!important}' });
// arma la escena a mano: el ladrón adelante y dos patrulleros pegados atrás
const pose = (time, view) => page.evaluate(([time, view]) => {
  startAttract(); setTimeOfDay(time);
  for (let i = 0; i < 60 * 3; i++) attractStep(1 / 60);
  G.mode = 'pause';
  const place = (a, x, z, h, steer) => { Object.assign(a.body, { x, z, h, y: groundH(x, z), steer, f: 30, roll: steer * 0.05 }); };
  const z0 = -135 - LANE, x0 = -60;
  place(G.thief, x0, z0, Math.PI / 2, -0.1);
  place(G.cops[0], x0 - 8, z0 + 1.2, Math.PI / 2 + 0.06, 0.2);
  place(G.cops[1], x0 - 15, z0 - 1.6, Math.PI / 2 - 0.05, -0.1);
  for (const a of G.traffic) if (Math.hypot(a.body.x - x0, a.body.z - z0) < 60) { a.body.x += 200; }
  for (const a of G.all) { a.car.sirenOn = a.car.police; poseCar(a.car, a.body, 0, 0.13); }
  const T = G.thief.body, fx = Math.sin(T.h), fz = Math.cos(T.h);
  const cam = W.camera;
  if (view === 'front') cam.position.set(T.x + fx * 8 - fz * 2.5, T.y + 1.2, T.z + fz * 8 + fx * 2.5);
  else cam.position.set(T.x + fx * 16 + fz * 10, T.y + 8, T.z + fz * 16 - fx * 10);
  cam.lookAt(T.x - fx * 6, T.y + 0.9, T.z - fz * 6);
  W.sun.position.set(T.x + W.sunDir.x * 150, W.sunDir.y * 150, T.z + W.sunDir.z * 150); W.sun.target.position.set(T.x, 0, T.z);
  W.sky.position.copy(cam.position); W.stars.position.copy(cam.position);
  if (time === 'noche') { G.copLights = G.copLights || []; for (let i = 0; i < 2; i++) { const l = new THREE.PointLight(i ? 0x2050ff : 0xff2030, 60, 30, 1.4); const c = G.cops[i].body; l.position.set(c.x, 2.5, c.z); W.scene.add(l); G.copLights.push(l); } }
  updateWorld(G.t, 0.016);
  W.renderer.render(W.scene, cam);
}, [time, view]);
await pose('tarde', 'front');
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(out, 'portada-cover.png') });
await pose('noche', 'front');
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(out, 'portada-alt.png') });
await page.setViewportSize({ width: 1325, height: 700 });
await page.evaluate(() => resizeWorld());
await pose('dia', 'wide');
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(out, 'portada-hero.png') });
await browser.close(); server.close();
console.log('listo');
