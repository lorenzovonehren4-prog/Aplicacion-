# Las luces de hessdalen — plan de producción (34 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–4.9 s | «¿Sabías que en un valle de Noruega aparecen esferas de luz flotantes que la ciencia estudia desde hace décadas?» |
| 4.9–6.2 s | «Es el valle de Hessdalen.» |
| 6.2–11.4 s | «A principios de los años 80, los vecinos empezaron a ver luces blancas, amarillas y rojas.» |
| 11.4–14.9 s | «Algunas flotaban quietas; otras cruzaban el valle a gran velocidad.» |
| 14.9–19.9 s | «Desde 1983, científicos las vigilan con radares y cámaras automáticas.» |
| 19.9–22.0 s | «Y han confirmado que el fenómeno es real.» |
| 22.0–25.3 s | «Una hipótesis: el valle funcionaría como una batería natural.» |
| 25.3–30.3 s | «Los minerales del suelo y el agua del río generarían electricidad, y con ella, luz en el aire.» |
| 30.3–34.4 s | «Pero nadie lo ha demostrado del todo. ¿Qué causa ese brillo?» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `h29_valle` | travelling que pasa por detrás de un objeto en primer plano | — | iconos 💡 |
| 2 | `h29_valle` | plano general que se abre | — | texto «HESSDALEN» |
| 3 | `h29_valle` | la cámara pasa por detrás del personaje | campesino | — |
| 4 | `h29_cielo` | tracking lateral | — | iconos 💡 🔴 |
| 5 | `h29_estacion` | órbita con giro suave | cientifico; cientifica | — |
| 6 | `h29_lab` | crash zoom | cientifica | texto «ES REAL» |
| 7 | `h29_rio` | giro de cámara | cientifico | texto «¿BATERÍA NATURAL?» |
| 8 | `h29_rio` | primer plano de detalle | — | iconos ⚡ |
| 9 | `h29_cielo` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / LAS LUCES DE HESSDALEN. Cierre: ¿QUÉ CAUSA / ESTE BRILLO? 💡.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `h29_valle`: remote Norwegian valley at night with snowy mountains, small farms, and glowing white orbs of light floating in the air
- `h29_estacion`: small scientific measurement station with antennas and cameras on a snowy hill in Norway at night
- `h29_rio`: river in a Norwegian valley at night with rocks and mountains, a faint glowing orb
- `h29_cielo`: starry night sky over snowy mountains with a bright moving orb of light
- `h29_lab`: small science cabin with radar screens and instruments at night

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Project Hessdalen (Østfold University College)
- Monari y otros, hipótesis de la batería natural (2014)
