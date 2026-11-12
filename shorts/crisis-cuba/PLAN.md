# La crisis de los misiles (octubre de 1962) — plan de producción

Hecho según `shorts/SISTEMA.md`. Texto exacto de la voz en `guion.json`; escenas en `escenas.js`; sonido en `pista.json`.

## A. Investigación
- 13 días: del 16 al 28 de octubre de 1962. El U-2 fotografía las bases el 14 de octubre.
- Castro llega al poder en 1959; Bahía de Cochinos, en abril de 1961. Cuba está a unos 150 km de Florida.
- Kennedy anuncia la «cuarentena» naval el 22 de octubre. El 27 de octubre derriban el U-2 de Rudolf Anderson.
- Ese mismo día, en el submarino B-59, Vasili Arjípov se niega a autorizar el torpedo nuclear (testimonios recogidos por el National Security Archive).
- 28 de octubre: Jrushchov anuncia la retirada. Acuerdo: EE. UU. no invadirá Cuba y, en secreto, retirará sus misiles Júpiter de Turquía.
- La línea directa Washington–Moscú se instala en 1963 (era un télex, no un teléfono rojo; por eso el guion dice «línea directa»).
Fuentes: National Security Archive (GWU); JFK Library; Britannica («Cuban missile crisis»).

## B. Guion
- **h1**: En 1962, un solo hombre en un submarino evitó una guerra nuclear. Así llegamos hasta ahí.
- **c1**: Guerra Fría. Estados Unidos y la Unión Soviética compiten por todo.
- **c2**: En 1959, Fidel Castro toma el poder en Cuba, a unos 150 km de Florida, y se acerca a Moscú.
- **c3**: En 1961, Estados Unidos intenta derrocarlo en bahía de Cochinos, y fracasa.
- **d1**: Jrushchov decide instalar misiles nucleares en Cuba. En secreto.
- **d2**: Pero el 14 de octubre de 1962, un avión espía U-2 los fotografía.
- **d3**: Kennedy ordena un bloqueo naval alrededor de la isla. Y los barcos soviéticos se acercan.
- **r1**: El 27 de octubre, un U-2 es derribado sobre Cuba. Y un submarino soviético, acorralado, está a punto de disparar un torpedo nuclear.
- **r2**: Un oficial, Vasili Arjípov, se niega a autorizarlo.
- **r3**: Al día siguiente, Jrushchov acepta retirar los misiles. A cambio, Kennedy promete no invadir Cuba, y en secreto, retirar sus misiles de Turquía.
- **f1**: Después instalaron una línea directa entre Washington y Moscú.
- **f2**: 13 días… y el mundo siguió existiendo.

Nombres, fechas y cifras van destacados en amarillo en los subtítulos; las pausas más largas van antes de las revelaciones (`gap` en `guion.json`).

## C. Biblia visual
Kennedy: traje azul y corbata granate. Jrushchov: calvo, traje gris. Castro: uniforme verde olivo, gorra y barba. Arjípov: uniforme naval negro con gorra de oficial.

## D. Storyboard (segundos aproximados)
| Tiempo | Plano | Cámara |
| --- | --- | --- |
| 0–5 | Mapa: alcance de los misiles desde Cuba | zoom out |
| 5–9 | Mapa mundial: EE. UU. contra la URSS | travelling |
| 9–14 | Castro con la bandera cubana y palmeras | push in |
| 14–18 | Bahía de Cochinos en el mapa | zoom |
| 18–22 | Jrushchov firma en su despacho | dolly |
| 22–28 | U-2 sobre Cuba y foto de las bases | travelling y flash |
| 28–34 | Bloqueo naval en el mapa | zoom |
| 34–40 | Submarino bajo cargas de profundidad | temblor |
| 40–44 | Interior rojo: Arjípov dice que no | push in |
| 44–52 | Kennedy y Jrushchov, el acuerdo | dolly |
| 52–56 | Línea directa Washington–Moscú | travelling |
| 56–62 | Cuba y título | pull out |

## E. Prompts de generación
No hay imágenes generadas con IA: cada plano es código en `escenas.js`, que usa el motor común (`../motor/motor.js`: personajes con ficha, ejércitos, mapas de Natural Earth, vehículos, efectos y cámara por fotogramas clave). Voz: Piper `es_MX-claude-high`. Música y efectos sintetizados en `motor/sonido.py` según `pista.json`.

## F. Montaje
`python3 motor/voz.py <carpeta> <modelos Piper> 0.74` → `python3 motor/sonido.py <carpeta>` → `NODE_PATH=$(npm root -g) node motor/render.mjs <carpeta> <carpeta>/<carpeta>.mp4`. Exporta 1080×1920, 30 FPS, H.264 + AAC, sonoridad normalizada a −14 LUFS.

## G. Evaluación
| Criterio | Nota | Comentario |
| --- | --- | --- |
| Gancho | 8 | Tensión directa. |
| Claridad narrativa | 9 | Muy clara. |
| Calidad visual | 6 | Correcta. |
| Cámara | 7 | Variada. |
| Animación | 5 | Simple. |
| Iluminación | 7 | El interior del submarino funciona. |
| Sonido | 6 | Latido y reloj ayudan. |
| Ritmo | 8 | Bien. |
| Continuidad | 8 | Bien. |
| Potencial de retención | 8 | La historia de Arjípov es muy compartible. |

**Límites comunes:** la animación por código no tiene sincronía labial ni poses complejas, y la voz y la música son gratuitas y sintetizadas. Mejoraría con una voz profesional, música con licencia y más primeros planos.

## Retención (segunda pasada)
Gancho reescrito con giro o pregunta abierta, texto grande desde el primer cuadro (también se entiende sin sonido), voz un 5 % más rápida, pausas un 30 % más cortas, golpe de sonido en cada corte de escena y un microzoom en cada bloque de subtítulo (un cambio visual cada 1,5–2 s).
