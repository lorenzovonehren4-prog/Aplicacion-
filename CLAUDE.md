# Anonymous Games (portal)

Portal que junta los juegos del repositorio. Todo el texto en español. Sin compilación: scripts clásicos (no módulos) para que también abra con `file://`.

- `index.html`: estructura fija (intro, cabecera con los botones de arriba a la derecha: about:blank, sonido y perfil; `#view`, panel del perfil, avisos).
- El botón about:blank (`openBlank` en `portal.js`) abre una pestaña `about:blank` titulada "Classes" con el portal en un iframe. El usuario lo llama "el botón de siempre": tiene que estar arriba a la derecha.
- Juegos: `formula-3d/` (Ápice GP; el portal usa `formula-3d/apice-gp.html`, ver README para rearmarlo), `karting/`, `codigo-rojo/`, `cornisa/`, `combi-rush/`, `fuga-urbana/`, `sazon-tycoon/`, `modo-carrera-futbol/`, `tower-defense/`, `escalada/`, `mind-escape/`, `brujula-politica/` (test de ideología de 60 preguntas, un solo archivo; portadas con `node portal/tools/portada-brujula.mjs`, prueba en `portal/tests/brujula.mjs`).
- `portal/games.js`: `GAMES` (catálogo; `box` es la carátula con logo que usa el estante del inicio, se rearma con `node portal/tools/caratulas.mjs`), `SOON` (fichas "Próximamente"), `CATS` (categorías). `progress()` de cada juego lee su guardado en `localStorage` (`kartodromo-save-v1`, `codigorojo_v1`, `cornisa_v1`, `sazon_tycoon_v1`, `combirush_v1`, `fuga-urbana-v1`, `mcf_save_v1`/`mcf_hall_v1`, `reino-en-guardia-perfil-v1`, `dontlookup.v1`, `mindEscape_progress`, `brujula_politica_v1`; Ápice GP usa IndexedDB y no se lee): si un juego cambia su formato, actualizar esa función.
- `portal/portal.js`: rutas por ancla simple (`#inicio`, `#biblioteca`, `#logros`, `#juego-<id>`; el visor de Claude sólo deja pasar anclas así), inicio como menú de consola (`renderDash`, `setSel`, estante `.shelf` de `.gcard`, mando en `padLoop`), `renderLibrary`, `renderAch`, vistas como plantillas de texto, perfil `P` (clave `anonymousGames_v1`), niveles (`levelOf`), insignias (`ACH`, `checkAch`), sonido (`SFX`, Web Audio), reproductor (`startGame` mete el juego en un `iframe`; `stopGame` lo quita al salir).
- `portal/portal.css`: tokens en `:root`, adaptable a 320 px, respeta `prefers-reduced-motion`.
- Nada de `alert()`/`confirm()`: avisos con `toast()`, confirmaciones con doble toque.
- No tocar los juegos para integrarlos: el portal sólo los enmarca y lee su guardado.

Se publica como Artifact de Claude (no GitHub Pages): `node portal/tools/artifact.mjs <carpeta>` arma la página y el mapa de archivos.

Pruebas: `CHROMIUM_PATH=... node portal/tests/portal.mjs --shots` (capturas en `portal/tests/capturas/`, ignoradas por git).
