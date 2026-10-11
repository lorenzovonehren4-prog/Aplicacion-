// Herramienta de revisión visual: abre el juego, ejecuta un fragmento en la página y saca una captura.
// Uso: node tests/vista.mjs <salida.png> "<código JS>" [espera ms]   (CHROMIUM_PATH en contenedores)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(new URL('..', import.meta.url).pathname);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }).listen(0);
const [out, code = '', wait = '1500'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +(process.env.W || 1280), height: +(process.env.H || 720) } });
p.setDefaultTimeout(240000);
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(`http://localhost:${server.address().port}/index.html`);
await p.waitForFunction(() => document.body.classList.contains('ready'));
await p.click('#intro'); await p.waitForTimeout(500);
if (code) await p.evaluate(code);
await p.waitForTimeout(+wait);
await p.screenshot({ path: out });
if (errs.length) console.log('errores:', errs.slice(0, 5).join(' | '));
await b.close(); server.close();
