// Prueba de humo: arranca cada viaje, clima y modo, avanza la simulación y dibuja; falla si hay errores.
import { chromium } from 'playwright';
const file = 'file://' + new URL('../combi-rush.html', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--ignore-certificate-errors', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(file); await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 30000 });
const res = await p.evaluate(async () => {
  const C = window.__combi, out = [];
  C.save.tutDone = true; C.save.tripUnlocked = 99;
  const cfgs = [];
  for (let ti = 0; ti < 12; ti++) cfgs.push({ mode: 'viaje', ti });
  for (const amb of ['dia', 'garua', 'atardecer', 'noche']) cfgs.push({ mode: 'viaje', ti: 5, amb });
  for (const mode of ['duelo', 'fiebre', 'contrarreloj', 'infinito']) cfgs.push({ mode, amb: 'noche', mods: [] });
  for (let ri = 0; ri < 3; ri++) cfgs.push({ mode: 'ruta', ri });
  cfgs.push({ mode: 'viaje', trip: null, random: true });
  for (const cfg of cfgs) {
    try {
      C.startRun(cfg); const g = C.G; g.countdown = 0;
      const L = Math.min(g.R.length, 60000);
      for (let k = 0; k < 24; k++) { g.p.wy = Math.min(L - 30, g.p.wy + L / 26); g.p.v = 280; g.p.dmg = 100; if (g.timeLeft != null) g.timeLeft = 999; C.step(3); C.snap(); C.render(); }
      C.show('pausa'); C.show('play');
      out.push([JSON.stringify(cfg), 'ok', window.__info.calls]);
    } catch (e) { out.push([JSON.stringify(cfg), 'ERROR ' + e.message]); }
  }
  C.show('modos'); C.show('records'); C.show('menu');
  return out;
});
for (const r of res) console.log(r.join('  '));
console.log(errs.length ? 'ERRORES:\n' + errs.join('\n') : 'sin errores de página');
await b.close();
process.exit(errs.length || res.some(r => r[1] !== 'ok') ? 1 : 0);
