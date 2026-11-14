# El hombre de taured — plan de producción (35 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–5.0 s | «¿Sabías que circula la historia de un viajero que llegó a Japón con un pasaporte… de un país que no existe?» |
| 5.0–9.7 s | «Según el relato, ocurrió en 1954, en el aeropuerto de Tokio.» |
| 9.7–12.4 s | «El hombre presentó un pasaporte de un país llamado Taured.» |
| 12.4–17.7 s | «Le dijeron que ese país no existía. Él señaló un mapa, justo donde está Andorra.» |
| 17.7–20.4 s | «Lo encerraron en un hotel vigilado mientras investigaban.» |
| 20.4–23.1 s | «A la mañana siguiente, la habitación estaba vacía.» |
| 23.1–25.7 s | «Y dicen que sus documentos también desaparecieron.» |
| 25.7–31.6 s | «Pero no existe ningún registro oficial de este caso: ni de la policía japonesa, ni en los periódicos de la época.» |
| 31.6–35.2 s | «¿Un viajero de otro mundo, o una leyenda urbana muy bien contada?» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `h23_aduana` | la cámara pasa por detrás del personaje | viajero; guardia | — |
| 2 | `h23_aeropuerto` | plano general que se abre | — | iconos ✈️ |
| 3 | `h23_mesa` | primer plano de detalle | — | texto «TAURED»; iconos 🛂 |
| 4 | `h23_mapa` | órbita con giro suave | viajero; guardia | — |
| 5 | `h23_hotel` | tracking lateral | policia; policia | — |
| 6 | `h23_cuarto` | crash zoom | — | texto «DESAPARECIÓ» |
| 7 | `h23_mesa` | travelling que pasa por detrás de un objeto en primer plano | — | iconos 🧳 💨 |
| 8 | `h23_aduana` | giro de cámara | guardia | texto «SIN REGISTROS» |
| 9 | `h23_cuarto` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / EL HOMBRE DE TAURED. Cierre: ¿DE DÓNDE / VENÍA? 🧳.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `h23_aduana`: 1950s airport customs hall with wooden counters, rubber stamps and a big window with propeller planes, warm light
- `h23_aeropuerto`: Tokyo airport terminal exterior in the 1950s with a propeller airliner, summer
- `h23_mapa`: vintage map of western Europe hanging on a wall with the Pyrenees mountains, no letters
- `h23_hotel`: 1950s hotel corridor with a closed door and two chairs, dim light
- `h23_cuarto`: empty 1950s hotel room with a bed and a closed window high above a city at night
- `h23_mesa`: wooden desk with an old passport and papers under a lamp

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Colin Wilson y Damon Wilson, The Directory of Possibilities (1981), primera versión conocida del relato
- No existen registros oficiales del caso
