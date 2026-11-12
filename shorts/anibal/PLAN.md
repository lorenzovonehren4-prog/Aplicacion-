# Aníbal — plan de producción (1:21, 9:16, español)

Hecho según `shorts/SISTEMA.md`. Todo se genera con código en esta carpeta: `voz.py` (narración Piper `es_MX-claude-high`),
`audio.py` (música, efectos y mezcla), `escena.html` (animación) y `render.mjs` (exportación).

## A. Investigación

**Tema:** Aníbal Barca (247 – c. 183/181 a. C.), general cartaginés de la Segunda Guerra Púnica (218–201 a. C.).

**Cronología verificada**
| Año (a. C.) | Hecho |
| --- | --- |
| 264–241 | Primera Guerra Púnica: Cartago pierde frente a Roma. |
| c. 238–237 | Amílcar Barca hace jurar a su hijo de 9 años que nunca será amigo de Roma (Polibio III.11; Livio XXI.1). |
| 221 | Aníbal, con unos 26 años, toma el mando del ejército cartaginés en Hispania (base: Qart Hadasht, hoy Cartagena). |
| 219 | Asedio y toma de Sagunto, detonante de la guerra. |
| 218 | Marcha por tierra: Pirineos, Ródano y Alpes, con elefantes (Polibio habla de 37). Tras los Pirineos tenía unos 50.000 infantes y 9.000 jinetes; llega a Italia con unos 20.000 y 6.000 (Polibio III.35 y III.56). Victoria en el Trebia (diciembre). |
| 217 | Victoria en el lago Trasimeno (junio). |
| 216 | Cannas (2 de agosto): Roma junta unos 80.000–86.000 hombres; Aníbal, unos 50.000. Doble envolvimiento. Muertos romanos: unos 50.000 según Livio, unos 70.000 según Polibio. |
| 216 | No marcha sobre Roma. Livio (XXII.51) atribuye a Maharbal: «Vincere scis, Hannibal; victoria uti nescis». |
| 218–203 | Unos 15 años en Italia sin perder una gran batalla campal. |
| 204–203 | Escipión desembarca en África; Cartago llama a Aníbal de vuelta. |
| 202 | Zama: Escipión vence a Aníbal. |
| c. 183/181 | Exiliado en Bitinia, toma veneno para no ser entregado a Roma (Livio XXXIX.51). |

**Precisión y matices**
- El juramento lo cuentan Polibio y Livio, y en Polibio se lo narra el propio Aníbal ya viejo. Se presenta como lo cuentan las fuentes.
- La frase de Maharbal se atribuye explícitamente a Livio. No hay diálogos inventados.
- Las cifras de Cannas varían según la fuente, y el video da el rango.
- «Más de la mitad se queda en el camino» incluye muertos, desertores y guarniciones dejadas atrás, no sólo muertos.
- El «parche» del Aníbal viejo es real: perdió un ojo por una infección en 217 a. C. (Polibio III.79; Livio XXII.2).
- Rótulo permanente «RECREACIÓN ANIMADA».

**Fuentes de referencia:** Polibio, *Historias*, libro III; Tito Livio, *Ab Urbe Condita*, libros XXI–XXX y XXXIX; Encyclopaedia Britannica («Hannibal», «Battle of Cannae», «Punic Wars»). Las cifras y fechas salen de estas obras clásicas tal como las recoge la bibliografía de referencia; no se consultaron en línea durante la producción.

## B. Guion (texto exacto de la voz en `guion.json`)
1. **Gancho** (0–7 s): «Un niño de nueve años jura, frente a un altar, ser enemigo de Roma para siempre. Veinte años después… casi la destruye.»
2. **Contexto** (7–16 s): primera guerra perdida; 221 a. C.; mando en Hispania a los 26.
3. **Desarrollo** (16–31 s): no va por mar, va por tierra; Pirineos, Alpes, elefantes; nieve, avalanchas, emboscadas; pierde más de la mitad; Trebia, Trasimeno.
4. **Revelación** (31–50 s): Cannas, la trampa del centro que retrocede «a propósito» y «¡Rodeados!».
5. **Giro** (50–61 s): no ataca Roma; la frase de Maharbal según Livio.
6. **Cierre** (61–81 s): quince años, Escipión, Zama, el veneno… y la vuelta al juramento: «Nunca se rindió ante Roma. Tal como lo juró a los nueve años.»

Énfasis: nombres, fechas y cifras (amarillo en subtítulos). Pausas largas antes de «casi la destruye», «a propósito», «¡Rodeados!» y el cierre.

## C. Biblia visual
Stickman evolucionado: cabeza redonda, contorno negro, ojos, cejas y boca animados, ropa a color, brazos con codo, sombra.

| Personaje | Piel | Pelo / barba | Ropa | Rasgo |
| --- | --- | --- | --- | --- |
| Aníbal (adulto) | morena `#b47b4e` | rizado negro, barba negra | coraza de bronce, túnica hueso, **capa púrpura de Cartago** con ribete dorado | el más alto del bando cartaginés |
| Aníbal niño | igual | rizado corto, sin barba | túnica clara con cinto púrpura | mide la mitad que su padre |
| Aníbal viejo | igual | gris, barba gris | túnica y capa púrpura oscuras | parche en un ojo |
| Amílcar | `#a87048` | barba larga gris oscura | coraza, capa granate | padre severo |
| Maharbal | `#c08a5c` | castaño, barba corta | coraza de cuero, capa verde | entra caminando y gesticula |
| Escipión | clara `#e2b892` | castaño corto, afeitado | coraza dorada, **capa escarlata** | contrasta con el púrpura de Aníbal |
| Soldados | cartagineses de tonos y túnicas variados con escudo redondo; romanos de rojo con casco y escudo rectangular | | | |

Paleta: templo nocturno con fuego cálido · ciudad en llamas roja · mapa de pergamino y mar petróleo · Alpes azul y blanco · Cannas ocre con polvo · colina al atardecer · Zama crepúsculo que se desatura al perder · final azul noche con la lámpara.

## D. Storyboard
| # | Tiempo | Plano | Cámara | Luz / efectos | Sonido |
| --- | --- | --- | --- | --- | --- |
| 1 | 0–4,6 | Templo: Amílcar y el niño ante el altar; el niño levanta la mano | dolly in lento con leve giro hasta la cara del niño, y crash zoom al cortar | fuego como luz práctica, brasas que suben, columnas en paralaje | fuego, latido de tambor |
| 2 | 4,6–7,4 | Aníbal adulto, ojos que se abren; la ciudad en llamas y los elefantes en silueta | primer plano extremo y luego **pull out** brusco | cielo rojo, humo, llamas; título «ANÍBAL» | riser, golpe grave, whoosh |
| 3 | 7,4–23,6 | Mapa: Roma contra Cartago, Hispania y Qart Hadasht, ruta por mar tachada, ruta por tierra que se dibuja con un elefante | travelling sobre el mapa, push in a los Alpes | fechas 221 y 218 a. C., medallón de Aníbal | papel, tambores y cuerdas en corcheas, barrito |
| 4 | 23,6–28,4 | Alpes: la columna (soldados, elefantes y Aníbal al frente) | travelling lateral con 4 capas de paralaje | nieve con viento, avalancha, soldados que desaparecen, contador 59.000 → 26.000 | viento, golpe de avalancha |
| 5 | 28,4–31,1 | Mapa: Trebia y Trasimeno con espadas cruzadas | barrido del mapa | rótulos con fecha | dos impactos con choque metálico |
| 6 | 31,1–50,4 | Cannas desde arriba: bloque romano, media luna púrpura que se invierte, caballería dorada que rodea | crash zoom del mapa al campo, giro lento de grúa, push in en «¡Rodeados!» | flechas, polvo, fichas romanas que caen, contadores | tambores que aceleran, silencio, golpe enorme |
| 7 | 50,4–61 | Colina al atardecer: Aníbal mira Roma a lo lejos; entra Maharbal y le habla | travelling lateral y luego push in a la cara de Aníbal, que duda | contraluz del sol, rótulo de nombre, cita con atribución | viento suave, colchón grave |
| 8 | 61–69,4 | Mapa de Italia en púrpura con años que corren 218 → 203; Escipión ante estandartes SPQR; flechas a África | dolly in sobre Escipión | rótulo de nombre | tambores medios |
| 9 | 69,4–73,8 | Zama: Aníbal frente a Escipión | whip pan entre los dos y push in a Aníbal derrotado | crepúsculo que se desatura | golpes, colchón triste |
| 10 | 73,8–81,3 | Aníbal viejo junto a la lámpara levanta la copa; **match cut** al fuego del altar del inicio | dolly in lento; del fuego a plano general | la lámpara se apaga; título final | fuego, golpe final |

## E. Prompts de generación
Las escenas no se generan con IA de imagen: cada plano es código en `escena.html` (`templo`, `heroe`, `mapa`, `alpes`,
`cannas`, `colina`, `escipion`, `zama`, `final`), con las fichas de personaje como constantes y la cámara por fotogramas clave.
Si en el futuro se usan generadores de pago, este es el prompt base por escena:
> «2D animated documentary, evolved stickman characters with round heads, clean black outlines, expressive simple faces, fully colored historical clothing, [personaje y ficha], [escenario], [luz], 9:16, cinematic camera [movimiento], no text».

Voz: Piper `es_MX-claude-high`, `length_scale` 0,72. Música y efectos: síntesis en `audio.py`.

## F. Montaje
`python3 voz.py <carpeta del modelo> 0.72` → `python3 audio.py` → `NODE_PATH=$(npm root -g) node render.mjs anibal.mp4`.
`audio.py` coloca cada frase con su pausa, baja la música cuando habla la voz y normaliza a −14 LUFS al exportar. `escena.html`
lee la línea de tiempo y sincroniza cortes, subtítulos (máx. 2 líneas, palabras clave en amarillo), fechas, contadores y rótulos con la voz.
Exportación: 1080×1920, 30 FPS, H.264 + AAC.

## G. Evaluación (honesta)
| Criterio | Nota | Punto débil y cómo corregirlo |
| --- | --- | --- |
| Gancho | 8 | Fuerte y verdadero. Mejora: que el niño hable en lugar del narrador. |
| Claridad narrativa | 8 | El mapa y el diagrama de Cannas explican bien; Escipión aparece muy rápido. |
| Calidad visual | 6 | Vectorial limpio, pero lejos de una serie animada profesional: faltan texturas y detalle en los fondos. |
| Cámara | 7 | Hay variedad (dolly, crash zoom, travelling, whip, grúa); algunos movimientos son sólo zoom. |
| Animación | 5 | Caminan, respiran, parpadean y gesticulan, pero sin poses nuevas ni sincronía labial real. Es lo que más limita. |
| Iluminación | 6 | Hay luces prácticas (fuego, lámpara, sol), pero los personajes no reciben la luz de la escena. |
| Sonido | 6 | Voz más natural que la anterior; la música y los efectos sintetizados suenan simples. Sin escucharlo no puedo afinar la mezcla. |
| Ritmo | 8 | Rápido, sin pausas muertas, 1:21. |
| Continuidad | 8 | Las fichas se mantienen; el parche del Aníbal viejo tiene base histórica. |
| Potencial de retención | 7 | Gancho y cierre en bucle fuertes; la parte del mapa central puede perder a algunos. |

**Lo que más subiría la calidad:** voz profesional (ElevenLabs u otra de pago), música con licencia y más poses y planos de personajes en primer plano.
