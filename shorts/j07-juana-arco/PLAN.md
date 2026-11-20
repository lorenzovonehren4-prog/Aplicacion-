# La chica que guió un ejército — plan de producción (42 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–4.3 s | «¿Sabías que una campesina de 17 años llegó a dirigir un ejército?» |
| 4.3–9.0 s | «Se llamaba Juana de Arco, y vivía en Francia durante la guerra de los Cien Años.» |
| 9.0–12.2 s | «Decía que oía voces que le pedían salvar a su país.» |
| 12.2–15.9 s | «Convenció al heredero del trono de que la dejara ir con el ejército.» |
| 15.9–22.0 s | «En 1429 ayudó a romper el asedio de Orléans. Fue una victoria clave.» |
| 22.0–25.6 s | «Poco después, el heredero fue coronado rey en Reims.» |
| 25.6–33.8 s | «En 1430 la capturaron, y la condenaron. Murió en 1431, con solo 19 años.» |
| 33.8–38.1 s | «En 1456, un nuevo juicio la declaró inocente.» |
| 38.1–41.9 s | «Y en 1920, la Iglesia la declaró santa.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `j07_batalla` | travelling que pasa por detrás de un objeto en primer plano | juana | — |
| 2 | `j07_campo` | órbita con giro suave | juana | — |
| 3 | `j07_campo` | la cámara pasa por detrás del personaje | juana | — |
| 4 | `j07_corte` | tracking lateral | juana; capitan | — |
| 5 | `j07_orleans` | crash zoom | juana | — |
| 6 | `j07_catedral` | giro de cámara | — | — |
| 7 | `j07_catedral` | primer plano de detalle | — | texto «19 AÑOS» |
| 8 | `j07_corte` | plano general que se abre | juez | — |
| 9 | `j07_catedral` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / LA CHICA QUE GUIÓ UN EJÉRCITO. Cierre: JUANA DE ARCO / 1412–1431.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `j07_campo`: medieval French village with fields and a small church, 1420s
- `j07_corte`: medieval royal court hall with banners and a throne
- `j07_orleans`: medieval walled city of Orleans under siege with siege towers
- `j07_batalla`: medieval army with banners and horses outside city walls, dust
- `j07_catedral`: Gothic cathedral of Reims interior with stained glass light

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Britannica: Joan of Arc
- Régine Pernoud, «Juana de Arco» (actas de los procesos)
