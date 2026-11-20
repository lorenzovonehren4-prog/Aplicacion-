# El hombre de hielo — plan de producción (33 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–5.0 s | «¿Sabías que unos excursionistas encontraron en los Alpes a un hombre muerto hace 5.300 años?» |
| 5.0–8.6 s | «Fue en 1991, en la frontera entre Austria e Italia.» |
| 8.6–11.3 s | «Al principio creyeron que era un montañista reciente.» |
| 11.3–15.5 s | «Pero tenía unos 5.300 años. Lo llamaron Ötzi.» |
| 15.5–20.8 s | «Llevaba un hacha de cobre, un arco y ropa de piel. Y tenía más de 60 tatuajes.» |
| 20.8–24.0 s | «En 2001, una radiografía reveló algo sorprendente.» |
| 24.0–26.2 s | «Tenía una punta de flecha clavada en el hombro.» |
| 26.2–29.3 s | «Ötzi fue, probablemente, víctima de un asesinato.» |
| 29.3–33.0 s | «Hoy se conserva a temperatura de glaciar, en un museo de Italia.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `j06_alpes` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `j06_glaciar` | plano general que se abre | explorador; estudiante | — |
| 3 | `j06_glaciar` | primer plano de detalle | explorador | — |
| 4 | `j06_glaciar` | crash zoom | — | texto «5.300 AÑOS» |
| 5 | `j06_neolitico` | la cámara pasa por detrás del personaje | — | — |
| 6 | `j06_lab` | órbita con giro suave | cientifica; cientifico | — |
| 7 | `j06_lab` | giro de cámara | — | texto «ASESINADO» |
| 8 | `j06_neolitico` | tracking lateral | — | — |
| 9 | `j06_museo` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / EL HOMBRE DE HIELO. Cierre: ÖTZI / 5.300 AÑOS.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `j06_alpes`: snowy Alps mountains with a glacier and hikers path, sunny
- `j06_glaciar`: melting glacier ice with rocks in the high mountains
- `j06_lab`: modern laboratory with x-ray screens and scientists in white coats
- `j06_neolitico`: prehistoric alpine valley 5000 years ago with a small village and forest
- `j06_museo`: cold museum room with a glass window and soft blue light

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Museo de Arqueología del Tirol del Sur: Ötzi
- Britannica: Ötzi
