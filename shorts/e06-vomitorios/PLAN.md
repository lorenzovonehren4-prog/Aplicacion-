# El vomitorio no era para vomitar — producción completa (35 s, 9:16)

Episodio del formato «¿Sabías que…?» (ver `shorts/SISTEMA_CURIOSIDADES.md`). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## 1–2. Guion y narración exacta
| Tiempo | Bloque | Narración |
| --- | --- | --- |
| 0.1–5.0 s | Gancho | «¿Sabías que los romanos tenían algo llamado vomitorio, pero no servía para vomitar después de comer?» |
| 5.3–10.5 s | Contexto | «La historia dice que, en los banquetes, comían hasta reventar, vomitaban, y seguían comiendo.» |
| 10.6–12.6 s | Contexto | «Suena muy romano. Pero es un mito.» |
| 12.7–14.9 s | Desarrollo | «El vomitorio existía. Pero estaba aquí.» |
| 15.0–18.6 s | Desarrollo | «Eran los pasillos por donde el público entraba y salía de las gradas.» |
| 18.7–24.1 s | Desarrollo | «En el Coliseo cabían unos cincuenta mil espectadores. Gracias a esos pasillos, podía vaciarse en minutos.» |
| 24.2–26.6 s | Revelación | «La palabra viene del latín vomere: expulsar.» |
| 26.7–29.6 s | Revelación | «El edificio «escupía» a la multitud hacia la calle.» |
| 29.7–33.7 s | Cierre | «El nombre parecía decir una cosa. Pero era pura arquitectura romana.» |

## 3–4, 7–10. Storyboard: escena, cámara, personajes y textos
| # | Tiempo | Fondo | Cámara | Personajes (posición, expresión) | Texto en pantalla |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.1–5.0 | `e06_banquete` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | romano (x=540, sorprendido) | ¿SABÍAS QUE...? / EL VOMITORIO NO ERA PARA VOMITAR |
| 2 | 5.3–10.5 | `e06_banquete` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | romano (x=300, riendo); romano (x=760, preocupado) | — |
| 3 | 10.6–12.6 | `e06_banquete` | dolly in lento y continuo (×1,0 → ×1,16) durante toda la frase | romano (x=540, desconfiado, pensar) | sello «MITO» |
| 4 | 12.7–14.9 | `e06_coliseo` | whip pan: barrido lateral de 0,22 s desde fuera de cuadro y dolly in suave | — | AQUÍ |
| 5 | 15.0–18.6 | `e06_pasillo` | dolly in lento y continuo (×1,0 → ×1,16) durante toda la frase | romano (x=300, sonriente, camina); romano2 (x=600, sonriente, camina) | — |
| 6 | 18.7–24.1 | `e06_gradas` | crash zoom out: empieza muy cerca (×1,45) y se abre en 0,5 s, luego deriva lenta | — | ≈50.000 ESPECTADORES |
| 7 | 24.2–26.6 | `e06_pasillo` | primerísimo primer plano (×1,45 → ×1,6) con deriva lenta | erudito (x=330, sonriente, habla) | VOMERE = EXPULSAR |
| 8 | 26.7–29.6 | `e06_coliseo` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | romano (x=200, riendo, camina); romano (x=500, riendo, camina); romano2 (x=800, riendo, camina) | — |
| 9 | 29.7–33.7 | `e06_noche` | dolly out de cierre (×1,2 → ×1,0) | — | VOMITORIUM / UNA SALIDA, NO UNA SALA |

Subtítulos: frase de la narración, máximo dos líneas, palabra a palabra, con la palabra activa en amarillo.

## 5. Prompts de imagen (fondos limpios, sin texto)
Modelo: SD-Turbo (`motor/fondos.py`), 512×896 escalado a 1080×1890 y desenfocado. Sufijo común: «2D cartoon background art, painted animation background, flat colors with soft shading, thick clean outlines, detailed textures, warm cinematic lighting, no people, no text».

- `e06_banquete`: ancient roman banquet hall with a long table full of food, columns, red curtains, oil lamps
- `e06_coliseo`: the Roman Colosseum exterior on a sunny day in ancient Rome
- `e06_pasillo`: stone arched corridor inside a roman amphitheatre leading to bright daylight
- `e06_gradas`: inside the Roman Colosseum, stone seating tiers full of arches and stairways, arena below
- `e06_noche`: the Roman Colosseum at sunset with warm light

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
- Macrobio, «Saturnalia» (s. V), primer uso documentado del término
- Britannica: Colosseum
- Smithsonian Magazine: The vomitorium myth
