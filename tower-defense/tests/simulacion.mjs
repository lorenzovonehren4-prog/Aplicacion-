/* Simulación sin interfaz: juega las 20 oleadas de los 3 mapas con las 21
 * torres a nivel máximo y comprueba que se gana sin errores.
 * Uso: node tower-defense/tests/simulacion.mjs */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')); }

const dir = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(pathToFileURL(path.join(dir, 'nucleo.html')).href);

const results = await page.evaluate(() => {
  TD.Profile.load();
  TD.Profile.data.level = 50;
  const out = [];
  for (let mi = 0; mi < TD.CONFIG.maps.length; mi++) {
    const g = new TD.Game(document.getElementById('c'), { mapIndex: mi, difficulty: 'guardian', heroId: 'rex' }, null);
    g.handleClick(5 * 48 + 24, 4 * 48 + 24); // coloca el héroe si la casilla es válida
    g.money = 1e6;
    const ids = Object.keys(TD.CONFIG.towers);
    let k = 0;
    for (let r = 0; r < 12; r++) for (let c = 0; c < 20; c++) {
      if (!g.canPlace(c, r) || k >= 60) continue;
      const t = g.build(ids[k % ids.length], c, r); k++;
      if (t) while (!t.maxed) g.upgrade(t);
    }
    g.autoWave = true;
    let steps = 0;
    while (!g.over && steps < 60 * 60 * 40) { g.update(1 / 60); if (steps % 10 === 0) g.render(); steps++; }
    out.push({ map: g.mapDef.id, win: !!(g.result && g.result.win), waves: g.completedWaves, lives: g.lives });
  }
  return out;
});
await browser.close();

console.table(results);
const failed = results.filter(r => !r.win);
if (errors.length || failed.length) {
  console.error('FALLO:', errors, failed);
  process.exit(1);
}
console.log('OK: los 3 mapas se completan sin errores.');
