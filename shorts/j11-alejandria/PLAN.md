# La biblioteca perdida — plan de producción (42 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–5.1 s | «¿Sabías que la gran Biblioteca de Alejandría probablemente no desapareció en un solo incendio?» |
| 5.1–9.1 s | «La fundaron los reyes griegos de Egipto, hace más de dos mil años.» |
| 9.1–13.6 s | «Reunió cientos de miles de rollos y a muchos de los mayores sabios de su tiempo.» |
| 13.6–19.9 s | «En el año 48 antes de Cristo, durante una guerra de Julio César, hubo un incendio en el puerto.» |
| 19.9–24.2 s | «Se perdieron libros. Pero la biblioteca siguió existiendo.» |
| 24.2–29.6 s | «Lo que la mató fue más lento: falta de dinero, sabios expulsados y siglos de abandono.» |
| 29.6–34.2 s | «La famosa historia de un califa que la quemó es una leyenda escrita siglos después.» |
| 34.2–37.6 s | «No fue una catástrofe. Fue un olvido.» |
| 37.6–41.7 s | «Hoy, una biblioteca moderna en Alejandría recuerda a la antigua.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `j11_biblioteca` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `j11_puerto` | plano general que se abre | — | — |
| 3 | `j11_biblioteca` | órbita con giro suave | erudito; romano | — |
| 4 | `j11_incendio` | crash zoom | — | — |
| 5 | `j11_biblioteca` | la cámara pasa por detrás del personaje | erudito | — |
| 6 | `j11_ruinas` | giro de cámara | — | — |
| 7 | `j11_ruinas` | primer plano de detalle | — | texto «LEYENDA» |
| 8 | `j11_ruinas` | tracking lateral | — | — |
| 9 | `j11_moderna` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / LA BIBLIOTECA PERDIDA. Cierre: ALEJANDRÍA / ¿QUIÉN LA DESTRUYÓ?.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `j11_biblioteca`: grand ancient library of Alexandria with columns and shelves of papyrus scrolls, warm light
- `j11_puerto`: ancient harbor of Alexandria with a lighthouse and ships, sunny
- `j11_incendio`: ancient harbor burning at night with ships on fire
- `j11_ruinas`: ancient ruins in Egypt with broken columns and sand, sunset
- `j11_moderna`: modern library building in Alexandria with a big round roof by the sea

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Britannica: Library of Alexandria
- Roger Bagnall, «Alexandria: Library of Dreams» (2002)
