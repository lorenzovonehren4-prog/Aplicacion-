# La piedra que descifró egipto — producción completa (39 s, 9:16)

Episodio del formato «¿Sabías que…?» (ver `shorts/SISTEMA_CURIOSIDADES.md`). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## 1–2. Guion y narración exacta
| Tiempo | Bloque | Narración |
| --- | --- | --- |
| 0.1–5.3 s | Gancho | «¿Sabías que una piedra encontrada durante la campaña de Napoleón ayudó a descifrar los jeroglíficos egipcios?» |
| 5.5–8.5 s | Contexto | «Durante más de mil años, nadie en el mundo supo leerlos.» |
| 8.7–14.7 s | Contexto | «1799. Soldados franceses reconstruyen un fuerte cerca de la ciudad de Rashid, o Rosetta.» |
| 14.8–18.4 s | Desarrollo | «Entre los escombros aparece una losa oscura, llena de inscripciones.» |
| 18.6–23.5 s | Desarrollo | «Tiene el mismo texto, escrito de tres formas: jeroglíficos, demótico... y griego antiguo.» |
| 23.6–26.6 s | Desarrollo | «Y el griego sí se podía leer. Era la pista que faltaba.» |
| 26.7–30.2 s | Revelación | «Jean-François Champollion pasa años comparando los nombres de los reyes.» |
| 30.4–34.6 s | Revelación | «En 1822 lo consigue: los signos también representan sonidos.» |
| 34.7–38.4 s | Cierre | «Una piedra ayudó a recuperar una lengua que llevaba siglos sin poder leerse.» |

## 3–4, 7–10. Storyboard: escena, cámara, personajes y textos
| # | Tiempo | Fondo | Cámara | Personajes (posición, expresión) | Texto en pantalla |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.1–5.3 | `e13_piedra` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | — | ¿SABÍAS QUE...? / LA PIEDRA QUE DESCIFRÓ EGIPTO |
| 2 | 5.5–8.5 | `e13_templo` | órbita: giro de −2,5° a +2,5° con desplazamiento lateral de 220 px | egipcio (x=540, preocupado, pensar) | — |
| 3 | 8.7–14.7 | `e13_fuerte` | crash zoom out: empieza muy cerca (×1,45) y se abre en 0,5 s, luego deriva lenta | soldadoNap (x=300, sonriente); soldadoNap (x=760, sonriente) | EGIPTO · 1799 |
| 4 | 14.8–18.4 | `e13_fuerte` | whip pan: barrido lateral de 0,22 s desde fuera de cuadro y dolly in suave | soldadoNap (x=330, sorprendido, senala) | EGIPTO · 1799 |
| 5 | 18.6–23.5 | `e13_piedra` | pan vertical descendente (320 px) | — | 3 ESCRITURAS |
| 6 | 23.6–26.6 | `e13_piedra` | primerísimo primer plano (×1,45 → ×1,6) con deriva lenta | erudito (x=330, riendo, senala) | — |
| 7 | 26.7–30.2 | `e13_estudio` | dolly in lento y continuo (×1,0 → ×1,16) durante toda la frase | champollion (x=540, sonriente, pensar) | — |
| 8 | 30.4–34.6 | `e13_estudio` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | champollion (x=540, riendo, arriba) | ¡LO TENGO! · 1822 |
| 9 | 34.7–38.4 | `e13_museo` | dolly out de cierre (×1,2 → ×1,0) | — | 1822 / LOS JEROGLÍFICOS VUELVEN A HABLAR |

Subtítulos: frase de la narración, máximo dos líneas, palabra a palabra, con la palabra activa en amarillo.

## 5. Prompts de imagen (fondos limpios, sin texto)
Modelo: SD-Turbo (`motor/fondos.py`), 512×896 escalado a 1080×1890 y desenfocado. Sufijo común: «2D cartoon background art, painted animation background, flat colors with soft shading, thick clean outlines, detailed textures, warm cinematic lighting, no people, no text».

- `e13_templo`: ancient egyptian temple wall covered with carved hieroglyphs, golden light
- `e13_fuerte`: egyptian fort near the Nile delta in 1799 with french soldiers tents, palm trees
- `e13_piedra`: a large black stone stele standing in a dark room, its surface fully covered with rows of carved egyptian hieroglyphs and ancient greek letters, spotlight
- `e13_estudio`: early 19th century scholar study in Paris with books, papers with hieroglyphs, candle
- `e13_museo`: grand museum hall with egyptian statues and a stone slab in a glass case

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
- British Museum: Everything you ever wanted to know about the Rosetta Stone
- Britannica: Rosetta Stone; Jean-François Champollion
