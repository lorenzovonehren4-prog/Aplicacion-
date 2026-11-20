# La locura de los tulipanes — plan de producción (37 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–5.2 s | «¿Sabías que en el siglo XVII un solo bulbo de tulipán llegó a costar más que una casa?» |
| 5.2–10.1 s | «Pasó en Holanda, entre 1636 y 1637.» |
| 10.1–12.4 s | «Los tulipanes eran una moda de lujo.» |
| 12.4–16.4 s | «Los más raros, con rayas de colores, eran los más deseados.» |
| 16.4–21.2 s | «La gente compraba y vendía bulbos en tabernas, esperando venderlos más caros.» |
| 21.2–23.9 s | «Algunos bulbos se pagaron a precios enormes.» |
| 23.9–28.7 s | «En febrero de 1637, los precios se desplomaron de repente.» |
| 28.7–33.2 s | «Hoy, los historiadores creen que su impacto fue más pequeño de lo que se cuenta.» |
| 33.2–37.1 s | «Pero se recuerda como una de las primeras burbujas económicas.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `j17_tulipan` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `j17_canal` | plano general que se abre | — | — |
| 3 | `j17_campo` | órbita con giro suave | parisina | — |
| 4 | `j17_tulipan` | primer plano de detalle | — | iconos 🌷 |
| 5 | `j17_taberna` | la cámara pasa por detrás del personaje | parisino; obrero | — |
| 6 | `j17_taberna` | crash zoom | — | texto «MÁS QUE UNA CASA» |
| 7 | `j17_mercado` | giro de cámara | parisino | — |
| 8 | `j17_canal` | tracking lateral | erudito | — |
| 9 | `j17_campo` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / LA LOCURA DE LOS TULIPANES. Cierre: TULIPOMANÍA / 1637.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `j17_campo`: colorful tulip fields in the Netherlands with a windmill, spring
- `j17_taberna`: 17th century Dutch tavern with merchants trading at wooden tables, candle light
- `j17_tulipan`: a single striped red and white tulip on a dark background, painting style
- `j17_canal`: Amsterdam canal houses in the 17th century, boats, cloudy sky
- `j17_mercado`: empty 17th century Dutch market square, grey day

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Anne Goldgar, «Tulipmania» (2007)
- Britannica: Tulip mania
