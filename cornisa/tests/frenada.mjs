// El aviso de frenada es exacto: un "piloto" que va a fondo y sólo frena cuando el copiloto
// dice "¡FRENA YA!" (y suelta cuando dice "¡Dobla!") tiene que llegar a cada curva a la
// velocidad justa y terminar la montaña sin choques fuertes.
// Uso: node tests/frenada.mjs [ids…]
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
const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
page.setDefaultTimeout(300000);
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(`http://localhost:${server.address().port}/index.html`);
await page.waitForFunction(() => document.body.classList.contains('ready'));
let fails = 0;
const ids = process.argv.slice(2).map(Number);
for (const id of ids.length ? ids : [1, 3, 6, 8]) {
  const r = await page.evaluate(id => {
    save.upg = { motor: 2, frenos: 1, llantas: 1, chasis: 0 };
    startRun(LEVELS.find(l => l.id === id)); G.mode = 'drive'; G.T.rocks = [];
    const el = document.getElementById('note'), C = G.C, T = G.T, dt = 1 / 120;
    const res = [];
    let mark = null;
    for (let i = 0; i < 120 * 400 && G.mode === 'drive'; i++) {
      document.body.classList.add('driving');
      paceNote();
      const n = T.notes[G.noteIdx];
      const txt = document.getElementById('noteDist').textContent;
      const ya = el.classList.contains('on') && el.classList.contains('brake');
      const a = aiInput(C, T, G.prof);
      // al pasar el punto más lento de la curva, anota la velocidad
      if (n && mark !== G.noteIdx && C.s >= n.sm && n.sm > n.s - 6) { mark = G.noteIdx; if (n.vc < C.f + 30 && n.lvl >= 4) res.push({ lvl: n.lvl, vc: Math.round(n.vc * 3.6), v: Math.round(C.f * 3.6) }); }
      const brk = ya ? 1 : 0;
      const on = el.classList.contains('on');
      const thr = brk ? 0 : on && txt.startsWith('Suelta') ? 0 : on && txt.startsWith('¡Dobla') ? (C.f < G.prof[Math.min(T.n - 1, Math.round(C.s) + 3)] - 0.5 ? 1 : 0) : 1;
      inp.steer += Math.max(-dt * 5, Math.min(dt * 5, a.steer - inp.steer));
      inp.brk = brk; inp.thr = thr;
      stepCar(C, { thr, brk, steer: inp.steer }, T, G.st, dt, onCarEvent);
      C.steer = inp.steer;
      if (C.s >= T.n - 45) { G.mode = 'finish'; break; }
    }
    const nn = T.notes[G.noteIdx]; return { dbg: { d: +C.d.toFixed(2), hw: T.hw, slide: +C.slide.toFixed(2), steer: +inp.steer.toFixed(2), lvl: nn && nn.lvl, R: nn && T.curves[G.noteIdx].R.toFixed(0), lo: +T.lo[Math.round(C.s)].toFixed(2) }, mode: G.mode, res, hits: C.hits, s: Math.round(C.s), n: T.n, v: Math.round(C.f * 3.6), txt: document.getElementById('noteDist').textContent, on: el.className };
  }, id);
  const errs = r.res.map(x => x.v - x.vc);
  const worst = Math.max(...errs.map(Math.abs));
  const ok = r.mode === 'finish' && worst <= 12;
  if (!ok) fails++;
  console.log(`${ok ? 'ok   ' : 'FALLA'} montaña ${id}: ${r.mode} ${r.s}/${r.n} ${r.v}km/h ${r.txt} ${r.on}, ${r.res.length} curvas cerradas, diferencia con la velocidad justa: ${errs.join(' ')} km/h (peor ${worst}), choques ${r.hits} ${JSON.stringify(r.dbg)}`);
}
console.log(errors.length ? 'ERRORES ' + errors.join(' | ') : 'sin errores');
await browser.close(); server.close();
process.exit(fails || errors.length ? 1 : 0);
