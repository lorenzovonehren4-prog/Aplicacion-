# Pearl Harbor (7-12-1941) — plan de producción (1:09, 9:16, español)

Hecho según `shorts/SISTEMA.md` con el motor común (`shorts/motor/`).

## A. Investigación
- Japón en guerra en China desde 1937; avance en Indochina 1940–41.
- Julio–agosto de 1941: congelación de activos y embargo de petróleo de EE. UU.
- 7 de diciembre, 7:48 hora local: primera oleada; 353 aviones en dos oleadas.
- El radar de Opana detectó la formación; se pensó que eran B-17 propios.
- USS Arizona: 1.177 muertos.
- Más de 2.400 estadounidenses muertos; los portaaviones no estaban en puerto.
- 8 de diciembre: discurso de Roosevelt («a date which will live in infamy») y declaración de guerra.

**Precisión:** La frase de Roosevelt es una traducción literal de su discurso. Rótulo permanente «RECREACIÓN ANIMADA».

**Fuentes:** National WWII Museum; Naval History and Heritage Command (history.navy.mil); Britannica («Pearl Harbor attack»).

## B. Guion (texto exacto en `guion.json`)
1. **h1**: «Un domingo por la mañana, 353 aviones aparecieron en el cielo de Hawái. Estados Unidos no lo vio venir.»
2. **c1**: «1941. Japón está en guerra en China y avanza por el sudeste asiático.»
3. **c2**: «Estados Unidos responde con un embargo de petróleo. Japón importaba de allí la mayor parte de su combustible.»
4. **c3**: «Sin petróleo, su ejército se detiene. Así que Japón decide atacar primero.»
5. **d1**: «7 de diciembre de 1941, siete y cuarenta y ocho de la mañana. Llega la primera oleada. Un radar detecta los aviones, pero creen que son bombarderos propios.»
6. **d2**: «Bombas y torpedos caen sobre la flota del Pacífico, anclada en Pearl Harbor.»
7. **d3**: «El acorazado Arizona explota. Mueren más de mil hombres solo en ese barco.»
8. **r1**: «En dos horas mueren más de 2.400 estadounidenses. Pero los portaaviones no estaban en el puerto.»
9. **r2**: «Al día siguiente, Estados Unidos declara la guerra a Japón. El presidente Roosevelt lo llama: una fecha que vivirá en la infamia.»
10. **f1**: «Japón quería frenar a Estados Unidos. Consiguió lo contrario: despertarlo.»
11. **f2**: «Cuatro años después, la guerra terminaría en Hiroshima y Nagasaki.»

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
