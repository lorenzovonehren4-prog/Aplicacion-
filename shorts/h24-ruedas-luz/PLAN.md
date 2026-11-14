# Ruedas de luz bajo el mar — plan de producción (37 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–4.7 s | «¿Sabías que hay marineros que juran haber visto enormes ruedas de luz girando bajo el mar?» |
| 4.7–8.8 s | «Los relatos vienen sobre todo del golfo Pérsico y del océano Índico.» |
| 8.8–15.0 s | «Desde el siglo XIX, tripulaciones describieron rayos de luz que giraban como los radios de una rueda.» |
| 15.0–18.7 s | «Algunos decían que pasaban a gran velocidad por debajo del barco.» |
| 18.7–21.6 s | «Y que los instrumentos de a bordo se volvían locos.» |
| 21.6–25.6 s | «La ciencia propone una explicación: el plancton bioluminiscente.» |
| 25.6–30.5 s | «Brilla cuando algo lo agita, por ejemplo, las ondas de terremotos submarinos.» |
| 30.5–34.9 s | «Pero nadie ha explicado del todo por qué a veces forma figuras tan geométricas.» |
| 34.9–37.3 s | «¿Qué más esconde el fondo del océano?» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `h24_mar` | travelling que pasa por detrás de un objeto en primer plano | — | iconos 🌀 |
| 2 | `h24_mar` | plano general que se abre | — | texto «GOLFO PÉRSICO» |
| 3 | `h24_cubierta` | la cámara pasa por detrás del personaje | marinero; capitan | — |
| 4 | `h24_cubierta` | crash zoom | marinero | iconos 💡 |
| 5 | `h24_puente` | primer plano de detalle | capitan | iconos 🧭 |
| 6 | `h24_archivo` | órbita con giro suave | cientifico | texto «¿BIOLUMINISCENCIA?» |
| 7 | `h24_mar` | giro de cámara | — | iconos 🌊 |
| 8 | `h24_archivo` | dolly in lento | cientifico | — |
| 9 | `h24_estrellas` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / RUEDAS DE LUZ BAJO EL MAR. Cierre: ¿QUÉ HABÍA / ABAJO? 🌊.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `h24_mar`: dark open sea at night with a ship, a huge glowing green wheel of light rotating under the water
- `h24_cubierta`: deck of an old cargo ship at night, green glow coming from the water below
- `h24_puente`: ship bridge at night with an old radar screen and glowing instruments
- `h24_archivo`: old naval archive room with logbooks and papers, lamp light
- `h24_estrellas`: calm sea under a starry night sky, faint green glow on the water

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- K. Kalle, estudios sobre ruedas fosforescentes (Deutsche Hydrographische Zeitschrift, 1960)
- Relatos de buques publicados en The Marine Observer (Reino Unido)
