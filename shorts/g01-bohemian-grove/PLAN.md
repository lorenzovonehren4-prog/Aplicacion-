# El secreto del bosque — plan de producción (45 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–6.1 s | «¿Sabías que cada verano algunos de los hombres más poderosos del mundo se reúnen en secreto… frente a un búho gigante de piedra?» |
| 6.1–10.1 s | «Ocurre en Bohemian Grove, un bosque privado de más de mil hectáreas en California.» |
| 10.1–13.6 s | «Está fuertemente vigilado, y la prensa tiene prohibida la entrada.» |
| 13.6–20.0 s | «Desde hace más de un siglo, presidentes de Estados Unidos, banqueros y magnates pasan allí unas dos semanas cada julio.» |
| 20.0–22.8 s | «Sus miembros dicen que es solo un club de arte y descanso.» |
| 22.8–27.6 s | «Pero cada año lo inauguran con un ritual nocturno junto al lago: «La Cremación de la Preocupación».» |
| 27.6–31.6 s | «Túnicas, antorchas y un secreto absoluto alimentaron todo tipo de teorías.» |
| 31.6–37.8 s | «Lo que sí está documentado: en 1942 se celebró allí una reunión de planificación del Proyecto Manhattan.» |
| 37.8–45.4 s | «Y su lema oficial dice: «Las arañas tejedoras no entran aquí». ¿Es solo un club social… o el lugar donde se decide el rumbo del mundo?» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `g01_bosque` | tracking lateral | — | iconos 🔥 |
| 2 | `g01_mapa` | plano general que se abre | — | texto «BOHEMIAN GROVE»; iconos 📍 |
| 3 | `g01_entrada` | whip pan | guardia; guardia | texto «ACCESO PROHIBIDO»; iconos 📷 🚫 |
| 4 | `g01_cabana` | órbita con giro suave | presidente; empresario; empresario2 | texto «PRESIDENTES • MAGNATES • BANQUEROS» |
| 5 | `g01_cabana` | primer plano de detalle | empresario | iconos 🎭 🎻 |
| 6 | `g01_buho` | pan vertical ascendente | encapuchado; encapuchado2; encapuchado | texto «LA CREMACIÓN DE LA PREOCUPACIÓN»; iconos 🔥 |
| 7 | `g01_lago` | crash zoom | encapuchado2; encapuchado | texto «¿CLUB… O RITUAL DE PODER?» |
| 8 | `g01_cabana` | dolly in lento | cientifico; empresario2 | texto «PROYECTO MANHATTAN»; iconos ⚛️ |
| 9 | `g01_buho` | dolly out de cierre | — | texto ««WEAVING SPIDERS COME NOT HERE»»; iconos 🦉 🕸️ |

Título de entrada: ¿SABÍAS QUE...? / EL SECRETO DEL BOSQUE. Cierre: BOHEMIAN GROVE / ¿TÚ QUÉ OPINAS?.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `g01_bosque`: giant redwood forest at night, huge tree trunks, a distant orange campfire glow between the trees, deep blue darkness, mysterious mood
- `g01_buho`: a huge stone owl statue standing at the edge of a dark lake at night in a redwood forest, lit from below by orange fire, reflections on the water
- `g01_mapa`: antique illustrated map of the coast of northern California with forests and a small marked spot, sepia parchment, compass rose, no letters
- `g01_entrada`: closed private road with a wooden gate and a small security booth inside a dark redwood forest at night, cold lamp light
- `g01_cabana`: luxurious rustic wooden cabin interior at night with a long table, world maps, whiskey glasses, a fireplace, warm dim light
- `g01_lago`: dark lake at night surrounded by giant redwoods, many torches reflected on the water, a stone altar with fire, smoke

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Britannica: Bohemian Grove
- The Guardian / informes de prensa sobre el retiro anual (julio)
- Wikipedia: Bohemian Grove (reunión de planificación del Proyecto Manhattan, septiembre de 1942; lema del club; Cremation of Care)
