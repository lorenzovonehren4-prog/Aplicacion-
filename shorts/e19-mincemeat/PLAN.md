# El maletín que engañó a los nazis — producción completa (45 s, 9:16)

Episodio del formato «¿Sabías que…?» (ver `shorts/SISTEMA_CURIOSIDADES.md`). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## 1–2. Guion y narración exacta
| Tiempo | Bloque | Narración |
| --- | --- | --- |
| 0.1–6.7 s | Gancho | «¿Sabías que durante la Segunda Guerra Mundial los británicos usaron una identidad falsa y documentos secretos para engañar a los nazis?» |
| 6.9–11.9 s | Contexto | «1943. Los Aliados van a invadir Sicilia. Y es el objetivo más obvio.» |
| 12.0–14.7 s | Contexto | «Hay que hacer creer al enemigo que atacarán en otro sitio.» |
| 14.8–18.4 s | Desarrollo | «Inventan a un oficial que nunca existió: el comandante William Martin.» |
| 18.5–25.1 s | Desarrollo | «Le preparan cartas personales, entradas de teatro, y un maletín con planes falsos: el ataque será en Grecia y Cerdeña.» |
| 25.2–30.0 s | Desarrollo | «Un submarino deja el cuerpo, con el maletín, frente a la costa de Huelva, en España.» |
| 30.1–33.7 s | Revelación | «Los documentos acaban en manos de la inteligencia alemana. Y se los creen.» |
| 33.8–38.0 s | Revelación | «Alemania refuerza Grecia. En julio, los Aliados desembarcan en Sicilia.» |
| 38.1–44.4 s | Cierre | «Una operación de engaño hizo que el enemigo creyera una historia falsa, justo antes de una invasión real.» |

## 3–4, 7–10. Storyboard: escena, cámara, personajes y textos
| # | Tiempo | Fondo | Cámara | Personajes (posición, expresión) | Texto en pantalla |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.1–6.7 | `e19_maletin` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | — | ¿SABÍAS QUE...? / EL MALETÍN QUE ENGAÑÓ A LOS NAZIS |
| 2 | 6.9–11.9 | `e19_mapa` | crash zoom out: empieza muy cerca (×1,45) y se abre en 0,5 s, luego deriva lenta | espia (x=330, preocupado, senala) | SICILIA · 1943 |
| 3 | 12.0–14.7 | `e19_oficina` | whip pan: barrido lateral de 0,22 s desde fuera de cuadro y dolly in suave | espia (x=300, desconfiado, habla); espia2 (x=780, sonriente) | 1943 |
| 4 | 14.8–18.4 | `e19_oficina` | órbita: giro de −2,5° a +2,5° con desplazamiento lateral de 220 px | — | MAJOR MARTIN · 1943 |
| 5 | 18.5–25.1 | `e19_maletin` | primerísimo primer plano (×1,45 → ×1,6) con deriva lenta | — | — |
| 6 | 25.2–30.0 | `e19_playa` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | pescador (x=330, sorprendido, senala) | 30 ABRIL 1943 |
| 7 | 30.1–33.7 | `e19_despacho` | dolly in lento y continuo (×1,0 → ×1,16) durante toda la frase | aleman (x=540, desconfiado, pensar) | — |
| 8 | 33.8–38.0 | `e19_mapa` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | — | SICILIA ✓ |
| 9 | 38.1–44.4 | `e19_maletin` | dolly out de cierre (×1,2 → ×1,0) | — | JULIO 1943 · SICILIA · 1943 / OPERACIÓN CARNE PICADA |

Subtítulos: frase de la narración, máximo dos líneas, palabra a palabra, con la palabra activa en amarillo.

## 5. Prompts de imagen (fondos limpios, sin texto)
Modelo: SD-Turbo (`motor/fondos.py`), 512×896 escalado a 1080×1890 y desenfocado. Sufijo común: «2D cartoon background art, painted animation background, flat colors with soft shading, thick clean outlines, detailed textures, warm cinematic lighting, no people, no text».

- `e19_maletin`: a brown leather military briefcase on a wooden desk with old documents and a desk lamp, 1940s
- `e19_oficina`: 1940s british intelligence office in London, desks with files, typewriter, blackout curtains
- `e19_mapa`: 1940s war room with a huge wall map of the Mediterranean sea, lamps, wooden table
- `e19_playa`: sandy beach of Huelva Spain at dawn in 1943, fishing boats, calm misty sea
- `e19_despacho`: 1940s german military office with a big desk, maps and a telephone

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
- The National Archives (Reino Unido): Operation Mincemeat
- Ben Macintyre, «Operation Mincemeat» (2010)
- Imperial War Museums
