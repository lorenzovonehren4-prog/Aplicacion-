// Fotos del juego (vistas que importan y modelos de cerca) y medición de rendimiento por escena.
// Uso: node combi-rush/tests/fotos.mjs <carpeta> [prefijo] [escena1,escena2,...]
//   CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node combi-rush/tests/fotos.mjs /tmp/fotos antes
// Imprime por escena: llamadas de dibujo y triángulos (sólo la vista y con el pase de sombras), mallas en escena
// (visibles y que dan sombra), geometrías y texturas en GPU, ms por render() y lo mismo en calidad baja (columnas B:).
// Escenas: menu dia parada garua atardecer noche costa puente curva hueco taller combi combiatras personas carros bus
//          viajes resultados micro sprinter nochecerca. Cada una tarda ~40 s con WebGL por software: pásalas por tandas.
// Con WebGL por software los ms y fps no sirven como valor absoluto; compara llamadas y triángulos antes/después.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const OUT = process.argv[2] || 'fotos';
const PRE = process.argv[3] || 'foto';
const only = process.argv[4];
mkdirSync(OUT, { recursive: true });
const file = 'file://' + new URL('../combi-rush.html', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = [];

// Engancha la cámara (para tomas de cerca) y la escena (para contar mallas) sin tocar el juego.
const HOOK = () => {
  let T3 = null, done = false;
  const patch = (T) => {
    const O = T.Object3D.prototype, look = O.lookAt, umw = O.updateMatrixWorld;
    O.lookAt = function (x, y, z) {
      const o = window.__camOv;
      if (this.isPerspectiveCamera && o) { this.position.set(o.p[0], o.p[1], o.p[2]); return look.call(this, o.t[0], o.t[1], o.t[2]); }
      return look.call(this, x, y, z);
    };
    O.updateMatrixWorld = function (f) { if (this.isScene) window.__scene = this; return umw.call(this, f); };
    const R = T.WebGLRenderer;
    T.WebGLRenderer = function (o) { const r = new R(o); window.__renderer = r; return r; };
    T.WebGLRenderer.prototype = R.prototype;
  };
  // three.js hace "globalThis.THREE = {}" y luego lo llena: se parcha en el primer uso del juego.
  Object.defineProperty(window, 'THREE', { configurable: true, set(v) { T3 = v; }, get() { if (T3 && !done && T3.WebGLRenderer) { done = true; patch(T3); } return T3; } });
};

// Coloca la cámara cerca de un objeto: adelante/derecha/arriba en el marco del objeto (adelante es -Z).
const CLOSE = `window.__close = (obj, fwd, right, up, lookUp) => {
  const p = new THREE.Vector3(); obj.getWorldPosition(p);
  const th = obj.rotation.y, f = [-Math.sin(th), -Math.cos(th)], r = [Math.cos(th), -Math.sin(th)];
  window.__camOv = { p: [p.x + f[0] * fwd + r[0] * right, p.y + up, p.z + f[1] * fwd + r[1] * right], t: [p.x, p.y + lookUp, p.z] };
};`;

const trip = (ti, amb, adv) => `(() => { const C = window.__combi; C.save.tutDone = true; C.startRun({ mode: 'viaje', ti: ${ti}${amb ? `, amb: '${amb}'` : ''} }); const g = C.G; g.countdown = 0; g.p.v = 300; C.step(${adv || 200}); C.snap(); })()`;
const player = `(() => { let pm = null; window.__scene.traverse(o => { if (!pm && o.userData && o.userData.heads && o.userData.heads.length) pm = o; }); return pm; })()`;
const HIDE_HUD = `(() => { const s = document.createElement('style'); s.textContent = '#hud,#fx,#touch,#toast{display:none!important}'; document.head.appendChild(s); })()`;

const L = {
  menu: [1280, 720, null],
  dia: [1280, 720, trip(0)],
  parada: [1280, 720, `(() => { const C = window.__combi; C.save.tutDone = true; C.startRun({ mode: 'viaje', ti: 4 }); const g = C.G; g.countdown = 0; const st = g.stops[0]; g.p.wy = st.wy - 900; g.p.v = 250; C.step(40); C.snap(); })()`],
  garua: [1280, 720, trip(3, null, 400)],
  atardecer: [1280, 720, trip(7, null, 300)],
  noche: [1280, 720, trip(1, 'noche', 250)],
  costa: [1280, 720, `(() => { const C = window.__combi; C.save.tutDone = true; C.startRun({ mode: 'viaje', ti: 8 }); const g = C.G; g.countdown = 0; const z = g.zones.find(z => z.t === 'costa'); g.p.wy = z.s0 + 1600; g.p.v = 300; C.step(5); C.snap(); })()`],
  puente: [1280, 720, `(() => { const C = window.__combi; C.save.tutDone = true; C.startRun({ mode: 'viaje', ti: 2 }); const g = C.G; g.countdown = 0; const z = g.zones.find(z => z.t === 'puente'); g.p.wy = z.s0 - 300; g.p.v = 250; C.step(5); C.snap(); })()`],
  curva: [1280, 720, `(() => { const C = window.__combi; C.save.tutDone = true; C.startRun({ mode: 'viaje', ti: 0 }); const g = C.G; g.countdown = 0; const t = g.path.turns[0]; g.p.wy = t.s0 - 350; g.p.v = 200; C.step(3); C.snap(); })()`],
  hueco: [1280, 720, `(() => { const C = window.__combi; C.save.tutDone = true; C.startRun({ mode: 'viaje', ti: 6 }); const g = C.G; g.countdown = 0; const b = g.baches.find(b => b.cones) || g.baches[3]; g.p.wy = b.wy - 620; g.p.x = 270 + (b.x > 270 ? -40 : 40); g.p.v = 150; C.step(2); C.snap(); })()`],
  taller: [1280, 720, `(() => { const C = window.__combi; C.save.tutDone = true; C.show('taller'); })()`],
  // de cerca (sin interfaz): la combi del jugador, gente en el paradero, carros del tráfico, noche
  combi: [1280, 720, `(async () => { ${HIDE_HUD}; const C = window.__combi; C.save.tutDone = true; C.startRun({ mode: 'viaje', ti: 0 }); const g = C.G; g.countdown = 0; g.p.v = 0; C.step(60); g.p.v = 0; C.snap(); C.render(); __close(${player}, 120, 95, 48, 26); })()`],
  combiatras: [1280, 720, `(async () => { ${HIDE_HUD}; const C = window.__combi; C.save.tutDone = true; C.startRun({ mode: 'viaje', ti: 0 }); const g = C.G; g.countdown = 0; g.p.v = 0; C.step(60); g.p.v = 0; C.snap(); C.render(); __close(${player}, -125, -80, 55, 28); })()`],
  personas: [1280, 720, `(async () => { ${HIDE_HUD}; const C = window.__combi; C.save.tutDone = true; C.startRun({ mode: 'viaje', ti: 4 }); const g = C.G; g.countdown = 0; const st = g.stops[0]; g.p.wy = st.wy - 700; g.p.v = 0; C.step(30); g.p.v = 0; C.snap(); C.render(); const q = g.peds.filter(q => q._m && q.state === 'wait').sort((a, b) => Math.abs(a.wy - st.wy) - Math.abs(b.wy - st.wy))[0] || g.peds.find(q => q._m); __close(q._m, 0, -85, 30, 18); })()`],
  carros: [1280, 720, `(async () => { ${HIDE_HUD}; const C = window.__combi; C.save.tutDone = true; C.startRun({ mode: 'viaje', ti: 5 }); const g = C.G; g.countdown = 0; g.p.v = 300; C.step(150); C.snap(); C.render(); const v = g.veh.filter(v => v._m && v.wy > g.p.wy + 100 && (v.type === 'auto' || v.type === 'taxi')).sort((a, b) => a.wy - b.wy)[0] || g.veh.find(v => v._m); __close(v._m, 95, -75, 40, 16); window.__veh = v; })()`],
  bus: [1280, 720, `(async () => { ${HIDE_HUD}; const C = window.__combi; C.save.tutDone = true; C.startRun({ mode: 'viaje', ti: 13 }); const g = C.G; g.countdown = 0; g.p.v = 300; C.step(150); C.snap(); C.render(); const v = g.veh.filter(v => v._m && v.wy > g.p.wy + 100 && v.type !== 'auto' && v.type !== 'taxi').sort((a, b) => a.wy - b.wy)[0] || g.veh.find(v => v._m); __close(v._m, 140, -110, 60, 25); })()`],
  viajes: [1280, 720, `(() => { const C = window.__combi; C.save.tripUnlocked = 12; C.save.tutDone = true; C.show('modos'); })()`],
  resultados: [1280, 720, `(async () => { const C = window.__combi; C.save.tutDone = true; C.startRun({ mode: 'viaje', ti: 0 }); const g = C.G; g.countdown = 0; for (let k = 0; k < 400 && !g.done; k++) { g.p.wy = Math.min(g.R.length + 20, g.p.wy + 120); g.p.v = 250; C.step(2); } C.showResults(); })()`],
  micro: [1280, 720, `(async () => { ${HIDE_HUD}; const C = window.__combi; C.save.tutDone = true; C.save.veh = 'micro'; C.save.owned.push('micro'); C.startRun({ mode: 'viaje', ti: 0 }); const g = C.G; g.countdown = 0; g.p.v = 0; C.step(60); g.p.v = 0; C.snap(); C.render(); __close(${player}, 170, 120, 60, 30); })()`],
  sprinter: [1280, 720, `(async () => { ${HIDE_HUD}; const C = window.__combi; C.save.tutDone = true; C.save.veh = 'sprinter'; C.save.owned.push('sprinter'); C.startRun({ mode: 'viaje', ti: 0 }); const g = C.G; g.countdown = 0; g.p.v = 0; C.step(60); g.p.v = 0; C.snap(); C.render(); __close(${player}, 140, 100, 52, 28); })()`],
  nochecerca: [1280, 720, `(async () => { ${HIDE_HUD}; const C = window.__combi; C.save.tutDone = true; C.startRun({ mode: 'viaje', ti: 1, amb: 'noche' }); const g = C.G; g.countdown = 0; g.p.v = 0; C.step(60); g.p.v = 0; C.snap(); C.render(); __close(${player}, 140, 90, 50, 26); })()`],
};

// Medición: N renders seguidos tras preparar la escena (la simulación queda quieta durante la medida).
// "ms" con la vista real; "msCPU" con una vista de 160x90 (casi sin costo de pintado: lo que cuesta armar y mandar la escena).
const MEASURE = `(() => {
  const C = window.__combi, sc = window.__scene, R = window.__renderer; const N = 6;
  const run = () => { const t0 = performance.now(); let calls = 0, tris = 0; for (let i = 0; i < N; i++) { C.render(); calls += __info.calls; tris += __info.triangles; } return { calls: Math.round(calls / N), tris: Math.round(tris / N), ms: +((performance.now() - t0) / N).toFixed(1) }; };
  C.render(); const a = run();
  // total con el pase de sombras (three r160 reinicia info después de las sombras)
  R.info.autoReset = false; R.info.reset(); C.render(); const tot = { calls: R.info.render.calls, tris: R.info.render.triangles }; R.info.autoReset = true;
  const sz = R.getSize(new THREE.Vector2()); R.setSize(160, 90, false); C.render(); const cpu = run(); R.setSize(sz.x, sz.y, false);
  let meshes = 0, vis = 0, cast = 0, sprites = 0, lights = 0;
  sc.traverseVisible(o => { if (o.isMesh) { vis++; if (o.castShadow) cast++; } if (o.isSprite) sprites++; if (o.isLight) lights++; });
  sc.traverse(o => { if (o.isMesh) meshes++; });
  return { calls: a.calls, tris: a.tris, callsTot: tot.calls, trisTot: tot.tris, meshes, vis, cast, sprites, lights, geos: __mem.geometries, texs: __mem.textures, ms: a.ms, msCPU: cpu.ms, px: R.getPixelRatio(), sh: R.shadowMap.enabled };
})()`;

const rows = [];
async function scene(name, vw, vh, setup) {
  const p = await b.newPage({ viewport: { width: vw, height: vh } });
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(name + ' console: ' + m.text()); });
  await p.addInitScript(HOOK);
  await p.goto(file); await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 30000 });
  await p.evaluate(CLOSE);
  await p.waitForTimeout(800);
  if (setup) await p.evaluate(setup);
  await p.waitForTimeout(2200);
  await p.screenshot({ path: `${OUT}/${PRE}-${name}.png` });
  // fps reales del bucle durante 2 s (con WebGL por software: sólo sirve para comparar antes/después)
  const fps = await p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); }; requestAnimationFrame(f); }));
  const m = await p.evaluate(MEASURE);
  // lo mismo con calidad baja (sin sombras, resolución 1x)
  await p.evaluate(() => document.querySelector('[data-q="baja"]').click());
  const m2 = await p.evaluate(MEASURE);
  rows.push([name, m.calls, m.tris, m.callsTot, m.trisTot, m.meshes, m.vis, m.cast, m.sprites, m.geos, m.texs, m.ms, m.msCPU, fps, m2.calls, m2.tris, m2.ms, m2.msCPU]);
  await p.close();
}
for (const [k, [w, h, s]] of Object.entries(L)) if (!only || only.split(',').includes(k)) await scene(k, w, h, s);
await b.close();
console.log(['escena', 'calls', 'triáng', 'calls+sombras', 'triáng+sombras', 'mallas', 'visibles', 'sombra', 'sprites', 'geos', 'texs', 'ms', 'msCPU', 'fps(sw)', 'B:calls', 'B:triáng', 'B:ms', 'B:msCPU'].join('\t'));
for (const r of rows) console.log(r.join('\t'));
console.log(errs.length ? errs.join('\n') : 'sin errores');
