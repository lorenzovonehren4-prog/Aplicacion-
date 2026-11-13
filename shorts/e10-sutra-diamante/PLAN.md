# Un libro impreso 600 años antes — producción completa (47 s, 9:16)

Episodio del formato «¿Sabías que…?» (ver `shorts/SISTEMA_CURIOSIDADES.md`). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## 1–2. Guion y narración exacta
| Tiempo | Bloque | Narración |
| --- | --- | --- |
| 0.1–5.6 s | Gancho | «¿Sabías que existe un libro impreso en China casi seiscientos años antes de la famosa imprenta de Gutenberg?» |
| 5.8–10.6 s | Contexto | «Hacia 1450, Gutenberg cambia Europa con su imprenta de tipos móviles.» |
| 10.7–13.9 s | Contexto | «Pero en Asia, imprimir libros ya era algo muy antiguo.» |
| 14.1–19.4 s | Desarrollo | «China, dinastía Tang. Los artesanos tallan cada página, al revés, en un bloque de madera.» |
| 19.6–23.6 s | Desarrollo | «Le ponen tinta, apoyan el papel, y frotan. Una página impresa.» |
| 23.7–27.3 s | Desarrollo | «Así se hizo un rollo de unos cinco metros: el Sutra del Diamante.» |
| 27.4–31.9 s | Revelación | «Y al final lleva una fecha exacta. El once de mayo del año 868.» |
| 32.0–39.1 s | Revelación | «Es el libro impreso completo, con fecha, más antiguo que se conserva. Apareció en una cueva de China, en 1900.» |
| 39.2–45.8 s | Cierre | «Gutenberg fue clave para la imprenta en Europa. Pero la historia del libro impreso empezó mucho antes, en Asia.» |

## 3–4, 7–10. Storyboard: escena, cámara, personajes y textos
| # | Tiempo | Fondo | Cámara | Personajes (posición, expresión) | Texto en pantalla |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.1–5.6 | `e10_imprenta` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | — | ¿SABÍAS QUE...? / UN LIBRO IMPRESO 600 AÑOS ANTES |
| 2 | 5.8–10.6 | `e10_imprenta` | órbita: giro de −2,5° a +2,5° con desplazamiento lateral de 220 px | impresor (x=540, sonriente) | c. 1450 |
| 3 | 10.7–13.9 | `e10_templo` | whip pan: barrido lateral de 0,22 s desde fuera de cuadro y dolly in suave | monjeBud (x=540, sonriente) | — |
| 4 | 14.1–19.4 | `e10_taller` | primerísimo primer plano (×1,45 → ×1,6) con deriva lenta | chino (x=330, sonriente) | — |
| 5 | 19.6–23.6 | `e10_taller` | dolly in lento y continuo (×1,0 → ×1,16) durante toda la frase | chino (x=300, riendo, senala) | — |
| 6 | 23.7–27.3 | `e10_templo` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | monjeBud (x=330, sonriente, senala) | — |
| 7 | 27.4–31.9 | `e10_cueva` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | — | 11 · MAYO · 868 · AÑO 868 |
| 8 | 32.0–39.1 | `e10_cueva` | crash zoom out: empieza muy cerca (×1,45) y se abre en 0,5 s, luego deriva lenta | arqueologo (x=540, sorprendido) | AÑO 868 |
| 9 | 39.2–45.8 | `e10_museo` | dolly out de cierre (×1,2 → ×1,0) | — | línea de tiempo 868 → 1450: CASI 600 AÑOS · AÑO 868 / EL SUTRA DEL DIAMANTE |

Subtítulos: frase de la narración, máximo dos líneas, palabra a palabra, con la palabra activa en amarillo.

## 5. Prompts de imagen (fondos limpios, sin texto)
Modelo: SD-Turbo (`motor/fondos.py`), 512×896 escalado a 1080×1890 y desenfocado. Sufijo común: «2D cartoon background art, painted animation background, flat colors with soft shading, thick clean outlines, detailed textures, warm cinematic lighting, no people, no text».

- `e10_imprenta`: 15th century european printing workshop with a wooden Gutenberg printing press, paper sheets hanging, candles
- `e10_taller`: tang dynasty chinese workshop with carved wooden printing blocks, ink, brushes and paper
- `e10_templo`: ancient chinese buddhist temple hall with red columns, lanterns and scrolls
- `e10_cueva`: ancient desert cave library full of stacked scrolls, warm lantern light
- `e10_museo`: elegant museum room with a long glass display case and soft light

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
- British Library: The Diamond Sutra (Or.8210/P.2)
- International Dunhuang Programme
- Britannica: Diamond Sutra; Johannes Gutenberg
