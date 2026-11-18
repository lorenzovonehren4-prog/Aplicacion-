# El gran hedor — plan de producción (32 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–3.9 s | «¿Sabías que Londres olió tan mal un verano que obligó a construir sus alcantarillas?» |
| 3.9–6.4 s | «Fue en el verano de 1858.» |
| 6.4–9.7 s | «Las aguas sucias de toda la ciudad iban directo al río Támesis.» |
| 9.7–14.5 s | «Con el calor, el olor se volvió insoportable. Lo llamaron «el Gran Hedor».» |
| 14.5–19.2 s | «En el Parlamento, junto al río, colgaron cortinas empapadas en productos químicos.» |
| 19.2–22.1 s | «Los políticos no aguantaron más y aprobaron una gran obra.» |
| 22.1–25.9 s | «El ingeniero Joseph Bazalgette construyó cientos de kilómetros de alcantarillas.» |
| 25.9–29.0 s | «Además, ayudaron a acabar con las epidemias de cólera.» |
| 29.0–31.9 s | «Muchas de esas alcantarillas siguen funcionando hoy.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `i16_calle` | travelling que pasa por detrás de un objeto en primer plano | parisino | — |
| 2 | `i16_rio` | plano general que se abre | — | — |
| 3 | `i16_rio` | pan vertical descendente | — | — |
| 4 | `i16_calle` | crash zoom | parisino; parisina | iconos 🤢 |
| 5 | `i16_parlamento` | órbita con giro suave | presidente | — |
| 6 | `i16_parlamento` | primer plano de detalle | presidente | — |
| 7 | `i16_tunel` | la cámara pasa por detrás del personaje | ingeniero | — |
| 8 | `i16_tunel` | giro de cámara | ingeniero | — |
| 9 | `i16_hoy` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / EL GRAN HEDOR. Cierre: EL GRAN HEDOR / LONDRES · 1858.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `i16_rio`: dirty brown Thames river in London in 1858 on a hot day, Parliament building, boats
- `i16_calle`: crowded victorian London street on a hot summer day, people covering their noses
- `i16_parlamento`: victorian parliament hall with curtains and benches, warm light
- `i16_tunel`: huge brick sewer tunnel under London with arches and lamps, workers
- `i16_hoy`: modern London Thames embankment at sunset

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Stephen Halliday, «The Great Stink of London» (1999)
- Museum of London: The Great Stink
