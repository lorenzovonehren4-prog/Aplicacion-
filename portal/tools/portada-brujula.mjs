// Portadas de Brújula Política para el portal (el juego no tiene 3D: se arma con capturas).
// Uso: node portal/tools/portada-brujula.mjs → portal/img/brujula-{cover,alt,hero}.webp
// Después: node portal/tools/caratulas.mjs brujula-politica
import { chromium } from 'playwright';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const url = pathToFileURL(path.join(root, 'brujula-politica/index.html')).href;
const tmp = path.join(root, 'portal/tests/capturas');
const webp = (png, name) => execFileSync('convert', [png, '-quality', '84', path.join(root, 'portal/img', name)]);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
// resultado de ejemplo: alguien que responde como la ideología pedida
const result = async (page, id, name) => {
  await page.goto(url);
  await page.evaluate(([id, name]) => {
    localStorage.clear();
    const i = IDEOS.find(x => x.id === id);
    S.name = name;
    S.answers = Q.map(([, w]) => { let d = 0; for (const k in w) d += w[k] * i.p[k]; return Math.max(-2, Math.min(2, Math.round(d * 2))); });
    finish(); localStorage.clear();
  }, [id, name]);
  await page.waitForTimeout(1000);
};
let page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.25 });
await result(page, 'ecologismo', 'Javier');
await page.screenshot({ path: path.join(tmp, 'brujula-hero.png') });
webp(path.join(tmp, 'brujula-hero.png'), 'brujula-hero.webp');
await page.close();
page = await browser.newPage({ viewport: { width: 520, height: 520 }, deviceScaleFactor: 640 / 520 });
await result(page, 'libcentro', 'Marco');
await page.screenshot({ path: path.join(tmp, 'brujula-cover.png') });
webp(path.join(tmp, 'brujula-cover.png'), 'brujula-cover.webp');
await page.close();
page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(url);
await page.evaluate(() => localStorage.clear());
await page.click('#go');
for (let i = 0; i < 6; i++) { await page.keyboard.press('2'); await page.waitForTimeout(220); }
await page.locator('#ans button').nth(1).hover();
await page.screenshot({ path: path.join(tmp, 'brujula-alt.png') });
webp(path.join(tmp, 'brujula-alt.png'), 'brujula-alt.webp');
await browser.close();
console.log('listo');
