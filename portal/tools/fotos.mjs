// Fotos de portada: abre cada juego, arranca una partida, pone una cámara de cine
// apuntando al jugador, oculta el HUD y saca una captura grande.
// Uso: node portal/tools/fotos.mjs [id …] → portal/tests/capturas/fotos/<id>.png
// Después: node portal/tools/caratulas.mjs (las usa como fondo de las carátulas).
// En el contenedor el navegador dibuja por software: cada juego tarda un rato.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const out = path.join(root, 'portal/tests/capturas/fotos');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const url = p => `http://localhost:${server.address().port}/${p}`;

// deja visible sólo el lienzo del juego
const onlyCanvas = (page, sel) => page.evaluate(sel => {
  const c = typeof sel === 'string' ? document.querySelector(sel) : sel;
  const st = document.createElement('style');
  st.textContent = 'body *{visibility:hidden!important} .__foto{visibility:visible!important}';
  document.head.appendChild(st); c.classList.add('__foto');
}, sel);
// cámara de portada: delante y al costado del vehículo, baja, mirándolo
const HERO = `window.__hero = (cam, p, o) => {
  const fx = Math.sin(p.h), fz = Math.cos(p.h), sx = Math.cos(p.h), sz = -Math.sin(p.h);
  cam.position.set(p.x + fx * o.f + sx * o.s, p.y + o.u, p.z + fz * o.f + sz * o.s);
  cam.lookAt(p.x + fx * (o.lf || 0) + sx * (o.ls || 0), p.y + (o.l || 0), p.z + fz * (o.lf || 0) + sz * (o.ls || 0));
  cam.fov = o.fov || 40; cam.updateProjectionMatrix();
};`;

const SHOTS = {
  async karting(page) {
    await page.goto(url('karting/index.html'));
    await page.waitForFunction(() => document.body.classList.contains('ready'));
    await page.click('[data-act=quick]');
    await page.evaluate(id => { UI.sel.track = id; renderTracks(); }, process.env.PISTA || 't1');
    await page.click('#btnGo');
    await page.waitForFunction(() => R.on && document.body.classList.contains('ready'));
    await page.evaluate(() => {
      R.countdown = 0.62; updateRace(1 / 120, [{}]);
      const t = +(new URLSearchParams(location.search).get('t') || 9);
      for (let i = 0; i < 120 * t; i++) updateRace(1 / 120, [botInput(R.player, 1 / 120)]);
    });
    await page.evaluate(HERO);
    await page.evaluate(() => { UI.paused = true; window.__cam = { f: 3.4, s: -2.2, u: 0.5, l: 0.45, lf: -1.2, fov: 34 }; window.updateCamera = () => __hero(W.camera, R.player.p, __cam); });
    await onlyCanvas(page, 'canvas');
    return { cam: o => page.evaluate(o => { Object.assign(__cam, o); }, o) };
  },
  async 'codigo-rojo'(page) {
    await page.goto(url('codigo-rojo/index.html'));
    await page.waitForFunction(() => document.body.classList.contains('ready'));
    await page.evaluate(n => { window.__node = n; }, process.env.NODO || 1);
    await page.evaluate(t => {
      G.garage = false; startGame(Object.assign({}, FREE, { time: t, diff: 'dificil' })); showScreen('hud'); document.body.classList.add('playing');
      G.mode = 'play';
      const secs = +(window.__secs || 7);
      for (let i = 0; i < secs * 60; i++) simulate(1 / 60);
      // la escena: el ladrón en una calle del centro y dos patrulleros pegados atrás
      const ok = CITY.nodes.filter(n => Math.abs(n.z) > 90 && Math.abs(n.x) < 150), a = ok[+(window.__node || 0) % ok.length], sp = laneSpot(a, nodeAt(a.nb.find(k => Math.abs(nodeAt(k).z) > 60) ?? a.nb[0]), 0.5), b = G.player.body;
      window.__dbg = [ok.length, a.x, a.z, sp.x, sp.z];
      Object.assign(b, { x: sp.x, z: sp.z, h: sp.h, y: 0 });
      const cops = G.cops.filter(c => !c.player);
      [[-8, 2.2], [-15, -2]].forEach(([d, s], i) => { const c = cops[i]; if (!c) return; Object.assign(c.body, { x: sp.x + Math.sin(sp.h) * d + Math.cos(sp.h) * s, z: sp.z + Math.cos(sp.h) * d - Math.sin(sp.h) * s, h: sp.h + (i ? 0.08 : -0.12), y: 0, dead: false }); c.wait = 0; });
      for (const c of cops.slice(2)) Object.assign(c.body, { x: 9999, z: 9999 });
      G.mode = 'pause';
    }, process.env.HORA || 'tarde');
    await page.evaluate(HERO);
    await page.evaluate(() => { window.__cam = { f: 6.5, s: -2.6, u: 0.75, l: 1.1, lf: -5, fov: 42 }; window.updateCamera = () => __hero(W.camera, G.player.body, __cam); });
    await onlyCanvas(page, 'canvas');
    return { cam: o => page.evaluate(o => { Object.assign(__cam, o); }, o) };
  },
  async cornisa(page) {
    await page.goto(url('cornisa/index.html'));
    await page.waitForFunction(() => document.body.classList.contains('ready') && G.C && G.attract);
    await page.evaluate(() => { const n = +(window.__secs || 14) * 60; for (let i = 0; i < n; i++) attractStep(1 / 60); poseCar(G.car, G.C, 1 / 60); G.mode = 'pause'; });
    await page.evaluate(HERO);
    await page.evaluate(() => { window.__cam = { f: -9, s: -4.5, u: 4.2, l: 0.6, lf: 4, fov: 46 }; window.updateCamera = () => __hero(W.camera, G.C, __cam); });
    await onlyCanvas(page, 'canvas');
    return { cam: o => page.evaluate(o => { Object.assign(__cam, o); }, o) };
  },
  async sazon(page) {
    await page.goto(url('sazon-tycoon/index.html'));
    await page.waitForFunction(() => document.body.classList.contains('ready'));
    await page.click('#t-go').catch(() => {});
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      document.querySelectorAll('.tut, #tut, .coach').forEach(e => e.remove());
      const n = +(window.__secs || 90) * 30; for (let i = 0; i < n; i++) updateSim(1 / 30);
      window.__cam = { yaw: 0.55, dist: 760, pitch: 0.62 };
      CAM.yawT = __cam.yaw; CAM.distT = __cam.dist; camYaw = __cam.yaw; camDist = __cam.dist; camPitch = __cam.pitch;
      CAM.zMin = 200;
    });
    await onlyCanvas(page, '#game');
    return { cam: o => page.evaluate(o => { Object.assign(__cam, o); CAM.yawT = __cam.yaw; CAM.distT = __cam.dist; camYaw = __cam.yaw; camDist = __cam.dist; camPitch = __cam.pitch; }, o) };
  },
  async 'apice-gp'(page) {
    const screen = id => (console.log('  ·', id), page.waitForFunction(id => { const top = [...document.querySelectorAll('#ui > .screen')].at(-1); return top && top.classList.contains('screen--' + id) && !document.querySelector('.wipe')?.classList.contains('is-active'); }, id));
    await page.goto(url('formula-3d/apice-gp.html'));
    await page.waitForSelector('.screen--splash .splash__prompt');
    await page.waitForTimeout(800);
    await page.keyboard.press('Enter');
    await screen('tutorial'); await page.waitForSelector('.tut__input:focus'); await page.keyboard.type('Piloto');
    await page.keyboard.press('Enter'); await page.waitForSelector('.tut__option.is-focused'); await page.keyboard.press('Enter');
    await page.waitForSelector('.tut__key'); await page.keyboard.press('Enter');
    await screen('menu');
    await page.locator('.mtile', { hasText: 'Carrera rápida' }).click();
    await screen('rsel');
    if (process.env.CIRCUITO) await page.locator('.screen--rsel *', { hasText: new RegExp('^' + process.env.CIRCUITO + '$') }).first().click();
    await page.locator('text=¡A LA PARRILLA!').click();
    await screen('race'); await page.waitForSelector('.loading', { state: 'detached' });
    await page.waitForSelector('.race__intro-title');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.hud:not(.is-hidden)');
    await page.waitForTimeout(+(process.env.INTRO || 2000));
    await onlyCanvas(page, '#gl');
    // cada toma: n veces C (cámara) y acelerar t ms
    return { cam: async o => { for (let i = 0; i < (o.c || 0); i++) await page.keyboard.press('KeyC'); if (o.t) { await page.keyboard.down('ArrowUp'); await page.waitForTimeout(o.t); await page.keyboard.up('ArrowUp'); } } };
  },
  async escalada(page) {
    await page.goto(url('escalada/index.html'));
    await page.waitForTimeout(2500);
    await page.locator('text=Jugar solo').first().click();
    await page.waitForTimeout(4000);
    await onlyCanvas(page, '#gameCanvas');
    // a media montaña, parado sobre un apoyo
    return { cam: o => page.evaluate(f => {
      const ps = platforms.filter(p => p.y < GROUND_Y - 400).sort((a, b) => b.y - a.y), p = ps[Math.floor(ps.length * f)];
      const w = p.w || p.width || 80;
      Object.assign(player, { x: p.x + w / 2 - PW / 2, y: p.y - PH - 1, vx: 0, vy: -9, onGround: false });
      return [ps.length, p.x, p.y, w];
    }, o.f).then(r => console.log('  · apoyo', r)) };
  },
  async 'fuga-urbana'(page) {
    await page.goto(url('fuga-urbana/index.html'));
    await page.waitForTimeout(2500);
    await page.click('#enterBtn').catch(() => {});
    await page.waitForTimeout(2000);
    await page.evaluate(() => { gIdx = Math.max(0, CARS.findIndex(c => save.unlocked.includes(c.id))); startGame(); });
    await page.waitForTimeout(4000);
    await page.keyboard.down('ArrowUp'); await page.waitForTimeout(+(process.env.CORRE || 12000));
    await onlyCanvas(page, '#game');
    return { cam: async o => { await page.keyboard.down(o.k || 'ArrowLeft'); await page.waitForTimeout(o.t || 700); await page.keyboard.up(o.k || 'ArrowLeft'); } };
  },
};

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SHOTS);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
for (const id of ids) {
  // reducedMotion: Ápice GP acorta sus animaciones de pantalla (con dibujo por software se traban)
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })).newPage();
  page.setDefaultTimeout(300000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    const ctl = await SHOTS[id](page);
    const cams = process.env.CAMS ? JSON.parse(process.env.CAMS) : [null];
    for (let i = 0; i < cams.length; i++) {
      if (cams[i] && ctl && ctl.cam) await ctl.cam(cams[i]);
      await page.waitForTimeout(+(process.env.ESPERA || 5000));
      await page.screenshot({ path: path.join(out, cams.length > 1 ? `${id}-${i}.png` : `${id}.png`) });
    }
    console.log(id, errors.length ? errors.slice(0, 2) : 'ok');
  } catch (e) { console.log(id, 'falló:', e.message.split('\n')[0], errors.slice(0, 2)); }
  await page.close();
}
await browser.close(); server.close();
