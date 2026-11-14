# La isla de las muñecas — plan de producción (38 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–6.2 s | «¿Sabías que en México hay una isla donde cientos de muñecas viejas cuelgan de los árboles… y muchos juran que de noche se mueven?» |
| 6.2–9.1 s | «Está en los canales de Xochimilco, en Ciudad de México.» |
| 9.1–12.3 s | «Su dueño, Julián Santana, vivía solo en una chinampa.» |
| 12.3–16.0 s | «Él contaba que una niña se había ahogado en el canal, cerca de su orilla.» |
| 16.0–20.6 s | «Para calmar su espíritu, empezó a colgar muñecas que encontraba en la basura y en los canales.» |
| 20.6–23.2 s | «Lo hizo durante décadas, hasta llenar la isla.» |
| 23.2–26.5 s | «En 2001, Julián apareció ahogado en ese mismo canal.» |
| 26.5–30.4 s | «Hoy la visitan turistas, y algunos aseguran oír susurros entre los árboles.» |
| 30.4–37.7 s | «Nadie ha podido confirmar la historia de la niña. ¿Leyenda o algo más? ¿Te atreverías a pasar una noche ahí?» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `h21_canal` | travelling que pasa por detrás de un objeto en primer plano | — | iconos 🪆 |
| 2 | `h21_canal` | plano general que se abre | — | texto «LA ISLA DE LAS MUÑECAS» |
| 3 | `h21_chinampa` | órbita con giro suave | campesino | — |
| 4 | `h21_agua` | primer plano de detalle | campesino | — |
| 5 | `h21_arboles` | la cámara pasa por detrás del personaje | campesino | iconos 🪆 🪆 🪆 |
| 6 | `h21_arboles` | travelling que pasa por detrás de un objeto en primer plano | — | iconos 🪆 🪆 🪆 🪆 🪆 |
| 7 | `h21_agua` | crash zoom | — | — |
| 8 | `h21_linterna` | giro de cámara | chico3 | texto «SUSURROS EN LA OSCURIDAD» |
| 9 | `h21_canal` | dolly out de cierre | — | iconos 🪆 |

Título de entrada: ¿SABÍAS QUE...? / LA ISLA DE LAS MUÑECAS. Cierre: ¿CREES EN / LOS FANTASMAS? 🪆.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `h21_canal`: dark night, dark canals of Xochimilco at night with a wooden boat, moonlight, mist, twisted trees
- `h21_arboles`: dark night, twisted dark trees covered with many old hanging dolls, moonlight, creepy
- `h21_chinampa`: small wooden hut on a lonely island in the canals of Mexico, overgrown plants, dusk
- `h21_agua`: murky dark canal water with floating leaves at night, moonlight reflection
- `h21_linterna`: dark night, forest path lit by a flashlight beam with old dolls hanging from branches

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Reportajes sobre la Isla de las Muñecas (Xochimilco)
- Prensa mexicana sobre la muerte de Julián Santana Barrera (2001)
