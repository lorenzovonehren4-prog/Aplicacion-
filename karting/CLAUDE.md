# Kartódromo

Juego de karts en 3D para navegador (PC, teclado o mando). Conducción semi-realista inspirada en kartódromos bajo techo: tiempos por sector S1/S2/S3, última vuelta (LAST), mejor vuelta (PB) y potencial (suma de los mejores sectores). Carrera rápida contra 5 bots (4 dificultades) y campeonato de 3 carreras por puntos. Ganar da monedas y XP de piloto; el garaje vende solo estética (carrocería, casco, aros, número): no cambia el rendimiento.

Todo el texto del juego está en español. Nombres de bots y marcas inventados.

## Cómo correrlo

- Servir la carpeta (`npx serve .` o `python3 -m http.server`) y abrir `index.html`. También funciona abriendo el archivo directo: scripts clásicos, sin `fetch`.
- No hay compilación. `vendor/three.min.js` es three.js r160 (UMD, global `THREE`). Fuentes en `vendor/fonts/`.
- Orden de carga en `index.html`: `data.js` → `track.js` → `kart.js` → `world.js` → `audio.js` → `race.js` → `ui.js`.

## Estructura

- `src/data.js`: pistas (`TRACKS`: puntos de control, ancho, `scale`, colores de barrera, nivel para desbloquear), dificultades (`DIFFS`: `pace` = cuánto del agarre usan los bots, `top` = velocidad punta, `err` = errores, `coin` = multiplicador de premio), estética (`BODIES`, `HELMETS`, `RIMS`), constantes de física `KART`, premios, niveles (`levelInfo`) y guardado (`save`, `persist`, clave `kartodromo-save-v1`).
- `src/track.js`: `buildTrackData(def)` muestrea la línea central (Catmull-Rom cerrada) cada ~1 m (posición, tangente, normal a la derecha, curvatura), calcula la línea de carrera de los bots (`lineOff`, `lx/lz`, `lcurv`) y el perfil de velocidades (`speedProfile`). `nearestIndex` y `trackCoords` dan la distancia recorrida y el desplazamiento lateral de un kart. `validateTrack` revisa que la pista no se cruce.
- `src/kart.js`: modelo del kart (`makeKart(look)`), física (`newPhys`, `stepPhys`), choques entre karts (`collideKarts`) y animación (`poseKart`).
- `src/world.js`: renderizador, luces, geometría de la pista (asfalto, líneas, pianos, meta, barreras instanciadas, llantas apiladas), galpón (`buildHall`) o parque (`buildPark`), y el garaje de fondo de los menús (`buildGarage`).
- `src/race.js`: estado de la carrera `R`, arranque (`startRace`), IA de los bots (`botInput`), paso de simulación (`updateRace`), vueltas y sectores (`trackProgress`), récords y efectos `FX` (chispas, humo, marcas de llantas).
- `src/audio.js`: sonido sintetizado (`SFX`): motor (transmisión directa, tono proporcional a la velocidad), chirrido, choques, semáforo.
- `src/ui.js`: pantallas, selector de pista, garaje, opciones, entrada (`KEYS`, `readPad`, `navMove` para navegar menús con flechas o mando), cámara (`CAM_MODES`), HUD, minimapa, nombres de rivales, resultados, campeonato y bucle principal (`frame`, física a paso fijo de 1/120 s).

## Convenciones

- Rumbo `h`: el frente del kart apunta a `(sin h, cos h)` en (x, z); la derecha es `(-cos h, sin h)`. `steer > 0` gira a la derecha (h baja). La normal de la pista `nx/nz` apunta a la derecha.
- Física: modelo de bicicleta con giro limitado un poco por encima del agarre (`KART.grip`), así que entrar muy rápido a una curva hace deslizar el kart. El freno de mano baja el agarre a `slideGrip` para derrapar. Las barreras son un límite lateral (`T.hw - 0.42`) con rebote y pérdida de velocidad.
- Los bots usan la misma física que el jugador. Su velocidad sale de `speedProfile(T, diff.pace)` sobre la línea de carrera; giran con "pure pursuit" y se abren si hay alguien adelante.
- Progreso: `kart.dist` es la distancia desenrollada (empieza negativa en la grilla). Un sector se cierra la primera vez que `dist` pasa un múltiplo de `L/3`; tres sectores son una vuelta. Así ir en reversa y volver no cuenta doble.
- Colores de sector/vuelta: morado = récord de la pista (guardado), verde = mejor de esta carrera, amarillo = más lento.
- Para agregar una pista: sumarla a `TRACKS` y correr `node tools/validar-pistas.mjs` (revisa separación y radio mínimo). El campeonato usa `CHAMP_TRACKS`.

## Pruebas

Desde la carpeta `karting/` (usan el `playwright` del repositorio; en contenedores exportar `CHROMIUM_PATH`):

```bash
node tools/validar-pistas.mjs      # pistas sin cruces
node tests/smoke.mjs --shots       # carrera completa con piloto automático + capturas en tests/capturas/
node tests/campeonato.mjs          # desbloqueo, garaje, pausa y campeonato de 3 carreras
node tests/teclado.mjs             # teclado: acelerar, girar, derrapar, frenar, R y C
```

`PISTA=t2 node tests/smoke.mjs` prueba otra pista.
