# El cerebro robado — plan de producción (33 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–3.4 s | «¿Sabías que el cerebro de Albert Einstein fue robado después de su muerte?» |
| 3.4–8.8 s | «Einstein murió el 18 de abril de 1955, en Princeton, Estados Unidos.» |
| 8.8–12.8 s | «El patólogo que hizo la autopsia, Thomas Harvey, le extrajo el cerebro.» |
| 12.8–14.6 s | «Lo hizo sin permiso de la familia.» |
| 14.6–19.1 s | «Más tarde, el hijo de Einstein aceptó, con la condición de que fuera solo para la ciencia.» |
| 19.1–23.0 s | «Harvey guardó el cerebro en frascos durante décadas, cortado en trozos.» |
| 23.0–26.6 s | «Incluso recorrió Estados Unidos en coche con él, en los años 90.» |
| 26.6–29.8 s | «Varios científicos lo estudiaron buscando el secreto de su genio.» |
| 29.8–32.5 s | «Hoy, algunos trozos se exhiben en museos.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `j20_lab` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `j20_hospital` | plano general que se abre | — | — |
| 3 | `j20_lab` | la cámara pasa por detrás del personaje | cientifico | — |
| 4 | `j20_lab` | crash zoom | — | texto «SIN PERMISO» |
| 5 | `j20_hospital` | órbita con giro suave | cientifico; erudito | — |
| 6 | `j20_casa` | primer plano de detalle | — | — |
| 7 | `j20_carretera` | tracking lateral | — | iconos 🚗 |
| 8 | `j20_museo` | giro de cámara | cientifica | — |
| 9 | `j20_museo` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / EL CEREBRO ROBADO. Cierre: EL CEREBRO / DE EINSTEIN.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `j20_hospital`: 1950s hospital corridor in Princeton, quiet night
- `j20_lab`: 1950s pathology lab with glass jars on shelves and a microscope
- `j20_casa`: cluttered 1970s home basement with boxes and old jars
- `j20_carretera`: American highway in the 1990s with an old car driving into the sunset
- `j20_museo`: medical museum with glass slides on display and soft light

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Brian Burrell, «Postcards from the Brain Museum» (2004)
- National Museum of Health and Medicine / Mütter Museum
