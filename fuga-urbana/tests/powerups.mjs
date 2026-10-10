// Prueba de los power-ups y los carros nuevos de Fuga Urbana.
// Uso: CHROMIUM_PATH=... node fuga-urbana/tests/powerups.mjs [--shots]
import { chromium } from 'playwright';
const file = 'file://' + new URL('../index.html', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(file);
await p.waitForTimeout(1500);
let fails = 0;
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FALLA') + ' ' + what); if (!ok) fails++; };
const r = await p.evaluate(async () => {
  const F = window.__fuga, out = {};
  out.cars = F.cars();
  F.startGame();
  await new Promise(r => setTimeout(r, 400));
  out.start = F.boosts().length;
  const pl = F.player();
  // nitro
  F.setNitro(0); F.dropBoost('nitro'); await new Promise(r => setTimeout(r, 300)); out.nitro = F.car().nitro;
  // plata
  const bank = F.car().bank; F.dropBoost('plata'); await new Promise(r => setTimeout(r, 300)); out.plata = F.car().bank - bank;
  // escudo: el daño no baja la vida
  F.dropBoost('escudo'); await new Promise(r => setTimeout(r, 300)); out.shield = F.shield();
  const hp = pl.hp; F.hurt(30); out.hpKept = pl.hp === hp;
  // pintura: cambia el color y baja la búsqueda
  F.crime('prueba', 80); await new Promise(r => setTimeout(r, 400)); const h0 = F.getHeat(), lv = F.getLevel();
  F.dropBoost('pintura'); await new Promise(r => setTimeout(r, 300)); out.paint = pl.paint; out.heatDrop = h0 - F.getHeat(); out.lv = lv; out.h0 = h0;
  return out;
});
check(r.cars.includes('chatarra') && r.cars.includes('fantasma'), 'carros nuevos en la lista: ' + r.cars.length);
check(r.start >= 3, 'la partida empieza con power-ups en la pista (' + r.start + ')');
check(r.nitro === 1, 'N llena el nitro');
check(r.plata >= 300, 'bolsa de plata suma ' + r.plata);
check(r.shield > 6 && r.hpKept, 'el escudo evita el daño');
check(!!r.paint && r.heatDrop >= 40, 'la pintura cambia el color (' + r.paint + ') y baja la búsqueda ' + r.heatDrop + ' (heat ' + r.h0 + ', nivel ' + r.lv + ')');
if (process.argv.includes('--shots')) {
  await p.evaluate(() => { const F = window.__fuga; for (const k of ['nitro', 'plata', 'pintura', 'escudo']) { const pl = F.player(); F.boosts().push({ x: pl.x + 120 + Math.random() * 60, y: pl.y - 100 + ['nitro', 'plata', 'pintura', 'escudo'].indexOf(k) * 60, k, life: 45 }); } });
  await p.waitForTimeout(800);
  await p.screenshot({ path: '/tmp/claude-0/fuga-powerups.png' });
}
check(errs.length === 0, 'sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
await b.close();
process.exit(fails ? 1 : 0);
