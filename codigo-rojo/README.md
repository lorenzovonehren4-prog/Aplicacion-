# Código Rojo

Persecuciones en un barrio 3D (siempre el mismo, semilla fija), cerrado por paredes rojas 60 % transparentes que funcionan como pared. Todo el texto en español.

- **Barrio** (`src/city.js`): cuadrícula de calles cada 90 m (`GRID`), casas y tiendas por manzana, parque, grifo, colegio, un canal (`|z| < CANAL`) que se cruza por 6 puentes en arco, un cerro con túnel (calle z = 135), 8 rampas, semáforos (ciclo de 14 s, `lightState`) y postes. Para la física: `groundH` (puentes y rampas), cajas sólidas en una grilla (`addSolid`, `solidsNear`), `lineFree` y el grafo de calles (`CITY.nodes`, `findPath` con A*).
- **Roles**: ladrón (te persiguen 3 patrulleros: `chase` va directo, `cut` te corta adelante, `flank` por el costado) o policía (persigues a un ladrón con IA que huye eligiendo en cada cruce lo que más lo aleja, o que va a su guarida).
- **Arresto**: barra que se llena con un patrullero a menos de 7,5 m y el ladrón casi parado (o, más lento, pegado a toda velocidad). Si el ladrón queda destrozado a choques, cuenta como atrapado. Los patrulleros destrozados vuelven a salir más lejos.
- **Metas**: aguantar X s, juntar bolsas y aguantar, llegar a la guarida; de policía, atraparlo en X s o antes de que llegue a su guarida. 14 misiones (`MISSIONS`, 7 por rol, se abren en orden) y partida libre (rol, dificultad, meta, tiempo y hora: día, tarde o noche).
- **Dificultad** (`DIFFS`): velocidad y habilidad de la IA, embestidas, qué tan rápido arrestan y cuánto tráfico.
- **Garaje**: 6 carros con velocidad, aceleración, agarre, vida y peso; de policía es el mismo carro con pintura de patrullero y circulina.
- **Física** (`src/car.js`, la misma para todos): agarre lateral, freno de mano para derrapar, menos agarre en el pasto, saltos en las rampas, choques contra casas, árboles, canal y paredes (tres círculos por carro) y entre carros (impulso según el peso).
- **IA** (`src/ai.js`): tráfico que sigue su carril, dobla al azar, para en rojo y no choca al de adelante; patrulleros que planean por las calles y embisten cuando te ven; ladrón que huye y adelanta por el otro carril.
- **Cámaras**: atrás o cabina (C). Radar que gira con el carro. Sirena que suena más fuerte cuanto más cerca están.
- **Gráficos**: carros con carrocería perfilada (`BODY` en `src/car.js`: capó, techo, pasos de rueda, faros y luces que brillan), pintura con barniz y reflejos del cielo (mapa de entorno), postproceso propio (`src/post.js`: brillo, tonos tipo cine y viñeta; sólo con calidad alta y WebGL2). Casas con texturas de tarrajeo y teja, ventanas con marco, porches, cocheras, chimeneas, buzones, arbustos, carros estacionados, postes con cables y nubes.
- **Más**: nitro (se recarga solo y más rápido derrapando o en el aire) con llama azul; marcas de llantas en el piso (`fxSkid`), humo de llantas, humo y fuego del motor dañado (`fxFire`); cabina por dentro con tablero, relojes dibujados en vivo, pantalla con mapa, volante, asientos y espejos (la carrocería se recorta detrás del parabrisas con un plano de recorte); cámara de atrás que no atraviesa casas (`camClip`); cerros con relieve y la ciudad a lo lejos con ventanas que se prenden de noche; garaje en una vitrina aparte (`src/showroom.js`); resultados con 3 estrellas (meta, motor sano, y no dejarse acorralar o atraparlo rápido), guardadas por misión en `save.stars`.
- **IA**: frenar parado con `stop` no mete reversa (antes los patrulleros esperando y el tráfico en rojo iban para atrás); da la vuelta en tres movimientos cuando el objetivo quedó atrás y retrocede si no avanza en 3 s.
- **Interfaz**: menú tipo consola (rango, misión destacada, atajos), velocímetro circular con marcha y vida, anillo del tiempo, porcentaje de arresto y pantalla de carga con consejos.
- Guardado en `localStorage` (`codigorojo_v1`). El portal lee misiones, fugas y arrestos.

## Cómo correrlo

Abrir `index.html` (scripts clásicos, también con `file://`). three.js r160 en `vendor/`.

Controles: ↑/W acelerar, ↓/S frenar y reversa, ←→/A D girar, Espacio freno de mano, Shift/N nitro, C cámara, H bocina, R volver a la calle, P/Esc pausa. En pantallas táctiles salen botones.

Orden de carga: `data.js` → `city.js` → `world.js` → `post.js` → `car.js` → `ai.js` → `audio.js` → `showroom.js` → `game.js` → `ui.js`.

## Pruebas

```bash
CHROMIUM_PATH=... node tests/smoke.mjs [--shots]   # demo del menú, misión de ladrón y de policía manejadas por la IA, noche, garaje
CHROMIUM_PATH=... node tests/pantallas.mjs         # cabina de 3 carros, garaje y resultados
CHROMIUM_PATH=... node tests/menu.mjs              # fotos del menú (PC, pantalla baja, celular)
CHROMIUM_PATH=... node tests/carros.mjs            # fotos de los carros
CHROMIUM_PATH=... node tests/vistas.mjs            # fotos del barrio a distintas horas
CHROMIUM_PATH=... node tools/portadas.mjs           # imágenes para el portal (luego a webp en portal/img/)
```
