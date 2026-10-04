# Kartódromo

Juego de karts en 3D para navegador (PC, teclado o mando). Conducción semi-realista inspirada en kartódromos bajo techo: tiempos por sector S1/S2/S3, última vuelta (LAST), mejor vuelta (PB) y potencial (suma de los mejores sectores). 4 pistas con rampas, segundos pisos (puentes sobre la misma pista) y túneles, todas libres desde el principio. Carrera rápida contra 5 bots (4 dificultades) y campeonato de 4 carreras por puntos. Ganar da monedas y XP de piloto; lo único que se desbloquea es estética del kart (pintura con acabados oro/cromo/perla/neón, casco, aros, luces de neón) y del perfil (marco, fondo, título): nada cambia el rendimiento.

Diseño de manejo pedido por el usuario: en recta un toque de dirección mueve poco, en curva se gira bien, y casi todas las curvas se toman soltando el acelerador. Cada pista tiene **una sola** curva donde hay que frenar.

Todo el texto del juego está en español. Nombres de bots y marcas inventados.

## Cómo correrlo

- Servir la carpeta (`npx serve .` o `python3 -m http.server`) y abrir `index.html`. También funciona abriendo el archivo directo: scripts clásicos, sin `fetch`.
- No hay compilación. `vendor/three.min.js` es three.js r160 (UMD, global `THREE`). Fuentes en `vendor/fonts/`.
- Orden de carga en `index.html`: `data.js` → `track.js` → `kart.js` → `world.js` → `audio.js` → `race.js` → `ui.js`.

## Estructura

- `src/data.js`: pistas (`TRACKS`: puntos de control `[x, z, altura]`, ancho, tema `theme` = azul/fabrica/parque/noche, `tunnels` como pares de índices de puntos, colores de barrera), dificultades (`DIFFS`: `pace` = cuánto del agarre usan los bots, `top` = velocidad punta, `err` = errores, `coin` = multiplicador de premio), estética (`BODIES` con acabado `f`, `HELMETS`, `RIMS`, `GLOWS`, y del perfil `FRAMES`, `BANNERS`, `TITLES`; todo junto en `COSMETICS`), constantes de física `KART`, premios, niveles (`levelInfo`) y guardado (`save`, `persist`, clave `kartodromo-save-v1`).
- `src/track.js`: `buildTrackData(def)` muestrea la línea central (Catmull-Rom cerrada) cada ~1 m (posición, altura `py`, pendiente `grade`, tangente, normal a la derecha, curvatura, `tunnel`), calcula la línea de carrera de los bots (`lineOff`, `lx/lz`, `lcurv`) y el perfil de velocidades (`speedProfile`). `nearestIndex` y `trackCoords` dan la distancia recorrida y el desplazamiento lateral de un kart. `trackHeight` da la altura del piso. `cornerReport` calcula cuántos metros hay que soltar el acelerador antes de cada curva (más de 42 m = curva de freno). `validateTrack` revisa cruces (salvo puentes con 4,6 m de altura libre), radio mínimo y pendiente.
- `src/kart.js`: modelo del kart (`makeKart(look)`), acabados de pintura (`finishMat`: MeshPhysicalMaterial con clearcoat, metal, iridiscencia o emisivo), luces de neón bajo el kart, física (`newPhys`, `stepPhys`), choques entre karts (`collideKarts`) y animación (`poseKart`).
- `src/world.js`: renderizador, mapas de entorno para los reflejos (`makeEnv` por tema, con PMREM), geometría de la pista (asfalto, pianos, meta, pórtico con semáforo `setStartLights`, barreras y publicidad instanciadas, llantas), rampas y puentes con pilares y reja (`buildElevated`), túneles (`buildTunnels`), temas (`buildHall` para azul y fábrica, `buildPark`, `buildCity`), tribunas con público (`grandstand`), y el garaje de los menús (`buildGarage`). `W.anim` guarda funciones que se animan en cada cuadro (público, banderas, mar).
- `src/race.js`: estado de la carrera `R`, arranque (`startRace`), IA de los bots (`botInput`), paso de simulación (`updateRace`), vueltas y sectores (`trackProgress`), récords y efectos `FX` (chispas, humo, marcas de llantas).
- `src/audio.js`: sonido sintetizado (`SFX`): motor (transmisión directa, tono proporcional a la velocidad), chirrido, choques, semáforo.
- `src/ui.js`: pantallas, selector de pista, garaje, opciones, entrada (`KEYS`, `readPad`, `navMove` para navegar menús con flechas o mando), cámara (`CAM_MODES`), HUD, minimapa, nombres de rivales, resultados, campeonato y bucle principal (`frame`, física a paso fijo de 1/120 s).

## Convenciones

- Rumbo `h`: el frente del kart apunta a `(sin h, cos h)` en (x, z); la derecha es `(-cos h, sin h)`. `steer > 0` gira a la derecha (h baja). La normal de la pista `nx/nz` apunta a la derecha.
- Física: la dirección pide una fracción (con curva `^1.3`) del giro máximo posible a esa velocidad: a baja velocidad manda la geometría, a alta el agarre (`KART.grip`, con un 10 % de margen para que pasarse haga deslizar). Al soltar el acelerador actúa el freno motor (`engineBrake`). En las rampas la gravedad frena o empuja (`grade`). El freno de mano baja el agarre a `slideGrip` para derrapar. Las barreras son un límite lateral (`T.hw - 0.42`) con rebote y pérdida de velocidad. En el teclado la dirección entra a 2,8/s y vuelve al centro a 6,5/s (`updateInput`).
- Los bots usan la misma física que el jugador. Su velocidad sale de `speedProfile(T, diff.pace)` sobre la línea de carrera; giran con "pure pursuit" y se abren si hay alguien adelante.
- Progreso: `kart.dist` es la distancia desenrollada (empieza negativa en la grilla). Un sector se cierra la primera vez que `dist` pasa un múltiplo de `L/3`; tres sectores son una vuelta. Así ir en reversa y volver no cuenta doble.
- Colores de sector/vuelta: morado = récord de la pista (guardado), verde = mejor de esta carrera, amarillo = más lento.
- Para agregar una pista: sumarla a `TRACKS` y correr `node tools/validar-pistas.mjs --mapa` (revisa separación, radio, pendiente y cuenta las curvas de freno; dibuja `tests/capturas/mapa-pistas.png` con los números de los puntos de control). El campeonato usa `CHAMP_TRACKS`.
- Choques entre karts y búsqueda de posición son locales (`nearestIndex` con pista), así que un kart en el puente no "cae" a la pista de abajo. Los choques ignoran karts a más de 1,5 m de altura de diferencia.
- La sombra del cerro del túnel del parque está apagada: con ella el asfalto se veía verde.

## Pruebas

Desde la carpeta `karting/` (usan el `playwright` del repositorio; en contenedores exportar `CHROMIUM_PATH`):

```bash
node tools/validar-pistas.mjs      # pistas sin cruces
node tests/smoke.mjs --shots       # carrera completa con piloto automático + capturas en tests/capturas/
node tests/campeonato.mjs          # garaje (pintura y marco de perfil), pausa y campeonato completo
node tests/teclado.mjs             # teclado: acelerar, girar, derrapar, frenar, R y C, y la sensación de dirección medida
node tests/vistas.mjs [t1 t2…]     # fotos desde la largada, el segundo piso y el túnel de cada pista
```

`PISTA=t2 node tests/smoke.mjs` prueba otra pista.
