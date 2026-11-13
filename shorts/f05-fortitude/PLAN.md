# El ejército que no existía — plan de producción (42 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–6.3 s | «Durante la Segunda Guerra Mundial, los Aliados consiguieron engañar a Hitler con un ejército que no era real.» |
| 6.3–12.4 s | «En 1944, los alemanes esperaban una gran invasión aliada en Europa.» |
| 12.4–16.3 s | «Pero los Aliados querían que miraran hacia el lugar equivocado.» |
| 16.3–20.2 s | «Para confundirlos, crearon señales de un ejército ficticio:» |
| 20.2–24.4 s | «tanques inflables, aviones falsos y comunicaciones engañosas.» |
| 24.4–27.8 s | «La operación Fortitude ayudó a convencer a los alemanes» |
| 27.8–30.6 s | «de que el ataque principal llegaría por otro lugar.» |
| 30.6–35.4 s | «El 6 de junio de 1944 comenzó el desembarco de Normandía.» |
| 35.4–41.5 s | «A veces, en una guerra, engañar al enemigo puede ser tan importante como mover un ejército.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `f05_campo` | pan vertical descendente | — | dibujo: tanque, tanque, tanque, tanque |
| 2 | `f05_mapa` | órbita con giro suave | — | iconos ❓ |
| 3 | `f05_base` | whip pan | aliado; aliado2 | — |
| 4 | `f05_base` | tracking lateral | aliado; aliado2 | dibujo: tanque |
| 5 | `f05_base` | crash zoom | aliado; aliado2 | texto «¡INFLABLES!»; dibujo: tanque |
| 6 | `f05_radio` | primer plano de detalle | aliado2 | texto «OPERACIÓN FORTITUDE»; iconos 📻 |
| 7 | `f05_bunker` | dolly in lento | general; aleman | iconos 📍 |
| 8 | `f05_playa` | plano general que se abre | — | 3 barco(s) |
| 9 | `f05_campo` | dolly out de cierre | — | dibujo: tanque |

Título de entrada: HISTORIA REAL / EL EJÉRCITO QUE NO EXISTÍA. Cierre: EL EJÉRCITO / QUE NO EXISTÍA.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `f05_campo`: english countryside airfield in 1944 seen from above, green fields, tents and dirt roads, cloudy sky
- `f05_mapa`: second world war military map of western Europe and the English Channel on a table, pins and wooden markers, no letters
- `f05_base`: 1944 army camp in the english countryside with tents, trucks, camouflage nets, green field
- `f05_radio`: second world war radio room with headphones, radio sets, dials and cables, dim lamp
- `f05_bunker`: 1944 german command bunker room with a big table map and hanging lamp, concrete walls
- `f05_playa`: wide panoramic view of the Normandy coast at dawn with many ships on the horizon, grey sea, cliffs

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Imperial War Museums: D-Day’s Parachuting Dummies and Inflatable Tanks
- Britannica: Operation Fortitude
- The National WWII Museum: Operation Fortitude
