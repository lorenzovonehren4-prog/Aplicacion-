# Combi Rush

Juego 3D (Three.js) de manejar una combi por Lima. Todo el juego es un único archivo:
**`combi-rush.html`**. Ábrelo en el navegador y listo.

## Estructura

- `src/head.html`: estilos y pantallas (HTML y CSS).
- `src/three.html`: Three.js r160 embebido.
- `src/game.html`: el juego.
- `tools/build.mjs`: une las tres partes en `combi-rush.html`.
- `tools/smoke.mjs`: prueba de humo (12 viajes, 4 climas, todos los modos).
- `tools/shots.mjs`: capturas de pantalla para revisar la parte visual.
- `tools/mem.mjs`: mide geometrías en GPU durante un viaje largo (detecta fugas).

```bash
node combi-rush/tools/build.mjs
node combi-rush/tools/smoke.mjs
node combi-rush/tools/shots.mjs combi-rush/shots
```

## Versión 3: jugabilidad más clara

- **Paraderos con información:** tarjeta flotante sobre el próximo paradero (cuántos esperan, cuántos bajan, asientos libres o "¡Combi llena!") e indicación de qué hacer ("Pásate al carril derecho", "Frena sobre la marca amarilla").
- **Asientos en el HUD:** una fila de asientos que se llena, con VACÍA / N libres / ¡LLENA!, y aviso de asientos que quedan cada vez que sube alguien.
- **Pasajeros que bajan antes:** algunos llevan la etiqueta BAJA/P2 y se bajan en un paradero intermedio (pagan y dejan propina). Si te pasas su paradero, se molestan.
- La combi ya no arranca llena: sale al ~60% para que puedas recoger gente.
- **Huecos y conos visibles:** borde de asfalto roto, piedras, conos altos con cinta y cartel "¡HUECO!", y un triángulo de aviso sobre cada hueco que viene.
- **Carros bot que esquivan:** cambian de carril ante huecos y conos, frenan si no pueden, y rebotan si caen en uno.
- **Minimapa estilo Waze:** mapa claro, ruta celeste, reportes de huecos, policía y fiscalizador, tráfico lento en rojo/naranja y "Llegas en…".
- **Consejos la primera vez:** paradero, hueco, semáforo, curva, combi llena, pasajero que baja y racha.
- **¿Cómo se juega?** con 4 tarjetas ilustradas; los consejos largos van plegados.
- **Progresión visible:** ficha de tu combi en el menú (velocidad, asientos, motor), insignia "¡Mejora!" en el Taller cuando te alcanza, y tarjeta de mejora con botón al Taller en los resultados.
- **Menús animados:** logo que entra, botones en cascada, brillo en Jugar, listas que aparecen por partes.
- Líneas de velocidad y viñeta al ir rápido; árboles y postes ya no tapan la combi.

## Versión 2

**Gráficos**
- Mapeo de tonos ACES y exposición por ambiente: colores con más cuerpo, luces sin quemarse.
- Cielo nuevo: bóveda con degradado, sol bajo al atardecer, luna y estrellas de noche, y banda de nubes que se mueve.
- Asfalto en 512 px con parches, fisuras, árido y la huella oscura de las llantas en cada carril.
- Pista mojada con reflejos reales (material físico con reflejo del cielo).
- **Nuevo ambiente: Noche.** Ventanas encendidas (luz cálida y alguna tele azul), letreros luminosos, charcos de luz bajo los postes y faros encendidos.
- Anisotropía x16 en texturas, humo más discreto de noche y brillo de estampitas que ya no se lava a blanco.
- La cámara de la cuenta regresiva ya no queda metida entre los árboles.

**Mapas**
- Minimapa rehecho: cuadras, calles que cruzan, parques, ríos, mar, arenal de la vía rápida, paraderos (P), semáforos en vivo, flechas de sentido, brújula (N) y zoom según la velocidad.
- Mapa completo de la ruta (tecla **M**, o toca el minimapa): todas las calles con su nombre, vueltas numeradas, salida y destino, tu posición, lo que falta y una leyenda.
- Miniatura del recorrido en cada viaje de la lista, y mapa más grande en el cartel de salida.

**Rutas**
- 4 viajes nuevos (ahora son 12):
  9. **Costa Verde**, San Miguel → Chorrillos: nueva zona de malecón con mar, playa, sombrillas, salvavidas, muelle y acantilado con edificios arriba.
  10. **Rumbo al aeropuerto**, por la Av. Colonial y la Av. Elmer Faucett, con garúa.
  11. **Carretera Central**, Ate → Chosica, al atardecer, cruzando el río Rímac.
  12. **Noche en el Centro**, Plaza Bolognesi → Plaza de Armas.
- Las 3 rutas clásicas ahora tienen curvas, zonas y nombres de calles reales.
- Metas nuevas: manejar por la Costa Verde y terminar un viaje de noche. Las metas del álbum se ajustan solas al número de viajes.

**Rendimiento**
- Se corrigió una fuga de memoria de GPU: las geometrías de cada cuadra nunca se liberaban
  (en un viaje de 2,4 km pasaban de 700 a más de 2500; ahora se mantienen alrededor de 350).
