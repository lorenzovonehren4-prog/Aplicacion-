// Foto de todos los modelos de carro (y el patrullero) en fila, para revisar cómo se ven.
// Uso: node tests/carros.mjs → tests/capturas/carros.png
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(new URL('..', import.meta.url).pathname), out = path.join(root, 'tests', 'capturas');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => { const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); }).listen(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 700 } });
const errors = []; page.on('pageerror', e => { errors.push(e.message); console.log('ERR', e.message, (e.stack || '').split('\n').slice(0, 4).join(' | ')); });
await page.goto(`http://localhost:${server.address().port}/index.html`);
await page.waitForFunction(() => document.body.classList.contains('ready'));
await page.addStyleTag({ content: '.screen,#toast{display:none!important}' });
const list = '[...CARS.map(c => [c, false]), [carById("muscle"), true], [{ body: "van", color: 0xe8e8e8 }, false]]';
for (const [view, part] of [['frente', 0], ['frente', 1], ['atras', 0]]) {
  await page.evaluate(([view, part, list]) => {
    clearGame(); G.mode = 'pause'; G.thief = null; setTimeOfDay('dia');
    const all = eval(list).slice(part * 4, part * 4 + 4);
    const z0 = -135 + 3, x0 = -100;
    all.forEach(([spec, pol], i) => { const a = spawnActor(spec, x0 + i * 6, z0, view === 'frente' ? Math.PI - 0.6 : -0.6, { police: pol }); a.car.sirenOn = pol; G.all.push(a); poseCar(a.car, a.body, 0, 0.1); });
    W.camera.position.set(x0 + 9, 2.4, z0 - 9.5); W.camera.lookAt(x0 + 9, 0.7, z0);
    W.sun.position.set(x0 + 9 + W.sunDir.x * 150, W.sunDir.y * 150, z0 + W.sunDir.z * 150); W.sun.target.position.set(x0 + 9, 0, z0);
    W.sky.position.copy(W.camera.position);
  }, [view, part, list]);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(out, `carros-${view}${part}.png`) });
}
console.log(errors.length ? errors : 'sin errores');
await browser.close(); server.close();
