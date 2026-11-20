# La primera programadora — plan de producción (34 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–4.9 s | «¿Sabías que el primer programa de computadora lo escribió una mujer… en 1843?» |
| 4.9–8.2 s | «Se llamaba Ada Lovelace, y era hija del poeta Lord Byron.» |
| 8.2–10.8 s | «Su madre la hizo estudiar matemáticas desde niña.» |
| 10.8–15.4 s | «Conoció a Charles Babbage, que diseñaba una máquina para calcular: la máquina analítica.» |
| 15.4–17.5 s | «Esa máquina nunca llegó a construirse.» |
| 17.5–21.3 s | «Pero en 1843, Ada publicó unas notas sobre ella.» |
| 21.3–26.3 s | «Incluían un método para que la máquina calculara una serie de números: el primer programa publicado.» |
| 26.3–31.1 s | «Y algo más: imaginó que esas máquinas podrían hacer más que cuentas, como componer música.» |
| 31.1–34.4 s | «Hoy, un lenguaje de programación lleva su nombre: Ada.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `j18_engranajes` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `j18_salon` | órbita con giro suave | actriz | — |
| 3 | `j18_salon` | la cámara pasa por detrás del personaje | actriz | — |
| 4 | `j18_taller` | tracking lateral | actriz; ingeniero | — |
| 5 | `j18_taller` | crash zoom | — | — |
| 6 | `j18_estudio` | primer plano de detalle | — | texto «1843» |
| 7 | `j18_estudio` | giro de cámara | actriz | — |
| 8 | `j18_engranajes` | plano general que se abre | — | iconos 🎵 |
| 9 | `j18_moderno` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / LA PRIMERA PROGRAMADORA. Cierre: ADA LOVELACE / 1815–1852.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `j18_salon`: elegant 1830s London drawing room with books and a piano
- `j18_taller`: workshop with a huge brass mechanical calculating machine with gears
- `j18_estudio`: desk with handwritten mathematical notes, quill and candle, 1840s
- `j18_engranajes`: close view of brass gears and cogs of a mechanical computer
- `j18_moderno`: modern computer screen with code in a dark room

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Britannica: Ada Lovelace
- Science Museum (Londres): Ada Lovelace y la máquina analítica
