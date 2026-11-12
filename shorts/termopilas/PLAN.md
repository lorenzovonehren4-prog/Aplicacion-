# Las Termópilas (480 a. C.) — plan de producción

Hecho según `shorts/SISTEMA.md`. Texto exacto de la voz en `guion.json`; escenas en `escenas.js`; sonido en `pista.json`.

## A. Investigación
- Jerjes I invade Grecia en el 480 a. C. Heródoto (VII.186) habla de más de 5 millones de personas; los historiadores actuales estiman entre 100.000 y 300.000 combatientes.
- En el paso, Leónidas dirige a 300 espartanos y unos 7.000 griegos (Heródoto VII.202).
- «Molon labe» («Ven a tomarlas»): la atribuye Plutarco (*Apophthegmata Laconica*, 225c) y se presenta como cita atribuida.
- Efialtes de Tráquide revela el sendero de Anopea (Heródoto VII.213).
- Se quedan los espartanos, unos 700 tespios y unos 400 tebanos (Heródoto VII.222); el guion dice «cientos de tespios y tebanos».
- Salamina, en septiembre del 480 a. C., es victoria naval griega.
Fuentes: Heródoto, *Historias* VII–VIII; Plutarco; Encyclopaedia Britannica («Battle of Thermopylae»).

## B. Guion
- **h1**: Trescientos espartanos contra el ejército más grande del mundo. Pero no estaban solos.
- **c1**: Año 480 antes de Cristo. Jerjes, rey de Persia, invade Grecia.
- **c2**: Heródoto habla de millones de soldados. Los historiadores de hoy creen que eran entre 100.000 y 300.000.
- **d1**: Para frenarlo, los griegos eligen un paso estrecho entre la montaña y el mar: las Termópilas.
- **d2**: Los dirige el rey espartano Leónidas: 300 espartanos y unos 7.000 griegos más.
- **d3**: Según Plutarco, cuando Jerjes le exige entregar las armas, Leónidas responde: «Ven a tomarlas».
- **d4**: Durante dos días, la falange griega resiste ola tras ola. Ni los Inmortales, la élite persa, consiguen pasar.
- **r1**: Hasta que un griego, Efialtes, les enseña a los persas un sendero por la montaña.
- **r2**: Rodeado, Leónidas despide a la mayoría de sus aliados. Se queda con sus espartanos, y con cientos de tespios y tebanos.
- **r3**: Mueren casi todos.
- **f1**: Persia gana la batalla. Pero ese mismo año pierde la guerra en el mar, en Salamina.
- **f2**: Y las Termópilas se vuelven el símbolo de resistir hasta el final.

Nombres, fechas y cifras van destacados en amarillo en los subtítulos; las pausas más largas van antes de las revelaciones (`gap` en `guion.json`).

## C. Biblia visual
Leónidas: casco corintio con cresta roja, capa roja y coraza de bronce. Jerjes: tiara dorada y túnica y capa púrpura y oro. Efialtes: pastor con túnica marrón. Griegos con hoplón bronce y lambda; persas con túnicas de colores, escudo de mimbre y gorro de tela; Inmortales de blanco y azul.

## D. Storyboard (segundos aproximados)
| Tiempo | Plano | Cámara |
| --- | --- | --- |
| 0–5 | Falange contra la masa persa | grúa: de los escudos al ejército enemigo |
| 5–11 | Mapa: de Sardes a las Termópilas | travelling sobre el mapa |
| 11–15 | Jerjes en su palacio | dolly in |
| 15–19 | El paso visto desde arriba | descenso de grúa |
| 19–23 | Marcha de los hoplitas con Leónidas | travelling lateral |
| 23–27 | Leónidas y el heraldo persa, con la cita | push in a Leónidas |
| 27–33 | Olas de ataque contra la falange | temblor en cada choque |
| 33–37 | Efialtes guía a los persas de noche | travelling lateral nocturno |
| 37–43 | Diagrama: el rodeo y la retirada de los aliados | dolly in |
| 43–45 | Última resistencia bajo las flechas | push in lento |
| 45–53 | Salamina en el mapa | zoom |
| 53–59 | Leónidas al atardecer y título | pull out |

## E. Prompts de generación
No hay imágenes generadas con IA: cada plano es código en `escenas.js`, que usa el motor común (`../motor/motor.js`: personajes con ficha, ejércitos, mapas de Natural Earth, vehículos, efectos y cámara por fotogramas clave). Voz: Piper `es_MX-claude-high`. Música y efectos sintetizados en `motor/sonido.py` según `pista.json`.

## F. Montaje
`python3 motor/voz.py <carpeta> <modelos Piper> 0.74` → `python3 motor/sonido.py <carpeta>` → `NODE_PATH=$(npm root -g) node motor/render.mjs <carpeta> <carpeta>/<carpeta>.mp4`. Exporta 1080×1920, 30 FPS, H.264 + AAC, sonoridad normalizada a −14 LUFS.

## G. Evaluación
| Criterio | Nota | Comentario |
| --- | --- | --- |
| Gancho | 9 | Gancho con giro: «no estaban solos». |
| Claridad narrativa | 8 | El diagrama del paso explica el rodeo. |
| Calidad visual | 6 | Faltan fondos con más detalle. |
| Cámara | 7 | Variada. |
| Animación | 5 | Gestos simples, sin sincronía labial. |
| Iluminación | 6 | Atardecer bien logrado; el resto es plano. |
| Sonido | 6 | Voz mejor que la anterior; música sintetizada. |
| Ritmo | 8 | Rápido. |
| Continuidad | 8 | Fichas constantes. |
| Potencial de retención | 7 | Final emotivo. |

**Límites comunes:** la animación por código no tiene sincronía labial ni poses complejas, y la voz y la música son gratuitas y sintetizadas. Mejoraría con una voz profesional, música con licencia y más primeros planos.
