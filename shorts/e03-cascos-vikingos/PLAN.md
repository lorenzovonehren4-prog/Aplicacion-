# Los vikingos no usaban cuernos — producción completa (41 s, 9:16)

Episodio del formato «¿Sabías que…?» (ver `shorts/SISTEMA_CURIOSIDADES.md`). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## 1–2. Guion y narración exacta
| Tiempo | Bloque | Narración |
| --- | --- | --- |
| 0.1–4.4 s | Gancho | «¿Sabías que probablemente nunca has visto a un vikingo vestido como los de las películas?» |
| 4.6–7.5 s | Contexto | «Cascos con cuernos enormes. Así los imaginamos todos.» |
| 7.6–12.1 s | Contexto | «Pero los arqueólogos casi no han encontrado cascos vikingos. Y ninguno tiene cuernos.» |
| 12.2–16.1 s | Desarrollo | «El más completo apareció en Gjermundbu, Noruega. Es del siglo diez.» |
| 16.2–20.4 s | Desarrollo | «Hierro, forma redonda, y una protección para los ojos. Nada de cuernos.» |
| 20.6–23.0 s | Desarrollo | «¿Entonces de dónde salieron? Del siglo diecinueve.» |
| 23.1–29.1 s | Revelación | «En 1876, para una ópera de Wagner, el diseñador de vestuario puso cuernos y alas en los cascos.» |
| 29.2–33.8 s | Revelación | «La imagen gustó tanto, que pintores, libros y películas la repitieron durante un siglo.» |
| 33.9–40.5 s | Cierre | «Algunos pueblos antiguos sí usaron cuernos en ceremonias. Pero no hay pruebas de que fueran el casco habitual de un guerrero vikingo.» |

## 3–4, 7–10. Storyboard: escena, cámara, personajes y textos
| # | Tiempo | Fondo | Cámara | Personajes (posición, expresión) | Texto en pantalla |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.1–4.4 | `e03_fiordo` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | vikingoCuernos (x=540, enfadado) | ¿SABÍAS QUE...? / LOS VIKINGOS NO USABAN CUERNOS |
| 2 | 4.6–7.5 | `e03_fiordo` | órbita: giro de −2,5° a +2,5° con desplazamiento lateral de 220 px | vikingoCuernos (x=330, desconfiado); vikingoCuernos (x=780, desconfiado) | ¿REALMENTE ERAN ASÍ? |
| 3 | 7.6–12.1 | `e03_museo` | whip pan: barrido lateral de 0,22 s desde fuera de cuadro y dolly in suave | arqueologo (x=330, preocupado, pensar) | — |
| 4 | 12.2–16.1 | `e03_museo` | órbita: giro de −2,5° a +2,5° con desplazamiento lateral de 220 px | — | GJERMUNDBU · SIGLO X |
| 5 | 16.2–20.4 | `e03_museo` | primerísimo primer plano (×1,45 → ×1,6) con deriva lenta | arqueologo (x=280, sonriente, senala) | SIGLO X |
| 6 | 20.6–23.0 | `e03_taller` | crash zoom out: empieza muy cerca (×1,45) y se abre en 0,5 s, luego deriva lenta | artista (x=540, sonriente, pensar) | 1876 |
| 7 | 23.1–29.1 | `e03_teatro` | dolly in lento y continuo (×1,0 → ×1,16) durante toda la frase | artista (x=300, riendo, senala); vikingoCuernos (x=760, desconfiado) | 1876 |
| 8 | 29.2–33.8 | `e03_teatro` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | parisino (x=260, riendo); parisina (x=560, riendo); artista (x=860, riendo) | — |
| 9 | 33.9–40.5 | `e03_batalla` | dolly out de cierre (×1,2 → ×1,0) | vikingo2 (x=400, sonriente); vikingo2 (x=760, sonriente) | SIN CUERNOS / EL MITO NACIÓ EN EL SIGLO XIX |

Subtítulos: frase de la narración, máximo dos líneas, palabra a palabra, con la palabra activa en amarillo.

## 5. Prompts de imagen (fondos limpios, sin texto)
Modelo: SD-Turbo (`motor/fondos.py`), 512×896 escalado a 1080×1890 y desenfocado. Sufijo común: «2D cartoon background art, painted animation background, flat colors with soft shading, thick clean outlines, detailed textures, warm cinematic lighting, no people, no text».

- `e03_fiordo`: norwegian fjord with a viking village, wooden longhouses and a longship, dramatic sky
- `e03_museo`: museum display room with glass cases and spotlights, dark elegant walls
- `e03_teatro`: 19th century opera theatre stage with red curtains and painted scenery
- `e03_taller`: 19th century artist studio with easels, costume sketches on the walls, big window
- `e03_batalla`: viking camp at dusk with shields, tents and bonfires

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
- Museo de Historia Cultural de Oslo: casco de Gjermundbu
- Roberta Frank, «The Invention of the Viking Horned Helmet» (2000)
- Britannica: Viking
