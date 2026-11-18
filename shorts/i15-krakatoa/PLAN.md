# El sonido más fuerte — plan de producción (39 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–5.9 s | «¿Sabías que el sonido más fuerte jamás registrado se escuchó a casi cinco mil kilómetros de distancia?» |
| 5.9–11.7 s | «Fue el 27 de agosto de 1883, en el volcán Krakatoa, en Indonesia.» |
| 11.7–13.1 s | «La isla explotó.» |
| 13.1–18.4 s | «En la isla Rodrigues, en el océano Índico, alguien creyó oír cañones lejanos.» |
| 18.4–21.8 s | «Estaba a unos 4.800 kilómetros.» |
| 21.8–25.3 s | «Los barómetros de todo el mundo registraron la onda de presión.» |
| 25.3–27.2 s | «Dio varias vueltas al planeta.» |
| 27.2–32.4 s | «Durante meses, los atardeceres se vieron rojos en muchos países, por la ceniza.» |
| 32.4–38.6 s | «Algunos investigadores creen que el cielo rojo de «El grito», de Munch, se inspiró en ellos.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `i15_volcan` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `i15_volcan` | plano general que se abre | — | — |
| 3 | `i15_volcan` | crash zoom | — | — |
| 4 | `i15_isla` | la cámara pasa por detrás del personaje | marinero | — |
| 5 | `i15_isla` | primer plano de detalle | — | texto «4.800 KM» |
| 6 | `i15_barometro` | órbita con giro suave | cientifico | — |
| 7 | `i15_barometro` | giro de cámara | — | — |
| 8 | `i15_atardecer` | pan vertical ascendente | — | — |
| 9 | `i15_fiordo` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / EL SONIDO MÁS FUERTE. Cierre: KRAKATOA / 1883.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `i15_volcan`: volcanic island exploding in the sea with a gigantic ash column, 1883
- `i15_isla`: small tropical island in the Indian ocean with palm trees and a calm sea
- `i15_barometro`: 19th century scientific instrument room with barometers and paper charts
- `i15_atardecer`: intense red and orange sunset sky over a European city in the 19th century
- `i15_fiordo`: blood red sky over a fjord and a wooden walkway, Oslo

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Simon Winchester, «Krakatoa» (2003)
- Royal Society, informe sobre la erupción de Krakatoa (1888)
