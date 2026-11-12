# La caída de Constantinopla (1453) — plan de producción

Hecho según `shorts/SISTEMA.md`. Texto exacto de la voz en `guion.json`; escenas en `escenas.js`; sonido en `pista.json`.

## A. Investigación
- Asedio del 6 de abril al 29 de mayo de 1453 (53 días). Mehmed II tenía 21 años.
- Las fuentes estiman el ejército otomano entre 50.000 y 80.000 hombres o más; el guion dice «decenas de miles». Defensores: unos 7.000 (Sphrantzes cuenta 4.973 griegos y unos 2.000 extranjeros).
- Orbán, fundidor húngaro, construyó el gran bombardo (unos 8 m).
- El 22 de abril los otomanos arrastran unas 70 naves por Gálata hasta el Cuerno de Oro, sorteando la cadena.
- Constantino XI muere durante el asalto; los detalles son inciertos y el guion no los inventa.
- El nombre «Estambul» se generaliza con el tiempo (es oficial en 1930); el guion dice «hoy la conocemos como Estambul».
Fuentes: Steven Runciman, *The Fall of Constantinople 1453*; Britannica («Fall of Constantinople»).

## B. Guion
- **h1**: Una ciudad resistió más de mil años. Hasta que llegó un cañón de ocho metros.
- **c1**: Constantinopla, capital del Imperio bizantino. Sus murallas nunca habían caído ante un asalto.
- **c2**: En 1453, el sultán otomano Mehmed II, de 21 años, la rodea con decenas de miles de soldados.
- **c3**: Dentro hay apenas unos 7.000 defensores.
- **d1**: Mehmed trae cañones gigantes, construidos por un ingeniero llamado Orbán.
- **d2**: Una cadena cierra el puerto. Así que Mehmed hace algo increíble: arrastra sus barcos por tierra, sobre una colina.
- **d3**: Durante 53 días, los cañones golpean las murallas.
- **r1**: El 29 de mayo, antes del amanecer, los jenízaros entran por una brecha.
- **r2**: El último emperador, Constantino XI, muere durante el asalto.
- **f1**: La ciudad se convierte en la capital otomana. Hoy la conocemos como Estambul.
- **f2**: Para muchos historiadores, ahí termina la Edad Media.

Nombres, fechas y cifras van destacados en amarillo en los subtítulos; las pausas más largas van antes de las revelaciones (`gap` en `guion.json`).

## C. Biblia visual
Mehmed II: turbante blanco con remate rojo, caftán rojo y capa dorada. Constantino XI: corona, túnica púrpura, coraza y barba gris. Orbán: delantal de cuero, calvo y bigote. Bizantinos de púrpura con casco; otomanos con turbante o börk.

## D. Storyboard (segundos aproximados)
| Tiempo | Plano | Cámara |
| --- | --- | --- |
| 0–5 | Cañonazo contra las murallas | de primer plano del cañón a la muralla |
| 5–9 | Constantinopla al amanecer | descenso de grúa |
| 9–14 | Marcha otomana con Mehmed | travelling lateral |
| 14–17 | Defensores en la muralla, de noche, ante las hogueras | push in |
| 17–21 | Mehmed y Orbán junto al cañón | dolly |
| 21–28 | Mapa del Cuerno de Oro: barcos por tierra | seguimiento de la ruta |
| 28–33 | Bombardeo, contador de días | temblor |
| 33–38 | Asalto de los jenízaros por la brecha | carga |
| 38–42 | Constantino XI | push in |
| 42–46 | Bandera otomana sobre la ciudad | dolly |
| 46–51 | Mapa y título | pull out |

## E. Prompts de generación
No hay imágenes generadas con IA: cada plano es código en `escenas.js`, que usa el motor común (`../motor/motor.js`: personajes con ficha, ejércitos, mapas de Natural Earth, vehículos, efectos y cámara por fotogramas clave). Voz: Piper `es_MX-claude-high`. Música y efectos sintetizados en `motor/sonido.py` según `pista.json`.

## F. Montaje
`python3 motor/voz.py <carpeta> <modelos Piper> 0.74` → `python3 motor/sonido.py <carpeta>` → `NODE_PATH=$(npm root -g) node motor/render.mjs <carpeta> <carpeta>/<carpeta>.mp4`. Exporta 1080×1920, 30 FPS, H.264 + AAC, sonoridad normalizada a −14 LUFS.

## G. Evaluación
| Criterio | Nota | Comentario |
| --- | --- | --- |
| Gancho | 8 | El cañón engancha. |
| Claridad narrativa | 8 | El mapa de los barcos se entiende. |
| Calidad visual | 6 | La ciudad es simple. |
| Cámara | 7 | Buena variedad. |
| Animación | 5 | Poses limitadas. |
| Iluminación | 6 | Atmósferas correctas. |
| Sonido | 6 | Cañones con peso; voz aceptable. |
| Ritmo | 8 | 51 s sin relleno. |
| Continuidad | 8 | Fichas constantes. |
| Potencial de retención | 7 | El dato del cierre ayuda a compartir. |

**Límites comunes:** la animación por código no tiene sincronía labial ni poses complejas, y la voz y la música son gratuitas y sintetizadas. Mejoraría con una voz profesional, música con licencia y más primeros planos.
