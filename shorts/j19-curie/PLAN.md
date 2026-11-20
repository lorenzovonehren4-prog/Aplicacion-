# Los cuadernos radiactivos — plan de producción (43 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–5.1 s | «¿Sabías que los cuadernos de Marie Curie siguen siendo radiactivos más de cien años después?» |
| 5.1–9.1 s | «Marie Curie descubrió el polonio y el radio, junto a su esposo Pierre.» |
| 9.1–13.6 s | «Fue la primera persona en ganar dos premios Nobel… en dos ciencias distintas.» |
| 13.6–17.9 s | «Trabajaba con el radio sin protección, y lo llevaba incluso en los bolsillos.» |
| 17.9–23.7 s | «Murió en 1934 por una enfermedad causada, probablemente, por la radiación.» |
| 23.7–31.2 s | «Sus cuadernos quedaron contaminados de radio, que tarda unos 1.600 años en perder la mitad de su radiactividad.» |
| 31.2–35.8 s | «Hoy se guardan en cajas forradas de plomo, en la Biblioteca Nacional de Francia.» |
| 35.8–39.5 s | «Quien quiera consultarlos debe usar protección y firmar un documento.» |
| 39.5–43.0 s | «Su trabajo sigue… literalmente, brillando.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `j19_caja` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `j19_lab` | órbita con giro suave | cientifica; cientifico | — |
| 3 | `j19_ceremonia` | crash zoom | cientifica | texto «2 NOBEL» |
| 4 | `j19_lab` | la cámara pasa por detrás del personaje | cientifica | — |
| 5 | `j19_paris` | primer plano de detalle | — | — |
| 6 | `j19_caja` | giro de cámara | — | texto «1.600 AÑOS» |
| 7 | `j19_biblioteca` | plano general que se abre | — | — |
| 8 | `j19_biblioteca` | tracking lateral | estudiante | — |
| 9 | `j19_lab` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / LOS CUADERNOS RADIACTIVOS. Cierre: MARIE CURIE / DOS PREMIOS NOBEL.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `j19_lab`: early 1900s chemistry laboratory with glass beakers glowing faintly green, Paris
- `j19_biblioteca`: grand national library reading room in Paris with green lamps
- `j19_caja`: old notebooks inside a lead-lined box on a table, soft light
- `j19_ceremonia`: award ceremony hall with a stage, early 1900s
- `j19_paris`: Paris street in 1900 with old buildings, morning

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Bibliothèque nationale de France: archivos de Marie Curie
- Nobel Prize: Marie Curie (1903 y 1911)
