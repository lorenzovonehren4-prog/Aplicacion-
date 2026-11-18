# La explosión de halifax — plan de producción (34 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–5.7 s | «¿Sabías que antes de la bomba atómica, la mayor explosión causada por el ser humano ocurrió en un puerto de Canadá?» |
| 5.7–9.2 s | «Fue el 6 de diciembre de 1917, en Halifax.» |
| 9.2–13.2 s | «Un barco francés, el Mont-Blanc, iba cargado de explosivos para la guerra.» |
| 13.2–16.6 s | «En el puerto chocó con otro barco, el Imo, y empezó a arder.» |
| 16.6–18.7 s | «La gente se acercó a mirar el incendio.» |
| 18.7–21.4 s | «Unos veinte minutos después, el barco explotó.» |
| 21.4–25.8 s | «La onda destruyó barrios enteros. Murieron unas dos mil personas.» |
| 25.8–28.7 s | «Llegó ayuda desde Boston, en plena tormenta de nieve.» |
| 28.7–33.7 s | «Desde entonces, Halifax regala cada año un árbol de Navidad a Boston, en agradecimiento.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `i08_puerto` | la cámara pasa por detrás del personaje | marinero | — |
| 2 | `i08_puerto` | plano general que se abre | — | — |
| 3 | `i08_puerto` | tracking lateral | — | 1 barco(s) |
| 4 | `i08_barcos` | crash zoom | — | — |
| 5 | `i08_incendio` | órbita con giro suave | marinero; parisina; chico3 | — |
| 6 | `i08_incendio` | travelling que pasa por detrás de un objeto en primer plano | — | iconos 💥 |
| 7 | `i08_ruinas` | primer plano de detalle | — | texto «≈2.000 MUERTOS» |
| 8 | `i08_ruinas` | giro de cámara | enfermera; marinero | — |
| 9 | `i08_arbol` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / LA EXPLOSIÓN DE HALIFAX. Cierre: HALIFAX / 6 DE DICIEMBRE DE 1917.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `i08_puerto`: Halifax harbor in 1917, wooden piers, steamships, snowy hills
- `i08_barcos`: two steamships colliding in a narrow harbor channel, smoke, 1917
- `i08_incendio`: a burning cargo ship in a harbor with black smoke, people watching from the pier
- `i08_ruinas`: destroyed wooden neighborhood after a huge explosion, snow, smoke
- `i08_arbol`: a big christmas tree with lights in a city square at night, snow

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Maritime Museum of the Atlantic: Halifax Explosion
- Canadian Encyclopedia: Halifax Explosion
