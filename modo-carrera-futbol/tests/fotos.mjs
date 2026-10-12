// Fotos de las escenas 3D y medición de rendimiento (triángulos, llamadas de dibujo, mallas).
// Uso: CHROMIUM_PATH=/ruta/a/chrome node tests/fotos.mjs [carpeta] [prefijo] [calidad]
//   carpeta: dónde guardar los .png (por defecto tests/capturas)
//   prefijo: inicio del nombre de cada foto (por defecto "foto")
//   calidad: alta | media | baja (por defecto alta)
// Imprime una tabla con las medidas de cada vista y los errores de la consola.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const out = path.resolve(process.argv[2] || path.join(root, 'tests', 'capturas'));
const pref = process.argv[3] || 'foto';
const calidad = process.argv[4] || 'alta';
const solo = process.env.SOLO ? process.env.SOLO.split(',') : null;
fs.mkdirSync(out, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);

const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, proxy, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, ignoreHTTPSErrors: true });
await ctx.addInitScript(q => { try { localStorage.setItem('mcf_opts_v1', JSON.stringify({ music: false, sfx: false, quality: q, speed: 'normal', tutorial: false })); } catch (e) { } }, calidad);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push('console: ' + m.text()); });
await page.goto(`http://localhost:${server.address().port}/index.html`);
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 30000 });

// Herramientas dentro de la página: cámara forzada (sin tocar el juego) y medidas.
await page.evaluate(() => {
  const orig = renderer.render.bind(renderer);
  window.__cam = null;
  renderer.render = (s, c) => {
    if (window.__cam) { const v = typeof window.__cam === 'function' ? window.__cam() : window.__cam; c.position.set(v.pos[0], v.pos[1], v.pos[2]); c.lookAt(v.look[0], v.look[1], v.look[2]); }
    orig(s, c);
  };
  window.__medir = () => new Promise(res => {
    const ts = []; let n = 0;
    const tick = t => { ts.push(t); if (++n < 90) requestAnimationFrame(tick); else fin(); };
    const fin = () => {
      const dts = ts.slice(1).map((t, i) => t - ts[i]); dts.sort((a, b) => a - b);
      let meshes = 0, inst = 0, instN = 0, sprites = 0, lights = 0, sombras = 0, personas = 0;
      scene.traverse(o => {
        if (o.isInstancedMesh) { inst++; instN += o.count; } else if (o.isMesh) meshes++; else if (o.isSprite) sprites++;
        if (o.isLight) { lights++; if (o.castShadow) sombras++; }
        if (o.userData && o.userData.legs && o.userData.arms) personas++;
      });
      const i = renderer.info;
      res({ tri: i.render.triangles, calls: i.render.calls, meshes, inst, instN, sprites, lights, sombras, personas, geos: i.memory.geometries, texs: i.memory.textures, progs: i.programs ? i.programs.length : 0, pr: renderer.getPixelRatio(), msMed: +dts[dts.length >> 1].toFixed(1), fps: +(1000 / (dts.reduce((a, b) => a + b, 0) / dts.length)).toFixed(1) });
    };
    requestAnimationFrame(tick);
  });
  window.__ocultarUI = on => { let st = document.getElementById('__noui'); if (on && !st) { st = document.createElement('style'); st.id = '__noui'; st.textContent = '.screen,#match,#sbug,#tvtag,#labels,#toasts,#modal,#nego,#scenep{display:none!important}'; document.head.appendChild(st); } else if (!on && st) st.remove(); };
  window.__carrera = (tier, full) => {
    __mcf.newCareer({ first: 'Kevin', last: 'Quispe', pos: 'DEL', foot: 'Derecho', origin: 'Comas', skin: '#A56B45' });
    C.tut = 99; C.house = tier; C.age = full ? 28 : 17;
    if (full) {
      C.cars = ['moto', 'usado', 'suv', 'deportivo', 'lujo', 'hiper']; C.rel = 'casado'; C.partner = 'Valeria'; C.kids = 2; C.pets = ['labrador', 'gatonaranja'];
      C.trophies = ['Liga 1', 'Copa Bicentenario', 'Copa de Campeones', 'Copa América', 'Mundial', 'Balón de Oro', 'Bota de Oro', 'Liga Española', 'Copa de las Américas', 'Liga'].map((n, i) => ({ name: n, kind: /Balón|Bota/.test(n) ? 'ind' : 'col', year: 2020 + i }));
      C.outfit = '#2E6BFF';
    }
  };
});

const espera = ms => page.waitForTimeout(ms);
const resultados = [];
async function foto(nombre, medir) {
  if (solo && !solo.includes(nombre)) return;
  await page.screenshot({ path: path.join(out, `${pref}-${nombre}.png`) });
  if (medir) { const m = await page.evaluate(() => window.__medir()); resultados.push({ vista: nombre, ...m }); }
  console.log('ok', nombre);
}

// 1) menú de inicio (estadio de noche detrás)
await espera(3500);
await foto('menu', true);

// 2) estadio: vista general sin interfaz, cámara de TV y jugadores de cerca
await page.evaluate(() => __ocultarUI(true));
await espera(1500);
await foto('estadio-general', true);
await page.evaluate(() => { window.__cam = { pos: [80, 330, 900], look: [-40, 0, 0] }; });
await espera(2500);
await foto('estadio-tv', true);
await page.evaluate(() => { window.__cam = () => { const a = S3.avatar.position; return { pos: [a.x + 55, 34, a.z + 75], look: [a.x, 22, a.z] }; }; });
await espera(2500);
await foto('jugador-cerca', true);
await page.evaluate(() => { window.__cam = { pos: [0, 120, -360], look: [0, 150, -900] }; });
await espera(2000);
await foto('tribuna', true);

// 3) jugadas: gol (en vivo, remate, festejo, repetición) y penal
await page.evaluate(() => { window.__cam = null; const d = playMoment('goal', 1); S3.anim.t = 1.4; S3.anim.sp = 0; return d; });
await espera(2500);
await foto('gol-vivo', true);
await page.evaluate(() => { S3.anim.t = 2.45; S3.anim.sp = 0; });
await espera(2500);
await foto('gol-remate', true);
await page.evaluate(() => { S3.anim.t = S3.anim.LIVE + 0.05; S3.anim.sp = 1; });
await page.waitForFunction(() => !S3.anim || S3.anim.t > S3.anim.LIVE + 1.6, null, { timeout: 60000 });
await page.evaluate(() => { if (S3.anim) S3.anim.sp = 0; });
await espera(1500);
await foto('gol-festejo', true);
await page.evaluate(() => { if (S3.anim) { S3.anim.t = S3.anim.LIVE + S3.anim.CELE + S3.anim.REP * 0.72; S3.anim.sp = 0; } });
await espera(2500);
await foto('gol-repeticion', false);
await page.evaluate(() => { if (S3.anim) S3.anim.t = 999; });
await espera(800);
await page.evaluate(() => { const d = playPenalty('izq', 'gol', 'der', 1); S3.anim.t = 1.3; S3.anim.sp = 0; return d; });
await espera(2500);
await foto('penal', false);
await page.evaluate(() => { if (S3.anim) S3.anim.t = 999; });

// 4) casa nivel 0 con el centro de mando (como se juega)
await page.evaluate(() => { __ocultarUI(false); __carrera(0, false); enterHub(); });
await espera(3500);
await foto('casa0-hub', true);
await page.evaluate(() => __ocultarUI(true));
await espera(800);
await foto('casa0', false);

// 5) mansión con carros, trofeos, pareja, hijos y mascotas
await page.evaluate(() => { __carrera(3, true); buildHome(); S3.manual = 1e9; S3.yaw = 0.6; });
await espera(3500);
await foto('casa3', true);
await page.evaluate(() => { __ocultarUI(false); renderHub(); document.getElementById('hub').hidden = false; });
await espera(1200);
await foto('casa3-hub', false);
await page.evaluate(() => __ocultarUI(true));
await page.evaluate(() => { window.__cam = () => { const a = S3.avatar.position; return { pos: [a.x + 40, a.y + 38, a.z + 70], look: [a.x, a.y + 24, a.z] }; }; });
await espera(2500);
await foto('casa3-personaje', false);
await page.evaluate(() => { const g = S3.inter.find(i => i.id === 'cochera'); const p = g.pos; window.__cam = { pos: [p.x - 40, 70, p.z + 210], look: [p.x, 18, p.z] }; });
await espera(2500);
await foto('cochera-cerca', true);
await page.evaluate(() => { const g = S3.inter.find(i => i.id === 'vitrina'); const p = g.pos; window.__cam = { pos: [p.x - 30, 80, p.z + 130], look: [p.x, 60, p.z] }; });
await espera(2500);
await foto('vitrina', false);
await page.evaluate(() => { const g = S3.inter.find(i => i.id === 'tv'); window.__cam = null; S3.yaw = 2.4; S3.manual = 1e9; });
await espera(3000);
await foto('casa3-exterior', false);

// 6) oficina, discoteca, llegada al estadio y retiro
await page.evaluate(() => { window.__cam = null; buildOffice(club(), 'serio'); });
await espera(3000);
await foto('oficina', true);
await page.evaluate(() => buildDisco());
await espera(3000);
await foto('disco', true);
await page.evaluate(() => { buildArrival('deportivo', club()); });
await page.waitForFunction(() => S3.arrival && S3.arrival.t > 2.6, null, { timeout: 60000 });
await foto('llegada', true);
await page.evaluate(() => { const cl = club(); buildCeremony({ bestClub: { id: cl.id, name: cl.name, c1: cl.c1, c2: cl.c2 }, trophies: C.trophies, name: 'Kevin Quispe' }); S3.ceremony.t = 7; });
await espera(3500);
await foto('ceremonia', true);

console.log('\nvista             tri      calls mallas inst(n)     sprites luces sombra personas geos texs progs pr  ms/cuadro fps(swiftshader)');
for (const r of resultados) console.log([r.vista.padEnd(17), String(r.tri).padStart(7), String(r.calls).padStart(6), String(r.meshes).padStart(6), (r.inst + '(' + r.instN + ')').padStart(10), String(r.sprites).padStart(7), String(r.lights).padStart(5), String(r.sombras).padStart(6), String(r.personas).padStart(8), String(r.geos).padStart(5), String(r.texs).padStart(4), String(r.progs).padStart(5), String(r.pr).padStart(3), String(r.msMed).padStart(9), String(r.fps).padStart(6)].join(' '));
console.log(errors.length ? '\nERRORES:\n' + errors.join('\n') : '\nsin errores');
fs.writeFileSync(path.join(out, `${pref}-medidas.json`), JSON.stringify(resultados, null, 1));
await browser.close(); server.close();
