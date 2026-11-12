# Cortés y la caída de Tenochtitlan (1519–1521) — plan de producción (1:09, 9:16, español)

Hecho según `shorts/SISTEMA.md` con el motor común (`shorts/motor/`).

## A. Investigación
- 1519: Cortés desembarca con unos 500 hombres.
- Tenochtitlan: estimaciones de 200.000 habitantes (rango 60.000–300.000 según autores).
- Pueblos sometidos a tributo (tlaxcaltecas y otros) se alían con los españoles.
- Malinche (Marina) como intérprete.
- 1520: muerte de Moctezuma en circunstancias discutidas; Noche Triste.
- Viruela de 1520 diezma la ciudad.
- 13 de agosto de 1521: cae la ciudad; Cuauhtémoc es capturado.

**Precisión:** La población se da como estimación aproximada. Se subraya el papel decisivo de los aliados indígenas y la epidemia. Rótulo permanente «RECREACIÓN ANIMADA».

**Fuentes:** Britannica («Hernán Cortés», «Tenochtitlán», «Malinche»); Matthew Restall, *When Montezuma Met Cortés* (2018); Bernal Díaz del Castillo (fuente primaria).

## B. Guion (texto exacto en `guion.json`)
1. **h1**: «Unos quinientos españoles derrotaron a un imperio de millones. Pero no lo hicieron solos.»
2. **c1**: «1519. Tenochtitlan, la capital mexica, tiene unos doscientos mil habitantes. Más que casi cualquier ciudad de Europa.»
3. **c2**: «Hernán Cortés desembarca en la costa con unos quinientos hombres, caballos y cañones.»
4. **c3**: «Muchos pueblos estaban sometidos a los mexicas y les pagaban tributo. Los tlaxcaltecas se unen a Cortés.»
5. **d1**: «Malinche, una mujer indígena, se convierte en su intérprete. Sin ella, nada de esto habría sido posible.»
6. **d2**: «Moctezuma lo recibe en la ciudad. Pero en 1520 la convivencia estalla, y los españoles huyen de noche, perdiendo a cientos de hombres.»
7. **d3**: «Entonces llega un enemigo invisible: la viruela. Mata a miles, incluido el nuevo emperador.»
8. **r1**: «En 1521, Cortés vuelve con barcos y decenas de miles de aliados indígenas, y sitia la ciudad durante meses.»
9. **r2**: «El 13 de agosto de 1521, Tenochtitlan cae. El emperador Cuauhtémoc es capturado.»
10. **f1**: «Sobre sus ruinas se construyó la Ciudad de México.»
11. **f2**: «Fue una conquista. Pero también una rebelión de los pueblos sometidos, y una epidemia.»

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
