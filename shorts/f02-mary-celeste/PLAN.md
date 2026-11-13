# El barco sin nadie a bordo — plan de producción (39 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–6.0 s | «En 1872 encontraron un barco en medio del océano… pero no había nadie a bordo.» |
| 6.0–7.6 s | «Era el Mary Celeste.» |
| 7.6–12.6 s | «Otro barco lo encontró cerca de las islas Azores, navegando sin rumbo aparente.» |
| 12.6–15.2 s | «El barco seguía en condiciones de navegar.» |
| 15.2–18.5 s | «Su carga permanecía a bordo y había provisiones.» |
| 18.5–21.3 s | «Pero sus diez ocupantes habían desaparecido.» |
| 21.3–25.8 s | «La última anotación del diario indicaba que estaban cerca de las Azores.» |
| 25.8–29.7 s | «¿Por qué abandonarían un barco que todavía podía navegar?» |
| 29.7–35.2 s | «Se propusieron muchas explicaciones, pero nunca se confirmó qué ocurrió con la tripulación.» |
| 35.2–39.1 s | «El Mary Celeste sigue siendo uno de los grandes misterios del mar.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `f02_niebla` | dolly in lento | — | dibujo: velero |
| 2 | `f02_mar` | crash zoom | — | texto «MARY CELESTE»; dibujo: velero |
| 3 | `f02_mar` | tracking lateral | marino; marinero | dibujo: velero |
| 4 | `f02_cubierta` | órbita con giro suave | marino | — |
| 5 | `f02_bodega` | primer plano de detalle | — | iconos 🛢️ 🍞 |
| 6 | `f02_camarote` | plano general que se abre | — | — |
| 7 | `f02_mapa` | dolly in lento | — | iconos 📖 📍 |
| 8 | `f02_cubierta` | whip pan | marinero | iconos 🛶 ❌ |
| 9 | `f02_niebla` | pan vertical ascendente | — | iconos ❓ ❓ ❓; dibujo: velero |
| 10 | `f02_niebla` | dolly out de cierre | — | dibujo: velero |

Título de entrada: MISTERIO REAL / EL BARCO SIN NADIE A BORDO. Cierre: ¿TÚ QUÉ CREES / QUE PASÓ?.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `f02_niebla`: dark foggy ocean at dawn, thick mist, grey blue waves, moody light
- `f02_mar`: open Atlantic ocean on a cloudy day, big waves, distant horizon, 19th century mood
- `f02_cubierta`: empty wooden deck of a 19th century sailing ship, ropes, masts, wet planks, fog
- `f02_camarote`: abandoned captain cabin inside a 19th century sailing ship, table with plates, lantern, charts, bunk
- `f02_bodega`: cargo hold of an old sailing ship full of wooden barrels, dim light from above
- `f02_mapa`: antique nautical chart of the Atlantic ocean with compass rose and small islands, sepia paper, no letters

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Smithsonian Magazine: Abandoned Ship: The Mary Celeste (2007)
- Britannica: Mary Celeste
