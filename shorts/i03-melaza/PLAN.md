# La ola de melaza — plan de producción (38 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–3.8 s | «¿Sabías que una ola gigante de melaza arrasó un barrio de Boston?» |
| 3.8–6.9 s | «Fue el 15 de enero de 1919.» |
| 6.9–11.6 s | «En el puerto había un tanque enorme, con más de ocho millones de litros de melaza.» |
| 11.6–13.9 s | «A mediodía, el tanque reventó.» |
| 13.9–18.4 s | «Una ola marrón de varios metros de alto salió a unos cincuenta kilómetros por hora.» |
| 18.4–23.7 s | «Arrastró casas, vagones y personas. Murieron 21 personas.» |
| 23.7–27.8 s | «La melaza era tan espesa que los rescatistas apenas podían moverse.» |
| 27.8–32.5 s | «Un juicio concluyó que el tanque estaba mal construido y nunca se había probado bien.» |
| 32.5–37.5 s | «Según los vecinos, en días de calor el barrio olió a melaza durante décadas.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `i03_ola` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `i03_puerto` | plano general que se abre | — | — |
| 3 | `i03_puerto` | pan vertical ascendente | obrero | — |
| 4 | `i03_puerto` | crash zoom | — | iconos 💥 |
| 5 | `i03_ola` | tracking lateral | parisino | — |
| 6 | `i03_calle` | primer plano de detalle | — | texto «21 MUERTOS» |
| 7 | `i03_calle` | la cámara pasa por detrás del personaje | marinero; obrero | — |
| 8 | `i03_tribunal` | giro de cámara | juez | — |
| 9 | `i03_barrio` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / LA OLA DE MELAZA. Cierre: BOSTON / 15 DE ENERO DE 1919.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `i03_puerto`: Boston harbor in 1919 with a huge round steel tank, brick buildings, elevated railway, winter
- `i03_ola`: a giant wave of thick brown syrup flooding a city street, 1919, winter
- `i03_calle`: destroyed city street covered in sticky brown liquid, broken wooden houses
- `i03_tribunal`: 1920s courtroom with wooden benches and a judge desk
- `i03_barrio`: old brick neighborhood in Boston on a hot summer day

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Stephen Puleo, «Dark Tide: The Great Boston Molasses Flood of 1919» (2003)
- Boston Public Library
