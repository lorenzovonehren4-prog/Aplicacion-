# Los cuervos de la torre — plan de producción (27 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–3.8 s | «¿Sabías que en la Torre de Londres siempre tiene que haber cuervos… por una leyenda?» |
| 3.8–7.1 s | «Se dice que si los cuervos abandonan la torre, el reino caerá.» |
| 7.1–9.6 s | «Por eso, allí viven al menos seis cuervos.» |
| 9.6–12.9 s | «Los cuida un guardián con un cargo especial: el maestro de cuervos.» |
| 12.9–16.5 s | «Les recortan un poco las plumas de un ala, para que no se alejen volando.» |
| 16.5–19.4 s | «Cada uno tiene nombre, y comen carne todos los días.» |
| 19.4–22.3 s | «Algunos, aun así, se han escapado alguna vez.» |
| 22.3–24.9 s | «Nadie sabe con certeza de dónde viene la leyenda.» |
| 24.9–27.2 s | «Pero nadie quiere comprobar si es verdad.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `j10_torre` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `j10_noche` | crash zoom | — | iconos 🐦‍⬛ |
| 3 | `j10_patio` | plano general que se abre | — | texto «6 CUERVOS» |
| 4 | `j10_patio` | la cámara pasa por detrás del personaje | guardia | iconos 🐦‍⬛ |
| 5 | `j10_muralla` | primer plano de detalle | guardia | iconos 🐦‍⬛ |
| 6 | `j10_patio` | órbita con giro suave | — | iconos 🐦‍⬛ 🐦‍⬛ |
| 7 | `j10_muralla` | giro de cámara | — | — |
| 8 | `j10_noche` | tracking lateral | — | — |
| 9 | `j10_turistas` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / LOS CUERVOS DE LA TORRE. Cierre: SI LOS CUERVOS SE VAN / EL REINO CAERÁ.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `j10_torre`: Tower of London castle on a cloudy day with green lawns
- `j10_patio`: castle courtyard with black ravens on the grass and stone walls
- `j10_muralla`: stone battlements of an old castle with a raven, grey sky
- `j10_noche`: old castle at night with lanterns and fog
- `j10_turistas`: castle courtyard with tourists and a guard in a red and black uniform

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Historic Royal Palaces: The Ravens of the Tower of London
- BBC: The Tower of London ravens
