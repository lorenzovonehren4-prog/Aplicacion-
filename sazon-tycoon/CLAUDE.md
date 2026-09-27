# Sazón Tycoon

Juego tycoon de restaurantes peruanos en 3D para navegador. El jugador empieza con un local chico en Lima y lo convierte en un restaurante de varios pisos con drive-thru y delivery. Estilo "tycoon de Roblox" (pads de compra en el piso, cosas que se construyen con animación) pero con mejor calidad visual.

Todo el texto del juego está en español de Perú, con humor local. Evitar marcas reales (Inca Kola, etc.): usar nombres inventados.

## Cómo correrlo

- Abrir `index.html` directo en el navegador, o servirlo con `npx serve .` y entrar a la dirección que muestre.
- No hay paso de compilación. Son scripts clásicos (no módulos ES) que comparten el ámbito global.
- `vendor/three.min.js` es three.js r160 (versión UMD). No cambiar de versión sin revisar la API.
- Las fuentes (Fredoka para títulos, Rubik para texto) están en `vendor/fonts/`: el juego no necesita internet. En canvas usa `FONT_D` con peso 700.
- Para itch.io: `node tools/empaquetar-itch.mjs` arma `dist/sazon-tycoon-itch.zip`. Pasos en `PUBLICAR_ITCH.md`.

## Estructura

El orden de carga en `index.html` importa: `core.js` → `world.js` → `helpers.js` → `sim.js` → `ui.js`.

- `src/core.js`: utilidades, datos del juego (platos `DISHES`, roles de personal `ROLES`, decoración `DECOR`, metas `GOALS`, precios), guardado en `localStorage` (`save`, `loadSave`, `persist`) y audio sintetizado con Web Audio (`SFX`, música de fondo).
- `src/world.js`: escena de three.js, luces, texturas generadas con canvas, distribución del local (`SLOTS` de mesas por piso, `STATION_X`, caja `REG`, puerta `DOOR`, escaleras `STAIR` y `stairX(f)`), y todos los modelos 3D: pisos, cocina, mesas, caja, escaleras, drive-thru, motos, autos, decoración, calle y edificios vecinos. `rebuildWorld()` reconstruye todo desde `save`.
- `src/helpers.js`: funciones compartidas: `M()` (caché de materiales), `canvasTex()`, `box/cyl/sph/plane`, `makePerson()` y `posePerson()` (personas con rodillas, codos y cabeza animadas), `bake()` (fusiona mallas para rendimiento), `facadeTex()`.
- `src/sim.js`: simulación: clientes (caminan por la vereda, entran, hacen cola, se sientan, piden, esperan, comen, pagan, califican), cocina y pedidos (`SIM.orders`), personal (cocinero, mozo, limpiador, cajero, ventanilla, motorizado), drive-thru (`updateCars`), delivery (`updateDelivery`), reseñas y calificación (`makeReview`), ciclo del día (`updateSim`, `DAY_LEN` = 180 s) y el personaje del jugador (`updateAvatar`).
- `src/ui.js`: cámara (orbitar arrastrando, zoom con rueda o pellizco), controles (WASD, tocar para caminar, joystick táctil), pads de compra (`padList`, `buy`), paneles (Personal, Carta, Decoración, Reseñas, Metas, Opciones), HUD, textos flotantes en un canvas 2D encima del 3D (`drawOverlay`), resumen del día, ganancias fuera de línea y el bucle principal (`frame`).
- `index.html`: HTML y CSS de toda la interfaz.

## Flujo de un cliente

Vereda (`walker`) → entra si quiere y hay mesa con sillas suficientes (`freeTable(n)`), si no hace cola (máx. 4, se va a los 40 s) → camina a su silla (`toTable`) → mira la carta (`order`, 1,2 s) → llama al mozo (`callWaiter`, la paciencia baja 1,2/s) → un mozo o el jugador anota el pedido (`takeOrder`, recién ahí se crean los pedidos en `SIM.orders` y se cobran los ingredientes) → espera el plato (`wait`, paciencia 1,9/s) → come (`eating`) → paga a la caja (`save.register`) y deja reseña → la mesa queda sucia.

- Mesas: `save.tables[f]` cuenta las mesas por piso; `save.big[f]` cuántas de ellas (las primeras) ya son para 4. Usa `tableCap(f, i)`. El pad "Mesa para 4" aparece con `BIG_UNLOCK` (6) mesas y cuesta `bigCost()`.
- Grupos de 3 y 4 solo llegan si existe alguna mesa para 4. Sillas: `seatPos(t, s)` (0 adelante, 1 atrás, 2 y 3 a los costados); el mozo se para en `waiterSpot(t, s)`.
- Iconos del personal: `staffActivity()` y `drawIcon()` en `ui.js`, dibujados a mano en el canvas 2D (sin emojis).

## Cadena de locales (Etapa 2)

- `DISTRICTS` en `core.js` define cada distrito (Centro, Miraflores, Barranco, Gamarra): cuánto pagan, cuánta gente entra, cuánta decoración exigen, etc. `DIST()` devuelve el del local activo.
- El local activo vive en los campos de arriba de `save`. `save.chain` guarda una copia de cada local (`LOCAL_KEYS`) y `save.active` es el índice del activo. La plata, el día y las metas son de toda la cadena.
- Si agregas un campo que es de cada local, ponlo también en `LOCAL_KEYS`.
- `switchLocal(i)` (en `ui.js`) guarda el actual, llama a `resetSim()` y reconstruye todo. `openLocal(k)` abre uno nuevo.
- Los locales que no miras ganan `localeDaily(loc) * BG_SHARE` por día, sumado poco a poco en `updateSim`.

## Eventos (Etapa 3)

- `EVENTS` en `core.js`: partido, crítico, apagón y feriado. `save.event` guarda el evento del día (`{ id, day, ... }`) y `save.nextEvent` el día del próximo (el primero es el día `EVENT_FIRST_DAY`, luego cada 2 o 3 días).
- En `sim.js`: `startEvent()` al cambiar de día, `updateEvents()` en cada tick, `eventOn(id)` para preguntar si hoy toca, y `eventResult()` arma el texto del resumen.
- El apagón pone `SIM.blackout` (la cocina no avanza) salvo que el local tenga `save.generator`. El crítico es un cliente con `critic: true` y su reseña pesa como 10.
- `showEventCard()` en `ui.js` muestra el aviso grande. El resultado sale en el resumen del día.

## Gráficos, cámara y rendimiento

- Calidad: `QUALITIES` y `QCFG` en `core.js` (baja, media, alta). Se lee antes de crear el renderizador; cambiarla guarda y recarga. `QCFG.pbr` usa `MeshStandardMaterial` en `M()`, `QCFG.simple` arma personas de 5 mallas, `QCFG.round` usa cápsulas (`limb()`).
- Tone mapping ACES (`renderer.toneMappingExposure`). Con PBR la luz hemisférica se baja en `updateLighting` porque el mapa de entorno ya ilumina.
- Cámara (`CAM` en `ui.js`): los controles cambian objetivos (`yawT`, `distT`, `tiltT`) y `updateCamera` los sigue suave, con inercia. El ángulo baja al acercarse. Con la cámara baja se ocultan los objetos de `WLD.front` (fachada).
- `bake()` fusiona mallas estáticas por material (incluye cajas con varios materiales). `rebuildWorld` fusiona la calle y cada piso; lo que se mueve o cambia de visibilidad debe ir en su propio grupo o marcado con `userData.keep`.
- Las sombras de contacto de las personas son una sola `InstancedMesh` (`PEOPLE_BLOBS`, en `poseAll`).
- `adaptResolution()` baja la resolución interna si el juego va a menos de ~45 FPS.

## Tutorial

- `TUT` en `ui.js`: pasos con texto, condición `done()` y objetivo `at()` (punto del mundo o botón). `save.tutorial` es el paso actual (-1 = terminado u omitido). Mientras dura, los clientes tienen el doble de paciencia (`tutSlow()`).

## Coordenadas

- Unidades: una persona mide unos 38. Y es hacia arriba.
- El local ocupa x de -500 a 500 y z de -400 a 400. La calle está en z positivo (frente).
- Cocina al fondo (z < -200) solo en el piso 1. La barra donde salen los platos está en `PASS_Z`.
- Altura por piso: `FLOOR_H` = 170. Piso `f` está en y = `floorY(f)`.
- Las escaleras alternan de lado: `stairX(0)` = 410, `stairX(1)` = -410. El piso de arriba tiene un hueco sobre cada escalera.
- Las personas caminan con `route(p, x, z, f)`, que agrega los tramos de escalera si cambia de piso.

## Reglas de trabajo

- Mantener la separación: datos en `core.js`, modelos en `world.js`, lógica en `sim.js`, interfaz en `ui.js`.
- Todo lo que se guarda va en el objeto `save`. Si agregas un campo nuevo, agrégalo también en `freshSave()` y asegúrate de que `loadSave()` no rompa partidas viejas.
- Rendimiento: el juego debe andar en celulares de gama media. Reutiliza geometrías y materiales (`GB`, `GC`, `M()`), usa `bake()` en modelos estáticos y evita crear objetos nuevos en cada cuadro.
- Nada de `alert()`. Los avisos usan `toast()` y `banner()`.
- Respeta `prefers-reduced-motion` en animaciones nuevas.
- Después de cada cambio grande, abre el juego y verifica en la consola que no haya errores.

## Balance actual (referencia)

- Dinero inicial S/ 200. Mesas desde S/ 60 creciendo 24 % cada una. Segundo piso S/ 3 000, terraza S/ 9 000, drive-thru S/ 2 000, delivery S/ 1 500.
- Los clientes pierden paciencia mientras esperan su plato (unos 50 s). Si llega a cero se van enojados y dejan 1 estrella.
- La calificación general es un promedio móvil de las reseñas y controla cuánta gente entra.
- Ganancias mientras no juegas: 22 % de la ganancia promedio por día, hasta 8 horas.
