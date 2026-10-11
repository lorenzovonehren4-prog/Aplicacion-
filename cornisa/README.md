# Drive In The Serrín

(Carpeta `cornisa/` y guardado `cornisa_v1`: nombres internos de cuando se llamaba Cornisa.)

Juego de manejo en 3D por carreteras de montaña, visto desde la cabina de un 4x4 (volante, manos, velocímetro y tacómetro que se mueven). Si te sales por el abismo, pierdes. Todo el texto en español.

- **8 montañas** que se abren en orden: cada una pide estrellas en la anterior (y algunas, estrellas en total o mejoras en el taller). Cañón del Sol, Bosque de Pinos, Paso Nevado (resbala), Valle de Niebla, Volcán Despierto (rocas en la pista), Cumbre de Noche (sólo faros), Tormenta (lluvia, rayos, piso mojado) y Cima del Cóndor (cresta con abismo a los dos lados).
- **3 estrellas** por montaña: llegar a la meta y dos objetivos (tiempo, monedas o pocos choques).
- **Taller**: motor, frenos, llantas y carrocería (5 niveles cada una) y 8 pinturas.
- **Al pasarte la Cima del Cóndor**: pantalla final, todas las pinturas (también la Dorada), la Ruta libre (montaña al azar) y la insignia Cóndor. Se sigue jugando todo.
- 14 insignias propias. El portal da la insignia "Rey del Serrín" al pasarte el juego.

## Cómo correrlo

Abrir `index.html` (scripts clásicos, también con `file://`). `vendor/three.min.js` es three.js r160 (global `THREE`), fuentes en `vendor/fonts/`.

Controles: ↑/W acelerar, ↓/S/Espacio frenar y reversa, ←→/A D girar, C cámara (cabina o afuera), P/Esc pausa. En pantallas táctiles salen botones. Los menús se recorren con flechas y Enter.

## Archivos (orden de carga)

- `src/data.js`: ambientes (`THEMES`), montañas (`LEVELS`: largo, ancho, radios de curva, pendiente, mezcla de bordes `mix`, barandas `guard`, rocas, agarre, objetivos `obj`, requisitos `unlock`), `freeLevel`, mejoras (`UPGRADES`, `carStats`), pinturas, insignias (`ACHS`) y guardado (`save`, clave `cornisa_v1`).
- `src/road.js`: genera la ruta con semilla (`buildRoad`): curvatura por metro, rumbo limitado a ±75° de la dirección general (así la ruta nunca se cruza), pendiente, tramos de borde C/L/R/B (pared, abismo a un lado, cresta), barandas, perfil del cerro a cada lado cada 2 m (`T.po`/`T.ph`, `profileHeight`), monedas, rocas y letreros de curva. `locate` da la distancia `s` y el desplazamiento `d` (positivo a la derecha).
- `src/world.js`: escena (cielo con degradado, niebla, luces, sombras que siguen al carro), mallas de la montaña y clima (lluvia, nieve, ceniza, rayos).
- `src/car.js`: modelo del 4x4 y su cabina (`makeCar`, `poseCockpit`), física (`stepCar`: agarre lateral, la dirección a alta velocidad pide un poco más que el agarre y si te pasas deslizas; pared y baranda frenan y dañan; más allá del borde sin baranda empieza la caída `stepFall`, que rebota por el barranco).
- `src/audio.js`: sonido sintetizado (`SFX`).
- `src/game.js`: partida (`startRun`, `simulate` a 120 pasos/s), cámaras, monedas, rocas, HUD y `endRun` (estrellas, monedas, desbloqueos, final).
- `src/ui.js`: pantallas, mapa, taller, insignias, opciones, resultado, final, teclado/táctil y bucle.

Los tiempos de los objetivos se calibraron con el piloto automático de la prueba (sin mejoras) más un margen: si cambias una montaña, vuelve a correr la prueba y ajusta `obj`.

## Pruebas

```bash
CHROMIUM_PATH=... node tests/smoke.mjs [--shots] [ids…]   # maneja cada montaña con piloto automático y prueba la caída
CHROMIUM_PATH=... node tests/movil.mjs [--shots]          # celular en vertical, botones táctiles, final y Ruta libre
CHROMIUM_PATH=... node tools/portadas.mjs                  # imágenes del portal (luego a webp en portal/img/)
```

`UPG=n` en `smoke.mjs` prueba con todas las mejoras en el nivel n.
