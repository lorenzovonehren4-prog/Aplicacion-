# ¿Por qué EE. UU. no quiere que Irán enriquezca uranio? — plan de producción

Hecho según `shorts/SISTEMA.md`. Texto exacto de la voz en `guion.json`; escenas en `escenas.js`; sonido en `pista.json`.

## A. Investigación
- El uranio natural tiene un 0,7 % de U-235. Las centrales usan del 3 al 5 %; las armas, en torno al 90 %.
- PAIC (JCPOA), 2015: límite del 3,67 %. EE. UU. se retira en 2018. Irán llega al 60 % (OIEA).
- Del 60 % al 90 % queda la menor parte del trabajo de separación (unidades SWU), por eso «el salto más corto».
- Junio de 2025: ataques a Natanz, Fordo e Isfahán. El 28 de febrero de 2026 empieza una guerra abierta (EE. UU. e Israel contra Irán).
- El OIEA cree que algo más de 200 kg al 60 % siguen en los túneles de Isfahán, pero no puede verificarlo (Grossi, marzo de 2026). Irán dice que no ha reanudado el enriquecimiento (abril de 2026).
- Posturas: EE. UU. exige recortes («meaningful cut», Vance, octubre de 2026); Irán defiende su derecho a enriquecer.
Fuentes: Reuters/Al-Monitor/US News («The status of Iran's uranium enrichment programme», octubre de 2026); CRS (R40094, IF12106); World Nuclear Association.

## B. Guion
- **h1**: Un solo número separa la electricidad de una bomba atómica. E Irán llegó más cerca que ningún país sin armas nucleares.
- **c1**: El uranio natural tiene menos de un uno por ciento de uranio 235: el que se puede partir para liberar energía.
- **c2**: Para aumentarlo hay que enriquecerlo, con miles de centrifugadoras girando a velocidades enormes.
- **c3**: Del 3 al 5 %, sirve para una central eléctrica.
- **c4**: Al 90 %, sirve para una bomba.
- **d1**: En 2015, Irán firmó un acuerdo: no pasaría del 3,67 % a cambio de que le quitaran sanciones.
- **d2**: En 2018, Estados Unidos abandonó el acuerdo. E Irán empezó a enriquecer más.
- **d3**: Llegó al 60 %. Y el salto del 60 al 90 es el más corto de todo el camino.
- **r1**: Irán dice que su programa es pacífico. Estados Unidos e Israel no le creen.
- **r2**: En junio de 2025 bombardearon Natanz, Fordo e Isfahán. Y en febrero de 2026 empezó una guerra abierta.
- **r3**: El organismo nuclear de la ONU cree que más de 200 kg al 60 % siguen en túneles de Isfahán. Pero no puede comprobarlo.
- **f1**: Por eso Washington exige que Irán deje de enriquecer. E Irán responde que no renunciará a su derecho.
- **f2**: Todo depende de un número: ¿60… o 90?

Nombres, fechas y cifras van destacados en amarillo en los subtítulos; las pausas más largas van antes de las revelaciones (`gap` en `guion.json`).

## C. Biblia visual
Explicador sin personajes reales: técnicos de bata, diplomáticos genéricos, medidor de enriquecimiento, centrifugadoras y banderas.

## D. Storyboard (segundos aproximados)
| Tiempo | Plano | Cámara |
| --- | --- | --- |
| 0–5 | Roca de uranio; ciudad iluminada contra destello | pantalla partida |
| 5–10 | 140 puntos con dos de U-235 | fijo |
| 10–15 | Cascada de centrifugadoras | pull out |
| 15–22 | Medidor: del 3–5 % al 90 % | sube el nivel |
| 22–28 | Firma de 2015 | dolly |
| 28–32 | EE. UU. sale; el medidor rompe el tope | fundido |
| 32–38 | 60 % y flecha hacia el 90 % | fijo |
| 38–41 | Banderas enfrentadas | fijo |
| 41–48 | Mapa: B-2 sobre Natanz, Fordo e Isfahán | zoom |
| 48–55 | Túneles con contenedores «?» e inspector bloqueado | dolly |
| 55–59 | Posturas: 0 % contra derecho a enriquecer | texto |
| 59–62 | Medidor oscilando en 60 | pull out |

## E. Prompts de generación
No hay imágenes generadas con IA: cada plano es código en `escenas.js`, que usa el motor común (`../motor/motor.js`: personajes con ficha, ejércitos, mapas de Natural Earth, vehículos, efectos y cámara por fotogramas clave). Voz: Piper `es_MX-claude-high`. Música y efectos sintetizados en `motor/sonido.py` según `pista.json`.

## F. Montaje
`python3 motor/voz.py <carpeta> <modelos Piper> 0.74` → `python3 motor/sonido.py <carpeta>` → `NODE_PATH=$(npm root -g) node motor/render.mjs <carpeta> <carpeta>/<carpeta>.mp4`. Exporta 1080×1920, 30 FPS, H.264 + AAC, sonoridad normalizada a −14 LUFS.

## G. Evaluación
| Criterio | Nota | Comentario |
| --- | --- | --- |
| Gancho | 8 | Imagen clara. |
| Claridad narrativa | 9 | El medidor explica lo esencial. |
| Calidad visual | 6 | Funcional. |
| Cámara | 5 | Más fija. |
| Animación | 4 | Casi sin personajes. |
| Iluminación | 6 | Correcta. |
| Sonido | 6 | Correcta. |
| Ritmo | 8 | Bien. |
| Continuidad | 8 | Bien. |
| Potencial de retención | 8 | Tema muy buscado. |

**Límites comunes:** la animación por código no tiene sincronía labial ni poses complejas, y la voz y la música son gratuitas y sintetizadas. Mejoraría con una voz profesional, música con licencia y más primeros planos.

## Retención (segunda pasada)
Gancho reescrito con giro o pregunta abierta, texto grande desde el primer cuadro (también se entiende sin sonido), voz un 5 % más rápida, pausas un 30 % más cortas, golpe de sonido en cada corte de escena y un microzoom en cada bloque de subtítulo (un cambio visual cada 1,5–2 s).
