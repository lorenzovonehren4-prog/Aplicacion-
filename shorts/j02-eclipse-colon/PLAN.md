# El truco del eclipse — plan de producción (30 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–3.2 s | «¿Sabías que Cristóbal Colón usó un eclipse para conseguir comida?» |
| 3.2–8.3 s | «Fue en 1504. Sus barcos quedaron varados en Jamaica durante meses.» |
| 8.3–11.6 s | «Al principio, los habitantes de la isla les daban alimentos.» |
| 11.6–13.5 s | «Pero con el tiempo dejaron de hacerlo.» |
| 13.5–17.5 s | «Colón tenía un almanaque que anunciaba un eclipse de luna para el 29 de febrero.» |
| 17.5–21.8 s | «Reunió a los jefes y les dijo que su Dios estaba enojado y haría desaparecer la Luna.» |
| 21.8–24.7 s | «Esa noche, la Luna se oscureció y se volvió roja.» |
| 24.7–27.2 s | «Asustados, volvieron a llevarles comida.» |
| 27.2–30.5 s | «Lo cuenta Hernando Colón, su hijo, que estaba allí.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `j02_noche` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `j02_playa` | plano general que se abre | — | — |
| 3 | `j02_aldea` | órbita con giro suave | indigena; capitan | — |
| 4 | `j02_aldea` | primer plano de detalle | indigena | — |
| 5 | `j02_camarote` | la cámara pasa por detrás del personaje | capitan | iconos 📖 |
| 6 | `j02_aldea` | giro de cámara | capitan; indigena2 | — |
| 7 | `j02_noche` | crash zoom | — | iconos 🌕 |
| 8 | `j02_aldea` | tracking lateral | indigena; indigena2 | — |
| 9 | `j02_amanecer` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / EL TRUCO DEL ECLIPSE. Cierre: EL ECLIPSE / DE COLÓN · 1504.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `j02_playa`: tropical Caribbean beach in 1504 with two damaged old sailing ships stranded on the shore
- `j02_aldea`: Taino village with round huts and palm trees in Jamaica, warm light
- `j02_camarote`: captain cabin of an old ship with an astronomy almanac book, candles and maps
- `j02_noche`: tropical night sky with a red blood moon during a lunar eclipse over the sea
- `j02_amanecer`: Caribbean beach at dawn with calm sea

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Hernando Colón, «Historia del Almirante»
- NASA: eclipse lunar del 29 de febrero de 1504
