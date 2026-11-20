# 12 segundos — plan de producción (31 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–2.9 s | «¿Sabías que el primer vuelo en avión duró solo 12 segundos?» |
| 2.9–7.1 s | «Lo lograron dos hermanos que tenían una tienda de bicicletas: Orville y Wilbur Wright.» |
| 7.1–12.0 s | «Fue el 17 de diciembre de 1903, en las dunas de Kitty Hawk, en Estados Unidos.» |
| 12.0–14.3 s | «Orville se tumbó en el avión, y despegó.» |
| 14.3–17.1 s | «Recorrió unos 36 metros en 12 segundos.» |
| 17.1–21.9 s | «Ese día hicieron cuatro vuelos. El más largo duró 59 segundos.» |
| 21.9–23.8 s | «Poca gente les creyó al principio.» |
| 23.8–28.6 s | «Solo 66 años después, Neil Armstrong llevó a la Luna un trocito de la tela de aquel avión.» |
| 28.6–30.7 s | «De doce segundos… a la Luna.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `j12_vuelo` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `j12_taller` | órbita con giro suave | ingeniero; obrero | — |
| 3 | `j12_dunas` | plano general que se abre | — | — |
| 4 | `j12_vuelo` | pan vertical ascendente | — | — |
| 5 | `j12_vuelo` | crash zoom | — | texto «12 SEGUNDOS» |
| 6 | `j12_dunas` | la cámara pasa por detrás del personaje | ingeniero; obrero | — |
| 7 | `j12_playa` | giro de cámara | — | — |
| 8 | `j12_luna` | primer plano de detalle | astronauta | — |
| 9 | `j12_luna` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / 12 SEGUNDOS. Cierre: HERMANOS WRIGHT / 1903.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `j12_taller`: bicycle repair shop in 1900 with wheels, tools and wooden propellers
- `j12_dunas`: windy sand dunes of Kitty Hawk North Carolina on a cold December morning
- `j12_vuelo`: early wooden biplane flying low over sand dunes, 1903
- `j12_playa`: empty beach with sand dunes and a wooden shed, winter
- `j12_luna`: surface of the Moon with Earth in the black sky

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Smithsonian National Air and Space Museum: 1903 Wright Flyer
- NASA: Apolo 11 y la pieza del Wright Flyer
