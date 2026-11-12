# Israel y Palestina: cómo empezó todo — plan de producción

Hecho según `shorts/SISTEMA.md`. Texto exacto de la voz en `guion.json`; escenas en `escenas.js`; sonido en `pista.json`.

## A. Investigación
- Antes de 1917, el territorio era parte del Imperio otomano, con mayoría árabe. El sionismo moderno se organiza en Basilea en 1897.
- Declaración Balfour (1917) y Mandato británico (1920/1922). Inmigración judía en las décadas de 1920–1940.
- Resolución 181 de la ONU (29-11-1947): 33 a favor, 13 en contra, 10 abstenciones. La Agencia Judía acepta y el Alto Comité Árabe y los Estados árabes rechazan.
- 1948: Israel proclama su independencia; Egipto, Transjordania, Siria, Irak y Líbano intervienen. Entre 700.000 y 750.000 palestinos huyen o son expulsados (Nakba).
- 1967: Israel ocupa Gaza, Cisjordania, Jerusalén Este, el Sinaí y el Golán (el guion nombra los tres primeros, los territorios palestinos).
- Oslo (1993). Hamás toma Gaza (2007); bloqueo israelí y egipcio.
- 7 de octubre de 2023: unos 1.200 muertos en Israel y 251 secuestrados.
- Guerra en Gaza: el Ministerio de Salud de Gaza superaba los 73.000 muertos en 2026; Israel discute la cifra, y la ONU y expertos independientes la consideran en general fiable. Se atribuye siempre al ministerio.
- Alto el fuego desde el 10 de octubre de 2025, con violaciones y muertes posteriores (más de 1.400 según el ministerio hasta octubre–noviembre de 2026).
Fuentes: ONU (A/RES/181); Britannica; AP/PBS (cifra de 73.000, junio de 2026); Gisha («Gaza Now», noviembre de 2026); Wikipedia como guía, contrastada.

## B. Guion
- **h1**: Dos pueblos reclaman la misma tierra. Y llevan más de cien años sin ponerse de acuerdo.
- **c1**: Hace poco más de un siglo, esta tierra es parte del Imperio otomano, y la mayoría de sus habitantes son árabes.
- **c2**: Entonces nace el sionismo: un movimiento que busca un Estado judío en su tierra histórica.
- **c3**: En 1917, Gran Bretaña promete un hogar nacional judío allí. Y llegan miles de judíos huyendo de la persecución en Europa.
- **d1**: 1947: la ONU propone dos Estados. Los líderes judíos aceptan; los árabes, no.
- **d2**: 1948: nace Israel, y cinco ejércitos árabes lo atacan.
- **d3**: Israel gana. Más de 700.000 palestinos huyen o son expulsados. Ellos lo llaman la Nakba: la catástrofe.
- **d4**: 1967: en seis días, Israel ocupa Gaza, Cisjordania y Jerusalén Este.
- **d5**: En 1993, los acuerdos de Oslo prometen la paz. Nunca llega del todo.
- **d6**: En 2007, Hamás toma el control de Gaza, e Israel y Egipto la bloquean.
- **r1**: Y el 7 de octubre de 2023, Hamás ataca Israel: unas 1.200 personas mueren y 251 son secuestradas.
- **r2**: Israel responde con una guerra en Gaza. Según el Ministerio de Salud de Gaza, más de 73.000 palestinos han muerto.
- **r3**: Desde octubre de 2025 hay un alto el fuego. Pero los ataques no han parado del todo.
- **f1**: Las mismas preguntas siguen sin respuesta: fronteras, Jerusalén, refugiados y seguridad.
- **f2**: Dos pueblos. Una misma tierra.

Nombres, fechas y cifras van destacados en amarillo en los subtítulos; las pausas más largas van antes de las revelaciones (`gap` en `guion.json`).

## C. Biblia visual
Sin líderes vivos dibujados. Históricos: Rabin (pelo canoso, traje oscuro) y Arafat (kufiya, uniforme verde). Civiles de colores variados, sin estereotipos. Jerusalén con la Cúpula de la Roca y la muralla. Ambas banderas con el mismo peso visual.

## D. Storyboard (segundos aproximados)
| Tiempo | Plano | Cámara |
| --- | --- | --- |
| 0–5 | Jerusalén al atardecer con las dos banderas | pull out |
| 5–10 | Mapa del Imperio otomano | zoom a Palestina |
| 10–14 | Flechas desde Europa (1897) | travelling |
| 14–20 | Puerto con barco, inmigrantes y bandera británica | dolly |
| 20–25 | Votación de la ONU 1947: 33 · 13 · 10 | push in |
| 25–29 | 1948: cinco ejércitos | flechas |
| 29–36 | Columna de refugiados | travelling lento |
| 36–41 | 1967 en el mapa | zoom |
| 41–45 | Oslo: Rabin y Arafat | dolly |
| 45–49 | Gaza y el bloqueo | zoom |
| 49–56 | 7 de octubre en el mapa (cohetes) | temblor |
| 56–63 | Ruinas en Gaza, con la cifra y su fuente | dolly |
| 63–68 | Alto el fuego | dolly |
| 68–76 | Las cuatro preguntas abiertas | texto |
| 76–82 | Jerusalén y título | push in |

## E. Prompts de generación
No hay imágenes generadas con IA: cada plano es código en `escenas.js`, que usa el motor común (`../motor/motor.js`: personajes con ficha, ejércitos, mapas de Natural Earth, vehículos, efectos y cámara por fotogramas clave). Voz: Piper `es_MX-claude-high`. Música y efectos sintetizados en `motor/sonido.py` según `pista.json`.

## F. Montaje
`python3 motor/voz.py <carpeta> <modelos Piper> 0.74` → `python3 motor/sonido.py <carpeta>` → `NODE_PATH=$(npm root -g) node motor/render.mjs <carpeta> <carpeta>/<carpeta>.mp4`. Exporta 1080×1920, 30 FPS, H.264 + AAC, sonoridad normalizada a −14 LUFS.

## G. Evaluación
| Criterio | Nota | Comentario |
| --- | --- | --- |
| Gancho | 8 | Gancho neutral y potente. |
| Claridad narrativa | 8 | Mucho contenido en 82 s, ordenado. |
| Calidad visual | 6 | Mapas correctos; ruinas sencillas. |
| Cámara | 6 | Bastante mapa. |
| Animación | 5 | Simple. |
| Iluminación | 6 | Correcta. |
| Sonido | 6 | Correcta. |
| Ritmo | 7 | Algo denso. |
| Continuidad | 8 | Bien. |
| Potencial de retención | 8 | Tema de máxima búsqueda. |

**Límites comunes:** la animación por código no tiene sincronía labial ni poses complejas, y la voz y la música son gratuitas y sintetizadas. Mejoraría con una voz profesional, música con licencia y más primeros planos.
