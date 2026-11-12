# Gengis Kan (c. 1162–1227) — plan de producción (1:10, 9:16, español)

Hecho según `shorts/SISTEMA.md` con el motor común (`shorts/motor/`).

## A. Investigación
- c. 1162: nace Temuyín; su padre Yesügei muere envenenado por tártaros.
- Secuestro de Börte por los merkitas y su rescate.
- 1206: kurultai que lo proclama Gengis Kan.
- Ejército de arqueros a caballo con varias monturas por jinete; ascenso por mérito; correo Yam.
- 1219–1221: guerra contra Corasmia tras la matanza de sus enviados.
- 1227: muere; sus sucesores extienden el imperio de Corea a Europa del Este.
- Pax mongolica: rutas comerciales (viajeros como Marco Polo, bajo Kublai).

**Precisión:** Las cifras de muertos de las conquistas varían mucho; se dice «millones» sin precisar. Rótulo permanente «RECREACIÓN ANIMADA».

**Fuentes:** Britannica («Genghis Khan», «Mongol empire»); *Historia secreta de los mongoles*; Jack Weatherford, *Genghis Khan and the Making of the Modern World* (2004).

## B. Guion (texto exacto en `guion.json`)
1. **h1**: «Un niño abandonado en la estepa terminó creando el imperio terrestre más grande de la historia.»
2. **c1**: «Se llamaba Temuyín. Nació hacia 1162 en Mongolia. Su padre fue envenenado, y su familia quedó sola.»
3. **c2**: «Sobrevivió cazando, escapó de la esclavitud, y fue uniendo a las tribus una por una. Cuando secuestraron a su esposa, Börte, reunió aliados y la rescató.»
4. **c3**: «En 1206, las tribus lo proclaman Gengis Kan: el gobernante universal.»
5. **d1**: «Su ejército era de jinetes arqueros. Cada uno llevaba varios caballos, y podían recorrer enormes distancias en días.»
6. **d2**: «Ascendía a sus oficiales por mérito, no por familia. Y creó un sistema de mensajeros a caballo que cruzaba el continente.»
7. **d3**: «Cuando el imperio de Corasmia asesinó a sus embajadores, su respuesta fue devastadora. Ciudades enteras fueron arrasadas.»
8. **r1**: «Murió en 1227. Pero sus hijos y nietos siguieron conquistando.»
9. **r2**: «En su punto máximo, el Imperio mongol iba de Corea hasta Europa del Este.»
10. **f1**: «Unió Asia, abrió rutas de comercio... y dejó millones de muertos. Bajo el dominio mongol, viajeros como Marco Polo pudieron cruzar Asia.»
11. **f2**: «¿Genio o destructor? Probablemente las dos cosas.»

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
