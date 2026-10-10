// Prueba de los platos nuevos y del evento Día de la Canción Criolla.
// Uso: CHROMIUM_PATH=... node sazon-tycoon/tests/carta-criolla.mjs [--shots]
import { chromium } from 'playwright';
const file = 'file://' + new URL('../index.html', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.setDefaultTimeout(180000);
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(file); await p.waitForTimeout(6000);
let fails = 0;
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FALLA') + ' ' + what); if (!ok) fails++; };
const r = await p.evaluate(() => {
  const out = { dishes: DISHES.length, events: Object.keys(EVENTS) };
  save.menu = ['ceviche', 'chicha', 'anticuchos', 'picarones', 'pato'];
  save.event = { id: 'criolla', day: save.day, shown: true, c0: 0 };
  let fav = 0; for (let i = 0; i < 400; i++) { const d = pickDish(); if (d === 'anticuchos' || d === 'picarones') fav++; }
  out.favShare = fav / 400;
  out.result = eventResult(save.event);
  save.event = null;
  let base = 0; for (let i = 0; i < 400; i++) { const d = pickDish(); if (d === 'anticuchos' || d === 'picarones') base++; }
  out.baseShare = base / 400;
  // el evento puede salir al sortear
  const seen = new Set(); for (let i = 0; i < 200; i++) { save.event = null; startEvent(); seen.add(save.event.id); }
  out.drawn = [...seen];
  save.event = null;
  return out;
});
check(r.dishes === 17, 'la carta tiene 17 platos');
check(r.events.includes('criolla'), 'existe el evento Día de la Canción Criolla');
check(r.favShare > r.baseShare + 0.2, `en el evento se piden más anticuchos y picarones (${Math.round(r.favShare * 100)}% contra ${Math.round(r.baseShare * 100)}%)`);
check(r.drawn.includes('criolla'), 'el evento sale en el sorteo de eventos');
check(/picar/.test(r.result), 'el resumen del día lo menciona: ' + r.result);
check(errs.length === 0, 'sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
await b.close();
process.exit(fails ? 1 : 0);
