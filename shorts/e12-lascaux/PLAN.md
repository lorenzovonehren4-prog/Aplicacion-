# Cuatro chicos y una cueva secreta — producción completa (37 s, 9:16)

Episodio del formato «¿Sabías que…?» (ver `shorts/SISTEMA_CURIOSIDADES.md`). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## 1–2. Guion y narración exacta
| Tiempo | Bloque | Narración |
| --- | --- | --- |
| 0.1–5.7 s | Gancho | «¿Sabías que cuatro adolescentes descubrieron una cueva con algunas de las pinturas prehistóricas más extraordinarias del mundo?» |
| 6.0–11.7 s | Contexto | «Septiembre de 1940. Marcel Ravidat, de dieciocho años, encuentra un agujero en el bosque.» |
| 11.9–14.7 s | Contexto | «Vuelve con tres amigos, y una lámpara improvisada.» |
| 14.9–17.5 s | Desarrollo | «Bajan por un pasadizo estrecho. Está oscuro.» |
| 17.6–20.9 s | Desarrollo | «Levantan la luz... y las paredes están cubiertas de animales gigantes.» |
| 21.0–24.3 s | Desarrollo | «Caballos, toros, ciervos. Algunos miden más de cinco metros.» |
| 24.4–26.5 s | Revelación | «Los pintaron hace unos diecisiete mil años.» |
| 26.7–31.6 s | Revelación | «Los cuatro avisan a su maestro. Pronto llegan los expertos: hay unos seiscientos animales pintados.» |
| 31.7–36.4 s | Cierre | «Una exploración de adolescentes terminó siendo uno de los grandes descubrimientos del arte prehistórico.» |

## 3–4, 7–10. Storyboard: escena, cámara, personajes y textos
| # | Tiempo | Fondo | Cámara | Personajes (posición, expresión) | Texto en pantalla |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.1–5.7 | `e12_bosque` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | chico (x=200, sonriente, camina); chico2 (x=440, sonriente, camina); chico3 (x=680, sonriente, camina) | ¿SABÍAS QUE...? / CUATRO CHICOS Y UNA CUEVA SECRETA |
| 2 | 6.0–11.7 | `e12_hoyo` | dolly in lento y continuo (×1,0 → ×1,16) durante toda la frase | chico (x=330, sorprendido, senala) | FRANCIA · 1940 |
| 3 | 11.9–14.7 | `e12_bosque` | whip pan: barrido lateral de 0,22 s desde fuera de cuadro y dolly in suave | chico (x=200, sonriente); chico2 (x=430, riendo); chico3 (x=660, riendo); chico4 (x=880, sorprendido) | FRANCIA · 1940 |
| 4 | 14.9–17.5 | `e12_hoyo` | pan vertical descendente (320 px) | chico (x=540, preocupado) | FRANCIA · 1940 |
| 5 | 17.6–20.9 | `e12_cueva` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | chico (x=300, sorprendido); chico2 (x=780, sorprendido) | — |
| 6 | 21.0–24.3 | `e12_cueva2` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | — | — |
| 7 | 24.4–26.5 | `e12_cueva2` | primerísimo primer plano (×1,45 → ×1,6) con deriva lenta | chico3 (x=540, sorprendido) | ≈17.000 AÑOS DE ANTIGÜEDAD |
| 8 | 26.7–31.6 | `e12_pueblo` | órbita: giro de −2,5° a +2,5° con desplazamiento lateral de 220 px | erudito (x=330, sorprendido); chico (x=780, riendo) | — |
| 9 | 31.7–36.4 | `e12_cueva` | dolly out de cierre (×1,2 → ×1,0) | — | LASCAUX / 17.000 AÑOS DE ANTIGÜEDAD |

Subtítulos: frase de la narración, máximo dos líneas, palabra a palabra, con la palabra activa en amarillo.

## 5. Prompts de imagen (fondos limpios, sin texto)
Modelo: SD-Turbo (`motor/fondos.py`), 512×896 escalado a 1080×1890 y desenfocado. Sufijo común: «2D cartoon background art, painted animation background, flat colors with soft shading, thick clean outlines, detailed textures, warm cinematic lighting, no people, no text».

- `e12_bosque`: french countryside forest hill in 1940 with oak trees and a rural path, autumn light
- `e12_hoyo`: a dark hole in the ground among tree roots and rocks in a forest
- `e12_cueva`: prehistoric cave wall with paintings of bulls, horses and deer in ochre and black, warm lamp light
- `e12_cueva2`: prehistoric cave gallery ceiling with large painted bulls and horses, torch light
- `e12_pueblo`: small french village in the 1940s with stone houses and a church

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
- Ministerio de Cultura de Francia: Lascaux (archeologie.culture.gouv.fr)
- Britannica: Lascaux
- Bradshaw Foundation: Lascaux
