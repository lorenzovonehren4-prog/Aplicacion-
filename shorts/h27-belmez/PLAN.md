# Las caras de bélmez — plan de producción (33 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–4.1 s | «¿Sabías que en una casa de España empezaron a aparecer caras en el suelo de la cocina?» |
| 4.1–8.0 s | «Ocurrió en Bélmez de la Moraleda, en Jaén, en 1971.» |
| 8.0–11.8 s | «María Gómez vio cómo una mancha del cemento tomaba la forma de un rostro.» |
| 11.8–14.3 s | «La familia rompió el suelo y puso cemento nuevo.» |
| 14.3–19.2 s | «Pero según contaron, la cara volvió a aparecer. Y luego, muchas más.» |
| 19.2–22.6 s | «Al excavar bajo la cocina se encontraron huesos humanos antiguos.» |
| 22.6–25.8 s | «La casa se llenó de curiosos, periodistas e investigadores.» |
| 25.8–30.0 s | «Algunos estudios sostuvieron que las caras estaban pintadas; otros defendieron que no.» |
| 30.0–33.3 s | «El debate nunca se cerró. ¿Qué crees tú?» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `h27_suelo` | travelling que pasa por detrás de un objeto en primer plano | — | iconos 👁️ |
| 2 | `h27_pueblo` | plano general que se abre | — | — |
| 3 | `h27_cocina` | órbita con giro suave | campesina | — |
| 4 | `h27_obra` | la cámara pasa por detrás del personaje | campesino; campesina | — |
| 5 | `h27_suelo` | crash zoom | — | texto «VOLVIERON A APARECER» |
| 6 | `h27_excavacion` | tracking lateral | cientifico | iconos 🦴 |
| 7 | `h27_pueblo` | giro de cámara | periodista; cientifico | — |
| 8 | `h27_cocina` | primer plano de detalle | cientifico | texto «¿FRAUDE O MISTERIO?» |
| 9 | `h27_suelo` | dolly out de cierre | — | iconos 👁️ |

Título de entrada: ¿SABÍAS QUE...? / LAS CARAS DE BÉLMEZ. Cierre: ¿QUÉ / CREES TÚ? 👁️.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `h27_cocina`: old humble spanish village kitchen with a stone fireplace and a cement floor, dim light
- `h27_suelo`: close view of an old grey cement floor with a dark stain shaped like a human face
- `h27_pueblo`: small white andalusian village in the hills, sunny
- `h27_obra`: old kitchen with a broken floor, rubble, bricks and a shovel
- `h27_excavacion`: excavation pit under a house with old bones in the soil, lamp light

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- El País: hemeroteca sobre las caras de Bélmez (1971–2004)
- Análisis críticos del caso (Luis Alfonso Gámez y otros)
