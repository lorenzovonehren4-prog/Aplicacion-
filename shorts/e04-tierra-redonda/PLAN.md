# Nadie creía que la tierra era plana — producción completa (41 s, 9:16)

Episodio del formato «¿Sabías que…?» (ver `shorts/SISTEMA_CURIOSIDADES.md`). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## 1–2. Guion y narración exacta
| Tiempo | Bloque | Narración |
| --- | --- | --- |
| 0.1–4.6 s | Gancho | «¿Sabías que los estudiosos de la época de Cristóbal Colón ya sabían que la Tierra era redonda?» |
| 4.8–9.0 s | Contexto | «Nos contaron que Colón tuvo que convencer a todos de que no era plana. No fue así.» |
| 9.1–14.5 s | Contexto | «Los griegos lo sabían. Eratóstenes incluso midió su tamaño, unos doscientos años antes de Cristo.» |
| 14.6–19.6 s | Desarrollo | «Y en las universidades medievales se enseñaba con un libro llamado, justamente, La Esfera.» |
| 19.7–21.8 s | Desarrollo | «Entonces, ¿de qué discutían con Colón?» |
| 21.9–26.2 s | Desarrollo | «Del tamaño. Colón creía que Asia estaba muy cerca navegando hacia el oeste.» |
| 26.3–30.0 s | Revelación | «Los expertos decían que estaba muchísimo más lejos. Y tenían razón.» |
| 30.2–36.7 s | Revelación | «Con sus barcos, jamás habría llegado a Asia. Lo salvó algo que nadie esperaba: América estaba en medio.» |
| 36.8–40.5 s | Cierre | «No discutían si era redonda. Discutían cuánto había que navegar.» |

## 3–4, 7–10. Storyboard: escena, cámara, personajes y textos
| # | Tiempo | Fondo | Cámara | Personajes (posición, expresión) | Texto en pantalla |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.1–4.6 | `e04_plana` | crash zoom out: empieza muy cerca (×1,45) y se abre en 0,5 s, luego deriva lenta | — | ¿SABÍAS QUE...? / NADIE CREÍA QUE LA TIERRA ERA PLANA |
| 2 | 4.8–9.0 | `e04_corte` | whip pan: barrido lateral de 0,22 s desde fuera de cuadro y dolly in suave | capitan (x=300, sonriente, senala); erudito (x=780, preocupado) | — |
| 3 | 9.1–14.5 | `e04_grecia` | órbita: giro de −2,5° a +2,5° con desplazamiento lateral de 220 px | romano (x=540, sonriente, pensar) | c. 240 a. C. |
| 4 | 14.6–19.6 | `e04_biblio` | dolly in lento y continuo (×1,0 → ×1,16) durante toda la frase | erudito (x=330, sonriente, habla); monje (x=780, neutro) | «DE SPHAERA» |
| 5 | 19.7–21.8 | `e04_corte` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | erudito (x=300, enfadado); capitan (x=780, enfadado) | — |
| 6 | 21.9–26.2 | `e04_corte` | primerísimo primer plano (×1,45 → ×1,6) con deriva lenta | capitan (x=400, riendo, senala) | ¿CUÁNTO HAY QUE NAVEGAR? · 1492 |
| 7 | 26.3–30.0 | `e04_biblio` | travelling lateral hacia la izquierda | erudito (x=540, desconfiado, pensar) | 1492 |
| 8 | 30.2–36.7 | `e04_oceano` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | — | — |
| 9 | 36.8–40.5 | `e04_oceano` | dolly out de cierre (×1,2 → ×1,0) | capitan (x=540, sonriente) | NO ERA LA FORMA / ERA LA DISTANCIA |

Subtítulos: frase de la narración, máximo dos líneas, palabra a palabra, con la palabra activa en amarillo.

## 5. Prompts de imagen (fondos limpios, sin texto)
Modelo: SD-Turbo (`motor/fondos.py`), 512×896 escalado a 1080×1890 y desenfocado. Sufijo común: «2D cartoon background art, painted animation background, flat colors with soft shading, thick clean outlines, detailed textures, warm cinematic lighting, no people, no text».

- `e04_plana`: old fantasy map illustration of a flat earth with waterfalls at the edges and sea monsters
- `e04_biblio`: medieval library with wooden shelves, manuscripts, candles and a globe
- `e04_grecia`: ancient greek city of Alexandria with a great library and a lighthouse
- `e04_corte`: 15th century spanish royal court hall with maps on a table, stone arches
- `e04_oceano`: vast open atlantic ocean under a huge sky with a small sailing ship

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
- Jeffrey Burton Russell, «Inventing the Flat Earth» (1991)
- Sacrobosco, «De sphaera mundi» (c. 1230)
- Britannica: Eratosthenes; Christopher Columbus
