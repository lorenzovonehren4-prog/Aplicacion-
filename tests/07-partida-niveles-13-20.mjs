/**
 * Juega los niveles 13..20 resolviéndolos como lo haría una persona y
 * comprueba el desbloqueo en cadena.
 */
import { launch, BASE } from './browser.mjs';

const errors = [];
const results = [];
const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? ' — ' + d : ''}`); };

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1240, height: 950 } });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.|net::/.test(m.text())) errors.push(m.text()); });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.setItem('mindEscape_progress', JSON.stringify({
  schemaVersion: 1,
  unlockedLevels: Array.from({ length: 20 }, (_, i) => i + 1),
  completedLevels: Array.from({ length: 12 }, (_, i) => i + 1),
  levelData: {}, settings: { sound: false, music: false }, totalPlayTime: 0, lastPlayedLevel: 13,
})));
await page.reload({ waitUntil: 'networkidle' });

const wait = (ms) => page.waitForTimeout(ms);
const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('mindEscape_progress')));

async function open(id) {
  await page.goto(`${BASE}#/levels`, { waitUntil: 'networkidle' }); await wait(250);
  await page.goto(`${BASE}#/level/${id}`, { waitUntil: 'networkidle' }); await wait(750);
  if (await page.locator('.level-pending').count()) throw new Error(`nivel ${id} sin implementar`);
}
async function solved(id) {
  const s = await read();
  check(`Nivel ${id} se completa y guarda`, s.completedLevels.includes(id),
    s.completedLevels.includes(id) ? `★${s.levelData[String(id)].stars}` : 'no consta');
  check(`Nivel ${id} desbloquea el siguiente`, s.unlockedLevels.includes(id + 1));
}
async function close() {
  await page.getByRole('button', { name: /Selector de niveles/i }).click();
  await wait(600);
}
async function typeCode(code) {
  for (const d of String(code)) {
    await page.getByRole('button', { name: `Dígito ${d}`, exact: true }).click();
    await wait(80);
  }
}

// ── 13 Conexiones ───────────────────────────────────────────────────────────
await open(13);
check('L13 pinta la cuadrícula 5×5', (await page.locator('.lv13__cell').count()) === 25);
const cell13 = (r, c) => page.locator(`.lv13__cell[data-r="${r}"][data-c="${c}"]`);
const drawPath = async (cells) => {
  for (const [r, c] of cells) { await cell13(r, c).click(); await wait(45); }
};
await drawPath([[0,0],[1,0],[2,0],[3,0],[4,0],[4,1],[3,1],[2,1],[1,1],[0,1]]);
await drawPath([[0,2],[0,3],[0,4],[1,4],[1,3],[1,2],[2,2],[2,3],[2,4]]);
check('L13 avisa si quedan huecos',
  (await page.locator('.lv13__status b').textContent()).trim() === '19 / 25');
await drawPath([[3,2],[3,3],[3,4],[4,4],[4,3],[4,2]]);
await wait(1200);
await solved(13); await close();

// ── 14 Mueve una Pieza ──────────────────────────────────────────────────────
await open(14);
check('L14 muestra la figura y el plano', (await page.locator('.lv14__grid').count()) === 2);
check('L14 arranca con 7 piezas',
  (await page.locator('.lv14__grid').first().locator('.lv14__piece').count()) === 7);
await page.locator('.lv14__cell[data-r="0"][data-c="2"] .lv14__piece').click();
await wait(200);
await page.locator('.lv14__cell[data-r="3"][data-c="2"]').click();
await wait(1200);
await solved(14); await close();

// ── 15 Sudoku ───────────────────────────────────────────────────────────────
await open(15);
check('L15 pinta 16 casillas', (await page.locator('.lv15__cell').count()) === 16);
const SUD = [[2,3,4,1],[1,4,3,2],[3,2,1,4],[4,1,2,3]];
for (let r = 0; r < 4; r += 1) for (let c = 0; c < 4; c += 1) {
  const cell = page.locator(`.lv15__cell[data-r="${r}"][data-c="${c}"]`);
  if (await cell.isDisabled()) continue;
  await cell.click(); await wait(40);
  await page.getByRole('button', { name: `Escribir ${SUD[r][c]}`, exact: true }).click();
  await wait(40);
}
check('L15 detecta el Sudoku terminado', await page.locator('.lv15__solved-note').isVisible());
await typeCode('2413');
await wait(1200);
await solved(15); await close();

// ── 16 Cables ───────────────────────────────────────────────────────────────
await open(16);
check('L16 muestra 4 cables y 4 conectores',
  (await page.locator('.lv16__cable').count()) === 4 && (await page.locator('.lv16__port').count()) === 4);
for (const [cable, port] of [['Azul', 1], ['Amarillo', 2], ['Rojo', 3], ['Verde', 4]]) {
  await page.getByRole('button', { name: new RegExp(`^Cable ${cable},`) }).click(); await wait(90);
  await page.getByRole('button', { name: new RegExp(`^Conector ${port},`) }).click(); await wait(120);
}
check('L16 dibuja los cuatro cables', (await page.locator('.lv16__wire').count()) === 4);
await wait(1200);
await solved(16); await close();

// ── 17 Criptografía ─────────────────────────────────────────────────────────
await open(17);
const cipher = (await page.locator('.lv17__cipher').textContent()).trim();
check('L17 muestra el mensaje cifrado', cipher === 'MB TBMJEB', cipher);
await page.getByRole('button', { name: /Aumentar el desplazamiento/i }).click();
await wait(250);
const decoded = (await page.locator('.lv17__plain').textContent()).trim();
check('L17: la rueda descifra en vivo con desplazamiento 1', decoded === 'LA SALIDA', decoded);
await page.locator('.answer-bar input').fill(decoded);
await page.getByRole('button', { name: /^Enviar$/i }).click();
await wait(1200);
await solved(17); await close();

// ── 18 Habitación Oscura ────────────────────────────────────────────────────
await open(18);
check('L18 esconde 4 números', (await page.locator('.lv18__digit').count()) === 4);
const digits = await page.evaluate(() =>
  [...document.querySelectorAll('.lv18__digit')].map((n) => n.textContent).join(''));
check('L18: los números forman 7391 en orden de lectura', digits === '7391', digits);
// La luz se mueve con el teclado: es la ruta accesible del nivel.
await page.locator('.lv18__room').focus();
const before = await page.evaluate(() => document.querySelector('.lv18__dark').style.background);
await page.locator('.lv18__room').press('ArrowLeft');
await wait(150);
const after = await page.evaluate(() => document.querySelector('.lv18__dark').style.background);
check('L18: las flechas mueven la luz', before !== after);
await typeCode('7391');
await wait(1200);
await solved(18); await close();

// ── 19 Pesos ────────────────────────────────────────────────────────────────
await open(19);
check('L19 muestra 5 fichas', (await page.locator('.sortable__item').count()) === 5);
const met0 = await page.locator('.lv19__rule--met').count();
check('L19 NO arranca resuelto', met0 < 4, `cumplidas=${met0}`);
async function moveTo(id, target) {
  for (let guard = 0; guard < 10; guard += 1) {
    const order = await page.evaluate(() =>
      [...document.querySelectorAll('.sortable__item')].map((n) => n.dataset.id));
    const cur = order.indexOf(id);
    if (cur === target) return;
    const item = page.locator(`.sortable__item[data-id="${id}"]`);
    await item.focus();
    await item.press(cur > target ? 'ArrowUp' : 'ArrowDown');
    await wait(110);
  }
}
for (const [id, pos] of [['A',0],['B',1],['E',2],['C',3],['D',4]]) await moveTo(id, pos);
const order19 = await page.evaluate(() =>
  [...document.querySelectorAll('.sortable__item')].map((n) => n.dataset.id).join(''));
check('L19 se ordena a A-B-E-C-D', order19 === 'ABECD', order19);
check('L19 marca las 4 reglas', (await page.locator('.lv19__rule--met').count()) === 4);
await page.getByRole('button', { name: /Comprobar orden/i }).click();
await wait(1200);
await solved(19); await close();

// ── 20 Cinco Puertas ────────────────────────────────────────────────────────
await open(20);
check('L20 muestra 5 puertas', (await page.locator('.lv20__door').count()) === 5);
await page.locator('.lv20__door').nth(3).click();
await wait(1300);
await solved(20);

const final = await read();
check('Los 20 niveles constan completados', final.completedLevels.length === 20,
  `completados=${final.completedLevels.length}`);
check('El nivel 21 queda desbloqueado', final.unlockedLevels.includes(21));
check('Sin errores en consola', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
const bad = results.filter((r) => !r).length;
console.log(`\n${results.length - bad}/${results.length} comprobaciones OK`);
process.exit(bad ? 1 : 0);
