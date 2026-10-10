// Arma el juego en un solo archivo HTML (scripts, three.js y fuentes adentro) para jugar sin internet:
// node tools/empaquetar.mjs  →  Kartodromo.html
import fs from 'node:fs';
const dir = new URL('../', import.meta.url);
const read = f => fs.readFileSync(new URL(f, dir), 'utf8');
let html = read('index.html');
html = html.replace(/<link rel="preload"[^>]*>\n?/g, '');
html = html.replace(/url\((vendor\/fonts\/[\w.-]+\.woff2)\)/g, (_, f) => `url(data:font/woff2;base64,${fs.readFileSync(new URL(f, dir)).toString('base64')})`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, f) => `<script>\n${read(f).replace(/<\/script/gi, '<\\/script')}\n</script>`);
fs.writeFileSync(new URL('Kartodromo.html', dir), html);
console.log('Kartodromo.html', (html.length / 1024).toFixed(0), 'KB');
