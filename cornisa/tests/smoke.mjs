// Prueba de humo de Cornisa: abre el juego, maneja cada montaña con piloto automático
// (avanzando la simulación a mano), prueba la caída y saca capturas.
// Uso: node tests/smoke.mjs [--shots] [ids…]   (CHROMIUM_PATH en contenedores)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const out = path.join(root, 'tests', 'capturas');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const shots = process.argv.includes('--shots');
const ids = process.argv.slice(2).filter(a => !a.startsWith('--')).map(Number);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: Number(process.env.W || 1280), height: Number(process.env.H || 720) } });
page.setDefaultTimeout(120000);
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${server.address().port}/index.html?upg=${process.env.UPG || 0}`);
await page.waitForFunction(() => document.body.classList.contains('ready'));
await page.waitForTimeout(1500);
const shot = async n => { if (shots) await page.screenshot({ path: path.join(out, n + '.png') }); };
await shot('0-intro');
await page.keyboard.press('Enter');
await page.waitForTimeout(1200);
await shot('1-menu');

// piloto automático: frena antes de las curvas y apunta al eje
await page.evaluate(() => {
  window.auto = (C, T, st) => {
    const v = Math.max(1, C.f);
    let need = st.top;
    for (let a = 0; a < 140; a += 3) {
      const k = Math.abs(T.k[Math.min(T.n - 1, Math.round(C.s + a))]);
      if (k < 1e-4) continue;
      const vc = Math.sqrt(st.grip * T.L.grip * 9.8 * 0.82 / k);
      const vmax = Math.sqrt(vc * vc + 2 * st.brake * 0.7 * Math.max(0, a - 4));
      need = Math.min(need, vmax);
    }
    const look = Math.max(6, v * 0.55);
    let tgt = 0;
    const rk = T.rocks.find(r => r.s > C.s - 2 && r.s < C.s + 70);
    if (rk) { tgt = rk.d > 0 ? rk.d - rk.rad - 1.7 : rk.d + rk.rad + 1.7; tgt = Math.max(-T.hw + 1, Math.min(T.hw - 1, tgt)); }
    const p = roadPoint(T, C.s + look, tgt);
    const dx = p.x - C.x, dz = p.z - C.z;
    let ang = Math.atan2(dx, dz) - C.h;
    while (ang > Math.PI) ang -= 2 * Math.PI; while (ang < -Math.PI) ang += 2 * Math.PI;
    return { thr: v < need - 0.5 ? 1 : 0, brk: v > need + 1.5 ? 1 : 0, steer: Math.max(-1, Math.min(1, -ang * 3)) };
  };
  window.runAuto = (secs) => {
    const dt = 1 / 120;
    for (let i = 0; i < secs * 120; i++) {
      if (G.mode === 'count') { G.mode = 'drive'; }
      if (G.mode !== 'drive' && G.mode !== 'fall' && G.mode !== 'finish') break;
      if (G.mode === 'drive') {
        const a = auto(G.C, G.T, G.st);
        inp.steer += Math.max(-dt * 4, Math.min(dt * 4, a.steer - inp.steer));
        KEYS.ArrowUp = !!a.thr; KEYS.ArrowDown = !!a.brk;
        KEYS.ArrowLeft = inp.steer < -0.05 && a.steer < inp.steer; KEYS.ArrowRight = false;
        // dirección directa (sin el filtro del teclado)
        const C = G.C;
        G.time += dt;
        stepCar(C, { thr: a.thr, brk: a.brk, steer: inp.steer }, G.T, G.st, dt, onCarEvent);
        C.steer = inp.steer;
        if (G.mode === 'drive') { pickCoins(); hitRocks(); }
        if (C.hp <= 0) { endRun(false, 'Tu carro quedó destrozado'); break; }
        if (C.s >= G.T.n - 45) { G.mode = 'finish'; G.endT = 0; onFinish(); }
      } else simulate(dt);
    }
    KEYS.ArrowUp = KEYS.ArrowDown = KEYS.ArrowLeft = false;
    return { mode: G.mode, s: Math.round(G.C.s), n: G.T.n, t: +G.time.toFixed(1), coins: G.coins, total: G.T.coins.length, hits: G.C.hits, hp: Math.round(G.C.hp), kmh: Math.round(G.C.f * 3.6) };
  };
});

const levels = ids.length ? ids : [1, 2, 3, 4, 5, 6, 7, 8];
for (const id of levels) {
  await page.evaluate(id => { const u = +(new URLSearchParams(location.search).get('upg') || 0); save.upg = { motor: u, frenos: u, llantas: u, chasis: u }; startRun(LEVELS.find(l => l.id === id)); }, id);
  await page.waitForTimeout(300);
  await page.evaluate(() => runAuto(3.2));
  await page.evaluate(() => runAuto(18));
  await page.waitForTimeout(600);
  await shot(`2-nivel${id}-cabina`);
  if (id === 1 || id === 8) {
    await page.evaluate(() => { G.cam = 'afuera'; setCam(); });
    await page.waitForTimeout(600);
    await shot(`3-nivel${id}-afuera`);
    await page.evaluate(() => { G.cam = 'cabina'; setCam(); });
  }
  const r = await page.evaluate(() => runAuto(400));
  await page.evaluate(() => runAuto(4));
  const L = await page.evaluate(id => { const L = LEVELS.find(l => l.id === id); return { obj: L.obj, len: L.len }; }, id);
  console.log(`nivel ${id}:`, JSON.stringify(r), 'objetivos', JSON.stringify(L.obj.filter(o => o.t !== 'finish')));
  await page.waitForTimeout(900);
  if (id === 1) await shot('4-resultado');
}

// caída: girar hacia el abismo
await page.evaluate(() => { startRun(LEVELS[1]); G.mode = 'drive'; });
const fell = await page.evaluate(() => {
  const T = G.T; let s0 = T.runs.find(r => r.ty === 'L' || r.ty === 'R');
  const side = s0.ty === 'L' ? -1 : 1;
  T.gL.fill(0); T.gR.fill(0);
  const p = roadPoint(T, s0.s + 40, 0);
  Object.assign(G.C, { x: p.x, z: p.z, h: p.h - side * 0.5, vx: Math.sin(p.h - side * 0.5) * 15, vz: Math.cos(p.h - side * 0.5) * 15, s: s0.s + 40, i: s0.s + 40 });
  for (let i = 0; i < 120 * 2; i++) { stepCar(G.C, { thr: 1, brk: 0, steer: 0 }, T, G.st, 1 / 120, onCarEvent); if (G.mode === 'fall') break; }
  return G.mode;
});
await page.waitForTimeout(1500);
await shot('5-caida');
await page.evaluate(() => { for (let i = 0; i < 400; i++) simulate(1 / 120); });
await page.waitForTimeout(800);
await shot('6-perdiste');
console.log('caída:', fell, await page.evaluate(() => G.mode));
await page.evaluate(() => { act('menu'); act('garage'); });
await page.waitForTimeout(1200);
await shot('7-taller');
await page.evaluate(() => { act('play'); });
await page.waitForTimeout(600);
await shot('8-mapa');
console.log(errors.length ? 'ERRORES:\n' + errors.join('\n') : 'sin errores');
await browser.close(); server.close();
process.exit(errors.length ? 1 : 0);
