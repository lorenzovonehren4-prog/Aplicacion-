# La mina maldita — plan de producción (34 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–4.5 s | «¿Sabías que en Arizona hay una mina de oro perdida que muchos buscaron… y algunos no volvieron?» |
| 4.5–6.8 s | «Se la conoce como la mina del Holandés Perdido.» |
| 6.8–10.9 s | «Su leyenda gira en torno a Jacob Waltz, un minero alemán del siglo XIX.» |
| 10.9–14.7 s | «Se decía que había encontrado una veta riquísima en las montañas Superstition.» |
| 14.7–18.0 s | «Murió en 1891 sin revelar dónde estaba.» |
| 18.0–21.4 s | «Desde entonces, miles de buscadores han recorrido esos cañones.» |
| 21.4–26.0 s | «Y hubo muertes nunca del todo aclaradas, como la de Adolph Ruth en 1931.» |
| 26.0–29.6 s | «Muchos excursionistas se pierden también por el calor extremo y el terreno.» |
| 29.6–34.2 s | «Nadie ha encontrado la mina. ¿Existe… o es solo una leyenda?» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `h25_montana` | la cámara pasa por detrás del personaje | explorador | — |
| 2 | `h25_mapa` | primer plano de detalle | — | texto «LA MINA DEL HOLANDÉS PERDIDO» |
| 3 | `h25_cueva` | órbita con giro suave | arqueologo | — |
| 4 | `h25_cueva` | travelling que pasa por detrás de un objeto en primer plano | arqueologo | iconos 🪙 |
| 5 | `h25_montana` | crash zoom | — | — |
| 6 | `h25_canon` | tracking lateral | explorador; campesino | — |
| 7 | `h25_arena` | giro de cámara | — | texto «¿UNA MINA MALDITA?»; iconos 🎩 |
| 8 | `h25_canon` | dolly in lento | explorador | iconos ☀️ |
| 9 | `h25_montana` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / LA MINA MALDITA. Cierre: ¿TE ARRIESGARÍAS / A BUSCARLA? 🪙.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `h25_montana`: the Superstition Mountains in Arizona at sunset, dry desert, saguaro cactus
- `h25_mapa`: old torn treasure map of desert mountains with red ink marks, parchment
- `h25_canon`: dry rocky canyon in the Arizona desert under a burning sun
- `h25_cueva`: dark rocky cave entrance in a desert mountain, gold glitter inside
- `h25_arena`: desert sand with an old hat and an empty canteen abandoned, harsh sun

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Superstition Mountain Museum: The Lost Dutchman Mine
- Britannica: Lost Dutchman Mine
