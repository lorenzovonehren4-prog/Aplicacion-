// El nivel 7 tiene tres lecturas posibles; el recorrido normal sólo ejerce una.
// Aquí se comprueban las otras dos, incluida la del calor, que es el corazón
// del puzzle.
import { launch, BASE } from './browser.mjs';
const res = [];
const check = (n, ok, d='') => { res.push(ok); console.log(`${ok?'PASS':'FAIL'}  ${n}${d?' — '+d:''}`); };
const b = await launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type()==='error' && !/fonts\.|net::/.test(m.text())) errs.push(m.text()); });

// Desbloquea hasta el 7 sin jugar (el objetivo aquí es el nivel, no el progreso).
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.evaluate(() => localStorage.setItem('mindEscape_progress', JSON.stringify({
  schemaVersion: 1, unlockedLevels: [1,2,3,4,5,6,7], completedLevels: [1,2,3,4,5,6],
  levelData: {}, settings: { sound: false, music: false }, totalPlayTime: 0, lastPlayedLevel: 7,
})));
// El estado vive en memoria desde el arranque: sin recargar, la escritura en
// localStorage no llega a la aplicación.
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(400);

const open7 = async () => {
  await p.goto(BASE + '#/levels', { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
  await p.goto(BASE + '#/level/7', { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
};
const readBulb = async () => {
  await p.getByRole('button', { name: /Entrar en la habitación/i }).click();
  await p.waitForTimeout(400);
  await p.getByRole('button', { name: /Tocar la bombilla/i }).click();
  await p.waitForTimeout(300);
  return (await p.locator('.lv07__reading').textContent()).trim();
};

// Descubre cuál es el interruptor correcto encendiéndolos de uno en uno.
await open7();
let correct = null;
for (const n of [1, 2, 3]) {
  await open7();
  await p.getByRole('button', { name: new RegExp(`Interruptor ${n}, apagado`) }).click();
  await p.waitForTimeout(300);
  const r = await readBulb();
  if (/encendida/.test(r)) { correct = n; break; }
}
check('Encendido: la bombilla se ve encendida', correct !== null, `interruptor=${correct}`);

// CALIENTE: encender el correcto, esperar, apagarlo y entrar.
await open7();
await p.getByRole('button', { name: new RegExp(`Interruptor ${correct}, apagado`) }).click();
await p.waitForTimeout(7000);
await p.getByRole('button', { name: new RegExp(`Interruptor ${correct}, encendido`) }).click();
await p.waitForTimeout(200);
const warm = await readBulb();
check('Apagada tras esperar: está caliente', /caliente/.test(warm), `"${warm}"`);

// FRÍA: encender el correcto sólo un instante y apagarlo.
await open7();
await p.getByRole('button', { name: new RegExp(`Interruptor ${correct}, apagado`) }).click();
await p.waitForTimeout(600);
await p.getByRole('button', { name: new RegExp(`Interruptor ${correct}, encendido`) }).click();
await p.waitForTimeout(200);
const cold = await readBulb();
check('Apagada casi al instante: está fría', /fría/.test(cold), `"${cold}"`);

// Un fallo reinicia el experimento entero.
const wrong = [1,2,3].find(n => n !== correct);
await p.getByRole('button', { name: `Era el ${wrong}`, exact: true }).click();
await p.waitForTimeout(1400);
check('Fallar reinicia el experimento',
  (await p.getByRole('button', { name: /Entrar en la habitación/i }).count()) === 1);
check('Tras reiniciar, los interruptores vuelven a estar disponibles',
  !(await p.locator('.lv07__switch').first().isDisabled()));

check('Sin errores en consola', errs.length === 0, errs.slice(0,2).join(' | '));
await b.close();
const bad = res.filter(r => !r).length;
console.log(`\n${res.length - bad}/${res.length} OK`);
process.exit(bad ? 1 : 0);
