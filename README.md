# MIND ESCAPE

Juego web de puzzles y acertijos: **30 desafíos, 1 salida**.
HTML + CSS + JavaScript vanilla (ES modules). Sin frameworks, sin backend, sin build.

Estado actual: **los 30 niveles jugables**. El juego se completa de principio a
fin: menú → 30 niveles encadenados → pantalla final.

---

## Cómo ejecutarlo

El juego usa ES modules y carga `data/levels-meta.json` con `fetch`, así que
necesita servirse por HTTP (abrir `index.html` con `file://` no funciona):

```bash
python3 -m http.server 8000
# o: npm start
```

Y abrir <http://localhost:8000>.

El juego en sí no tiene dependencias ni proceso de compilación: se sirve tal
cual y así se desarrolla. `package.json` existe para las pruebas y para el
empaquetado, que no hacen falta para jugar:

```bash
npm install
npm test                 # las 17 suites
npm test -- partida      # sólo las que llevan "partida" en el nombre
node tests/16-responsive.mjs   # una suelta

npm run build            # dist/mind-escape.html, el juego en un solo archivo
```

### El juego en un solo archivo

`npm run build` mete los 54 archivos en un único HTML de unos 370 kB que se
abre con doble clic: sin servidor, sin red y sin instalar nada. Es la forma de
repartirlo; para desarrollar no aporta nada.

Servido por HTTP el juego busca dos cosas fuera: el catálogo (`fetch` de
`levels-meta.json`) y cada nivel (import dinámico bajo demanda). Con `file://`
ninguna de las dos llega a ninguna parte, así que el empaquetador las incrusta
y las siembra en el registro antes de arrancar — ver `seedCatalog` y
`seedLevelClass` en `js/levels/registry.js`. El resto del código sigue pidiendo
los niveles igual y no se entera de por dónde vinieron.

Las mismas 17 suites se pueden lanzar contra el archivo compilado, que es como
se comprueba que el empaquetado no rompe nada:

```bash
npm run build
MIND_ESCAPE_URL=http://127.0.0.1:8765/dist/mind-escape.html npm test
```

---

## Arquitectura

```
mind-escape/
├── index.html              Punto de entrada. Sólo estructura y hojas de estilo.
├── styles/
│   ├── main.css            Variables, reset, botones, animaciones estándar
│   ├── components/         glass-card · star-rating · timer · hint-panel
│   └── screens/            menu · level-select · level · settings
├── js/
│   ├── core/               Infraestructura, no sabe nada de puzzles
│   │   ├── game.js         Orquestador y punto de arranque
│   │   ├── state.js        Estado global + suscripción
│   │   ├── storage.js      Único módulo que toca localStorage
│   │   ├── router.js       Navegación por hash y ciclo de vida de pantallas
│   │   ├── audio.js        Sonidos sintetizados con Web Audio
│   │   └── timer.js        Cronómetro por nivel
│   ├── systems/            Reglas del juego, sin DOM
│   │   ├── progress.js     Desbloqueo y estadísticas
│   │   ├── scoring.js      Cálculo de estrellas
│   │   ├── hints.js        Pistas progresivas
│   │   └── validation.js   Comparadores reutilizables
│   ├── levels/
│   │   ├── level-base.js   Clase base abstracta (el contrato)
│   │   ├── registry.js     Catálogo + carga perezosa de módulos
│   │   ├── shared/         Widgets de puzzle reutilizables (keypad, sortable)
│   │   └── level-01.js …   Un archivo por nivel
│   ├── ui/                 menu · level-select · level-screen · settings ·
│   │                       completion-modal · ending
│   └── utils/              dom · animations · math
├── data/
│   └── levels-meta.json    Título, tipo, dificultad y umbral de cada nivel
├── tests/                  Suites en Playwright + su lanzador
└── tools/                  Empaquetado a un solo archivo
```

### Las tres reglas que sostienen todo

**1. El núcleo no sabe resolver ningún puzzle.**
`js/core/` y `js/systems/` no contienen una sola línea específica de un nivel.
La lógica de cada acertijo vive íntegra en su `level-NN.js`.

**2. El nivel no decide que está resuelto.**
Un nivel llama a `this.attempt(solución)`. La pantalla de nivel valida, cuenta el
intento, aplica pistas y tiempo, calcula estrellas y guarda. Un nivel no puede
—ni debe— tocar el progreso, el router o el almacenamiento.

**3. Todo lo que se engancha, se desengancha.**
`LevelBase` trae un `disposer`: cualquier listener registrado con `this.listen()`
se retira solo en `destroy()`. El router garantiza que `destroy()` de la pantalla
anterior corre antes de montar la siguiente.

### Flujo de una partida

```
game.js (boot)
  └─ carga catálogo → arranca partículas → registra rutas → router.start()

router  ──#/level/7──▶  level-screen.js
                          ├─ comprueba desbloqueo (progress.js)
                          ├─ pinta cronómetro, pistas y barra de respuesta
                          ├─ import('./level-07.js')  ← carga perezosa
                          └─ new Level07(id, área, { meta, host })
                                       │
                          this.attempt(x) ──▶ validation.runValidation()
                                       │
                              ¿correcto? ──▶ progress.completeLevel()
                                              ├─ scoring.calculateStars()
                                              ├─ desbloquea nivel 8
                                              ├─ state.update() → storage.save()
                                              └─ completion-modal
```

### Sistemas

| Sistema | Regla |
|---|---|
| **Progreso** | Completar el nivel N desbloquea el N+1. El nivel 1 siempre está abierto. |
| **Estrellas** | ★★★ sin pistas y por debajo del umbral · ★★ una pista o pasarse del umbral · ★ dos o más pistas, o mucho más lento. Mínimo siempre ★. |
| **Pistas** | 3 por nivel, en orden estricto: la #2 se desbloquea al usar la #1. Bajan el techo de estrellas, nunca bloquean el nivel. |
| **Tiempo** | Cronómetro en todos los niveles. El límite (cuando existe) topa las estrellas en ★★; **nunca** hace fallar el nivel. |
| **Reintentos** | Ilimitados. Se cuentan para estadísticas y no reinician nada. Al repetir sólo se puede subir: ni las estrellas ni el mejor tiempo empeoran. |

### La pantalla final

Completar el nivel 30 no lleva a otro modal: lleva a `#/final`, una pantalla
propia con la puerta abierta, los totales y una lluvia breve de partículas. Al
ser una ruta y no un modal, se puede volver a ella desde el menú en vez de
perderse al cerrar una ventana. La tercera estrella grande se reserva para el
90 de 90.

### Persistencia

Todo bajo la clave `mindEscape_progress` de `localStorage`, con
`schemaVersion` para permitir migraciones. Si el JSON está corrupto o el
navegador no permite almacenar, el juego arranca limpio y sigue funcionando en
memoria (sólo se pierde la persistencia).

---

## Añadir un nivel

Dos pasos. **Ningún archivo del núcleo se toca.**

**1. Crear `js/levels/level-31.js`** (el registro deriva la ruta del id:
nivel 7 → `level-07.js`):

```js
import { LevelBase } from './level-base.js';
import { el } from '../utils/dom.js';

export default class Level31 extends LevelBase {
  init() {
    const boton = el('button', { text: 'Púlsame' });
    this.listen(boton, 'click', () => this.attempt('ok'));  // ← se limpia solo
    this.mount(boton);
  }

  validate(solucion) {
    return solucion === 'ok';
  }

  getPrompt() {
    return 'Instrucción breve que aparece sobre el puzzle.';
  }

  getHints() {
    return ['Pista vaga.', 'Pista orientadora.', 'Casi la solución.'];
  }
}
```

**2. Añadir su entrada en `data/levels-meta.json`:**

```json
{ "id": 31, "title": "Mi Nivel", "type": "logica",
  "difficulty": 4, "timeThreshold": 150, "timeLimit": null, "implemented": true }
```

Con `"implemented": false` el nivel aparece en el selector pero muestra un estado
"en construcción" en vez del puzzle. Hoy los treinta están implementados, así que
esa bandera sólo sirve para añadir un nivel 31 por partes.

### El contrato de `LevelBase`

Obligatorios: `init()` · `validate(solución)` · `getHints()`

Opcionales (tienen valor por defecto): `getState()` · `setState()` · `destroy()` ·
`getType()` · `hasTimeLimit()` · `getTimeLimit()` · `getInputMode()` ·
`getInputConfig()` · `getPrompt()` · `onSolved()` · `onFailed()` · `onTimeExpired()`

Utilidades heredadas: `this.attempt(x)` · `this.feedback(msg, tono)` ·
`this.setPrompt(texto)` · `this.listen(nodo, evento, fn)` · `this.mount(...nodos)`

`getInputMode()` devuelve `'none'` (por defecto, el puzzle se resuelve
interactuando), `'text'` o `'numeric'` para que la pantalla pinte la barra de
respuesta con campo y botón de enviar.

**Estilos de un nivel:** van dentro del propio módulo, en una constante que se
monta como `<style>` (ver `level-01.js`). Así un nivel nuevo no obliga a tocar
`index.html` ni la carpeta `styles/`, y sus reglas desaparecen con él.

---

## Decisiones de diseño

- **Rutas por hash** (`#/level/7`) para que el botón "atrás" del navegador
  funcione sin servidor.
- **Audio sintetizado** con Web Audio en lugar de archivos: cero peticiones de
  red y timbre coherente con la estética. `assets/sounds/` queda libre por si más
  adelante se quieren samples reales.
- **Aleatoriedad determinista** (`createRng(semilla)` en `utils/math.js`) en vez
  de `Math.random`: las pistas mencionan posiciones concretas y deben seguir
  siendo ciertas tras recargar.
- **Las fuentes de Google son una mejora progresiva.** Si no cargan, las pilas de
  respaldo de `main.css` mantienen el juego perfectamente legible y jugable
  offline.
- **`prefers-reduced-motion`** desactiva las partículas y reduce toda animación.
- **Objetivos táctiles de 44 px como mínimo** en todo lo que se pulsa. Varios
  niveles tenían botones de 30-38 px que en un móvil eran una lotería.

---

## Widgets compartidos

`js/levels/shared/` guarda vocabulario de puzzles, no infraestructura: el núcleo
del juego lo ignora por completo. Hoy contiene dos piezas que varios niveles
reutilizan en lugar de reimplementar:

- **`keypad.js`** — teclado numérico en pantalla, con soporte de teclado físico.
  Lo usan los niveles 2, 8, 15, 18, 27 y 30.
- **`sortable.js`** — lista reordenable por arrastre, con Pointer Events (ratón y
  dedo con el mismo código) y movimiento con las flechas del teclado. Lo usan los
  niveles 9 y 19.

## Los meta-puzzles y las respuestas exportadas

Los niveles 27 y 30 piden códigos formados por respuestas de niveles anteriores.
Para que no puedan desincronizarse, esos niveles **importan** la respuesta en vez
de copiarla: `level-03.js`, `level-05.js`, `level-07.js`, `level-12.js`,
`level-20.js` y `level-22.js` exportan una constante `ANSWER_*` con su solución,
y los meta-puzzles construyen el código a partir de ellas.

Es la única dependencia entre niveles de todo el juego, y es deliberada: un
meta-puzzle que no dependa de los demás no es un meta-puzzle. Si alguien cambia
la semilla del nivel 12, el código del 27 cambia con él y sigue siendo cierto.

## Decisiones tomadas al implementar los niveles

Tres puntos del documento maestro no se pudieron seguir al pie de la letra.
Están anotados también en la cabecera de cada archivo:

- **Nivel 6** — las tres afirmaciones del documento no tienen solución bajo la
  regla "sólo una es verdadera" (ninguna caja deja exactamente una verdad). Se
  sustituyeron por un conjunto que sí funciona, mantiene la respuesta pedida
  (caja B) y deja las tres pistas originales siendo correctas.
- **Nivel 9** — las cuatro restricciones admiten cuatro órdenes válidos, no uno.
  El documento ya lo contempla ("o variante válida"), así que se valida contra
  las restricciones y no contra una secuencia concreta.
- **Nivel 5** — la primera versión, fiel al documento (tres arcos sueltos junto
  a la figura), resultó imposible de resolver mirando. Se rehízo: la silueta
  tiene relieve y apuntar a una pieza la encaja en el hueco.
- **Nivel 13** — el documento sólo pide que los caminos "no se crucen". Con esa
  única regla sobra tanto espacio que el nivel se resuelve solo, así que se
  añade la regla del Flow clásico: no pueden quedar celdas vacías. Se anuncia en
  el enunciado, nunca es una trampa.
- **Nivel 19** — C y D pesan lo mismo, así que las dos últimas posiciones son
  intercambiables: se aceptan A-B-E-C-D y A-B-E-D-C. Exigir un orden entre dos
  objetos que el enunciado declara iguales sería incoherente.
- **Nivel 11** — se usa el alfabeto latino de 26 letras, sin Ñ, para que
  A=1…Z=26 coincida con la convención habitual de este cifrado.
- **Nivel 26** — se puede volver a ver la secuencia las veces que haga falta,
  pero cada repetición borra lo introducido. Sin esa condición el nivel se
  resuelve mirando y pulsando de uno en uno, y deja de ser de memoria.
- **Nivel 28** — es el único que el documento deja sin resolver: enumera engaños
  posibles pero no elige ninguno. El elegido: la pantalla ordena pulsar un
  círculo rojo que no existe, insiste al fallar, y la respuesta es el círculo
  número 28 — el número del nivel, que lleva en la cabecera desde el principio.
  Se descartó esconderla en el título o en los colores porque dependería de
  detalles de estilo que un rediseño rompería sin avisar.
- **Niveles 27 y 30** — el documento propone unos niveles fuente concretos para
  sus códigos. Se usan los seis cuya respuesta es un número suelto (3, 5, 7, 12,
  20 y 22): la del 17 es una frase, la del 21 una tarjeta y la del 27 ya es un
  código de cuatro cifras.

## Estado de los niveles

| Niveles | Estado |
|---|---|
| 01–10 | Jugables — bloque "Introducción gradual" |
| 11–20 | Jugables — bloque "El Núcleo" |
| 21–30 | Jugables — bloque "Los memorables" |

Los 30 niveles están implementados y se han jugado de principio a fin en
Chromium: 215 comprobaciones automatizadas cubren cada puzzle resuelto como lo
haría una persona, el desbloqueo en cadena, el cálculo y la persistencia de
estrellas, la pantalla final, el sonido con Web Audio y la ausencia de errores
en consola.

A eso se suma una auditoría que recorre las 33 pantallas a 320, 375 y 768 px
buscando desbordamiento horizontal, elementos fuera del área visible y
objetivos táctiles por debajo de 40 px. Actualmente pasa con **0 incidencias**.

## Las pruebas

`npm test` levanta un servidor estático y ejecuta las 17 suites de `tests/`.
Cada una es un script independiente y se puede lanzar suelta.

| Suite | Qué comprueba |
|---|---|
| `01-flujo-basico` | Menú, selector, ajustes, desbloqueo, borrado de progreso |
| `02-reglas-de-juego` | Estrellas, reintentos, récords, datos corruptos |
| `03` · `04` | Que las soluciones sean **únicas** donde debe serlo: el Sudoku por fuerza bruta, el cableado del 16 entre las 24 permutaciones, las rotaciones del 25 entre 262 144 combinaciones |
| `05` … `08` | Partidas completas: resuelven los 30 niveles como lo haría una persona |
| `09` · `10` · `11` | La bombilla del 7 en sus tres lecturas, los caminos del 13, la pantalla final |
| `12-audio` | Con el sonido **activo**: cuenta los osciladores de Web Audio que se crean |
| `13-estres-router` | Navegación más rápida que la transición, atrás/adelante, rutas basura |
| `14-fugas` · `15-dom-limpio` | Que salir de un nivel devuelva listeners, intervalos y nodos |
| `16-responsive` | Las 33 pantallas a 320, 375 y 768 px |
| `17` | Que los números del nivel 1 no se solapen |

Dos notas sobre cómo están escritas:

- **Resuelven de verdad, no hacen trampa.** La suite del nivel 12 aplica el
  método real (3 vs 3 y luego 1 vs 1, deduciendo el grupo del resultado); la
  del 7 enciende un interruptor, espera a que caliente y lo apaga.
- **El audio se mide, no se simula.** Espiar `audio.play()` no funciona porque
  los módulos ES lo importan como binding de solo lectura, así que la suite
  parchea `createOscillator` y cuenta los osciladores reales.
