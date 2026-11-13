# Sobrevivió a dos bombas atómicas — plan de producción (36 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–5.9 s | «Un hombre estuvo en Hiroshima durante la primera bomba atómica… y días después también estaba en Nagasaki.» |
| 5.9–8.1 s | «Se llamaba Tsutomu Yamaguchi.» |
| 8.1–13.9 s | «El 6 de agosto de 1945 estaba en Hiroshima por trabajo cuando ocurrió el bombardeo.» |
| 13.9–18.0 s | «Aunque resultó herido, consiguió regresar a su ciudad natal:» |
| 18.0–19.0 s | «Nagasaki.» |
| 19.0–22.2 s | «Pero el 9 de agosto, mientras se encontraba allí,» |
| 22.2–24.7 s | «ocurrió el segundo bombardeo atómico.» |
| 24.7–31.3 s | «Yamaguchi sobrevivió a los dos bombardeos y fue reconocido oficialmente por Japón como superviviente de ambos.» |
| 31.3–36.2 s | «Su historia es un testimonio de uno de los momentos más difíciles de la humanidad.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `f04_calle` | tracking lateral | yama | — |
| 2 | `f04_astillero` | órbita con giro suave | yama | — |
| 3 | `f04_cielo` | plano general que se abre | — | — |
| 4 | `f04_tren` | tracking lateral | — | — |
| 5 | `f04_casa` | dolly in lento | yama; yamaEsposa; yamaHijo | — |
| 6 | `f04_nagasaki` | pan vertical descendente | — | — |
| 7 | `f04_cielo` | crash zoom | — | — |
| 8 | `f04_memorial` | órbita con giro suave | — | línea de tiempo 6 AGO → 9 AGO |
| 9 | `f04_memorial` | dolly out de cierre | yamaViejo | — |

Título de entrada: HISTORIA REAL / SOBREVIVIÓ A DOS BOMBAS ATÓMICAS. Cierre: HIROSHIMA: 6 DE AGOSTO / NAGASAKI: 9 DE AGOSTO.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `f04_calle`: japanese city street in summer 1945, wooden houses, tram, river and bridge, warm morning light
- `f04_astillero`: 1940s japanese shipyard with cranes and a ship hull, summer morning
- `f04_cielo`: a blinding white sun-like glow on the horizon behind distant hills, pale washed out sky, empty landscape, muted grey and beige colors
- `f04_tren`: 1940s japanese steam train traveling through green countryside with mountains, grey sky
- `f04_casa`: traditional japanese house interior with tatami, sliding doors and a small garden outside
- `f04_nagasaki`: wide panoramic view of Nagasaki harbor and hills in 1945, grey muted colors, cloudy sky
- `f04_memorial`: peaceful japanese memorial park with a stone monument, paper cranes and trees, soft light

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- The New York Times: Tsutomu Yamaguchi, Survivor of 2 Atomic Blasts, Dies at 93 (2010)
- BBC News: Japan confirms first double A-bomb survivor (2009)
