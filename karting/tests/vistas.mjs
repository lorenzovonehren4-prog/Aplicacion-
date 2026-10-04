// Fotos de cada pista desde puntos interesantes (largada, segundo piso, túnel).
// Uso: node tests/vistas.mjs [t1 t2 ...]   → tests/capturas/vista-<pista>-<lugar>.png
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const out = path.join(root, 'tests', 'capturas'); fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(`http://localhost:${server.address().port}/index.html`);
await page.waitForFunction(() => document.body.classList.contains('ready'));
const ids = process.argv.slice(2).filter(a => /^t\d$/.test(a));
for (const id of ids.length ? ids : ['t1', 't2', 't3', 't4']) {
  await page.evaluate(id => { if (R.on) endRace(); UI.sel.track = id; UI.mode = 'quick'; go(); }, id);
  await page.waitForFunction(() => R.on && UI.screen === 'hud' && document.body.classList.contains('ready'));
  const spots = await page.evaluate(() => {
    const T = R.T, s = [['largada', -1]];
    let hi = 0; for (let i = 0; i < T.N; i++) if (T.py[i] > T.py[hi]) hi = i;
    if (T.py[hi] > 2.8) s.push(['segundo-piso', (hi - 25 + T.N) % T.N]);
    const t = T.tunnel.indexOf(1); if (t >= 0) s.push(['tunel', (t + 12) % T.N], ['entrada-tunel', (t - 22 + T.N) % T.N]);
    return s;
  });
  for (const [name, i] of spots) {
    await page.evaluate(i => {
      R.state = 'race'; R.t = 5;
      const k = R.player, T = R.T;
      if (i >= 0) { k.idx = i; k.p.x = T.px[i] + T.nx[i] * T.lineOff[i]; k.p.z = T.pz[i] + T.nz[i] * T.lineOff[i]; k.p.h = Math.atan2(T.tx[i], T.tz[i]); k.p.y = T.py[i]; k.p.vx = Math.sin(k.p.h) * 15; k.p.vz = Math.cos(k.p.h) * 15; }
      CAM.snap = true;
    }, i);
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(out, `vista-${id}-${name}.png`) });
  }
  console.log(id, spots.map(s => s[0]).join(', '));
}
console.log(errors.length ? 'ERRORES:\n' + errors.join('\n') : 'sin errores');
await browser.close(); server.close();
process.exit(errors.length ? 1 : 0);
