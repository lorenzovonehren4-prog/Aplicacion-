// Arma las carátulas del portal: una foto real del juego en plena partida (portal/tools/fotos/,
// las saca fotos.mjs) o, si no hay, su mejor captura, con retoque de cine y el logo encima
// (género y título) en los colores del juego. Las de carreras van inclinadas.
// Uso: node portal/tools/caratulas.mjs [id …]  → portal/img/<id>-box.webp (960x600)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const out = path.join(root, 'portal', 'tests', 'capturas');
fs.mkdirSync(out, { recursive: true });
// lee el catálogo tal cual lo usa el portal
const ctx = { localStorage: { getItem: () => null }, window: {}, indexedDB: undefined, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'portal/games.js'), 'utf8') + ';this.GAMES = GAMES;', ctx);
const GAMES = ctx.GAMES;
const ids = process.argv.slice(2);
const data = f => `data:${f.endsWith('.svg') ? 'image/svg+xml' : f.endsWith('.png') ? 'image/png' : 'image/webp'};base64,${fs.readFileSync(path.join(root, f)).toString('base64')}`;
const font = f => `data:font/woff2;base64,${fs.readFileSync(path.join(root, 'portal/fonts', f)).toString('base64')}`;
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// la imagen de fondo: la grande si es foto, si no la portada o la segunda imagen
// (algunas portadas ya traen el nombre del juego escrito: para esas se usa una foto del juego)
const PREFER_ALT = ['futbol', 'tower-defense', 'mind-escape'];
// encuadre de cada foto: punto que queda al centro y acercamiento
const FRAME = {
  'apice-gp': ['50% 62%', 1.12], karting: ['62% 40%', 1.12], 'codigo-rojo': ['62% 50%', 1.18], cornisa: ['46% 50%', 1.08],
  'combi-rush': ['62% 46%', 1.15], 'fuga-urbana': ['50% 50%', 1.02], sazon: ['56% 46%', 1.12], futbol: ['20% 100%', 1.3],
  'tower-defense': ['50% 50%', 1.03], escalada: ['50% 30%', 1.04], 'mind-escape': ['50% 30%', 1.02], 'brujula-politica': ['50% 40%', 1.08],
};
const foto = id => { const f = `portal/tools/fotos/${id}.webp`; return fs.existsSync(path.join(root, f)) ? f : null; };
const pick = g => (PREFER_ALT.includes(g.id) ? [g.alt] : [g.hero, g.cover, g.alt]).find(f => f && !f.endsWith('.svg'));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
for (const g of GAMES) {
  if (ids.length && !ids.includes(g.id)) continue;
  const race = g.cats.includes('carreras');
  const kicker = g.tags.slice(0, 3).join(' · ');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:'BoxFred';src:url(${font('fredoka.woff2')});font-weight:300 700}
  @font-face{font-family:'BoxRub';src:url(${font('rubik.woff2')});font-weight:300 900}
  *{box-sizing:border-box;margin:0}
  body{width:960px;height:600px;overflow:hidden;background:#000}
  .box{position:relative;width:960px;height:600px;overflow:hidden;--c:${g.color};--c2:${g.color2}}
  .bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:var(--pos);filter:saturate(1.18) contrast(1.12) brightness(.97);transform:scale(var(--z));transform-origin:var(--pos)}
  .light{position:absolute;inset:0;background:radial-gradient(60% 50% at 80% 10%,rgba(255,240,220,.18),transparent 70%);mix-blend-mode:screen}
  .grade{position:absolute;inset:0;background:
    linear-gradient(0deg,rgba(6,6,12,.92) 0%,rgba(6,6,12,.6) 22%,rgba(6,6,12,0) 48%),
    linear-gradient(70deg,rgba(6,6,12,.55) 0%,rgba(6,6,12,0) 45%),
    radial-gradient(70% 60% at 10% 100%,color-mix(in srgb,var(--c) 45%,transparent),transparent 70%)}
  .vig{position:absolute;inset:0;box-shadow:inset 0 0 160px rgba(0,0,0,.7)}
  .streak{position:absolute;height:6px;border-radius:6px;background:linear-gradient(90deg,transparent,var(--c),var(--c2));transform:skewX(-30deg);opacity:.9}
  .logo{position:absolute;left:44px;right:44px;bottom:34px}
  .kick{display:inline-flex;gap:8px;align-items:center;font:600 19px 'BoxFred',sans-serif;letter-spacing:3px;text-transform:uppercase;color:#fff;padding:6px 12px;border-radius:8px;background:color-mix(in srgb,var(--c) 85%,#000);box-shadow:0 6px 18px color-mix(in srgb,var(--c) 45%,transparent)}
  .t{font:700 104px/0.9 'BoxFred';color:#fff;letter-spacing:1px;margin:14px 0 8px;max-width:800px;
     background:linear-gradient(180deg,#fff 0%,#fff 48%,color-mix(in srgb,var(--c2) 70%,#fff) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
     filter:drop-shadow(0 5px 0 color-mix(in srgb,var(--c) 80%,#000)) drop-shadow(0 0 2px rgba(0,0,0,.9)) drop-shadow(0 12px 26px rgba(0,0,0,.8))}
  .race .t{font-style:italic;transform:skewX(-8deg);transform-origin:left bottom}
  .bar{height:9px;width:260px;border-radius:7px;background:linear-gradient(90deg,var(--c),var(--c2));margin:2px 0 12px;box-shadow:0 0 18px var(--c)}
  .race .bar{transform:skewX(-30deg)}
  .tag{font:500 24px/1.25 'BoxFred',sans-serif;color:rgba(255,255,255,.9);max-width:640px;text-shadow:0 2px 10px #000}
  .ag{position:absolute;top:24px;right:28px;font:600 13px 'BoxFred',sans-serif;letter-spacing:4px;color:rgba(255,255,255,.75);padding:7px 12px;border:1.5px solid rgba(255,255,255,.35);border-radius:999px;background:rgba(0,0,0,.35)}
  </style></head><body><div class="box ${race ? 'race' : ''}">
    <img class="bg" style="--pos:${(FRAME[g.id] || ['50% 50%'])[0]};--z:${(FRAME[g.id] || [0, 1.04])[1]}" src="${data(foto(g.id) || pick(g))}">
    <div class="light"></div>
    <div class="grade"></div><div class="vig"></div>
    <span class="ag">ANONYMOUS GAMES</span>
    <div class="logo"><span class="kick">${esc(kicker)}</span><h1 class="t" id="t">${esc(g.title)}</h1><div class="bar"></div></div>
  </div></body></html>`;
  await page.setContent(html);
  await page.evaluate(async () => { await document.fonts.load("600 23px 'BoxRub'"); await document.fonts.load("800 15px 'BoxRub'"); await document.fonts.load("700 100px 'BoxFred'"); await document.fonts.ready; });
  // achica el título hasta que entre en dos líneas
  await page.evaluate(() => { const t = document.getElementById('t'); let s = 104; while (s > 40 && (t.scrollWidth > 800 || t.getBoundingClientRect().height > s * 0.92 * 2 + 4)) { s -= 4; t.style.fontSize = s + 'px'; } });
  const png = path.join(out, `box-${g.id}.png`);
  await page.screenshot({ path: png });
  execFileSync('convert', [png, '-quality', '84', path.join(root, 'portal/img', `${g.id}-box.webp`)]);
  console.log(g.id);
}
await browser.close();
