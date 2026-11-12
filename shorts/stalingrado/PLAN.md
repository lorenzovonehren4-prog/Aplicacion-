# Stalingrado (1942–1943) — plan de producción (1:09, 9:16, español)

Hecho según `shorts/SISTEMA.md` con el motor común (`shorts/motor/`).

## A. Investigación
- Verano de 1942: Caso Azul, ofensiva alemana hacia el Cáucaso.
- 23 de agosto de 1942: bombardeo masivo de la Luftwaffe.
- Combate urbano; los alemanes lo llamaron «Rattenkrieg».
- Cruces nocturnos del Volga para reforzar a los soviéticos.
- 19 de noviembre: Operación Urano; cerco del 6.º Ejército en cuatro días.
- 2 de febrero de 1943: fin de la resistencia; unos 91.000 prisioneros.
- Bajas totales estimadas entre 1,8 y 2 millones (muertos, heridos y capturados).

**Precisión:** «La más sangrienta» se refiere a las bajas totales estimadas; se dice como valoración común de los historiadores. Rótulo permanente «RECREACIÓN ANIMADA».

**Fuentes:** Britannica («Battle of Stalingrad»); Antony Beevor, *Stalingrado* (1998); David Glantz, *When Titans Clashed*.

## B. Guion (texto exacto en `guion.json`)
1. **h1**: «La batalla más sangrienta de la historia se libró por una ciudad que llevaba el nombre de Stalin.»
2. **c1**: «Verano de 1942. Alemania invade la Unión Soviética y avanza hacia el sur, buscando el petróleo del Cáucaso.»
3. **c2**: «En el camino está Stalingrado, junto al río Volga.»
4. **c3**: «Para Hitler, tomarla es un símbolo. Para Stalin, perderla es impensable.»
5. **d1**: «El 23 de agosto, la aviación alemana bombardea la ciudad hasta dejarla en ruinas.»
6. **d2**: «Y empieza una guerra calle por calle, casa por casa, a veces piso por piso. Los soldados alemanes la llamaban la guerra de las ratas.»
7. **d3**: «Los soviéticos resisten aferrados a la orilla del Volga, con tropas que cruzan el río bajo fuego cada noche.»
8. **r1**: «El 19 de noviembre, el Ejército Rojo lanza un contraataque por los flancos. En cuatro días, rodea a todo el sexto ejército alemán.»
9. **r2**: «Hambre, frío y munición agotada. A principios de febrero de 1943, los alemanes se rinden.»
10. **f1**: «Unos noventa mil soldados alemanes son capturados. Las bajas de ambos bandos se cuentan por cientos de miles.»
11. **f2**: «Desde ahí, Alemania ya no volvió a avanzar en el este.»

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
