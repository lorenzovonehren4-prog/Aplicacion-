# El Día D (6 de junio de 1944) — plan de producción

Hecho según `shorts/SISTEMA.md`. Texto exacto de la voz en `guion.json`; escenas en `escenas.js`; sonido en `pista.json`.

## A. Investigación
- Unos 156.000 soldados aliados desembarcan o saltan en Normandía el 6 de junio de 1944. Unos 7.000 buques y embarcaciones (Operación Neptune, dentro de Overlord).
- La Operación Fortitude crea un ejército ficticio, con tanques inflables, apuntando a Calais.
- Unos 24.000 paracaidistas. Playas: Utah, Omaha, Gold, Juno y Sword.
- Muertos aliados confirmados ese día: más de 4.400 (D-Day Center: 4.414).
- Alemania se rinde el 8 de mayo de 1945, unos 11 meses después.
Fuentes: National WWII Museum; D-Day Center (Portsmouth); Britannica («Normandy Invasion»).

## B. Guion
- **h1**: 6 de junio de 1944. Más de 150.000 soldados cruzan el canal de la Mancha en una sola noche.
- **c1**: Hitler domina Europa occidental, y ha levantado el Muro del Atlántico: búnkeres, minas y obstáculos en las playas.
- **c2**: Los aliados preparan el desembarco más grande de la historia: la Operación Overlord.
- **c3**: Para engañar a los alemanes, crean un ejército falso, con tanques inflables, que apunta a Calais.
- **d1**: Esa noche, miles de paracaidistas saltan detrás de las líneas enemigas.
- **d2**: Al amanecer, casi 7.000 barcos llegan a cinco playas: Utah, Omaha, Gold, Juno y Sword.
- **d3**: En Omaha, el fuego alemán es brutal. Muchos soldados caen antes de pisar la arena.
- **r1**: Pero al anochecer, los aliados ya tienen un pie en Francia.
- **r2**: Ese día murieron más de 4.000 soldados aliados.
- **f1**: Once meses después, la Alemania nazi se rinde.
- **f2**: El día más largo abrió el camino al final de la guerra en Europa.

Nombres, fechas y cifras van destacados en amarillo en los subtítulos; las pausas más largas van antes de las revelaciones (`gap` en `guion.json`).

## C. Biblia visual
Eisenhower: gorra de oficial y uniforme oliva. Soldados estadounidenses con casco M1 oliva; alemanes con casco gris. Fondos de playa, búnkeres y erizos checos.

## D. Storyboard (segundos aproximados)
| Tiempo | Plano | Cámara |
| --- | --- | --- |
| 0–7 | Flota nocturna cruzando el canal | descenso de grúa |
| 7–10 | Mapa de la Europa ocupada | zoom |
| 10–14 | Muro del Atlántico | dolly |
| 14–18 | Eisenhower en la sala de mando, título Overlord | push in |
| 18–24 | Tanques inflables y cartel «Calais» | dolly |
| 24–28 | Paracaidistas de noche | descenso |
| 28–34 | Mapa de las cinco playas | dolly |
| 34–38 | Omaha: lancha, balas y explosiones | travelling |
| 38–41 | Atardecer con banderas en la playa | dolly |
| 41–44 | Cementerio de cruces blancas | pull out lento |
| 44–47 | Mapa hasta Berlín | zoom |
| 47–52 | Cruces y título | pull out |

## E. Prompts de generación
No hay imágenes generadas con IA: cada plano es código en `escenas.js`, que usa el motor común (`../motor/motor.js`: personajes con ficha, ejércitos, mapas de Natural Earth, vehículos, efectos y cámara por fotogramas clave). Voz: Piper `es_MX-claude-high`. Música y efectos sintetizados en `motor/sonido.py` según `pista.json`.

## F. Montaje
`python3 motor/voz.py <carpeta> <modelos Piper> 0.74` → `python3 motor/sonido.py <carpeta>` → `NODE_PATH=$(npm root -g) node motor/render.mjs <carpeta> <carpeta>/<carpeta>.mp4`. Exporta 1080×1920, 30 FPS, H.264 + AAC, sonoridad normalizada a −14 LUFS.

## G. Evaluación
| Criterio | Nota | Comentario |
| --- | --- | --- |
| Gancho | 8 | Cifra fuerte de entrada. |
| Claridad narrativa | 8 | Las playas se entienden. |
| Calidad visual | 6 | Correcta. |
| Cámara | 7 | Variada. |
| Animación | 5 | Simple. |
| Iluminación | 6 | Noche y atardecer bien; Omaha algo plana. |
| Sonido | 6 | Disparos sintéticos. |
| Ritmo | 8 | 52 s. |
| Continuidad | 8 | Bien. |
| Potencial de retención | 7 | Cierre respetuoso. |

**Límites comunes:** la animación por código no tiene sincronía labial ni poses complejas, y la voz y la música son gratuitas y sintetizadas. Mejoraría con una voz profesional, música con licencia y más primeros planos.
