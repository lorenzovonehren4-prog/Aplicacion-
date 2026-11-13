# Colón llegó 500 años tarde — producción completa (44 s, 9:16)

Episodio del formato «¿Sabías que…?» (ver `shorts/SISTEMA_CURIOSIDADES.md`). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## 1–2. Guion y narración exacta
| Tiempo | Bloque | Narración |
| --- | --- | --- |
| 0.1–6.7 s | Gancho | «¿Sabías que Cristóbal Colón llegó a América casi quinientos años después que los vikingos? Y ellos tampoco fueron los primeros en llegar.» |
| 6.9–11.8 s | Contexto | «1492. Tres naves cruzan el Atlántico. Pero no llegan a una tierra vacía.» |
| 11.9–17.1 s | Contexto | «América llevaba habitada más de quince mil años. Había ciudades, caminos e imperios.» |
| 17.2–20.9 s | Desarrollo | «Y mucho antes que Colón, otros europeos ya habían cruzado el océano.» |
| 21.0–24.5 s | Desarrollo | «Los vikingos. Navegaron desde Groenlandia por el frío Atlántico Norte.» |
| 24.6–29.0 s | Desarrollo | «En Terranova, Canadá, quedan los restos de su poblado: L'Anse aux Meadows.» |
| 29.1–33.3 s | Revelación | «Los científicos dataron la madera que cortaron allí. Año exacto: 1021.» |
| 33.4–35.7 s | Revelación | «Cuatrocientos setenta y un años antes de Colón.» |
| 35.9–43.2 s | Cierre | «Colón no descubrió un continente vacío. Llegó a una tierra habitada desde hacía miles de años, y los vikingos ya habían estado allí siglos antes.» |

## 3–4, 7–10. Storyboard: escena, cámara, personajes y textos
| # | Tiempo | Fondo | Cámara | Personajes (posición, expresión) | Texto en pantalla |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.1–6.7 | `e01_mar` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | capitan (x=330, desconfiado, senala) | ¿SABÍAS QUE...? / COLÓN LLEGÓ 500 AÑOS TARDE |
| 2 | 6.9–11.8 | `e01_mar` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | — | 1492 |
| 3 | 11.9–17.1 | `e01_ciudad` | pan vertical descendente (320 px) | indigena (x=300, sonriente); indigena2 (x=760, sonriente) | YA HABÍA CIVILIZACIONES |
| 4 | 17.2–20.9 | `e01_norte` | whip pan: barrido lateral de 0,22 s desde fuera de cuadro y dolly in suave | — | — |
| 5 | 21.0–24.5 | `e01_norte` | órbita: giro de −2,5° a +2,5° con desplazamiento lateral de 220 px | vikingo (x=540, enfadado) | — |
| 6 | 24.6–29.0 | `e01_poblado` | crash zoom out: empieza muy cerca (×1,45) y se abre en 0,5 s, luego deriva lenta | vikingo (x=300, sonriente); vikingo2 (x=780, sonriente) | — |
| 7 | 29.1–33.3 | `e01_lab` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | cientifica (x=330, sorprendido, senala) | AÑO 1021 |
| 8 | 33.4–35.7 | `e01_mar` | dolly in lento y continuo (×1,0 → ×1,16) durante toda la frase | — | línea de tiempo 1021 → 1492: 471 AÑOS |
| 9 | 35.9–43.2 | `e01_ciudad` | dolly out de cierre (×1,2 → ×1,0) | indigena (x=200, sonriente); vikingo (x=540, sonriente); capitan (x=880, preocupado) | 1021 → 1492 / Y AMÉRICA YA ESTABA HABITADA |

Subtítulos: frase de la narración, máximo dos líneas, palabra a palabra, con la palabra activa en amarillo.

## 5. Prompts de imagen (fondos limpios, sin texto)
Modelo: SD-Turbo (`motor/fondos.py`), 512×896 escalado a 1080×1890 y desenfocado. Sufijo común: «2D cartoon background art, painted animation background, flat colors with soft shading, thick clean outlines, detailed textures, warm cinematic lighting, no people, no text».

- `e01_mar`: three 15th century spanish caravels sailing on a vast blue ocean, dramatic clouds
- `e01_ciudad`: aerial view of a great ancient native american city with pyramids, causeways and fields
- `e01_norte`: cold north atlantic sea with fog, icebergs and big waves
- `e01_poblado`: viking turf houses on the green rocky coast of Newfoundland, wooden boat on the shore
- `e01_lab`: modern laboratory with microscopes and wood samples

## 6. Animación
- Personajes cabezón: respiración, parpadeo, boca animada al hablar, brazos según el gesto indicado y caminata cuando la escena lo marca.
- Fondo con paralaje (profundidad 0,35), partículas y viñeta; punch-in en cada bloque de subtítulo.
- Textos: entran con rebote; sellos que caen con escala; líneas de tiempo que se dibujan.

## 8. Iluminación y color
La da cada fondo pintado (ver prompts) más la corrección común: brillo ×1,13, contraste ×1,3, bloom suave, grano de papel y viñeta.

## 10. Tipografía
Anton (títulos, fechas, cifras y textos clave) y Montserrat 600/800 (subtítulos y rótulos). Blanco y amarillo `#ffd23a` con contorno y sombra oscuros. Márgenes: nada por debajo de y=1700 ni a menos de 110 px de los lados.

## 11. Música y efectos
Ver `pista.json`: colchón de cuerdas todo el vídeo, ostinato en el contexto, percusión en el desarrollo y reloj en el cierre; riser en el gancho, golpes en las revelaciones y campana final. La música baja ~72 % bajo la voz.

## 12–13. Transiciones y exportación
Corte seco con whoosh y golpe de tom en cada cambio de escena. 1080×1920, 30 FPS, H.264 + AAC, −14 LUFS. Voz Piper `es_MX-claude-high` a 0,74.

## 14. Fuentes
Los datos se redactaron a partir de estas referencias; no se abrieron en línea durante la producción, así que conviene contrastarlas antes de publicar.
- Kuitems et al., Nature (2021): Evidence for European presence in the Americas in AD 1021
- Parks Canada: L’Anse aux Meadows National Historic Site
- Britannica: Columbus; Vinland
