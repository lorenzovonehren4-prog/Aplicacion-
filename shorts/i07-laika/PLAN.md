# La perra del espacio — plan de producción (36 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–4.6 s | «¿Sabías que el primer ser vivo en orbitar la Tierra fue una perra callejera de Moscú?» |
| 4.6–5.9 s | «Se llamaba Laika.» |
| 5.9–11.5 s | «Los científicos soviéticos eligieron perros de la calle, porque soportaban bien el frío y el hambre.» |
| 11.5–16.8 s | «El 3 de noviembre de 1957, despegó a bordo del Sputnik 2.» |
| 16.8–20.0 s | «Dio vueltas a la Tierra a cientos de kilómetros de altura.» |
| 20.0–22.5 s | «Pero la nave no estaba preparada para volver.» |
| 22.5–29.9 s | «Durante décadas se dijo que había vivido varios días. En 2002 se supo que murió a las pocas horas, por el calor.» |
| 29.9–33.7 s | «Su viaje demostró que un ser vivo podía soportar el lanzamiento.» |
| 33.7–35.9 s | «Hoy tiene un monumento en Moscú.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `i07_orbita` | travelling que pasa por detrás de un objeto en primer plano | — | iconos 🐕 |
| 2 | `i07_moscu` | plano general que se abre | — | iconos 🐕 |
| 3 | `i07_laboratorio` | órbita con giro suave | cientifico; cientifica | iconos 🐕 |
| 4 | `i07_cohete` | pan vertical ascendente | — | — |
| 5 | `i07_orbita` | giro de cámara | — | — |
| 6 | `i07_laboratorio` | crash zoom | cientifica | — |
| 7 | `i07_orbita` | primer plano de detalle | — | texto «2002» |
| 8 | `i07_laboratorio` | la cámara pasa por detrás del personaje | cientifico | — |
| 9 | `i07_monumento` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / LA PERRA DEL ESPACIO. Cierre: LAIKA / 1957.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `i07_moscu`: snowy streets of Moscow in the 1950s, old buildings, grey sky
- `i07_laboratorio`: 1950s soviet space laboratory with dials, metal capsule and scientists desks
- `i07_cohete`: a 1950s rocket launching at night from a launch pad in the steppe, fire and smoke
- `i07_orbita`: earth seen from orbit with a small metal satellite, stars
- `i07_monumento`: small monument with a rocket and a dog statue in a snowy park

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- NASA: Sputnik 2
- Dimitri Malashenkov, ponencia en el Congreso Mundial del Espacio (2002)
