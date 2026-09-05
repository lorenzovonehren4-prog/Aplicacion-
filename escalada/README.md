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

### Estelas: el rastro que vas dejando

El personaje suelta cosas por donde pasa. Sólo mientras **anda o está en el
aire**: parado no suelta nada, porque si no se acumulaba un charco de adornos
bajo los pies. Nacen por detrás —a la altura de los pies andando, a media
espalda saltando—, viven poco más de un segundo y se apagan.

Catorce estelas, de lo más sencillo a lo más exclusivo: polvo, chispas,
burbujas, pétalos, copos, hojas, estrellas, bits, fuego, peces, monedas,
arcoíris y **Del mundo**, que es la cara: no tiene forma propia, sino que
suelta lo de la cumbre en la que estés —chispas de fragua, peces, carpetas,
trigo, copos o bits—, así que cambia seis veces a lo largo de la subida.

Tres decisiones que importan:

- Se pintan **por detrás del personaje**. Un rastro es por dónde has pasado,
  no algo que se te ponga delante de la cara.
- No tocan la física. Hay un techo duro de 140 partículas vivas: es adorno, y
  el nivel está verificado contra `pasoFisica()`, que no las conoce.
- La ficha de la tienda pinta con `dibujoEstela()`, **la misma función** que
  usa el juego. Lo que ves en la tarjeta es exactamente lo que sale al jugar,
  y la de «Del mundo» enseña las seis a la vez.

### El mezclador de color

Los 20 colores de la lista se quedaban cortos. El último, **«A tu gusto»**, no
es un color: son todos. Cuatro mandos —tono, viveza, brillo y tono de las
patas— y de ahí salen los **cinco tonos** del personaje derivados de una sola
base, que es lo que hace que el brillo, la sombra y las patas peguen entre sí
sin tener que elegirlos uno a uno.

El panel sólo asoma cuando llevas ese color puesto y estás en la pestaña de
color: cuatro mandos sueltos bajo una rejilla de colores fijos no se entendían
y ocupaban sitio para nada. Va **encima** de la rejilla, no debajo, porque
abajo se lo comía la barra del botón de empezar.

Mover un mando repinta veinte tarjetas, así que el guardado va con el retardo
de un segundo que ya usaban las monedas, no en cada paso del dedo.

### Precios de peor a mejor, y llaves por nombre

El precio salía de una **fórmula sobre la posición** en la lista. Reordenar el
catálogo movía los precios sin querer, y la llave de «comprado» era el número
de la posición: reordenar te cambiaba lo que tenías pagado.

Ahora cada ficha trae su precio escrito y su identificador propio
(`c:dorado`, `a:corona`, `e:mundo`). Los catálogos van ordenados de lo más
sencillo a lo más exclusivo y el número acompaña:

| | Gratis | Más caro | Lo más exclusivo |
|---|---|---|---|
| Colores | 4 | Dino, 275 | **A tu gusto**, 330 |
| Accesorios | 3 | Corona, 350 | **Aureola**, 450 |
| Estelas | 3 | Arcoíris, 280 | **Del mundo**, 400 |

Los guardados viejos se traducen al cargar: las llaves numéricas se convierten
a las de nombre con el orden que tenían los catálogos antes, así que nadie
pierde lo que había comprado.

### Más catálogo, y más claro

Dos disfraces nuevos —**Buzo** (máscara, tubo y botella a la espalda, que va a
±53 para que asome por fuera de la silueta) y **Dino** (cresta, manchas, panza
a placas y cola con púas)— y seis accesorios nuevos: antifaz de héroe, corona
de flores, gorro de cocinero, casco vikingo, visor de combate y la aureola.

Tres cosas que estaban mal dibujadas y se arreglaron mirándolas de cerca:

- El **antifaz** se pinta encima de la cara, así que lleva los dos huecos
  recortados de verdad (regla par-impar) y los ojos se ven por dentro.
- El **gorro de cocinero** era tres bollos sueltos y dejaba costuras negras
  cruzándolo. Ahora el copete es una sola silueta.
- Los **cuernos del vikingo** se dibujaban después del casco y su arranque
  quedaba pintado encima: parecía que le cruzaban la frente. Ahora van primero
  y el casco los tapa.

La panza del dino iba de −30 a +4 y le tapaba media cara: bajada a −18.

Con 21 colores y 22 accesorios, cuatro columnas eran seis filas de tarjetas.
La rejilla pasa a **cinco columnas** y la pestaña de accesorios se llama
«Gorros», que es lo que son.

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

### Dieciocho objetos más, tres por ambiente

Cada cumbre tenía entre 9 y 13 objetos y se repetían pronto. Ahora hay tres
más por mundo, escogidos por su ambiente y no del montón común:

| Cumbre | Ambiente | Nuevos |
|---|---|---|
| Emberwall Ascent | castillo y fragua | catapulta, panoplia de escudos, brasero con brasas vivas |
| Coral Climb | puerto y playa | castillo de arena, red de pesca, tablas de surf |
| Agent Adventure | base secreta | generador, caja fuerte con rueda que gira, dron posado |
| Growing Up | granja y feria | calabazar, espantapájaros, abrevadero |
| Frosty Peaks | nieve | tienda de montaña, hoguera, mojón de cumbre |
| One Way Up | cielo y tecnología | panel solar, reactor, portal |

Todos se apoyan en su propio volumen dentro del rectángulo que se pisa: el
espantapájaros va apoyado en un fardo y no clavado en una estaca, el dron
tiene los rotores dentro del ancho del apoyo, y la catapulta descansa sobre un
bastidor en A. Cuatro llevan animación —las brasas, la hoguera, la rueda de la
caja fuerte y el núcleo del reactor— porque son objetos que sin movimiento no
se leen.

### El mapa, con altura y progreso

Enseñaba el nivel pero no decía nada de la subida. Ahora:

- **Regla de metros** por el borde izquierdo, de 0 a 1000. El juego va de
  altura y el mapa no la mencionaba por ninguna parte. Las seis cumbres miden
  distinto, así que la regla necesita `alturaDeMetros()`, la inversa de
  `metrosEnAltura()`.
- **Progreso**: el recorrido hasta tu mejor altura va en dorado y el resto en
  gris, y los apoyos que aún no has alcanzado se pintan apagados.
- **«Vuelves aquí»**: un aro verde en el último checkpoint tocado, que es
  adonde te manda una caída.
- **Zoom hacia el puntero** con la rueda, en vez de hacia el centro: antes, al
  acercar, se perdía justo lo que estabas mirando.

La regla sólo sale en el mapa grande: en la vista previa del menú, de 300 px,
se pisaba con los nombres de las cumbres.

### Seis cumbres, seis temas cerrados

Las cumbres tenían nombre pero no identidad: la tercera era una «base
secreta» que compartía objetos con la granja y con la última —contenedor,
vagoneta, neumáticos— y ninguna se distinguía de la de al lado por lo que
había en ella. Ahora cada una tiene su catálogo y no aparece un objeto donde
no pega:

| Cumbre | Tema | Lo que hay |
|---|---|---|
| 1 · Emberwall Ascent | **Medieval** | Muralla, torreón, antorchas, espadas cruzadas, yunque, barriles |
| 2 · Coral Climb | **Playa** | Arena, tablas de surf, sombrillas, boyas, flotadores |
| 3 · Nine to Five | **Oficina** | Escritorios, sillas ergonómicas, archivadores, carpetas, impresora, conos |
| 4 · Growing Up | **Granja** | Balas de heno, vallas, veletas, calabazas, pozo, tractor |
| 5 · Frosty Peaks | **Nieve** | Bloques de hielo, cristales, carámbanos, iglús, pingüinos |
| 6 · One Way Up | **Tecnológico** | Circuitos con nodos que laten, pantallas, neón, reactores |

La cumbre 3 se llamaba «Agent Adventure»; con la planta corporativa dentro,
ahora es **Nine to Five**. Se añaden quince objetos nuevos —antorcha, espadas,
escritorio, silla, archivador, carpetas, impresora, planta, dispensador,
pizarra, bala de heno, veleta, bloque de hielo, cristal y circuito— y el menú
enseña el tema de cada cumbre junto a su tramo de metros.

El tema llega a lo que se recoge y a lo que pincha:

- **En la playa se recogen cocos**, no monedas. Cáscara, fibra y los tres
  ojos; no gira sobre su eje como una moneda, se balancea.
- **En Frosty Peaks los pinchos son carámbanos**: hielo translúcido que se
  estrecha de golpe y acaba en aguja, con costra de nieve en la base y el
  halo de aviso en azul en vez de rojo.
- **El suelo del checkpoint es el de su cumbre**: piedra, arena, moqueta,
  tierra, hielo o metal con filo de neón. Antes era hierba y tierra siempre,
  y en el glaciar aparecía un trozo de pradera en mitad de la nada.

### Un checkpoint por cumbre, en la mitad exacta, con bandera

Empezó siendo uno por cumbre donde cayera —en la cumbre 2 quedaba al 79 % del
tramo y caerse obligaba a repetirla casi entera—, luego fueron doce
repartidos por altura. Lo que hacía falta era esto: media cumbre de riesgo,
un punto de control, media cumbre más.

Son **seis, uno por cumbre**, colocados en la mitad exacta del tramo (entre el
47 % y el 56 %, según dónde haya un apoyo ancho y quieto). Y se ven: **bandera
con mástil, base y paño ondeando** —dorada mientras no la has tocado, verde
en cuanto es tuya— y un **haz de luz** en modo aditivo que sube desde el apoyo
y late despacio.

### El impulso de la plataforma al saltar

Al saltar desde un apoyo que se desliza te llevas su velocidad, como en
cualquier vehículo en marcha. Antes no: `e.vx = dirX * SPEED` borraba de golpe
lo que te estaba arrastrando la plataforma, así que un salto dado a favor del
carril salía corto y uno dado en contra salía largo, sin que nada en pantalla
lo explicara.

Ahora el arrastre guarda cuánto te movió la plataforma en el último fotograma
y, si saltas desde el suelo, eso se conserva mientras vuelas y se pierde al
pisar. Medido en la misma plataforma: saltando a la derecha con el carril en
contra se llegaba a 202 px; a favor, a 330. Los 128 px de diferencia son
exactamente el doble de la velocidad del carril por los fotogramas de vuelo.
El segundo salto no hereda nada: se da en el aire, y ahí no hay nada que te
arrastre.

### El apoyo frágil ahora avisa

La grieta era una sola, siempre igual, pisada o no: no decía cuánto quedaba.
Ahora la rotura **crece con la cuenta atrás** —una grieta madre, luego dos
ramas, luego cuatro—, el color pasa de ámbar a rojo, el temblor va de un pelo
a un salto, y en el último tercio suelta cascotes y da destellos cada vez más
seguidos. Sin pisar se ve sólo la fisura fina: sabes que es frágil antes de
poner el pie.

### Aún menos aglomeración, aún más salto

Se aprieta un poco más el aclarado de apoyos (`aclararApoyos`, ver más abajo):

| | Origen | Ahora |
|---|---|---|
| Subida media por salto (cumbres 1→6) | 65, 69, 63, 67, 47, 45 px | 67, 71, 70, 78, 63, 73 px |
| Hueco lateral medio en la última cumbre | 144 px | 325 px |
| Apoyos pegados a su vecino | 4 | 4 (de 242 saltos) |
| Saltos de la cadena | 293 | 242 |

Y con la física del impulso cambiada hubo que recomponer y reverificar el
nivel entero: **242 saltos, 0 imposibles, 0 sin ventana de despegue, 0
apretados, 0 atajos rotos, 0 monedas sueltas, 0 drones que estorben, 0 px de
penetración y ningún error de consola.**

### Las móviles cambiaban de objeto sesenta veces por segundo

Este era el «se bugean» de verdad, y no estaba en la física —52 móviles × 7
guiones × 4 fases × 900 fotogramas dan cero empotramientos— sino en el dibujo:

```js
const semilla = h(p.x * 0.29 + p.y * 0.13);   // ← p.x cambia cada fotograma
```

De ahí sale QUÉ objeto le toca a cada apoyo, y también dónde caen las matas
de hierba, los grumos de la bola de nieve o los remaches. En un apoyo quieto
es perfecto: cada uno sale distinto y siempre igual. En uno **con carril**,
`p.x` cambia sesenta veces por segundo, así que el sorteo se repetía sesenta
veces por segundo: la plataforma parpadeaba y cambiaba de objeto sin parar.

El arreglo no es tocar el sorteo, es **anclar el dibujo**: cada apoyo se pinta
siempre en su sitio de reposo y es el LIENZO el que se traslada hasta donde
está ahora (`anclarApoyo`). Así el sorteo es fijo, y de paso se arregla de
golpe el temblor de todos los detalles, no sólo el del objeto. Comprobado:
400 fotogramas de una móvil ancha, **un solo objeto** en vez de uno por
fotograma.

### Los drones se veían menos que los pinchos

Una cajita gris oscuro de 34×22 px con un punto rojo, sobre un cielo cian.
Ahora: casco naranja con franjas negras de peligro, hélices más marcadas, ojo
rojo de 5,4 px con su brillo, halo de aviso que late en modo aditivo —el
mismo truco que en los pinchos, porque un rojo translúcido sobre cian da gris
sucio— y el carril pintado en rojo **con flechas en los dos extremos**, que
dicen por dónde va a venir.

### Seis accesorios estaban mal puestos

Se vieron poniéndolos uno a uno sobre el personaje. Las coordenadas de la
cara son fijas y conocidas: los ojos están en `y = -33` y ocupan de -39 a -27,
la boca sobre -23, la coronilla en -60. Con eso, los fallos eran evidentes:

| Accesorio | Qué pasaba | Qué se hizo |
|---|---|---|
| Gafas | Iban de -35 a -22: por DEBAJO de los ojos, tapando la boca | Centradas en el ojo, con patillas hasta la sien |
| Bombín | Ala a -41 y copa a -54: dentro de la cabeza, como una banda negra en la cara. Bigote a -18, bajo la boca | Sombrero arriba con cinta, bigote entre nariz y boca |
| Diablo | Los cuernos nacían a -39, o sea a la altura de los ojos: parecían orejas | Nacen en la coronilla, se curvan hacia fuera; alas más grandes |
| Luchador | La máscara bajaba a -34 y le tapaba los ojos: era un casco, no una máscara | Aberturas con reborde amarillo y los ojos dentro |
| Momia | Tres brochazos sueltos que sobresalían: una equis flotando sobre la cabeza | Vendas recortadas contra la silueta, con su cabo suelto |
| Tiburón | La capucha iba de -44 a -24: tapaba la cara y los dientes salían de la boca | Fauces sobre la frente, aleta arriba, cara a la vista |

### Menos apoyos arriba, o sea saltos más largos

Medido en el recorrido: la subida media por salto era 65, 69, 63, 67, 47 y 45
px por cumbre. Los saltos se hacían **más cortos** según se sube; las dos
últimas cumbres eran una escalerilla regular de apoyos casi pegados. Justo al
revés de lo que tiene que pasar.

Subir los apoyos cambiaría la altura total y el medidor de metros, así que
`aclararApoyos()` hace lo contrario: **quita** apoyos. Los que sobran, y sobre
todo los que están pegados a su vecino (poca subida y poco hueco de lado).
Misma altura, menos escalones, cada salto más largo. Cada retirada se
comprueba con la física real y, si el salto que queda no tiene ventana de
despegue, el apoyo vuelve.

| | Antes | Ahora |
|---|---|---|
| Subida media por salto (cumbres 1→6) | 65, 69, 63, 67, 47, 45 px | 67, 69, 68, 74, 60, 73 px |
| Hueco lateral medio en la última cumbre | 144 px | 325 px |
| Apoyos pegados a su vecino | 4 | 2 |
| Saltos de la cadena | 293 | 248 |

Y los tamaños siguen apretando por su lado: cada cumbre menos la primera
tiene su apoyo redondo —se suman la **bola de acero** de la base secreta y la
**calabaza** de la feria—, así que hay 27 bolas de 70 px repartidas por las
cinco cumbres de arriba, más los apoyos estrechados.

### Un checkpoint intermedio por cumbre, exactamente

Los doce estaban repartidos por fracciones de la subida entera, y eso dejaba
tres en una cumbre y uno en otra. Ahora se colocan **por cumbre**: el de
entrada y UNO a media altura del tramo. Dos por cumbre, doce en total, uno
cada 83 m: 2, 80, 170, 251, 335, 426, 518, 596, 676, 753, 835 y 912 m.

### Las monedas ahora se gastan: la tienda

Las monedas sólo daban puntos. Ahora hay **hucha**: lo que recoges escalando
se guarda entre partidas y se gasta en la tienda del menú. Los cuatro
primeros colores y los tres primeros accesorios vienen puestos; el resto se
compra, y el precio sube con la posición en la lista (40, 60, 80… hasta 300
en colores; 60, 85, 110… en accesorios). Una subida completa deja unas 157
monedas —las de bonus valen 3—, o sea que la colección entera son unas quince
subidas.

Detalles que importan: la moneda se apunta **al cogerla**, y como una moneda
sólo se puede coger una vez por partida, morir a propósito no sirve para
refarmear; el guardado se difiere a una escritura por segundo en vez de una
por moneda; las tarjetas cerradas se ven en gris con su precio, y el precio se
enciende cuando ya te lo puedes permitir; y si el color guardado no está
comprado —partida vieja, guardado tocado a mano— se vuelve al primero que sí
es tuyo.

No hay selector de dificultad ni de niveles: se elige escalador y se sube.

### El verificador quedó a cero por primera vez

Arreglando lo anterior salieron dos defectos de fondo:

- **Un apoyo cíclico se medía mientras no estaba.** `ventanaSalida` simula al
  jugador de pie en el apoyo; si en esa fase del reloj el apoyo ha
  desaparecido, no hay desde dónde despegar y la ventana salía nula aunque el
  salto fuese perfecto mientras está. Ahora se mide con el apoyo puesto; que
  dé tiempo a salir antes de que se esfume lo comprueba `sembrarCiclicas`
  aparte, con el coste real del salto.
- **Sitio para saltar que no se podía pisar.** `despejarRatoneras` sólo miraba
  que quedaran 52 px libres en algún punto del apoyo. En el del metro 760
  quedaban 108, pero al otro lado de un techo: andando sólo se llegaba a 15 de
  los 18 px de ventana que se exigen. Ahora, si un salto se puede dar pero no
  con ventana, también se despeja el techo, y el arreglo sólo vale si de
  verdad la deja.

**Resultado**: 248 saltos, 0 imposibles, **0 sin ventana de despegue**, 0
apretados, 0 atajos rotos, 0 monedas sueltas, 0 drones que estorben, 0 px de
penetración y ningún error de consola. Es la primera vez que el informe sale
limpio entero.

### Las seis cumbres medían 275, 74, 198, 158, 109 y 186 metros

Las longitudes venían copiadas del juego original —210, 63, 173, 124, 130 y
300 m sobre el papel— y en el recorrido real salían todavía más torcidas: la
primera cumbre duraba **275 m** y la segunda **74**. Se nota jugando: una se
hace larguísima y la siguiente se acaba antes de enterarte.

`repartirCumbres()` vuelve a cortar el MISMO recorrido en seis tramos de la
misma altura. No mueve un solo apoyo ni toca un salto: lo único que cambia es
a qué cumbre pertenece cada uno. Con eso se reparten parejos el bioma, el
checkpoint, los objetos y la curva de dificultad, que se calculan todos a
partir de `world`.

| | Antes | Ahora |
|---|---|---|
| Cumbre 1 · Emberwall | 4657 px (275 m) | 2812 px (167 m) |
| Cumbre 2 · Coral | 1246 px (74 m) | 2733 px (167 m) |
| Cumbre 3 · Agent | 3358 px (198 m) | 2752 px (167 m) |
| Cumbre 4 · Growing Up | 2671 px (158 m) | 2779 px (167 m) |
| Cumbre 5 · Frosty | 1845 px (109 m) | 2742 px (166 m) |
| Cumbre 6 · One Way Up | 3150 px (186 m) | 2790 px (166 m) |

De regalo, el medidor de metros pasa a ser lineal de verdad: antes podías
estar en la cumbre 4 y leer 400 m cuando esa cumbre empezaba en 449.

### Doce checkpoints, uno cada 83 metros

Había uno por cumbre y se quedaba donde cayera el que ya traía el nivel: en la
cumbre 2 estaba **al 79 % del tramo**, o sea que caerse ahí obligaba a repetir
casi la cumbre entera. Con las cumbres repartidas parejas, cada una son 167 m:
demasiado castigo para un fallo.

`sembrarCheckpoints()` los coloca por ALTURA: uno al empezar cada cumbre y
otro a media cumbre. Doce en total, uno cada 83 m. El del medio es justo el
que pedía el tramo final, que es largo y va cargado de drones, apoyos
estrechos y bolas.

Se siembran **lo primero de todo**, antes que las móviles y los suelos: así se
quedan los apoyos anchos y quietos —un checkpoint sobre algo que se mueve, se
rompe o resbala no es una red— y las pasadas siguientes trabajan alrededor,
porque `apoyoLibre()` no toca lo que ya es checkpoint.

### Los pinchos no se veían

Eran cuatro triangulitos grises de 16 px sobre un apoyo del mismo gris. Sobre
el cielo claro, invisibles hasta que te mataban. Ahora:

- **Avisan de lejos**: un resplandor rojo en modo aditivo. Pintado normal, un
  rojo translúcido sobre cian da gris sucio —parecía una mancha, no un
  aviso—; sumando luz sale un halo rosado que se ve sobre cualquier fondo.
- **Zócalo a rayas amarillas y negras**, como una cinta de obra.
- **Metal de verdad**: 23 px de alto, gradiente lateral, filo oscuro y un
  destello blanco en la punta.

Y había **cuatro en todo el nivel**. La tirada estaba en 0,10 + 0,70·dif y el
apoyo tenía que medir 165 px; con las cumbres repartidas quedaban cuatro. Con
0,26 + 0,62·dif y 148 px de apoyo salen **trece**, y todos siguen pasando la
comprobación de que no se cruzan en el camino bueno: ni donde caes, ni desde
donde despegas.

### Tamaños: 31 bolas y apoyos estrechos en cinco cumbres

El ancho es la palanca de dificultad más honesta que hay: no cambia las
reglas, sólo el margen. Estaba prácticamente sin usar —el estrechador sólo
tocaba las dos últimas cumbres, una de cada veinte veces— y el ancho medio era
el mismo abajo que arriba.

- Las **bolas** (68–78 px, el apoyo más pequeño del juego) ya no salen sólo en
  tres cumbres: cada una tiene la suya. Se añaden dos redondos nuevos, la
  **bola de acero** de la base secreta y la **calabaza** de la feria, y con
  eso pasan de 19 a **31**, repartidas por las cinco cumbres de arriba. La
  primera se queda sin ellas a propósito: es la que enseña a saltar.
- El **estrechador** empieza en la cumbre 2 y aprieta con la altura: el apoyo
  se queda en el 71 % de su ancho abajo y en el 52 % arriba.
- **Orden importa**: estrechar iba ANTES que sembrar bolas y atajos, y se
  quedaba con los apoyos anchos que necesitan los otros dos —el nivel perdía
  dos tercios de sus bolas y de sus atajos de golpe—. Ahora va después.
- Un apoyo **con pinchos no se encoge**: los pinchos ya están clavados en una
  x concreta y al recortar el apoyo se quedaban flotando en el aire.

### Las plataformas que se mueven, otra vez

La física estaba bien: 52 móviles × 7 guiones × 4 fases del reloj × 900
fotogramas, cero empotramientos. Lo que se veía roto era el DIBUJO.

Un objeto se pinta hacia abajo desde la cara que se pisa —el apoyo es el
tejado de la casa—, y midiéndolos uno a uno resulta que cuelgan de 18 px
(metal) a **101** (noria), contra los 36 que mide el apoyo. Quieto queda bien.
Montado en un carril, barre su cuerpo entero por delante de los apoyos de al
lado, y eso es lo que se veía: la noria del metro 730 metiéndose en la
plataforma de abajo, la casa del 690 cruzando por delante de un ascensor.

Tres reglas, sacadas de medir y no de mirar:

1. Los apoyos **con carril** eligen sólo entre objetos que cuelgan menos de
   60 px (`OBJETOS_HONDOS` deja fuera noria, granero, torreón, muralla, casa,
   tractor, roca, castillo, refugio, autobús y portal).
2. Los apoyos **estrechos** (menos de 155 px) no llevan figuras que crecen
   hacia ARRIBA —árbol 95 px, faro 103, pino 70, muñeco 56—. En un apoyo
   ancho el personaje se coloca al lado; en uno estrecho no hay «al lado» y se
   quedaba con el árbol saliéndole de la cabeza. Con bolas de 70 px eso se
   veía constantemente.
3. El **tractor** escalaba con el ancho sin tope: en un apoyo de 320 px bajaba
   121 px y se metía en la plataforma de abajo. Tope y arreglado.

### La pantalla de inicio

Estaba completa pero plana: un panel oscuro flotando sobre un negro al 86 %.

- **El fondo es el juego.** Detrás del menú se está pintando el nivel de
  verdad, pero iba tapado y no se veía nada. Ahora se deja ver, difuminado y
  con una viñeta que oscurece sólo los bordes, y además **la cámara pasea**:
  sube despacio por el recorrido entero, de la salida a la meta y vuelta a
  empezar, con las plataformas moviéndose y los drones patrullando. El fondo
  del menú deja de ser un color y pasa a ser el sitio al que vas.
- **Fuera el HUD del juego.** El marcador, los botones de esquina y el del
  mapa se veían asomando por detrás del panel: cajas sueltas flotando en el
  fondo, que es exactamente lo que hace que una pantalla parezca sin terminar.
- **Datos reales bajo el título** en vez de una frase de folleto: 1000 metros
  · 6 cumbres · 302 apoyos · 12 checkpoints · 191 monedas. Salen del nivel que
  se va a jugar.
- **Las seis cumbres, en fichas**, con su color y su tramo de metros
  (`0–167 m`, `167–334 m`…). Antes iban escritas DENTRO del lienzo del mapa,
  encima del trazado del recorrido, y no se leía ni una cosa ni la otra.
- **La guía de mecánicas, a dos columnas**: diez renglones seguidos son un
  muro de texto; en dos columnas se leen como la leyenda que son.
- **Récords sin marca**: la ficha se apaga entera en vez de enseñar una raya
  grande, que es lo que hacía que la cabecera pareciera a medio hacer.
- **Un destello cruza el rótulo** cada seis segundos y medio. Es lo único que
  se mueve en la mitad de arriba, y es lo que separa un título de un letrero.
- El panel **cabe entero sin barra de desplazamiento** en 1920×1080,
  1600×900, 1440×860 y 1366×768.

### Bolas: los objetos redondos ahora son el apoyo, y son pequeños

La pelota, el salvavidas y la boya son redondos, pero estaban pintados encima
de una plataforma rectangular de 200 px. Si la cosa es una bola, que sea una
bola: **19 apoyos del nivel se encogen a 68–78 px y pasan a ser esferas
sueltas**, sin caja debajo. Son los apoyos más pequeños del juego —el
personaje mide 52 px de ancho— y están repartidos entre los metros 209 y 966.

| Mundo | Qué sale |
|---|---|
| Coral Climb | Pelota de playa, salvavidas (con su agujero de verdad) y boya con farolito |
| Frosty Peaks | Bola de nieve con costra de hielo arriba |
| One Way Up | Esfera de energía con su anillo |

Dibujarlas bien es la mitad del trabajo: `volumenBola()` pone la luz radial,
el borde oscuro y el brillo aplanado de arriba que es lo que hace que se lea
como una esfera y no como un círculo; `sombraRedonda()` sustituye la sombra
rectangular, que en una bola cantaba.

La otra mitad es que **sigan siendo jugables**. `sembrarRedondas()` no encoge
nada a ciegas: guarda el apoyo original, lo reduce alrededor del punto donde
caes y sólo se queda el cambio si el salto de entrada **y** el de salida
siguen teniendo ventana de despegue con la física real. Al final de la
composición, `revisarRedondas()` lo vuelve a mirar todo con las móviles ya en
su sitio de salida —si la bola tiene un vecino con carril, exige que salga en
al menos 6 de cada 10 fases del reloj— y devuelve a su tamaño la que no
aguante. Resultado: 19 bolas, ninguna rota.

En el mapa son rosas, están en la leyenda y en la guía del menú, y la primera
que pisas se anuncia: «Bola suelta: cae justo encima».

### Una plataforma que se movía hacia ti te tragaba

El probador anterior ponía al jugador encima de cada móvil y lo dejaba
**quieto**. Así salían cero fallos. Con el jugador andando —que es lo que
hace un jugador— salían **ocho**, y todos eran el mismo fallo:

> La física deshacía los choques que provocaba TU movimiento (te mueve, mira
> si has entrado en un bloque, te devuelve). Pero si tú estabas quieto y era
> la plataforma la que se metía en ti, no había nada que deshacer: te tragaba
> y te quedabas dentro de la piedra.

Dos arreglos, los dos en el motor compartido, así que el generador ve
exactamente lo mismo que el juego:

1. **`desincrustar()`**: si el personaje acaba dentro de un bloque, sale por
   el lado más corto que quede libre, comprobando antes que ahí no hay otro
   bloque. Corre al abrir y al cerrar cada fotograma. Salir por arriba te deja
   de pie encima: si un ascensor sube pegado a ti, te sube.
2. **La resolución lateral tenía un tercer caso sin escribir.** Sabía volver
   si venías por la izquierda y si venías por la derecha; si no venías de
   ninguna parte —porque no te habías movido tú— se encogía de hombros y te
   dejaba dentro. Ahora sale por el lado más corto en el mismo fotograma.

**Comprobado**: 52 móviles × 3 direcciones × 1200 fotogramas = 0 px de
penetración en todo el nivel. Antes, con el mismo probador, se llegaba a
meter medio cuerpo. La prueba ya no es un apaño de andar por casa: está en
`verificar-nivel.mjs` y hace fallar la verificación si vuelve a pasar.

### El menú tardaba cuatro segundos en aparecer

Componer el nivel —sembrar, verificar salto a salto y repasar— son varios
segundos de cuentas, y corrían **antes del primer pintado**: el juego se abría
en blanco y la pantalla de inicio no salía hasta el final. Ahora se pinta
primero el menú y se compone después, en cuanto el navegador ha enseñado algo:
la pantalla de inicio aparece en **0,15 s** en vez de en 4. Mientras tanto el
recuadro de la ruta lo dice —«Trazando la ruta…»— en vez de quedarse negro, y
si alguien le da a Empezar antes de tiempo no pasa nada: el nivel se compone
en ese momento, que es lo que hacía siempre.

### Una sola partida, música calmada y los objetos arreglados

Los tres niveles y las vidas duraron una versión: **se quitan**. Vuelve la
partida única de 0 a 1000 m, sin límite de caídas y con el checkpoint de cada
cumbre como única red. Los drones se quedan: no eran un «modo de juego» sino
un obstáculo del mundo, y están verificados.

**La música metía prisa.** Eran dieciocho notas a seis por segundo que además
*aceleraban* en cada cumbre: en un juego donde te caes cada dos por tres, eso
es lo contrario de lo que hace falta. Ahora son cuatro acordes lentos —segundo
y medio cada uno— con las notas entrando despacio (`nota()` acepta el tiempo
de ataque) y a un tercio del volumen. De 9 notas por segundo a 2,4.

**Los objetos.** El repaso empezó por mirarlos: una hoja de contactos que
dibuja cada uno sobre una línea roja que marca dónde acaba el apoyo. Lo que
salió:

| Objeto | Qué le pasaba | Qué es ahora |
|---|---|---|
| Farol | Un rectángulo amarillo | Farol con tapa a dos aguas, cristales y llama |
| Roca | Una lenteja plana | Peñasco con caras, grietas y repisa con musgo |
| Lancha | El casco colgaba, la cabina flotaba | Cubierta de teca, casco debajo, cabina empotrada |
| Boya | Un aro pinchado en una barra | Boya cónica maciza con su farolito |
| Flotador | Un aro pequeño bajo una tabla | La rosquilla ES el apoyo, tumbada |
| Reja | Los postes colgaban por debajo | Marco con los barrotes dentro |
| Sombrilla | Una raya roja sin volumen | Lona con gajos sobre un montón de arena |
| Panel | El soporte colgaba | La placa es el apoyo, con bastidor macizo |
| Árbol, muñeco, faro | Se estiraban al ancho del apoyo | Proporción fija sobre una base ancha |

Esa última fila es la regla que faltaba. Un árbol estirado a los 240 px de un
apoyo es un trapecio; un muñeco de nieve, una tortita. Ahora la figura
conserva su tamaño y se planta sobre una **base que sí llena el apoyo**
(`baseAncha()`), que es lo que se pisa.

**Objetos nuevos**: faro, pelota, castillo, casa, lápida y árbol de hoja.

**Y los decorados se van.** Casa, lápida, iglú, muñeco y árboles eran fondo
*y* objeto a la vez. Ahora son sólo objeto, del catálogo, y se pisan. El
resto del decorado se retira entero: plantaba farolas e iglús al lado de los
apoyos, y en un juego donde TODO flota, un decorado de pie sobre nada se ve
roto —había farolas clavadas en el cielo—.

### Las plataformas que se mueven te metían en el techo

No se buscó a ojo: un probador pone al jugador encima de **cada una de las 55
plataformas móviles** y simula 420 fotogramas con la física de verdad,
comprobando que no acabe dentro de ningún apoyo ni caiga al vacío. Salió una:
la del metro 620, un apoyo con carril que pasaba justo por debajo del de
arriba y te llevaba él solo a meter la cabeza en el techo.

Tres arreglos:

1. **El arrastre no se comprobaba contra nada.** Lo que te empuja una
   plataforma móvil se sumaba a tu posición *después* de tomar el punto de
   partida para las colisiones laterales, así que se colaba sin revisar.
   Ahora el punto de partida es de antes del arrastre y la resolución lateral
   que ya existía deshace lo que te empuje contra un muro.
2. **Un ascensor que sube contra un techo te empotraba en él.** Ahora el
   arrastre vertical te deja justo debajo: el ascensor sigue, tú no.
3. **Cada pasada de composición mueve geometría** y puede invalidar la
   comprobación de la anterior —precisión estrecha apoyos, los atajos añaden
   plataformas—. Se añade un **repaso final**, cuando ya no se mueve nada:
   `revisarCarriles()` encoge el carril del que no cabe y, si ni así, le quita
   el movimiento; y `despejarRatoneras()` se ejecuta otra vez al final.

Los ascensores llevan además una regla más dura que los deslizantes
(`carrilSinTecho`): de una plataforma que se desliza te apartas, de una que
sube no. Resultado: **0 de 52 móviles** dejan al jugador dentro de nada, y
ningún apoyo del nivel se queda sin sitio donde ponerse de pie.

El reparador de ratoneras también deja de perdonar: antes se saltaba las que
se podían abandonar, pero poder salir no arregla estar de pie con la cabeza
metida en la plataforma de encima.

**Comprobado**: 293 saltos, 0 imposibles, 14 atajos, 191 monedas, 9 drones,
60 pasos/s y ningún error de consola.

### Tres niveles, vidas y drones

La idea era un `LevelManager` con tres niveles progresivos. Casi todas las
mecánicas que pedía ya estaban —estáticas y monedas, móviles y pinchos,
frágiles y trampolines—, sembradas por franja de dificultad. Lo que no había
era **dónde elegir**, un final de nivel y algo que se moviera por su cuenta.

**Los niveles son tramos del recorrido, no niveles nuevos.** Generar tres
mapas nuevos tiraría a la basura la verificación de los 293 saltos. En vez de
eso, cada nivel juega un trozo del que ya está comprobado:

| Nivel | Cumbres | Metros | Apoyos | Vidas | Qué trae |
|---|---|---|---|---|---|
| 1 · Principiante | 1-2 | 0-271 | 88 | 5 | Apoyos anchos, monedas, algún trampolín |
| 2 · Intermedio | 3-4 | 275-569 | 94 | 4 | Móviles, ascensores, pinchos, atajos |
| 3 · Avanzado | 5-6 | 572-1000 | 112 | 3 | Frágiles, hielo, van y vienen, drones |
| ∞ · Ascenso completo | 1-6 | 0-1000 | 294 | sin límite | La partida de siempre |

`rangoNivel()` busca el primer y el último apoyo de cada tramo **por su
cumbre en el array real**, no por índices escritos a mano: las pasadas de
composición añaden atajos, y esos no son el principio ni el final de nada.

**Game Over de verdad.** Sin condición de derrota no hay pantalla de Game
Over que valga, así que en modo nivel las caídas se cuentan: 5, 4 y 3 según
el nivel, con corazones en el marcador. Al agotarlas sale el resumen con la
puntuación que pedía el enunciado —la **altura máxima alcanzada**— y cuánto
del nivel te llevaste, en barra. El ascenso completo se queda **sin límite**:
es como se ha jugado siempre y no tiene sentido cambiarlo a estas alturas.

Al superar un nivel, la pantalla de victoria ofrece **el siguiente**, y cada
nivel guarda su propia marca (tiempo, caídas, puntos). Las partidas guardadas
de antes siguen valiendo: el ascenso completo escribe donde escribía.

**Drones, el obstáculo que se mueve solo.** Patrullan el hueco ENTRE dos
apoyos, a la altura del vértice del salto, en las cumbres 5-6. La regla que
los hace justos es la misma que la de las plataformas que van y vienen: no se
les exige no tocar nunca el arco del salto —eso sería un adorno— sino que
**haya momentos buenos de sobra**. Se prueban doce instantes de salida y al
menos cinco tienen que dejar el arco entero limpio, así que siempre se puede
esperar el hueco, pero hay que mirar antes de saltar. Salen 11 en el nivel.

Verificarlos costaba dos segundos de la carga porque `arcoSalida()` vuelve a
buscar el salto desde cero. Pero el salto **ya está resuelto**: cada apoyo
guarda el plan de teclas con el que se verificó (`traza.plan`: desde dónde se
despega, hacia dónde y en qué fotograma va el doble salto). `arcoDelPlan()`
lo reproduce con una sola simulación. La pasada entera pasó de 2 s a **10 ms**.

El verificador comprueba ahora también los drones —ninguno sobre un apoyo,
ninguno con menos de 3 de 12 fases libres— y que los tres tramos tengan
apoyos de sobra. Sigue dando 293 saltos, 0 imposibles y 189 monedas.

**Lo que costó de sitio.** El selector son 55 px a lo ancho bajo la cabecera
—ahí va porque es la primera decisión de la pantalla, no un ajuste escondido
en una columna—. Para hacerle hueco se fue el lema, que decía «1000 metros ·
6 cumbres» justo cuando las fichas lo dicen con más detalle. Probé a comprimir
los controles en fichas que fluyen: en una columna de 250 px se apilan igual y
ocupan más, así que volvió la lista. El panel entra entero en 1600×900 y se
desplaza 41 px en 1440×860; el botón de empezar sigue fijo y visible en todas.

### La pantalla de inicio, a fondo

Estaba **ordenada** desde la pasada anterior, pero seguía siendo plana: todos
los bloques con el mismo borde y el mismo radio, sin jerarquía, y con un hueco
de 250 px bajo la rejilla de colores porque las tres columnas medían cosas
distintas. Esta pasada va de calidad, no de colocación.

**Tres trampas de cascada, otra vez la misma clase de fallo.** `.panel` se
declara *después* de `.menu`, así que ganaba en todo lo que compartían:

| Lo que decía el menú | Lo que se aplicaba de verdad | Consecuencia |
|---|---|---|
| `h1` con degradado dorado | `.panel h1 { color:#ffd700 }` | El degradado del título no se vio nunca |
| `padding:15px 20px 9px` | `.panel { padding:32px 28px }` | 55 px de alto tirados |
| `canvas { height:44px }` en pantallas bajas | una regla suelta al final con `56px` | Las consultas de medios no hacían nada |

Las tres se arreglan con `.menu .cabecera h1` y `.panel.menu`, y **moviendo
todas las consultas de medios del inicio al final de la hoja**, con un comentario
que dice por qué están ahí. Antes estaban arriba, delante de las reglas que
querían ajustar, y la mitad eran letra muerta.

**Lo que cambia en pantalla:**

- **Cabecera en dos piezas**: el rótulo a la izquierda —con antetítulo, el
  título en degradado a 39 px y el lema— y las cuatro fichas de récord a la
  derecha. Antes iban una debajo de otra y costaban 90 px de alto. Cada ficha
  lleva su color y se enciende sólo cuando esa marca existe: de un vistazo se
  ve qué falta por hacer.
- **Cada columna es una tarjeta** con fondo, borde y luz propia, y todas miden
  lo mismo. El hueco de antes ya no se lee como un agujero.
- **Escaparate más grande**, con sol, halo, dos hileras de montañas y una placa
  con el nombre del color debajo del marco, en vez del rótulo encima de los pies.
- **Rejilla de aspecto a cuatro por fila** (tres en móvil), con las tarjetas más
  grandes, marca de elegido y un raíl hundido para las dos pestañas.
- **Teclas con relieve**, listas de mecánicas en filas, campo de nombre hundido
  con foco dorado y un brillo que cruza el botón de empezar cada cuatro segundos
  —el único movimiento del menú, y va justo donde hay que pulsar.
- El botón de sonido dejó de llevar debajo la sombra dorada del botón principal.

**Dos fallos de dibujo que salieron por el camino:**

- Las tarjetas tenían un lienzo de 96×76 metido en una caja de 90×48: el CSS
  estiraba el resultado y **los personajes salían achatados**. Ahora
  `ajustarLienzo()` mide la caja real y multiplica por la densidad de pantalla,
  así que el retrato sale con sus proporciones y además nítido en retina.
- «¿Es este lienzo lo bastante ancho?» se preguntaba con `cv.width`, que en una
  retina es el doble: la vista previa del menú se creía un mapa grande y le
  salía la regla de metros encima de los nombres de las cumbres. Ahora la
  pregunta va en píxeles de CSS (`anchoCSS()`), y el rótulo `META` se recorta
  midiendo el texto en vez de con un margen fijo de 44.

**Comprobado** a 1600×900, 1440×860, 1366×768, 1280×720, 1024×700 y 390×780. El
panel entero cabe hasta 1440×860; por debajo se desplaza, pero el botón de
empezar sigue pegado al fondo y visible en las seis. El sobrante bajó de 152 px
a 4 en 1440×860, y de 231 a 64 en 1280×720.

### El escaparate del personaje era una caja de degradado

Ahora es una escena con las mismas rutinas que el juego: cielo, nubes que
cruzan a tres velocidades, montañas al fondo y el apoyo de hierba sobre el que
el personaje se planta de verdad —con su sombra— en vez de flotar en el
centro. Y la tarjeta de «mejor altura» lleva debajo una barra con cuánto te
queda de los 1000 m.

### El menú principal, rehecho

El problema no era estético: con 18 colores y 16 accesorios en **dos rejillas
apiladas**, el menú medía casi el doble que la pantalla y el botón de empezar
quedaba fuera. Ahora las dos van en **pestañas** —sólo una a la vista—, los
controles bajan a la columna del personaje, que estaba medio vacía, y en la
tercera columna, bajo la ruta, hay una guía de **lo que te vas a encontrar**:
las ocho mecánicas con el mismo código de color que usa el mapa.

Debajo de las tarjetas, una línea dice qué llevas puesto («Llevas Abeja con
Corona»), que era información que sólo estaba en el dibujo.

Y el botón de empezar se queda **pegado al fondo del panel**. En 1280×720 o en
un móvil el menú no cabe por mucho que se recorte, y lo que no puede pasar es
que haya que desplazarse a ciegas para encontrarlo. Comprobado a 1440×860,
1366×768, 1280×720 y 390×780: visible en las cuatro.

### Siete objetos más que iban clavados en un palo

Un detector automático dibuja cada uno de los 52 objetos por separado y busca
lo que cuelga fino por debajo del apoyo; una hoja de contactos con los 52
juntos enseña lo que sobresale por arriba. Entre las dos salieron:

| Objeto | Qué pasaba |
|---|---|
| 🛟 Boya | El salvavidas iba **ensartado en una barra** que cruzaba todo el apoyo. Ahora descansa sobre un noray, y el aro tiene agujero de verdad |
| 🛟 Flotador | La peana se pintaba **la última** y tapaba medio flotador: sólo asomaban los parches rojos, sueltos |
| 🚧 Conos | Iban **del revés y colgando** bajo el apoyo, con el argumento de que arriba «se atravesarían». No se atraviesan |
| 🗿 Estatua | El busto flotaba sobre un pedestal estrecho: una cabeza en un palo |
| 🎡 Noria | La rueda colgaba de una barra fina. Ahora tiene patas en A y zócalo |
| ⛵ Velero | El mástil sobresalía por encima de las velas |
| 🛥️ Yate | Un asta de bandera de 18 px sobre el puente, cambiada por un arco de radar |
| 🎪 Carpa | El remate dorado flotaba 12 px por encima de la lona |
| ⛱️ Sombrilla | Al quitarle el mástil se había quedado en una lámina plana; recupera volumen con gajos y un montón de arena |

Lo que el detector sigue marcando —ruedas de tractor, de autobús y el aro de
la noria— son formas redondas, no palos: en el punto más estrecho de un
círculo la fila mide poco y el detector no distingue. Se comprobó en la hoja
de contactos.

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
| Empotramientos | `desincrustar()`: te saca del bloque en el que se ha metido una plataforma |
| Verificación | `costeSalida()`, `seLlega()`, `alrededor()`: replay del recorrido con el motor real |
| Ratoneras | `despejarRatoneras()`: apoyos con techo demasiado bajo para saltar |
| Cumbres | `repartirCumbres()`: corta el recorrido en seis tramos de la misma altura |
| Checkpoints | `sembrarCheckpoints()`: dos por cumbre, uno al entrar y otro en la mitad |
| Estelas | `ESTELAS`, `emitirEstela()`, `dibujoEstela()`: el rastro, compartido entre juego y tienda |
| Temas | `CATALOGO`: seis catálogos cerrados, uno por cumbre |
| Aclarado | `aclararApoyos()`: quita apoyos para que los saltos sean más largos |
| Dibujo estable | `anclarApoyo()`: la móvil se pinta en reposo y el lienzo viaja |
| Tienda | Hucha de monedas, precios y compras guardadas en el navegador |
| Suelos | `sembrarSuelos()`: hielo, frágiles y pinchos, verificados uno a uno |
| Generación | Sólo se usa si no hay `NIVEL_FIJO`: coloca apoyos y verifica cada salto simulándolo |
| Estado y lógica | Cámara, muertes, checkpoints, pausa, marcador |
| Sonido | Notas generadas con Web Audio, sin archivos |
| Dibujo | Fondos por bioma, apoyos ilustrados, personaje y accesorios |
| Menú | Tienda de color, accesorio y estela, con el personaje dibujado en cada tarjeta, y el mezclador |

Que el generador use el **mismo** `pasoFisica()` que el juego es lo que hace
imposible que se genere un salto que luego no se pueda dar. Por eso la
reparación de ratoneras se comprueba con él y no con una fórmula aparte.
