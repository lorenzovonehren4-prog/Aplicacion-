// Prueba el juego con el guardado bloqueado (como en modo privado) y el código de partida.
import { chromium } from 'playwright';
const file = 'file://' + new URL('../combi-rush.html', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--ignore-certificate-errors', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
async function page(block) {
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', e => errs.push(e.message));
  if (block) await p.addInitScript(() => { const no = () => { throw new DOMException('bloqueado', 'SecurityError'); }; Storage.prototype.setItem = no; Storage.prototype.getItem = no; Storage.prototype.removeItem = no; });
  await p.goto(file); await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 30000 });
  return p;
}
// 1) guardado bloqueado: se juega igual y avisa
const p1 = await page(true);
const r1 = await p1.evaluate(async () => {
  const C = window.__combi; C.save.money = 123.5; C.save.upg.motor = 2; C.save.tutDone = true;
  C.startRun({ mode: 'viaje', ti: 0 }); C.step(30); C.show('menu');
  const note = document.querySelector('#menu-store'); const noteOn = !note.hidden;
  C.show('opciones'); document.querySelector('#btn-exp').click(); await new Promise(r => setTimeout(r, 300));
  return { noteOn, noteText: document.querySelector('#store-note').textContent, code: document.querySelector('#codebox textarea').value };
});
await p1.screenshot({ path: 'shots/incognito-codigo.png' }); await p1.close();
console.log('aviso visible:', r1.noteOn, '|', r1.noteText);
console.log('código:', r1.code.slice(0, 40) + '… (' + r1.code.length + ' caracteres)');
// 2) navegador nuevo: cargar el código recupera el progreso
const p2 = await page(false);
const r2 = await p2.evaluate(async (code) => {
  const C = window.__combi; C.show('opciones');
  document.querySelector('#btn-imp').click(); document.querySelector('#codebox textarea').value = 'basura'; document.querySelector('#code-load').click();
  const bad = document.querySelector('#code-msg').textContent;
  document.querySelector('#codebox textarea').value = code; document.querySelector('#code-load').click();
  return { bad, money: C.save.money, motor: C.save.upg.motor, stored: JSON.parse(localStorage.getItem('combirush_v1')).money };
}, r1.code);
console.log('código inválido →', r2.bad);
console.log('recuperado: plata', r2.money, 'motor', r2.motor, 'guardado en disco', r2.stored);
console.log(errs.length ? 'ERRORES:\n' + errs.join('\n') : 'sin errores');
await b.close();
process.exit(errs.length || r2.money !== 123.5 || r2.motor !== 2 || !r1.noteOn ? 1 : 0);
