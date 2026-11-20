# Un descuido que salvó millones — plan de producción (36 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–3.6 s | «¿Sabías que un descuido en un laboratorio salvó millones de vidas?» |
| 3.6–9.8 s | «Fue en 1928, en Londres. Alexander Fleming volvió de vacaciones.» |
| 9.8–12.6 s | «Había dejado placas con bacterias sin limpiar.» |
| 12.6–17.7 s | «En una había crecido moho. Y alrededor, las bacterias habían muerto.» |
| 17.7–19.5 s | «Fleming lo llamó penicilina.» |
| 19.5–24.1 s | «Años después, otros científicos lograron fabricarla en grandes cantidades.» |
| 24.1–28.4 s | «Durante la Segunda Guerra Mundial salvó a miles de soldados de infecciones.» |
| 28.4–33.4 s | «En 1945, Fleming y dos colegas recibieron el Premio Nobel.» |
| 33.4–35.9 s | «Fue el primer antibiótico de la historia.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `j05_placa` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `j05_lab` | plano general que se abre | cientifico | — |
| 3 | `j05_lab` | la cámara pasa por detrás del personaje | cientifico | — |
| 4 | `j05_placa` | crash zoom | — | — |
| 5 | `j05_lab` | órbita con giro suave | cientifico | texto «PENICILINA» |
| 6 | `j05_fabrica` | tracking lateral | cientifica | — |
| 7 | `j05_hospital` | giro de cámara | enfermera; soldado1918 | — |
| 8 | `j05_ceremonia` | primer plano de detalle | cientifico | iconos 🏅 |
| 9 | `j05_placa` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / UN DESCUIDO QUE SALVÓ MILLONES. Cierre: PENICILINA / 1928.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `j05_lab`: cluttered 1920s laboratory with glass petri dishes, microscope and a window, London
- `j05_placa`: close view of a petri dish with blue green mold and clear area around it
- `j05_fabrica`: 1940s pharmaceutical factory with big steel tanks and workers
- `j05_hospital`: 1940s military hospital ward with beds and nurses
- `j05_ceremonia`: grand concert hall with a stage for an award ceremony, 1945

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Nobel Prize: Fisiología o Medicina 1945
- American Chemical Society: Discovery of penicillin
