/**
 * tools/build-single-file.mjs — Empaqueta el juego en un único archivo HTML.
 *
 * Para desarrollar, el juego se sirve tal cual (index.html + style.css + src/).
 * Para repartirlo conviene un solo archivo: se abre con doble clic, se manda
 * por mensaje y funciona sin red ni servidor. Este script incrusta la hoja de
 * estilos y todos los scripts, en el mismo orden en que los enlaza index.html.
 *
 *   node tower-defense/tools/build-single-file.mjs   →   tower-defense/dist/reino-en-guardia.html
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist', 'reino-en-guardia.html');

let html = await readFile(join(ROOT, 'index.html'), 'utf8');

// Hojas de estilo → <style>
for (const m of [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)]) {
  const css = await readFile(join(ROOT, m[1]), 'utf8');
  html = html.replace(m[0], () => '<style>\n' + css + '\n</style>');
}

// Scripts → <script> en línea (se evita que un "</script>" dentro del código cierre la etiqueta)
for (const m of [...html.matchAll(/<script src="([^"]+)"><\/script>/g)]) {
  const js = (await readFile(join(ROOT, m[1]), 'utf8')).replace(/<\/script/gi, '<\\/script');
  html = html.replace(m[0], () => '<script>\n/* ' + m[1] + ' */\n' + js + '\n</script>');
}

if (/<script src=|<link rel="stylesheet"/.test(html)) throw new Error('Quedó algún recurso externo sin incrustar');

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, html);
console.log('OK:', OUT, '(' + Math.round(html.length / 1024) + ' kB)');
