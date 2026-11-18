# La explosión sin cráter — plan de producción (33 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–5.1 s | «¿Sabías que en 1908 una explosión derribó millones de árboles en Siberia… y no dejó cráter?» |
| 5.1–8.8 s | «Fue el 30 de junio de 1908, cerca del río Tunguska.» |
| 8.8–11.4 s | «Testigos vieron una bola de fuego cruzar el cielo.» |
| 11.4–14.8 s | «Luego, una explosión tumbó a personas a decenas de kilómetros.» |
| 14.8–18.5 s | «Unos ochenta millones de árboles quedaron derribados en un círculo gigante.» |
| 18.5–22.0 s | «La primera expedición científica llegó en 1927.» |
| 22.0–25.7 s | «Esperaban encontrar un meteorito. Pero no había cráter.» |
| 25.7–30.1 s | «Hoy se cree que un asteroide o un cometa explotó en el aire, antes de tocar el suelo.» |
| 30.1–33.3 s | «Si hubiera caído sobre una ciudad, la habría destruido.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `i14_derribado` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `i14_taiga` | plano general que se abre | — | — |
| 3 | `i14_fuego` | la cámara pasa por detrás del personaje | campesino | — |
| 4 | `i14_fuego` | crash zoom | — | — |
| 5 | `i14_derribado` | pan vertical ascendente | — | texto «80 MILLONES DE ÁRBOLES» |
| 6 | `i14_expedicion` | órbita con giro suave | explorador | — |
| 7 | `i14_derribado` | primer plano de detalle | explorador | — |
| 8 | `i14_fuego` | giro de cámara | — | — |
| 9 | `i14_ciudad` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / LA EXPLOSIÓN SIN CRÁTER. Cierre: TUNGUSKA / 1908.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `i14_taiga`: endless Siberian taiga forest with a river under a clear sky
- `i14_fuego`: a bright fireball streaking across the sky over a Siberian forest
- `i14_derribado`: thousands of fallen trees lying in a radial pattern in Siberia, burnt forest
- `i14_expedicion`: 1920s explorers camp in the Siberian forest, tents, horses
- `i14_ciudad`: a big city skyline at dusk seen from far away

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- NASA: The Tunguska Impact – 100 Years Later (2008)
- Britannica: Tunguska event
