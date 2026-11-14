# El pueblo fantasma — plan de producción (40 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–7.3 s | «¿Sabías que en 1930 se contó que un pueblo entero desapareció en Canadá, dejando la comida y la ropa en sus casas?» |
| 7.3–11.4 s | «La historia apareció en los periódicos en noviembre de 1930.» |
| 11.4–16.7 s | «Un trampero, Joe Labelle, dijo haber llegado a una aldea inuit junto al lago Anjikuni.» |
| 16.7–21.2 s | «Según su relato, las ollas seguían al fuego y la ropa estaba en su sitio.» |
| 21.2–23.0 s | «Y no había huellas en la nieve.» |
| 23.0–26.9 s | «Los perros, decía, habían muerto junto a sus estacas.» |
| 26.9–29.5 s | «Pero la Policía Montada de Canadá investigó.» |
| 29.5–35.3 s | «Y concluyó que no había pruebas de que ese pueblo hubiera existido, ni de que nadie hubiera desaparecido.» |
| 35.3–39.6 s | «¿Un misterio real, o un invento de periódico que se volvió leyenda?» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `h22_aldea` | la cámara pasa por detrás del personaje | explorador | — |
| 2 | `h22_trineo` | plano general que se abre | — | iconos 📰 |
| 3 | `h22_trineo` | órbita con giro suave | explorador | iconos 🐕 |
| 4 | `h22_choza` | travelling que pasa por detrás de un objeto en primer plano | explorador | iconos 🍲 🧥 |
| 5 | `h22_nieve` | crash zoom | — | texto «NINGUNA HUELLA» |
| 6 | `h22_nieve` | primer plano de detalle | explorador | — |
| 7 | `h22_aldea` | giro de cámara | policia | — |
| 8 | `h22_ventisca` | dolly in lento | — | texto «SIN PRUEBAS» |
| 9 | `h22_ventisca` | dolly out de cierre | — | iconos ❄️ |

Título de entrada: ¿SABÍAS QUE...? / EL PUEBLO FANTASMA. Cierre: ¿MISTERIO / O INVENTO? ❄️.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `h22_aldea`: abandoned arctic village of small huts covered in snow at dusk, light blizzard, silence
- `h22_trineo`: dog sled on a frozen lake in northern Canada, snowy hills, grey sky
- `h22_choza`: inside a small arctic hut with a cooking pot on a fire, fur clothes hanging, warm dim light
- `h22_nieve`: untouched deep snow field around snowy huts, no footprints, cold blue light
- `h22_ventisca`: heavy white blizzard covering snowy huts, almost white

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Real Policía Montada de Canadá, informe de 1931
- Joe Nickell, Skeptical Inquirer: el caso del lago Anjikuni
