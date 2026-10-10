// Ápice GP (formula-3d/) es Vite + TypeScript: el portal usa su versión de un solo
// archivo. Rearmarla después de cambiar el juego:
//   cd formula-3d && npm ci && npm run build:artifact && cd .. && node portal/tools/apice-gp.mjs
// build:artifact deja un fragmento pensado para incrustar (sin <!DOCTYPE> ni charset);
// aquí se le pone la cabecera para que abra bien como página suelta.
import fs from 'node:fs';
const root = new URL('../../formula-3d/', import.meta.url);
const frag = fs.readFileSync(new URL('dist-artifact/apice-gp.html', root), 'utf8');
const head = '<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n';
fs.writeFileSync(new URL('apice-gp.html', root), head + frag);
console.log('formula-3d/apice-gp.html listo');
