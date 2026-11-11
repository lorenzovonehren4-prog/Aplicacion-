// Renderiza escena.html cuadro a cuadro y lo une con audio.wav.
// Uso: node render.mjs [salida.mp4]   |   node render.mjs --fotos 0.1,5,12  (sólo capturas de prueba)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const TL = JSON.parse(fs.readFileSync(path.join(dir, 'timeline.json'), 'utf8'));
const FPS = 30;
const args = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.addInitScript(tl => { window.__TL__ = tl; }, TL);
page.on('pageerror', e => { console.error('ERROR', e.message); process.exit(1); });
await page.goto('file://' + path.join(dir, 'escena.html'));
await page.evaluate(() => window.ready);

if (args[0] === '--fotos') {
  fs.mkdirSync(path.join(dir, 'fotos'), { recursive: true });
  for (const t of args[1].split(',').map(Number)) {
    await page.evaluate(t => window.setT(t), t);
    await page.screenshot({ path: path.join(dir, 'fotos', `t${t.toFixed(2)}.jpg`), type: 'jpeg', quality: 80 });
  }
  await browser.close(); process.exit(0);
}
const out = args[0] || path.join(dir, 'short.mp4');
const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-i', path.join(dir, 'audio.wav'), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const n = Math.round(TL.total * FPS);
for (let i = 0; i < n; i++) {
  await page.evaluate(t => window.setT(t), i / FPS);
  const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 150 === 0) console.log(`${i}/${n}`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log('listo', out);
