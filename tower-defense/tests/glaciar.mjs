// Prueba del mapa Glaciar Maldito: torres, oleadas, ventisca que congela y el Yeti.
// Uso: CHROMIUM_PATH=... node tower-defense/tests/glaciar.mjs [--shots]
import { chromium } from 'playwright';
const file = 'file://' + new URL('../index.html', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const p = await b.newPage({ viewport: { width: 1366, height: 820 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(file); await p.waitForTimeout(1200);
let fails = 0;
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FALLA') + ' ' + what); if (!ok) fails++; };
const r = await p.evaluate(async () => {
  const C = TD.CONFIG, mi = C.maps.findIndex(m => m.id === 'glaciar');
  TD.app.startGame({ mapIndex: mi, difficulty: 'aprendiz', heroId: 'rex', mode: 'campaign' });
  await new Promise(r => setTimeout(r, 500));
  const g = TD.app.game; g.stop && g.stop(); // la simulación la avanzamos a mano
  g.money = 99999; g.lives = 9999; g.maxLives = 9999;
  const built = [];
  for (const [c, r] of [[5, 5], [9, 3], [13, 3], [9, 9], [17, 6], [13, 9], [5, 1]]) { const t = g.build('fusilero', c, r) || g.towerAt(c, r); if (t) built.push([c, r]); }
  let frozen = 0, spawnedBoss = false, maxWave = 0;
  for (let w = 0; w < 4; w++) {
    g.startNextWave();
    for (let i = 0; i < 60 * 25; i++) { g.update(1 / 60); for (const t of g.towers) if (t.stunTimer > 0) frozen = Math.max(frozen, 1); }
    maxWave = Math.max(maxWave, g.waves.length);
  }
  const boss = g.spawnEnemy('yeti', 20, {}); spawnedBoss = !!g.enemies.find(e => e.def === C.enemies.yeti || e.type === 'yeti' || (e.def && e.def.name === 'Yeti Zombi'));
  for (let i = 0; i < 60 * 10; i++) g.update(1 / 60);
  g.render();
  return { mi, maps: C.maps.length, built: built.length, frozen, spawnedBoss, maxWave, ev: g.mapDef.event.type };
});
check(r.maps === 4 && r.mi === 3, 'hay 4 mapas y el Glaciar es el cuarto');
check(r.built >= 5, 'se pueden construir torres en el Glaciar (' + r.built + ')');
check(r.maxWave >= 4, 'corren las oleadas (' + r.maxWave + ')');
check(r.frozen > 0, 'la ventisca congela alguna torre');
check(r.spawnedBoss, 'aparece el Yeti Zombi');
if (process.argv.includes('--shots')) { await p.evaluate(() => TD.app.game.render()); await p.screenshot({ path: '/tmp/claude-0/td-glaciar.png' }); }
check(errs.length === 0, 'sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
await b.close();
process.exit(fails ? 1 : 0);
