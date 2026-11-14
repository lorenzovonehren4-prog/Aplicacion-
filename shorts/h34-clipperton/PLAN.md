# La isla olvidada — plan de producción (43 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–6.3 s | «¿Sabías que unos soldados mexicanos y sus familias quedaron olvidados en una isla perdida en mitad del Pacífico?» |
| 6.3–10.5 s | «Era la isla Clipperton, un atolón casi sin árboles ni agua dulce.» |
| 10.5–15.9 s | «En 1914, México tenía allí una pequeña guarnición con sus familias.» |
| 15.9–20.1 s | «Pero estalló la Revolución, y los barcos de suministros dejaron de llegar.» |
| 20.1–23.6 s | «El escorbuto y el hambre mataron a casi todos los hombres.» |
| 23.6–29.4 s | «El farero, Victoriano Álvarez, quedó como único hombre adulto y se proclamó rey de la isla.» |
| 29.4–34.1 s | «Durante meses sometió a las mujeres que quedaban, hasta que ellas acabaron con él.» |
| 34.1–39.9 s | «En 1917, un barco de la Marina de Estados Unidos las rescató junto a sus hijos.» |
| 39.9–43.4 s | «Una de las historias más duras y olvidadas del Pacífico.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `h34_atolon` | pan vertical descendente | — | — |
| 2 | `h34_atolon` | plano general que se abre | — | texto «ISLA CLIPPERTON» |
| 3 | `h34_campamento` | órbita con giro suave | aliado; campesina; chico2 | — |
| 4 | `h34_barco` | travelling que pasa por detrás de un objeto en primer plano | — | 1 barco(s) |
| 5 | `h34_campamento` | crash zoom | campesina | — |
| 6 | `h34_faro` | giro de cámara | marino | texto ««REY» DE LA ISLA» |
| 7 | `h34_faro` | la cámara pasa por detrás del personaje | campesina; campesina | — |
| 8 | `h34_barco` | dolly in lento | — | 1 barco(s) |
| 9 | `h34_oceano` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / LA ISLA OLVIDADA. Cierre: UN DRAMA / EN EL OCÉANO 🏝️.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `h34_atolon`: small barren coral atoll in the middle of the Pacific ocean with a lagoon and a lone lighthouse, harsh sun
- `h34_faro`: old rusty lighthouse on a rocky shore with crashing waves, harsh light
- `h34_barco`: early 20th century grey military ship anchored near a tropical atoll
- `h34_campamento`: poor wooden huts on a bare tropical atoll with a few palm trees, dusk
- `h34_oceano`: vast empty ocean with a tiny island on the horizon at sunset

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Jimmy M. Skaggs, Clipperton: A History of the Island the World Forgot (1989)
- Britannica: Clipperton Island
