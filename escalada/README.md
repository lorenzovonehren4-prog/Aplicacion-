# DON'T LOOK UP

Juego de escalada en un **único archivo HTML**: 1000 metros, 6 cumbres, un
checkpoint por cumbre. Sin dependencias, sin build y sin red.

```bash
# servido por HTTP
python3 -m http.server 8000   # → http://localhost:8000/escalada/
```

o simplemente **doble clic en `index.html`**: no pide nada al servidor, así que
`file://` también funciona.

## Controles

| | |
|---|---|
| `←` `→` · `A` `D` | Moverte |
| `↑` · `W` · `Espacio` | Saltar (dos veces en el aire: doble salto) |
| `Esc` · `P` | Pausa |
| `M` | Silenciar |
| Mando en pantalla | En móvil y tablet aparece solo |

## Qué se arregló y qué se añadió

### La partida no se podía terminar

Dos apoyos del nivel incrustado (metros 830 y 930) tenían **otro apoyo justo
encima**, a 54 px: menos de lo que mide el personaje más su salto. Al llegar
ahí te dabas en la cabeza antes de despegar y no había forma de salir. El
generador se había quedado sin presupuesto de tiempo y apretó esa zona.

`despejarRatoneras()` detecta el caso —un apoyo sin ningún punto desde el que
se pueda saltar— y sube el techo lo justo, pero sólo si al comprobarlo **con
el motor de física de verdad** el arreglo funciona y no estropea los saltos de
alrededor; si no sale, revierte. Cuesta 38 ms al cargar. Los 293 saltos del
recorrido son ahora alcanzables; antes fallaban dos de forma irrecuperable.

### El juego corría al doble de velocidad en pantallas de 120 Hz

La física avanzaba un paso por fotograma. En un portátil o un móvil de 120 Hz
todo iba al doble —saltos imposibles, caídas inevitables— y en una máquina que
se atasca, a cámara lenta. Ahora el bucle acumula tiempo real y ejecuta pasos
fijos de 1/60 s, que es exactamente el paso con el que se verificó que cada
salto del nivel es posible: medido, 60,0 pasos/s y 420 px/s de carrera.

### En móvil no se podía jugar

La página venía preparada para pantalla de dedo (viewport sin zoom,
`touch-action:none` en el lienzo) pero no escuchaba ni un toque. Se añadió un
mando en pantalla que aparece solo en aparatos táctiles, con captura de
puntero para que el dedo pueda resbalarse fuera del botón sin que la tecla se
quede pegada.

### La cumbre que anunciaba el HUD casi nunca era la tuya

Salía de `player.x / LARGO_MUNDO`, pero el recorrido zigzaguea a izquierda y
derecha: se leía «Cumbre 2» estando en la 1, «4» estando en la 3. Ahora se
decide por altura, con los límites reales del nivel, y al cambiar de cumbre lo
anuncia.

### Media mecánica estaba apagada

El motor sabe hacer hielo (se patina), apoyos frágiles (se caen un segundo
después de pisarlos) y pinchos. El nivel incrustado no traía **ni uno**: la
generación acababa con `lasers = []; spikes = []` y las conversiones a hielo y
a frágil estaban comentadas. De 294 apoyos: 280 normales, 7 trampolines, 6
checkpoints, 17 móviles y 14 géiseres. Nada más.

`sembrarSuelos()` los siembra sobre el nivel ya cargado, con la misma curva de
dificultad que usa el generador —`((cumbre-1)/5)^1.55`— y **verifica cada uno
con el motor de física antes de dejarlo puesto**:

| Suelo | Dónde | Cuántos | Qué se comprueba |
|---|---|---|---|
| ❄️ Hielo | Cumbre 5, apoyos anchos | 14 | Que el salto de entrada y el de salida siguen saliendo *patinando*: la simulación arranca con `enHielo` puesto, no con la física de agarre |
| 🩸 Frágil | Cumbres 3-6, nunca dos seguidos | 34 | Que salir cuesta ≤ 42 fotogramas de los 60 que aguanta. El resto es margen para una persona |
| ⚠️ Pinchos | Cumbres 2-6 | 7 | Que ninguno cae en el pasillo que se camina de la caída al despegue |

Los pinchos necesitaron un arreglo aparte. `generarPinchos()` sólo dejaba
libres los dos extremos, pero un pincho **en medio** obliga a saltarlo, y ese
salto gasta el del suelo: al llegar al borde te queda sólo el del aire y el
salto verificado ya no sale. Ahora se quedan fuera del pasillo entero — siguen
matando al que se pasa de frenada, pero no se cruzan en el camino bueno.

Dos detalles de dibujo, porque un suelo que no se ve no es una mecánica:

- La grieta roja de los frágiles lleva reborde oscuro; sin él se perdía sobre
  los apoyos claros.
- El hielo lleva filo cian y rombos. En Frosty Peaks *todo* es blanco y azul:
  sin marca propia no se distinguía del apoyo de nieve de al lado, que agarra.

Y cada suelo nuevo se explica solo la primera vez que lo pisas («Hielo: aquí se
patina», «Se rompe: no te pares»), en vez de en una leyenda del menú que nadie
lee.

**Los láseres siguen apagados.** `generarLaseres()` los coloca en la banda
limpia entre dos apoyos, pero esa banda es justo por donde pasa el arco del
salto: si son alcanzables depende de la fase del vaivén, y eso no está
verificado. Encenderlos sin comprobar la fase es volver a poder dejar el juego
imposible.

### El verificador ahora mide coste, no sólo sí/no

`costeSalida(a, b, basta)` devuelve los fotogramas que cuesta ir de un apoyo al
siguiente: caminar desde donde caes hasta el punto de despegue, más el vuelo.
Es lo que decide si un apoyo puede ser frágil. `seLlega()` es ahora una línea
encima de él.

El parámetro `basta` corta la búsqueda en cuanto encuentra un camino lo
bastante bueno, y los puntos de despegue se prueban ordenados por cercanía a
donde caes. Sembrar el nivel entero pasó de 1139 ms a 169 ms; el repaso de
ratoneras, de 153 ms a 32 ms.

### Lo demás

- **Pausa** (`Esc`/`P`, botón de esquina, y automática al cambiar de pestaña),
  con el cronómetro congelado y vuelta al menú sin recargar.
- **Marcador en vivo**: metros sobre 1000, barra de progreso, cronómetro y
  muertes. Antes el tiempo sólo se veía al ganar y la insignia repetía la
  altura dos veces, una de ellas con el dato del fotograma anterior.
- **Marcas y preferencias guardadas** en el navegador: mejor vuelta, mejor
  altura, y el color, el accesorio, el nombre y el sonido que elegiste. Si el
  navegador no deja escribir (incógnito), se juega igual.
- **El sonido se desbloquea con el ratón y con el dedo**, no sólo con el
  teclado: quien empezaba con un clic jugaba en silencio toda la partida.
- **Escribir el nombre ya admite espacios**: el juego se quedaba con la barra
  espaciadora incluso mientras escribías en el campo.
- Textos coherentes (decía «7 mundos» y son 6), icono incrustado, y el menú
  deja de repintarse en cada fotograma con el juego en pausa o terminado.

## Cómo está montado

Todo vive en `index.html`. Las piezas, por orden:

| Zona | Qué hay |
|---|---|
| `NIVEL_FIJO` | El nivel entero ya generado y verificado, serializado |
| Constantes | Gravedad, salto, cumbres, metros por cumbre |
| Física | `pasoFisica()`, el motor **único** que comparten el juego y el generador |
| Verificación | `costeSalida()`, `seLlega()`, `alrededor()`: replay del recorrido con el motor real |
| Ratoneras | `despejarRatoneras()`: apoyos con techo demasiado bajo para saltar |
| Suelos | `sembrarSuelos()`: hielo, frágiles y pinchos, verificados uno a uno |
| Generación | Sólo se usa si no hay `NIVEL_FIJO`: coloca apoyos y verifica cada salto simulándolo |
| Estado y lógica | Cámara, muertes, checkpoints, pausa, marcador |
| Sonido | Notas generadas con Web Audio, sin archivos |
| Dibujo | Fondos por bioma, apoyos ilustrados, personaje y accesorios |
| Menú | Selector de color y accesorio, con el personaje dibujado en cada tarjeta |

Que el generador use el **mismo** `pasoFisica()` que el juego es lo que hace
imposible que se genere un salto que luego no se pueda dar. Por eso la
reparación de ratoneras se comprueba con él y no con una fórmula aparte.
