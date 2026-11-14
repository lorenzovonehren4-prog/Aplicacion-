# El hombre de somerton — plan de producción (46 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–5.7 s | «¿Sabías que un hombre apareció muerto en una playa de Australia con un papel misterioso escondido en la ropa?» |
| 5.7–11.4 s | «Fue el 1 de diciembre de 1948, en la playa de Somerton, en Adelaida.» |
| 11.4–17.1 s | «Iba bien vestido, pero no llevaba documentos, y las etiquetas de su ropa estaban cortadas.» |
| 17.1–21.8 s | «En un bolsillo oculto había un papelito con dos palabras persas: «Tamám shud».» |
| 21.8–27.1 s | «Significan «terminado». Las habían arrancado de un libro de poemas.» |
| 27.1–31.1 s | «En ese libro apareció un código de letras que nadie ha logrado descifrar.» |
| 31.1–33.8 s | «Durante décadas, nadie supo quién era.» |
| 33.8–40.8 s | «En 2022, unos investigadores lo identificaron con ADN: era Carl Webb, un ingeniero de Melbourne.» |
| 40.8–46.3 s | «Pero el código y la causa de su muerte siguen sin resolverse. ¿Qué quería decir?» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `h30_playa` | la cámara pasa por detrás del personaje | policia | — |
| 2 | `h30_playa` | plano general que se abre | — | — |
| 3 | `h30_policia` | órbita con giro suave | policia; periodista | — |
| 4 | `h30_libro` | primer plano de detalle | — | texto «TAMÁM SHUD» |
| 5 | `h30_libro` | crash zoom | — | iconos 📖 |
| 6 | `h30_pizarra` | travelling que pasa por detrás de un objeto en primer plano | cientifico | texto «EL CÓDIGO IMPOSIBLE» |
| 7 | `h30_policia` | giro de cámara | policia | — |
| 8 | `h30_policia` | dolly in lento | cientifica | texto «CARL WEBB» |
| 9 | `h30_arena` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / EL HOMBRE DE SOMERTON. Cierre: ¿QUÉ QUERÍA / DECIR? 🕵️.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `h30_playa`: Australian beach at dawn with a stone seawall, calm sea, 1940s
- `h30_policia`: 1940s police office with a desk, files and a typewriter, lamp light
- `h30_libro`: old open book of persian poetry with a torn corner, close view, warm light
- `h30_pizarra`: blackboard with lines of capital letters code written in chalk, dim room
- `h30_arena`: wet sand at sunset with the tide coming in and a small piece of paper

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Universidad de Adelaida, Derek Abbott y Colleen Fitzpatrick: identificación por ADN (2022)
- BBC News (julio de 2022)
- Policía de Australia del Sur: caso del hombre de Somerton
