# Machu picchu: ¿quién llegó primero? — producción completa (41 s, 9:16)

Episodio del formato «¿Sabías que…?» (ver `shorts/SISTEMA_CURIOSIDADES.md`). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## 1–2. Guion y narración exacta
| Tiempo | Bloque | Narración |
| --- | --- | --- |
| 0.1–6.3 s | Gancho | «¿Sabías que el famoso explorador que hizo mundialmente conocido Machu Picchu no fue el primero en llegar a sus ruinas?» |
| 6.6–12.0 s | Contexto | «1911. El estadounidense Hiram Bingham sube a la montaña, guiado por gente del lugar.» |
| 12.1–15.1 s | Contexto | «Lo que ve lo deja sin palabras. Y lo contará al mundo entero.» |
| 15.3–19.1 s | Desarrollo | «Pero en una pared encuentra algo inesperado. Un nombre, y una fecha.» |
| 19.2–22.0 s | Desarrollo | ««Lizárraga, 14 de julio de 1902».» |
| 22.1–27.0 s | Desarrollo | «Agustín Lizárraga, un agricultor cusqueño, había estado allí nueve años antes.» |
| 27.1–31.0 s | Revelación | «Y no era el único. Había familias viviendo y cultivando entre las ruinas.» |
| 31.1–34.5 s | Revelación | «Para la gente de la zona, Machu Picchu nunca estuvo perdido.» |
| 34.6–40.5 s | Cierre | «Bingham ayudó a darlo a conocer al mundo. Pero Lizárraga llegó antes. Y los incas, mucho antes que todos.» |

## 3–4, 7–10. Storyboard: escena, cámara, personajes y textos
| # | Tiempo | Fondo | Cámara | Personajes (posición, expresión) | Texto en pantalla |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.1–6.3 | `e02_vista` | crash zoom out: empieza muy cerca (×1,45) y se abre en 0,5 s, luego deriva lenta | — | ¿SABÍAS QUE...? / MACHU PICCHU: ¿QUIÉN LLEGÓ PRIMERO? |
| 2 | 6.6–12.0 | `e02_valle` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | explorador (x=300, sonriente, camina); campesino (x=760, sonriente, camina) | 1911 |
| 3 | 12.1–15.1 | `e02_ruinas` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | explorador (x=540, sorprendido) | 1911 |
| 4 | 15.3–19.1 | `e02_muro` | primerísimo primer plano (×1,45 → ×1,6) con deriva lenta | explorador (x=300, sorprendido, pensar) | — |
| 5 | 19.2–22.0 | `e02_muro` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | — | LIZÁRRAGA · 1902 · 1902 |
| 6 | 22.1–27.0 | `e02_ruinas` | órbita: giro de −2,5° a +2,5° con desplazamiento lateral de 220 px | campesino (x=540, sonriente) | 1902 |
| 7 | 27.1–31.0 | `e02_ruinas` | travelling lateral hacia la izquierda | campesino (x=260, sonriente); campesina (x=560, sonriente); chico2 (x=820, riendo) | — |
| 8 | 31.1–34.5 | `e02_valle` | dolly in lento y continuo (×1,0 → ×1,16) durante toda la frase | campesina (x=540, sonriente, senala) | línea de tiempo 1902 → 1911: 9 AÑOS ANTES |
| 9 | 34.6–40.5 | `e02_tarde` | dolly out de cierre (×1,2 → ×1,0) | — | 1902 / NUEVE AÑOS ANTES QUE BINGHAM |

Subtítulos: frase de la narración, máximo dos líneas, palabra a palabra, con la palabra activa en amarillo.

## 5. Prompts de imagen (fondos limpios, sin texto)
Modelo: SD-Turbo (`motor/fondos.py`), 512×896 escalado a 1080×1890 y desenfocado. Sufijo común: «2D cartoon background art, painted animation background, flat colors with soft shading, thick clean outlines, detailed textures, warm cinematic lighting, no people, no text».

- `e02_vista`: Machu Picchu inca citadel among green mountains and clouds, sunrise
- `e02_ruinas`: inca stone walls and terraces covered with jungle vegetation, misty mountains
- `e02_muro`: close view of an ancient inca stone wall with moss
- `e02_valle`: andean valley with a river, farms and a mule trail, mountains
- `e02_tarde`: Machu Picchu at golden sunset, dramatic sky

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
- Hiram Bingham, «Inca Land» (1922), donde menciona la inscripción de Lizárraga
- Ministerio de Cultura del Perú
- Britannica: Machu Picchu
