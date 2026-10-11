// Arma las carátulas del portal: la escena ilustrada de cada juego (escenas.mjs) o, si no
// tiene, su mejor captura, con el logo encima (género y título) en los colores del juego.
// Las de carreras van inclinadas.
// Uso: node portal/tools/caratulas.mjs [id …]  → portal/img/<id>-box.webp (960x600)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { SCENES } from './escenas.mjs';

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
  .bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(1.2) contrast(1.08) brightness(.95);transform:scale(1.04)}
  .scene{position:absolute;inset:0}.scene svg{display:block;width:960px;height:600px}
  .grade{position:absolute;inset:0;background:
    linear-gradient(0deg,rgba(6,6,12,.9) 0%,rgba(6,6,12,.55) 24%,rgba(6,6,12,0) 46%),
    linear-gradient(65deg,rgba(6,6,12,.6) 0%,rgba(6,6,12,0) 42%),
    radial-gradient(70% 60% at 10% 100%,color-mix(in srgb,var(--c) 45%,transparent),transparent 70%)}
  .vig{position:absolute;inset:0;box-shadow:inset 0 0 140px rgba(0,0,0,.65)}
  .streak{position:absolute;height:6px;border-radius:6px;background:linear-gradient(90deg,transparent,var(--c),var(--c2));transform:skewX(-30deg);opacity:.9}
  .logo{position:absolute;left:44px;right:44px;bottom:34px}
  .kick{display:inline-flex;gap:8px;align-items:center;font:600 19px 'BoxFred',sans-serif;letter-spacing:3px;text-transform:uppercase;color:#fff;padding:6px 12px;border-radius:8px;background:color-mix(in srgb,var(--c) 85%,#000);box-shadow:0 6px 18px color-mix(in srgb,var(--c) 45%,transparent)}
  .t{font:700 124px/0.9 'BoxFred';color:#fff;letter-spacing:1px;margin:14px 0 8px;max-width:880px;
     background:linear-gradient(180deg,#fff 0%,#fff 48%,color-mix(in srgb,var(--c2) 70%,#fff) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
     filter:drop-shadow(0 5px 0 color-mix(in srgb,var(--c) 80%,#000)) drop-shadow(0 0 2px rgba(0,0,0,.9)) drop-shadow(0 12px 26px rgba(0,0,0,.8))}
  .race .t{font-style:italic;transform:skewX(-8deg);transform-origin:left bottom}
  .bar{height:9px;width:260px;border-radius:7px;background:linear-gradient(90deg,var(--c),var(--c2));margin:2px 0 12px;box-shadow:0 0 18px var(--c)}
  .race .bar{transform:skewX(-30deg)}
  .tag{font:500 24px/1.25 'BoxFred',sans-serif;color:rgba(255,255,255,.9);max-width:640px;text-shadow:0 2px 10px #000}
  .ag{position:absolute;top:24px;right:28px;font:600 13px 'BoxFred',sans-serif;letter-spacing:4px;color:rgba(255,255,255,.75);padding:7px 12px;border:1.5px solid rgba(255,255,255,.35);border-radius:999px;background:rgba(0,0,0,.35)}
  </style></head><body><div class="box ${race ? 'race' : ''}">
    ${SCENES[g.id] ? `<div class="scene">${SCENES[g.id]()}</div>` : `<img class="bg" src="${data(pick(g))}">`}
    <div class="grade"></div><div class="vig"></div>
    <span class="ag">ANONYMOUS GAMES</span>
    <div class="logo"><span class="kick">${esc(kicker)}</span><h1 class="t" id="t">${esc(g.title)}</h1><div class="bar"></div></div>
  </div></body></html>`;
  await page.setContent(html);
  await page.evaluate(async () => { await document.fonts.load("600 23px 'BoxRub'"); await document.fonts.load("800 15px 'BoxRub'"); await document.fonts.load("700 100px 'BoxFred'"); await document.fonts.ready; });
  // achica el título hasta que entre en dos líneas
  await page.evaluate(() => { const t = document.getElementById('t'); let s = 124; while (s > 40 && (t.scrollWidth > 872 || t.getBoundingClientRect().height > s * 0.92 * 2 + 4)) { s -= 4; t.style.fontSize = s + 'px'; } });
  const png = path.join(out, `box-${g.id}.png`);
  await page.screenshot({ path: png });
  execFileSync('convert', [png, '-quality', '84', path.join(root, 'portal/img', `${g.id}-box.webp`)]);
  console.log(g.id);
}
await browser.close();
