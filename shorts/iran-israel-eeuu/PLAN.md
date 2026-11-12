# Irán contra Israel y EE. UU. (1979–2026) — plan de producción

Hecho según `shorts/SISTEMA.md`. Texto exacto de la voz en `guion.json`; escenas en `escenas.js`; sonido en `pista.json`.

## A. Investigación
- Revolución islámica (1979); toma de la embajada de EE. UU.: 52 rehenes durante 444 días. Jomeini llama a EE. UU. «el gran Satán».
- Red de aliados de Irán: Hezbolá, Hamás y los hutíes.
- 13–14 de abril de 2024: primer ataque directo de Irán contra Israel, con más de 300 drones y misiles.
- Guerra de los 12 días (13–24 de junio de 2025); el 22 de junio, B-2 estadounidenses atacan Fordo (Operación Midnight Hammer).
- 28 de febrero de 2026: EE. UU. (Epic Fury) e Israel atacan Irán; muere el líder supremo Alí Jamenei. Irán responde contra bases de EE. UU. en el Golfo y cierra de hecho el estrecho de Ormuz (CRS R48887).
- Alto el fuego indefinido (21 de abril), memorando (17 de junio), ruptura (8 de julio), nuevos ataques (septiembre). Mojtabá Jamenei es el nuevo líder supremo. Por Ormuz pasa cerca de una quinta parte del petróleo mundial (EIA).
- Noviembre de 2026: negociaciones con mediación de Catar; Trump dice que Irán «militarmente está prácticamente acabado»; no hay acuerdo de paz firmado.
Fuentes: CRS R48887 (septiembre de 2026); Britannica («2026 Iran war»); Times of Israel (directos del 2 y el 10 de noviembre de 2026); Business Standard; Al Jazeera; Brookings. Hay discrepancias entre fuentes sobre fechas posteriores a julio; el guion solo usa lo coincidente.

## B. Guion
- **h1**: 28 de febrero de 2026. Estados Unidos e Israel atacan Irán, y matan a su líder supremo.
- **c1**: Pero esta historia empieza en 1979, cuando una revolución convierte a Irán en una república islámica.
- **c2**: El nuevo régimen llama a Estados Unidos «el gran Satán», y retiene a 52 diplomáticos estadounidenses durante 444 días.
- **c3**: Después, Irán arma y financia a grupos en la región: Hezbolá en el Líbano, Hamás en Gaza, los hutíes en Yemen.
- **d1**: Israel ve un Irán con la bomba atómica como una amenaza para su existencia.
- **d2**: En abril de 2024, por primera vez, Irán ataca Israel directamente, con cientos de drones y misiles.
- **d3**: En junio de 2025 llega la guerra de los 12 días. Y Estados Unidos bombardea Fordo con bombarderos B-2.
- **r1**: En 2026 llega la guerra abierta. Irán dispara contra bases estadounidenses en todo el Golfo, y bloquea de hecho el estrecho de Ormuz.
- **r2**: Por ahí pasa cerca de una quinta parte del petróleo del mundo.
- **r3**: Hay altos el fuego, rupturas y negociaciones. Mojtabá Jamenei, hijo del líder muerto, es el nuevo líder supremo.
- **f1**: En noviembre de 2026, Trump dice que la guerra está prácticamente terminada. Pero todavía no hay un acuerdo de paz firmado.
- **f2**: Y la gran pregunta sigue abierta.

Nombres, fechas y cifras van destacados en amarillo en los subtítulos; las pausas más largas van antes de las revelaciones (`gap` en `guion.json`).

## C. Biblia visual
Sin líderes vivos dibujados; los nombres aparecen solo en rótulos. Escenas: Teherán de noche, multitudes de 1979, embajada, mapas, Fordo con el B-2, Ormuz con petroleros y mesa de negociación genérica.

## D. Storyboard (segundos aproximados)
| Tiempo | Plano | Cámara |
| --- | --- | --- |
| 0–6 | Teherán de noche: misiles y explosiones | pull out |
| 6–11 | 1979: multitud con banderas | travelling |
| 11–17 | Embajada y rehenes (52 · 444) | dolly |
| 17–24 | Mapa de aliados de Irán | flechas |
| 24–29 | Símbolo nuclear sobre Irán | zoom |
| 29–34 | Abril de 2024: arcos de misiles | dolly |
| 34–44 | Junio de 2025: B-2 sobre Fordo, título | travelling |
| 44–50 | Misiles contra bases del Golfo y Ormuz | zoom |
| 50–55 | Ormuz bloqueado (≈20 %) | dolly |
| 55–62 | Cronología de 2026 y rótulo de Mojtabá Jamenei | texto |
| 62–67 | Negociación | dolly |
| 67–70 | Interrogante sobre Irán | pull out |

## E. Prompts de generación
No hay imágenes generadas con IA: cada plano es código en `escenas.js`, que usa el motor común (`../motor/motor.js`: personajes con ficha, ejércitos, mapas de Natural Earth, vehículos, efectos y cámara por fotogramas clave). Voz: Piper `es_MX-claude-high`. Música y efectos sintetizados en `motor/sonido.py` según `pista.json`.

## F. Montaje
`python3 motor/voz.py <carpeta> <modelos Piper> 0.74` → `python3 motor/sonido.py <carpeta>` → `NODE_PATH=$(npm root -g) node motor/render.mjs <carpeta> <carpeta>/<carpeta>.mp4`. Exporta 1080×1920, 30 FPS, H.264 + AAC, sonoridad normalizada a −14 LUFS.

## G. Evaluación
| Criterio | Nota | Comentario |
| --- | --- | --- |
| Gancho | 9 | Fecha y hecho impactantes. |
| Claridad narrativa | 8 | Mucho contexto bien ordenado. |
| Calidad visual | 6 | Mapas correctos. |
| Cámara | 6 | Variada. |
| Animación | 4 | Pocos personajes. |
| Iluminación | 6 | Noche bien. |
| Sonido | 6 | Sirenas y explosiones. |
| Ritmo | 8 | Bien. |
| Continuidad | 8 | Bien. |
| Potencial de retención | 8 | Tema actual. |

**Límites comunes:** la animación por código no tiene sincronía labial ni poses complejas, y la voz y la música son gratuitas y sintetizadas. Mejoraría con una voz profesional, música con licencia y más primeros planos.
