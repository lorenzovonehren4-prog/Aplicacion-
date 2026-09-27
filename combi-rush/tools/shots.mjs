// Capturas del juego en varias escenas para revisar la calidad visual.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const OUT = process.argv[2] || 'shots';
mkdirSync(OUT, { recursive: true });
const file = 'file://' + new URL('../combi-rush.html', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--ignore-certificate-errors', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = [];
async function scene(name, vw, vh, setup) {
  const p = await b.newPage({ viewport: { width: vw, height: vh } });
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(name + ' console: ' + m.text()); });
  await p.goto(file); await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 30000 });
  await p.waitForTimeout(800);
  if (setup) await p.evaluate(setup);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/${name}.png` });
  await p.close();
}
const trip = (ti, amb, adv) => `(() => { const C = window.__combi; C.save.tutDone = true; C.startRun({ mode: 'viaje', ti: ${ti}${amb ? `, amb: '${amb}'` : ''} }); const g = C.G; g.countdown = 0; g.p.v = 300; C.step(${adv || 200}); C.snap(); })()`;
const only = process.argv[3];
const list = {
  menu: [1280, 720, null],
  viaje0: [1280, 720, trip(0)],
  garua: [1280, 720, trip(3, null, 400)],
  atardecer: [1280, 720, trip(7, null, 300)],
  puente: [1280, 720, `(() => { const C = window.__combi; C.startRun({ mode: 'viaje', ti: 2 }); const g = C.G; g.countdown = 0; const z = g.zones.find(z => z.t === 'puente'); g.p.wy = z.s0 - 300; g.p.v = 250; C.step(5); C.snap(); })()`],
  curva: [1280, 720, `(() => { const C = window.__combi; C.startRun({ mode: 'viaje', ti: 0 }); const g = C.G; g.countdown = 0; const t = g.path.turns[0]; g.p.wy = t.s0 - 350; g.p.v = 200; C.step(3); C.snap(); })()`],
  movil: [390, 844, trip(1)],
  costa: [1280, 720, `(() => { const C = window.__combi; C.startRun({ mode: 'viaje', ti: 8 }); const g = C.G; g.countdown = 0; const z = g.zones.find(z => z.t === 'costa'); g.p.wy = z.s0 + 1600; g.p.v = 300; C.step(5); C.snap(); })()`],
  costa2: [1280, 720, `(() => { const C = window.__combi; C.startRun({ mode: 'viaje', ti: 8 }); const g = C.G; g.countdown = 0; const z = g.zones.find(z => z.t === 'costa'); g.p.wy = z.s0 + 5600; g.p.x = 380; g.p.v = 300; C.step(5); C.snap(); })()`],
  noche12: [1280, 720, trip(11, null, 300)],
  pausa: [1280, 720, `(() => { const C = window.__combi; C.startRun({ mode: 'viaje', ti: 8 }); const g = C.G; g.countdown = 0; g.p.wy = 9000; g.p.v = 200; C.step(3); document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' })); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' })); })()`],
  pausamovil: [390, 844, `(() => { const C = window.__combi; C.startRun({ mode: 'viaje', ti: 11 }); const g = C.G; g.countdown = 0; g.p.wy = 9000; g.p.v = 200; C.step(3); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' })); })()`],
  viajes: [1280, 720, `(() => { const C = window.__combi; C.save.tripUnlocked = 12; C.save.tutDone = true; C.show('modos'); })()`],
  viajesmovil: [390, 844, `(() => { const C = window.__combi; C.save.tripUnlocked = 12; C.save.tutDone = true; C.show('modos'); })()`],
  banner: [1280, 720, `(() => { const C = window.__combi; C.save.tutDone = true; C.startRun({ mode: 'viaje', ti: 11 }); })()`],
  banner2: [1280, 720, `(() => { const C = window.__combi; C.save.tutDone = true; C.startRun({ mode: 'viaje', ti: 0 }); return new Promise(r => setTimeout(r, 2200)); })()`],
  noche: [1280, 720, trip(1, 'noche', 250)],
  nochegarua: [1280, 720, trip(3, 'noche', 350)],
};
for (const [k, [w, h, s]] of Object.entries(list)) if (!only || only.split(',').includes(k)) await scene(k, w, h, s);
await b.close();
console.log(errs.length ? errs.join('\n') : 'sin errores');
