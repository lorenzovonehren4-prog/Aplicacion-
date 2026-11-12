# Rusia y Ucrania: por qué empezó la guerra — plan de producción

Hecho según `shorts/SISTEMA.md`. Texto exacto de la voz en `guion.json`; escenas en `escenas.js`; sonido en `pista.json`.

## A. Investigación
- 1991: disolución de la URSS e independencia de Ucrania, con una amplia población rusohablante.
- 2014: protestas del Maidán; cae Yanukóvich; Rusia anexiona Crimea; guerra en el Donbás con separatistas apoyados por Moscú.
- Argumentos: el Kremlin habla de la expansión de la OTAN y del «mundo ruso»; Ucrania y Occidente defienden su soberanía y su derecho a elegir alianzas.
- 24 de febrero de 2022: invasión por el norte, el este y el sur. Rusia se retira del norte (abril de 2022) y mantiene gran parte del este y el sur.
- Bajas: cientos de miles entre muertos y heridos (estimaciones de varias fuentes; ninguna es oficial y completa).
- Noviembre de 2026: conversaciones trilaterales EE. UU.–Rusia–Ucrania en Abu Dabi; el Donbás es el gran obstáculo; los combates siguen (ISW, 10 de noviembre de 2026).
- Las áreas ocupadas del mapa son aproximadas y así se rotulan.
Fuentes: ISW (10-11-2026, vía Kyiv Post); Britannica («Russia-Ukraine War»); BBC/Reuters como contexto.

## B. Guion
- **h1**: Es la guerra más grande en Europa desde 1945. ¿Por qué empezó?
- **c1**: En 1991 se desintegra la Unión Soviética, y Ucrania se independiza, con millones de habitantes que hablan ruso.
- **c2**: Durante años, el país duda entre acercarse a Europa o a Rusia.
- **c3**: En 2014, protestas masivas en Kiev hacen caer a un presidente cercano a Moscú.
- **d1**: Rusia responde anexionándose Crimea. Y en el Donbás estalla una guerra con separatistas apoyados por Moscú.
- **d2**: Putin dice que la OTAN se acerca demasiado a sus fronteras, y que Ucrania es parte del mundo ruso.
- **d3**: Ucrania y Occidente responden que es un país soberano que puede elegir sus alianzas.
- **r1**: 24 de febrero de 2022: Rusia invade Ucrania por el norte, el este y el sur.
- **r2**: Kiev resiste. Rusia se retira del norte, pero se queda con gran parte del este y del sur.
- **r3**: Desde entonces: trincheras, drones y bombardeos. Los muertos y heridos se cuentan por cientos de miles.
- **f1**: En noviembre de 2026 hay negociaciones en Abu Dabi. Pero la guerra sigue, y el Donbás es el gran obstáculo.
- **f2**: Una guerra por un mapa... y por el futuro de Europa.

Nombres, fechas y cifras van destacados en amarillo en los subtítulos; las pausas más largas van antes de las revelaciones (`gap` en `guion.json`).

## C. Biblia visual
Sin líderes vivos dibujados. Soldados con uniforme genérico; civiles de colores; banderas; trincheras con drones.

## D. Storyboard (segundos aproximados)
| Tiempo | Plano | Cámara |
| --- | --- | --- |
| 0–5 | Trinchera con drones y explosiones | pull out |
| 5–10 | La URSS se divide | zoom a Ucrania |
| 10–14 | Ucrania entre la UE y Rusia | flechas |
| 14–18 | Maidán de noche | travelling |
| 18–25 | Crimea y el Donbás | zoom |
| 25–30 | Expansión de la OTAN | flechas |
| 30–35 | Bandera de Ucrania y civiles | fijo |
| 35–40 | Invasión por tres frentes | flechas |
| 40–45 | Retirada del norte y zona ocupada | zoom |
| 45–51 | Trinchera, drones, cifra de bajas | dolly |
| 51–56 | Mesa de Abu Dabi | dolly |
| 56–61 | Mapa final | pull out |

## E. Prompts de generación
No hay imágenes generadas con IA: cada plano es código en `escenas.js`, que usa el motor común (`../motor/motor.js`: personajes con ficha, ejércitos, mapas de Natural Earth, vehículos, efectos y cámara por fotogramas clave). Voz: Piper `es_MX-claude-high`. Música y efectos sintetizados en `motor/sonido.py` según `pista.json`.

## F. Montaje
`python3 motor/voz.py <carpeta> <modelos Piper> 0.74` → `python3 motor/sonido.py <carpeta>` → `NODE_PATH=$(npm root -g) node motor/render.mjs <carpeta> <carpeta>/<carpeta>.mp4`. Exporta 1080×1920, 30 FPS, H.264 + AAC, sonoridad normalizada a −14 LUFS.

## G. Evaluación
| Criterio | Nota | Comentario |
| --- | --- | --- |
| Gancho | 8 | Pregunta directa. |
| Claridad narrativa | 9 | Muy claro. |
| Calidad visual | 6 | Mapas correctos. |
| Cámara | 6 | Variada. |
| Animación | 4 | Pocos personajes. |
| Iluminación | 6 | Correcta. |
| Sonido | 6 | Correcta. |
| Ritmo | 8 | Bien. |
| Continuidad | 8 | Bien. |
| Potencial de retención | 8 | Tema actual. |

**Límites comunes:** la animación por código no tiene sincronía labial ni poses complejas, y la voz y la música son gratuitas y sintetizadas. Mejoraría con una voz profesional, música con licencia y más primeros planos.
