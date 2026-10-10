# Anonymous Games (portal)

Portal que junta los juegos del repositorio. Todo el texto en español. Sin compilación: scripts clásicos (no módulos) para que también abra con `file://`.

- `index.html`: estructura fija (intro, cabecera con el botón de perfil arriba a la derecha, `#view`, panel del perfil, avisos).
- `portal/games.js`: `GAMES` (catálogo), `SOON` (fichas "Próximamente"), `CATS` (categorías). `progress()` de cada juego lee su guardado en `localStorage` (`kartodromo-save-v1`, `sazon_tycoon_v1`, `mindEscape_progress`): si un juego cambia su formato, actualizar esa función.
- `portal/portal.js`: rutas por hash (`#/` y `#/juego/<id>`), vistas como plantillas de texto, perfil `P` (clave `anonymousGames_v1`), niveles (`levelOf`), insignias (`ACH`, `checkAch`), sonido (`SFX`, Web Audio), reproductor (`startGame` mete el juego en un `iframe`; `stopGame` lo quita al salir).
- `portal/portal.css`: tokens en `:root`, adaptable a 320 px, respeta `prefers-reduced-motion`.
- Nada de `alert()`/`confirm()`: avisos con `toast()`, confirmaciones con doble toque.
- No tocar los juegos para integrarlos: el portal sólo los enmarca y lee su guardado.

Pruebas: `CHROMIUM_PATH=... node portal/tests/portal.mjs --shots` (capturas en `portal/tests/capturas/`, ignoradas por git).
