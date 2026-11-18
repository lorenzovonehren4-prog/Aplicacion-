# El perro que esperó — plan de producción (33 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–3.9 s | «¿Sabías que un perro esperó a su dueño en una estación de tren durante casi diez años?» |
| 3.9–7.4 s | «Se llamaba Hachiko, y vivía en Tokio con un profesor universitario.» |
| 7.4–10.1 s | «Cada tarde, lo esperaba en la estación de Shibuya.» |
| 10.1–15.5 s | «En 1925, el profesor murió de repente en el trabajo. Nunca volvió.» |
| 15.5–19.3 s | «Pero Hachiko siguió yendo a la estación. Todos los días.» |
| 19.3–21.5 s | «Los viajeros empezaron a llevarle comida.» |
| 21.5–25.8 s | «En 1934 le hicieron una estatua… y él estuvo en la inauguración.» |
| 25.8–29.0 s | «Murió en 1935, cerca de la estación.» |
| 29.0–32.9 s | «Hoy, su estatua es uno de los puntos de encuentro más famosos de Tokio.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `i04_estacion` | la cámara pasa por detrás del personaje | — | iconos 🐕 |
| 2 | `i04_casa` | órbita con giro suave | erudito | iconos 🐕 |
| 3 | `i04_estacion` | tracking lateral | erudito | iconos 🐕 |
| 4 | `i04_estacion` | crash zoom | — | iconos 🐕 |
| 5 | `i04_nieve` | travelling que pasa por detrás de un objeto en primer plano | — | iconos 🐕 |
| 6 | `i04_estacion` | primer plano de detalle | chico3 | iconos 🐕 🍙 |
| 7 | `i04_estatua` | giro de cámara | — | iconos 🐕 |
| 8 | `i04_nieve` | dolly in lento | — | — |
| 9 | `i04_ciudad` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / EL PERRO QUE ESPERÓ. Cierre: HACHIKO / EL PERRO MÁS FIEL.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `i04_estacion`: Shibuya train station in Tokyo in the 1920s at sunset, wooden station, people, trams
- `i04_casa`: traditional japanese house with a garden in Tokyo, 1920s, warm light
- `i04_nieve`: japanese train station entrance under falling snow, quiet evening
- `i04_estatua`: bronze statue of a sitting akita dog in front of a train station, cherry blossoms
- `i04_ciudad`: modern Shibuya crossing in Tokyo at night with lights

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Museo Nacional de la Naturaleza y la Ciencia de Japón (Hachiko)
- The Asahi Shimbun
