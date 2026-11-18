# Sola en la selva — plan de producción (36 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–4.4 s | «¿Sabías que una joven cayó de un avión en la selva peruana… y sobrevivió sola once días?» |
| 4.4–7.4 s | «Fue el 24 de diciembre de 1971.» |
| 7.4–11.4 s | «Juliane Koepcke, de 17 años, volaba de Lima a Pucallpa con su madre.» |
| 11.4–14.8 s | «Un rayo alcanzó el avión en una tormenta, y se partió en el aire.» |
| 14.8–19.6 s | «Juliane cayó desde unos tres kilómetros, atada a su asiento. Y sobrevivió.» |
| 19.6–23.9 s | «Sus padres eran biólogos. Ella sabía cómo moverse en la selva.» |
| 23.9–28.1 s | «Siguió el curso de un arroyo, porque el agua lleva a los ríos… y a las personas.» |
| 28.1–31.5 s | «Once días después, unos trabajadores madereros la encontraron.» |
| 31.5–36.5 s | «Fue la única sobreviviente. Hoy es bióloga, y protege esa misma selva.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `i18_selva` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `i18_avion` | plano general que se abre | — | — |
| 3 | `i18_avion` | órbita con giro suave | estudiante | — |
| 4 | `i18_avion` | crash zoom | — | iconos ⚡ |
| 5 | `i18_selva` | pan vertical descendente | — | — |
| 6 | `i18_arroyo` | la cámara pasa por detrás del personaje | estudiante | — |
| 7 | `i18_arroyo` | tracking lateral | estudiante | — |
| 8 | `i18_rio` | giro de cámara | campesino; estudiante | — |
| 9 | `i18_reserva` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / SOLA EN LA SELVA. Cierre: ONCE DÍAS / SOLA EN LA SELVA.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `i18_avion`: 1970s propeller airliner flying into a dark thunderstorm over the Amazon
- `i18_selva`: dense Peruvian Amazon rainforest seen from above at dawn, mist
- `i18_arroyo`: small jungle stream under huge trees in the Amazon, green light
- `i18_rio`: wide brown Amazon river with a wooden boat and a hut on the bank
- `i18_reserva`: peaceful rainforest research station with wooden huts, morning light

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Juliane Koepcke, «Cuando caí del cielo» (2011)
- Reserva Panguana (Perú)
