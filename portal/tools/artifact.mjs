// Prepara la publicación del portal como Artifact de Claude.
// Uso: node portal/tools/artifact.mjs <carpeta-de-salida>
// Deja en la carpeta:
//   anonymous-games.html  la página (sin <!DOCTYPE>/<head>/<body>: el Artifact los pone)
//   files.json            mapa { ruta publicada: archivo del repo } con lo que cargan
//                         el portal y los 11 juegos (sin pruebas, herramientas ni fuentes TS)
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const out = path.resolve(process.argv[2] || path.join(root, 'dist'));
fs.mkdirSync(out, { recursive: true });

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
const css = [...html.matchAll(/<link rel="stylesheet"[^>]*>/g)].map(m => m[0]).join('\n');
const body = html.match(/<body>([\s\S]*)<\/body>/)[1].trim();
fs.writeFileSync(path.join(out, 'anonymous-games.html'), `${title}\n${css}\n${body}\n`);

const files = {};
const add = rel => { files[rel] = path.join(root, rel); };
const walk = (dir, keep = () => true) => {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, e.name);
    if (e.isDirectory()) walk(rel, keep); else if (keep(rel)) add(rel);
  }
};
const web = rel => /\.(html|js|css|json|woff2?|webp|png|svg)$/.test(rel) && !/\/(tests?|tools|e2e|capturas)\//.test(rel);

['portal/portal.css', 'portal/games.js', 'portal/portal.js'].forEach(add);
walk('portal/img'); walk('portal/fonts', r => r.endsWith('.woff2'));
add('formula-3d/apice-gp.html');
for (const g of ['karting', 'cornisa', 'codigo-rojo', 'sazon-tycoon', 'modo-carrera-futbol']) { add(`${g}/index.html`); walk(`${g}/src`); walk(`${g}/vendor`, r => /\.(js|woff2)$/.test(r)); }
add('tower-defense/index.html'); add('tower-defense/style.css'); walk('tower-defense/src');
add('mind-escape/index.html'); walk('mind-escape/styles', web); walk('mind-escape/js', web); add('mind-escape/data/levels-meta.json');
add('fuga-urbana/index.html'); add('escalada/index.html'); add('combi-rush/combi-rush.html');

fs.writeFileSync(path.join(out, 'files.json'), JSON.stringify(files, null, 1));
const bytes = Object.values(files).reduce((a, f) => a + fs.statSync(f).size, 0);
console.log(`${Object.keys(files).length} archivos, ${(bytes / 1e6).toFixed(1)} MB → ${out}`);
