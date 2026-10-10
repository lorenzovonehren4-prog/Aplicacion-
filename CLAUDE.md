# Anonymous Games (portal)

Portal que junta los juegos del repositorio. Todo el texto en español. Sin compilación: scripts clásicos (no módulos) para que también abra con `file://`.

- `index.html`: estructura fija (intro, cabecera con los botones de arriba a la derecha: about:blank, sonido y perfil; `#view`, panel del perfil, avisos).
- El botón about:blank (`openBlank` en `portal.js`) abre una pestaña `about:blank` titulada "Classes" con el portal en un iframe. El usuario lo llama "el botón de siempre": tiene que estar arriba a la derecha.
- Juegos: `formula-3d/` (Ápice GP; el portal usa `formula-3d/apice-gp.html`, ver README para rearmarlo), `karting/`, `combi-rush/`, `fuga-urbana/`, `sazon-tycoon/`, `modo-carrera-futbol/`, `tower-defense/`, `escalada/`, `mind-escape/`.
- `portal/games.js`: `GAMES` (catálogo), `SOON` (fichas "Próximamente"), `CATS` (categorías). `progress()` de cada juego lee su guardado en `localStorage` (`kartodromo-save-v1`, `sazon_tycoon_v1`, `combirush_v1`, `fuga-urbana-v1`, `mcf_save_v1`/`mcf_hall_v1`, `reino-en-guardia-perfil-v1`, `dontlookup.v1`, `mindEscape_progress`; Ápice GP usa IndexedDB y no se lee): si un juego cambia su formato, actualizar esa función.
- `portal/portal.js`: rutas por hash (`#/` y `#/juego/<id>`), vistas como plantillas de texto, perfil `P` (clave `anonymousGames_v1`), niveles (`levelOf`), insignias (`ACH`, `checkAch`), sonido (`SFX`, Web Audio), reproductor (`startGame` mete el juego en un `iframe`; `stopGame` lo quita al salir).
- `portal/portal.css`: tokens en `:root`, adaptable a 320 px, respeta `prefers-reduced-motion`.
- Nada de `alert()`/`confirm()`: avisos con `toast()`, confirmaciones con doble toque.
- No tocar los juegos para integrarlos: el portal sólo los enmarca y lee su guardado.

Pruebas: `CHROMIUM_PATH=... node portal/tests/portal.mjs --shots` (capturas en `portal/tests/capturas/`, ignoradas por git).
