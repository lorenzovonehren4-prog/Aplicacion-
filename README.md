# MIND ESCAPE

Juego web de puzzles y acertijos: **30 desafíos, 1 salida**.
HTML + CSS + JavaScript vanilla (ES modules). Sin frameworks, sin backend, sin build.

Estado actual: **fundación completa + nivel 1 como plantilla**. Los niveles 2–30
están reservados en el catálogo y muestran un estado "en construcción" hasta que
se implementen, uno por uno.

---

## Cómo ejecutarlo

El juego usa ES modules y carga `data/levels-meta.json` con `fetch`, así que
necesita servirse por HTTP (abrir `index.html` con `file://` no funciona):

```bash
python3 -m http.server 8000
# o: npx serve .
```

Y abrir <http://localhost:8000>.

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
│   │   └── level-01.js …   Un archivo por nivel
│   ├── ui/                 Pantallas
│   └── utils/              dom · animations · math
└── data/
    └── levels-meta.json    Título, tipo, dificultad y umbral de cada nivel
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

Con `"implemented": false` el nivel aparece en el selector pero muestra el estado
"en construcción" — es como están hoy los niveles 2–30.

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

---

## Estado de los niveles

| Niveles | Estado |
|---|---|
| 01 | Implementado — plantilla de referencia |
| 02–30 | Catalogados (título, tipo, umbral) · pendientes de implementar |
