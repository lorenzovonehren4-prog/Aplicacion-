# La tumba que nadie encontraba — producción completa (42 s, 9:16)

Episodio del formato «¿Sabías que…?» (ver `shorts/SISTEMA_CURIOSIDADES.md`). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## 1–2. Guion y narración exacta
| Tiempo | Bloque | Narración |
| --- | --- | --- |
| 0.1–6.2 s | Gancho | «¿Sabías que un arqueólogo pasó años buscando una tumba en Egipto, hasta encontrar una de las más famosas de la historia?» |
| 6.5–10.5 s | Contexto | «Howard Carter estaba convencido: en el Valle de los Reyes faltaba un faraón.» |
| 10.6–13.5 s | Contexto | «Excavó temporada tras temporada. Y no encontró nada.» |
| 13.6–17.0 s | Desarrollo | «Su mecenas se cansó de pagar. Le dio una última temporada.» |
| 17.1–22.3 s | Desarrollo | «Noviembre de 1922. Un trabajador tropieza con algo bajo la arena: un escalón.» |
| 22.5–25.4 s | Desarrollo | «Dieciséis escalones más abajo, hay una puerta sellada.» |
| 25.5–30.9 s | Revelación | «Carter abre un pequeño agujero, acerca una vela... y ve el brillo del oro por todas partes.» |
| 31.0–35.2 s | Revelación | «Más de cinco mil objetos. Tardaron unos diez años en sacarlos y catalogarlos.» |
| 35.3–41.1 s | Cierre | «¿Y la famosa maldición? Una leyenda que creció después. Lo real fue el hallazgo que cambió la arqueología.» |

## 3–4, 7–10. Storyboard: escena, cámara, personajes y textos
| # | Tiempo | Fondo | Cámara | Personajes (posición, expresión) | Texto en pantalla |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.1–6.2 | `e14_valle` | crash zoom out: empieza muy cerca (×1,45) y se abre en 0,5 s, luego deriva lenta | — | ¿SABÍAS QUE...? / LA TUMBA QUE NADIE ENCONTRABA |
| 2 | 6.5–10.5 | `e14_valle` | órbita: giro de −2,5° a +2,5° con desplazamiento lateral de 220 px | carter (x=540, desconfiado, pensar) | — |
| 3 | 10.6–13.5 | `e14_excava` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | carter (x=300, preocupado); egipcio (x=760, preocupado) | — |
| 4 | 13.6–17.0 | `e14_campamento` | whip pan: barrido lateral de 0,22 s desde fuera de cuadro y dolly in suave | parisino (x=330, enfadado, habla); carter (x=780, preocupado) | ÚLTIMA OPORTUNIDAD |
| 5 | 17.1–22.3 | `e14_excava` | crash zoom: de ×1,0 a ×1,45 en 0,25 s para la revelación | egipcio (x=330, sorprendido, senala) | NOV. 1922 |
| 6 | 22.5–25.4 | `e14_escalon` | pan vertical descendente (320 px) | carter (x=540, sorprendido) | NOV. 1922 |
| 7 | 25.5–30.9 | `e14_camara` | dolly in lento y continuo (×1,0 → ×1,16) durante toda la frase | carter (x=300, sorprendido) | NOV. 1922 |
| 8 | 31.0–35.2 | `e14_camara` | tracking lateral de izquierda a derecha (320 px) siguiendo al personaje | — | +5.000 OBJETOS |
| 9 | 35.3–41.1 | `e14_valle` | dolly out de cierre (×1,2 → ×1,0) | carter (x=540, sonriente) | 1922 / LA TUMBA DE TUTANKAMÓN |

Subtítulos: frase de la narración, máximo dos líneas, palabra a palabra, con la palabra activa en amarillo.

## 5. Prompts de imagen (fondos limpios, sin texto)
Modelo: SD-Turbo (`motor/fondos.py`), 512×896 escalado a 1080×1890 y desenfocado. Sufijo común: «2D cartoon background art, painted animation background, flat colors with soft shading, thick clean outlines, detailed textures, warm cinematic lighting, no people, no text».

- `e14_valle`: the Valley of the Kings in Egypt, dry rocky cliffs, excavation site with tents, harsh sun
- `e14_excava`: archaeological dig in the egyptian desert with rubble, baskets and wooden ladders
- `e14_escalon`: stone steps cut into the rock descending to a sealed ancient egyptian doorway
- `e14_camara`: egyptian tomb chamber filled with golden treasures, statues, chests and a golden chariot, warm light
- `e14_campamento`: 1920s archaeologists camp at sunset near egyptian cliffs

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
- Griffith Institute (Universidad de Oxford): Tutankhamun: Anatomy of an Excavation
- Britannica: Howard Carter; Tutankhamun
