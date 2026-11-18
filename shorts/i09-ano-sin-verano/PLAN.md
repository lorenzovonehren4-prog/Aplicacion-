# El año sin verano — plan de producción (41 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–4.3 s | «¿Sabías que hubo un año en que no hubo verano… y nació Frankenstein?» |
| 4.3–10.6 s | «En abril de 1815, el volcán Tambora, en Indonesia, tuvo una erupción gigantesca.» |
| 10.6–14.7 s | «Lanzó tanta ceniza al cielo, que bajó la temperatura del planeta.» |
| 14.7–19.4 s | «En 1816, nevó en junio en el noreste de Estados Unidos.» |
| 19.4–22.4 s | «En Europa se perdieron cosechas, y hubo hambre.» |
| 22.4–27.5 s | «En Suiza, unos escritores quedaron encerrados por las tormentas, junto a un lago.» |
| 27.5–31.3 s | «Para pasar el tiempo, se retaron a escribir historias de terror.» |
| 31.3–36.3 s | «Una joven de 18 años, Mary Shelley, empezó allí «Frankenstein».» |
| 36.3–40.6 s | «Un volcán al otro lado del mundo cambió el clima… y la literatura.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `i09_cielo` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `i09_volcan` | crash zoom | — | — |
| 3 | `i09_cielo` | pan vertical ascendente | — | — |
| 4 | `i09_nieve` | plano general que se abre | granjero | — |
| 5 | `i09_nieve` | primer plano de detalle | campesino; campesina | — |
| 6 | `i09_villa` | la cámara pasa por detrás del personaje | — | — |
| 7 | `i09_salon` | órbita con giro suave | artista; parisina; erudito | — |
| 8 | `i09_salon` | giro de cámara | parisina | — |
| 9 | `i09_villa` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / EL AÑO SIN VERANO. Cierre: 1816 / EL AÑO SIN VERANO.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `i09_volcan`: huge volcanic eruption on a tropical island at night, ash cloud, lava, sea
- `i09_cielo`: grey ash-filled sky over a dim cold landscape, pale sun
- `i09_nieve`: snow covering green summer fields and a farmhouse in June, New England
- `i09_villa`: villa by Lake Geneva in Switzerland during a stormy night, lightning, candles in windows
- `i09_salon`: candlelit 19th century salon with writers around a table, storm outside

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Gillen D'Arcy Wood, «Tambora: The Eruption That Changed the World» (2014)
- Britannica: Year Without a Summer
