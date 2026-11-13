# En salem nadie fue quemado — producción completa (41 s, 9:16)

Episodio del formato «¿Sabías que…?» (ver `shorts/SISTEMA_CURIOSIDADES.md`). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## 1–2. Guion y narración exacta
| Tiempo | Bloque | Narración |
| --- | --- | --- |
| 0.1–5.4 s | Gancho | «¿Sabías que durante los famosos juicios de las brujas de Salem, ninguna persona fue quemada en la hoguera?» |
| 5.7–11.4 s | Contexto | «1692. Un pequeño pueblo de Massachusetts. Varias niñas empiezan a sufrir ataques extraños.» |
| 11.5–15.1 s | Contexto | «Los adultos buscan una explicación. Y encuentran una: brujería.» |
| 15.2–19.8 s | Desarrollo | «Las acusaciones se multiplican. En pocos meses, hay más de doscientas personas señaladas.» |
| 19.9–23.8 s | Desarrollo | «Un tribunal especial los juzga, con pruebas que hoy no valdrían nada.» |
| 23.9–27.4 s | Desarrollo | «Diecinueve personas fueron condenadas a la horca. Ninguna a la hoguera.» |
| 27.5–31.8 s | Revelación | «Un hombre, Giles Corey, murió por negarse a declarar. Y otros murieron en la cárcel.» |
| 31.9–36.0 s | Revelación | «Pocos años después, jueces y vecinos reconocieron el error, y pidieron perdón.» |
| 36.2–39.9 s | Cierre | «La historia real fue terrible. Pero no ocurrió como la cuentan las películas.» |

## 3–4, 7–10. Storyboard: escena, cámara, personajes y textos
| # | Tiempo | Fondo | Cámara | Personajes (posición, expresión) | Texto en pantalla |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.1–5.4 | `e07_aldea` | crash zoom out: empieza muy cerca (×1,45) y se abre en 0,5 s, luego deriva lenta | — | ¿SABÍAS QUE...? / EN SALEM NADIE FUE QUEMADO |
| 2 | 5.7–11.4 | `e07_casa` | dolly in lento y continuo (×1,0 → ×1,16) durante toda la frase | puritana (x=330, sorprendido); puritano (x=780, preocupado) | SALEM · 1692 |
| 3 | 11.5–15.1 | `e07_aldea` | whip pan: barrido lateral de 0,22 s desde fuera de cuadro y dolly in suave | puritano (x=300, enfadado, senala); puritana (x=760, sorprendido) | SALEM · 1692 |
| 4 | 15.2–19.8 | `e07_aldea` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | puritano (x=200, enfadado, senala); puritana (x=500, sorprendido); puritano (x=820, enfadado, senala) | SALEM · 1692 · +200 PERSONAS ACUSADAS |
| 5 | 19.9–23.8 | `e07_tribunal` | órbita: giro de −2,5° a +2,5° con desplazamiento lateral de 220 px | juez (x=540, enfadado, habla) | — |
| 6 | 23.9–27.4 | `e07_tribunal` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | — | NINGUNA EN LA HOGUERA · 19 CONDENADOS A LA HORCA |
| 7 | 27.5–31.8 | `e07_casa` | primerísimo primer plano (×1,45 → ×1,6) con deriva lenta | puritano (x=540, ojos cerrados) | — |
| 8 | 31.9–36.0 | `e07_bosque` | travelling lateral hacia la izquierda | juez (x=400, preocupado, pensar) | — |
| 9 | 36.2–39.9 | `e07_memorial` | dolly out de cierre (×1,2 → ×1,0) | — | SALEM · 1692 / LA HISTORIA REAL |

Subtítulos: frase de la narración, máximo dos líneas, palabra a palabra, con la palabra activa en amarillo.

## 5. Prompts de imagen (fondos limpios, sin texto)
Modelo: SD-Turbo (`motor/fondos.py`), 512×896 escalado a 1080×1890 y desenfocado. Sufijo común: «2D cartoon background art, painted animation background, flat colors with soft shading, thick clean outlines, detailed textures, warm cinematic lighting, no people, no text».

- `e07_aldea`: 17th century puritan village of Salem at dusk, dark wooden houses, a small church, bare trees, fog
- `e07_casa`: dark 17th century colonial wooden house interior with a fireplace and candles
- `e07_tribunal`: 17th century colonial courtroom with wooden benches, a judge desk and candles
- `e07_memorial`: quiet stone memorial with granite benches and old trees in autumn
- `e07_bosque`: misty new england forest in autumn at dawn

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
- Salem Witch Museum
- Smithsonian Magazine: A Brief History of the Salem Witch Trials
- Britannica: Salem witch trials
