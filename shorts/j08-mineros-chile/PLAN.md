# Los 33 — plan de producción (34 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–5.3 s | «¿Sabías que 33 mineros sobrevivieron 69 días atrapados a unos 700 metros bajo tierra?» |
| 5.3–10.0 s | «Fue en Chile, en agosto de 2010. La mina San José se derrumbó.» |
| 10.0–14.1 s | «Los 33 quedaron encerrados en un refugio, sin contacto con el exterior.» |
| 14.1–17.2 s | «Durante 17 días, nadie sabía si estaban vivos.» |
| 17.2–21.1 s | «Entonces, una sonda llegó hasta ellos… y volvió con un papel pegado.» |
| 21.1–24.0 s | «Decía: «Estamos bien en el refugio los 33».» |
| 24.0–27.3 s | «Durante semanas les enviaron comida y medicinas por pequeños tubos.» |
| 27.3–31.1 s | «El 13 de octubre, uno a uno, subieron en una cápsula llamada Fénix.» |
| 31.1–33.7 s | «Los 33 fueron rescatados con vida.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `j08_mina` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `j08_desierto` | plano general que se abre | — | — |
| 3 | `j08_refugio` | la cámara pasa por detrás del personaje | minero; minero; minero | — |
| 4 | `j08_perforadora` | giro de cámara | obrero | texto «17 DÍAS» |
| 5 | `j08_perforadora` | crash zoom | obrero | — |
| 6 | `j08_refugio` | primer plano de detalle | — | texto ««ESTAMOS BIEN EN EL REFUGIO LOS 33»» |
| 7 | `j08_refugio` | órbita con giro suave | minero | — |
| 8 | `j08_rescate` | pan vertical ascendente | — | — |
| 9 | `j08_rescate` | dolly out de cierre | minero; minero | — |

Título de entrada: ¿SABÍAS QUE...? / LOS 33. Cierre: LOS 33 / 69 DÍAS BAJO TIERRA.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `j08_desierto`: Atacama desert in Chile with a mining camp and mountains, clear sky
- `j08_mina`: deep underground mine tunnel with yellow lamps and rocks
- `j08_refugio`: small underground mine shelter with tired miners lamps, dust
- `j08_perforadora`: big drilling machine at a mine site in the desert, night, floodlights
- `j08_rescate`: rescue site at night with a capsule rising from a hole, crowd and lights

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Gobierno de Chile: rescate de la mina San José (2010)
- BBC Mundo: los 33 mineros de Atacama
