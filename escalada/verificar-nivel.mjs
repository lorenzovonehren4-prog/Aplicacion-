#!/usr/bin/env node
/**
 * VERIFICADOR DE NIVEL
 *
 * Comprueba que el recorrido se puede terminar, usando el motor de física del
 * propio juego. No lee el código ni reimplementa nada: carga la página, deja
 * que componga el nivel y luego pregunta, salto a salto, con `pasoFisica`:
 *
 *   - ¿se llega del apoyo i al i+1? En los que se mueven o van y vienen, ¿en
 *     cuántas fases del ciclo?
 *   - ¿hay una VENTANA de despegue de verdad, o el salto solo sale desde una
 *     x exacta a la que además hay que poder llegar caminando?
 *   - ¿los atajos tienen entrada y salida?
 *   - ¿queda alguna moneda suelta, lejos de todo apoyo?
 *
 * Uso:
 *   python3 -m http.server 8777        # desde la raíz del repositorio
 *   node escalada/verificar-nivel.mjs
 *
 * Variables de entorno:
 *   URL       dirección del juego
 *             (por defecto http://127.0.0.1:8777/escalada/index.html)
 *   CHROMIUM  ruta a un navegador concreto
 *             (por defecto, el que traiga Playwright)
 *
 * Sale con código 1 si encuentra un salto imposible, un atajo roto o un error
 * de consola, así que sirve tal cual como comprobación previa a publicar.
 */
import { chromium } from 'playwright';

const URL = process.env.URL || 'http://127.0.0.1:8777/escalada/index.html';
const lanzamiento = process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {};

const navegador = await chromium.launch(lanzamiento);
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 720 } });

const errores = [];
pagina.on('pageerror', (e) => errores.push('PAGEERROR ' + e.message));
pagina.on('console', (m) => { if (m.type() === 'error') errores.push('CONSOLE ' + m.text()); });

await pagina.goto(URL, { waitUntil: 'load' });
// Componer el nivel bloquea el hilo un segundo y medio largo
await pagina.waitForTimeout(3000);
await pagina.click('#start-btn');
await pagina.waitForTimeout(600);

const informe = await pagina.evaluate(() => {
  // Los atajos van al final del array y no forman parte de la cadena
  const nCadena = (() => {
    const k = platforms.findIndex((q) => q.extra);
    return k < 0 ? platforms.length : k;
  })();
  const FASES = 6;

  const imposibles = [], sinVentanaJusta = [], apretados = [];
  for (let i = 0; i + 1 < nCadena; i++) {
    const a = platforms[i], b = platforms[i + 1];
    const dinamico = a.mov || a.movY || a.ciclo || b.mov || b.movY || b.ciclo;
    const n = dinamico ? FASES : 1;
    let salen = 0, justos = 0;
    for (let k = 0; k < n; k++) {
      moverPlataformas(platforms, k * (600 / FASES));
      if (seLlega(a, b)) salen++;
      if (saltoJusto(a, b)) justos++;
    }
    if (salen === 0) imposibles.push(i);
    else if (justos === 0) sinVentanaJusta.push(i);
    else if (justos / n < 0.25) apretados.push([i, justos + '/' + n]);
  }
  moverPlataformas(platforms, 0);

  // Cada atajo se mide contra los apoyos que tiene cerca, no contra los 293
  const atajosMalos = [];
  for (let k = nCadena; k < platforms.length; k++) {
    const at = platforms[k];
    if (!at.atajo) continue;
    let entra = false, sale = false;
    for (let i = 0; i < nCadena; i++) {
      const q = platforms[i];
      if (Math.abs(q.x - at.x) > 900 || Math.abs(q.y - at.y) > 500) continue;
      if (!entra && saltoJusto(q, at)) entra = true;
      if (!sale && saltoJusto(at, q)) sale = true;
      if (entra && sale) break;
    }
    if (!(entra && sale)) atajosMalos.push(k);
  }

  let monedasSueltas = 0;
  for (const m of monedas) {
    let cerca = false;
    for (const q of platforms) {
      if (Math.abs(q.x + q.width / 2 - m.x) < 700 && Math.abs(q.y - m.y) < 400) { cerca = true; break; }
    }
    if (!cerca) monedasSueltas++;
  }

  // Recuento por franja, para ver la curva de un vistazo
  const franjas = {};
  for (const q of platforms) {
    const f = franja(q.world);
    const c = (franjas[f] = franjas[f] || { apoyos: 0, mov: 0, movY: 0, ciclo: 0,
                                            fino: 0, hielo: 0, fragil: 0, atajo: 0, checkpoint: 0 });
    c.apoyos++;
    if (q.mov) c.mov++;
    if (q.movY) c.movY++;
    if (q.ciclo) c.ciclo++;
    if (q.fino) c.fino++;
    if (q.hielo) c.hielo++;
    if (q.trampa) c.fragil++;
    if (q.atajo) c.atajo++;
    if (q.type === 'checkpoint') c.checkpoint++;
  }

  return { saltosCadena: nCadena - 1, imposibles, sinVentanaJusta, apretados,
           atajos: platforms.length - nCadena, atajosMalos,
           monedas: monedas.length, monedasSueltas, pinchos: spikes.length,
           geiseres: geysers.length, franjas };
});

await navegador.close();

console.log(JSON.stringify(informe, null, 1));
console.log('errores de consola:', errores.length ? errores : 'ninguno');

const roto = informe.imposibles.length || informe.atajosMalos.length ||
             informe.monedasSueltas || errores.length;
console.log(roto
  ? '\nFALLA: hay saltos imposibles, atajos rotos, monedas sueltas o errores.'
  : '\nEl recorrido se puede completar de principio a fin.');
process.exit(roto ? 1 : 0);
