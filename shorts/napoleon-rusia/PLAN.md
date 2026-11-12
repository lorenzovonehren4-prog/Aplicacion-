# Napoleón en Rusia (1812) — plan de producción

Hecho según `shorts/SISTEMA.md`. Texto exacto de la voz en `guion.json`; escenas en `escenas.js`; sonido en `pista.json`.

## A. Investigación
- Napoleón cruza el Niemen el 24 de junio de 1812 con más de 400.000 hombres en el grupo principal (unos 600.000 en total, contando reservas).
- Causa: el zar Alejandro I deja el Sistema Continental (bloqueo a Gran Bretaña) en 1810–1811.
- Rusia usa la tierra quemada. Borodinó (7 de septiembre): unas 70.000 bajas entre ambos bandos.
- Entrada en Moscú el 14 de septiembre; el incendio empieza esa noche. Retirada desde el 19 de octubre. Berézina, 26–29 de noviembre: los pontoneros de Éblé construyen puentes dentro del agua helada.
- Regresaron unas decenas de miles; las estimaciones varían.
Fuentes: Adam Zamoyski, *1812: Napoleon's Fatal March on Moscow*; Britannica («French invasion of Russia»).

## B. Guion
- **h1**: Napoleón entró en Rusia con más de 400.000 soldados. Volvieron muy pocos. Y no fue por las balas.
- **c1**: 1812. Napoleón domina casi toda Europa.
- **c2**: Pero el zar Alejandro deja de cumplir el bloqueo contra Gran Bretaña, y Napoleón decide castigarlo.
- **c3**: En junio cruza el río Niemen con más de 400.000 hombres.
- **d1**: Pero los rusos no le dan la batalla que busca. Se retiran... y queman todo a su paso.
- **d2**: En Borodinó, en septiembre, chocan por fin. En un solo día caen más de 70.000 hombres entre muertos y heridos.
- **d3**: Napoleón entra en Moscú. La ciudad está vacía. Y esa misma noche empieza a arder.
- **r1**: Espera un mes la rendición del zar. Nunca llega.
- **r2**: En octubre ordena la retirada. Y llega el invierno: hambre, nieve, y cosacos atacando la columna.
- **r3**: En el río Berézina, sus ingenieros construyen puentes metidos en el agua helada para que el ejército escape.
- **f1**: De aquel ejército gigantesco, solo volvieron unas decenas de miles.
- **f2**: Fue el principio del fin de Napoleón.

Nombres, fechas y cifras van destacados en amarillo en los subtítulos; las pausas más largas van antes de las revelaciones (`gap` en `guion.json`).

## C. Biblia visual
Napoleón: bicornio, capote gris y calzón blanco. Franceses de azul con correajes blancos y chacó con penacho rojo; rusos de verde; cosacos de azul oscuro con gorro de piel. En la retirada, los uniformes se desgastan y aparecen gorros de piel: la continuidad cambia por una razón narrativa.

## D. Storyboard (segundos aproximados)
| Tiempo | Plano | Cámara |
| --- | --- | --- |
| 0–3 | Gran Ejército en verano | travelling lateral |
| 3–6 | La misma columna, diezmada en la nieve | corte por contraste |
| 6–9 | Mapa del Imperio francés y Rusia | travelling sobre el mapa |
| 9–13 | Napoleón enfadado con una carta | push in |
| 13–17 | Cruce del Niemen | travelling |
| 17–22 | Aldeas quemadas y rusos en retirada | dolly |
| 22–28 | Borodinó: carga y humo | temblor |
| 28–33 | Moscú vacía, luego en llamas | dolly |
| 33–36 | Napoleón ante la ventana con el fuego | push in |
| 36–41 | Retirada en la nieve y cosacos | travelling |
| 41–46 | Puentes del Berézina | grúa |
| 46–52 | Últimos supervivientes y Napoleón solo | pull out |

## E. Prompts de generación
No hay imágenes generadas con IA: cada plano es código en `escenas.js`, que usa el motor común (`../motor/motor.js`: personajes con ficha, ejércitos, mapas de Natural Earth, vehículos, efectos y cámara por fotogramas clave). Voz: Piper `es_MX-claude-high`. Música y efectos sintetizados en `motor/sonido.py` según `pista.json`.

## F. Montaje
`python3 motor/voz.py <carpeta> <modelos Piper> 0.74` → `python3 motor/sonido.py <carpeta>` → `NODE_PATH=$(npm root -g) node motor/render.mjs <carpeta> <carpeta>/<carpeta>.mp4`. Exporta 1080×1920, 30 FPS, H.264 + AAC, sonoridad normalizada a −14 LUFS.

## G. Evaluación
| Criterio | Nota | Comentario |
| --- | --- | --- |
| Gancho | 8 | Contraste verano–invierno fuerte. |
| Claridad narrativa | 8 | Cronología clara. |
| Calidad visual | 6 | Correcta. |
| Cámara | 7 | Variada. |
| Animación | 5 | Simple. |
| Iluminación | 7 | El fuego y la nieve funcionan. |
| Sonido | 6 | Viento y cañones con peso. |
| Ritmo | 8 | Rápido. |
| Continuidad | 8 | Bien. |
| Potencial de retención | 7 | Gran arco narrativo. |

**Límites comunes:** la animación por código no tiene sincronía labial ni poses complejas, y la voz y la música son gratuitas y sintetizadas. Mejoraría con una voz profesional, música con licencia y más primeros planos.

## Retención (segunda pasada)
Gancho reescrito con giro o pregunta abierta, texto grande desde el primer cuadro (también se entiende sin sonido), voz un 5 % más rápida, pausas un 30 % más cortas, golpe de sonido en cada corte de escena y un microzoom en cada bloque de subtítulo (un cambio visual cada 1,5–2 s).
