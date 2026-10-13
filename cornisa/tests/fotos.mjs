// Fotos para comparar el antes y el después de los gráficos, y medida del rendimiento.
// Saca menú, las 8 montañas (cabina y afuera), el 4x4 de cerca, la cabina, efectos y celular.
// Uso: CHROMIUM_PATH=... OUT=carpeta PRE=antes node tests/fotos.mjs [--perf] [--solo=n1,n2]
//   OUT: dónde guardar (por defecto tests/capturas), PRE: prefijo de los archivos (por defecto "foto").
//   --perf: además mide triángulos, llamadas de dibujo, mallas y tiempo por cuadro (gráficos altos y bajos).
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(new URL('..', import.meta.url).pathname);
const out = process.env.OUT || path.join(root, 'tests', 'capturas'), PRE = process.env.PRE || 'foto';
fs.mkdirSync(out, { recursive: true });
const perf = process.argv.includes('--perf');
const solo = (process.argv.find(a => a.startsWith('--solo=')) || '').slice(7).split(',').filter(Boolean);
const want = n => !solo.length || solo.some(s => n.includes(s));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => { const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); }).listen(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const open = async (w, h) => {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.setDefaultTimeout(240000);
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://localhost:${server.address().port}/index.html`);
  await page.waitForFunction(() => document.body.classList.contains('ready'));
  await page.evaluate(() => {
    save.opt.copi = false; save.opt.sound = false;
    // piloto automático para las fotos manejando (sigue la línea a la velocidad recomendada)
    window.autoInput = dt => { const a = aiInput(G.C, G.T, G.prof); inp.steer += Math.max(-dt * 5, Math.min(dt * 5, a.steer - inp.steer)); inp.thr = a.thr; inp.brk = a.brk; return inp; };
    window.readInput = window.autoInput;
    // avanza la partida `secs` segundos de una vez (sin dibujar)
    window.ff = secs => { for (let i = 0; i < secs * 120; i++) { if (G.mode === 'count') G.mode = 'drive'; if (G.mode !== 'drive') break; simulate(1 / 120); } for (let i = 0; i < 20; i++) updateWorld(G.t += 1 / 60, 1 / 60); };
    window.freeCam = (x, y, z, tx, ty, tz) => { window.updateCamera = () => {}; W.scene.attach(W.camera); W.camera.position.set(x, y, z); W.camera.lookAt(tx, ty, tz); };
  });
  return page;
};
const shot = (page, n) => want(n) ? page.screenshot({ path: path.join(out, `${PRE}-${n}.png`) }) : null;
const hideUI = page => page.addStyleTag({ content: 'body.sinui .screen,body.sinui #toast,body.sinui #count,body.sinui .warn,body.sinui #nav,body.sinui .cue,body.sinui #touch{display:none!important}' });

// ---------- compu: menús ----------
let page = await open(1280, 720);
await hideUI(page);
await page.waitForTimeout(2600);
await shot(page, '01-intro');
await page.evaluate(() => { save.lv[1] = { stars: [true, true, false], best: 70, done: true }; save.lv[2] = { stars: [true, false, false], best: 90, done: true }; save.coins = 460; save.upg.motor = 1; leaveIntro(); });
await page.evaluate(() => { for (let i = 0; i < 300; i++) attractStep(1 / 60); G.attractT = 0.5; });
await page.waitForTimeout(2500);
await shot(page, '02-menu');
await page.evaluate(() => act('play')); await page.waitForTimeout(1200);
await shot(page, '03-mapa');
await page.evaluate(() => openDetail(2)); await page.waitForTimeout(1200);
await shot(page, '04-detalle');
await page.evaluate(() => act('menu')); await page.waitForTimeout(1500);
await page.evaluate(() => act('garage')); await page.waitForTimeout(4500);
await shot(page, '05-taller');

// ---------- las 8 montañas manejando ----------
const VIEWS = [[1, 'cabina', 22], [1, 'afuera', 30], [2, 'afuera', 24], [3, 'cabina', 26], [4, 'afuera', 20], [5, 'afuera', 30], [6, 'cabina', 24], [6, 'afuera', 34], [7, 'cabina', 22], [8, 'afuera', 26]];
for (const [id, cam, secs] of VIEWS) {
  const n = `10-nivel${id}-${cam}`;
  if (!want(n)) continue;
  await page.evaluate(([id, cam, secs]) => {
    save.opt.cam = cam; startRun(LEVELS.find(l => l.id === id)); G.mode = 'drive'; G.cam = cam; setCam();
    ff(secs); hud();
  }, [id, cam, secs]);
  await page.waitForTimeout(2200);
  await shot(page, n);
}

// ---------- el 4x4 de cerca (sin interfaz) ----------
await page.evaluate(() => document.body.classList.add('sinui'));
const carShot = async (n, lv, rel) => {
  if (!want(n)) return;
  await page.evaluate(([lv, rel]) => {
    startRun(LEVELS.find(l => l.id === lv)); G.mode = 'drive'; G.cam = 'afuera'; setCam(); ff(4);
    G.mode = 'pause'; const C = G.C, fx = Math.sin(C.h), fz = Math.cos(C.h), rx = -fz, rz = fx;
    // rel = [adelante, derecha, alto] respecto al carro
    freeCam(C.x + fx * rel[0] + rx * rel[1], C.y + rel[2], C.z + fz * rel[0] + rz * rel[1], C.x + fx * 0.2, C.y + 0.9, C.z + fz * 0.2);
  }, [lv, rel]);
  await page.waitForTimeout(2200);
  await shot(page, n);
};
await carShot('20-carro-frente', 1, [5.2, -3.2, 1.6]);
await carShot('21-carro-atras', 2, [-5.0, 3.0, 2.0]);
await carShot('22-carro-lado', 1, [0.3, -5.6, 1.2]);
await carShot('23-carro-noche', 6, [6.5, -2.5, 1.5]);
await carShot('24-carro-rueda', 1, [1.6, -2.2, 0.6]);
// cabina vista desde el asiento del copiloto (volante, manos, relojes)
if (want('25-cabina-cerca')) {
  await page.evaluate(() => {
    startRun(LEVELS[0]); G.mode = 'drive'; G.cam = 'cabina'; setCam(); ff(8); G.mode = 'pause';
    window.updateCamera = () => {}; const cam = W.camera; G.car.body.add(cam); cam.position.set(-0.25, 1.62, -0.35); cam.rotation.set(-0.3, Math.PI + 0.55, 0, 'YXZ');
  });
  await page.waitForTimeout(2200);
  await shot(page, '25-cabina-cerca');
}
await page.evaluate(() => document.body.classList.remove('sinui'));
await page.close();

// ---------- efectos: choque, caída, meta y resultado ----------
page = await open(1280, 720);
await page.evaluate(() => leaveIntro());
if (want('30-choque')) {
  await page.evaluate(() => {
    startRun(LEVELS[0]); G.mode = 'drive'; G.cam = 'afuera'; setCam();
    const T = G.T, run = T.runs.find(r => r.ty === 'C' && r.s > 50) || T.runs[0];
    const s = run.s + 30, p = roadPoint(T, s, 0), h = p.h + 0.5;
    Object.assign(G.C, { x: p.x, z: p.z, h, vx: Math.sin(h) * 44, vz: Math.cos(h) * 44, s, i: s });
    for (let i = 0; i < 240 && G.mode === 'drive'; i++) stepCar(G.C, { thr: 1, brk: 0, steer: 0 }, T, G.st, 1 / 120, onCarEvent);
  });
  await page.waitForTimeout(700);
  await page.evaluate(() => { for (let i = 0; i < 90; i++) { simulate(1 / 30); updateWorld(G.t += 1 / 30, 1 / 30); } });
  await page.waitForTimeout(1500);
  await shot(page, '30-choque');
}
if (want('31-caida')) {
  await page.evaluate(() => {
    startRun(LEVELS[1]); G.mode = 'drive';
    const T = G.T, r = T.runs.find(x => x.ty === 'L' || x.ty === 'R'), side = r.ty === 'L' ? -1 : 1;
    T.gL.fill(0); T.gR.fill(0);
    const s = r.s + 40, p = roadPoint(T, s, 0), h = p.h - side * 0.5;
    Object.assign(G.C, { x: p.x, z: p.z, h, vx: Math.sin(h) * 20, vz: Math.cos(h) * 20, s, i: s });
    for (let i = 0; i < 240 && G.mode === 'drive'; i++) stepCar(G.C, { thr: 1, brk: 0, steer: 0 }, T, G.st, 1 / 120, onCarEvent);
    for (let i = 0; i < 400 && !G.boom; i++) simulate(1 / 60);
    for (let i = 0; i < 10; i++) updateWorld(G.t += 1 / 30, 1 / 30);
  });
  await page.waitForTimeout(1500);
  await shot(page, '31-caida');
}
if (want('32-meta')) {
  await page.evaluate(() => {
    startRun(LEVELS[0]); G.mode = 'drive';
    const T = G.T, s = T.n - 47, p = roadPoint(T, s, 0);
    Object.assign(G.C, { x: p.x, z: p.z, h: p.h, vx: Math.sin(p.h) * 20, vz: Math.cos(p.h) * 20, s, i: s });
    for (let i = 0; i < 60; i++) simulate(1 / 60);
    for (let i = 0; i < 70; i++) { simulate(1 / 60); updateWorld(G.t += 1 / 60, 1 / 60); }
  });
  await page.waitForTimeout(1500);
  await shot(page, '32-meta');
  await page.evaluate(() => { for (let i = 0; i < 300 && G.mode !== 'result'; i++) simulate(1 / 30); });
  await page.waitForTimeout(2600);
  await shot(page, '33-resultado');
}

// ---------- rendimiento ----------
if (perf) {
  const medir = async (q, cam) => page.evaluate(async ([q, cam]) => {
    save.opt.quality = q; applyQuality(); resizeWorld();
    save.opt.cam = cam; startRun(LEVELS[1]); G.mode = 'drive'; G.cam = cam; setCam(); ff(20);
    const r = W.renderer, gl = r.getContext();
    // deja que los materiales compilen
    const px = new Uint8Array(4), sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    for (let i = 0; i < 8; i++) { step(1 / 60); sync(); }
    r.info.autoReset = false;
    r.info.reset(); r.render(W.scene, W.camera); gl.finish();
    const scene = { tri: r.info.render.triangles, calls: r.info.render.calls };
    r.info.reset(); renderFrame(W.scene, W.camera); gl.finish();
    const total = { tri: r.info.render.triangles, calls: r.info.render.calls };
    r.info.autoReset = true;
    let meshes = 0, visibles = 0, inst = 0, carTri = 0;
    W.scene.traverse(o => { if (o.isMesh || o.isPoints || o.isLine) { meshes++; if (o.visible) visibles++; if (o.isInstancedMesh) inst += o.count; } });
    G.car.root.traverse(o => { if (o.isMesh && o.geometry) { const g = o.geometry; carTri += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
    const t0 = performance.now(); for (let i = 0; i < 12; i++) { step(1 / 60); sync(); } const ms = (performance.now() - t0) / 12;
    // sólo la lógica (sin dibujar)
    const t1 = performance.now(); for (let i = 0; i < 60; i++) { simulate(1 / 60); updateWorld(G.t += 1 / 60, 1 / 60); hud(); } const js = (performance.now() - t1) / 60;
    return { calidad: q, cam, pr: r.getPixelRatio(), post: POST.on, sombras: r.shadowMap.enabled, escena: scene, cuadro_total: total, mallas: meshes, instancias: inst, tri_carro: Math.round(carTri), programas: r.info.programs.length, geometrias: r.info.memory.geometries, texturas: r.info.memory.textures, ms_por_cuadro_swiftshader: +ms.toFixed(1), ms_logica: +js.toFixed(2) };
  }, [q, cam]);
  for (const q of ['alta', 'baja']) for (const cam of ['cabina', 'afuera']) console.log(JSON.stringify(await medir(q, cam)));
}
await page.close();

// ---------- celular en vertical ----------
if (want('40-movil')) {
  page = await open(390, 844);
  await page.evaluate(() => { leaveIntro(); save.opt.cam = 'cabina'; startRun(LEVELS[2]); G.mode = 'drive'; G.cam = 'cabina'; setCam(); ff(22); hud(); });
  await page.waitForTimeout(2500);
  await shot(page, '40-movil');
  await page.close();
}
console.log(errors.length ? errors : 'sin errores');
await browser.close(); server.close();
