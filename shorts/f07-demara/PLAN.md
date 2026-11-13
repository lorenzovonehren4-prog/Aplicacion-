# El gran impostor — plan de producción (37 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–3.3 s | «Este hombre consiguió hacerse pasar por tantas personas» |
| 3.3–8.4 s | «que terminó convirtiéndose en uno de los impostores más famosos del siglo XX.» |
| 8.4–10.3 s | «Se llamaba Ferdinand Demara.» |
| 10.3–15.7 s | «Utilizaba identidades falsas para conseguir trabajos y ocupar puestos que no le correspondían.» |
| 15.7–21.3 s | «Durante la Guerra de Corea, llegó a hacerse pasar por cirujano de la Marina Real Canadiense,» |
| 21.3–23.6 s | «pese a no tener formación médica.» |
| 23.6–29.1 s | «Su engaño terminó siendo descubierto cuando su historia empezó a llamar la atención de los medios.» |
| 29.1–34.1 s | «Su vida inspiró libros y una película. Fue conocido como el Gran Impostor.» |
| 34.1–37.5 s | «Pero ninguna de sus identidades era realmente suya.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `f07_espejo` | órbita con giro suave | demara | — |
| 2 | `f07_espejo` | crash zoom | demaraProf; demaraMedico; demaraMonje | — |
| 3 | `f07_oficina` | dolly in lento | demara | — |
| 4 | `f07_aula` | tracking lateral | demaraProf | iconos 🎓 📜 |
| 5 | `f07_barco` | plano general que se abre | — | texto «GUERRA DE COREA» |
| 6 | `f07_enfermeria` | whip pan | demaraMedico | iconos 🩺 📚 |
| 7 | `f07_prensa` | primer plano de detalle | periodista | iconos 📰 📸 |
| 8 | `f07_cine` | pan vertical ascendente | — | iconos 📖 🎬 |
| 9 | `f07_espejo` | dolly out de cierre | demaraGuardia; demaraProf; demara; demaraMedico; demaraMonje | — |

Título de entrada: HISTORIA REAL / EL GRAN IMPOSTOR. Cierre: ¿CUÁNTAS IDENTIDADES / PUEDE TENER UNA PERSONA?.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `f07_espejo`: dim dressing room with a large mirror with light bulbs, a coat rack with many different uniforms and hats
- `f07_aula`: 1950s university classroom with a blackboard, wooden desks and bookshelves
- `f07_oficina`: 1950s government office with filing cabinets, desk, typewriter and framed diplomas on the wall
- `f07_barco`: one single grey navy destroyer ship on a calm cold sea, side view, cloudy sky, distant mountains
- `f07_enfermeria`: ship infirmary room in the 1950s with a white bed, medicine cabinet, round porthole window and lamp
- `f07_prensa`: 1950s newspaper printing press with stacks of newspapers and a desk with photographs
- `f07_cine`: inside an old movie theater with red velvet seats and a glowing blank white screen, projector light beam

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Robert Crichton: The Great Impostor (1959)
- The Canadian Encyclopedia: Ferdinand Waldo Demara
- The New York Times, obituario (9-6-1982)
