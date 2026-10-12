/**
 * Fotos de Ápice GP (menú, garaje, presentación, parrilla, cámaras y autos de
 * cerca) y medición del render (renderer.info) en la parrilla, sobre el
 * archivo que abre el portal (apice-gp.html). No es parte de `npm test`.
 *
 *   CHROMIUM_PATH=... FOTOS=/carpeta/salida PREFIJO=antes-baja node tests/fotos.mjs
 *
 * Variables: CALIDAD (Baja, Media, Alta, Ultra; sin ella queda la detectada),
 * PISTA (nombre corto de la tarjeta, p. ej. Mónaco), CLIMA (Soleado, Nublado,
 * Atardecer), MENUS=0 (salta portada, menú y garaje), PREFIJO (nombre de las
 * fotos). Las mediciones quedan en <PREFIJO>-medicion.json.
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = process.env.FOTOS || path.join(root, 'e2e/capturas/fotos');
fs.mkdirSync(out, { recursive: true });
const CALIDAD = process.env.CALIDAD || '';
const PISTA = process.env.PISTA || '';
const CLIMA = process.env.CLIMA || '';
const PREFIJO = process.env.PREFIJO || 'antes';
const MENUS = process.env.MENUS !== '0';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/apice-gp.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const url = `http://localhost:${server.address().port}/apice-gp.html`;

const log = (m) => console.info('  ·', m);
const t0 = Date.now();
const shot = async (page, name) => { const p = path.join(out, `${PREFIJO}-${name}.png`); await page.screenshot({ path: p }); log(`${name} (${((Date.now() - t0) / 1000).toFixed(0)} s)`); };

async function waitForScreen(page, id) {
  await page.waitForFunction((screenId) => {
    const top = [...document.querySelectorAll('#ui > .screen')].at(-1);
    const wipeBusy = document.querySelector('.wipe')?.classList.contains('is-active');
    return Boolean(top?.classList.contains(`screen--${screenId}`)) && !wipeBusy;
  }, id, { polling: 150, timeout: 240000 });
  await page.waitForTimeout(500);
}

// Gancho de three.js para devtools: guarda el renderer y las escenas, y deja forzar la cámara.
const HOOK = () => {
  const hub = new EventTarget();
  window.__scenes = [];
  hub.addEventListener('observe', (e) => {
    const o = e.detail;
    if (o && o.isWebGLRenderer) {
      window.__renderer = o;
      const orig = o.render.bind(o);
      o.render = (scene, cam) => {
        if (window.__camOverride && scene && scene.fog && scene.getObjectByName('monoplaza')) window.__camOverride(cam, scene);
        return orig(scene, cam);
      };
    } else if (o && o.isScene) window.__scenes.push(o);
  });
  window.__THREE_DEVTOOLS__ = hub;
  // Mide la vista activa: lo que dibujó el último cuadro y lo que tiene la escena.
  window.__measure = () => new Promise((resolve) => {
    const times = [];
    let last = performance.now();
    let n = 0;
    const tick = (now) => {
      times.push(now - last); last = now; n++;
      if (n < 12) { requestAnimationFrame(tick); return; }
      const r = window.__renderer;
      const info = { calls: r.info.render.calls, triangles: r.info.render.triangles, points: r.info.render.points, lines: r.info.render.lines,
        geometries: r.info.memory.geometries, textures: r.info.memory.textures, programs: r.info.programs?.length,
        msPerFrame: +(times.slice(2).reduce((a, b) => a + b, 0) / Math.max(1, times.length - 2)).toFixed(1),
        pixelRatio: r.getPixelRatio(), shadowMap: r.shadowMap.enabled };
      const scene = [...window.__scenes].reverse().find((s) => s.fog && s.getObjectByName('monoplaza')) || window.__scenes.at(-1);
      let meshes = 0, visibleMeshes = 0, instanced = 0, instances = 0, pts = 0, lights = 0, castShadow = 0;
      const mats = new Set();
      scene.traverse((o) => {
        if (o.isLight) lights++;
        if (o.isPoints) pts++;
        if (o.isMesh) {
          meshes++;
          let v = true; for (let p = o; p; p = p.parent) if (!p.visible) { v = false; break; }
          if (v) visibleMeshes++;
          if (o.castShadow) castShadow++;
          if (o.isInstancedMesh) { instanced++; instances += o.count; }
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m));
        }
      });
      Object.assign(info, { meshes, visibleMeshes, instancedMeshes: instanced, instances, pointsObjects: pts, lights, castShadow, materials: mats.size });
      resolve(info);
    };
    requestAnimationFrame(tick);
  });
  // Cámara de portada respecto del auto del jugador: f adelante, s al costado, u arriba; mira a (lf, ls, l).
  window.__hero = (o) => {
    window.__camOverride = (cam, scene) => {
      const car = scene.getObjectByName('monoplaza');
      car.updateMatrixWorld();
      const m = car.matrixWorld.elements;
      // ejes del auto: +Z del modelo es hacia atrás o adelante según el modelo; se usa la matriz tal cual
      const px = m[12], py = m[13], pz = m[14];
      const fx = m[8], fz = m[10], sx = m[0], sz = m[2];
      const fl = Math.hypot(fx, fz) || 1, sl = Math.hypot(sx, sz) || 1;
      const F = [-fx / fl, -fz / fl], S = [sx / sl, sz / sl];
      cam.position.set(px + F[0] * o.f + S[0] * o.s, py + o.u, pz + F[1] * o.f + S[1] * o.s);
      cam.lookAt(px + F[0] * (o.lf || 0) + S[0] * (o.ls || 0), py + (o.l || 0), pz + F[1] * (o.lf || 0) + S[1] * (o.ls || 0));
      cam.fov = o.fov || 40; cam.updateProjectionMatrix();
    };
  };
};

const hideUi = (page, on) => page.evaluate((on) => {
  let st = document.getElementById('__solo');
  if (on && !st) { st = document.createElement('style'); st.id = '__solo'; st.textContent = '#ui, #overlay { visibility: hidden !important; }'; document.head.appendChild(st); }
  if (!on && st) st.remove();
}, on);

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(240000);
  const problems = [];
  page.on('pageerror', (e) => problems.push(`excepción: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`consola: ${m.text()}`); });
  await page.addInitScript(HOOK);
  await page.goto(url);
  await page.waitForSelector('.screen--splash .splash__prompt');
  await page.waitForTimeout(2500);
  if (MENUS) await shot(page, '01-portada');
  await page.keyboard.press('Enter');
  await waitForScreen(page, 'tutorial');
  await page.waitForSelector('.tut__input:focus');
  await page.keyboard.type('Piloto');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.tut__option.is-focused');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.tut__key');
  await page.keyboard.press('Enter');
  await waitForScreen(page, 'menu');
  if (CALIDAD) {
    await page.locator('.mtile', { hasText: 'Ajustes' }).click();
    await waitForScreen(page, 'settings');
    for (let i = 0; i < 6; i++) {
      const v = (await page.locator('.srow.is-focused .selector__value').textContent())?.trim();
      if (v === CALIDAD) break;
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);
    }
    log(`calidad: ${(await page.locator('.srow.is-focused .selector__value').textContent())?.trim()}`);
    if (MENUS) await shot(page, '02-ajustes');
    await page.keyboard.press('Escape');
    await waitForScreen(page, 'menu');
  } else {
    log('calidad detectada (swiftshader → la de las compus sin GPU dedicada)');
  }
  await page.mouse.move(2, 2);
  if (MENUS) {
    await page.waitForTimeout(4000);
    await shot(page, '03-menu');
    log(`menú: ${JSON.stringify(await page.evaluate(() => window.__measure()))}`);
    await hideUi(page, true);
    await shot(page, '04-menu-solo3d');
    await hideUi(page, false);
    await page.locator('.mtile', { hasText: 'Garaje' }).click();
    await waitForScreen(page, 'garage');
    await page.mouse.move(2, 2);
    await page.waitForTimeout(3000);
    await shot(page, '05-garaje');
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(3000);
    await shot(page, '06-garaje-pintura');
    await page.keyboard.press('Escape');
    await waitForScreen(page, 'menu');
    await page.mouse.move(2, 2);
  }
  await page.locator('.mtile', { hasText: 'Carrera rápida' }).click();
  await waitForScreen(page, 'rsel');
  if (PISTA) await page.locator('.tcard', { hasText: PISTA }).click();
  if (CLIMA) {
    const row = page.locator('.srow', { hasText: 'Clima' });
    await row.hover();
    for (let i = 0; i < 4; i++) {
      const v = (await row.locator('.selector__value').textContent())?.trim();
      if (v === CLIMA) break;
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(250);
    }
    log(`clima: ${(await row.locator('.selector__value').textContent())?.trim()}`);
  }
  await page.waitForTimeout(1500);
  if (MENUS) await shot(page, '07-seleccion');
  await page.locator('.rsel__start').click();
  await page.waitForSelector('.screen--race .loading', { state: 'attached' });
  await page.waitForTimeout(1500);
  if (MENUS && (await page.locator('.loading').isVisible())) await shot(page, '08-carga');
  await waitForScreen(page, 'race');
  await page.waitForSelector('.loading', { state: 'detached' });
  await page.waitForSelector('.race__intro-title');
  await page.waitForTimeout(1500);
  await shot(page, '10-presentacion-vuelo');
  await page.waitForTimeout(5000);
  await shot(page, '11-presentacion-b');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.hud:not(.is-hidden)');
  await page.waitForTimeout(2500);
  await shot(page, '12-parrilla-hud');
  const stats = await page.evaluate(() => window.__measure());
  log(`parrilla (cámara por defecto): ${JSON.stringify(stats)}`);
  fs.writeFileSync(path.join(out, `${PREFIJO}-medicion.json`), JSON.stringify({ calidad: CALIDAD || 'detectada', pista: PISTA || 'guardada', clima: CLIMA || 'soleado', parrilla: stats }, null, 2));
  await hideUi(page, true);
  // Las otras cámaras (C las recorre).
  for (let i = 1; i <= 2; i++) {
    await page.keyboard.press('KeyC');
    await page.waitForTimeout(2500);
    await shot(page, `13-camara-${i}`);
    log(`cámara ${i}: ${JSON.stringify(await page.evaluate(() => window.__measure()))}`);
  }
  // (se queda en la cámara de persecución: con la cockpit el piloto se oculta)
  // Tomas de portada con la cámara forzada.
  await page.evaluate(() => window.__hero({ f: 4.2, s: -2.6, u: 0.7, l: 0.35, lf: 0, fov: 38 }));
  await page.waitForTimeout(2500);
  await shot(page, '14-auto-frente');
  await page.evaluate(() => window.__hero({ f: -4.5, s: 2.2, u: 1.1, l: 0.4, lf: 0.5, fov: 38 }));
  await page.waitForTimeout(2500);
  await shot(page, '15-auto-atras');
  await page.evaluate(() => window.__hero({ f: 0.2, s: -1.3, u: 1.6, l: 0.6, lf: 0.3, ls: 0, fov: 45 }));
  await page.waitForTimeout(2500);
  await shot(page, '16-piloto-cabina');
  await page.evaluate(() => window.__hero({ f: -14, s: 9, u: 7, l: 0, lf: 20, fov: 50 }));
  await page.waitForTimeout(2500);
  await shot(page, '17-parrilla-alta');
  log(`parrilla alta: ${JSON.stringify(await page.evaluate(() => window.__measure()))}`);
  await page.evaluate(() => window.__hero({ f: 30, s: 26, u: 32, l: 2, lf: -40, ls: -30, fov: 55 }));
  await page.waitForTimeout(2500);
  await shot(page, '18-escenario');
  await page.evaluate(() => { window.__camOverride = null; });
  // Acelerar un rato (después de las luces) y foto en movimiento con el HUD.
  await hideUi(page, false);
  await page.waitForTimeout(6000);
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(9000);
  await shot(page, '19-en-marcha-hud');
  await hideUi(page, true);
  await page.evaluate(() => window.__hero({ f: 5.5, s: 3.5, u: 1.2, l: 0.3, lf: -2, fov: 40 }));
  await page.waitForTimeout(1200);
  await shot(page, '20-en-marcha-cerca');
  await page.keyboard.up('ArrowUp');
  if (problems.length) log(`problemas: ${problems.slice(0, 8).join(' | ')}`);
  await browser.close();
  server.close();
}

main().catch((e) => { console.error(e); server.close(); process.exit(1); });
