/** Juega los niveles 21..30 y comprueba el cierre del juego. */
import { launch, BASE } from './browser.mjs';

const errors = [];
const results = [];
const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? ' — ' + d : ''}`); };

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1240, height: 980 } });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.|net::/.test(m.text())) errors.push(m.text()); });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.setItem('mindEscape_progress', JSON.stringify({
  schemaVersion: 1,
  unlockedLevels: Array.from({ length: 21 }, (_, i) => i + 1),
  completedLevels: Array.from({ length: 20 }, (_, i) => i + 1),
  levelData: {}, settings: { sound: false, music: false }, totalPlayTime: 0, lastPlayedLevel: 21,
})));
await page.reload({ waitUntil: 'networkidle' });

const wait = (ms) => page.waitForTimeout(ms);
const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('mindEscape_progress')));

async function open(id) {
  await page.goto(`${BASE}#/levels`, { waitUntil: 'networkidle' }); await wait(250);
  await page.goto(`${BASE}#/level/${id}`, { waitUntil: 'networkidle' }); await wait(800);
  if (await page.locator('.level-pending').count()) throw new Error(`nivel ${id} sin implementar`);
}
async function solved(id, { last = false } = {}) {
  const s = await read();
  check(`Nivel ${id} se completa y guarda`, s.completedLevels.includes(id),
    s.completedLevels.includes(id) ? `★${s.levelData[String(id)].stars}` : 'no consta');
  if (!last) check(`Nivel ${id} desbloquea el siguiente`, s.unlockedLevels.includes(id + 1));
}
async function close() {
  await page.getByRole('button', { name: /Selector de niveles/i }).click(); await wait(600);
}
async function typeCode(code) {
  for (const d of String(code)) {
    await page.getByRole('button', { name: `Dígito ${d}`, exact: true }).click(); await wait(70);
  }
}

// ── 21 Secuencia Compleja ───────────────────────────────────────────────────
await open(21);
check('L21 muestra 4 tarjetas + la incógnita', (await page.locator('.lv21__card').count()) === 9);
await page.locator('.lv21__option').nth(1).click();
await wait(1200); await solved(21); await close();

// ── 22 Las Monedas ──────────────────────────────────────────────────────────
await open(22);
check('L22 pinta 12 monedas', (await page.locator('.lv22__coin').count()) === 12);
// Compara en la lupa antes de acusar, como haría un jugador.
await page.locator('.lv22__coin').nth(6).click(); await wait(150);
await page.locator('.lv22__coin').nth(0).click(); await wait(250);
check('L22: la lupa muestra dos monedas ampliadas',
  (await page.locator('.lv22__slot svg').count()) === 2);
const rims = await page.evaluate(() =>
  [...document.querySelectorAll('.lv22__slot svg .lv22__rim')].map((n) => n.getAttribute('stroke-width')));
check('L22: los bordes comparados son distintos', rims[0] !== rims[1], `grosores=${rims}`);
await page.getByRole('button', { name: 'Señalar la moneda 7', exact: true }).click();
await wait(1200); await solved(22); await close();

// ── 23 El Mensaje Escondido ─────────────────────────────────────────────────
await open(23);
check('L23 pinta 25 letras', (await page.locator('.lv23__cell').count()) === 25);
const spiral = await page.evaluate(() => {
  const size = 5, c0 = 2, order = [[c0, c0]];
  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  let r = c0, c = c0, step = 1, dir = 0, guard = 0;
  while (order.length < 25 && (guard += 1) < 100) {
    for (let t = 0; t < 2 && order.length < 25; t += 1) {
      for (let i = 0; i < step; i += 1) {
        r += dirs[dir][0]; c += dirs[dir][1];
        if (r >= 0 && r < size && c >= 0 && c < size) order.push([r, c]);
      }
      dir = (dir + 1) % 4;
    }
    step += 1;
  }
  return order;
});
const letters = await page.evaluate((sp) => {
  const cells = [...document.querySelectorAll('.lv23__cell')];
  return sp.map(([r, c]) => cells[r * 5 + c].textContent).join('');
}, spiral);
check('L23: la espiral deletrea el mensaje', letters === 'CADAPUERTAESCONDEUNAMENTE', letters);
for (const [r, c] of spiral) {
  await page.locator('.lv23__cell').nth(r * 5 + c).click();
  await wait(25);
}
await wait(1200); await solved(23); await close();

// ── 24 Laberinto Lógico ─────────────────────────────────────────────────────
await open(24);
// Primero un paso en falso: debe devolver al principio.
await page.getByRole('button', { name: /Mover hacia derecha/i }).click(); await wait(300);
check('L24: un paso en falso devuelve al principio',
  /trampa/i.test(await page.locator('.level-feedback').textContent()));
for (const dir of ['arriba', 'arriba', 'derecha', 'abajo', 'derecha']) {
  await page.getByRole('button', { name: `Mover hacia ${dir}`, exact: true }).click();
  await wait(180);
}
await wait(1200); await solved(24); await close();

// ── 25 Rotación ─────────────────────────────────────────────────────────────
await open(25);
check('L25 pinta 9 piezas', (await page.locator('.lv25__tile').count()) === 9);
const loose0 = Number(await page.locator('.lv25__status b').textContent());
check('L25 NO arranca resuelto', loose0 > 0, `cabos=${loose0}`);
// El tablero está resuelto cuando toda pieza vuelve a su rotación 0, así que
// se lee el giro actual de cada una y se completa la vuelta.
const turnsOf = () => page.evaluate(() =>
  [...document.querySelectorAll('.lv25__spin')].map((g) => {
    const m = /rotate\((\d+)deg\)/.exec(g.style.transform || 'rotate(0deg)');
    return ((4 - (Number(m ? m[1] : 0) / 90)) % 4);
  }));
const pending = await turnsOf();
for (let i = 0; i < pending.length; i += 1) {
  for (let t = 0; t < pending[i]; t += 1) {
    await page.locator('.lv25__tile').nth(i).click(); await wait(60);
  }
}
check('L25 queda sin cabos sueltos',
  Number(await page.locator('.lv25__status b').textContent()) === 0);
await wait(1300); await solved(25); await close();

// ── 26 Memoria ──────────────────────────────────────────────────────────────
await open(26);
await wait(4600); // deja terminar la secuencia automática
check('L26 muestra 5 huecos', (await page.locator('.lv26__slot').count()) === 5);
for (const name of ['Rojo', 'Amarillo', 'Rojo', 'Amarillo', 'Verde']) {
  await page.getByRole('button', { name, exact: true }).click(); await wait(260);
}
await wait(1200); await solved(26); await close();

// ── 27 Meta Puzzle ──────────────────────────────────────────────────────────
await open(27);
check('L27 muestra 4 pistas', (await page.locator('.lv27__clue').count()) === 4);
await typeCode('2347');
await wait(1300); await solved(27); await close();

// ── 28 La Pantalla Miente ───────────────────────────────────────────────────
await open(28);
check('L28 pinta 30 círculos', (await page.locator('.lv28__circle').count()) === 30);
const anyRed = await page.evaluate(() =>
  [...document.querySelectorAll('.lv28__circle')].some((n) =>
    /rgb\(2[0-9][0-9],\s*[0-6][0-9],/.test(getComputedStyle(n).backgroundImage)));
check('L28: no hay ningún círculo rojo, como promete el diseño', !anyRed);
await page.locator('.lv28__circle').nth(0).click(); await wait(250);
check('L28: al fallar, la pantalla insiste en la mentira',
  /rojo/i.test(await page.locator('.level-feedback').textContent()));
await page.locator('.lv28__circle').nth(27).click();
await wait(1300); await solved(28); await close();

// ── 29 Los Cuatro Códigos ───────────────────────────────────────────────────
await open(29);
check('L29 muestra 4 paneles', (await page.locator('.lv29__panel').count()) === 4);
for (const [panel, answer] of [[0, '3'], [1, '2'], [2, '5'], [3, '1']]) {
  await page.locator('.lv29__panel').nth(panel)
    .locator('.lv29__option', { hasText: new RegExp(`^${answer}$`) }).first().click();
  await wait(200);
}
const code29 = await page.evaluate(() =>
  [...document.querySelectorAll('.lv29__code-slot')].map((n) => n.textContent).join(''));
check('L29: el código se arma solo', code29 === '3251', code29);
await wait(1300); await solved(29); await close();

// ── 30 La Salida ────────────────────────────────────────────────────────────
await open(30);
check('L30 muestra las tres fases', (await page.locator('.lv30__phase').count()) === 3);

// Candado 1: colores
await page.getByRole('button', { name: /Candado de Colores/i }).click(); await wait(300);
for (const c of ['Verde', 'Amarillo', 'Rojo', 'Azul']) {
  await page.locator(`.lv30__color[aria-label="${c}"]`).click();
  await wait(200);
}
check('L30 candado 1 abierto',
  (await page.locator('.lv30__lock--open').count()) >= 1);

// Candado 2: lógica
await page.getByRole('button', { name: /Candado de Lógica/i }).click(); await wait(300);
await page.locator('.lv30__plate').nth(1).click(); await wait(300);
check('L30 candado 2 abierto', (await page.locator('.lv30__lock--open').count()) >= 2);

// Candado 3: rotación
await page.getByRole('button', { name: /Candado de Rotación/i }).click(); await wait(300);
// Mismo criterio que en el 25: cada pieza vuelve a su rotación 0.
const pending30 = await page.evaluate(() =>
  [...document.querySelectorAll('.lv30__spin')].map((g) => {
    const m = /rotate\((\d+)deg\)/.exec(g.style.transform || 'rotate(0deg)');
    return (4 - (Number(m ? m[1] : 0) / 90)) % 4;
  }));
for (let i = 0; i < pending30.length; i += 1) {
  for (let t = 0; t < pending30[i]; t += 1) {
    await page.locator('.lv30__tile').nth(i).click(); await wait(90);
  }
}
await wait(1000);
check('L30 pasa a la fase del laberinto',
  (await page.locator('.lv30__maze').count()) === 1);

// Fase 2: laberinto
await page.getByRole('button', { name: /Ir hacia abajo/i }).click(); await wait(220);
check('L30: un paso en falso reinicia el pasillo',
  /Callejón/i.test(await page.locator('.level-feedback').textContent()));
for (const dir of ['derecha', 'arriba', 'arriba', 'derecha']) {
  await page.getByRole('button', { name: `Ir hacia ${dir}`, exact: true }).click();
  await wait(220);
}
await wait(700);
check('L30 llega al código maestro', (await page.locator('.lv30__clues').count()) === 1);

// Fase 3: código maestro
await typeCode('323347');
await wait(1500);
await solved(30, { last: true });

// ── Cierre ──────────────────────────────────────────────────────────────────
const final = await read();
check('Los 30 niveles completados', final.completedLevels.length === 30,
  `completados=${final.completedLevels.length}`);
check('Sin errores en consola', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
const bad = results.filter((r) => !r).length;
console.log(`\n${results.length - bad}/${results.length} comprobaciones OK`);
process.exit(bad ? 1 : 0);
