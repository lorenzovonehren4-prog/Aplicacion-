// Arma las carátulas del portal: la mejor imagen de cada juego con su logo encima
// (título, género y frase), con los colores del juego. Las de carreras van inclinadas y
// con rayas de velocidad.
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
  .grade{position:absolute;inset:0;background:
    linear-gradient(0deg,rgba(6,6,12,.95) 0%,rgba(6,6,12,.7) 30%,rgba(6,6,12,0) 62%),
    linear-gradient(90deg,rgba(6,6,12,.55) 0%,rgba(6,6,12,0) 55%),
    radial-gradient(70% 60% at 10% 100%,color-mix(in srgb,var(--c) 45%,transparent),transparent 70%)}
  .vig{position:absolute;inset:0;box-shadow:inset 0 0 140px rgba(0,0,0,.65)}
  .streak{position:absolute;height:6px;border-radius:6px;background:linear-gradient(90deg,transparent,var(--c),var(--c2));transform:skewX(-30deg);opacity:.9}
  .logo{position:absolute;left:46px;right:46px;bottom:40px}
  .kick{display:inline-flex;gap:8px;align-items:center;font:600 15px 'BoxFred',sans-serif;letter-spacing:3px;text-transform:uppercase;color:#fff;padding:6px 12px;border-radius:8px;background:color-mix(in srgb,var(--c) 85%,#000);box-shadow:0 6px 18px color-mix(in srgb,var(--c) 45%,transparent)}
  .t{font:700 100px/0.92 'BoxFred';color:#fff;letter-spacing:1px;margin:14px 0 10px;max-width:820px;
     background:linear-gradient(180deg,#fff 0%,#fff 48%,color-mix(in srgb,var(--c2) 70%,#fff) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
     filter:drop-shadow(0 4px 0 color-mix(in srgb,var(--c) 80%,#000)) drop-shadow(0 12px 26px rgba(0,0,0,.75))}
  .race .t{font-style:italic;transform:skewX(-8deg);transform-origin:left bottom}
  .bar{height:7px;width:220px;border-radius:7px;background:linear-gradient(90deg,var(--c),var(--c2));margin:2px 0 12px;box-shadow:0 0 18px var(--c)}
  .race .bar{transform:skewX(-30deg)}
  .tag{font:500 24px/1.25 'BoxFred',sans-serif;color:rgba(255,255,255,.9);max-width:640px;text-shadow:0 2px 10px #000}
  .ag{position:absolute;top:26px;right:30px;font:600 13px 'BoxFred',sans-serif;letter-spacing:4px;color:rgba(255,255,255,.75);padding:7px 12px;border:1.5px solid rgba(255,255,255,.35);border-radius:999px;background:rgba(0,0,0,.35)}
  </style></head><body><div class="box ${race ? 'race' : ''}">
    <img class="bg" src="${data(pick(g))}">
    <div class="grade"></div><div class="vig"></div>
    ${race ? [[560, 340, 300], [660, 316, 180], [610, 470, 260], [720, 450, 150]].map(([x, y, w]) => `<i class="streak" style="left:${x}px;top:${y}px;width:${w}px;opacity:.5"></i>`).join('') : ''}
    <span class="ag">ANONYMOUS GAMES</span>
    <div class="logo"><span class="kick">${esc(kicker)}</span><h1 class="t" id="t">${esc(g.title)}</h1><div class="bar"></div><div class="tag">${esc(g.tagline)}</div></div>
  </div></body></html>`;
  await page.setContent(html);
  await page.evaluate(async () => { await document.fonts.load("600 23px 'BoxRub'"); await document.fonts.load("800 15px 'BoxRub'"); await document.fonts.load("700 100px 'BoxFred'"); await document.fonts.ready; });
  // achica el título hasta que entre en dos líneas
  await page.evaluate(() => { const t = document.getElementById('t'); let s = 100; while (s > 40 && (t.scrollWidth > 868 || t.getBoundingClientRect().height > s * 0.93 * 2 + 4)) { s -= 4; t.style.fontSize = s + 'px'; } });
  const png = path.join(out, `box-${g.id}.png`);
  await page.screenshot({ path: png });
  execFileSync('convert', [png, '-quality', '84', path.join(root, 'portal/img', `${g.id}-box.webp`)]);
  console.log(g.id);
}
await browser.close();
