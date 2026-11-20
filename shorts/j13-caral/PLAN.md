# La ciudad más antigua de américa — plan de producción (34 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–4.2 s | «¿Sabías que en Perú hay una ciudad tan antigua como las pirámides de Egipto?» |
| 4.2–8.3 s | «Se llama Caral, y está en el valle de Supe, al norte de Lima.» |
| 8.3–11.1 s | «Tiene unos 5.000 años.» |
| 11.1–14.0 s | «Es considerada la ciudad más antigua de América.» |
| 14.0–17.5 s | «Tenía pirámides, templos y grandes plazas circulares.» |
| 17.5–21.7 s | «Y algo curioso: no se han encontrado señales de guerra ni armas.» |
| 21.7–25.8 s | «La arqueóloga Ruth Shady dirige su investigación desde los años 90.» |
| 25.8–30.5 s | «Allí se encontró, incluso, uno de los quipus más antiguos conocidos.» |
| 30.5–33.6 s | «Desde 2009 es Patrimonio de la Humanidad.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `j13_piramides` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `j13_valle` | plano general que se abre | — | — |
| 3 | `j13_piramides` | crash zoom | — | texto «5.000 AÑOS» |
| 4 | `j13_piramides` | pan vertical ascendente | — | — |
| 5 | `j13_ciudad` | órbita con giro suave | nazca; nazca2 | — |
| 6 | `j13_ciudad` | la cámara pasa por detrás del personaje | — | texto «SIN ARMAS» |
| 7 | `j13_excavacion` | tracking lateral | cientifica | — |
| 8 | `j13_excavacion` | giro de cámara | — | — |
| 9 | `j13_unesco` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / LA CIUDAD MÁS ANTIGUA DE AMÉRICA. Cierre: CARAL / 5.000 AÑOS.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `j13_valle`: green Supe valley in Peru with desert hills and a river, sunny
- `j13_piramides`: ancient stepped stone pyramids and circular plazas in the Peruvian desert, Caral
- `j13_ciudad`: ancient city in the Andes coast 5000 years ago with people, plazas and pyramids
- `j13_excavacion`: archaeologists working on stone walls in the desert with hats
- `j13_unesco`: wide view of ancient desert ruins at sunset with mountains

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Zona Arqueológica Caral (Ministerio de Cultura del Perú)
- UNESCO: Ciudad sagrada de Caral-Supe
