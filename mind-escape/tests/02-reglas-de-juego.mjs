import { launch, BASE } from './browser.mjs';
const errs = [];
const res = [];
const check = (n, ok, d='') => { res.push(ok); console.log(`${ok?'PASS':'FAIL'}  ${n}${d?' — '+d:''}`); };

const b = await launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type()==='error' && !/fonts\.|net::/.test(m.text())) errs.push(m.text()); });

const read = () => p.evaluate(() => JSON.parse(localStorage.getItem('mindEscape_progress')));

// 1) Completar con 2 pistas -> 1 estrella
await p.goto(BASE + '#/level/1', { waitUntil: 'networkidle' });
await p.waitForTimeout(600);
await p.locator('.hints__header').click();
await p.waitForTimeout(400);
await p.locator('.hint__reveal').first().click();
await p.waitForTimeout(200);
await p.locator('.hint__reveal').first().click();
await p.waitForTimeout(200);
check('2 pistas -> 1 estrella potencial',
  (await p.locator('.level-stats .stars__item--filled').count()) === 1);
await p.locator('.lv01__number--target').click();
await p.waitForTimeout(1200);
let s = await read();
check('Guardado con 1 estrella', s.levelData['1'].stars === 1, `stars=${s.levelData['1'].stars}`);

// 2) Reintentar desde el modal remonta el nivel limpio
await p.getByRole('button', { name: /Reintentar/i }).click();
await p.waitForTimeout(900);
check('Reintentar remonta el nivel', (await p.locator('.lv01__number').count()) === 18);
check('Reintentar reinicia las pistas',
  (await p.locator('.level-stats .stars__item--filled').count()) === 3);
check('Reintentar cierra el modal', (await p.locator('.modal').count()) === 0);
const t = await p.locator('.timer__value').textContent();
check('Reintentar reinicia el cronómetro', /^00:0[0-9]$/.test(t), `timer=${t}`);

// 3) Resolver sin pistas -> sube a 3 estrellas
await p.locator('.lv01__number--target').click();
await p.waitForTimeout(1200);
s = await read();
check('Sin pistas sube a 3 estrellas', s.levelData['1'].stars === 3, `stars=${s.levelData['1'].stars}`);
const best = s.levelData['1'].bestTime;

// 4) Volver a jugar peor NO baja las estrellas
// (se sale por el selector: el modal sólo se cierra navegando de verdad)
await p.getByRole('button', { name: /Selector de niveles/i }).click();
await p.waitForTimeout(800);
await p.locator('.level-card--completed').first().click();
await p.waitForTimeout(800);
await p.locator('.hints__header').click();
await p.waitForTimeout(300);
await p.locator('.hint__reveal').first().click();
await p.waitForTimeout(200);
await p.locator('.hint__reveal').first().click();
await p.waitForTimeout(200);
await p.locator('.lv01__number--target').click();
await p.waitForTimeout(1200);
s = await read();
check('Un intento peor NO baja las estrellas', s.levelData['1'].stars === 3, `stars=${s.levelData['1'].stars}`);
check('bestTime no empeora', s.levelData['1'].bestTime <= best,
  `best=${s.levelData['1'].bestTime} prev=${best}`);
check('Nivel 1 no se duplica en completedLevels',
  s.completedLevels.filter(x => x === 1).length === 1);

// 5) Progreso total acumula tiempo
check('totalPlayTime acumulado', s.totalPlayTime > 0, `t=${s.totalPlayTime}`);

// 6) Hash inválido -> menú
await p.goto(BASE + '#/no-existe', { waitUntil: 'networkidle' });
await p.waitForTimeout(600);
check('Ruta inexistente cae al menú', (await p.locator('#menu-title').count()) === 1);

// 7) Nivel fuera de rango
await p.goto(BASE + '#/level/99', { waitUntil: 'networkidle' });
await p.waitForTimeout(600);
check('Nivel inexistente redirige', (await p.locator('.level-card').count()) === 30);

// 8) localStorage corrupto no rompe el arranque
await p.evaluate(() => localStorage.setItem('mindEscape_progress', '{roto:::'));
await p.goto(BASE + '#/levels', { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
check('Progreso corrupto arranca limpio', (await p.locator('.level-card').count()) === 30);

check('Sin errores en consola', errs.length === 0, errs.join(' | '));
await b.close();
const bad = res.filter(r => !r).length;
console.log(`\n${res.length - bad}/${res.length} OK`);
process.exit(bad ? 1 : 0);
