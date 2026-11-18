# El ejército de barro — plan de producción (33 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–5.3 s | «¿Sabías que unos campesinos que cavaban un pozo encontraron un ejército de miles de soldados?» |
| 5.3–9.5 s | «Fue en 1974, cerca de Xi'an, en China.» |
| 9.5–12.6 s | «Al cavar, encontraron trozos de figuras de barro.» |
| 12.6–16.9 s | «Los arqueólogos excavaron… y apareció un ejército entero de terracota.» |
| 16.9–20.9 s | «Se calcula que hay unos ocho mil soldados, con caballos y carros.» |
| 20.9–22.8 s | «Y cada cara parece diferente.» |
| 22.8–27.6 s | «Los hicieron hace más de dos mil años para el primer emperador de China, Qin Shi Huang.» |
| 27.6–29.9 s | «Debían protegerlo después de la muerte.» |
| 29.9–33.0 s | «Y su tumba principal todavía no se ha abierto.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `i11_fosa` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `i11_campo` | plano general que se abre | campesino; campesino | — |
| 3 | `i11_pozo` | primer plano de detalle | campesino | — |
| 4 | `i11_fosa` | crash zoom | cientifica | — |
| 5 | `i11_fosa` | tracking lateral | — | texto «≈8.000 SOLDADOS» |
| 6 | `i11_rostros` | giro de cámara | — | — |
| 7 | `i11_tumba` | órbita con giro suave | chino | — |
| 8 | `i11_fosa` | la cámara pasa por detrás del personaje | — | — |
| 9 | `i11_tumba` | dolly out de cierre | — | texto «SIN ABRIR» |

Título de entrada: ¿SABÍAS QUE...? / EL EJÉRCITO DE BARRO. Cierre: GUERREROS / DE TERRACOTA.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `i11_campo`: dry farmland near Xian in China in the 1970s, persimmon trees, simple houses
- `i11_pozo`: a hole dug in dry earth with broken clay pieces, shovels
- `i11_fosa`: huge excavation pit with rows of terracotta warrior statues, museum roof
- `i11_rostros`: close view of several terracotta soldier faces, warm light
- `i11_tumba`: big green hill of an ancient emperor tomb in China at sunset

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- UNESCO: Mausoleo del primer emperador Qin
- Museo del Mausoleo del emperador Qin Shi Huang
