// Fotos del barrio desde varios lugares y horas (para revisar cómo se ve).
// Uso: node tests/vistas.mjs → tests/capturas/vista-*.png
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(new URL('..', import.meta.url).pathname), out = path.join(root, 'tests', 'capturas');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => { const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); }).listen(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto(`http://localhost:${server.address().port}/index.html`);
await page.waitForFunction(() => document.body.classList.contains('ready'));
await page.addStyleTag({ content: '.screen,#toast{display:none!important}' });
const VIEWS = [
  ['calle-dia', 'dia', [-132, 1.6, -205], [-135, 1.4, -150]],
  ['calle-tarde', 'tarde', [-212, 1.7, 132], [-160, 1.5, 136]],
  ['aereo', 'dia', [-60, 70, -260], [-20, 0, -100]],
  ['puente', 'tarde', [132, 2.2, -80], [135, 3, 0]],
  ['noche', 'noche', [-132, 1.8, 60], [-135, 1.5, 120]],
];
for (const [name, time, p, t] of VIEWS) {
  await page.evaluate(([time, p, t]) => {
    G.mode = 'pause'; setTimeOfDay(time);
    W.camera.position.set(...p); W.camera.lookAt(...t);
    W.sun.position.set(t[0] + W.sunDir.x * 150, W.sunDir.y * 150, t[2] + W.sunDir.z * 150); W.sun.target.position.set(t[0], 0, t[2]);
    W.sky.position.copy(W.camera.position); W.stars.position.copy(W.camera.position);
  }, [time, p, t]);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(out, `vista-${name}.png`) });
}
console.log(errors.length ? errors : 'sin errores');
await browser.close(); server.close();
