# La ciudad congelada — plan de producción (32 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–4.5 s | «¿Sabías que en Pompeya se pueden ver las formas exactas de personas de hace casi dos mil años?» |
| 4.5–7.9 s | «En el año 79, el volcán Vesubio entró en erupción.» |
| 7.9–10.3 s | «Pompeya quedó enterrada bajo metros de ceniza.» |
| 10.3–12.4 s | «Y la ciudad se olvidó durante siglos.» |
| 12.4–17.2 s | «En el siglo XIX, los arqueólogos notaron huecos extraños dentro de la ceniza endurecida.» |
| 17.2–19.5 s | «Eran los espacios que habían dejado los cuerpos.» |
| 19.5–24.5 s | «En 1863, Giuseppe Fiorelli tuvo una idea: rellenarlos con yeso.» |
| 24.5–28.0 s | «Así aparecieron las formas de personas y animales en su último momento.» |
| 28.0–32.2 s | «Hoy, Pompeya es como una fotografía en tres dimensiones del mundo romano.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `i12_ruinas` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `i12_erupcion` | crash zoom | — | — |
| 3 | `i12_ceniza` | pan vertical descendente | — | — |
| 4 | `i12_ceniza` | plano general que se abre | — | — |
| 5 | `i12_excavacion` | la cámara pasa por detrás del personaje | obrero | — |
| 6 | `i12_excavacion` | primer plano de detalle | erudito | — |
| 7 | `i12_excavacion` | órbita con giro suave | erudito | iconos 🪣 |
| 8 | `i12_ceniza` | giro de cámara | — | — |
| 9 | `i12_ciudad` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / LA CIUDAD CONGELADA. Cierre: POMPEYA / AÑO 79.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `i12_ciudad`: ancient Roman city of Pompeii with columns and streets, Mount Vesuvius in the background, sunny
- `i12_erupcion`: Mount Vesuvius erupting with a huge dark ash cloud over a Roman town
- `i12_ceniza`: ruins buried under grey ash, dim light, silence
- `i12_excavacion`: 19th century archaeological excavation of Roman ruins, workers with shovels
- `i12_ruinas`: Pompeii ruins today with tourists paths, columns and Vesuvius at sunset

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Parque Arqueológico de Pompeya
- Britannica: Giuseppe Fiorelli
