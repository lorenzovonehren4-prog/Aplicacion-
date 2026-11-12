// Renderiza un short: node motor/render.mjs <carpeta> [salida.mp4] | node motor/render.mjs <carpeta> --fotos 1,5,9
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [dirArg, ...rest] = process.argv.slice(2);
const dir = path.resolve(dirArg);
const TL = JSON.parse(fs.readFileSync(path.join(dir, 'timeline.json'), 'utf8'));
const FPS = 30;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.addInitScript(tl => { window.__TL__ = tl; }, TL);
page.on('pageerror', e => { console.error('ERROR', e.message); process.exit(1); });
await page.goto('file://' + path.join(dir, 'escena.html'));
await page.waitForFunction(() => window.setT && window.ready);
await page.evaluate(() => window.ready);
if (rest[0] === '--fotos') {
  fs.mkdirSync(path.join(dir, 'fotos'), { recursive: true });
  for (const t of rest[1].split(',').map(Number)) {
    await page.evaluate(t => window.setT(t), t);
    await page.screenshot({ path: path.join(dir, 'fotos', `t${String(t.toFixed(2)).padStart(6, '0')}.jpg`), type: 'jpeg', quality: 80 });
  }
  await browser.close(); process.exit(0);
}
const out = path.resolve(rest[0] || path.join(dir, 'video.mp4'));
const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-i', path.join(dir, 'audio.wav'), '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p',
  '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const n = Math.round(TL.total * FPS);
for (let i = 0; i < n; i++) {
  await page.evaluate(t => window.setT(t), i / FPS);
  const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
}
ff.stdin.end(); await new Promise(r => ff.on('close', r)); await browser.close();
console.log('listo', out);
