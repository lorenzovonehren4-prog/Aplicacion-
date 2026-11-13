# El puente que renace cada año — producción completa (38 s, 9:16)

Episodio del formato «¿Sabías que…?» (ver `shorts/SISTEMA_CURIOSIDADES.md`). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## 1–2. Guion y narración exacta
| Tiempo | Bloque | Narración |
| --- | --- | --- |
| 0.1–6.4 s | Gancho | «¿Sabías que en Perú hay un puente de fibra vegetal que las comunidades reconstruyen todos los años, con técnicas de los incas?» |
| 6.7–10.6 s | Contexto | «Se llama Q'eswachaka. Cuelga sobre el río Apurímac, en Cusco.» |
| 10.7–14.0 s | Contexto | «Mide unos veintiocho metros. Y está hecho solo de hierba trenzada.» |
| 14.2–18.2 s | Desarrollo | «Los incas tenían cientos de puentes así, por todo su imperio. Este es el último.» |
| 18.3–23.1 s | Desarrollo | «Cada junio, las familias de cuatro comunidades recogen hierba, y la trenzan en cuerdas.» |
| 23.2–26.2 s | Desarrollo | «Miles de cuerdas finas, que se unen en seis cuerdas gruesas.» |
| 26.3–30.2 s | Revelación | «En tres días, tejen el puente nuevo. El viejo se deja caer al río.» |
| 30.3–33.1 s | Revelación | «Y cuando terminan, hay música, comida y fiesta.» |
| 33.2–37.4 s | Cierre | «No es solo un puente. Es una tradición que mantiene viva una técnica ancestral.» |

## 3–4, 7–10. Storyboard: escena, cámara, personajes y textos
| # | Tiempo | Fondo | Cámara | Personajes (posición, expresión) | Texto en pantalla |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.1–6.4 | `e16_canon` | crash zoom out: empieza muy cerca (×1,45) y se abre en 0,5 s, luego deriva lenta | — | ¿SABÍAS QUE...? / EL PUENTE QUE RENACE CADA AÑO |
| 2 | 6.7–10.6 | `e16_rio` | pan vertical descendente (320 px) | — | — |
| 3 | 10.7–14.0 | `e16_canon` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | campesino (x=330, sonriente, senala) | ≈28 m SOBRE EL RÍO APURÍMAC |
| 4 | 14.2–18.2 | `e16_canon` | órbita: giro de −2,5° a +2,5° con desplazamiento lateral de 220 px | indigena (x=540, sonriente) | — |
| 5 | 18.3–23.1 | `e16_hierba` | dolly in lento y continuo (×1,0 → ×1,16) durante toda la frase | campesina (x=300, sonriente); campesino (x=760, sonriente) | — |
| 6 | 23.2–26.2 | `e16_taller` | primerísimo primer plano (×1,45 → ×1,6) con deriva lenta | campesina (x=260, sonriente); campesino (x=540, riendo); campesina (x=820, sonriente) | — |
| 7 | 26.3–30.2 | `e16_canon` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | campesino (x=330, riendo, arriba) | 3 DÍAS |
| 8 | 30.3–33.1 | `e16_fiesta` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | campesina (x=260, riendo, baila); campesino (x=540, riendo, baila); chico2 (x=820, riendo, baila) | RENOVACIÓN ANUAL |
| 9 | 33.2–37.4 | `e16_canon` | dolly out de cierre (×1,2 → ×1,0) | — | Q'ESWACHAKA / UNA TRADICIÓN DE MÁS DE 500 AÑOS |

Subtítulos: frase de la narración, máximo dos líneas, palabra a palabra, con la palabra activa en amarillo.

## 5. Prompts de imagen (fondos limpios, sin texto)
Modelo: SD-Turbo (`motor/fondos.py`), 512×896 escalado a 1080×1890 y desenfocado. Sufijo común: «2D cartoon background art, painted animation background, flat colors with soft shading, thick clean outlines, detailed textures, warm cinematic lighting, no people, no text».

- `e16_canon`: deep andean canyon in Peru with a hanging rope bridge made of grass over a river, mountains
- `e16_rio`: the Apurimac river running through a rocky andean gorge, high mountains
- `e16_hierba`: andean highland field with golden ichu grass, stone houses, mountains
- `e16_taller`: andean village square with people sitting, bundles of golden grass ropes on the ground, adobe houses
- `e16_fiesta`: andean village festival with colorful flags, mountains and a grass rope bridge in the background

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
- UNESCO: Conocimientos, técnicas y rituales vinculados a la renovación anual del puente Q’eswachaka (2013)
- Ministerio de Cultura del Perú
- Smithsonian National Museum of the American Indian: The Great Inka Road
