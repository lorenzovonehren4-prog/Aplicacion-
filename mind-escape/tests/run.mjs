#!/usr/bin/env node
/**
 * tests/run.mjs — Lanzador de todas las suites.
 *
 * Levanta un servidor estático sobre el proyecto, ejecuta cada suite en orden y
 * resume el resultado. Cada suite es un script independiente: se puede lanzar
 * suelta con `node tests/07-partida-niveles-13-20.mjs`.
 *
 *   node tests/run.mjs            todas
 *   node tests/run.mjs partida    sólo las que contienen "partida" en el nombre
 */

import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TESTS = fileURLToPath(new URL('.', import.meta.url));
const PORT = 8765;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

/** Servidor estático mínimo: las suites necesitan HTTP porque el juego usa
 *  ES modules y hace fetch del catálogo de niveles. */
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(req.url.split('?')[0]);
    // normalize() impide salir de la raíz con "../"
    const file = join(ROOT, normalize(path === '/' ? '/index.html' : path));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('no encontrado');
  }
});

/** Si el puerto ya está ocupado se asume que alguien sirve el proyecto ahí:
 *  es lo normal si tienes `npm start` abierto en otra terminal. */
const ownServer = await new Promise((resolve) => {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`El puerto ${PORT} ya está ocupado: se reutiliza ese servidor.\n`);
      resolve(false);
    } else throw err;
  });
  server.listen(PORT, '127.0.0.1', () => resolve(true));
});

const filter = process.argv[2];
/** "1 suite" / "3 suites": un plural mal puesto en la línea de resumen hace
 *  dudar de todo lo que hay debajo. */
const plural = (n) => `${n} suite${n === 1 ? '' : 's'}`;

const suites = (await readdir(TESTS))
  .filter((f) => /^\d\d-.*\.mjs$/.test(f))
  .filter((f) => !filter || f.includes(filter))
  .sort();

if (!suites.length) {
  console.error(filter ? `Ninguna suite coincide con "${filter}"` : 'No hay suites.');
  if (ownServer) server.close();
  process.exit(1);
}

console.log(ownServer
  ? `Servidor en http://127.0.0.1:${PORT} · ${plural(suites.length)}\n`
  : `${plural(suites.length)}\n`);

const failed = [];
for (const suite of suites) {
  process.stdout.write(`${suite.padEnd(34)} `);
  const code = await run(join(TESTS, suite));
  if (code === 0) console.log('OK');
  else { console.log('FALLA'); failed.push(suite); }
}

if (ownServer) server.close();

console.log(failed.length
  ? `\n${suites.length - failed.length}/${plural(suites.length)} OK · fallan: ${failed.join(', ')}`
  : (suites.length === 1 ? '\nSuite en verde.' : `\nLas ${suites.length} suites en verde.`));
process.exit(failed.length ? 1 : 0);

/** Ejecuta una suite y devuelve su código de salida, guardando su salida por si falla. */
function run(file) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [file], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (d) => { output += d; });
    child.stderr.on('data', (d) => { output += d; });
    child.on('close', (code) => {
      if (code !== 0) console.log(`\n${output.trim().split('\n').filter((l) => /FAIL|Error|error/.test(l)).slice(0, 6).join('\n')}\n`);
      resolve(code);
    });
  });
}
