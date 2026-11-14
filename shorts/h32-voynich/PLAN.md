# El libro que nadie puede leer — plan de producción (42 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–5.1 s | «¿Sabías que existe un libro medieval escrito en un idioma que nadie en el mundo ha podido leer?» |
| 5.1–6.9 s | «Es el manuscrito Voynich.» |
| 6.9–11.2 s | «Su pergamino se fechó con carbono 14 a principios del siglo XV.» |
| 11.2–16.8 s | «Lleva el nombre de Wilfrid Voynich, un librero que lo compró en 1912, en Italia.» |
| 16.8–23.2 s | «Está lleno de plantas que no se parecen a ninguna conocida, diagramas de estrellas y extrañas figuras humanas.» |
| 23.2–28.4 s | «Criptógrafos de las dos guerras mundiales intentaron descifrarlo. Fracasaron.» |
| 28.4–32.8 s | «Hoy también lo estudian con ordenadores, y tampoco hay una solución aceptada.» |
| 32.8–37.3 s | «¿Un código brillante, una lengua perdida, o un engaño muy elaborado?» |
| 37.3–41.6 s | «El libro sigue guardando su secreto. ¿Qué crees que dice?» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `h32_libro` | la cámara pasa por detrás del personaje | erudito | — |
| 2 | `h32_libro` | primer plano de detalle | — | texto «MANUSCRITO VOYNICH» |
| 3 | `h32_paginas` | órbita con giro suave | — | texto «SIGLO XV» |
| 4 | `h32_biblioteca` | tracking lateral | erudito | — |
| 5 | `h32_paginas` | travelling que pasa por detrás de un objeto en primer plano | — | iconos 🌿 ✨ 🌀 |
| 6 | `h32_biblioteca` | crash zoom | cientifico | — |
| 7 | `h32_computadora` | giro de cámara | cientifica | texto «NADIE PUEDE LEERLO» |
| 8 | `h32_paginas` | dolly in lento | — | — |
| 9 | `h32_mesa` | dolly out de cierre | — | iconos 📖 |

Título de entrada: ¿SABÍAS QUE...? / EL LIBRO QUE NADIE PUEDE LEER. Cierre: ¿QUÉ DICE / EL LIBRO? 📖.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `h32_libro`: an ancient leather book open on a wooden table showing strange colorful plant drawings and unknown writing, candle light
- `h32_biblioteca`: old Italian monastery library with wooden shelves and dusty books, lamp light
- `h32_paginas`: parchment pages with strange botanical illustrations and circular astronomical diagrams, close view
- `h32_computadora`: modern computer screens showing text analysis graphs in a dark room
- `h32_mesa`: dusty old book closed on a table with golden dust floating in a light beam

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Universidad de Arizona: datación por radiocarbono (2009)
- Biblioteca Beinecke, Universidad de Yale (MS 408)
