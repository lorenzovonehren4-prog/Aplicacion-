# El barco que se hundió en 20 minutos — plan de producción (30 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–3.7 s | «¿Sabías que un barco de guerra se hundió a los 20 minutos de su primer viaje?» |
| 3.7–6.2 s | «Era el Vasa, el orgullo de la marina de Suecia.» |
| 6.2–10.6 s | «El 10 de agosto de 1628 zarpó en Estocolmo, ante una multitud.» |
| 10.6–13.5 s | «Tenía 64 cañones y estaba lleno de esculturas.» |
| 13.5–15.7 s | «Pero era demasiado alto y pesado arriba.» |
| 15.7–19.6 s | «Una ráfaga de viento lo inclinó, entró agua por las troneras… y se hundió.» |
| 19.6–22.5 s | «Pasó 333 años en el fondo del puerto.» |
| 22.5–27.2 s | «En 1961 lo reflotaron. Casi todo era original.» |
| 27.2–30.3 s | «Hoy es uno de los museos más visitados de Escandinavia.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `j16_hundimiento` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `j16_barco` | plano general que se abre | — | — |
| 3 | `j16_puerto` | órbita con giro suave | parisino; parisina | — |
| 4 | `j16_barco` | primer plano de detalle | — | texto «64 CAÑONES» |
| 5 | `j16_barco` | la cámara pasa por detrás del personaje | capitan | — |
| 6 | `j16_hundimiento` | crash zoom | — | — |
| 7 | `j16_fondo` | pan vertical descendente | — | texto «333 AÑOS» |
| 8 | `j16_fondo` | giro de cámara | — | — |
| 9 | `j16_museo` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / EL BARCO QUE SE HUNDIÓ EN 20 MINUTOS. Cierre: EL VASA / 1628.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `j16_puerto`: 17th century Stockholm harbor with a huge colorful warship and crowds, sunny
- `j16_barco`: a richly decorated 17th century warship with carved statues and sails
- `j16_hundimiento`: a big old warship tilting and sinking in a harbor, people on the shore
- `j16_fondo`: murky underwater view of an old wooden ship wreck
- `j16_museo`: big museum hall with a preserved 17th century wooden warship, dim light

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Vasamuseet (Estocolmo): historia del Vasa
- Britannica: Vasa (ship)
