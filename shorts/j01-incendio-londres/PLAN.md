# El gran incendio de londres — plan de producción (38 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–4.5 s | «¿Sabías que una panadería provocó el incendio que destruyó casi todo Londres?» |
| 4.5–8.7 s | «Fue el 2 de septiembre de 1666, en la madrugada.» |
| 8.7–12.4 s | «El fuego empezó en la panadería de Thomas Farriner, en Pudding Lane.» |
| 12.4–16.3 s | «Las casas eran de madera, y un viento fuerte empujó las llamas.» |
| 16.3–18.1 s | «Ardió durante cuatro días.» |
| 18.1–22.2 s | «La gente huyó en barcas por el río Támesis, cargando lo que podía.» |
| 22.2–27.9 s | «Quemó unas trece mil casas y 87 iglesias, incluida la antigua catedral de San Pablo.» |
| 27.9–33.2 s | «Oficialmente solo se registraron seis muertes, aunque probablemente fueron muchas más.» |
| 33.2–37.7 s | «Hoy, un monumento de 61 metros recuerda el lugar donde empezó.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `j01_fuego` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `j01_calle` | plano general que se abre | — | — |
| 3 | `j01_calle` | la cámara pasa por detrás del personaje | obrero | — |
| 4 | `j01_fuego` | crash zoom | — | — |
| 5 | `j01_fuego` | pan vertical ascendente | — | texto «4 DÍAS» |
| 6 | `j01_rio` | tracking lateral | parisino; parisina | — |
| 7 | `j01_ruinas` | primer plano de detalle | — | texto «13.000 CASAS» |
| 8 | `j01_ruinas` | giro de cámara | erudito | — |
| 9 | `j01_monumento` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / EL GRAN INCENDIO DE LONDRES. Cierre: LONDRES / 1666.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `j01_calle`: narrow medieval London street of wooden houses at night in 1666, bakery with glowing oven
- `j01_fuego`: huge fire burning medieval London at night, flames over wooden houses and the Thames
- `j01_rio`: people escaping on boats across the Thames with London burning behind, night
- `j01_ruinas`: smoking ruins of medieval London with a burnt cathedral, grey morning
- `j01_monumento`: tall stone column monument with a golden flame on top in London, blue sky

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Museum of London: The Great Fire of London
- Britannica: Great Fire of London
