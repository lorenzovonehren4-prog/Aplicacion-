# El vuelo 739 — plan de producción (50 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–8.3 s | «¿Sabías que en 1962 un avión con más de cien personas desapareció sobre el Pacífico… y nunca se encontró ni un solo resto?» |
| 8.3–11.6 s | «Fue el 16 de marzo de 1962.» |
| 11.6–20.1 s | «Un Lockheed Super Constellation, fletado por el ejército de Estados Unidos, despegó de Guam rumbo a Filipinas, con 93 soldados a bordo.» |
| 20.1–23.0 s | «El piloto reportó su posición con normalidad.» |
| 23.0–27.4 s | «Poco después, el avión dejó de responder. Ya no estaba.» |
| 27.4–32.1 s | «Un petrolero que navegaba por la zona contó haber visto un destello intenso en el cielo.» |
| 32.1–35.9 s | «Se organizó una de las mayores búsquedas de la historia del Pacífico.» |
| 35.9–41.1 s | «No apareció nada: ni restos, ni manchas de aceite, ni chalecos salvavidas.» |
| 41.1–50.4 s | «¿Explotó en pleno vuelo? La investigación oficial nunca pudo confirmarlo. El vuelo 739 sigue sin respuesta.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `h20_radar` | la cámara pasa por detrás del personaje | piloto | iconos 🟢 |
| 2 | `h20_guam` | plano general que se abre | — | iconos ✈️ |
| 3 | `h20_guam` | tracking lateral | aliado; aliado2 | texto «VUELO 739» |
| 4 | `h20_radio` | primer plano de detalle | telegrafista | iconos 📻 |
| 5 | `h20_radar` | crash zoom | telegrafista | — |
| 6 | `h20_noche` | giro de cámara | marinero | iconos 💥 |
| 7 | `h20_pacifico` | travelling que pasa por detrás de un objeto en primer plano | — | 2 barco(s) |
| 8 | `h20_pacifico` | dolly in lento | — | texto «CERO RASTROS EN EL MAR» |
| 9 | `h20_radar` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / EL VUELO 739. Cierre: ¿DÓNDE QUEDÓ / EL AVIÓN? ✈️.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `h20_radar`: 1960s air traffic control room at night with a big glowing green round radar screen, dark consoles
- `h20_guam`: military airfield on a tropical island at night with a four-engine propeller airliner on the runway, starry sky
- `h20_radio`: 1960s radio room with headphones, radio equipment and a notebook under a lamp
- `h20_pacifico`: vast pacific ocean seen from above with grey warships and search planes, cloudy sky
- `h20_noche`: dark stormy night sky over the ocean with distant lightning

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Aviation Safety Network: Flying Tiger Line Flight 739 (16-3-1962)
- Civil Aeronautics Board, informe del accidente
