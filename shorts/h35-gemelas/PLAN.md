# Las gemelas silenciosas — plan de producción (35 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–4.2 s | «¿Sabías que dos gemelas decidieron hablar solo entre ellas, y con nadie más en el mundo?» |
| 4.2–6.6 s | «Eran June y Jennifer Gibbons, de Gales.» |
| 6.6–9.6 s | «Desde niñas apenas hablaban con sus padres o sus maestros.» |
| 9.6–12.9 s | «Entre ellas usaban un habla tan rápida que nadie más la entendía.» |
| 12.9–17.0 s | «De adolescentes escribieron novelas y diarios, y cometieron delitos menores.» |
| 17.0–20.3 s | «Pasaron once años internadas en el hospital psiquiátrico de Broadmoor.» |
| 20.3–24.7 s | «June contó después que habían acordado que una de las dos debía morir para que la otra fuera libre.» |
| 24.7–30.0 s | «En 1993, el día de su traslado, Jennifer murió de una inflamación del corazón.» |
| 30.0–35.4 s | «Después, June empezó a hablar con los demás. ¿Coincidencia… o algo más?» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `h35_cuarto` | la cámara pasa por detrás del personaje | gemela; gemela | — |
| 2 | `h35_gales` | plano general que se abre | — | texto «LAS GEMELAS SILENCIOSAS» |
| 3 | `h35_cuarto` | órbita con giro suave | gemela; gemela | — |
| 4 | `h35_cuarto` | primer plano de detalle | gemela; gemela | iconos 💬 |
| 5 | `h35_cuadernos` | travelling que pasa por detrás de un objeto en primer plano | — | iconos 📓 📓 |
| 6 | `h35_hospital` | crash zoom | gemela; gemela | — |
| 7 | `h35_hospital` | giro de cámara | — | texto «UN PACTO» |
| 8 | `h35_ventana` | dolly in lento | — | — |
| 9 | `h35_ventana` | dolly out de cierre | gemela | — |

Título de entrada: ¿SABÍAS QUE...? / LAS GEMELAS SILENCIOSAS. Cierre: ¿COINCIDENCIA / O ALGO MÁS? 👥.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `h35_cuarto`: dark 1970s bedroom with two identical beds and a small window, dim light
- `h35_gales`: grey small town in Wales with row houses and rain
- `h35_cuadernos`: wooden desk with two identical notebooks and a candle at night
- `h35_hospital`: long corridor of an old psychiatric hospital, cold light
- `h35_ventana`: hospital room window with soft morning light

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Marjorie Wallace, The Silent Twins (1986)
- Reportajes de la BBC y The Guardian sobre June y Jennifer Gibbons
