# Dibujos gigantes en el desierto — producción completa (40 s, 9:16)

Episodio del formato «¿Sabías que…?» (ver `shorts/SISTEMA_CURIOSIDADES.md`). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## 1–2. Guion y narración exacta
| Tiempo | Bloque | Narración |
| --- | --- | --- |
| 0.1–6.2 s | Gancho | «¿Sabías que en el desierto peruano hay dibujos gigantes, de cientos de metros, hechos hace más de mil quinientos años?» |
| 6.5–10.6 s | Contexto | «Un colibrí, un mono, una araña. Y líneas rectas de varios kilómetros.» |
| 10.7–13.8 s | Contexto | «Son tan grandes, que solo se aprecian bien desde el aire.» |
| 13.9–17.0 s | Desarrollo | «Los hizo la cultura Nazca, hace unos dos mil años.» |
| 17.1–21.7 s | Desarrollo | «¿Cómo? El suelo está cubierto de piedras oscuras. Debajo, la tierra es clara.» |
| 21.8–24.5 s | Desarrollo | «Bastaba con retirar las piedras para dibujar una línea.» |
| 24.6–29.7 s | Revelación | «Con estacas y cuerdas, mantenían las proporciones. Y como casi nunca llueve, siguen ahí.» |
| 29.8–34.3 s | Revelación | «¿Para qué? Quizá rituales para pedir agua. Quizá caminos sagrados, o señales del cielo.» |
| 34.4–38.8 s | Cierre | «Sabemos cómo las hicieron. Pero su significado completo sigue bajo investigación.» |

## 3–4, 7–10. Storyboard: escena, cámara, personajes y textos
| # | Tiempo | Fondo | Cámara | Personajes (posición, expresión) | Texto en pantalla |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.1–6.2 | `e15_pampa` | pan vertical descendente (320 px) | — | ¿SABÍAS QUE...? / DIBUJOS GIGANTES EN EL DESIERTO |
| 2 | 6.5–10.6 | `e15_pampa` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | — | — |
| 3 | 10.7–13.8 | `e15_pampa` | crash zoom out: empieza muy cerca (×1,45) y se abre en 0,5 s, luego deriva lenta | — | ≈93 m MIDE EL COLIBRÍ |
| 4 | 13.9–17.0 | `e15_aldea` | órbita: giro de −2,5° a +2,5° con desplazamiento lateral de 220 px | nazca (x=330, sonriente); nazca2 (x=780, sonriente) | — |
| 5 | 17.1–21.7 | `e15_suelo` | primerísimo primer plano (×1,45 → ×1,6) con deriva lenta | nazca2 (x=330, sonriente, senala) | — |
| 6 | 21.8–24.5 | `e15_suelo` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | nazca (x=300, sonriente, camina); nazca2 (x=560, sonriente, camina) | — |
| 7 | 24.6–29.7 | `e15_suelo` | dolly in lento y continuo (×1,0 → ×1,16) durante toda la frase | nazca (x=540, riendo, senala) | — |
| 8 | 29.8–34.3 | `e15_cielo` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | — | — |
| 9 | 34.4–38.8 | `e15_torre` | dolly out de cierre (×1,2 → ×1,0) | — | NAZCA / EL MISTERIO SIGUE ABIERTO |

Subtítulos: frase de la narración, máximo dos líneas, palabra a palabra, con la palabra activa en amarillo.

## 5. Prompts de imagen (fondos limpios, sin texto)
Modelo: SD-Turbo (`motor/fondos.py`), 512×896 escalado a 1080×1890 y desenfocado. Sufijo común: «2D cartoon background art, painted animation background, flat colors with soft shading, thick clean outlines, detailed textures, warm cinematic lighting, no people, no text».

- `e15_pampa`: aerial top view of a flat brown desert plain with a huge simple white line drawing of a hummingbird bird carved on the ground, Nazca lines, tiny road
- `e15_suelo`: reddish stony desert ground in Peru with a light colored cleared line, low mountains
- `e15_aldea`: ancient Nazca village with adobe houses, colorful textiles and pottery, desert hills
- `e15_cielo`: starry night sky over the Peruvian desert with low mountains
- `e15_torre`: metal observation tower in the Nazca desert next to a highway, afternoon light

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
- UNESCO: Líneas y geoglifos de Nasca y Palpa
- Ministerio de Cultura del Perú
- Britannica: Nazca Lines
