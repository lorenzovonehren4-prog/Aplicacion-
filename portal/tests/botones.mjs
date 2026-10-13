// Recorre todos los botones y enlaces del portal y comprueba que cada uno haga lo suyo.
// Uso: CHROMIUM_PATH=... node portal/tests/botones.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const base = `http://localhost:${server.address().port}/index.html`;

let fails = 0;
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FALLA') + ' ' + what); if (!ok) fails++; };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 820 } });
await ctx.addInitScript(() => { try { sessionStorage.setItem('ag_intro', '1'); } catch (e) { /* nada */ } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });
const wait = ms => page.waitForTimeout(ms);
const hash = () => page.evaluate(() => location.hash);

await page.goto(base);
await wait(900);

// ---------- cabecera ----------
for (const tab of ['biblioteca', 'logros', 'inicio']) {
  await page.click(`.tabs a[data-tab=${tab}]`); await wait(250);
  check((await hash()) === '#' + tab && await page.locator(`.tabs a[data-tab=${tab}].is-on`).count() === 1, `pestaña ${tab}`);
}
await page.click('.tabs a[data-tab=logros]'); await wait(200);
await page.click('.logo'); await wait(250);
check((await hash()) === '#inicio' && await page.locator('#dash').count() === 1, 'el logo vuelve al inicio');
const snd0 = await page.getAttribute('#btnSound', 'aria-pressed');
await page.click('#btnSound'); await wait(150);
check((await page.getAttribute('#btnSound', 'aria-pressed')) !== snd0, 'botón de sonido cambia');
await page.click('#btnSound'); await wait(150);
const [tab] = await Promise.all([ctx.waitForEvent('page'), page.click('#btnBlank')]);
await tab.waitForLoadState();
check((await tab.title()) === 'Classes' && await tab.locator('iframe').count() === 1, 'botón about:blank abre la pestaña');
await tab.close();
await page.click('#q'); await page.keyboard.type('zombi'); await wait(300);
const found = await page.$$eval('[data-tile]', ts => ts.map(t => t.dataset.tile));
check((await hash()) === '#biblioteca' && found.includes('tower-defense'), 'buscar "zombi" va a la biblioteca y encuentra Reino en Guardia (' + found.join(', ') + ')');
await page.keyboard.press('Enter'); await wait(400);
check((await hash()) === '#juego-' + found[0], 'Enter en la búsqueda abre el primer resultado');
await page.fill('#q', ''); await page.click('.logo'); await wait(300);
check(await page.locator('#dash').count() === 1, 'al volver, el inicio está limpio');

// ---------- inicio ----------
const nCards = await page.locator('.gcard[data-sel]').count();
for (let i = 0; i < nCards; i++) {
  const t = await page.evaluate(i => { const c = document.querySelector(`.gcard[data-sel="${i}"]`); c.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' })); return document.querySelector('.dash__title').textContent; }, i);
  const want = await page.evaluate(i => GAMES[i].title, i);
  if (t !== want) check(false, `carta ${i} elige ${want} (salió ${t})`);
}
check(true, `las ${nCards} cartas del estante eligen su juego`);
await page.keyboard.press('ArrowRight'); await wait(150); await page.keyboard.press('ArrowLeft'); await wait(150);
await page.click('#dashInfo [data-fav]'); await wait(150);
const favOn = await page.getAttribute('#dashInfo [data-fav]', 'aria-pressed');
check(favOn === 'true', 'favorito en el inicio');
await page.click('#dashInfo [data-fav]'); await wait(150);
await page.click('#dashInfo .btn--ghost'); await wait(300);
check((await hash()).startsWith('#juego-') && await page.locator('#btnPlay').count() === 1, 'Detalles abre la página del juego sin arrancarlo');
await page.click('.logo'); await wait(300);
await page.click('#dashInfo .btn--play'); await wait(500);
check(await page.locator('iframe.player__frame').count() === 1, 'Jugar arranca el juego');
await page.click('.logo'); await wait(300);
check(await page.locator('iframe.player__frame').count() === 0, 'al salir se cierra el juego');
await page.click('.gcard--all'); await wait(250);
check((await hash()) === '#biblioteca', 'la carta Biblioteca del estante');
await page.click('.logo'); await wait(250);
for (const n of await page.locator('.news__item').all()) { await n.click(); await wait(200); if (!(await hash()).startsWith('#juego-')) check(false, 'novedad lleva al juego'); await page.click('.logo'); await wait(200); }
check(true, 'las novedades llevan a su juego');
await page.click('.cont'); await wait(400);
check(await page.locator('iframe.player__frame').count() === 1, '"Sigue jugando" arranca el juego');
await page.click('.logo'); await wait(250);
await page.click('a.hall__stat'); await wait(250);
check((await hash()) === '#logros', 'la tarjeta de insignias lleva a Logros');
await page.click('.logo'); await wait(250);
await page.click('.hall__me'); await wait(400);
check(await page.locator('.drawer.is-open').count() === 1, 'tu sala abre el perfil');
await page.click('#btnCloseDrawer'); await wait(400);

// ---------- biblioteca ----------
await page.click('.tabs a[data-tab=biblioteca]'); await wait(250);
const chips = await page.$$eval('.chip', cs => cs.map(c => [c.dataset.cat, +c.querySelector('em').textContent]));
for (const [cat, n] of chips) {
  await page.click(`.chip[data-cat="${cat}"]`); await wait(150);
  const shown = await page.locator('[data-tile]').count();
  if (shown !== n) check(false, `categoría ${cat}: ${shown} fichas, decía ${n}`);
}
check(true, `las ${chips.length} categorías muestran lo que dicen`);
await page.click('.chip[data-cat=todos]'); await wait(150);
const ids = await page.$$eval('[data-tile]', ts => ts.map(t => t.dataset.tile));
for (const id of ids) { await page.click(`[data-tile="${id}"]`); await wait(200); if ((await hash()) !== '#juego-' + id) check(false, 'ficha ' + id); await page.click('.tabs a[data-tab=biblioteca]'); await wait(200); }
check(true, `las ${ids.length} fichas abren su juego`);

// ---------- página de juego ----------
await page.goto(base + '#juego-tower-defense'); await wait(500);
await page.click('.gbar [data-fav]'); await wait(150);
check((await page.getAttribute('.gbar [data-fav]', 'aria-pressed')) === 'true', 'favorito en la página del juego');
await page.click('#btnPlay'); await page.waitForSelector('iframe.player__frame');
await page.frameLocator('iframe.player__frame').locator('#intro-start').waitFor({ timeout: 15000 });
check(await page.evaluate(() => document.body.classList.contains('playing')), 'mientras se juega se pausa el fondo del portal');
await page.click('[data-act=restart]'); await wait(1500);
check(await page.frameLocator('iframe.player__frame').locator('#intro-start').count() === 1, 'Reiniciar recarga el juego');
await page.click('[data-act=full]'); await wait(500);
const fs1 = await page.evaluate(() => !!document.fullscreenElement || document.body.classList.contains('pseudo-fs'));
check(fs1, 'Pantalla completa');
await page.click('#btnExitFs'); await wait(500);
check(!(await page.evaluate(() => !!document.fullscreenElement || document.body.classList.contains('pseudo-fs'))), 'Salir de pantalla completa');
const minis = await page.$$eval('a.mini', as => as.map(a => a.getAttribute('href')));
await page.click('a.mini'); await wait(300);
check((await hash()) === minis[0] && await page.locator('iframe.player__frame').count() === 0, '"Más juegos" cambia de juego y cierra el anterior');
check(!(await page.evaluate(() => document.body.classList.contains('playing'))), 'al salir del juego vuelve el fondo');
await page.click('.gbar a.btn'); await wait(300);
check((await hash()) === '#inicio', 'botón Inicio de la página del juego');

// ---------- perfil ----------
await page.click('#btnMe'); await wait(400);
const avs = await page.locator('[data-av]').count();
for (let i = 0; i < avs; i++) { await page.click(`[data-av="${i}"]`); await wait(60); }
check((await page.locator('[data-av].is-on').getAttribute('data-av')) === String(avs - 1), `las ${avs} máscaras se eligen`);
await page.fill('#inName', 'Probador'); await wait(150);
check((await page.locator('#meName').textContent()) === 'Probador', 'el nombre se cambia');
const sw0 = await page.locator('[data-act=sound] .sw.is-on').count();
await page.click('[data-act=sound]'); await wait(150);
check((await page.locator('[data-act=sound] .sw.is-on').count()) !== sw0, 'interruptor de sonido del perfil');
await page.click('[data-act=sound]'); await wait(150);
const [tab2] = await Promise.all([ctx.waitForEvent('page'), page.click('[data-act=blank]')]);
await tab2.waitForLoadState(); check((await tab2.title()) === 'Classes', 'about:blank desde el perfil'); await tab2.close(); await wait(400);
check(await page.locator('#drawer').isHidden(), 'about:blank cierra el perfil');
await page.click('#btnMe'); await wait(400);
await page.click('[data-act=intro]'); await wait(700);
check(await page.locator('#intro.is-on').count() === 1, 'Ver la intro otra vez');
await page.click('#intro'); await wait(800);
await page.click('#btnMe'); await wait(400);
await page.click('[data-act=wipe]'); await wait(150);
check((await page.locator('#wipeTxt').textContent()).includes('otra vez'), 'borrar pide un segundo toque');
await page.click('[data-act=wipe]'); await wait(300);
check((await page.locator('#meName').textContent()).startsWith('Anónimo'), 'el segundo toque borra el perfil');
await page.click('#scrim', { position: { x: 20, y: 400 } }); await wait(400);
check(await page.locator('#drawer').isHidden(), 'tocar fuera cierra el perfil');
await page.click('#btnMe'); await wait(400); await page.keyboard.press('Escape'); await wait(400);
check(await page.locator('#drawer').isHidden(), 'Esc cierra el perfil');

// ---------- teclado ----------
await page.click('.logo'); await wait(300);
await page.evaluate(() => document.activeElement && document.activeElement.blur());
const t0 = await page.locator('.dash__title').textContent();
await page.keyboard.press('ArrowRight'); await wait(200);
check((await page.locator('.dash__title').textContent()) !== t0, 'flecha → cambia de juego');
await page.keyboard.press('e'); await wait(250); check((await hash()) === '#biblioteca', 'E pasa de pestaña');
await page.keyboard.press('q'); await wait(250); check((await hash()) === '#inicio', 'Q vuelve de pestaña');
await page.keyboard.press('/'); await wait(150);
check(await page.evaluate(() => document.activeElement.id === 'q'), '/ abre el buscador');
await page.keyboard.press('Escape'); await wait(150);
await page.evaluate(() => document.activeElement && document.activeElement.blur());
await page.keyboard.press('Enter'); await wait(500);
check(await page.locator('iframe.player__frame').count() === 1, 'Enter juega el elegido');

// ---------- celular ----------
const mob = await browser.newContext({ viewport: { width: 375, height: 760 }, isMobile: true, hasTouch: true });
await mob.addInitScript(() => { try { sessionStorage.setItem('ag_intro', '1'); } catch (e) { /* nada */ } });
const mp = await mob.newPage(); mp.on('pageerror', e => errors.push('móvil: ' + e.message));
await mp.goto(base); await mp.waitForTimeout(800);
for (const tabName of ['biblioteca', 'logros', 'inicio']) { await mp.tap(`.tabs a[data-tab=${tabName}]`); await mp.waitForTimeout(250); if ((await mp.evaluate(() => location.hash)) !== '#' + tabName) check(false, 'pestaña en celular ' + tabName); }
check(true, 'la barra de pestañas de abajo funciona en celular');
await mp.tap('#btnSearchMobile'); await mp.waitForTimeout(200);
check(await mp.isVisible('#q'), 'buscador en celular');
await mp.tap('#view', { position: { x: 180, y: 300 } }); await mp.waitForTimeout(400);
check(await mp.isVisible('#btnMe'), 'el buscador vacío se cierra al tocar fuera');
await mp.tap('#btnMe'); await mp.waitForTimeout(400);
check(await mp.locator('.drawer.is-open').count() === 1, 'perfil en celular');

check(errors.length === 0, 'sin errores en la consola' + (errors.length ? ':\n  ' + errors.join('\n  ') : ''));
await browser.close(); server.close();
console.log(fails ? `\n${fails} fallas` : '\nTodos los botones funcionan.');
process.exit(fails ? 1 : 0);
