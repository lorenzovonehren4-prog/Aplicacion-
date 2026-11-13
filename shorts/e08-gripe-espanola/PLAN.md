# La gripe española no era española — producción completa (40 s, 9:16)

Episodio del formato «¿Sabías que…?» (ver `shorts/SISTEMA_CURIOSIDADES.md`). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## 1–2. Guion y narración exacta
| Tiempo | Bloque | Narración |
| --- | --- | --- |
| 0.1–3.2 s | Gancho | «¿Sabías que la gripe española probablemente no comenzó en España?» |
| 3.5–8.7 s | Contexto | «1918. El mundo lleva cuatro años en guerra. Y aparece una gripe terrible.» |
| 8.8–12.8 s | Contexto | «Enferman miles de soldados. Pero los países en guerra censuran las noticias.» |
| 12.9–15.8 s | Desarrollo | «No quieren que el enemigo sepa que sus tropas están enfermas.» |
| 15.9–20.1 s | Desarrollo | «España, en cambio, era neutral. Sus periódicos sí podían contarlo todo.» |
| 20.2–24.2 s | Desarrollo | «Publicaron cada detalle. Incluso que el rey Alfonso trece había enfermado.» |
| 24.3–28.6 s | Revelación | «Para el resto del mundo, parecía que solo España estaba enferma. Y le pusieron su nombre.» |
| 28.7–33.9 s | Revelación | «¿Dónde empezó de verdad? Hay hipótesis: Kansas, Francia, China. Ninguna está confirmada.» |
| 34.0–39.6 s | Cierre | «Mató a decenas de millones de personas. Y más de un siglo después, su origen sigue sin conocerse con certeza.» |

## 3–4, 7–10. Storyboard: escena, cámara, personajes y textos
| # | Tiempo | Fondo | Cámara | Personajes (posición, expresión) | Texto en pantalla |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.1–3.2 | `e08_redaccion` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | — | ¿SABÍAS QUE...? / LA GRIPE ESPAÑOLA NO ERA ESPAÑOLA |
| 2 | 3.5–8.7 | `e08_trinchera` | crash zoom out: empieza muy cerca (×1,45) y se abre en 0,5 s, luego deriva lenta | soldado1918 (x=300, preocupado); soldado1918 (x=760, ojos cerrados) | 1918 |
| 3 | 8.8–12.8 | `e08_trinchera` | whip pan: barrido lateral de 0,22 s desde fuera de cuadro y dolly in suave | soldado1918 (x=540, enfadado) | sello «CENSURADO» · 1918 |
| 4 | 12.9–15.8 | `e08_redaccion` | órbita: giro de −2,5° a +2,5° con desplazamiento lateral de 220 px | periodista (x=330, preocupado, pensar) | 1918 |
| 5 | 15.9–20.1 | `e08_madrid` | dolly in lento y continuo (×1,0 → ×1,16) durante toda la frase | periodista (x=300, sonriente, habla); parisina (x=760, sorprendido) | ESPAÑA: NEUTRAL |
| 6 | 20.2–24.2 | `e08_madrid` | primerísimo primer plano (×1,45 → ×1,6) con deriva lenta | parisino (x=540, sorprendido) | — |
| 7 | 24.3–28.6 | `e08_mapa` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | periodista (x=330, sonriente, senala) | — |
| 8 | 28.7–33.9 | `e08_mapa` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | — | — |
| 9 | 34.0–39.6 | `e08_hospital` | dolly out de cierre (×1,2 → ×1,0) | enfermera (x=540, preocupado) | ¿ORIGEN? / TODAVÍA NO SE SABE |

Subtítulos: frase de la narración, máximo dos líneas, palabra a palabra, con la palabra activa en amarillo.

## 5. Prompts de imagen (fondos limpios, sin texto)
Modelo: SD-Turbo (`motor/fondos.py`), 512×896 escalado a 1080×1890 y desenfocado. Sufijo común: «2D cartoon background art, painted animation background, flat colors with soft shading, thick clean outlines, detailed textures, warm cinematic lighting, no people, no text».

- `e08_redaccion`: 1918 newspaper printing office with printing press, stacks of newspapers, desks, lamps
- `e08_trinchera`: first world war trench with sandbags, barbed wire and a grey sky
- `e08_madrid`: Madrid street in 1918 with a newspaper kiosk, trams and old buildings
- `e08_hospital`: 1918 hospital ward with rows of white beds and big windows
- `e08_mapa`: vintage world map on a wall with pins, desk lamp, wooden office

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
- CDC: History of the 1918 Flu Pandemic
- Trilla et al., «The 1918 “Spanish Flu” in Spain», Clinical Infectious Diseases (2008)
- Britannica: Influenza pandemic of 1918–19
