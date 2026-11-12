# Hiroshima y Nagasaki (agosto de 1945) — plan de producción (1:10, 9:16, español)

Hecho según `shorts/SISTEMA.md` con el motor común (`shorts/motor/`).

## A. Investigación
- Mayo de 1945: rendición de Alemania.
- Iwo Jima y Okinawa: decenas de miles de muertos.
- Proyecto Manhattan.
- Truman autoriza el uso de la bomba.
- 6 de agosto, 8:15: el B-29 Enola Gay lanza «Little Boy».
- Unas 140.000 muertes en Hiroshima a finales de 1945 (estimación).
- 9 de agosto: Nagasaki. 15 de agosto: anuncio de rendición del emperador.
- Hibakusha: supervivientes; debate histórico abierto.

**Precisión:** Tratamiento respetuoso: sin víctimas dibujadas. La cifra se rotula como estimación. El final plantea el debate sin tomar partido. Rótulo permanente «RECREACIÓN ANIMADA».

**Fuentes:** Ciudad de Hiroshima / Museo Memorial de la Paz; Atomic Heritage Foundation; Britannica («Atomic bombings of Hiroshima and Nagasaki»).

## B. Guion (texto exacto en `guion.json`)
1. **h1**: «A las 8:15 de la mañana, una sola bomba cambió la historia del mundo.»
2. **c1**: «Agosto de 1945. Alemania ya se ha rendido, pero Japón sigue luchando en el Pacífico. Las batallas de Iwo Jima y Okinawa costaron decenas de miles de vidas.»
3. **c2**: «Estados Unidos tiene un arma nueva, desarrollada en secreto: la bomba atómica. El Proyecto Manhattan reunió a miles de científicos.»
4. **c3**: «El presidente Truman decide usarla para forzar la rendición sin invadir Japón.»
5. **d1**: «6 de agosto. El bombardero Enola Gay deja caer la bomba sobre Hiroshima. Mucha gente iba camino al trabajo o a la escuela.»
6. **d2**: «En un instante, la ciudad desaparece bajo un destello y una onda de calor.»
7. **d3**: «Decenas de miles de personas mueren ese mismo día. A finales de año, la cifra llega a unas ciento cuarenta mil.»
8. **r1**: «Tres días después, una segunda bomba cae sobre Nagasaki.»
9. **r2**: «El 15 de agosto, el emperador anuncia la rendición de Japón.»
10. **f1**: «Hasta hoy, son las únicas bombas atómicas usadas en una guerra. Los supervivientes, los hibakusha, dedicaron su vida a pedir que nunca se repita.»
11. **f2**: «Y el debate sigue: ¿acortaron la guerra, o nunca debieron lanzarse?»

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
