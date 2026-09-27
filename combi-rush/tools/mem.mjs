// Mide geometrías y texturas en GPU mientras avanza un viaje largo (detecta fugas).
import { chromium } from 'playwright';
const file = 'file://' + new URL('../combi-rush.html', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--ignore-certificate-errors', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 800, height: 450 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(file); await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 30000 });
const ti = +(process.argv[2] || 6);
const out = await p.evaluate(async (ti) => {
  const C = window.__combi; C.save.tutDone = true; C.startRun({ mode: 'viaje', ti }); const g = C.G; g.countdown = 0;
  const rows = [];
  for (let k = 0; k < 14; k++) {
    for (let i = 0; i < 6; i++) { g.p.wy = Math.min(g.R.length - 50, g.p.wy + 280); g.p.v = 300; g.p.dmg = 100; C.step(2); C.render(); await new Promise(r => requestAnimationFrame(r)); }
    const r = window.__renderer ? window.__renderer.info : null;
    rows.push([Math.round(g.p.wy), window.__info.calls, window.__mem ? window.__mem.geometries : -1, window.__mem ? window.__mem.textures : -1]);
  }
  return rows;
}, ti);
console.log('wy calls geos texs'); for (const r of out) console.log(r.join('\t'));
console.log(errs.length ? errs.join('\n') : 'sin errores');
await b.close();
