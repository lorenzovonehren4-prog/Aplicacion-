# La señal de 72 segundos — plan de producción (41 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–8.0 s | «En 1977, un telescopio captó una señal tan extraña que un científico escribió una sola palabra: ¡WOW!» |
| 8.0–11.2 s | «El 15 de agosto, el radiotelescopio Big Ear» |
| 11.2–15.2 s | «recibió una señal de radio muy intensa que duró 72 segundos.» |
| 15.2–20.7 s | «Días después, Jerry Ehman revisó los registros y encontró algo extraordinario.» |
| 20.7–23.7 s | «Escribió WOW al lado de la señal.» |
| 23.7–28.9 s | «La señal parecía interesante, pero nunca se consiguió repetir de forma concluyente.» |
| 28.9–32.1 s | «Su origen continúa sin una explicación definitiva.» |
| 32.1–37.2 s | «¿Fue un fenómeno natural, una interferencia o algo que todavía no entendemos?» |
| 37.2–40.5 s | «No hay pruebas de que fuera un mensaje extraterrestre.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `f06_tele` | pan vertical ascendente | — | — |
| 2 | `f06_bigear` | plano general que se abre | — | — |
| 3 | `f06_sala` | crash zoom | — | iconos 📡 〰️ 〰️ |
| 4 | `f06_mesa` | órbita con giro suave | ehman | — |
| 5 | `f06_mesa` | primer plano de detalle | — | dibujo: wow |
| 6 | `f06_ondas` | tracking lateral | ehman | iconos 📡 🔇 |
| 7 | `f06_espacio` | dolly in lento | — | texto «¿DE DÓNDE VINO?» |
| 8 | `f06_espacio` | whip pan | — | iconos ☄️ 📻 ❓ |
| 9 | `f06_tele` | dolly out de cierre | — | dibujo: wow |

Título de entrada: MISTERIO REAL / LA SEÑAL DE 72 SEGUNDOS. Cierre: LA SEÑAL WOW! / 1977.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `f06_tele`: a giant radio telescope dish pointing at a starry night sky, milky way, dark blue
- `f06_bigear`: a huge flat radio telescope field with a big metal reflector wall in Ohio at night, stars
- `f06_sala`: 1970s observatory computer room with a mainframe, a line printer with paper and blinking lights
- `f06_mesa`: 1970s kitchen table at night with stacks of computer printout paper, a red pen and a coffee cup, lamp light
- `f06_espacio`: deep space with colorful nebula, thousands of stars and a bright distant star, dark blue and purple
- `f06_ondas`: night landscape with a small radio antenna on a hill under a huge starry sky with the milky way, dark blue

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Ohio State University Radio Observatory / Big Ear: The Wow! Signal (J. Ehman, informe del 30.º aniversario)
- NASA Astronomy Picture / SETI Institute: Wow! signal
