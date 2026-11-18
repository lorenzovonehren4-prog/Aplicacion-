# La barra en la cabeza — plan de producción (35 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–3.7 s | «¿Sabías que un hombre sobrevivió a una barra de hierro que le atravesó la cabeza?» |
| 3.7–10.3 s | «Fue en 1848, en Vermont, Estados Unidos. Phineas Gage dirigía obras del ferrocarril.» |
| 10.3–13.9 s | «Usaba una barra de más de un metro para apretar la pólvora dentro de la roca.» |
| 13.9–17.2 s | «Una chispa provocó la explosión, y la barra salió disparada.» |
| 17.2–20.8 s | «Le entró por la mejilla izquierda y le salió por la parte de arriba de la cabeza.» |
| 20.8–24.0 s | «Minutos después, Gage estaba consciente… y hablando.» |
| 24.0–28.2 s | «Sobrevivió. Pero su médico contó que su carácter había cambiado.» |
| 28.2–31.7 s | «Su caso ayudó a entender que partes del cerebro influyen en la personalidad.» |
| 31.7–35.3 s | «La barra y su cráneo todavía se conservan en un museo de Harvard.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `i02_vias` | la cámara pasa por detrás del personaje | obrero | — |
| 2 | `i02_vias` | plano general que se abre | obrero | — |
| 3 | `i02_roca` | primer plano de detalle | obrero | iconos 🧨 |
| 4 | `i02_roca` | crash zoom | — | iconos 💥 |
| 5 | `i02_cerebro` | pan vertical ascendente | — | texto «¡ATRAVESÓ SU CRÁNEO!» |
| 6 | `i02_consulta` | órbita con giro suave | obrero; erudito | — |
| 7 | `i02_consulta` | travelling que pasa por detrás de un objeto en primer plano | erudito | — |
| 8 | `i02_cerebro` | giro de cámara | cientifico | — |
| 9 | `i02_museo` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / LA BARRA EN LA CABEZA. Cierre: SU CRÁNEO / SIGUE EN HARVARD.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `i02_vias`: 1840s railroad construction site in the green hills of Vermont, rocks, tools, wooden carts
- `i02_roca`: big rock blasting site with drill holes and a powder keg, 1840s
- `i02_consulta`: 1840s country doctor office with wooden shelves and medicine bottles, lamp
- `i02_cerebro`: old anatomy illustration of a human brain on parchment, scientific drawing, no letters
- `i02_museo`: quiet medical museum hall with glass cabinets and soft light

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Warren Anatomical Museum, Universidad de Harvard
- Malcolm Macmillan, «An Odd Kind of Fame» (2000)
