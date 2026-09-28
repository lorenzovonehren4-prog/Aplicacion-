/**
 * Empaqueta el build de producción (dist/) en un único archivo HTML para
 * publicarlo como página de claude.ai (Artifact): JS, CSS y fuentes quedan
 * dentro del archivo, porque esa página no carga recursos de otros orígenes.
 *
 *   npm run build:artifact   →   dist-artifact/apice-gp.html
 *
 * La plataforma envuelve la página en su propio <html>/<head>/<body>, así que
 * el archivo lleva sólo el título, los estilos, el marcado del juego y el script.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = `${root}dist/`;
const out = `${root}dist-artifact/`;

async function main() {
  const html = await readFile(`${dist}index.html`, 'utf8');
  const scriptPath = html.match(/<script type="module"[^>]*src="\.\/([^"]+)"/)?.[1];
  const stylePath = html.match(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"/)?.[1];
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  const body = html.match(/<body>([\s\S]*)<\/body>/)?.[1];
  if (!scriptPath || !stylePath || !title || !body) {
    throw new Error('dist/index.html no tiene la forma esperada: corre `npm run build` antes.');
  }

  // Estilos: cada fuente WOFF2 va como data URI; el respaldo WOFF se descarta
  // (todos los navegadores con WebGL 2 leen WOFF2).
  let css = await readFile(`${dist}${stylePath}`, 'utf8');
  css = css.replace(/,\s*url\([^)]+\.woff\)\s*format\("woff"\)/g, '');
  const fonts = [...css.matchAll(/url\(\.\/([^)]+\.woff2)\)/g)].map((match) => match[1]);
  for (const font of new Set(fonts)) {
    const data = await readFile(`${dist}assets/${font}`);
    css = css.replaceAll(`url(./${font})`, `url(data:font/woff2;base64,${data.toString('base64')})`);
  }
  if (/url\(\.\//.test(css)) throw new Error('Quedó un recurso sin incrustar en el CSS.');

  // Script: un "</script" literal cerraría la etiqueta antes de tiempo.
  const js = (await readFile(`${dist}${scriptPath}`, 'utf8')).replaceAll('</script', '<\\/script');

  const page = [
    `<title>${title}</title>`,
    `<meta name="description" content="Carreras de monoplazas en 3D para navegador.">`,
    `<style>${css}</style>`,
    body.trim(),
    `<script type="module">${js}</script>`,
    '',
  ].join('\n');

  await mkdir(out, { recursive: true });
  await writeFile(`${out}apice-gp.html`, page);
  console.info(`dist-artifact/apice-gp.html · ${(page.length / 1024 / 1024).toFixed(2)} MB`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
