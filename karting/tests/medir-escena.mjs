// Mide el costo de dibujo de una pista: triángulos y llamadas por pasada (escena, sombras,
// posprocesado) y qué objetos pesan más. Sirve para comparar antes y después de tocar gráficos.
// Uso: node tests/medir-escena.mjs [t1 t3 ...] [--baja] [--json=archivo]
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const ids = args.filter(a => !a.startsWith('--'));
const baja = args.includes('--baja');
const jsonArg = args.find(a => a.startsWith('--json='));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(300000);
const errors = [];
page.on('pageerror', e => errors.push(e.message));
if (baja) await page.addInitScript(() => { try { const s = JSON.parse(localStorage.getItem('kartodromo-save-v1') || '{}'); s.opt = Object.assign({}, s.opt, { quality: 'baja' }); localStorage.setItem('kartodromo-save-v1', JSON.stringify(s)); } catch (e) {} });
await page.goto(`http://localhost:${server.address().port}/index.html`);
await page.waitForFunction(() => document.body.classList.contains('ready'));

const out = {};
for (const id of ids.length ? ids : ['t1']) {
  await page.evaluate(id => {
    if (R.on) endRace();
    UI.mode = 'quick'; UI.sel.track = id; UI.sel.diff = 'normal'; UI.sel.laps = 3; UI.sel.format = 'race'; UI.sel.players = 1; UI.sel.time = null;
    go();
  }, id);
  await page.waitForFunction(() => R.on && UI.screen === 'hud');
  const r = await page.evaluate(() => {
    const quieto = () => ({ throttle: 0, brake: 0, steer: 0, handbrake: false, kSteer: 0 });
    let g = 0; while (R.state === 'countdown' && g++ < 2000) updateRace(1 / 120, [quieto(), quieto()]);
    for (let i = 0; i < 480; i++) updateRace(1 / 120, [botInput(R.player, 1 / 120), quieto()]);
    UI.paused = true; CAMS.forEach(c => c.snap = true); updateCamera(1 / 60);
    const rd = W.renderer, info = rd.info, gl = rd.getContext();
    const px = new Uint8Array(4);
    const pass = () => { info.autoReset = false; info.reset(); const t0 = performance.now(); renderFrame(W.scene, W.camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const ms = performance.now() - t0; const o = { calls: info.render.calls, tris: info.render.triangles, ms: +ms.toFixed(0) }; info.autoReset = true; return o; };
    pass();                                     // compila lo que falte
    const total = pass();
    // sin sombras (lo que se ahorra con calidad baja o sombras más chicas)
    const sh = rd.shadowMap.enabled;
    rd.shadowMap.autoUpdate = false; const noShadow = pass(); rd.shadowMap.autoUpdate = true;
    // solo escena directa (sin posprocesado)
    const po = POST.on; POST.on = false; const direct = pass(); POST.on = po;
    // sin transmisión (el tanque translúcido obliga a three.js a dibujar la escena dos veces)
    const tm = []; W.scene.traverse(o => { if (o.material && o.material.transmission > 0) { tm.push([o.material, o.material.transmission]); } });
    tm.forEach(([m]) => { m.transmission = 0; m.needsUpdate = true; }); pass(); const noTrans = pass();
    tm.forEach(([m, v]) => { m.transmission = v; m.needsUpdate = true; });
    // qué objetos pesan más (triángulos por objeto, con instancias)
    const rows = [];
    const triOf = o => { const g = o.geometry; if (!g) return 0; const n = g.index ? g.index.count : g.attributes.position.count; return n / 3 * (o.isInstancedMesh ? o.count : 1); };
    const kartSet = new Set(); R.karts.forEach(k => k.mesh.traverse(o => kartSet.add(o)));
    const cats = {};
    W.scene.traverse(o => {
      if (!(o.isMesh || o.isInstancedMesh)) return;
      let vis = true; for (let p = o; p; p = p.parent) if (!p.visible) vis = false;
      if (!vis) return;
      const t = triOf(o);
      const cat = kartSet.has(o) ? 'karts en carrera' : o.isInstancedMesh ? 'instanciado: ' + o.geometry.type + (o.material.type ? ' / ' + o.material.type : '') : o.parent && o.parent.userData && o.parent.userData.chassis ? 'karts' : 'malla: ' + o.geometry.type;
      const c = cats[cat] || (cats[cat] = { tris: 0, objs: 0, shadow: 0 });
      c.tris += t; c.objs++; if (o.castShadow) c.shadow += t;
      if (t > 20000) rows.push({ type: o.isInstancedMesh ? 'Instanced' : 'Mesh', geo: o.geometry.type, mat: o.material.type, count: o.isInstancedMesh ? o.count : 1, tris: Math.round(t), cast: o.castShadow });
    });
    rows.sort((a, b) => b.tris - a.tris);
    let kartTris = 0, kartMeshes = 0; R.karts[0].mesh.traverse(o => { if (o.isMesh) { kartTris += triOf(o); kartMeshes++; } });
    const catList = Object.entries(cats).map(([k, v]) => ({ cat: k, tris: Math.round(v.tris), objs: v.objs, shadowTris: Math.round(v.shadow) })).sort((a, b) => b.tris - a.tris).slice(0, 14);
    return { post: POST.on, shadows: sh, pixelRatio: rd.getPixelRatio(), total, noShadow, direct, noTrans, transMats: tm.length, porKart: { tris: Math.round(kartTris), mallas: kartMeshes }, programas: info.programs.length, texturas: info.memory.textures, geometrias: info.memory.geometries, categorias: catList, pesados: rows.slice(0, 12) };
  });
  out[id] = r;
  console.log('\n== ' + id + (baja ? ' (baja)' : ''));
  console.log(JSON.stringify({ post: r.post, shadows: r.shadows, total: r.total, sinSombras: r.noShadow, directo: r.direct, sinTransmision: r.noTrans, matsTransmision: r.transMats, porKart: r.porKart, programas: r.programas, texturas: r.texturas }));
  console.table(r.categorias);
  console.table(r.pesados);
  await page.evaluate(() => { UI.paused = false; });
}
if (jsonArg) fs.writeFileSync(jsonArg.slice(7), JSON.stringify(out, null, 2));
console.log(errors.length ? 'ERRORES:\n' + errors.join('\n') : 'sin errores');
await browser.close(); server.close();
