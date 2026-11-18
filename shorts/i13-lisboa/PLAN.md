# El terremoto de lisboa — plan de producción (36 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–4.2 s | «¿Sabías que un terremoto en Lisboa cambió la forma de construir las ciudades?» |
| 4.2–9.2 s | «Fue el 1 de noviembre de 1755, día de Todos los Santos.» |
| 9.2–12.6 s | «Por la mañana, un terremoto enorme sacudió la ciudad.» |
| 12.6–16.9 s | «Después llegó un tsunami desde el río… y luego incendios durante días.» |
| 16.9–19.3 s | «Gran parte de Lisboa quedó destruida.» |
| 19.3–22.0 s | «El marqués de Pombal dirigió la reconstrucción.» |
| 22.0–26.3 s | «Probaron estructuras de madera haciendo marchar soldados alrededor de maquetas.» |
| 26.3–31.4 s | «Así nació la «gaiola pombalina», uno de los primeros diseños antisísmicos.» |
| 31.4–36.2 s | «Y las preguntas que envió a las parroquias ayudaron a nacer la sismología moderna.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `i13_terremoto` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `i13_ciudad` | plano general que se abre | — | — |
| 3 | `i13_terremoto` | crash zoom | — | — |
| 4 | `i13_ola` | pan vertical ascendente | — | — |
| 5 | `i13_incendio` | primer plano de detalle | — | — |
| 6 | `i13_obra` | órbita con giro suave | capitan | — |
| 7 | `i13_obra` | tracking lateral | soldadoNap; soldadoNap | — |
| 8 | `i13_obra` | giro de cámara | ingeniero | — |
| 9 | `i13_ciudad` | la cámara pasa por detrás del personaje | erudito | — |

Título de entrada: ¿SABÍAS QUE...? / EL TERREMOTO DE LISBOA. Cierre: LISBOA / 1755.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `i13_ciudad`: 18th century Lisbon with churches and the Tagus river on a sunny morning
- `i13_terremoto`: collapsing 18th century buildings and dust in a city street, earthquake
- `i13_ola`: a big tsunami wave entering a river harbor with old sailing ships
- `i13_incendio`: old city burning at night, smoke over churches
- `i13_obra`: 18th century construction site with wooden frame structures and stone, workers

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Britannica: Lisbon earthquake of 1755
- Universidad de Lisboa: la gaiola pombalina
