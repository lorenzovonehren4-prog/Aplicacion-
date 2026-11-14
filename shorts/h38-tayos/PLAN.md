# La cueva de los tayos — plan de producción (44 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–5.0 s | «¿Sabías que se cuenta que bajo la selva de Ecuador hay una biblioteca secreta de placas de metal?» |
| 5.0–9.1 s | «La historia habla de la Cueva de los Tayos, en la Amazonía ecuatoriana.» |
| 9.1–14.4 s | «Es un lugar sagrado para el pueblo shuar, y en ella viven unas aves nocturnas: los tayos.» |
| 14.4–19.6 s | «En los años 70, un explorador aseguró haber visto allí planchas de metal grabadas.» |
| 19.6–24.6 s | «En 1976 se organizó una gran expedición británica y ecuatoriana.» |
| 24.6–28.3 s | «Con ella bajó Neil Armstrong, el primer hombre en pisar la Luna.» |
| 28.3–32.9 s | «Encontraron enormes galerías, fósiles y paredes que parecían talladas.» |
| 32.9–39.2 s | «Pero no encontraron ninguna biblioteca de metal. Los geólogos dicen que esas formas son naturales.» |
| 39.2–44.2 s | «Aun así, la leyenda sigue viva. ¿Qué crees que esconde la cueva?» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `h38_sima` | pan vertical descendente | explorador | — |
| 2 | `h38_selva` | plano general que se abre | — | texto «CUEVA DE LOS TAYOS» |
| 3 | `h38_selva` | órbita con giro suave | indigena; indigena | — |
| 4 | `h38_galeria` | la cámara pasa por detrás del personaje | explorador | iconos 📜 |
| 5 | `h38_cueva` | travelling que pasa por detrás de un objeto en primer plano | aliado; cientifico | — |
| 6 | `h38_cueva` | crash zoom | astronauta | — |
| 7 | `h38_galeria` | giro de cámara | cientifico | texto «¿TALLADAS?» |
| 8 | `h38_galeria` | dolly in lento | cientifico | texto «NINGUNA BIBLIOTECA» |
| 9 | `h38_dosel` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / LA CUEVA DE LOS TAYOS. Cierre: UN MISTERIO / BAJO TIERRA 🗿.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `h38_selva`: dense Amazon rainforest in Ecuador with a hidden rocky cave entrance among plants, mist
- `h38_cueva`: huge dark cave interior with smooth rock walls lit by headlamps, water dripping
- `h38_sima`: deep vertical cave shaft in the jungle with ropes hanging, light from above
- `h38_galeria`: long underground gallery with flat rock walls that look like carved blocks, lamp light
- `h38_dosel`: aerial view of the amazon rainforest canopy at dusk, mist

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Stan Hall, Tayos Gold (2005)
- Informes de la expedición británico-ecuatoriana a la Cueva de los Tayos (1976)
