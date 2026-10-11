// Prueba del portal Anonymous Games: inicio, búsqueda, categorías, página de juego,
// reproductor (iframe), favoritos, perfil e insignias. Sin errores en la consola.
// Uso: node portal/tests/portal.mjs [--shots]   (capturas en portal/tests/capturas/)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const out = path.join(root, 'portal', 'tests', 'capturas');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!f.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const port = server.address().port;
const shots = process.argv.includes('--shots');
const shot = async (page, name) => { if (shots) await page.screenshot({ path: path.join(out, name) }); };

let fails = 0;
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FALLA') + ' ' + what); if (!ok) fails++; };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 820 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const base = `http://localhost:${port}/index.html`;

await page.goto(base);
check(await page.isVisible('#intro'), 'la intro aparece la primera vez');
await page.waitForSelector('#intro', { state: 'detached', timeout: 6000 });
await page.waitForTimeout(600);
await shot(page, 'portal-1-inicio.png');
check(await page.locator('.shelf .gcard[data-sel]').count() === 13, 'los 13 juegos en el estante del menú');
check(await page.locator('.gcard.is-sel').count() === 1, 'hay un juego elegido');
check(await page.locator('.tile--soon, .soon__q').count() === 0, 'sin fichas de "Próximamente"');
// teclado: flecha derecha cambia el juego elegido y el título grande
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);
check(await page.locator('.dash__title').textContent() === 'Kartódromo', 'la flecha → elige el siguiente juego');
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(300);
check(await page.locator('.dash__title').textContent() === 'Ápice GP', 'la flecha ← vuelve');
await shot(page, 'portal-1b-menu.png');
check(await page.isVisible('#btnMe'), 'botón de perfil arriba a la derecha');
const meBox = await page.locator('#btnMe').boundingBox();
check(meBox.x + meBox.width > 1366 - 40 && meBox.y < 20, 'el botón de perfil está pegado a la esquina superior derecha');

// insignia de bienvenida
await page.waitForSelector('.toast.ach', { timeout: 5000 });
check(true, 'aviso de insignia "Sin rostro"');

// búsqueda
await page.keyboard.press('/');
await page.keyboard.type('karts');
await page.waitForTimeout(200);
check(await page.locator('.lcard[data-tile]').count() === 1, 'buscar "karts" abre la biblioteca con sólo el Kartódromo');
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
check(await page.locator('.lcard[data-tile]').count() === 13, 'Esc limpia la búsqueda');

// categorías
await page.click('[data-cat=puzzles]');
check(await page.locator('.lcard[data-tile]').count() === 1, 'categoría Puzzles');
await page.click('[data-cat=favs]');
check(await page.isVisible('.empty'), 'favoritos vacío muestra aviso');
await page.click('[data-cat=todos]');

// pestañas
await page.keyboard.press('e');
await page.waitForTimeout(300);
check(await page.locator('.achgrid .ach').count() > 10, 'E pasa a la pestaña Logros');
await page.click('.tabs a[data-tab=biblioteca]');
await page.waitForTimeout(300);

// el botón de about:blank (arriba a la derecha)
const bb = await page.locator('#btnBlank').boundingBox();
check(bb && bb.y < 20 && bb.x > 700, 'botón about:blank arriba a la derecha');
const [tab] = await Promise.all([ctx.waitForEvent('page'), page.click('#btnBlank')]);
await tab.waitForLoadState();
check(tab.url() === 'about:blank' && await tab.title() === 'Classes', 'abre una pestaña about:blank titulada "Classes"');
check(/index\.html#biblioteca$/.test(await tab.locator('iframe').getAttribute('src')), 'con el portal adentro');
await tab.close();

// hover en ficha
await page.hover('.lcard[data-tile=karting]');
await page.waitForTimeout(600);
await shot(page, 'portal-2-hover.png');

// página de juego
await page.click('.lcard[data-tile=mind-escape]');
await page.waitForSelector('.game');
check(await page.isVisible('#btnPlay'), 'página de juego con botón Jugar');
await shot(page, 'portal-3-juego.png');
await page.click('[data-fav="mind-escape"]');
check(await page.getAttribute('[data-fav="mind-escape"]', 'aria-pressed') === 'true', 'marcar favorito');
await page.click('#btnPlay');
await page.waitForSelector('iframe.player__frame');
const frame = page.frameLocator('iframe.player__frame');
await frame.locator('#app').waitFor({ timeout: 15000 });
await page.waitForTimeout(2500);
check(await page.locator('#load').isHidden(), 'el juego cargó dentro del reproductor');
await shot(page, 'portal-4-jugando.png');
const plays = await page.evaluate(() => JSON.parse(localStorage.getItem('anonymousGames_v1')).stats['mind-escape'].plays);
check(plays === 1, 'cuenta la partida');

// volver al inicio: sigue jugando + favorito
await page.click('.logo');
await page.waitForSelector('.cont');
check(await page.locator('.cont').count() === 1, '"Sigue jugando" muestra el juego abierto');
check(await page.locator('#card-mind-escape .gcard__fav').count() === 1, 'la carta del estante muestra el corazón de favorito');
// (con el mouse, pasar por encima elige la carta y un clic la juega)
await page.locator('#card-fuga-urbana').hover();
await page.waitForTimeout(300);
check(await page.locator('.dash__title').textContent() === 'Fuga Urbana', 'pasar el mouse por una carta la elige');
await page.locator('#card-fuga-urbana').click();
await page.waitForSelector('iframe.player__frame');
check(page.url().endsWith('#juego-fuga-urbana'), 'clic en la carta elegida abre y arranca el juego');
await page.goto(base + '#inicio');

// perfil
await page.click('#btnMe');
await page.waitForSelector('.drawer.is-open');
await page.click('[data-av="4"]');
await page.fill('#inName', 'ElZorro');
await page.waitForTimeout(400);
check(await page.locator('#meName').textContent() === 'ElZorro', 'cambiar el nombre se ve en el botón de perfil');
await shot(page, 'portal-5-perfil.png');
const ach = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('anonymousGames_v1')).ach));
check(['hola', 'primera', 'identidad', 'flechado', 'fantasma'].every(a => ach.includes(a)), 'insignias: ' + ach.join(', '));
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
check(await page.locator('#drawer').isHidden(), 'Esc cierra el perfil');

// Ápice GP: el portal no debe crear su base de datos si no existe
const dbs0 = await page.evaluate(async () => (await indexedDB.databases()).map(d => d.name));
check(!dbs0.includes('apice-gp'), 'el portal no crea la base de Ápice GP por su cuenta');
// y si existe (como la deja el juego), la lee
await page.evaluate(() => new Promise(res => {
  const rq = indexedDB.open('apice-gp', 1);
  rq.onupgradeneeded = () => rq.result.createObjectStore('kv');
  rq.onsuccess = () => { const db = rq.result; const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put({ progression: { level: 4 }, stats: { races: 5, wins: 2, podiums: 3, distanceKm: 41.7 } }, 'save'); tx.oncomplete = () => { db.close(); res(); }; };
}));

// progreso leído del guardado de los juegos
await page.evaluate(() => {
  localStorage.setItem('kartodromo-save-v1', JSON.stringify({ xp: 450, coins: 320, stats: { races: 6, wins: 2, podiums: 4, cups: 1 } }));
  localStorage.setItem('sazon_tycoon_v1', JSON.stringify({ started: true, day: 7, money: 5230, level: 4, rating: 4.4, chain: [{}, {}] }));
});
await page.reload();
await page.waitForTimeout(3500);
await page.goto(base + '#biblioteca'); await page.waitForTimeout(500);
const kart = await page.locator('.lcard[data-tile=karting] .lcard__cap small').textContent();
check(/Piloto nivel 3/.test(kart), 'la ficha del Kartódromo lee el guardado: ' + kart);
const apice = await page.locator('.lcard[data-tile=apice-gp] .lcard__cap small').textContent();
check(/Nivel 4 · 2 victorias/.test(apice), 'la ficha de Ápice GP lee IndexedDB: ' + apice);
const ach2 = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('anonymousGames_v1')).ach));
check(['podio', 'copa', 'chef', 'cadena', 'bandera'].every(a => ach2.includes(a)), 'insignias de los juegos: ' + ach2.join(', '));
check(!(await page.isVisible('#intro')), 'la intro no se repite en la misma sesión');
await shot(page, 'portal-6-progreso.png');

// celular
const mob = await browser.newContext({ viewport: { width: 375, height: 760 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const mp = await mob.newPage();
mp.on('pageerror', e => errors.push('móvil: ' + e.message));
await mp.goto(base);
await mp.waitForSelector('#intro', { state: 'detached', timeout: 6000 });
await mp.waitForTimeout(500);
const sw = await mp.evaluate(() => document.documentElement.scrollWidth);
check(sw <= 375, 'sin scroll horizontal en celular (' + sw + ' px)');
await shot(mp, 'portal-7-movil.png');
await mp.evaluate(() => window.scrollTo(0, 560));
await mp.waitForTimeout(400);
await shot(mp, 'portal-8-movil-grilla.png');
await mp.tap('#btnSearchMobile');
check(await mp.isVisible('#q'), 'el buscador se abre en celular');
await mp.goto(base + '#juego-karting');
await mp.reload();
await mp.waitForTimeout(700);
const sw2 = await mp.evaluate(() => document.documentElement.scrollWidth);
check(sw2 <= 375, 'página de juego sin scroll horizontal en celular (' + sw2 + ' px)');
await shot(mp, 'portal-9-movil-juego.png');

check(errors.length === 0, 'sin errores en la consola' + (errors.length ? ':\n  ' + errors.join('\n  ') : ''));
await browser.close(); server.close();
console.log(fails ? `\n${fails} fallas` : '\nTodo en verde.');
process.exit(fails ? 1 : 0);
