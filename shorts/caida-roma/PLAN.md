# La caída de Roma (395–476) — plan de producción (1:08, 9:16, español)

Hecho según `shorts/SISTEMA.md` con el motor común (`shorts/motor/`).

## A. Investigación
- 117: máxima extensión del Imperio con Trajano.
- Siglo III: crisis (emperadores efímeros, inflación por devaluación de la moneda).
- 395: división definitiva entre Oriente (Constantinopla) y Occidente.
- Hunos empujan a los pueblos germánicos; 410: saqueo de Roma por los visigodos de Alarico.
- 455: saqueo vándalo de Roma.
- 476: Odoacro depone a Rómulo Augústulo; fin convencional del Imperio de Occidente.
- Oriente (bizantino) dura hasta 1453.

**Precisión:** La caída es un proceso: el video lo dice («no cayó en un día»). 476 es una fecha convencional. Rótulo permanente «RECREACIÓN ANIMADA».

**Fuentes:** Encyclopaedia Britannica («Fall of Rome», «Odoacer», «Alaric»); Peter Heather, *La caída del Imperio romano* (2005).

## B. Guion (texto exacto en `guion.json`)
1. **h1**: «Roma dominó el mundo durante siglos. Y no cayó en un día: se fue desmoronando por dentro.»
2. **c1**: «En el año 117, el Imperio romano llega a su máxima extensión: de Escocia a Mesopotamia.»
3. **c2**: «Pero mantenerlo cuesta una fortuna. Crisis económica, emperadores asesinados, guerras civiles.»
4. **c3**: «En el año 395, el imperio se divide para siempre: Occidente, con capital en Roma, y Oriente, en Constantinopla.»
5. **d1**: «Desde el este llegan los hunos, y empujan a los pueblos germanos hacia las fronteras romanas.»
6. **d2**: «En el 410, los visigodos de Alarico saquean Roma. Hacía ochocientos años que nadie lo conseguía.»
7. **d3**: «En el 455, llegan los vándalos y la saquean otra vez.»
8. **r1**: «Y en el 476, un jefe germano, Odoacro, depone al último emperador de Occidente: un niño llamado Rómulo Augústulo.»
9. **r2**: «No hubo una gran batalla final. Simplemente, ya no quedaba un imperio que defender.»
10. **f1**: «Pero la mitad oriental resistió casi mil años más, hasta 1453.»
11. **f2**: «Así que Roma, en realidad, cayó dos veces.»

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
