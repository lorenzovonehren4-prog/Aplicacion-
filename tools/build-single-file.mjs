/**
 * tools/build-single-file.mjs — Compila el juego en un único archivo HTML.
 *
 * MIND ESCAPE no tiene proceso de compilación: se sirve tal cual y así se
 * desarrolla. Pero repartirlo pide otra cosa. Servido por HTTP hacen falta 54
 * archivos y un servidor; en un solo HTML se abre con doble clic, se manda por
 * mensaje y funciona sin red (salvo las fuentes, que ya degradan solas).
 *
 * Lo que hay que resolver son las dos cosas que el navegador buscaría fuera:
 * el fetch del catálogo y el import dinámico de cada nivel. Ambas se incrustan
 * y se siembran en el registro antes de arrancar (ver registry.js).
 *
 *   node tools/build-single-file.mjs   →   dist/mind-escape.html
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { build } from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist', 'mind-escape.html');

const html = await readFile(join(ROOT, 'index.html'), 'utf8');

/* Las hojas de estilo, en el mismo orden en que index.html las enlaza: el
   orden es significativo porque main.css define las variables y la cascada
   posterior las usa. */
const cssHrefs = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
const css = (await Promise.all(
  cssHrefs.map(async (href) => `/* ${href} */\n${await readFile(join(ROOT, href), 'utf8')}`),
)).join('\n');

/* El punto de entrada se genera aquí en vez de vivir en el repositorio: así no
   se queda desfasado el día que se añada el nivel 31. */
const ids = Array.from({ length: 30 }, (_, i) => String(i + 1).padStart(2, '0'));
const entry = `
import metaData from './data/levels-meta.json';
import { seedCatalog, seedLevelClass } from './js/levels/registry.js';
${ids.map((id) => `import Level${id} from './js/levels/level-${id}.js';`).join('\n')}

seedCatalog(metaData);
${ids.map((id) => `seedLevelClass(${Number(id)}, Level${id});`).join('\n')}

// game.js arranca el juego con sólo evaluarse, así que entra por import
// dinámico y no por una declaración import: ésas se izan todas al principio y
// el juego habría arrancado antes de las siembras de arriba.
import('./js/core/game.js');
`;

const bundle = await build({
  stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'single-file-entry.js', loader: 'js' },
  bundle: true,
  format: 'iife',
  target: 'es2022',
  charset: 'utf8',
  legalComments: 'none',
  write: false,
});

const js = bundle.outputFiles[0].text;

const page = html
  .replace(/[ \t]*<link rel="stylesheet" href="[^"]+"\s*\/?>\n?/g, '')
  .replace('</head>', `  <style>\n${css}\n  </style>\n</head>`)
  .replace(
    /[ \t]*<script type="module" src="[^"]+"><\/script>/,
    `  <script>\n${js}\n  </script>`,
  );

if (page.includes('<link rel="stylesheet"') || page.includes('type="module"')) {
  throw new Error('quedaron referencias externas sin incrustar');
}

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, page);

const kb = (n) => `${Math.round(n / 1024)} kB`;
console.log(`dist/mind-escape.html · ${kb(Buffer.byteLength(page))} (js ${kb(js.length)}, css ${kb(css.length)})`);
