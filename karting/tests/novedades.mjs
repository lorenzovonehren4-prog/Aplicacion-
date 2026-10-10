// Prueba de las novedades: bots que atacan y defienden con rebufo, pantalla dividida para 2 jugadores,
// repetición con cámaras de TV y editor de pistas. Uso: node tests/novedades.mjs [--shots]
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const out = path.join(root, 'tests', 'capturas');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const port = server.address().port;
const shot = process.argv.includes('--shots');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
let fails = 0;
const ok = (c, msg) => { console.log((c ? 'ok - ' : 'FALLA - ') + msg); if (!c) fails++; };
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => localStorage.setItem('kartodromo-save-v1', JSON.stringify({ v: 2, opt: { quality: 'baja', vol: 0.7, cam: 0, names: true, voice: true } })));
await page.goto(`http://localhost:${port}/index.html`);
await page.waitForFunction(() => document.body.classList.contains('ready'));

// ---------- 2 jugadores ----------
if (process.env.SOLO_EDITOR) { await page.evaluate(() => goTitle()); } else {
await page.click('[data-act=quick]');
await page.evaluate(() => { UI.sel.track = 't3'; UI.sel.players = 2; UI.sel.diff = 'dificil'; renderTracks(); });
ok(await page.isVisible('#plRow'), 'el selector tiene "Jugadores"');
await page.click('#btnGo');
await page.waitForFunction(() => R.on && document.body.classList.contains('ready'));
const info = await page.evaluate(() => ({ n: R.players.length, split: document.body.classList.contains('split'), karts: R.karts.length, pids: R.players.map(k => k.pid) }));
ok(info.n === 2 && info.split && info.karts === 6, 'carrera de 2 jugadores con pantalla dividida (' + JSON.stringify(info) + ')');
// (el navegador de prueba dibuja por software y es lento: la simulación se avanza a mano)
await page.evaluate(() => { while (R.state === 'countdown') updateRace(1 / 120, [INPUT, INPUT2]); });
await page.keyboard.down('KeyW'); await page.keyboard.down('ArrowUp');
const sp = await page.evaluate(() => { for (let i = 0; i < 240; i++) { updateInput(1 / 120); updateRace(1 / 120, [INPUT, INPUT2]); } return R.players.map(k => +k.p.fwd.toFixed(1)); });
await page.keyboard.up('KeyW'); await page.keyboard.up('ArrowUp');
await page.waitForTimeout(1500);
ok(sp[0] > 4 && sp[1] > 4, 'J1 (W) y J2 (flecha arriba) aceleran por separado: ' + sp.join(' / '));
if (shot) await page.screenshot({ path: path.join(out, 'n1-dos-jugadores.png'), timeout: 120000 });
// el resto de la carrera con piloto automático para los dos, midiendo rebufo y ataques
const res = await page.evaluate(async () => {
  let draft = 0, attack = 0, defend = 0;
  const t0 = performance.now();
  while (R.state !== 'results' && performance.now() - t0 < 90000) {
    for (let i = 0; i < 600 && R.state !== 'results'; i++) {
      updateRace(1 / 120, R.players.map(k => botInput(k, 1 / 120)));
      for (const k of R.karts) { draft = Math.max(draft, k.draft); if (k.ai.mode === 'attack') attack++; if (k.ai.mode === 'defend') defend++; }
    }
    handleEvents();
    await new Promise(r => setTimeout(r, 0));
  }
  return { state: R.state, draft, attack, defend, frames: R.rec.t.length, finished: R.players.map(k => k.finished) };
});
ok(res.state === 'results' && res.finished.every(Boolean), 'los dos jugadores terminan la carrera');
ok(res.draft > 0.3, 'hay rebufo detrás de otro kart (máx ' + res.draft.toFixed(2) + ')');
ok(res.attack > 0, 'los bots atacan por dentro (' + res.attack + ' pasos)');
ok(res.defend > 0, 'los bots defienden el interior (' + res.defend + ' pasos)');
ok(res.frames > 1000, 'se grabó la carrera (' + res.frames + ' cuadros)');
await page.waitForSelector('#results.on', { timeout: 10000 });
if (shot) await page.screenshot({ path: path.join(out, 'n2-resultados-2j.png'), timeout: 120000 });

// ---------- repetición ----------
await page.click('#resBtns >> text=Ver repetición');
await page.evaluate(() => { for (let i = 0; i < 90; i++) { updateReplay(1 / 30); updateCamera(1 / 30); } });
ok(await page.evaluate(() => UI.screen === 'replay' && RP.t > R.rec.t[0] + 2), 'la repetición avanza');
const tv = await page.evaluate(() => { const c = W.camera.position, k = R.karts[RP.target].mesh.position; return { d: c.distanceTo(k), fov: W.camera.fov }; });
ok(tv.d > 3 && tv.d < 120 && tv.fov < 66, 'cámara de TV al costado de la pista (a ' + tv.d.toFixed(1) + ' m, fov ' + tv.fov.toFixed(0) + ')');
await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
await page.evaluate(() => { for (let i = 0; i < 30; i++) { updateReplay(1 / 30); updateCamera(1 / 30); } });
await page.waitForTimeout(1500);
if (shot) await page.screenshot({ path: path.join(out, 'n3-repeticion-tv.png'), timeout: 120000 });
await page.keyboard.press('KeyC'); await page.keyboard.press('KeyC');
await page.evaluate(() => { for (let i = 0; i < 30; i++) { updateReplay(1 / 30); updateCamera(1 / 30); } });
await page.waitForTimeout(1500);
ok(await page.evaluate(() => RP.cam === 2), 'C cambia de cámara (helicóptero)');
if (shot) await page.screenshot({ path: path.join(out, 'n4-repeticion-heli.png'), timeout: 120000 });
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
ok(await page.evaluate(() => UI.screen === 'results'), 'Esc vuelve a los resultados');

}
// ---------- editor ----------
await page.evaluate(() => goTitle());
await page.click('[data-act=editor]');
await page.waitForTimeout(400);
ok(await page.evaluate(() => UI.screen === 'editor' && ED.ok), 'el editor abre con una pista válida');
ok(await page.isVisible('#edGuide'), 'la primera vez muestra la guía de 3 pasos');
if (shot) await page.screenshot({ path: path.join(out, 'n5a-editor-guia.png'), timeout: 120000 });
await page.click('#edGuideOk');
ok(await page.evaluate(() => document.querySelectorAll('#edShapes button').length === 6), 'hay 5 formas listas y el botón al azar');
// cada forma lista es válida
ok(await page.evaluate(() => Object.values(ED_SHAPES).every(s => { edLoadShape(s.make()); return ED.ok; })), 'todas las formas listas se pueden correr');
// al azar: siempre una pista válida
ok(await page.evaluate(() => { for (let i = 0; i < 3; i++) { edLoadShape(edRandomTrack()); if (!ED.ok) return false; } return true; }), 'el botón al azar crea pistas válidas');
// arreglar sola: una pista achicada hasta tener curvas imposibles
const fix = await page.evaluate(() => { edLoadShape(ED_SHAPES.zigzag.make()); for (let i = 0; i < 12; i++) edScale(1 / 1.1); edCheck(); const before = ED.ok; edAutoFix(); return [before, ED.ok && ED.res.length > 750]; });
ok(fix[0] === false && fix[1] === true, 'Arreglar sola corrige una pista con curvas demasiado cerradas');
await page.evaluate(() => { ED.def = edTemplate(); ED.sel = -1; edCheck(); edResize(); });
const n0 = await page.evaluate(() => ED.def.pts.length);
// clic entre dos puntos: agrega uno
const xy = await page.evaluate(() => { const [sx, sy] = edToScreen(56, -92), cv = $('edCanvas'), r = cv.getBoundingClientRect(); return [r.left + sx * r.width / cv.width, r.top + sy * r.height / cv.height]; });
await page.mouse.click(xy[0], xy[1]);
await page.waitForTimeout(300);
ok(await page.evaluate(n => ED.def.pts.length === n + 1, n0), 'clic agrega un punto');
// subir ese punto para hacer una rampa
for (let i = 0; i < 2; i++) await page.click('#edUp');
await page.waitForTimeout(300);
ok(await page.evaluate(() => ED.def.pts[ED.sel][2] === 2), '↑ sube el punto (rampa de 2 m)');
// un punto encima de otro tramo: la validación lo marca
const bad = await page.evaluate(async () => { const p = ED.def.pts[5]; const o = p.slice(); p[0] = -60; p[1] = -75; edCheck(); const r = ED.ok; ED.def.pts[5] = o; edCheck(); return [r, ED.ok]; });
ok(bad[0] === false && bad[1] === true, 'la validación avisa cuando dos tramos se tocan');
await page.fill('#edName', 'Prueba del editor');
await page.evaluate(() => edCheck());
if (shot) await page.screenshot({ path: path.join(out, 'n5-editor.png'), timeout: 120000 });
await page.click('#edTry');
await page.waitForFunction(() => R.on && document.body.classList.contains('ready'));
const ct = await page.evaluate(() => ({ custom: !!R.def.custom, title: R.def.title, saved: save.custom.length }));
ok(ct.custom && ct.title === 'Prueba del editor' && ct.saved === 1, 'Probar corre la pista hecha en el editor y queda guardada');
await page.evaluate(() => { while (R.state === 'countdown') updateRace(1 / 120, INPUT); for (let i = 0; i < 600; i++) updateRace(1 / 120, botInput(R.player, 1 / 120)); });
await page.waitForTimeout(2500);
if (shot) await page.screenshot({ path: path.join(out, 'n6-pista-propia.png'), timeout: 120000 });
await page.evaluate(() => goTitle());
await page.click('[data-act=quick]');
ok(await page.evaluate(() => [...document.querySelectorAll('#trkList .tcard')].some(b => b.textContent.includes('Prueba del editor'))), 'la pista propia aparece en el selector');

console.log(errors.length ? 'ERRORES:\n' + errors.join('\n') : 'sin errores');
await browser.close(); server.close();
process.exit(errors.length || fails ? 1 : 0);
