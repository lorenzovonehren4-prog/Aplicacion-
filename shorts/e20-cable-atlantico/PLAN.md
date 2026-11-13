# El cable que unió dos continentes — producción completa (45 s, 9:16)

Episodio del formato «¿Sabías que…?» (ver `shorts/SISTEMA_CURIOSIDADES.md`). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## 1–2. Guion y narración exacta
| Tiempo | Bloque | Narración |
| --- | --- | --- |
| 0.1–7.2 s | Gancho | «¿Sabías que el primer cable telegráfico transatlántico unió América y Europa, pero dejó de funcionar apenas unas semanas después?» |
| 7.4–12.0 s | Contexto | «Hasta entonces, una noticia tardaba unos diez días en cruzar el océano, en barco.» |
| 12.1–18.2 s | Contexto | «En 1858, dos barcos tienden un cable de más de tres mil kilómetros por el fondo del Atlántico.» |
| 18.3–19.0 s | Desarrollo | «Y funciona.» |
| 19.1–25.3 s | Desarrollo | «La reina Victoria le envía un mensaje al presidente Buchanan. Noventa y ocho palabras, que tardan dieciséis horas.» |
| 25.5–29.4 s | Desarrollo | «En las ciudades hay fiestas y fuegos artificiales. El mundo se había encogido.» |
| 29.5–33.9 s | Revelación | «Pero la señal era cada vez más débil. Un ingeniero subió el voltaje... y quemó el cable.» |
| 34.0–35.9 s | Revelación | «A las pocas semanas, quedó mudo.» |
| 36.0–43.8 s | Cierre | «Hubo que esperar hasta 1866 para tener una conexión permanente. Pero aquel primer intento abrió el camino a las comunicaciones modernas.» |

## 3–4, 7–10. Storyboard: escena, cámara, personajes y textos
| # | Tiempo | Fondo | Cámara | Personajes (posición, expresión) | Texto en pantalla |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.1–7.2 | `e20_mapa` | dolly in lento y continuo (×1,0 → ×1,16) durante toda la frase | — | ¿SABÍAS QUE...? / EL CABLE QUE UNIÓ DOS CONTINENTES |
| 2 | 7.4–12.0 | `e20_barco` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | marinero (x=330, sonriente) | 1858 |
| 3 | 12.1–18.2 | `e20_barco` | whip pan: barrido lateral de 0,22 s desde fuera de cuadro y dolly in suave | marinero (x=300, enfadado); capitan (x=760, sonriente, senala) | 1858 |
| 4 | 18.3–19.0 | `e20_fondo` | pan vertical descendente (320 px) | — | ¡FUNCIONA! · 1858 |
| 5 | 19.1–25.3 | `e20_telegrafo` | órbita: giro de −2,5° a +2,5° con desplazamiento lateral de 220 px | reina (x=300, sonriente); presidente (x=780, riendo) | 16 HORAS TARDÓ EL PRIMER MENSAJE |
| 6 | 25.5–29.4 | `e20_ciudad` | crash zoom out: empieza muy cerca (×1,45) y se abre en 0,5 s, luego deriva lenta | parisino (x=300, riendo, arriba); parisina (x=760, riendo, arriba) | — |
| 7 | 29.5–33.9 | `e20_telegrafo` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | telegrafista (x=540, sorprendido) | — |
| 8 | 34.0–35.9 | `e20_fondo` | primerísimo primer plano (×1,45 → ×1,6) con deriva lenta | — | sello «SIN SEÑAL» |
| 9 | 36.0–43.8 | `e20_mapa` | dolly out de cierre (×1,2 → ×1,0) | — | 1866 · 1858 → 1866 / EL PRIMER CABLE TRANSATLÁNTICO |

Subtítulos: frase de la narración, máximo dos líneas, palabra a palabra, con la palabra activa en amarillo.

## 5. Prompts de imagen (fondos limpios, sin texto)
Modelo: SD-Turbo (`motor/fondos.py`), 512×896 escalado a 1080×1890 y desenfocado. Sufijo común: «2D cartoon background art, painted animation background, flat colors with soft shading, thick clean outlines, detailed textures, warm cinematic lighting, no people, no text».

- `e20_mapa`: vintage 19th century map of the Atlantic ocean between America and Europe on aged paper
- `e20_barco`: 19th century steam and sail ship on the atlantic ocean with a huge cable reel on deck
- `e20_fondo`: deep ocean floor with sand, rocks and blue light rays from above
- `e20_telegrafo`: 19th century telegraph office with a telegraph key machine on a wooden desk, wires and batteries
- `e20_ciudad`: 19th century New York street celebration at night with fireworks, flags and gas lamps

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
- Atlantic-Cable.com: History of the Atlantic Cable
- IEEE Engineering and Technology History Wiki: Transatlantic cable
- Britannica: Transatlantic cable
