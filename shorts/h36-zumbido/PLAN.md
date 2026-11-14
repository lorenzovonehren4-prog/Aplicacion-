# El zumbido — plan de producción (39 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–5.4 s | «¿Sabías que algunas personas oyen un zumbido constante… que nadie más a su alrededor escucha?» |
| 5.4–9.6 s | «Se le llama «el zumbido». En inglés, «The Hum».» |
| 9.6–14.8 s | «Se ha reportado en lugares como Taos, en Nuevo México, o Bristol, en Inglaterra.» |
| 14.8–19.5 s | «Quienes lo oyen lo describen como un motor diésel lejano, funcionando sin parar.» |
| 19.5–23.4 s | «Se calcula que lo percibe alrededor del dos por ciento de la población.» |
| 23.4–28.1 s | «Pero cuando los ingenieros miden con micrófonos, muchas veces no registran nada.» |
| 28.1–33.1 s | «Las hipótesis van desde vibraciones de la tierra hasta un zumbido dentro del propio oído.» |
| 33.1–35.6 s | «Para quienes lo sufren, no deja dormir.» |
| 35.6–39.2 s | «¿Lo has oído tú alguna vez, cuando todo está en silencio?» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `h36_dormitorio` | la cámara pasa por detrás del personaje | chico2 | iconos 🔊 |
| 2 | `h36_dormitorio` | primer plano de detalle | — | texto «EL ZUMBIDO» |
| 3 | `h36_ciudad` | plano general que se abre | — | iconos 📍 📍 |
| 4 | `h36_dormitorio` | órbita con giro suave | chico2 | — |
| 5 | `h36_calle` | crash zoom | — | texto «≈ 2 %» |
| 6 | `h36_calle` | travelling que pasa por detrás de un objeto en primer plano | ingeniero | iconos 🎙️ |
| 7 | `h36_tierra` | giro de cámara | — | texto «¿ONDAS O BIOLOGÍA?» |
| 8 | `h36_dormitorio` | dolly in lento | chico2 | — |
| 9 | `h36_silencio` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / EL ZUMBIDO. Cierre: ¿LO HAS / ESCUCHADO? 🔊.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `h36_dormitorio`: dark bedroom at night with an empty messy bed and city lights through the window
- `h36_ciudad`: small desert town in New Mexico at night, adobe houses, stars
- `h36_calle`: empty city street at night with an equipment case and a microphone on a stand
- `h36_tierra`: cross-section illustration of the earth crust with glowing low-frequency waves, dark background
- `h36_silencio`: quiet dark night sky over rooftops, very calm

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Joe Mullins y Jerry Kelly, estudio del zumbido de Taos (1993)
- David Deming, The Hum: An Anomalous Sound Heard Around the World, Journal of Scientific Exploration (2004)
