# El señor de sipán — plan de producción (30 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–3.9 s | «¿Sabías que en Perú se encontró una de las tumbas más ricas de América… intacta?» |
| 3.9–7.8 s | «Fue en 1987, en Lambayeque, en el norte del Perú.» |
| 7.8–11.3 s | «Todo empezó cuando unos saqueadores de tumbas encontraron piezas de oro.» |
| 11.3–13.7 s | «La policía avisó al arqueólogo Walter Alva.» |
| 13.7–19.0 s | «Al excavar, encontró la tumba de un gobernante moche, sin tocar desde hacía unos 1.700 años.» |
| 19.0–20.6 s | «Lo llamaron el Señor de Sipán.» |
| 20.6–24.3 s | «Estaba rodeado de oro, plata, cerámicas y acompañantes.» |
| 24.3–26.5 s | «Se la comparó con el hallazgo de Tutankamón.» |
| 26.5–30.1 s | «Hoy, el tesoro se puede ver en el Museo Tumbas Reales de Sipán.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `j14_tumba` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `j14_huaca` | plano general que se abre | — | — |
| 3 | `j14_noche` | la cámara pasa por detrás del personaje | — | — |
| 4 | `j14_huaca` | órbita con giro suave | arqueologo | — |
| 5 | `j14_tumba` | crash zoom | arqueologo | — |
| 6 | `j14_tumba` | primer plano de detalle | — | texto «SEÑOR DE SIPÁN» |
| 7 | `j14_oro` | giro de cámara | — | — |
| 8 | `j14_tumba` | tracking lateral | — | — |
| 9 | `j14_museo` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / EL SEÑOR DE SIPÁN. Cierre: EL SEÑOR / DE SIPÁN.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `j14_huaca`: eroded adobe pyramid mound in the northern Peruvian desert, Lambayeque
- `j14_noche`: desert at night with flashlights and diggers shadows near an adobe mound
- `j14_tumba`: ancient tomb chamber with gold ornaments, ceramics and textiles, warm light
- `j14_oro`: close view of ancient Moche gold ear ornaments and necklaces
- `j14_museo`: modern museum shaped like a pyramid in northern Peru, sunny

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Museo Tumbas Reales de Sipán
- Walter Alva y Christopher Donnan, «Royal Tombs of Sipán» (1993)
