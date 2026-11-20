# ¿napoleón era bajito? — plan de producción (38 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–2.2 s | «¿Sabías que Napoleón no era bajito?» |
| 2.2–10.0 s | «Medía alrededor de 1,69 metros. Normal, o incluso algo más, para un hombre de su época.» |
| 10.0–12.3 s | «Entonces, ¿de dónde viene el mito?» |
| 12.3–17.5 s | «Primero, por las medidas: las pulgadas francesas eran más largas que las inglesas.» |
| 17.5–20.5 s | «Al traducir su altura, salía un número menor.» |
| 20.5–26.0 s | «Segundo, por las caricaturas británicas, que lo dibujaban diminuto para burlarse de él.» |
| 26.0–31.7 s | «Y tercero, porque solía estar rodeado de su Guardia Imperial, elegida entre soldados altos.» |
| 31.7–35.9 s | «Además, sus soldados lo llamaban con cariño «el pequeño cabo».» |
| 35.9–38.3 s | «Un mito de más de doscientos años.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `j09_desfile` | travelling que pasa por detrás de un objeto en primer plano | soldadoNap | — |
| 2 | `j09_despacho` | primer plano de detalle | — | texto «≈1,69 M» |
| 3 | `j09_palacio` | la cámara pasa por detrás del personaje | soldadoNap | — |
| 4 | `j09_despacho` | órbita con giro suave | erudito | — |
| 5 | `j09_despacho` | crash zoom | — | — |
| 6 | `j09_imprenta` | tracking lateral | artista | iconos 🖼️ |
| 7 | `j09_desfile` | giro de cámara | soldadoNap; soldadoNap; soldadoNap | — |
| 8 | `j09_campamento` | plano general que se abre | soldadoNap | — |
| 9 | `j09_palacio` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / ¿NAPOLEÓN ERA BAJITO?. Cierre: NAPOLEÓN / NO ERA BAJITO.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `j09_campamento`: Napoleonic army camp with tents and flags at dawn
- `j09_despacho`: early 19th century study with maps, rulers and documents, candle light
- `j09_imprenta`: early 19th century print shop with satirical cartoons hanging
- `j09_desfile`: parade of tall imperial guard soldiers in bearskin hats in Paris
- `j09_palacio`: grand French imperial palace hall with chandeliers

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Britannica: Napoleon I
- Fondation Napoléon: la taille de Napoléon
