// Fotos para comparar los gráficos (antes / después) y medición de rendimiento de la escena.
// Uso: node tests/fotos-graficos.mjs <carpeta> [prefijo] [--baja] [--solo=menu,t1,...]
//   → <carpeta>/<prefijo>-<vista>.png y <carpeta>/<prefijo>-medidas.json
// Mide con renderer.info (triángulos, llamadas de dibujo) sumando todas las pasadas del cuadro.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const out = path.resolve(args.find(a => !a.startsWith('--')) || path.join(root, 'tests', 'capturas'));
const pre = args.filter(a => !a.startsWith('--'))[1] || 'foto';
const baja = args.includes('--baja');
const soloArg = args.find(a => a.startsWith('--solo='));
const solo = soloArg ? soloArg.slice(7).split(',') : null;
const want = n => !solo || solo.some(s => n.startsWith(s));
fs.mkdirSync(out, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
if (baja) await page.addInitScript(() => { try { const s = JSON.parse(localStorage.getItem('kartodromo-save-v1') || '{}'); s.opt = Object.assign({}, s.opt, { quality: 'baja' }); localStorage.setItem('kartodromo-save-v1', JSON.stringify(s)); } catch (e) {} });
await page.goto(`http://localhost:${server.address().port}/index.html`);
await page.waitForFunction(() => document.body.classList.contains('ready'));
await page.waitForTimeout(1200);
const medidas = {};
const snap = async name => { await page.screenshot({ path: path.join(out, `${pre}-${name}.png`) }); console.log('foto', name); };

// mide un cuadro: suma de todas las pasadas (escena + posprocesado) y cuenta objetos
async function medir(name) {
  medidas[name] = await page.evaluate(() => {
    const r = W.renderer, info = r.info;
    info.autoReset = false; info.reset();
    const gl = r.getContext();
    const t0 = performance.now();
    renderFrame(W.scene, W.camera); gl.finish();
    const ms = performance.now() - t0;
    const o = { calls: info.render.calls, triangles: info.render.triangles, points: info.render.points, lines: info.render.lines, programs: info.programs.length, geometries: info.memory.geometries, textures: info.memory.textures, msCuadroSoftware: +ms.toFixed(1) };
    info.autoReset = true;
    let meshes = 0, inst = 0, instN = 0, sprites = 0, lights = 0, shadowCasters = 0;
    W.scene.traverse(x => {
      if (!x.visible) return;
      if (x.isInstancedMesh) { inst++; instN += x.count; } else if (x.isMesh) meshes++;
      if (x.isSprite) sprites++;
      if (x.isLight) lights++;
      if ((x.isMesh || x.isInstancedMesh) && x.castShadow) shadowCasters++;
    });
    Object.assign(o, { meshes, instancedMeshes: inst, instances: instN, sprites, lights, shadowCasters, post: POST.on, shadows: r.shadowMap.enabled, pixelRatio: r.getPixelRatio() });
    return o;
  });
  console.log(name, JSON.stringify(medidas[name]));
}

// cámara manual: reemplaza updateCamera mientras se saca la foto
const camAt = (pos, look, fov) => page.evaluate(([pos, look, fov]) => {
  window.__cam = { pos, look, fov };
  if (!window.__origCam) { window.__origCam = updateCamera; window.updateCamera = dt => { if (window.__cam) { const c = W.camera; const P = window.__cam.pos, L = window.__cam.look; c.position.set(P[0], P[1], P[2]); c.lookAt(L[0], L[1], L[2]); c.fov = window.__cam.fov || 50; c.updateProjectionMatrix(); } else window.__origCam(dt); }; }
}, [pos, look, fov]);
const camOff = () => page.evaluate(() => { window.__cam = null; });

// ---------- menús ----------
if (want('menu')) { await snap('menu'); await medir('menu'); }
if (want('garaje')) {
  await page.click('[data-act=garage]'); await page.waitForTimeout(1500); await snap('garaje');
  // kart del garaje de cerca (casco y trompa)
  await camAt([1.2, 1.25, 2.0], [0, 0.55, 0], 40); await page.waitForTimeout(1200); await snap('garaje-cerca');
  await camOff();
  await page.evaluate(() => { goTitle(); });
  await page.waitForTimeout(400);
}
if (want('pistas')) { await page.click('[data-act=quick]'); await page.waitForTimeout(600); await snap('pistas'); await page.evaluate(() => goTitle()); await page.waitForTimeout(300); }

// ---------- carreras ----------
async function correr(id, time, segs) {
  await page.evaluate(([id, time]) => {
    if (R.on) endRace();
    UI.mode = 'quick'; UI.sel.track = id; UI.sel.diff = 'normal'; UI.sel.laps = 3; UI.sel.format = 'race'; UI.sel.players = 1; UI.sel.time = time || null;
    go();
  }, [id, time]);
  await page.waitForFunction(() => R.on && UI.screen === 'hud' && document.body.classList.contains('ready'));
  await page.waitForTimeout(600);
  // simula con piloto automático hasta el tiempo pedido de carrera (después del semáforo)
  await page.evaluate(segs => {
    const quieto = () => ({ throttle: 0, brake: 0, steer: 0, handbrake: false, kSteer: 0 });
    const step = (n) => { for (let i = 0; i < n; i++) updateRace(1 / 120, [R.state === 'countdown' ? quieto() : botInput(R.player, 1 / 120), quieto()]); };
    let g = 0; while (R.state === 'countdown' && g++ < 2000) step(1);
    step(Math.round(segs * 120));
    R.events.length = 0;
    CAMS.forEach(c => c.snap = true);
  }, segs);
}
// congela la simulación (para que las fotos salgan igual) y deja correr solo el dibujo
const congelar = () => page.evaluate(() => { UI.paused = true; });

const pistas = [
  ['t1', null, 'galpon-azul'], ['t2', null, 'fabrica'], ['t3', 'mediodia', 'parque'], ['t4', null, 'noche-ciudad'],
  ['t5', 'atardecer', 'dunas'], ['t6', null, 'neon'], ['t7', 'manana', 'cerro'], ['t8', null, 'estacionamiento'],
];
for (const [id, time, nom] of pistas) {
  const name = id + '-' + nom;
  if (!want(id + '-') && !want(name)) continue;
  await correr(id, time, id === 't1' ? 2.5 : 4);
  await congelar();
  await page.evaluate(() => { show('hud'); });
  await page.waitForTimeout(1500);
  await snap(name);
  if (id === 't1') await medir('carrera-t1');
  if (id === 't3') await medir('carrera-t3');
  if (id === 't4') await medir('carrera-t4');
  if (id === 't1') {
    // largada: karts en la grilla vistos desde un costado (personajes y karts de cerca)
    const p = await page.evaluate(() => { const k = R.karts.find(o => o !== R.player) || R.player; return [k.p.x, k.p.y, k.p.z, k.p.h]; });
    const [x, y, z, h] = p;
    const fx = Math.sin(h), fz = Math.cos(h), rx = -Math.cos(h), rz = Math.sin(h);
    await camAt([x + fx * 2.2 + rx * 1.6, y + 1.1, z + fz * 2.2 + rz * 1.6], [x, y + 0.45, z], 45);
    await page.waitForTimeout(1500); await snap('kart-cerca-frente');
    await camAt([x - fx * 2.4 - rx * 1.4, y + 1.3, z - fz * 2.4 - rz * 1.4], [x, y + 0.5, z], 45);
    await page.waitForTimeout(1500); await snap('kart-cerca-atras');
    await camAt([x + rx * 0.9 + fx * 0.6, y + 1.05, z + rz * 0.9 + fz * 0.6], [x, y + 0.9, z - 0.15 * fz], 40);
    await page.waitForTimeout(1500); await snap('piloto-cerca');
    // tribuna con público
    const st = await page.evaluate(() => (W.stands || [])[0] || null);
    if (st) {
      const T0 = await page.evaluate(() => [R.T.px[Math.round(R.T.N * 0.03)], R.T.pz[Math.round(R.T.N * 0.03)]]);
      await camAt([T0[0] + (T0[0] - st.x) * 0.2, 2.2, T0[1] + (T0[1] - st.z) * 0.2], [st.x, 3.2, st.z], 55);
      await page.waitForTimeout(1500); await snap('tribuna');
    }
    // vista aérea del galpón
    await camAt([x + 40, 30, z + 40], [x, 0, z], 55);
    await page.waitForTimeout(1500); await snap('t1-aerea');
    await camOff();
    // cámara a bordo
    await page.evaluate(() => { UI.camMode = 2; CAMS.forEach(c => c.snap = true); });
    await page.waitForTimeout(1500); await snap('t1-a-bordo');
    await page.evaluate(() => { UI.camMode = save.opt.cam | 0; });
  }
  if (id === 't3') {
    // la misma pista de noche
    await page.evaluate(() => { applyTime('noche'); });
    await page.waitForTimeout(1500); await snap('t3-parque-noche');
    // humo y chispas: kart derrapando contra la barrera
    await page.evaluate(() => {
      UI.paused = false;
      const k = R.player; for (let n = 0; n < 30; n++) { FX.sparks(k.p.x + 0.6, k.p.z, 6, k.p.y); FX.skid(k, 4); }
      UI.paused = true;
    });
    await page.evaluate(() => { applyTime('mediodia'); });
    await page.waitForTimeout(1200); await snap('t3-efectos');
  }
  await page.evaluate(() => { UI.paused = false; });
}
// resultados
if (want('resultados')) {
  await correr('t1', null, 1);
  await page.evaluate(() => {
    const t0 = performance.now();
    while (R.state !== 'results' && performance.now() - t0 < 60000) for (let i = 0; i < 600 && R.state !== 'results'; i++) updateRace(1 / 120, [R.state === 'countdown' ? { throttle: 0, brake: 0, steer: 0 } : botInput(R.player, 1 / 120), { throttle: 0, brake: 0, steer: 0 }]);
  });
  await page.waitForTimeout(2500); await snap('resultados');
}
fs.writeFileSync(path.join(out, `${pre}-medidas.json`), JSON.stringify(medidas, null, 2));
console.log(errors.length ? 'ERRORES:\n' + errors.join('\n') : 'sin errores');
await browser.close(); server.close();
process.exit(errors.length ? 1 : 0);
