# Huellas en la nada — plan de producción (42 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–6.6 s | «¿Sabías que se cuenta la historia de un hombre cuyas huellas en la nieve terminaban de golpe… en medio de un campo vacío?» |
| 6.6–12.0 s | «La versión más famosa sitúa el caso en una granja de Estados Unidos, en el siglo XIX.» |
| 12.0–16.3 s | «Un joven salió a buscar agua al pozo mientras su familia lo veía desde la casa.» |
| 16.3–19.3 s | «Como no volvía, siguieron sus huellas en la nieve.» |
| 19.3–23.5 s | «Y terminaban en mitad del campo. Sin nada alrededor.» |
| 23.5–26.3 s | «Los vecinos y los perros buscaron durante días.» |
| 26.3–33.8 s | «Pero cuando los investigadores buscaron registros, no encontraron nada: ni la granja, ni la familia, ni el desaparecido.» |
| 33.8–38.4 s | «La historia se había copiado de revista en revista, cambiando nombres y fechas.» |
| 38.4–41.7 s | «¿Un caso real… o una leyenda que nunca ocurrió?» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `h28_huellas` | pan vertical descendente | — | iconos 👣 |
| 2 | `h28_campo` | plano general que se abre | — | — |
| 3 | `h28_casa` | la cámara pasa por detrás del personaje | granjero | — |
| 4 | `h28_huellas` | tracking lateral | campesina; campesino | — |
| 5 | `h28_huellas` | crash zoom | — | texto «HUELLAS EN LA NADA» |
| 6 | `h28_busqueda` | travelling que pasa por detrás de un objeto en primer plano | campesino | iconos 🐕 |
| 7 | `h28_campo` | giro de cámara | cientifico | texto «SIN REGISTROS» |
| 8 | `h28_casa` | primer plano de detalle | — | iconos 📰 |
| 9 | `h28_cielo` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / HUELLAS EN LA NADA. Cierre: ¿CASO REAL / O LEYENDA? ❄️.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `h28_campo`: endless snowy field in winter with a farmhouse far away, grey sky, light snowfall
- `h28_casa`: 19th century farmhouse kitchen window looking out to a snowy field
- `h28_huellas`: footprints in fresh snow that stop in the middle of an empty white field
- `h28_busqueda`: snowy field at dusk with lanterns far away
- `h28_cielo`: aerial view of an empty white snowy field from the sky

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Joe Nickell, análisis de los casos de Oliver Lerch y David Lang (Skeptical Inquirer)
