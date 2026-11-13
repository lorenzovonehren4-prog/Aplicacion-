# Unos pastores hallaron un tesoro — producción completa (40 s, 9:16)

Episodio del formato «¿Sabías que…?» (ver `shorts/SISTEMA_CURIOSIDADES.md`). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## 1–2. Guion y narración exacta
| Tiempo | Bloque | Narración |
| --- | --- | --- |
| 0.1–6.2 s | Gancho | «¿Sabías que unos jóvenes pastores encontraron, por accidente, algunos de los manuscritos antiguos más importantes del mundo?» |
| 6.4–12.0 s | Contexto | «1947. Desierto junto al mar Muerto. Unos pastores beduinos buscan una cabra perdida.» |
| 12.1–14.5 s | Contexto | «Uno de ellos lanza una piedra dentro de una cueva.» |
| 14.7–16.0 s | Desarrollo | «Y oye algo romperse.» |
| 16.2–20.4 s | Desarrollo | «Dentro hay vasijas de barro. Y, en ellas, rollos de cuero envueltos en tela.» |
| 20.5–24.2 s | Desarrollo | «No lo sabían, pero tenían en las manos textos de hace más de dos mil años.» |
| 24.3–27.9 s | Revelación | «Cuando los expertos los vieron, empezó una búsqueda por toda la zona.» |
| 28.0–34.7 s | Revelación | «Entre 1947 y 1956 aparecieron once cuevas, en Qumrán, con miles de fragmentos.» |
| 34.8–38.9 s | Cierre | «Un hallazgo accidental abrió una ventana extraordinaria al mundo antiguo.» |

## 3–4, 7–10. Storyboard: escena, cámara, personajes y textos
| # | Tiempo | Fondo | Cámara | Personajes (posición, expresión) | Texto en pantalla |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.1–6.2 | `e11_desierto` | crash zoom out: empieza muy cerca (×1,45) y se abre en 0,5 s, luego deriva lenta | — | ¿SABÍAS QUE...? / UNOS PASTORES HALLARON UN TESORO |
| 2 | 6.4–12.0 | `e11_desierto` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | pastor (x=300, sonriente, camina) | 1947 |
| 3 | 12.1–14.5 | `e11_desierto` | whip pan: barrido lateral de 0,22 s desde fuera de cuadro y dolly in suave | pastor (x=330, sonriente, senala) | 1947 |
| 4 | 14.7–16.0 | `e11_cueva` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | — | ¡CRAC! · 1947 |
| 5 | 16.2–20.4 | `e11_cueva` | dolly in lento y continuo (×1,0 → ×1,16) durante toda la frase | pastor (x=300, sorprendido) | 1947 |
| 6 | 20.5–24.2 | `e11_tienda` | primerísimo primer plano (×1,45 → ×1,6) con deriva lenta | pastor (x=330, sonriente); chino (x=780, sorprendido) | — |
| 7 | 24.3–27.9 | `e11_estudio` | órbita: giro de −2,5° a +2,5° con desplazamiento lateral de 220 px | arqueologo (x=330, sorprendido, senala); cientifico (x=780, sorprendido) | — |
| 8 | 28.0–34.7 | `e11_mapa` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | — | 11 CUEVAS EN QUMRÁN · 1947–1956 |
| 9 | 34.8–38.9 | `e11_desierto` | dolly out de cierre (×1,2 → ×1,0) | pastor (x=540, sonriente) | MAR MUERTO / MANUSCRITOS DE HACE 2.000 AÑOS |

Subtítulos: frase de la narración, máximo dos líneas, palabra a palabra, con la palabra activa en amarillo.

## 5. Prompts de imagen (fondos limpios, sin texto)
Modelo: SD-Turbo (`motor/fondos.py`), 512×896 escalado a 1080×1890 y desenfocado. Sufijo común: «2D cartoon background art, painted animation background, flat colors with soft shading, thick clean outlines, detailed textures, warm cinematic lighting, no people, no text».

- `e11_desierto`: rocky desert cliffs near the Dead Sea with caves, dry mountains, bright sun
- `e11_cueva`: dark interior of a desert cave with tall ancient clay jars, a beam of light from the entrance
- `e11_tienda`: old middle eastern antique shop in 1947 with shelves, lamps and carpets
- `e11_estudio`: 1950s scholars study room with a long table, magnifying lamps and glass plates
- `e11_mapa`: vintage map of the Dead Sea region on a desk with a compass

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
- Israel Antiquities Authority: Leon Levy Dead Sea Scrolls Digital Library
- Israel Museum: Shrine of the Book
- Britannica: Dead Sea Scrolls
