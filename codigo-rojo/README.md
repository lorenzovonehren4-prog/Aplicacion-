# Código Rojo

Persecuciones en un barrio 3D (siempre el mismo, semilla fija), cerrado por paredes rojas 60 % transparentes que funcionan como pared. Todo el texto en español.

- **Barrio** (`src/city.js`): cuadrícula de calles cada 90 m (`GRID`), casas y tiendas por manzana, parque, grifo, colegio, un canal (`|z| < CANAL`) que se cruza por 6 puentes en arco, un cerro con túnel (calle z = 135), 8 rampas, semáforos (ciclo de 14 s, `lightState`) y postes. Para la física: `groundH` (puentes y rampas), cajas sólidas en una grilla (`addSolid`, `solidsNear`), `lineFree` y el grafo de calles (`CITY.nodes`, `findPath` con A*).
- **Roles**: ladrón (te persiguen 3 patrulleros: `chase` va directo, `cut` te corta adelante, `flank` por el costado) o policía (persigues a un ladrón con IA que huye eligiendo en cada cruce lo que más lo aleja, o que va a su guarida).
- **Arresto**: barra que se llena con un patrullero a menos de 7,5 m y el ladrón casi parado (o, más lento, pegado a toda velocidad). Si el ladrón queda destrozado a choques, cuenta como atrapado. Los patrulleros destrozados vuelven a salir más lejos.
- **Metas**: aguantar X s, juntar bolsas y aguantar, llegar a la guarida; de policía, atraparlo en X s o antes de que llegue a su guarida. 14 misiones (`MISSIONS`, 7 por rol, se abren en orden; algunas con clima fijo: Hora punta con garúa, Noche caliente con lluvia, Cierre de puentes con tormenta y Fuga nocturna con neblina) y partida libre (rol, dificultad, meta, tiempo, hora: día, tarde o noche, y clima).
- **Dificultad** (`DIFFS`): velocidad y habilidad de la IA, embestidas, qué tan rápido arrestan y cuánto tráfico.
- **Garaje**: 6 carros con velocidad, aceleración, agarre, vida y peso; de policía es el mismo carro con pintura de patrullero y circulina.
- **Física** (`src/car.js`, la misma para todos): agarre lateral, freno de mano para derrapar, menos agarre en el pasto, saltos en las rampas, choques contra casas, árboles, canal y paredes (tres círculos por carro) y entre carros (impulso según el peso).
- **IA** (`src/ai.js`): tráfico que sigue su carril, dobla al azar, para en rojo y no choca al de adelante; patrulleros que planean por las calles y embisten cuando te ven; ladrón que huye y adelanta por el otro carril.
- **Cámaras**: atrás o cabina (C). Radar que gira con el carro. Sirena que suena más fuerte cuanto más cerca están.
- **Gráficos**: carros armados por secciones (`loftBody` en `src/car.js`: costados abombados, hombro, guardabarros sobre las ruedas, techo más angosto que la base, vidrios y parantes en la misma superficie; faros con proyectores y luz de día, parrilla con listones, espejos del color del carro, manijas, limpiaparabrisas, escapes, aros de 5 rayos dobles con tuercas y caliper; los estacionados usan una versión liviana, `carGeo(tipo, true)`), pintura con barniz y reflejos del cielo (mapa de entorno), postproceso propio (`src/post.js`: brillo, tonos tipo cine y viñeta; sólo con calidad alta y WebGL2). Casas con texturas de tarrajeo y teja, ventanas con marco, porches, cocheras, chimeneas, buzones, arbustos, carros estacionados, postes con cables y nubes.
- **Más**: nitro (se recarga solo y más rápido derrapando o en el aire) con llama azul; marcas de llantas en el piso (`fxSkid`), humo de llantas, humo y fuego del motor dañado (`fxFire`); cabina por dentro con tablero, relojes dibujados en vivo, pantalla con mapa, volante, asientos y espejos (la carrocería se recorta detrás del parabrisas con un plano de recorte); cámara de atrás que no atraviesa casas (`camClip`); cerros con relieve y la ciudad a lo lejos con ventanas que se prenden de noche; garaje en una vitrina aparte (`src/showroom.js`); resultados con 3 estrellas (meta, motor sano, y no dejarse acorralar o atraparlo rápido), guardadas por misión en `save.stars`.
- **IA**: frenar parado con `stop` no mete reversa (antes los patrulleros esperando y el tráfico en rojo iban para atrás); da la vuelta en tres movimientos cuando el objetivo quedó atrás y retrocede si no avanza en 3 s.
- **Interfaz**: menú tipo consola (rango, misión destacada, atajos), velocímetro circular con marcha y vida, anillo del tiempo, porcentaje de arresto y pantalla de carga con consejos.
- **Vida en la calle** (`src/peds.js`, personas de `src/people.js` copiadas de Último Disparo en versión liviana): peatones que dan la vuelta a la manzana por la vereda cerca de la cámara y saltan a un lado cuando viene un carro (nadie sale herido). Árboles de 3 tipos con copa de varias bolas, cancha con franjas y líneas, manos con guantes y brazos en el volante de la cabina, y desenfoque de velocidad a fondo y con nitro.
- **Clima** (`src/weather.js`): despejado, nublado, garúa, lluvia, tormenta y neblina (`WEATHER`), encima de la hora (`setWeather(id, hora)`; `atmos` mezcla los colores de `TIMES` con el cielo gris). Nubes dibujadas en el shader del cielo, luz y entorno de reflejos grises, sol tapado (con lluvia no se dibuja el mapa de sombras, así sale más barato) y faros prendidos de día con tormenta o neblina. Lluvia en la GPU: una sola malla de gotas instanciadas que sigue a la cámara (6000 en Altos, 3000 en Medios y 1200 en Bajos), que se estiran con la velocidad y brillan delante de los faros; salpicaduras en el piso (otra malla animada en el shader; no en Bajos). Calle mojada: asfalto con charcos casi espejo (`roughnessMap` dibujado en canvas) y el resto del barrio más oscuro (`wetMat`); reflejos de postes, semáforos (con su color de verdad), faros, luces traseras y circulinas como cuadros aditivos estirados hacia la cámara, sin luces reales (en Bajos sólo se oscurece la calle). Agua que levantan las llantas (`wetSpray`), limpiaparabrisas y gotas en el vidrio de la cabina (`makeWipers`, `updateWipers`), menos agarre y frenada con la pista mojada (`W.gripMul`, también en la IA), relámpagos con rayo a la vista y trueno que llega después según la distancia, y sonido de lluvia (más el golpeteo en el techo dentro de la cabina). El menú de fondo sale con clima la mitad de las veces.
- **Rendimiento** (para las compus del colegio): Opciones → Gráficos: Auto, Altos, Medios o Bajos (`GFX` y `applyQuality` en `src/world.js`). Se guarda en `save.opt.graficos` (y se sigue escribiendo `save.opt.quality`, `'alta'` o `'baja'`). Auto mide los cuadros por segundo y, si va a menos de 45, baja un nivel y avisa (`autoGfx` en `src/ui.js`, nivel en `save.opt.autoNivel`). Medios: sin MSAA, con FXAA, sombra de 1024 y bloom en 2 tamaños. Bajos: sin sombras ni posprocesado.
  - Lo fijo del barrio se dibuja en pocas mallas grandes; su sombra sale de copias por sector de 90 m que sólo se dibujan en el pase de sombras (`shadowCast`, `shadowOnly`, `hookShadowPass`): para que algo nuevo proyecte sombra, `shadowCast(geo)`.
  - Lo repetido (carros estacionados, árboles, arbustos, buzones) va con niveles de detalle por instancia: cerca el modelo completo, lejos uno liviano, y lo que no se ve se descarta (`lodSet` y `updateLods`, que corre en cada cuadro desde `renderFrame`). Para cosas repetidas nuevas, usar `lodSet`.
  - Carros: de cerca 8 llamadas de dibujo (11 el patrullero; las 4 ruedas son una malla con huesos); de 45 m en adelante una sola malla, y de 140 m una más liviana (`carLodGeo`, `carLodMat`, `setCarLod`, `updateCarLods`). La sombra la da una copia liviana.
  - Personas: todo el cuerpo en una malla con huesos más la cabeza con la cara (`liteMerge`); sin cara a más de 35 m y ocultas a más de 95 m. 14 en Altos, 10 en Medios y 6 en Bajos.
  - Humo y fuego en una sola malla instanciada que mira a la cámara (`FX.mesh`); las piezas de los choques también (`FX.bits`). Al empezar una partida se compilan los materiales (`warmUp`) para que no haya tirones.
- Guardado en `localStorage` (`codigorojo_v1`). El portal lee misiones, fugas y arrestos.

## Cómo correrlo

Abrir `index.html` (scripts clásicos, también con `file://`). three.js r160 en `vendor/`.

Controles: ↑/W acelerar, ↓/S frenar y reversa, ←→/A D girar, Espacio freno de mano, Shift/N nitro, C cámara, H bocina, R volver a la calle, P/Esc pausa. En pantallas táctiles salen botones.

Orden de carga: `data.js` → `city.js` → `world.js` → `weather.js` → `post.js` → `car.js` → `people.js` → `peds.js` → `ai.js` → `audio.js` → `showroom.js` → `game.js` → `ui.js`.

## Pruebas

```bash
CHROMIUM_PATH=... node tests/smoke.mjs [--shots]   # demo del menú, misión de ladrón y de policía manejadas por la IA, noche, tormenta, garaje
CHROMIUM_PATH=... node tests/pantallas.mjs         # cabina de 3 carros, garaje y resultados
CHROMIUM_PATH=... node tests/menu.mjs              # fotos del menú (PC, pantalla baja, celular)
CHROMIUM_PATH=... node tests/carros.mjs            # fotos de los carros
CHROMIUM_PATH=... node tests/vistas.mjs            # fotos del barrio a distintas horas
CHROMIUM_PATH=... node tests/fotos.mjs [carpeta] [prefijo] [solo=fija-dia,media]   # fotos y rendimiento (triángulos y llamadas); clima: solo=lluvia-noche,lluvia-dia,lluvia-cabina,lluvia-baja,...
CHROMIUM_PATH=... node tools/portadas.mjs           # imágenes para el portal (luego a webp en portal/img/)
```
