// Saca las capturas de Mind Escape que usa el portal como portada.
// Uso: node portal/tools/capturas.mjs  → deja PNG en portal/tests/capturas/
// (después se pasan a webp con ImageMagick; ver portal/README.md).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const out = path.join(root, 'portal', 'tests', 'capturas');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const base = `http://localhost:${port}/mind-escape/index.html`;
await page.goto(base);
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(out, 'mind-menu.png') });
for (const n of (process.env.NIVELES || '7,13,16').split(',')) {
  await page.evaluate(() => localStorage.setItem('mindEscape_progress', JSON.stringify({ schemaVersion: 1, unlockedLevels: Array.from({ length: 30 }, (_, i) => i + 1), completedLevels: [], levelData: {}, settings: { sound: false, music: false }, totalPlayTime: 0, lastPlayedLevel: null })));
  await page.goto(`${base}#/level/${n}`);
  await page.reload();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(out, `mind-nivel-${n}.png`) });
}
await page.evaluate(() => localStorage.clear());
await browser.close(); server.close();
console.log('capturas en', out);
