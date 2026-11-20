# Lucy — plan de producción (34 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–4.7 s | «¿Sabías que uno de los esqueletos más famosos de la historia lleva el nombre de una canción de los Beatles?» |
| 4.7–10.1 s | «En 1974, en Etiopía, el paleontólogo Donald Johanson buscaba fósiles.» |
| 10.1–14.8 s | «Vio un hueso de brazo asomando en la tierra. Luego otro, y otro más.» |
| 14.8–17.8 s | «Encontraron cerca del 40 % de un esqueleto.» |
| 17.8–21.6 s | «Tenía unos 3,2 millones de años, y caminaba sobre dos piernas.» |
| 21.6–25.9 s | «Esa noche, en el campamento, sonaba «Lucy in the Sky with Diamonds».» |
| 25.9–27.3 s | «Así que la llamaron Lucy.» |
| 27.3–31.2 s | «En Etiopía también la llaman Dinkinesh, que significa «eres maravillosa».» |
| 31.2–33.8 s | «Cambió lo que sabemos sobre nuestros antepasados.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `j04_museo` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `j04_desierto` | plano general que se abre | explorador | — |
| 3 | `j04_excavacion` | primer plano de detalle | explorador | — |
| 4 | `j04_excavacion` | la cámara pasa por detrás del personaje | — | texto «40 %» |
| 5 | `j04_sabana` | giro de cámara | — | — |
| 6 | `j04_campamento` | órbita con giro suave | explorador; cientifica | iconos 🎵 |
| 7 | `j04_campamento` | crash zoom | — | texto «LUCY» |
| 8 | `j04_desierto` | tracking lateral | — | — |
| 9 | `j04_museo` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / LUCY. Cierre: LUCY / 3,2 MILLONES DE AÑOS.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `j04_desierto`: dry desert badlands of Ethiopia with eroded hills under a hot sun
- `j04_excavacion`: paleontologists digging site with brushes and small flags in dry earth
- `j04_campamento`: 1970s research camp at night in the desert with tents and a fire
- `j04_sabana`: ancient African savanna 3 million years ago with acacia trees
- `j04_museo`: museum display of an ancient hominid skeleton in a glass case, soft light

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Institute of Human Origins, Arizona State University: Lucy
- Smithsonian: Australopithecus afarensis
