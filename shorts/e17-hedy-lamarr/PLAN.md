# La actriz que también inventaba — producción completa (43 s, 9:16)

Episodio del formato «¿Sabías que…?» (ver `shorts/SISTEMA_CURIOSIDADES.md`). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## 1–2. Guion y narración exacta
| Tiempo | Bloque | Narración |
| --- | --- | --- |
| 0.1–6.7 s | Gancho | «¿Sabías que una famosa actriz de Hollywood participó en el desarrollo de una tecnología de comunicación que sería importante décadas después?» |
| 6.9–11.3 s | Contexto | «Hedy Lamarr era una estrella de cine. Pero en su casa, su pasatiempo era inventar.» |
| 11.4–13.9 s | Contexto | «En plena Segunda Guerra Mundial, quiso ayudar.» |
| 14.0–17.9 s | Desarrollo | «El problema: los torpedos guiados por radio eran fáciles de interferir.» |
| 18.0–21.3 s | Desarrollo | «Con su amigo, el músico George Antheil, tuvo una idea.» |
| 21.4–26.0 s | Desarrollo | «Que la señal fuera saltando de una frecuencia a otra, tan rápido que nadie pudiera seguirla.» |
| 26.1–31.6 s | Revelación | «Usaron ochenta y ocho frecuencias. Como las teclas de un piano. La patentaron en 1942.» |
| 31.7–37.5 s | Revelación | «La Marina no la usó entonces. Pero esa misma idea está en la base de tecnologías como el wifi y el bluetooth.» |
| 37.6–42.3 s | Cierre | «No las inventó ella sola. Pero detrás de la estrella de cine, había una inventora.» |

## 3–4, 7–10. Storyboard: escena, cámara, personajes y textos
| # | Tiempo | Fondo | Cámara | Personajes (posición, expresión) | Texto en pantalla |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.1–6.7 | `e17_alfombra` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | actriz (x=540, sonriente) | ¿SABÍAS QUE...? / LA ACTRIZ QUE TAMBIÉN INVENTABA |
| 2 | 6.9–11.3 | `e17_casa` | whip pan: barrido lateral de 0,22 s desde fuera de cuadro y dolly in suave | actriz (x=400, sonriente, pensar) | PERO TAMBIÉN ERA INVENTORA |
| 3 | 11.4–13.9 | `e17_casa` | dolly in lento y continuo (×1,0 → ×1,16) durante toda la frase | actriz (x=540, enfadado) | — |
| 4 | 14.0–17.9 | `e17_mar` | crash zoom out: empieza muy cerca (×1,45) y se abre en 0,5 s, luego deriva lenta | — | — |
| 5 | 18.0–21.3 | `e17_piano` | órbita: giro de −2,5° a +2,5° con desplazamiento lateral de 220 px | actriz (x=300, riendo); musico (x=780, riendo) | — |
| 6 | 21.4–26.0 | `e17_piano` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | — | — |
| 7 | 26.1–31.6 | `e17_piano` | primerísimo primer plano (×1,45 → ×1,6) con deriva lenta | musico (x=330, sonriente, senala) | 88 FRECUENCIAS · 1942 |
| 8 | 31.7–37.5 | `e17_moderno` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | chico3 (x=300, riendo); cientifica (x=760, riendo) | — |
| 9 | 37.6–42.3 | `e17_alfombra` | dolly out de cierre (×1,2 → ×1,0) | actriz (x=540, riendo) | HEDY LAMARR / ACTRIZ E INVENTORA |

Subtítulos: frase de la narración, máximo dos líneas, palabra a palabra, con la palabra activa en amarillo.

## 5. Prompts de imagen (fondos limpios, sin texto)
Modelo: SD-Turbo (`motor/fondos.py`), 512×896 escalado a 1080×1890 y desenfocado. Sufijo común: «2D cartoon background art, painted animation background, flat colors with soft shading, thick clean outlines, detailed textures, warm cinematic lighting, no people, no text».

- `e17_alfombra`: 1940s Hollywood movie premiere with a red carpet, searchlights, a cinema marquee and palm trees at night
- `e17_casa`: elegant 1940s Hollywood living room with a drafting table, lamps and a grand piano
- `e17_mar`: second world war grey sea with a warship on the horizon, cloudy sky
- `e17_piano`: close view of a 1940s grand piano with sheet music and technical drawings
- `e17_moderno`: modern city street at dusk with people, cafes and glowing signs

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
- Patente US 2,292,387 «Secret Communication System» (11-8-1942)
- National Inventors Hall of Fame: Hedy Lamarr
- Smithsonian Magazine: Hedy Lamarr
