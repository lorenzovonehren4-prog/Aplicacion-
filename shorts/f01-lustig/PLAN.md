# Vendió la torre eiffel — plan de producción (34 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–4.1 s | «¿Sabías que un hombre consiguió vender la Torre Eiffel… sin ser su dueño?» |
| 4.1–10.0 s | «En 1925, Victor Lustig se hizo pasar por un funcionario del gobierno francés.» |
| 10.0–13.0 s | «Y organizó una reunión secreta con empresarios.» |
| 13.0–17.3 s | «Les contó que la Torre Eiffel sería desmontada y vendida como metal.» |
| 17.3–19.8 s | «Incluso organizó una falsa subasta.» |
| 19.8–22.5 s | «Uno de los empresarios creyó la historia y pagó.» |
| 22.5–27.3 s | «Cuando descubrió el engaño, sintió tanta vergüenza que no quiso denunciarlo.» |
| 27.3–31.7 s | «Y lo más increíble: Lustig intentó vender la torre una segunda vez.» |
| 31.7–34.3 s | «Pero esta vez su plan no salió bien.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `f01_aerea` | crash zoom | lustig | iconos 💼 |
| 2 | `f01_cafe` | órbita con giro suave | lustig | iconos 📰 |
| 3 | `f01_despacho` | primer plano de detalle | lustig | iconos 📄 ✉️ |
| 4 | `f01_salon` | tracking lateral | lustig; empresario; empresario2 | — |
| 5 | `f01_salon` | whip pan | empresario2; empresario | texto «FALSA SUBASTA» |
| 6 | `f01_salon` | dolly in lento | empresario; lustig | iconos 💼 💰 |
| 7 | `f01_calle` | plano general que se abre | empresario | — |
| 8 | `f01_torre` | pan vertical ascendente | lustig | texto «¿OTRA VEZ?» |
| 9 | `f01_calle` | dolly out de cierre | lustig | iconos 🚨 |

Título de entrada: ¿SABÍAS QUE...? / VENDIÓ LA TORRE EIFFEL. Cierre: LO INTENTÓ DE NUEVO / VICTOR LUSTIG · PARÍS, 1925.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `f01_aerea`: the Eiffel Tower standing tall above the rooftops of Paris seen from a high balcony, river Seine, golden hour sky, single tower
- `f01_cafe`: 1920s Paris street cafe terrace with newspapers on a table, the Eiffel Tower far in the background
- `f01_despacho`: 1920s elegant office desk with stamped documents, envelopes, ink and a desk lamp, dark wood
- `f01_salon`: luxurious 1920s Paris hotel meeting room with a long table, chandeliers, velvet curtains
- `f01_calle`: Paris street at night in the 1920s, wet cobblestones, street lamps, hotel entrance
- `f01_torre`: the Eiffel Tower seen from below at dusk, dramatic purple and orange sky

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Smithsonian Magazine: The Smoothest Con Man That Ever Lived (2012)
- Britannica: Victor Lustig
