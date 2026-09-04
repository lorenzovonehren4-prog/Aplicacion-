# DON'T LOOK UP

Juego de escalada en un **único archivo HTML**: 1000 metros, 6 cumbres, un
checkpoint por cumbre. Sin dependencias, sin build y sin red.

```bash
# servido por HTTP
python3 -m http.server 8000   # → http://localhost:8000/escalada/
```

o simplemente **doble clic en `index.html`**: no pide nada al servidor, así que
`file://` también funciona.

## Comprobar que el nivel se puede terminar

```bash
python3 -m http.server 8777        # desde la raíz del repositorio
node escalada/verificar-nivel.mjs
```

Usa el motor de física del propio juego —no reimplementa nada— y recorre los
293 saltos preguntando si se llega, si hay una ventana de despegue de verdad y
a cuántas fases del vaivén sirve cada apoyo que se mueve. Comprueba también
que los atajos tengan entrada y salida y que no quede ninguna moneda suelta.
Sale con código 1 si algo está roto, así que vale tal cual como comprobación
previa a publicar.

Última pasada: **293 saltos, 0 imposibles, 11 atajos correctos, 189 monedas
alcanzables, 0 errores de consola.** Un solo salto —el 208— tiene una ventana
de despegue por debajo del estándar de 18 px que exige el verificador nuevo:
viene así del nivel original, cuyo plan guardado tiene margen 7, y es jugable.

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

### Mapa del nivel

Botón abajo a la izquierda, o **Tab**. La subida mide casi 17.000 px de alto y
zigzaguea a lo ancho, así que jugando sólo se ve un trozo: el mapa enseña el
recorrido entero, con las seis cumbres en franjas, el color de cada mecánica,
las monedas que faltan y **dónde estás tú**, en un anillo que late. Se puede
acercar con la rueda o los botones, arrastrar, y «Centrarme» vuelve a tu
posición. Congela la partida mientras está abierto.

Se dibuja del mismo array `platforms` que juega el motor —no hay una copia del
nivel que se pueda desincronizar— y por eso las plataformas que van y vienen
aparecen y desaparecen también en el mapa.

En el mando táctil el botón sube 120 px: la esquina de abajo a la izquierda la
ocupa el botón ◀.

### Pantalla de inicio

Cuatro tarjetas de récord en la cabecera (mejor altura, mejor vuelta, menos
caídas, récord de puntos) y, donde antes había una lista de texto con las seis
cumbres, **la ruta dibujada**: la misma función del mapa, sin el marcador del
jugador. Las rejillas de color y accesorio pasan a cinco por fila, que con 18
colores y 16 accesorios era la diferencia entre ver el botón de empezar y
tener que desplazarse hasta él.

### Un checkpoint por cumbre

La pasada anterior sembraba uno antes de cada tramo duro y salían **27**: con
un punto de guardado cada diez apoyos, caerse dejaba de tener consecuencias.
Ahora se conserva el primero de cada cumbre —donde el nivel original los puso,
al empezar cada tramo— y el resto vuelve a ser apoyo normal. Si alguna cumbre
se quedara sin ninguno, se asciende el apoyo ancho más cercano a su inicio.

### Dos cosas más que estaban escritas y apagadas

**`decorados()` no se llamaba desde ninguna parte.** Todo el desarrollo. Por
eso los mundos se veían pelados: farolas, barcas, torres, graneros, tractores,
iglús y satélites estaban dibujados y nadie los pintaba. Ya se llama, entre el
fondo y los apoyos, y de paso hay **once decorados nuevos** para que cada
bioma tenga tres o cuatro en vez de uno: pino y roca en Emberwall; palmera,
faro y boya en Coral; antena y valla en Agent; molino y silo en Growing Up;
pino nevado y ventisquero en Frosty; cohete y cristal en One Way Up.

**El coral colgaba zarcillos en el aire.** Los brazos salían de la peana hacia
abajo, hasta 52 px por debajo de la plataforma: dos hilos finos flotando, que
es exactamente la pinta de «objeto clavado en un palo». Ahora el coral es un
cuerpo macizo que ocupa el apoyo, con los brazos dentro, recortados por su
silueta.

### Diseño de nivel: tipos de apoyo, objetos y curva de dificultad

El nivel venía siendo una cadena lineal de 294 apoyos casi todos iguales: 280
normales, 17 móviles horizontales, 7 trampolines. Sin movimiento vertical, sin
apoyos que aparezcan y desaparezcan, sin caminos alternativos y sin nada que
recoger.

Todo lo nuevo se añade en **pasadas sobre el nivel ya cargado**, no
regenerándolo: cada pasada propone un cambio, lo comprueba con `pasoFisica`
—el mismo motor que juega el jugador— y lo deshace si no sale. Así se puede
enriquecer el nivel sin poder dejarlo imposible.

#### Motor: lo que hacía falta añadir

| Añadido | Por qué |
|---|---|
| `p.movY` | `moverPlataformas()` solo escribía `p.x`. Ahora hay carril vertical, y `pasoFisica` arrastra al jugador en Y: sin eso el ascensor sube y te deja plantado en el aire |
| `p.ciclo` | Apoyos que aparecen y desaparecen con periodo fijo, con parpadeo de aviso y el hueco marcado mientras faltan |
| `monedas` | No existía nada coleccionable |
| `arcoSalida()` | El verificador ya calculaba la trayectoria del salto; ahora la devuelve, y las monedas se siembran **encima del arco**, así que caen solas al hacer el salto que toca |

#### Tipos de apoyo, por franja

| | Inicial (cumbres 1-2) | Intermedio (3-4) | Avanzado (5-6) |
|---|---|---|---|
| Apoyos | 88 | 98 | 122 |
| Móviles horizontales | 3 | 14 | 23 (más rápidos) |
| Ascensores verticales | — | 4 | 11 |
| Aparecen y desaparecen | — | 2 | 11 |
| Frágiles | — | 9 | 19 |
| Hielo | — | — | 9 |
| Estrechos (precisión) | — | — | 3 |
| Caminos alternativos | — | 4 | 10 |
| Checkpoints | 8 | 9 | 9 |

La curva no es una rampa: además de la dificultad por cumbre
—`((cumbre-1)/5)^1.55`, la misma del generador— hay una **onda de ritmo**
(`ritmo(i)`) que alterna tramos densos y tramos de respiro dentro de cada
cumbre. Sin ella todo pesa igual y una subida larga se siente como una lista.

Los checkpoints no se ponen cada N apoyos: `dureza(i)` puntúa cada salto
—hueco, anchura, mecánicas encima, pinchos— y se coloca uno antes de cada
tramo cuya suma pasa de un umbral, con separación mínima de 11 apoyos.

#### Objetos

**192 monedas**, de las cuales 20 son de bonus. Las normales van sembradas
sobre el arco del salto verificado: se recogen haciendo el recorrido normal.
Las de bonus van por encima del punto más alto del arco o sobre los atajos, y
piden gastar el doble salto antes de tiempo — son una decisión, no un regalo.
Hay cadena de racha (x2, x3…) que sube el tono del sonido y multiplica los
puntos, y se enfría en segundo y medio.

Primera versión: 463 monedas, una en cada salto. Eso no es recompensa, es
decorado. Ahora los tramos de descanso van limpios y nunca hay dos saltos
seguidos con monedas.

#### Presentación de las mecánicas

Cada mecánica se explica sola la primera vez que se pisa, con fanfarria corta:
«Ascensor: te lleva con él», «Va y viene: mira el parpadeo», «¡Atajo! Te
saltas un apoyo», «Apoyo estrecho: aquí hay que afinar». Nada de leyendas en
el menú.

#### Cuatro fallos que destapó la verificación

**Mis atajos hacían de muro.** La primera versión los ponía pegados encima del
apoyo que se saltan, a 69 px: menos de lo que mide el personaje más su salto.
El apoyo de debajo quedaba con techo y con pared. Ahora van al hueco entre
origen y destino, y se rechaza cualquier candidato que deje a un apoyo de
debajo sin sitio desde el que despegar (`huecoLibre`).

**Mi verificación aceptaba despegues imposibles.** `seLlega` daba por bueno un
salto aunque solo saliera desde una x exacta. El jugador avanza a 7 px por
fotograma y no puede pararse donde quiera. Ahora `ventanaSalida()` exige una
**ventana** de 18 px y —como ya hacía el generador original— que se pueda
**llegar caminando** hasta ella: un despegue al que otro apoyo le hace de muro
lo encuentra el simulador, que empieza ya colocado, pero el jugador no.

**Los pinchos mataban al que iba en ascensor.** `generarPinchos()` clava el
pincho en la `y` que tiene el apoyo en ese momento. Sobre algo que se mueve o
que desaparece, el pincho se queda flotando donde estaba el apoyo — y solapa
justo con el jugador que va montado. Ahora los pinchos no se ponen sobre
móviles, ascensores, cíclicas ni atajos.

**Los pinchos caían en el camino bueno.** El pasillo libre se calculaba con
la trayectoria guardada en el nivel, pero `ventanaSalida()` puede elegir otro
punto de despegue igual de válido, y el pincho acababa justo donde el jugador
pisa de verdad. Ahora se protegen los dos sitios donde el jugador **se para**
—donde cae y desde donde despega, incluido el despegue alterno— y se exige
plataforma a ambos lados del pincho: en medio se salta, y como al aterrizar se
recuperan los dos saltos, ese brinco no cuesta nada mientras haya dónde caer.

**Se apilaban mecánicas en un mismo apoyo.** `sembrarSuelos()` añadía hielo a
un ascensor ya verificado, y el hielo cambia el despegue: la verificación por
fases del ascensor dejaba de valer. Además se lee fatal, con los rombos del
hielo y las flechas del ascensor peleándose por el mismo sitio. Ahora es una
mecánica por apoyo; las combinaciones se hacen **encadenando** apoyos, no
amontonando cosas en uno.

#### Coste

Componer el nivel entero cuesta unos 1,6 s, una sola vez. Tres cosas lo
bajaron de 8,2 s:

- Cribado barato antes de medir: `seLlega` cuesta quince veces menos que
  `ventanaSalida`, y casi todos los candidatos se caen a la primera.
- Separar las dos preguntas: cuántas fases sirven lo dice `seLlega`; si el
  jugador puede colocarse lo dice la ventana, y eso no depende de la fase.
- `generateLevel()` se llamaba **dos veces** —al cargar la página y al pulsar
  Empezar— y componía el nivel entero las dos. Como es determinista, ahora la
  segunda vez solo reinicia el estado.

### Animación: el salto no pesaba

Un salto sin polvo y sin deformación no pesa. Todo lo que se añadió sale del
**estado real del movimiento**, no de temporizadores sueltos:

| Momento | Qué hace |
|---|---|
| Correr | El cuerpo se inclina 3° hacia delante y suelta una motita de polvo cada 6 fotogramas en el pie de atrás |
| Cambiar de sentido | Derrape: seis partículas salen hacia donde venías |
| Despegar | Siete puñados de polvo desde los pies |
| En el aire | Se estira en proporción a `vy`, encogiendo de ancho para no engordar |
| **Doble salto** | Voltereta completa alrededor del centro del cuerpo, más anillo de 22 partículas con chispas |
| Aterrizar | Se achata, y el polvo que levanta va en proporción a la velocidad de caída (4 partículas a 3 px/frame, 13 a 13) |

El estirar y aplastar estaba quitado en la versión de partida («se quitó ese
efecto a petición»). Vuelve porque se pidió animación de salto en condiciones,
pero ahora sale de la velocidad y compensa el volumen —lo que crece de alto
encoge de ancho—, que es lo que hace que se lea como peso y no como un globo.

Las partículas también se arreglaron: tenían gravedad cero y rozamiento cero,
así que volaban en línea recta para siempre, que es exactamente lo que delata
que son puntos y no polvo. Y la opacidad se calculaba contra un `26` fijo, de
modo que el polvo de vida corta nacía ya medio transparente; ahora cada
partícula recuerda la vida con la que nació.

### El tamaño del dibujo, separado de la caja de colisión

El personaje se pinta un **16 % más grande** (`ESCALA_PJ`), anclado en los
pies para que no se hunda en el apoyo. La caja de colisión sigue siendo
**52 × 44 px exactos**: es contra ella contra la que están verificados los 293
saltos del recorrido, y tocarla invalidaría el nivel entero. Medido después
del cambio: 60,00 pasos de física por segundo y 417 px/s de carrera.

### Seis disfraces

Además de los 12 colores, seis skins que pintan sobre el cuerpo: **Abeja**
(alas que baten más rápido en el aire, rayas, antenas), **Fantasma** (faldón
ondulado que tapa las patas), **Calabaza** (gajos y rabito con hoja),
**Robot** (costuras, remaches, pantallita de estado y antena que parpadea),
**Sandía** (corteza, carne y pepitas) y **Gato** (orejas, rayas, bigotes y
cola que se mece con el paso).

Cada disfraz se dibuja en tres pasadas: lo que va **detrás** del cuerpo (alas,
cola), lo que va **dentro** recortado por su silueta (rayas, costuras,
pepitas) y lo que va **delante** (orejas, antenas, faldón). Lo de dentro se
pinta antes que el brillo, para que la luz caiga también sobre el disfraz y no
parezca una pegatina pegada encima.

### Los objetos iban clavados en palos

Nueve props colgaban de algo fino en el vacío bajo la plataforma: las patas
del banco y del andamio, las ruedas y el raíl de la vagoneta, los postes del
pozo, el mástil de la sombrilla, el poste de la parabólica, el tronco del
árbol, el pie de la seta y la cuerda del farol. Fuera todos. Cada objeto se
apoya ahora en su propio volumen —zócalo, cepellón, brocal, bastidor— dentro
del rectángulo que de verdad se pisa.

La parabólica era el caso peor: colgaba de un poste de 32 px **por debajo** de
la pasarela, con el comentario «encima no sería sólida». Ahora va tumbada
sobre la peana, contra el borde, donde no estorba a los pies.

### La sombra no era una sombra

Se dibujaba con el tamaño entero del apoyo, desplazada 3 y 8 px, al 20 %. Como
casi ningún objeto llena su rectángulo, asomaba por debajo y por la derecha: en
el cielo claro no se leía como sombra sino como una caja fantasma detrás de
cada plataforma. Ahora va ceñida: 2 y 5 px, el 72 % del alto, al 14 %.

### El personaje no tenía boca

Ni mofletes, ni reflejo en los ojos. Era un óvalo con dos agujeros negros.
Ahora la cara cuenta lo que está pasando, que es de donde sale el carácter:

| Estado | Ojos | Boca |
|---|---|---|
| Parado | normales, con reflejo | sonrisa |
| Corriendo | normales | apretada |
| Subiendo | achinados (0,84) | «o» pequeña |
| Cayendo fuerte | abiertos (1,34) | abierta de par en par |

Más mofletes rosas y una luz de rebote en la panza, que lo despega de los
apoyos oscuros donde antes se le fundía el cuerpo. Sin estirar ni aplastar: ese
efecto estaba quitado a propósito y sigue quitado.

### El menú llevaba desde siempre metido en 440 px

El menú es `<div class="panel menu">` y `.panel` se declara **después** que
`.menu` en la hoja de estilos: su `width:min(440px,100%)` ganaba por orden de
cascada y machacaba el `max-width:1060px` del menú. En móvil los dos valores
coinciden y por eso no se veía; en escritorio las tarjetas y los nombres salían
cortados en una columna estrechísima, justo lo contrario de lo que decía el
comentario del propio CSS («el menú crece a lo ancho, nunca a lo alto»).

### 12 colores y 16 accesorios

Eran 6 y 6. Los nuevos colores son Rojo, Azul, Blanco, Grafito, Lima y Choco.
Los accesorios nuevos —corona, casco de obra, gorro de fiesta, sombrero de
bruja, sombrero charro, cuernos de reno con nariz roja, máscara de luchador,
vendas de momia, auriculares y casco espacial— están dibujados con curvas en
el mismo sistema que los otros, no con rejillas de píxeles.

El casco espacial se pinta **delante** de la cara y translúcido, que para eso
es un casco: se sigue viendo quién hay dentro. Y el retrato del menú reserva
ahora el doble de alto sobre la cabeza (`PH * 2.0`), porque a los gorros altos
se les cortaba la punta en las tarjetas.

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
