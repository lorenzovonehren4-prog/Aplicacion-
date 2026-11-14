# Las bolas de fuego del naga — plan de producción (34 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–5.4 s | «¿Sabías que en un río de Asia salen del agua bolas de luz roja que suben al cielo… delante de miles de personas?» |
| 5.4–8.7 s | «Ocurre en el río Mekong, en la provincia tailandesa de Nong Khai.» |
| 8.7–13.2 s | «Cada año, al final de la cuaresma budista, miles de personas se reúnen en la orilla.» |
| 13.2–17.4 s | «Y desde el agua aparecen esferas rojizas que suben en silencio y se apagan en el aire.» |
| 17.4–21.1 s | «Para muchos, son el aliento del Naga, una serpiente mítica del río.» |
| 21.1–24.8 s | «Algunos científicos creen que es gas del fondo del río que se enciende solo.» |
| 24.8–29.9 s | «Un reportaje de televisión de 2002 afirmó que eran balas trazadoras disparadas desde la orilla de Laos.» |
| 29.9–32.2 s | «Ninguna explicación ha convencido a todos.» |
| 32.2–34.0 s | «¿Qué sale realmente del agua?» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `h33_rio` | travelling que pasa por detrás de un objeto en primer plano | — | iconos 🔴 🔴 |
| 2 | `h33_orilla` | plano general que se abre | — | texto «RÍO MEKONG» |
| 3 | `h33_templo` | órbita con giro suave | monjeBud; chico2; campesina | — |
| 4 | `h33_rio` | la cámara pasa por detrás del personaje | monjeBud | iconos 🔴 🔴 |
| 5 | `h33_templo` | crash zoom | — | iconos 🐍 |
| 6 | `h33_lab` | tracking lateral | cientifico | texto «¿GAS NATURAL?» |
| 7 | `h33_orilla` | giro de cámara | periodista | — |
| 8 | `h33_rio` | dolly in lento | — | texto «¿MITO O CIENCIA?» |
| 9 | `h33_luna` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / LAS BOLAS DE FUEGO DEL NAGA. Cierre: ¿QUÉ SALE / DEL AGUA? 🔥.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `h33_rio`: wide Mekong river at night under a full moon, calm water, red glowing balls of light rising from the water
- `h33_orilla`: river bank in Thailand at night crowded with lanterns and colorful decorations, festival
- `h33_templo`: thai temple by the river at dusk with golden roofs and naga serpent statues
- `h33_lab`: small field science tent by a river with sample bottles and instruments at night
- `h33_luna`: full moon over a dark river with one red glowing orb rising

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Reportaje de iTV (Tailandia, 2002)
- Bangkok Post, cobertura anual de las bolas de fuego del Naga
