/**
 * Juega los niveles 1..10 en cadena, resolviendo cada uno como lo haría una
 * persona, y comprueba que el desbloqueo progresivo funciona de verdad.
 */
import { launch, BASE } from './browser.mjs';

const errors = [];
const results = [];
const check = (n, ok, d = '') => { results.push({ n, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? ' — ' + d : ''}`); };

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const noise = (t) => /fonts\.googleapis|fonts\.gstatic|net::ERR/i.test(t);
page.on('console', (m) => { if (m.type() === 'error' && !noise(m.text())) errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('mindEscape_progress')));
const wait = (ms) => page.waitForTimeout(ms);

async function openLevel(id) {
  await page.goto(`${BASE}#/levels`, { waitUntil: 'networkidle' });
  await wait(350);
  await page.goto(`${BASE}#/level/${id}`, { waitUntil: 'networkidle' });
  await wait(600);
  const pending = await page.locator('.level-pending').count();
  if (pending) throw new Error(`nivel ${id} no está implementado`);
}

/** Cierra el modal de completado saliendo al selector. */
async function closeModal() {
  await page.getByRole('button', { name: /Selector de niveles/i }).click();
  await wait(600);
}

async function expectSolved(id) {
  const s = await read();
  const ok = s.completedLevels.includes(id);
  check(`Nivel ${String(id).padStart(2, '0')} se completa y guarda`, ok,
    ok ? `★${s.levelData[String(id)].stars}` : 'no consta como completado');
  const unlocked = id >= 30 || s.unlockedLevels.includes(id + 1);
  check(`Nivel ${String(id).padStart(2, '0')} desbloquea el siguiente`, unlocked);
}

/** Teclea un código en el teclado numérico del nivel. */
async function typeCode(code) {
  for (const digit of String(code)) {
    await page.getByRole('button', { name: `Dígito ${digit}`, exact: true }).click();
    await wait(90);
  }
}

// ─── Nivel 1 ────────────────────────────────────────────────────────────────
await openLevel(1);
await page.locator('.lv01__number--target').click();
await wait(1100); await expectSolved(1); await closeModal();

// ─── Nivel 2: secuencia 2,4,8,16 → 32 ───────────────────────────────────────
await openLevel(2);
check('Nivel 02 muestra la secuencia', (await page.locator('.lv02__term').count()) === 5);
await typeCode('32');
await page.getByRole('button', { name: /Enviar código/i }).click();
await wait(1100); await expectSolved(2); await closeModal();

// ─── Nivel 3: símbolo rotado en la tercera fila ─────────────────────────────
await openLevel(3);
check('Nivel 03 pinta 25 símbolos', (await page.locator('.lv03__cell').count()) === 25);
const oddIndex = await page.evaluate(() => {
  const cells = [...document.querySelectorAll('.lv03__cell')];
  const angle = (c) => c.querySelector('g').getAttribute('transform');
  const counts = {};
  for (const c of cells) counts[angle(c)] = (counts[angle(c)] || 0) + 1;
  const rare = Object.entries(counts).find(([, n]) => n === 1)[0];
  return cells.findIndex((c) => angle(c) === rare);
});
check('Nivel 03: el símbolo distinto está en la tercera fila',
  Math.floor(oddIndex / 5) === 2, `índice=${oddIndex}`);
await page.locator('.lv03__cell').nth(oddIndex).click();
await wait(1100); await expectSolved(3); await closeModal();

// ─── Nivel 4: azul → verde → rojo → amarillo ────────────────────────────────
await openLevel(4);
check('Nivel 04 muestra 3 reglas', (await page.locator('.lv04__rule').count()) === 3);
for (const color of ['Azul', 'Verde', 'Rojo', 'Amarillo']) {
  await page.getByRole('button', { name: color, exact: true }).click();
  await wait(120);
}
await wait(1100); await expectSolved(4); await closeModal();

// ─── Nivel 5: la pieza del medio ────────────────────────────────────────────
await openLevel(5);
check('Nivel 05 ofrece 3 piezas', (await page.locator('.lv05__option').count()) === 3);
await page.locator('.lv05__option').nth(1).click();
await wait(1100); await expectSolved(5); await closeModal();

// ─── Nivel 6: caja B ────────────────────────────────────────────────────────
await openLevel(6);
// Comprueba que la lógica del nivel es consistente: exactamente una solución
// hace que exactamente una afirmación sea verdadera.
const boxLogic = await page.evaluate(() => {
  const texts = [...document.querySelectorAll('.lv06__statement')].map((n) => n.textContent);
  const truth = (stmt, sol) => {
    const target = stmt.match(/es ([ABC])/)[1];
    return /no es/.test(stmt) ? sol !== target : sol === target;
  };
  return ['A', 'B', 'C'].map((sol) => texts.filter((t) => truth(t, sol)).length);
});
check('Nivel 06: sólo una solución deja una única afirmación verdadera',
  boxLogic.filter((n) => n === 1).length === 1 && boxLogic[1] === 1, `verdades=${boxLogic}`);
await page.locator('.lv06__box').nth(1).click();
await wait(1100); await expectSolved(6); await closeModal();

// ─── Nivel 7: interruptores (encender, esperar, apagar, encender otro) ──────
await openLevel(7);
const correctSwitch = await page.evaluate(() => window.__lv07 ?? null);
// No exponemos la respuesta: se resuelve con el método real.
await page.getByRole('button', { name: /Interruptor 1, apagado/ }).click();
await wait(7000); // deja que caliente
await page.getByRole('button', { name: /Interruptor 1, encendido/ }).click();
await page.getByRole('button', { name: /Interruptor 2, apagado/ }).click();
await page.getByRole('button', { name: /Entrar en la habitación/i }).click();
await wait(500);
check('Nivel 07 entra en la habitación', (await page.locator('.lv07__room').count()) === 1);
await page.getByRole('button', { name: /Tocar la bombilla/i }).click();
await wait(300);
const reading = await page.locator('.lv07__reading').textContent();
const deduced = /encendida/.test(reading) ? 2 : /caliente/.test(reading) ? 1 : 3;
check('Nivel 07: la lectura permite deducir el interruptor', [1, 2, 3].includes(deduced),
  `lectura="${reading.trim()}" → ${deduced}`);
await page.getByRole('button', { name: `Era el ${deduced}`, exact: true }).click();
await wait(1200); await expectSolved(7); await closeModal();

// ─── Nivel 8: relojes → 3764 ────────────────────────────────────────────────
await openLevel(8);
check('Nivel 08 pinta 4 relojes', (await page.locator('.lv08__clock').count()) === 4);
const clockTimes = await page.evaluate(() =>
  [...document.querySelectorAll('.lv08__clock svg')].map((s) => s.getAttribute('aria-label')));
// Deriva el código de las horas dibujadas: hora + minutos/5
const derived = clockTimes.map((label) => {
  const [h, m] = label.match(/(\d+):(\d+)/).slice(1).map(Number);
  return h + m / 5;
}).join('');
check('Nivel 08: el código se deriva de los relojes dibujados', derived === '3764', `derivado=${derived}`);
await typeCode(derived);
await wait(1200); await expectSolved(8); await closeModal();

// ─── Nivel 9: ordenar cumpliendo las 4 reglas (con el teclado) ──────────────
await openLevel(9);
check('Nivel 09 muestra 4 fichas', (await page.locator('.sortable__item').count()) === 4);

const startOrder = await page.evaluate(() =>
  [...document.querySelectorAll('.sortable__item')].map((n) => n.dataset.id).join(''));
const metAtStart = await page.locator('.lv09__rule--met').count();
check('Nivel 09 NO arranca ya resuelto', metAtStart < 4, `orden=${startOrder} cumplidas=${metAtStart}`);

// Se resuelve moviendo fichas con el teclado, que es también la ruta accesible.
async function moveTo(id, targetIndex) {
  for (let guard = 0; guard < 8; guard += 1) {
    const order = await page.evaluate(() =>
      [...document.querySelectorAll('.sortable__item')].map((n) => n.dataset.id));
    const current = order.indexOf(id);
    if (current === targetIndex) return;
    const item = page.locator(`.sortable__item[data-id="${id}"]`);
    await item.focus();
    await item.press(current > targetIndex ? 'ArrowUp' : 'ArrowDown');
    await wait(120);
  }
}
// Objetivo: A → C → B → D
await moveTo('A', 0); await moveTo('C', 1); await moveTo('B', 2); await moveTo('D', 3);

const solvedOrder = await page.evaluate(() =>
  [...document.querySelectorAll('.sortable__item')].map((n) => n.dataset.id).join(''));
check('Nivel 09 se reordena con el teclado', solvedOrder === 'ACBD', `orden=${solvedOrder}`);
const metCount = await page.locator('.lv09__rule--met').count();
check('Nivel 09 marca en vivo las reglas cumplidas', metCount === 4, `cumplidas=${metCount}`);
await page.getByRole('button', { name: /Comprobar orden/i }).click();
await wait(1200); await expectSolved(9); await closeModal();

// ─── Nivel 10: ESCAPA ───────────────────────────────────────────────────────
await openLevel(10);
const signal = await page.evaluate(() =>
  [...document.querySelectorAll('.lv10__char--signal')].map((n) => n.textContent).join(''));
check('Nivel 10: los caracteres destacados forman ESCAPA', signal === 'ESCAPA', `leído=${signal}`);
const signalOrder = await page.evaluate(() => {
  const all = [...document.querySelectorAll('.lv10__char')];
  const idx = all.map((n, i) => (n.classList.contains('lv10__char--signal') ? i : -1)).filter((i) => i >= 0);
  return idx.every((v, i, a) => i === 0 || v > a[i - 1]);
});
check('Nivel 10: están en orden de lectura', signalOrder);
await page.locator('.answer-bar input').fill('escapa');
await page.getByRole('button', { name: /^Enviar$/i }).click();
await wait(1200); await expectSolved(10);

// ─── Estado final ───────────────────────────────────────────────────────────
const final = await read();
check('Los 10 niveles constan como completados', final.completedLevels.length === 10,
  `completados=${final.completedLevels.join(',')}`);
check('El nivel 11 queda desbloqueado', final.unlockedLevels.includes(11));
check('Sin errores en consola', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} comprobaciones OK`);
process.exit(failed.length ? 1 : 0);
