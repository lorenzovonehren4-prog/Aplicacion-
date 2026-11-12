# China y Taiwán — plan de producción (1:07, 9:16, español)

Hecho según `shorts/SISTEMA.md` con el motor común (`shorts/motor/`).

## A. Investigación
- 1949: victoria comunista; el gobierno nacionalista se retira a Taiwán.
- Pekín reclama la isla y no descarta la fuerza (Ley Antisecesión de 2005).
- Democratización en los años noventa (primera elección presidencial directa en 1996).
- TSMC y otras: la gran mayoría de los chips más avanzados.
- Ley de Relaciones con Taiwán (1979): EE. UU. vende armas sin reconocimiento oficial.
- Presión militar constante: aviones, guardacostas, ejercicios.
- 2 de noviembre de 2026: 49 aviones detectados en un día según el Ministerio de Defensa de Taiwán (máximo del año).

**Precisión:** Sin líderes dibujados. Cifra atribuida a la fuente taiwanesa. Rótulo permanente «RECREACIÓN ANIMADA».

**Fuentes:** Ministerio de Defensa Nacional de Taiwán; Reuters y Focus Taiwan (noviembre de 2026); Britannica («Taiwan»); informes de la industria de semiconductores.

## B. Guion (texto exacto en `guion.json`)
1. **h1**: «Una isla más pequeña que muchos países fabrica casi todos los chips más avanzados del mundo. Y China dice que es suya.»
2. **c1**: «1949. Termina la guerra civil china. Los comunistas de Mao toman el continente.»
3. **c2**: «Los nacionalistas derrotados huyen a la isla de Taiwán, y siguen gobernando allí.»
4. **c3**: «Desde entonces, Pekín considera a Taiwán una provincia rebelde que debe reunificarse, por las buenas o por la fuerza.»
5. **d1**: «Pero Taiwán cambió. Desde los años noventa es una democracia, con elecciones libres.»
6. **d2**: «Y se volvió clave para la economía mundial: sus fábricas producen la gran mayoría de los chips más avanzados.»
7. **d3**: «Estados Unidos no la reconoce oficialmente como país, pero le vende armas para defenderse.»
8. **r1**: «China responde con presión constante: aviones militares, barcos de guardacostas, y grandes ejercicios alrededor de la isla.»
9. **r2**: «El 2 de noviembre de 2026, Taiwán detectó 49 aviones militares chinos en un solo día, la cifra más alta del año.»
10. **f1**: «No hay guerra. Pero cada maniobra se vigila desde todo el mundo.»
11. **f2**: «Porque si algo pasa en Taiwán, lo sentirá tu teléfono.»

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
