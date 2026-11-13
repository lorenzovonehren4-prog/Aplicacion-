# La guerra de 38 minutos — plan de producción (33 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–4.7 s | «¿Sabías que hubo una guerra que terminó en aproximadamente 38 minutos?» |
| 4.7–8.2 s | «Ocurrió en Zanzíbar, en 1896.» |
| 8.2–14.1 s | «Después de la muerte del sultán, un nuevo aspirante tomó el poder sin contar con el apoyo británico.» |
| 14.1–17.1 s | «Los británicos exigieron que abandonara el palacio.» |
| 17.1–20.6 s | «Cuando venció el ultimátum, comenzó el enfrentamiento.» |
| 20.6–22.9 s | «La flota británica atacó el palacio» |
| 22.9–26.9 s | «y, después de unos 38 minutos, Zanzíbar se rindió.» |
| 26.9–31.0 s | «Así terminó lo que suele conocerse como la guerra más corta de la historia.» |
| 31.0–33.0 s | «¡Duró menos que un recreo!» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `f03_mapa` | crash zoom | — | dibujo: reloj |
| 2 | `f03_palacio` | plano general que se abre | — | — |
| 3 | `f03_salon` | órbita con giro suave | sultan | — |
| 4 | `f03_puerto` | tracking lateral | almirante | iconos ✉️ |
| 5 | `f03_salon` | whip pan | sultan | texto «9:00»; dibujo: reloj |
| 6 | `f03_humo` | dolly in lento | — | 2 barco(s) |
| 7 | `f03_humo` | primer plano de detalle | — | iconos 🏳️ |
| 8 | `f03_mapa` | pan vertical descendente | — | dibujo: reloj |
| 9 | `f03_palacio` | dolly out de cierre | — | texto «9:38» |

Título de entrada: ¿SABÍAS QUE...? / LA GUERRA DE 38 MINUTOS. Cierre: 27 DE AGOSTO / DE 1896.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `f03_mapa`: antique map of the east coast of Africa and the Indian Ocean with a small island, sepia parchment, compass rose, no letters
- `f03_palacio`: the sultan palace of Zanzibar in 1896 on the seafront, white arabic building with a tall tower, palm trees, blue sea
- `f03_salon`: interior of an arabian palace throne room with arches, carpets, lanterns and a carved throne
- `f03_puerto`: the harbor of Zanzibar in 1896 with steam warships on the turquoise sea, palm trees
- `f03_humo`: a single white palace with a tower on a tropical seafront seen from the sea, a column of grey smoke rising behind it, calm turquoise water in the foreground

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Britannica: Anglo-Zanzibar War
- Guinness World Records: Shortest war
