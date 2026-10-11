// El aviso de frenada es exacto: un "piloto" que va a fondo y sólo frena (a fondo, hasta la
// velocidad de la curva) cuando sale el único aviso "FRENA", tiene que llegar a cada curva a
// la velocidad justa y terminar la montaña sin choques fuertes.
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
    const C = G.C, T = G.T, dt = 1 / 120;
    // espía del aviso: sólo se sabe que hay que frenar cuando sale "FRENA"
    let cue = null, cues = 0;
    const orig = showCue;
    window.showCue = (n, brake) => { if (brake) { cue = n; cues++; } orig(n, brake); };
    const res = [];
    let mark = null, hold = null;
    for (let i = 0; i < 120 * 400 && G.mode === 'drive'; i++) {
      document.body.classList.add('driving');
      paceNote();
      const n = T.notes[G.noteIdx];
      const a = aiInput(C, T, G.prof);
      if (n && mark !== G.noteIdx && C.s >= n.sm && n.sm > n.s - 6) { mark = G.noteIdx; if (n.lvl >= 4) res.push({ lvl: n.lvl, vc: Math.round(n.vc * 3.6), v: Math.round(C.f * 3.6) }); }
      let thr = 1, brk = 0;
      if (cue) { if (C.f > cue.vc + 0.3) { brk = 1; thr = 0; } else { hold = cue; cue = null; } }
      if (!cue && hold) { if (C.s > hold.sx) hold = null; else thr = C.f < hold.vc - 0.3 ? 1 : 0; }
      inp.steer += Math.max(-dt * 5, Math.min(dt * 5, a.steer - inp.steer));
      inp.brk = brk; inp.thr = thr;
      stepCar(C, { thr, brk, steer: inp.steer }, T, G.st, dt, onCarEvent);
      C.steer = inp.steer;
      if (C.s >= T.n - 45) { G.mode = 'finish'; break; }
    }
    window.showCue = orig;
    return { mode: G.mode, res, hits: C.hits, cues, s: Math.round(C.s), n: T.n };
  }, id);
  const errs = r.res.map(x => x.v - x.vc);
  const worst = Math.max(...errs.map(Math.abs));
  const ok = r.mode === 'finish' && worst <= 12;
  if (!ok) fails++;
  console.log(`${ok ? 'ok   ' : 'FALLA'} montaña ${id}: ${r.mode} ${r.s}/${r.n}, ${r.cues} avisos de FRENA, ${r.res.length} curvas cerradas, diferencia con la velocidad justa: ${errs.join(' ')} km/h (peor ${worst}), choques ${r.hits}`);
}
console.log(errors.length ? 'ERRORES ' + errors.join(' | ') : 'sin errores');
await browser.close(); server.close();
process.exit(fails || errors.length ? 1 : 0);
