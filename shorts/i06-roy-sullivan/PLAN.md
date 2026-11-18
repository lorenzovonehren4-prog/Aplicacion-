# Siete rayos — plan de producción (32 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–3.5 s | «¿Sabías que a un hombre le cayeron siete rayos… y sobrevivió a todos?» |
| 3.5–7.7 s | «Se llamaba Roy Sullivan, y era guardabosques en Virginia, Estados Unidos.» |
| 7.7–12.1 s | «El primer rayo lo alcanzó en 1942, en una torre de vigilancia.» |
| 12.1–16.4 s | «Después vinieron más: en un camión, en el jardín de su casa, en el parque…» |
| 16.4–19.8 s | «Uno le quemó el pelo. Otro, las cejas.» |
| 19.8–24.1 s | «Entre 1942 y 1977 sumó siete rayos.» |
| 24.1–25.8 s | «Y sobrevivió a todos ellos.» |
| 25.8–29.2 s | «El libro Guinness lo reconoce como la persona alcanzada por más rayos.» |
| 29.2–31.9 s | «¿Mala suerte… o la mejor suerte del mundo?» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `i06_cielo` | travelling que pasa por detrás de un objeto en primer plano | australiano | — |
| 2 | `i06_bosque` | órbita con giro suave | australiano | — |
| 3 | `i06_torre` | crash zoom | — | iconos ⚡ |
| 4 | `i06_camino` | tracking lateral | australiano | iconos ⚡ ⚡ ⚡ |
| 5 | `i06_jardin` | primer plano de detalle | australiano | — |
| 6 | `i06_cielo` | la cámara pasa por detrás del personaje | — | texto «7» |
| 7 | `i06_bosque` | giro de cámara | australiano | — |
| 8 | `i06_bosque` | dolly in lento | — | iconos 🏆 |
| 9 | `i06_cielo` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / SIETE RAYOS. Cierre: 7 RAYOS / Y SOBREVIVIÓ.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `i06_bosque`: Shenandoah national park forest in Virginia with a stormy sky and lightning
- `i06_torre`: wooden fire lookout tower on a mountain under dark storm clouds
- `i06_camino`: mountain road with an old ranger truck under heavy rain and lightning
- `i06_jardin`: small house garden under a stormy sky, lightning bolt in the distance
- `i06_cielo`: dramatic thunderstorm sky with multiple lightning bolts

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Guinness World Records: most lightning strikes survived
- Servicio de Parques Nacionales de EE. UU.: Shenandoah
