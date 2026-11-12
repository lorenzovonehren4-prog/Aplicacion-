# Corea del Norte — plan de producción (1:07, 9:16, español)

Hecho según `shorts/SISTEMA.md` con el motor común (`shorts/motor/`).

## A. Investigación
- 25 de junio de 1950: invasión del sur.
- 27 de julio de 1953: armisticio, sin tratado de paz.
- Dinastía Kim: Kim Il Sung (1948–1994), Kim Jong Il (1994–2011), Kim Jong Un (desde 2011).
- Seis pruebas nucleares entre 2006 y 2017 pese a las sanciones de la ONU.
- Lanzamientos de misiles en la mayoría de los meses de 2026.
- Desde 2024: tratado con Rusia; más de 16.000 soldados enviados según Corea del Sur.
- EE. UU. y Corea del Sur creen preparada una séptima prueba en Punggye-ri.

**Precisión:** No se dibuja a la familia Kim (retratos vacíos). Las cifras de tropas se atribuyen a Corea del Sur. Rótulo permanente «RECREACIÓN ANIMADA».

**Fuentes:** Yonhap y Reuters (2026); NIS de Corea del Sur; 38 North; Britannica («Korean War», «North Korea»).

## B. Guion (texto exacto en `guion.json`)
1. **h1**: «Es uno de los países más pobres de Asia. Y aun así tiene bombas atómicas y misiles capaces de llegar a Estados Unidos.»
2. **c1**: «1950. Corea del Norte invade el sur. Empieza la guerra de Corea.»
3. **c2**: «En 1953 se firma un armisticio. Pero nunca un tratado de paz: técnicamente, la guerra no ha terminado.»
4. **c3**: «Desde entonces la gobierna la misma familia: Kim Il Sung, su hijo, y ahora su nieto, Kim Jong Un.»
5. **d1**: «El régimen cree que la bomba atómica es su seguro de vida contra una invasión.»
6. **d2**: «Entre 2006 y 2017 hace seis pruebas nucleares, a pesar de las sanciones de la ONU.»
7. **d3**: «Y en 2026 sigue lanzando misiles, casi cada mes.»
8. **r1**: «Desde 2024 tiene un nuevo aliado: Rusia. Según Corea del Sur, envió más de dieciséis mil soldados y millones de proyectiles para la guerra en Ucrania.»
9. **r2**: «A cambio, recibiría dinero, comida, energía y tecnología militar.»
10. **f1**: «Estados Unidos cree que Pyongyang prepara su séptima prueba nuclear, cuando decida hacerla.»
11. **f2**: «Un país cerrado al mundo... que el mundo no puede ignorar.»

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
