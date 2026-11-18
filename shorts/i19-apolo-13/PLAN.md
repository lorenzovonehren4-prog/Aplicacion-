# Apolo 13 — plan de producción (38 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–6.2 s | «¿Sabías que tres astronautas volvieron del espacio gracias a un invento hecho con cinta, cartón y bolsas?» |
| 6.2–10.1 s | «Fue en abril de 1970, en la misión Apolo 13.» |
| 10.1–13.8 s | «A mitad de camino a la Luna, explotó un tanque de oxígeno.» |
| 13.8–16.1 s | ««Houston, hemos tenido un problema».» |
| 16.1–20.8 s | «Tuvieron que abandonar el alunizaje y usar el módulo lunar como bote salvavidas.» |
| 20.8–23.8 s | «Pero el aire empezó a llenarse de dióxido de carbono.» |
| 23.8–28.0 s | «Los filtros de la nave eran cuadrados, y los del módulo, redondos.» |
| 28.0–34.1 s | «En la Tierra, los ingenieros inventaron un adaptador con lo que había a bordo. Y funcionó.» |
| 34.1–37.9 s | «El 17 de abril, los tres volvieron a casa con vida.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `i19_espacio` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `i19_cohete` | pan vertical ascendente | — | — |
| 3 | `i19_espacio` | crash zoom | — | — |
| 4 | `i19_cabina` | la cámara pasa por detrás del personaje | astronauta | — |
| 5 | `i19_espacio` | plano general que se abre | — | — |
| 6 | `i19_cabina` | primer plano de detalle | astronauta; astronauta | — |
| 7 | `i19_control` | órbita con giro suave | nasa; nasa | iconos ⬛ ⚫ |
| 8 | `i19_control` | giro de cámara | nasa; nasa | — |
| 9 | `i19_oceano` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / APOLO 13. Cierre: APOLO 13 / EL FRACASO MÁS EXITOSO.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `i19_cohete`: Saturn V rocket launching from Florida in 1970, fire and smoke, blue sky
- `i19_espacio`: a damaged spacecraft in space with gas venting, Earth and Moon in the distance
- `i19_cabina`: cramped 1970s spacecraft cabin interior with switches and small windows, cold light
- `i19_control`: 1970s mission control room in Houston with consoles and engineers
- `i19_oceano`: a space capsule with parachutes landing in the Pacific ocean, ship nearby

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- NASA: Apollo 13 mission report (1970)
- Jim Lovell y Jeffrey Kluger, «Lost Moon» (1994)
