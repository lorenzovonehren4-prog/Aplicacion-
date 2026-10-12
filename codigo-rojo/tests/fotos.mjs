// Fotos de revisión y medición de rendimiento de Código Rojo (para comparar antes y después
// de cambios gráficos): menú, partida de día, de tarde y de noche, cabina, carros y personas de
// cerca, carro dañado, vista aérea, gráficos medios y bajos, garaje y resultado.
// Uso: CHROMIUM_PATH=... node tests/fotos.mjs [carpeta] [prefijo] [solo=a,b,c]
//   → <carpeta>/<prefijo>-<vista>.png y <carpeta>/<prefijo>-rendimiento.json
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const [outDir = path.join(root, 'tests', 'capturas'), prefix = 'foto', onlyArg] = process.argv.slice(2);
const only = onlyArg ? onlyArg.replace(/^solo=/, '').split(',') : null;
fs.mkdirSync(outDir, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: Number(process.env.W || 1280), height: Number(process.env.H || 720) } });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', e => errors.push(e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${server.address().port}/index.html`);
await page.waitForFunction(() => document.body.classList.contains('ready'));
await page.waitForTimeout(800);

// ayudas dentro de la página: piloto automático, avanzar la simulación sin dibujar, congelar y medir
// gráficos fijos en Altos (Auto podría cambiarlos en medio de la medición)
await page.evaluate(() => { save.opt.graficos = 'alta'; save.opt.quality = 'alta'; applyQuality(); });
await page.evaluate(() => {
  const F = window.__F = { sim0: simulate, read0: readInput, rf0: renderFrame, uc0: updateCamera };
  const st = document.createElement('style'); st.textContent = '.screen,#toast,#count,#big{display:none!important}'; document.head.appendChild(st); st.disabled = true;
  F.ui = on => { st.disabled = on; };
  F.auto = () => {
    const P = G.player.body;
    F.ai = G.cfg.role === 'ladron' ? newThief(P, 'normal', null) : newCop(P, 'chase', 'dificil');
    window.readInput = () => {
      if (G.cfg.role === 'ladron') {
        const lead = G.cops.reduce((a, c) => !a || Math.hypot(c.body.x - P.x, c.body.z - P.z) < Math.hypot(a.body.x - P.x, a.body.z - P.z) ? c : a, null);
        return thiefInput(P, F.ai, lead.body, G.all.map(o => o.body), W.t, 1 / 120);
      }
      return copInput(P, F.ai, G.thief.body, G.all.map(o => o.body), W.t, 1 / 120);
    };
  };
  // avanza s segundos del bucle real (física, efectos, cámara, peatones) sin dibujar
  F.run = s => { window.renderFrame = () => {}; for (let i = 0; i < s * 30; i++) step(1 / 30); window.renderFrame = F.rf0; };
  // congela la física pero deja la cámara, el desenfoque y los efectos como en la partida
  F.freeze = () => { window.simulate = () => {}; window.readInput = F.read0; };
  F.thaw = () => { window.simulate = F.sim0; window.updateCamera = F.uc0; };
  F.play = cfg => { F.thaw(); startGame(cfg); showScreen('hud'); document.body.classList.add('playing'); G.mode = 'play'; F.auto(); };
  F.cam = (p, t) => { G.mode = 'pause'; window.updateCamera = () => {}; W.camera.position.set(...p); W.camera.lookAt(...t); W.sky.position.copy(W.camera.position); W.stars.position.copy(W.camera.position); };
  // azar con semilla (mismo tráfico y peatones en cada corrida, para comparar antes y después)
  F.seed = n => { let a = n >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  // deja el carro del jugador quieto en (x, z) mirando a h, sin tráfico cerca; otro carro opcional al lado
  F.stage = (x, z, h, other, ox, oz, oh) => {
    const put = (a, x, z, h) => { Object.assign(a.body, { x, z, h, y: groundH(x, z), vx: 0, vz: 0, f: 0, l: 0, steer: 0, slide: 0, pitch: 0, roll: 0, air: false }); poseCar(a.car, a.body, 0, W.t); };
    put(G.player, x, z, h);
    for (const a of G.all) if (a !== G.player && a !== other && Math.hypot(a.body.x - x, a.body.z - z) < 50) put(a, a.body.x + 120, a.body.z, a.body.h);
    if (other) put(other, ox, oz, oh);
  };
  F.measure = () => {
    const r = W.renderer, info = r.info, gl = r.getContext();
    let meshes = 0, inst = 0, instances = 0, sprites = 0, points = 0, lines = 0, lights = 0, shadowCasters = 0;
    W.scene.traverseVisible(o => {
      if (o.isInstancedMesh) { inst++; instances += o.count; } else if (o.isMesh) meshes++;
      if (o.isSprite) sprites++; if (o.isPoints) points++; if (o.isLine) lines++; if (o.isLight) lights++;
      if ((o.isMesh || o.isInstancedMesh) && o.castShadow) shadowCasters++;
    });
    info.autoReset = false;
    // la escena sola (con el pase de sombras)
    info.reset(); r.setRenderTarget(POST.on ? POST.rt : null); r.render(W.scene, W.camera);
    const withShadow = { calls: info.render.calls, triangles: info.render.triangles, points: info.render.points, lines: info.render.lines };
    // la escena sin volver a dibujar el mapa de sombras
    const au = r.shadowMap.autoUpdate; r.shadowMap.autoUpdate = false;
    info.reset(); r.render(W.scene, W.camera);
    const noShadow = { calls: info.render.calls, triangles: info.render.triangles };
    r.shadowMap.autoUpdate = au;
    // cuadro completo (escena + posprocesado)
    info.reset(); renderFrame(W.scene, W.camera);
    const frame = { calls: info.render.calls, triangles: info.render.triangles };
    // sólo el barrio (sin carros, personas ni efectos): siempre igual, sirve para comparar
    const hide = [...G.all.map(a => a.car.root), ...PEDS.list.map(k => k.p.root), FX.mesh, FX.bits].filter(o => o && o.visible);
    hide.forEach(o => { o.visible = false; });
    info.reset(); r.setRenderTarget(POST.on ? POST.rt : null); r.render(W.scene, W.camera);
    const city = { calls: info.render.calls, triangles: info.render.triangles };
    hide.forEach(o => { o.visible = true; });
    info.autoReset = true;
    // tiempo de dibujo (SwiftShader: sólo para comparar antes y después, no es una GPU real)
    const px = new Uint8Array(4), T = [];
    for (let i = 0; i < 6; i++) { const t0 = performance.now(); renderFrame(W.scene, W.camera); r.setRenderTarget(null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); T.push(performance.now() - t0); }
    T.sort((a, b) => a - b);
    // tiempo de la lógica de un cuadro (física a 120 Hz, IA, efectos, peatones), sin dibujar
    const sim = window.simulate, mode = G.mode; window.simulate = F.sim0; G.mode = 'play'; F.auto(); window.renderFrame = () => {};
    const t1 = performance.now(); for (let i = 0; i < 30; i++) step(1 / 60); const logic = (performance.now() - t1) / 30;
    window.renderFrame = F.rf0; window.simulate = sim; window.readInput = F.read0; G.mode = mode;
    return {
      quality: save.opt.quality, gfx: W.gfx, post: POST.on, shadows: r.shadowMap.enabled, pixelRatio: r.getPixelRatio(), size: [r.domElement.width, r.domElement.height],
      scene: withShadow, sceneNoShadowPass: noShadow, shadowPassCalls: withShadow.calls - noShadow.calls, frame, cityOnly: city,
      objects: { meshes, instancedMeshes: inst, instances, sprites, points, lines, lights, shadowCasters },
      cars: G.all.length, peds: PEDS.list.filter(k => k.p.root.visible).length,
      memory: { geometries: info.memory.geometries, textures: info.memory.textures, programs: info.programs ? info.programs.length : null },
      renderMsSwiftShader: { median: +T[3].toFixed(1), min: +T[0].toFixed(1) }, logicMsPerFrame: +logic.toFixed(2),
    };
  };
});
const perf = {};
const want = n => !only || only.includes(n);
const shot = async (n, wait = 2500) => { await page.waitForTimeout(wait); await page.screenshot({ path: path.join(outDir, `${prefix}-${n}.png`) }); console.log('foto', n); };
const ev = (fn, arg) => page.evaluate(fn, arg);

// 1) menú con la demostración detrás
if (want('menu')) {
  await page.keyboard.press('Enter');
  await ev(() => { for (let i = 0; i < 300; i++) attractStep(1 / 60); G.attractT = 0.5; });
  await shot('menu', 3000);
}

// 0) medición fija y repetible: misma semilla, el carro quieto en la calle x = -135 y la cámara
//    de atrás a la altura de siempre, de día y de noche (para comparar antes y después)
for (const time of ['dia', 'noche']) {
  if (!want('fija-' + time)) continue;
  await ev(time => { __F.seed(7); __F.play({ role: 'ladron', diff: 'normal', goal: 'survive', t: 180, time, name: 'Medición' }); __F.freeze(); __F.stage(-138, -200, 0); __F.cam([-138, 3.1, -207.8], [-138, 1.1, -195]); }, time);
  await shot('fija-' + time);
  perf['fija-' + time] = await ev(() => __F.measure());
  console.log(JSON.stringify(perf['fija-' + time]));
}

// 2) partida de ladrón de día (vista típica con interfaz) + medición
if (want('ladron-dia')) {
  await ev(() => { __F.play({ role: 'ladron', diff: 'normal', goal: 'survive', t: 180, time: 'dia', name: 'Primer golpe' }); __F.run(7); __F.freeze(); });
  await shot('ladron-dia');
  perf['ladron-dia'] = await ev(() => __F.measure());
  console.log(JSON.stringify(perf['ladron-dia']));
}
// carros de cerca en una calle limpia: el del jugador con un patrullero, de día
if (want('carros-cerca') || want('dano')) {
  await ev(() => { __F.play({ role: 'ladron', diff: 'normal', goal: 'survive', t: 180, time: 'dia', name: 'Carros' }); __F.run(0.5); __F.freeze(); __F.ui(false); });
  if (want('carros-cerca')) {
    await ev(() => { __F.stage(-138, -180, 0, G.cops[0], -132, -187, 0); __F.cam([-133.6, 1.45, -174.2], [-137.2, 0.55, -181.5]); });
    await shot('carros-cerca');
    await ev(() => { __F.stage(-138, -180, 0, G.cops[0], -132.5, -171, 0.05); __F.cam([-134.2, 1.35, -186.2], [-136.5, 0.6, -177]); });
    await shot('carros-atras');
  }
  // carro dañado: casi sin vida (humo y fuego); la carrocería no cambia
  if (want('dano')) {
    await ev(() => {
      __F.stage(-138, -180, 0, G.cops[0], -132, -230, 0); window.updateCamera = __F.uc0; G.mode = 'play';
      G.player.body.hp = G.player.body.hpMax * 0.12; __F.run(3);
      __F.cam([-133.4, 1.9, -175.5], [-137.6, 0.7, -180.5]);
    });
    await shot('dano');
  }
  await ev(() => { __F.ui(true); });
}

// 3) cabina
if (want('cabina')) {
  await ev(() => { __F.play({ role: 'ladron', diff: 'normal', goal: 'survive', t: 180, time: 'tarde', name: 'Cabina' }); __F.run(8); G.cam = 'cabina'; setCam(); __F.freeze(); });
  await shot('cabina');
  await ev(() => { G.cam = 'afuera'; setCam(); });
}

// 4) policía de tarde: el ladrón adelante
if (want('policia-tarde')) {
  await ev(() => { __F.play({ role: 'policia', diff: 'normal', goal: 'arrest', t: 180, time: 'tarde', name: 'Hora punta' }); __F.run(14); __F.freeze(); });
  await shot('policia-tarde');
  perf['policia-tarde'] = await ev(() => __F.measure());
  console.log(JSON.stringify(perf['policia-tarde']));
}

// 5) noche de ladrón, con los patrulleros cerca
if (want('noche')) {
  await ev(() => { __F.play({ role: 'ladron', diff: 'normal', goal: 'survive', t: 180, time: 'noche', name: 'Noche caliente' }); __F.run(24); __F.freeze(); });
  await shot('noche');
  perf.noche = await ev(() => __F.measure());
  console.log(JSON.stringify(perf.noche));
  // de noche, vista de costado de la persecución
  await ev(() => {
    const T = G.player.body, c = G.cops.slice().sort((a, b) => Math.hypot(a.body.x - T.x, a.body.z - T.z) - Math.hypot(b.body.x - T.x, b.body.z - T.z))[0].body;
    const mx = (T.x + c.x) / 2, mz = (T.z + c.z) / 2, lx = Math.cos(T.h), lz = -Math.sin(T.h);
    __F.ui(false); __F.cam([mx + lx * 9, 2.2, mz + lz * 9], [mx, 0.8, mz]);
  });
  await shot('noche-lado');
  await ev(() => { __F.ui(true); });
}

// 6) personas de cerca en la vereda
if (want('personas')) {
  await ev(() => {
    __F.play({ role: 'ladron', diff: 'facil', goal: 'survive', t: 180, time: 'dia', name: 'Personas' }); __F.run(1); __F.freeze();
    PEDS.on = false;
    const xs = [-99.5, -98.2, -96.4, -95, -93.3];
    PEDS.list.forEach((k, i) => {
      const p = k.p; if (i >= xs.length) { p.root.visible = false; return; }
      p.root.visible = true; p.state = i === 2 ? 'idle' : 'walk'; p.panic = false; p.animSpeed = 1.3;
      p.pos.set(xs[i], 0.16, 142.6 + (i % 2) * 0.9); p.heading = i % 2 ? -Math.PI / 2 : Math.PI / 2;
      for (let s = 0; s < 20 + i * 7; s++) p.update(1 / 30);
    });
    __F.ui(false); __F.cam([-96.5, 1.55, 137.5], [-96.5, 1.0, 142.8]);
  });
  await shot('personas');
  await ev(() => { __F.ui(true); PEDS.on = true; });
}

// 7) vista aérea del barrio de día
if (want('aereo')) {
  await ev(() => { __F.play({ role: 'ladron', diff: 'normal', goal: 'survive', t: 180, time: 'dia', name: 'Aéreo' }); __F.run(2); __F.freeze(); __F.ui(false); __F.cam([-80, 60, -250], [-20, 0, -90]); });
  await shot('aereo');
  await ev(() => { __F.ui(true); });
}

// 8) calidad baja (sin sombras ni posprocesado) en la misma partida de día + medición
if (want('baja')) {
  await ev(() => { save.opt.quality = 'baja'; applyQuality(); __F.play({ role: 'ladron', diff: 'normal', goal: 'survive', t: 180, time: 'dia', name: 'Baja' }); __F.run(22); __F.freeze(); });
  await shot('baja');
  perf.baja = await ev(() => __F.measure());
  console.log(JSON.stringify(perf.baja));
  await ev(() => { save.opt.quality = 'alta'; applyQuality(); });
}

// 8b) gráficos medios (sin MSAA, con FXAA, sombra de 1024) en la misma partida + medición
if (want('media')) {
  await ev(() => { save.opt.graficos = 'media'; applyQuality(); __F.play({ role: 'ladron', diff: 'normal', goal: 'survive', t: 180, time: 'dia', name: 'Media' }); __F.run(22); __F.freeze(); });
  await shot('media');
  perf.media = await ev(() => __F.measure());
  console.log(JSON.stringify(perf.media));
  await ev(() => { save.opt.graficos = 'alta'; applyQuality(); });
}

// 9) garaje y resultado
if (want('garaje')) {
  await ev(() => { __F.thaw(); window.readInput = __F.read0; G.mode = 'menu'; act('garage'); });
  await shot('garaje', 3500);
}
if (want('resultado')) {
  await ev(() => { __F.play({ role: 'ladron', diff: 'normal', goal: 'survive', t: 180, time: 'tarde', name: 'Partida libre' }); __F.run(5); window.readInput = __F.read0; G.time = 170; finish(true, '¡Aguantaste!'); });
  await shot('resultado', 3500);
}

fs.writeFileSync(path.join(outDir, `${prefix}-rendimiento.json`), JSON.stringify(perf, null, 2));
console.log(errors.length ? 'errores:\n' + errors.slice(0, 8).join('\n') : 'sin errores');
await browser.close(); server.close();
process.exit(errors.length ? 1 : 0);
