# Venezuela y EE. UU. (2024–2026) — plan de producción (1:08, 9:16, español)

Hecho según `shorts/SISTEMA.md` con el motor común (`shorts/motor/`).

## A. Investigación
- Mayores reservas probadas de petróleo (OPEP).
- Hiperinflación y éxodo: unos 7,9 millones fuera del país (ACNUR/R4V).
- 28 de julio de 2024: el CNE proclama a Maduro sin publicar actas desglosadas; la oposición publica actas favorables a Edmundo González.
- 2020: acusación de narcoterrorismo en EE. UU. y recompensa.
- 2025: despliegue naval en el Caribe y ataques a lanchas.
- 3 de enero de 2026: operación que captura a Maduro y Cilia Flores; traslado a Nueva York; se declaran no culpables.
- Críticas de expertos de la ONU y varios gobiernos sobre la legalidad.
- Delcy Rodríguez presidenta interina; plan por fases; sin fecha electoral (noviembre de 2026).

**Precisión:** No se dibuja a ningún líder vivo: sólo rótulos. Se presentan las dos visiones (acusaciones de EE. UU. y críticas de legalidad). Rótulo permanente «RECREACIÓN ANIMADA».

**Fuentes:** Reuters, AP, BBC Mundo y El País (enero–noviembre de 2026); ACNUR/R4V; Centro Carter (informe 2024).

## B. Guion (texto exacto en `guion.json`)
1. **h1**: «3 de enero de 2026. Fuerzas de Estados Unidos entran en Caracas y se llevan detenido al presidente de Venezuela.»
2. **c1**: «Venezuela tiene las mayores reservas de petróleo del mundo. Pero durante años vivió una crisis enorme.»
3. **c2**: «Hiperinflación, escasez de comida, y millones de venezolanos que se fueron del país.»
4. **c3**: «En las elecciones de 2024, el gobierno declaró ganador a Nicolás Maduro sin publicar las actas. La oposición mostró actas que daban la victoria a su candidato.»
5. **d1**: «Estados Unidos acusaba a Maduro de narcotráfico desde hacía años, y ofrecía una recompensa por su captura.»
6. **d2**: «Durante 2025 aumenta la presión: barcos de guerra en el Caribe, y ataques contra lanchas acusadas de llevar droga.»
7. **r1**: «Y en la madrugada del 3 de enero, una operación militar captura a Maduro y a su esposa, y los traslada a Nueva York.»
8. **r2**: «Allí se declara no culpable. Funcionarios de la ONU y varios gobiernos critican la legalidad de la operación.»
9. **f1**: «Hoy, Delcy Rodríguez gobierna de forma interina. Washington habla de una transición por fases, pero todavía no hay fecha de elecciones.»
10. **f2**: «Venezuela sigue esperando decidir su propio futuro.»

Estructura: gancho (h1) → contexto (c) → desarrollo (d) → revelación (r) → cierre (f). Palabras clave en amarillo.

## C. Biblia visual
Stickman evolucionado del motor (cabeza redonda con sombreado, contorno negro, ropa a color). Personajes y fondos definidos al inicio de `escenas.js`; mismas fichas en todo el vídeo.

## D. Storyboard
Una escena por frase en `escenas.js` (`scenes`), con cámara por fotogramas clave, paralaje, punch-in en cada subtítulo, fechas, contadores y rótulos sincronizados con la voz.

## E. Prompts
No se usa IA de imagen: todo es código. Prompt base si algún día se usa: «2D animated documentary, evolved stickman characters, clean outlines, cinematic 9:16, [escena], no text».

## F. Montaje
Voz Piper `es_MX-claude-high` a 0,86 (más pausada y clara que la tanda 1), presencia 2,2–5 kHz y música más baja (`duck` 0,75, `bed` 0,7 en `pista.json`).
`python3 motor/voz.py` → `python3 motor/sonido.py` → `node motor/render.mjs <dir> --cortes` → `sonido.py` → `render.mjs <dir> <dir>.mp4`. 1080×1920, 30 FPS, −14 LUFS.

## G. Evaluación
| Criterio | Nota |
| --- | --- |
| Gancho | 8 |
| Claridad | 8 |
| Visual | 6 |
| Animación | 5 |
| Sonido | 6 |
| Ritmo | 8 |

Límite principal: animación de personajes simple y sin sincronía labial; voz sintética.
