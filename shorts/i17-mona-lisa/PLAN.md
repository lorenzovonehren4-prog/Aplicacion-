# El robo de la mona lisa — plan de producción (36 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–4.4 s | «¿Sabías que la Mona Lisa se hizo mundialmente famosa… porque la robaron?» |
| 4.4–9.6 s | «El 21 de agosto de 1911 desapareció del Museo del Louvre, en París.» |
| 9.6–12.0 s | «Tardaron más de un día en darse cuenta.» |
| 12.0–14.8 s | «La noticia salió en periódicos de todo el mundo.» |
| 14.8–18.3 s | «La policía interrogó incluso al joven pintor Pablo Picasso.» |
| 18.3–22.3 s | «Miles de personas fueron al Louvre… a ver el hueco vacío en la pared.» |
| 22.3–29.7 s | «En 1913 apareció en Florencia. El ladrón era Vincenzo Peruggia, un antiguo trabajador del museo.» |
| 29.7–32.2 s | «Se la había llevado escondida bajo su ropa.» |
| 32.2–36.1 s | «Cuando volvió al Louvre, ya era el cuadro más famoso del mundo.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `i17_louvre` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `i17_pared` | crash zoom | — | — |
| 3 | `i17_louvre` | órbita con giro suave | guardia | — |
| 4 | `i17_prensa` | tracking lateral | periodista | iconos 📰 |
| 5 | `i17_comisaria` | primer plano de detalle | artista; policia | — |
| 6 | `i17_pared` | la cámara pasa por detrás del personaje | parisino; parisina; chico3 | — |
| 7 | `i17_florencia` | giro de cámara | obrero | — |
| 8 | `i17_louvre` | dolly in lento | obrero | — |
| 9 | `i17_louvre` | dolly out de cierre | — | iconos 🖼️ |

Título de entrada: ¿SABÍAS QUE...? / EL ROBO DE LA MONA LISA. Cierre: EL ROBO QUE HIZO / FAMOSA A LA MONA LISA.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `i17_louvre`: grand gallery of the Louvre museum in 1911 with paintings on the walls, skylights
- `i17_pared`: museum wall with four empty iron hooks where a painting used to hang
- `i17_prensa`: 1911 newspaper printing room with stacks of newspapers
- `i17_comisaria`: 1911 Paris police office with desks and files, lamp
- `i17_florencia`: Florence city view with the cathedral dome at sunset

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Museo del Louvre: historia de la Gioconda
- Noah Charney, «The Thefts of the Mona Lisa» (2011)
