# El Muro de Berlín (1961–1989) — plan de producción (1:11, 9:16, español)

Hecho según `shorts/SISTEMA.md` con el motor común (`shorts/motor/`).

## A. Investigación
- 1945: división de Alemania y de Berlín.
- 1949–1961: más de 2,5 millones huyen de la RDA.
- 13 de agosto de 1961: cierre con alambradas; después el muro de hormigón.
- Al menos 140 muertos en el Muro (Centro de Historia Contemporánea de Potsdam).
- 9 de noviembre de 1989: rueda de prensa de Günter Schabowski («de inmediato»).
- Bornholmer Straße: los guardias abren sin órdenes.
- 3 de octubre de 1990: reunificación.

**Precisión:** Schabowski murió en 2015; se le dibuja de forma genérica. Rótulo permanente «RECREACIÓN ANIMADA».

**Fuentes:** Gedenkstätte Berliner Mauer (berliner-mauer-gedenkstaette.de); Chronik der Mauer; Britannica («Berlin Wall»).

## B. Guion (texto exacto en `guion.json`)
1. **h1**: «Una ciudad fue partida en dos en una sola noche. Y así se quedó durante veintiocho años.»
2. **c1**: «Tras la Segunda Guerra Mundial, Alemania queda dividida: el oeste, aliado de Estados Unidos, y el este, comunista.»
3. **c2**: «Berlín queda dentro de la Alemania del Este, y también dividida.»
4. **c3**: «Millones de personas huyen del este hacia el oeste por Berlín. Entre 1949 y 1961 se van más de dos millones y medio.»
5. **d1**: «La noche del 13 de agosto de 1961, soldados del este cierran la frontera con alambre de púas.»
6. **d2**: «Familias quedan separadas de un día para otro. Después llega el muro de hormigón.»
7. **d3**: «Torres de vigilancia, perros, minas. Al menos 140 personas mueren intentando cruzar.»
8. **r1**: «9 de noviembre de 1989. Un portavoz del gobierno anuncia por error que se puede cruzar, de inmediato. Fue Günter Schabowski, en una rueda de prensa en directo.»
9. **r2**: «Miles de personas corren a la frontera. Los guardias, sin órdenes, abren las puertas.»
10. **f1**: «Esa noche, la gente se sube al muro y lo empieza a romper con martillos. Un año después, Alemania se reunifica.»
11. **f2**: «Un muro que parecía eterno cayó por una frase dicha por error.»

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
