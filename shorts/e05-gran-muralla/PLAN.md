# La muralla no se ve desde la luna — producción completa (41 s, 9:16)

Episodio del formato «¿Sabías que…?» (ver `shorts/SISTEMA_CURIOSIDADES.md`). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## 1–2. Guion y narración exacta
| Tiempo | Bloque | Narración |
| --- | --- | --- |
| 0.1–4.8 s | Gancho | «¿Sabías que la Gran Muralla China no se puede distinguir fácilmente a simple vista desde el espacio?» |
| 5.0–9.0 s | Contexto | «Durante décadas se repitió que era la única obra humana visible desde la Luna.» |
| 9.1–12.8 s | Contexto | «Es larguísima: más de veinte mil kilómetros contando todos sus tramos.» |
| 12.9–16.6 s | Desarrollo | «Pero es muy estrecha: unos seis metros de ancho. Como una carretera.» |
| 16.7–19.6 s | Desarrollo | «Y la órbita está a unos cuatrocientos kilómetros de altura.» |
| 19.7–25.0 s | Desarrollo | «En 2003, el primer astronauta chino, Yang Liwei, lo dijo claro: no pudo verla.» |
| 25.1–30.0 s | Revelación | «La NASA lo confirma: a simple vista, desde la órbita, prácticamente no se distingue.» |
| 30.2–36.1 s | Revelación | «Solo aparece en fotos con zoom y buenas condiciones. ¿Y desde la Luna? Sería como ver un pelo a tres kilómetros.» |
| 36.2–40.4 s | Cierre | «Es una construcción gigantesca. Pero no es una línea que puedas ver desde el espacio.» |

## 3–4, 7–10. Storyboard: escena, cámara, personajes y textos
| # | Tiempo | Fondo | Cámara | Personajes (posición, expresión) | Texto en pantalla |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.1–4.8 | `e05_muralla` | crash zoom out: empieza muy cerca (×1,45) y se abre en 0,5 s, luego deriva lenta | — | ¿SABÍAS QUE...? / LA MURALLA NO SE VE DESDE LA LUNA |
| 2 | 5.0–9.0 | `e05_luna` | dolly in lento y continuo (×1,0 → ×1,16) durante toda la frase | astronauta (x=540, preocupado, pensar) | — |
| 3 | 9.1–12.8 | `e05_muralla` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | chino (x=300, sonriente, senala) | +20.000 km DE LARGO (CON TODOS SUS TRAMOS) |
| 4 | 12.9–16.6 | `e05_muralla` | primerísimo primer plano (×1,45 → ×1,6) con deriva lenta | chino (x=540, sorprendido) | ≈6 m DE ANCHO |
| 5 | 16.7–19.6 | `e05_espacio` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | — | 400 KM |
| 6 | 19.7–25.0 | `e05_estacion` | órbita: giro de −2,5° a +2,5° con desplazamiento lateral de 220 px | astronauta (x=400, preocupado) | «NO LA VI» |
| 7 | 25.1–30.0 | `e05_espacio` | travelling lateral hacia la izquierda | — | — |
| 8 | 30.2–36.1 | `e05_luna` | crash zoom out: empieza muy cerca (×1,45) y se abre en 0,5 s, luego deriva lenta | astronauta (x=330, sonriente, senala) | — |
| 9 | 36.2–40.4 | `e05_atardecer` | dolly out de cierre (×1,2 → ×1,0) | — | MITO / ENORME, PERO MUY ESTRECHA |

Subtítulos: frase de la narración, máximo dos líneas, palabra a palabra, con la palabra activa en amarillo.

## 5. Prompts de imagen (fondos limpios, sin texto)
Modelo: SD-Turbo (`motor/fondos.py`), 512×896 escalado a 1080×1890 y desenfocado. Sufijo común: «2D cartoon background art, painted animation background, flat colors with soft shading, thick clean outlines, detailed textures, warm cinematic lighting, no people, no text».

- `e05_muralla`: the Great Wall of China winding over green mountains, aerial view, morning light
- `e05_espacio`: planet Earth seen from orbit with clouds and continents, stars, space
- `e05_estacion`: interior of a space station with a round window looking at Earth
- `e05_luna`: surface of the Moon with craters and the small blue Earth in the black sky
- `e05_atardecer`: the Great Wall of China at sunset with watchtowers

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
- NASA: «Great Wall of China from Space» / Earth Observatory
- Declaraciones de Yang Liwei (2003)
- Britannica: Great Wall of China
