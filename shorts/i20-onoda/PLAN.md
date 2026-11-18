# 29 años en la selva — plan de producción (35 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–4.2 s | «¿Sabías que un soldado japonés siguió en guerra casi treinta años después de que terminara?» |
| 4.2–5.6 s | «Se llamaba Hiroo Onoda.» |
| 5.6–11.7 s | «En 1944 lo enviaron a la isla de Lubang, en Filipinas, con una orden: no rendirse nunca.» |
| 11.7–16.1 s | «En 1945 la guerra terminó. Pero él no lo creyó.» |
| 16.1–19.4 s | «Pensaba que los folletos que anunciaban la paz eran trucos del enemigo.» |
| 19.4–22.0 s | «Siguió escondido en la selva, durante años.» |
| 22.0–25.9 s | «En 1974, un joven explorador japonés lo encontró.» |
| 25.9–32.3 s | «Onoda solo aceptó rendirse si se lo ordenaba su antiguo superior. Y el superior viajó hasta la isla para hacerlo.» |
| 32.3–34.8 s | «Había pasado 29 años en la selva.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `i20_selva` | la cámara pasa por detrás del personaje | japones | — |
| 2 | `i20_selva` | órbita con giro suave | japones | — |
| 3 | `i20_playa` | plano general que se abre | japones | — |
| 4 | `i20_selva` | crash zoom | japones | — |
| 5 | `i20_folletos` | tracking lateral | japones | iconos 📄 📄 |
| 6 | `i20_campamento` | travelling que pasa por detrás de un objeto en primer plano | japones | — |
| 7 | `i20_encuentro` | giro de cámara | explorador; japones | — |
| 8 | `i20_encuentro` | primer plano de detalle | general; japones | — |
| 9 | `i20_selva` | dolly out de cierre | — | texto «29 AÑOS» |

Título de entrada: ¿SABÍAS QUE...? / 29 AÑOS EN LA SELVA. Cierre: 29 AÑOS / EN LA SELVA.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `i20_selva`: dense tropical jungle on a Philippine island, humid, rays of light
- `i20_playa`: tropical island coast with palm trees and a calm sea, 1940s
- `i20_folletos`: paper leaflets falling from the sky over a jungle
- `i20_campamento`: small hidden jungle camp with a lean-to shelter and a fire
- `i20_encuentro`: jungle clearing at dusk with a small campfire

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Hiroo Onoda, «No Surrender: My Thirty-Year War» (1974)
- The New York Times, obituario (2014)
