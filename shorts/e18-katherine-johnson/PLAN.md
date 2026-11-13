# La mujer que calculó el camino a la luna — producción completa (42 s, 9:16)

Episodio del formato «¿Sabías que…?» (ver `shorts/SISTEMA_CURIOSIDADES.md`). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## 1–2. Guion y narración exacta
| Tiempo | Bloque | Narración |
| --- | --- | --- |
| 0.1–5.3 s | Gancho | «¿Sabías que una matemática fue fundamental para calcular las trayectorias que llevaron astronautas hasta la Luna?» |
| 5.5–8.7 s | Contexto | «Katherine Johnson trabajaba en la NASA como «computadora humana».» |
| 8.8–11.5 s | Contexto | «Hacía a mano los cálculos que hoy hace un ordenador.» |
| 11.6–16.3 s | Desarrollo | «En 1961, calculó la trayectoria del primer estadounidense en el espacio.» |
| 16.5–22.6 s | Desarrollo | «En 1962, John Glenn iba a dar la vuelta a la Tierra. Los cálculos venían de las nuevas máquinas.» |
| 22.7–26.8 s | Desarrollo | «Y él pidió una cosa antes de despegar: que Katherine revisara los números a mano.» |
| 27.0–29.4 s | Revelación | «Si ella decía que estaban bien, él volaba.» |
| 29.6–35.7 s | Revelación | «Después llegaron sus cálculos para el Apolo once. En 1969, la humanidad pisó la Luna.» |
| 35.9–41.4 s | Cierre | «No lo hizo sola: fue parte de un equipo enorme. Pero sin sus números, el camino no habría sido el mismo.» |

## 3–4, 7–10. Storyboard: escena, cámara, personajes y textos
| # | Tiempo | Fondo | Cámara | Personajes (posición, expresión) | Texto en pantalla |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.1–5.3 | `e18_cohete` | pan vertical ascendente (300 px) | — | ¿SABÍAS QUE...? / LA MUJER QUE CALCULÓ EL CAMINO A LA LUNA |
| 2 | 5.5–8.7 | `e18_oficina` | whip pan: barrido lateral de 0,22 s desde fuera de cuadro y dolly in suave | katherine (x=540, sonriente) | — |
| 3 | 8.8–11.5 | `e18_pizarra` | primerísimo primer plano (×1,45 → ×1,6) con deriva lenta | katherine (x=330, sonriente, senala) | — |
| 4 | 11.6–16.3 | `e18_control` | crash zoom out: empieza muy cerca (×1,45) y se abre en 0,5 s, luego deriva lenta | nasa (x=300, sonriente); katherine (x=760, sonriente) | 1961 |
| 5 | 16.5–22.6 | `e18_control` | órbita: giro de −2,5° a +2,5° con desplazamiento lateral de 220 px | astronauta (x=540, preocupado, pensar) | 1962 |
| 6 | 22.7–26.8 | `e18_oficina` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | astronauta (x=300, sonriente, senala); katherine (x=780, sonriente) | «QUE ELLA LO REVISE» · 1962 |
| 7 | 27.0–29.4 | `e18_pizarra` | dolly in lento y continuo (×1,0 → ×1,16) durante toda la frase | katherine (x=540, riendo) | — |
| 8 | 29.6–35.7 | `e18_luna` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | astronauta (x=540, sonriente) | 1969 |
| 9 | 35.9–41.4 | `e18_cohete` | dolly out de cierre (×1,2 → ×1,0) | katherine (x=540, sonriente) | KATHERINE JOHNSON / 1918 – 2020 |

Subtítulos: frase de la narración, máximo dos líneas, palabra a palabra, con la palabra activa en amarillo.

## 5. Prompts de imagen (fondos limpios, sin texto)
Modelo: SD-Turbo (`motor/fondos.py`), 512×896 escalado a 1080×1890 y desenfocado. Sufijo común: «2D cartoon background art, painted animation background, flat colors with soft shading, thick clean outlines, detailed textures, warm cinematic lighting, no people, no text».

- `e18_cohete`: a Saturn V rocket launching with fire and smoke, blue sky, launch tower
- `e18_oficina`: 1960s NASA office with desks, mechanical calculators, blackboards full of equations
- `e18_pizarra`: large blackboard covered with orbital mechanics equations and trajectory drawings
- `e18_control`: 1960s mission control room with consoles, screens and a big orbital map
- `e18_luna`: surface of the Moon with the Earth in the black sky, lunar module far away

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
- NASA: Katherine Johnson Biography
- NASA Langley: «She Was a Computer When Computers Wore Skirts»
- Britannica: Katherine Johnson
