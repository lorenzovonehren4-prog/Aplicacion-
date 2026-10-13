// Fotos de los modelos de carro de cerca (de frente, de costado y de atrás) en un fondo neutro.
// Uso: node tests/carros.mjs → tests/capturas/carros-*.png
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(new URL('..', import.meta.url).pathname), out = path.join(root, 'tests', 'capturas');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => { const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); }).listen(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 560 } });
const errors = []; page.on('pageerror', e => { errors.push(e.message); console.log('ERR', e.message, (e.stack || '').split('\n').slice(0, 4).join(' | ')); });
await page.goto(`http://localhost:${server.address().port}/index.html`);
await page.waitForFunction(() => document.body.classList.contains('ready'));
await page.addStyleTag({ content: '.screen,#toast{display:none!important}' });
const list = process.argv[2] ? process.argv[2].split(',') : ['compacto', 'sedan', 'pickup', 'muscle', 'deportivo', 'super', 'policia', 'van'];
for (const id of list) for (const [view, ang, dist, h] of [['tq', 0.75, 5.6, 1.6], ['lado', Math.PI / 2, 6.5, 1.0], ['atras', Math.PI + 0.6, 5.6, 1.6]]) {
  await page.evaluate(([id, ang, dist, h]) => {
    G.mode = 'pause'; G.thief = null; G.player = null; G.garage = true;
    if (window._car) W.scene.remove(window._car.root);
    const spec = id === 'policia' ? carById('muscle') : id === 'van' ? { body: 'van', color: 0xe8e8e8 } : carById(id);
    const c = makeCar(spec, { police: id === 'policia' }); c.sirenOn = id === 'policia';
    const x = -135 + 3, z = -170;
    c.root.position.set(x, 0, z); W.scene.add(c.root); window._car = c;
    setTimeOfDay('dia');
    W.camera.position.set(x + Math.sin(ang) * dist, h, z + Math.cos(ang) * dist); W.camera.lookAt(x, 0.65, z);
    W.sun.position.set(x + W.sunDir.x * 150, W.sunDir.y * 150, z + W.sunDir.z * 150); W.sun.target.position.set(x, 0, z);
    W.sky.position.copy(W.camera.position);
  }, [id, ang, dist, h]);
  await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
  await page.evaluate(() => { G.mode = 'pause'; renderFrame(W.scene, W.camera); });
  await page.screenshot({ path: path.join(out, `carros-${id}-${view}.png`) });
}
console.log(errors.length ? errors : 'sin errores');
await browser.close(); server.close();
