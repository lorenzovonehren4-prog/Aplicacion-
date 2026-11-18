# El rey del oro — plan de producción (31 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–3.9 s | «¿Sabías que un rey africano regaló tanto oro que hizo bajar su precio en Egipto?» |
| 3.9–6.9 s | «Se llamaba Mansa Musa, y gobernaba el Imperio de Mali.» |
| 6.9–9.9 s | «Su reino era uno de los mayores productores de oro del mundo.» |
| 9.9–13.4 s | «En 1324 viajó a La Meca, en peregrinación.» |
| 13.4–16.8 s | «Iba con una caravana enorme de personas, camellos… y oro.» |
| 16.8–19.8 s | «Al pasar por El Cairo, repartió y gastó tanto oro…» |
| 19.8–23.4 s | «…que su valor cayó en la ciudad durante años, según cronistas de la época.» |
| 23.4–27.2 s | «Muchos historiadores lo consideran una de las personas más ricas de la historia.» |
| 27.2–30.8 s | «Gracias a él, Mali y Tombuctú aparecieron en los mapas de Europa.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `i10_oro` | travelling que pasa por detrás de un objeto en primer plano | rey | — |
| 2 | `i10_mali` | órbita con giro suave | rey | — |
| 3 | `i10_oro` | primer plano de detalle | — | iconos 🪙 |
| 4 | `i10_caravana` | plano general que se abre | — | — |
| 5 | `i10_caravana` | tracking lateral | rey | iconos 🐪 |
| 6 | `i10_cairo` | la cámara pasa por detrás del personaje | rey | iconos 🪙 |
| 7 | `i10_cairo` | crash zoom | — | texto «EL ORO BAJÓ DE PRECIO» |
| 8 | `i10_oro` | giro de cámara | rey | — |
| 9 | `i10_mapa` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / EL REY DEL ORO. Cierre: MANSA MUSA / EL REY DEL ORO.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `i10_mali`: great mud mosque of Timbuktu in the Mali empire under a golden sunset, sandy streets
- `i10_caravana`: a huge caravan of camels and people crossing the Sahara desert, golden dunes
- `i10_cairo`: medieval Cairo market with domes, minarets and crowded stalls, warm light
- `i10_oro`: piles of gold dust and gold bars in a royal treasury, warm candle light
- `i10_mapa`: medieval catalan atlas style map with a golden king on a throne in Africa, parchment, no letters

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Al-Umari, crónica del siglo XIV sobre la visita a El Cairo
- Biblioteca Nacional de Francia: Atlas catalán (1375)
