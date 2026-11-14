# El triángulo de bennington — plan de producción (35 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–5.1 s | «¿Sabías que en un bosque de Estados Unidos desaparecieron cinco personas en pocos años, sin dejar rastro?» |
| 5.1–10.4 s | «Ocurrió entre 1945 y 1950, cerca de Bennington, en Vermont.» |
| 10.4–13.7 s | «A la zona la bautizaron después como el «triángulo de Bennington».» |
| 13.7–17.6 s | «El caso más famoso es el de Paula Welden, una estudiante de 18 años.» |
| 17.6–23.6 s | «En diciembre de 1946 salió a caminar por un sendero. Varias personas la vieron allí.» |
| 23.6–24.7 s | «Nunca volvió.» |
| 24.7–28.8 s | «Cientos de voluntarios la buscaron. No apareció ni una prenda.» |
| 28.8–33.2 s | «Los otros casos tampoco se resolvieron, y nunca se demostró una relación entre ellos.» |
| 33.2–34.8 s | «¿Qué pasó en esos bosques?» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `h37_bosque` | la cámara pasa por detrás del personaje | explorador | — |
| 2 | `h37_montana` | plano general que se abre | — | — |
| 3 | `h37_montana` | órbita con giro suave | — | texto «TRIÁNGULO DE BENNINGTON» |
| 4 | `h37_sendero` | tracking lateral | estudiante | — |
| 5 | `h37_sendero` | travelling que pasa por detrás de un objeto en primer plano | estudiante | — |
| 6 | `h37_sendero` | crash zoom | — | texto «NUNCA VOLVIÓ» |
| 7 | `h37_busqueda` | giro de cámara | policia; campesino | — |
| 8 | `h37_bosque` | dolly in lento | — | — |
| 9 | `h37_copas` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / EL TRIÁNGULO DE BENNINGTON. Cierre: ¿DÓNDE / ESTÁN? 🌲.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `h37_bosque`: dark forest of Vermont in autumn with thick fog and a wooden trail sign
- `h37_montana`: misty green mountains of Vermont from above, forests
- `h37_sendero`: narrow hiking trail through dense woods with fog, afternoon
- `h37_busqueda`: dark forest at night in the rain with flashlight beams among bushes
- `h37_copas`: treetops of a dense forest from above at dusk, fog

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Joseph A. Citro, escritos sobre el triángulo de Bennington
- Prensa de Vermont (1946–1950) sobre la desaparición de Paula Welden
