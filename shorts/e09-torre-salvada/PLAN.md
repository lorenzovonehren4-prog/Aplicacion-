# La torre eiffel iba a desaparecer — producción completa (43 s, 9:16)

Episodio del formato «¿Sabías que…?» (ver `shorts/SISTEMA_CURIOSIDADES.md`). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## 1–2. Guion y narración exacta
| Tiempo | Bloque | Narración |
| --- | --- | --- |
| 0.1–4.5 s | Gancho | «¿Sabías que la Torre Eiffel estaba destinada a desaparecer después de solamente veinte años?» |
| 4.8–9.8 s | Contexto | «París, 1889. Se construye como la gran atracción de la Exposición Universal.» |
| 9.9–14.0 s | Contexto | «A muchos artistas les parece un monstruo de hierro. Firman una carta de protesta.» |
| 14.1–20.2 s | Desarrollo | «Y el permiso tiene fecha de caducidad: veinte años. En 1909, la ciudad podría desmontarla.» |
| 20.3–24.3 s | Desarrollo | «Gustave Eiffel busca una razón para salvarla. Y la encuentra en la ciencia.» |
| 24.4–28.7 s | Desarrollo | «Instala un laboratorio del clima, hace experimentos... y ofrece la torre como antena.» |
| 28.8–32.0 s | Revelación | «La radio acaba de nacer. Y no hay nada más alto en París.» |
| 32.1–37.7 s | Revelación | «Los militares logran enviar mensajes a cientos de kilómetros. La torre ya es demasiado útil para derribarla.» |
| 37.8–42.1 s | Cierre | «La ciencia y las comunicaciones salvaron uno de los monumentos más famosos del mundo.» |

## 3–4, 7–10. Storyboard: escena, cámara, personajes y textos
| # | Tiempo | Fondo | Cámara | Personajes (posición, expresión) | Texto en pantalla |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.1–4.5 | `e09_torre` | pan vertical ascendente (300 px) | — | ¿SABÍAS QUE...? / LA TORRE EIFFEL IBA A DESAPARECER |
| 2 | 4.8–9.8 | `e09_expo` | crash zoom out: empieza muy cerca (×1,45) y se abre en 0,5 s, luego deriva lenta | parisino (x=300, sorprendido, senala); parisina (x=760, riendo) | PARÍS · 1889 |
| 3 | 9.9–14.0 | `e09_expo` | whip pan: barrido lateral de 0,22 s desde fuera de cuadro y dolly in suave | artista (x=330, enfadado, senala); parisino (x=780, enfadado) | PARÍS · 1889 |
| 4 | 14.1–20.2 | `e09_despacho` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | — | 20 AÑOS |
| 5 | 20.3–24.3 | `e09_despacho` | órbita: giro de −2,5° a +2,5° con desplazamiento lateral de 220 px | ingeniero (x=540, sonriente, pensar) | — |
| 6 | 24.4–28.7 | `e09_cima` | dolly in lento y continuo (×1,0 → ×1,16) durante toda la frase | ingeniero (x=300, sonriente, senala) | 1909 |
| 7 | 28.8–32.0 | `e09_cima` | pan vertical ascendente (300 px) | — | — |
| 8 | 32.1–37.7 | `e09_torre` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | soldado1918 (x=330, riendo, senala) | — |
| 9 | 37.8–42.1 | `e09_noche` | dolly out de cierre (×1,2 → ×1,0) | — | LA SALVÓ LA RADIO / PARÍS · 1909 |

Subtítulos: frase de la narración, máximo dos líneas, palabra a palabra, con la palabra activa en amarillo.

## 5. Prompts de imagen (fondos limpios, sin texto)
Modelo: SD-Turbo (`motor/fondos.py`), 512×896 escalado a 1080×1890 y desenfocado. Sufijo común: «2D cartoon background art, painted animation background, flat colors with soft shading, thick clean outlines, detailed textures, warm cinematic lighting, no people, no text».

- `e09_torre`: the Eiffel Tower seen from below against a blue sky with clouds
- `e09_expo`: Paris 1889 universal exposition with the new Eiffel Tower, pavilions, flags and crowds of visitors
- `e09_despacho`: 19th century engineer office with blueprints of an iron tower, drafting table, window
- `e09_cima`: top platform of the Eiffel Tower with antennas and scientific instruments, Paris far below
- `e09_noche`: Paris skyline at night with the Eiffel Tower illuminated

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
- Société d’Exploitation de la Tour Eiffel (toureiffel.paris): historia y radiotelegrafía
- Britannica: Eiffel Tower
