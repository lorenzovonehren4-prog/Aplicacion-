# ÁPICE GP — Plan de desarrollo

Juego de monoplazas estilo Fórmula 1 en 3D para navegador. Este documento es la
guía técnica del proyecto: arquitectura, decisiones, formato de datos y tareas de
cada fase. Se actualiza al cerrar cada fase (sección **Estado**, al final).

> **Nombre**: *ÁPICE GP*. El ápice es el punto interior de una curva por donde
> pasa la trazada ideal: une el nombre con la idea central del juego (la línea de
> trazada y las ayudas). Todos los equipos, pilotos, patrocinadores, marcas de
> neumáticos y logos del juego son **ficticios**. Los circuitos usan su nombre
> geográfico (Albert Park, Monza) sin logos ni marcas oficiales.

---

## 1. Objetivos de calidad

1. **Sensación de juego premium**: manejo sólido y predecible, controles que
   responden al instante, 60 FPS estables, sonido que acompaña cada acción y
   animaciones de interfaz cuidadas.
2. **Sin atajos**: nada de `TODO`, funciones vacías ni pantallas "de relleno".
   Lo que no está en la fase actual se anota aquí y no aparece en el juego como
   si funcionara (los accesos futuros se muestran bloqueados con la fase en la
   que llegan).
3. **Cada fase se cierra** con: `tsc` sin errores, ESLint sin avisos, pruebas
   unitarias en verde, build de producción sin avisos y una prueba en Chromium
   real (sin errores en consola) con capturas revisadas.

---

## 2. Stack y herramientas

| Pieza | Elección | Motivo |
|---|---|---|
| Build | **Vite 8** | Arranque instantáneo, HMR, build con Rolldown. |
| Lenguaje | **TypeScript 6.0** (`strict`, `noUncheckedIndexedAccess`) | Máxima seguridad de tipos. Se usa la 6.0 (no la 7) porque `typescript-eslint` aún no soporta la 7. |
| 3D | **Three.js r186** | Render WebGL 2, PBR, `EffectComposer`. |
| Animación UI | **GSAP 3** | Líneas de tiempo, stagger, easing de calidad. |
| Audio | **Web Audio API** | Motor sintetizado, audio 3D con `PannerNode`. Sin archivos de audio: todo se genera. |
| Guardado | **IndexedDB** → `localStorage` → memoria | Cadena de respaldo automática. |
| Tipografías | **Titillium Web** (texto) y **Orbitron** (números, HUD) vía `@fontsource` | Son las de Google Fonts, pero empaquetadas: el juego funciona sin internet. |
| Pruebas | **Vitest** (lógica) + **Playwright** (`playwright-core`, prueba de humo en Chromium) | La lógica se prueba sin navegador; el flujo completo, en uno real. |
| Calidad | **ESLint 10** + `typescript-eslint` con reglas que usan tipos | Detecta promesas sin esperar (clave en transiciones y guardado). |

### Comandos

```bash
cd formula-3d
npm install
npm run dev        # desarrollo en http://localhost:5173
npm run build      # typecheck + build de producción en dist/
npm run preview    # sirve dist/ en http://localhost:4173
npm run check      # typecheck + lint + pruebas + build (lo que se corre al cerrar fase)
npm test           # sólo pruebas unitarias
npm run smoke      # prueba de humo en Chromium (requiere build y un Chromium; ver e2e/smoke.mjs)
```

---

## 3. Estructura de carpetas

Entre corchetes, la fase en la que aparece cada archivo. Las carpetas se crean
cuando tienen contenido real.

```
formula-3d/
├── index.html                    [1] contenedor: canvas + capa de UI + capa de overlays
├── PLAN.md                       [1] este documento
├── public/favicon.svg            [1]
├── e2e/smoke.mjs                 [1] prueba de humo en Chromium real (con capturas)
├── tests/                        [1] pruebas unitarias (Vitest)
└── src/
    ├── main.ts                   [1] arranque: fuentes, estilos, Game.boot, registro de pantallas
    ├── styles/                   [1] tokens (colores, tipografía), base, componentes, pantallas
    ├── core/                     game loop, máquina de estados, guardado, eventos
    │   ├── Game.ts               [1] raíz de composición: crea y conecta todos los servicios
    │   ├── GameLoop.ts           [1] rAF + paso fijo de simulación (120 Hz) + límite de FPS
    │   ├── EventBus.ts           [1] emisor de eventos tipado
    │   ├── events.ts             [1] catálogo de eventos del juego
    │   ├── screens/              [1] máquina de estados de pantallas (pila + transiciones)
    │   ├── save/                 [1] almacenamiento, esquema, saneo, migraciones
    │   ├── input/                [1] teclado + gamepad (UI) · [2] acciones de manejo · [8] reasignación
    │   ├── render/               [1] renderer compartido, calidad, postprocesado, entorno
    │   └── utils/                [1] matemáticas, Disposer, formato · [2] aleatorio con semilla, tiempos
    ├── race/                     física, IA, cámaras, sesión y reglas de carrera
    │   ├── physics/              [2] CarSpec (datos y modelo de rendimiento), Gearbox, Vehicle · [4] colisiones auto-auto
    │   ├── input/DrivingInput.ts [2] teclado con rampas + gamepad (gatillos, stick con zona muerta)
    │   ├── camera/RaceCamera.ts  [2] cockpit, T-cam, persecución, fundido, cabeza por G, sacudidas
    │   ├── render/               [2] CarRig (física → modelo, interpolación) y volante con LEDs y pantalla
    │   ├── audio/RaceAudio.ts    [2] motor en tiempo real + derrape, pianos, grava, viento, cambios, choques
    │   ├── session/LapTimer.ts   [2] vueltas, sectores, delta en vivo, validez · [3] largada detenida y bandera
    │   ├── session/StartLights.ts [3] semáforo de 5 luces con pausa aleatoria
    │   ├── Session.ts            [2] práctica libre · [3] carrera a N vueltas: ayudas, semáforo, bandera, enfriamiento
    │   ├── RaceWorld.ts          [2] escena 3D de la sesión (circuito + auto + cámaras) · [3] trazada y semáforo del pórtico
    │   ├── ai/LineFollower.ts    [3] sigue una línea con un perfil de velocidad (enfriamiento, pruebas; base de los bots)
    │   ├── ai/                   [4] bots: adelantar, defender, errores
    │   └── fx/                   [9] chispas, humo, calor, bandera a cuadros
    ├── tracks/                   datos y generación de circuitos
    │   ├── TrackDefinition.ts    [2] formato de datos de un circuito (tramos rectos y curvas "de tortuga")
    │   ├── layout.ts             [2] trazado de los tramos y cierre de la vuelta
    │   ├── TrackGeometry.ts      [2] spline → muestras, curvatura, sistema de coordenadas de pista
    │   ├── TrackAnalysis.ts      [2] perfil de velocidad, curvas, frenadas, ápices, tiempo teórico
    │   ├── Trackside.ts          [2] pianos, escapatorias y muros por muestra (lo comparten física y mallas)
    │   ├── Track.ts              [2] circuito listo: geometría + análisis + entorno, meta, sectores, DRS, parrilla
    │   ├── TrackBuilder.ts       [2] arma la escena por etapas con progreso real
    │   ├── build/                [2] texturas, cintas, superficies, muros, escenario, cielo
    │   ├── RacingLine.ts         [3] trazada ideal (curvatura mínima), su perfil y sus colores fijos
    │   ├── data/australia.ts     [2]
    │   ├── data/monza.ts         [5]
    │   └── registry.ts           [2] catálogo de circuitos (agregar uno = agregar un archivo)
    ├── garage/                   personalización y materiales
    │   ├── CarModel.ts           [1] monoplaza procedural (se usa en menú, garaje, carrera y podio)
    │   ├── Loft.ts               [1] superficies paramétricas (carrocería) y calcomanías que se adaptan
    │   ├── carTextures.ts        [1] texturas procedurales: livery, carbono, neumático, casco
    │   ├── StudioScene.ts        [1] estudio con plataforma, luces y piso reflectante (menú y garaje)
    │   ├── catalog.ts            [7] ítems: pinturas, materiales, llantas, alerones, cascos
    │   └── GarageScreen.ts       [7]
    ├── progression/              XP, niveles, pase, recompensas
    │   ├── levels.ts             [1] curva de XP de niveles 1–100 (la usa la tarjeta del piloto)
    │   ├── xp.ts                 [6] cálculo de XP por carrera
    │   ├── seasonPass.ts         [6] 50 niveles y recompensas
    │   └── unlocks.ts            [6] reglas de desbloqueo
    ├── assists/                  [3] niveles y XP (presets), ayuda de frenado, malla y shader de la trazada
    ├── ui/
    │   ├── dom.ts                [1] creación de elementos tipada (`h`)
    │   ├── nav/FocusNavigator.ts [1] navegación espacial con teclado/gamepad + ratón
    │   ├── anim/                 [1] barrido diagonal, stagger, contadores
    │   ├── components/           [1] botón de menú, slider, selector, pestañas, tarjeta de piloto, FPS · [3] tarjetas de ayudas
    │   ├── race/                 [2] HUD (tiempos, minimapa, tablero), carga, pausa · [3] semáforo, radio, fin de carrera
    │   └── screens/              [1] Splash, Menú principal, Ajustes · [2] Carrera · [3..8] el resto
    ├── audio/
    │   ├── AudioManager.ts       [1] contexto, buses y volúmenes
    │   ├── EngineSynth.ts        [1] motor sintetizado (rev del splash) · [2] modo en tiempo real
    │   ├── UiSounds.ts           [1] sonidos de interfaz sintetizados
    │   ├── SpatialEngines.ts     [4] motores de bots con PannerNode
    │   └── MenuMusic.ts          [8] música generativa
    └── data/
        ├── game.ts               [1] nombre, versión, textos del menú
        ├── teams.ts              [4] equipos y pilotos ficticios
        ├── radio.ts              [3] frases del ingeniero (radio del equipo)
        └── tips.ts               [2] consejos de las pantallas de carga
```

---

## 4. Arquitectura general

### 4.1 Raíz de composición (`core/Game.ts`)

`Game.boot()` crea, en orden: `EventBus` → `SaveManager` (carga el guardado) →
`AudioManager` → `InputManager` → `RenderHost` (WebGL 2) → `ScreenManager` →
`GameLoop`. Las pantallas reciben el `Game` y acceden a los servicios desde ahí;
ningún módulo usa variables globales.

Cada fotograma: `input.update()` → `screens.update(dt)` (todas las pantallas de la
pila; la de arriba recibe la entrada) → `render.render()`.

Si el navegador no soporta WebGL 2 se muestra una pantalla de error clara en vez
de fallar en silencio.

### 4.2 Máquina de estados de pantallas (`core/screens/`)

Pila de pantallas con tres operaciones:

- `goTo(id, params)`: reemplaza toda la pila. Usa la transición de **barrido
  diagonal** (cubrir → salir de las pantallas viejas → entrar a la nueva, que
  puede cargar recursos mientras está cubierta → destapar → animación de entrada).
- `push(id, params)`: apila una pantalla encima (Ajustes sobre el menú o sobre la
  pausa; Manual de ayudas sobre la selección de carrera). La de abajo queda viva
  (recibe `onCovered`/`onUncovered`); así la carrera pausada no se destruye.
- `pop()`: vuelve a la anterior.

Las transiciones válidas están en una tabla (`flow.ts`) y se validan en cada
cambio (una transición no prevista es un error y se ignora). Si llega un cambio
mientras otro está en curso, se encola (sólo el último cuenta).

```
Splash ──► Tutorial (sólo la 1.ª vez) ──► Menú principal
Splash ──────────────────────────────────► Menú principal
Menú ──► Garaje | Pase | Perfil | Ajustes | Manual de ayudas | Selección de carrera
Garaje | Pase | Perfil ──► Menú
Ajustes ──► Manual de ayudas          Manual ──► (vuelve a quien lo abrió)
Selección de carrera ──► Presentación del circuito ──► Carrera
Carrera ──► Resultados ──► Podio ──► Menú (o siguiente carrera del campeonato)
Carrera ──► Carrera (reiniciar) | Menú (salir) | Ajustes (desde pausa, apilada)
```

Ciclo de vida de una pantalla (`Screen`): `enter(params)` (construye DOM y 3D,
puede ser asíncrono) → `reveal()` (animaciones de entrada) → `update(dt)` →
`onAction(acción)` → `exit()` (libera todo: listeners, tweens, geometrías,
texturas). Cada pantalla usa un `Disposer` para no dejar fugas.

### 4.3 Game loop (`core/GameLoop.ts`)

- `requestAnimationFrame` con `dt` acotado a 100 ms (al volver de otra pestaña no
  hay saltos).
- **Paso fijo de simulación a 120 Hz** con acumulador (máx. 8 pasos por
  fotograma): la física es determinista e independiente de los FPS. El render
  interpola entre el estado anterior y el actual (`alpha`), así se ve fluido a
  30, 60 o 144 Hz.
- **FPS objetivo** (30 / 60 / máximo del monitor): se saltan fotogramas de rAF
  cuando no toca dibujar.
- Medidor de FPS opcional (Ajustes → Mostrar FPS).

### 4.4 Render (`core/render/`)

- Un único `WebGLRenderer` para todo el juego (crear y destruir contextos es caro
  y los navegadores limitan cuántos hay). Cada pantalla 3D tiene su `Scene` y su
  cámara y se las entrega al `RenderHost` (`setView`).
- Espacio de color sRGB, tone mapping **ACES Filmic**, luces físicas.
- Siempre se dibuja a través de `EffectComposer`: `RenderPass` (con MSAA en el
  render target) → pases de efectos → `OutputPass` (tone mapping + sRGB). Así el
  antialiasing y el color son iguales con y sin postprocesado, y la calidad puede
  cambiarse en caliente sin recrear el contexto WebGL.
- Efectos: **bloom** [1], **motion blur** de cámara y **zoom de FOV** [9],
  **distorsión de calor** [9], viñeta y aberración sutil en DRS/rebufo [9].

#### Niveles de calidad

| | Baja | Media | Alta | Ultra |
|---|---|---|---|---|
| Densidad de píxeles máx. | 1.0 | 1.25 | 1.5 | 2.0 |
| MSAA | no | 2× | 4× | 4× |
| Sombras (por defecto) | no | bajas (1024) | altas (2048) | altas (4096) |
| Postprocesado (por defecto) | no | sí | sí | sí |
| Reflejos del piso del estudio | no | ½ resolución | ½ resolución | completa |
| Multiplicador de partículas | 0.3 | 0.6 | 1.0 | 1.3 |
| Densidad de árboles / público | 0.35 | 0.6 | 1.0 | 1.2 |

Elegir un nivel ajusta todo; después sombras, postprocesado, resolución y FPS
objetivo se pueden cambiar sueltos. La calidad inicial se detecta: equipos con
≤ 4 núcleos o móviles empiezan en **Media**; el resto en **Alta**.

### 4.5 Interfaz (`ui/`)

- DOM + CSS sobre el canvas (texto nítido, accesible y fácil de animar). Nada de
  frameworks: una función `h()` tipada crea elementos.
- **Paleta**: fondo casi negro (`#07080b`), paneles grafito translúcidos, acento
  rojo (`#ff2a3c`), blanco y grises fríos. Formas en paralelogramo (inclinación
  de −12°) como en las transmisiones deportivas.
- **Tipografías**: Titillium Web (texto, 400–900), Orbitron (números y HUD).
- **Navegación**: `FocusNavigator` hace navegación espacial (elige el elemento más
  cercano en la dirección pulsada), con teclado, gamepad y ratón sincronizados
  (pasar el ratón mueve el foco). Las ayudas de controles del pie de pantalla se
  adaptan al último dispositivo usado (teclado o gamepad).
- **Animaciones** (GSAP): barrido diagonal con desenfoque entre pantallas,
  entradas escalonadas con rebote suave, botones con brillo que recorre el borde
  (`@property` + gradiente cónico), contadores que suben, sonido en hover/selección.
- Todas las animaciones respetan `prefers-reduced-motion` (se acortan).

### 4.6 Guardado (`core/save/`)

- `KeyValueStorage` con tres implementaciones: **IndexedDB** (principal),
  **localStorage** (respaldo) y **memoria** (si ambos están bloqueados, por
  ejemplo en navegación privada estricta; se avisa que no se guardará).
- `SaveManager`: carga → migra → **sanea** (cada campo se valida; lo inválido
  vuelve a su valor por defecto, así un guardado corrupto nunca rompe el juego)
  → expone `data` de sólo lectura → `update(fn)` modifica, avisa por eventos y
  programa una escritura (agrupada, 400 ms). Al ocultar la pestaña se fuerza la
  escritura.
- **Versionado**: `version` en el guardado + migraciones secuenciales `n → n+1`.
  Agregar campos nuevos **no** necesita migración: el saneo completa con valores
  por defecto. Renombrar o cambiar el significado de un campo sí.
- Datos grandes (fantasmas de contrarreloj) van en claves aparte
  (`ghost:<circuito>`), no dentro del guardado principal.

Esquema (se amplía en cada fase; en negrita lo que existe desde la Fase 1):

```ts
SaveData {
  **version, createdAt, updatedAt**
  **profile { name, avatarId, titleId, tutorialDone, experience }**
  **progression { level, xp }**   · [6] seasonPass { tier, xp, claimed[] }
  **settings {**
    **graphics { quality, shadows, postprocessing, fpsTarget, resolutionScale, showFps }**
    **audio { master, engine, ui }**   · [2] effects · [8] music
    [2] controls { steeringSensitivity, gamepad } · [8] keyBindings
    [3] assists { preset, custom { braking, traction, abs, line, lineMode } }
    [2] game { defaultCamera } · [3] units · [8] language
  **}**
  [5] records { [trackId]: { bestLap, bestSectors } } · championship en curso
  [6] stats { races, wins, podiums, poles, fastestLaps, ... }
  [7] garage { unlocked[], equipped { livery, material, wheels, wings, helmet } }
  [8] trophies[]
}
```

### 4.7 Entrada (`core/input/`)

- Fase 1: acciones de UI (`up/down/left/right/confirm/back/tabPrev/tabNext`)
  desde teclado (flechas, WASD, Enter/Espacio, Esc/Retroceso, Q/E) y gamepad
  (cruceta, stick izquierdo con zona muerta y repetición al mantener, A/B, LB/RB).
- Fase 2: acciones de manejo con valores analógicos (acelerador, freno,
  dirección) y digitales (DRS, cámara, pausa). Teclado con **suavizado**
  (rampas de subida/bajada distintas; la dirección vuelve al centro más rápido
  de lo que gira) y gamepad con zona muerta y curva de respuesta.
- Fase 8: reasignación de teclas y botones desde Ajustes.

### 4.8 Audio (`audio/`)

Grafo: fuentes → buses (`engine`, `effects`, `music`, `ui`) → `master` →
compresor (evita saturación) → salida. Los volúmenes usan curva perceptual
(cuadrática) y cambian con rampas suaves. El `AudioContext` se crea en el primer
gesto del usuario (requisito de los navegadores): por eso el splash pide
"pulsa cualquier tecla" y en ese momento suena el motor.

**Motor sintetizado** (`EngineSynth`): V6 turbo de 4 tiempos → frecuencia de
encendido = rpm/60 × 3. Mezcla de sierra (fundamental), cuadrada a media
frecuencia (cuerpo), sierra al doble (aspereza), ruido filtrado (admisión),
modulación de amplitud a la frecuencia de encendido (pulsos de combustión) →
distorsión `tanh` según acelerador → pasa-bajos que abre con las rpm. Cambio de
marcha = caída rápida de rpm con constante de tiempo corta (se oye el "corte").
Bots [4]: versión liviana por auto con `PannerNode` (HRTF en Alta/Ultra,
`equalpower` en Baja/Media) y efecto Doppler aproximado cambiando la frecuencia
según la velocidad relativa.

---

## 5. Diseño de sistemas (fases 2 a 9)

### 5.1 Circuitos (`tracks/`)

**Formato de datos** (`TrackDefinition`): un archivo por circuito.

```ts
{
  id, name, country, flag, lengthKm, lapRecord,            // ficha para la presentación
  controlPoints: [x, z, y?][],   // trazado aproximado al real, en metros, sentido de carrera
  width, widthOverrides?: { from, to, width }[],
  startFinish: s,  pitLane: { entry, exit, side },         // s = distancia sobre la línea central
  drsZones: { detection, start, end }[],
  runoff: { from, to, side, type: 'grass' | 'gravel' | 'asphalt' }[],
  scenery: { trees, grandstands[], lake?, buildings? },    // qué se genera alrededor
  lighting: { sun, sky, fog, exposure } por clima (soleado / nublado / atardecer),
}
```

**Geometría**: `CatmullRomCurve3` cerrada (centrípeta, sin bucles) → muestreo
cada 1 m → posición, tangente, normal lateral, distancia acumulada y curvatura
suavizada. Todo auto guarda su **coordenada de pista** `(s, d)` (distancia
recorrida y desplazamiento lateral), que se actualiza con búsqueda local sobre las
muestras (O(1) por paso). Con `(s, d)` se resuelven: superficie bajo cada rueda,
muros, vueltas, posiciones, IA y línea de trazada.

**Análisis de curvas** (automático, no a mano): zonas con |curvatura| sobre un
umbral = curvas. Ápice = máxima curvatura. Velocidad segura por equilibrio de
fuerzas con carga aerodinámica: `v² κ = μ (g + k v²)` → `v = √(μg / (κ − μk))`
(si `κ ≤ μk` la curva va a fondo). Perfil de velocidad con pasada hacia adelante
(aceleración) y hacia atrás (frenada): donde la pasada hacia atrás limita, ahí
está el **punto de frenada**.

**Trazada ideal**: optimización de mínima curvatura por relajación (cada punto se
desplaza hacia el promedio de sus vecinos, acotado al ancho de pista menos un
margen), luego se recalcula el perfil de velocidad sobre esa línea.

**Mallas** (generadas desde la spline, sin modelos externos): asfalto con
textura procedural (grano + manchas de goma en la trazada + variación de tono),
pianos rojo/blanco en el exterior e interior de curvas, líneas blancas de borde,
grava y pasto según `runoff`, muros (hormigón, guardarraíl, barreras de
neumáticos), gradas con público instanciado, árboles con `InstancedMesh`
(varias especies), pórtico de meta con semáforo, parrilla pintada y zona de pits.
Minimapa dibujado en canvas 2D desde la spline.

**Agregar un circuito** = crear `tracks/data/<id>.ts` y sumarlo al registro.
Nada más cambia.

### 5.2 Física (`race/physics/`) — arcade-simulación

- **Modelo de bicicleta** (eje delantero y trasero) en 2D sobre el plano de la
  pista + altura de la superficie. Estado: posición, rumbo, velocidad en ejes
  locales, velocidad de guiñada, rpm, marcha.
- **Neumáticos**: fuerza lateral con curva de saturación tipo Pacejka
  simplificada `F = D·sin(C·atan(B·α))`; círculo de fricción que combina
  frenada/aceleración con giro. Agarre `μ` por superficie: asfalto 1.0, piano
  0.9 (+ vibración), pasto 0.45, grava 0.35 (+ arrastre fuerte).
- **Carga aerodinámica**: `Fz = m·g + ½ρ·Cl·A·v²` → más agarre a más velocidad.
  Arrastre `½ρ·Cd·A·v²`; el **DRS** baja `Cd` y `Cl` del alerón trasero.
- **Rebufo**: si hay un auto delante dentro de un cono (≤ 40 m, ≤ 2,5 m de
  desplazamiento lateral), el arrastre baja hasta un 25 % según la distancia.
- **Motor y caja**: curva de par con pico cerca de 11 000 rpm, corte a 12 500;
  **8 marchas automáticas siempre** (sube cerca del corte, baja cuando las rpm
  caen por debajo de un umbral dependiente de la marcha, con 60 ms de corte de
  potencia en cada cambio y caída de rpm audible).
- **Dirección**: ángulo máximo que baja con la velocidad, suavizado, y un
  amortiguador de guiñada para que el auto sea estable y predecible.
- **Curvas rápidas** (ajuste de la Fase 7, a pedido del usuario: con la flecha
  mantenida el auto hacía trompo desde ~240 km/h):
  - *Limitador de agarre*: sobre ~45 km/h las ruedas no giran más allá del
    pico de deriva respecto de la dirección real del eje delantero (lo que
    haría un piloto; con teclado no se puede dosificar). Deja contravolantear.
  - El *control de estabilidad* (ayuda de Principiante) mira sólo la deriva
    trasera; antes la comparaba con la delantera y con el volante a fondo
    nunca se activaba.
  - Balance aerodinámico 42 % adelante (era 44 %): a alta velocidad la cola
    tiene más carga que la trompa, como en un F1 real.
  - Medido con la flecha mantenida 3 s (`tests/physics.test.ts`): sin
    trompos a 180, 240 ni 290 km/h; deriva máxima ≈ 12° sin ayudas y ≈ 8°
    con estabilidad; más de 4 g laterales a 290 km/h.
- **Colisiones** [4]: autos como cápsulas orientadas (dos círculos) → impulso con
  restitución baja y fricción; muros por coordenada de pista (`|d| > límite`) →
  rebote que conserva parte de la velocidad tangencial + sacudida de cámara.
- **Ajuste fino**: parámetros en un objeto de tuning; la Fase 2 incluye tiempo
  dedicado a probar y ajustar hasta que manejar sea divertido. Valores objetivo:
  0–100 km/h ≈ 2,6 s, punta ≈ 330 km/h (345 con DRS), frenada de 300 a 80 km/h
  en ≈ 110 m.

### 5.3 Cámaras (`race/camera/`)

- **Cockpit** (por defecto): en el casco. Se ven volante (con luces de RPM),
  halo y morro. Inclinación de cabeza por fuerzas G (lateral y longitudinal, con
  resorte amortiguado) y vibración que crece con la velocidad y en pianos.
- **T-cam**: sobre la toma de aire, algo más atrás y arriba.
- **Persecución**: exterior, con retardo elástico de posición y rumbo.
- Tecla **C** / botón **Y** cambia; transición suave (interpolación de posición,
  rotación y FOV durante 0,35 s). Zoom de FOV con DRS y rebufo [9].

### 5.4 Ayudas (`assists/`)

| Nivel | Frenado | Tracción | ABS | Línea | Tipo | XP |
|---|---|---|---|---|---|---|
| Principiante | Completa | Completo | Sí | Completa | Dinámica | ×1.0 |
| Intermedio | Media | No | Sí | Completa | Dinámica | ×1.25 |
| Avanzado | Baja | No | Sí | Sólo curvas | Dinámica | ×1.5 |
| Personalizado | Off/Baja/Media/Completa | Off/Medio/Completo | On/Off | Off/Curvas/Completa | Fija/Dinámica | calculado |

- **Ayuda de frenado**: compara tu velocidad con un perfil de referencia un
  poco más adelante (tiempo de reacción). Los perfiles ya incluyen las curvas
  de frenada, así que "velocidad del perfil aquí" = la máxima con la que
  todavía se llega a la próxima curva. Hay dos referencias: la del centro de la
  pista (prudente) y la de la trazada ideal (bastante más rápida: con 14 m de
  ancho la línea abre mucho las curvas). Completa usa el centro, anticipa
  0,3 s y además levanta el acelerador; Media mezcla ambas, anticipa 0,15 s y
  frena hasta 50 %; Baja usa la ideal sin anticipación (sólo cuando ya no se
  llega ni frenando a fondo) y frena hasta 25 %. Prueba: con Completa, un
  piloto que nunca suelta el acelerador da la vuelta sin salirse.
- **Dirección asistida** (sólo Principiante): volante más suave (teclado ×0,8,
  stick más filtrado) y **control de estabilidad** en la física: si la cola
  desliza más que el tren delantero, un momento de guiñada la endereza (sin él,
  un sobreviraje a fondo en 3.ª termina en trompo de 80°; con él, 13°).
- **Control de tracción**: limita el acelerador cuando el deslizamiento de las
  ruedas traseras supera un umbral (Medio: umbral alto; Completo: sin patinar).
- **ABS**: limita la presión de freno por eje antes del bloqueo (sin ABS las
  ruedas se bloquean: humo, pérdida de dirección).
- **XP personalizado**: 1,0 + frenado (media 0,1 · baja 0,2 · off 0,3) +
  tracción (medio 0,07 · off 0,15) + sin ABS 0,05 + línea (curvas 0,1 · off
  0,2) + dinámica 0,05, tope ×1,6. Los pesos hacen que armar a mano un nivel
  predefinido dé su mismo multiplicador (Intermedio = 1,25; Avanzado = 1,5).
- **Cambiar una ayuda a mano** (Ajustes → Ayudas) pasa a Personalizado
  partiendo de los valores del nivel que estaba elegido. Se aplica en caliente,
  incluso con la carrera en pausa.
- **Línea de trazada**: cinta sobre el asfalto siguiendo la trazada ideal
  (`BufferGeometry` con color por vértice + shader propio: brillo suave,
  transparencia, bordes difuminados y chevrones animados). Fija = color por
  tramo desde el perfil (verde acelerar / amarillo levantar / rojo frenar).
  Dinámica = cada fotograma, para los 480 m de adelante, el punto donde
  habría que empezar a frenar (reacción + frenada tranquila hasta el límite
  de agarre de cada curva) y cuántos segundos faltan para llegar a él: verde
  ≥ 1,6 s, amarillo 0,7 s, rojo al llegar ("frena ya", todavía da tiempo);
  cada punto muestra lo peor que tiene adelante, con transición suave (v1.5).
- **Trazada ideal** (`tracks/RacingLine.ts`): desplazamiento lateral d(s) que
  minimiza la suma de segundas diferencias al cuadrado (≈ curvatura²) con
  descenso por coordenadas, de grueso a fino (puntos cada 32 → 16 → 8 → 4 m),
  dentro de los bordes y usando parte de los pianos. Se calcula en ~60 ms al
  cargar el circuito.
  "Sólo curvas" oculta la cinta en rectas con un desvanecido en los extremos.
- HUD: íconos de ayudas activas que se iluminan cuando actúan.

### 5.5 Bots (`race/ai/`)

Implementado en la Fase 4 (`race/ai/BotDriver.ts`, `race/ai/difficulty.ts`).

- Cada bot maneja un `Vehicle` con la **misma física** que el jugador (con
  control de tracción, ABS y algo de estabilidad de fábrica).
- Siguen la trazada ideal con un **carril** propio (desplazamiento lateral
  respecto de la trazada) que cambia a 2,2 m/s: para adelantar (lado libre;
  si caben los dos, el interior de la próxima curva), para defender (un solo
  movimiento, sólo en recta y fuera de las frenadas) y para no cerrarse sobre
  un auto que tienen al lado (límites laterales con su movimiento previsto).
- **Frenadas planificadas**: la velocidad objetivo es la menor que exige
  cualquier punto de adelante contando lo que se puede frenar hasta él
  (`√(v_ref² + 2·a·d)` con la frenada disponible a esa velocidad × dificultad).
- **Tráfico**: si el de adelante tapa el camino (ahora o según su movimiento
  lateral) y no se lo puede pasar, lo siguen a `1,5 m + v·(0,3 − 0,14·agresividad)`
  con una frenada prudente (el de adelante puede frenar más fuerte). Por fuera
  de una curva y a la par, ceden. Nadie cede a un auto casi detenido (evita
  que dos se queden esperándose).
- **Control del auto**: freno progresivo que se reduce al doblar, pie fuera del
  acelerador y contravolanteo (persecución medida sobre la dirección de la
  marcha) sólo cuando el auto desliza de verdad (> ~7°).
- **Primera vuelta prudente** (30 s): frenadas más largas y sin maniobras al
  frenar. Reacción a la largada por piloto (0,2–0,45 s).
- **Errores**: al llegar a una frenada, con probabilidad `errores por vuelta /
  frenadas por vuelta`, frenan más tarde durante 2,2 s (se pasan y abren).
- **Atascos**: detenido 5 s → vuelve a la trazada 10 m atrás como **fantasma**
  3,5 s (no choca, parpadea). El jugador también es fantasma al usar R.
- **Dificultad** (0–100; Novato 8, Amateur 38, Profesional 68, Leyenda 95,
  Personalizada = control deslizante) → ritmo en curva 0,77–0,955 de la
  trazada, tope del acelerador 0,86–1, frenada 0,62–0,92, agresividad y
  0,45–0,03 errores por vuelta; el talento del piloto mueve el ritmo ±1,5 %.
  Vueltas medidas en Albert Park: Novato ≈ 89–93 s, Amateur ≈ 83–87 s,
  Profesional ≈ 78–81 s, Leyenda ≈ 75–77 s (la trazada teórica da 70 s).
- Parrilla de 10 a 20 autos (Ajustes → Juego → Rivales; 12 por defecto),
  ordenada por ritmo con el jugador en la mitad. 10 equipos y 19 pilotos
  **ficticios** en `data/teams.ts`.
- **Choques entre autos** (`race/physics/CarCollisions.ts`): cada auto son tres
  círculos a lo largo del eje; separación a medias e impulso en el punto de
  contacto (rebote 0,15, fricción 0,3, giro limitado).
- **Rebufo**: detrás de otro auto (hasta 45 m, desalineado < 1,7 m, a más de
  ~160 km/h) baja el arrastre hasta 25 %, suavizado.
- Simulación de prueba (12 autos, 3 vueltas): 1 toque en Novato, ~15 en
  Amateur/Profesional, todos terminan; 0,08 ms por paso de física con 12 autos.

### 5.6 Reglas y modos (`race/rules/`)

- Semáforo de 5 luces (una por segundo, sonido en cada una), pausa aleatoria de
  0,5–2,5 s, "¡APAGADAS!". En la parrilla el embrague automático retiene el
  auto: el acelerador sólo sube las vueltas del motor y se larga al apagarse
  las luces. Por eso no hay salidas anticipadas (decisión de la Fase 3: con
  caja y embrague automáticos no hay un gesto del jugador que las provoque).
- En carrera el DRS se habilita desde la vuelta 2 (como en la realidad) y con
  rivales hace falta pasar el **punto de detección a menos de 1 s** del auto de
  adelante (el HUD lo marca con el DRS punteado y un aviso); se pierde al salir
  de la zona. En práctica, en cualquier zona. La largada detenida cuenta el tiempo desde las
  luces; cruzar la línea desde la parrilla no abre otra vuelta.
- Vueltas, tiempo por vuelta y por sector, mejor vuelta, delta en vivo contra tu
  mejor vuelta (verde/rojo), posiciones por `vueltas × longitud + s`, gaps.
- Fin: el líder cruza la meta en la última vuelta → bandera a cuadros → el resto
  termina al cruzar la línea (los doblados, con menos vueltas).
  `race/session/RaceOrder.ts`: progreso continuo por auto, intervalos por hora
  de paso en puntos cada 25 m (como la TV), vuelta rápida de la carrera.
- **Carrera rápida**: circuito, vueltas (3/5/10), dificultad, rivales (9–19),
  ayudas, clima (soleado / nublado / atardecer).
- **Contrarreloj**: sin rivales; fantasma de tu mejor vuelta (posición y rumbo a
  20 Hz en `Float32`, unos 30 KB por vuelta en base64) guardado por circuito.
- **Campeonato**: calendario de circuitos, puntos 25-18-15-12-10-8-6-4-2-1,
  tabla de pilotos entre carreras; se puede continuar otro día.

### 5.7 Progresión (`progression/`)

- **XP por carrera** = (base por posición + 50 por adelantamiento + 150 por
  vuelta rápida + 200 por carrera limpia) × multiplicador de dificultad
  (×0.8 Novato … ×1.5 Leyenda) × multiplicador de ayudas.
- **Niveles 1–100**: XP para pasar del nivel `n` al `n+1` =
  `600 + 120 · (n − 1)^1.15`, redondeado a múltiplos de 50 (600 en el nivel 1,
  2 100 en el 10, 11 150 en el 50, 24 000 en el 99; ≈ 1,14 M en total). Con
  ~1 500 XP por carrera, el nivel 10 llega en unas 8 carreras y el 100 es una meta
  de largo plazo. Implementado en `progression/levels.ts` desde la Fase 1.
- **Pase de temporada**: 50 niveles, 1 000 XP por nivel del pase; cada nivel da
  una recompensa (pinturas, materiales, llantas, alerones, cascos, avatares,
  títulos, celebraciones). Todo se gana jugando; no hay pagos.
- Rarezas: Común (gris), Raro (azul), Épico (violeta), Legendario (dorado).

### 5.8 Garaje (`garage/`)

- Mismo estudio del menú (plataforma que gira, luces de estudio, piso con
  reflejos) con la cámara enfocando la pieza que se edita.
- Livery en textura procedural (canvas) mapeada sobre la carrocería paramétrica:
  color primario/secundario/acento, patrones (franjas, degradado, chevrones,
  dividido, geométrico…), número.
- Materiales `MeshPhysicalMaterial`: brillante, mate, metálico, carbono visible,
  cromo, perlado (iridiscencia), con rareza y nivel requerido.
- Llantas, franja del neumático, alerones (formas distintas), casco (diseño y
  colores). Vista previa en tiempo real; ítems bloqueados con candado y nivel.

### 5.9 Efectos visuales (fase 9, algunos antes)

- Partículas sin crear objetos por fotograma (`race/render/Particles.ts`): cada
  sistema es un `Points` con búfer de capacidad fija (las vivas al principio;
  al morir una, la última ocupa su lugar) y se dibuja con una llamada. La
  capacidad se multiplica por la calidad (0,3 Baja … 1,3 Ultra).
- En pista (`race/render/TrackEffects.ts`): humo de neumáticos al derrapar,
  bloquear o patinar; tierra y pasto fuera de la pista; chispas del fondo
  plano a más de ~225 km/h y sobre los pianos; ráfaga de chispas y humo en
  los golpes contra muros y entre autos (`Session.takeContacts`). Los autos a
  más de 140 m de la cámara no emiten.
- Pasada de velocidad (`core/render/SpeedPass.ts`, entre el bloom y la salida):
  desenfoque radial desde el punto de fuga (8 muestras, el centro queda
  nítido) y aire caliente detrás de los escapes de los 4 autos más cercanos
  (ondas en pantalla alrededor de puntos proyectados; sólo en Alta y Ultra).
  Si no hay nada que hacer, la pasada se apaga; se compila al entrar a la
  pista. El FOV se abre hasta 5° con el DRS abierto o en el rebufo. Con
  "reducir movimiento" no hay desenfoque ni FOV; en Baja no hay posprocesado.
- Bandera a cuadros (`race/render/CheckeredFlag.ts`) sobre la meta que flamea
  con un sombreador de vértices (normales recalculadas) cuando el jugador
  termina, y cámara lenta de la llegada (`GameLoop.timeScale`: 30 % durante
  1,3 s y vuelta gradual).
- Podio (`podium/`): escalones que suben, festejos instanciados (confeti y
  serpentinas en `InstancedMesh`, champán y fuegos artificiales con el mismo
  sistema de puntos).

### 5.10 Rendimiento

- Presupuesto en calidad Media: ≤ 350 draw calls, ≤ 1,5 M triángulos, 60 FPS en
  una PC normal con gráfica integrada reciente. Medido en la parrilla con 12
  autos: Media 233 llamadas / 457 k triángulos; Baja 156 / 307 k.
- Sin asignaciones en el bucle caliente (vectores reutilizados).
- `InstancedMesh` para árboles, público, conos y partículas; mallas estáticas del
  circuito fusionadas por material. Árboles y público van **en celdas** (320 m y
  120 m) para que el recorte por cámara descarte lo que no se ve, y los árboles
  son low-poly con sombreado plano (Albert Park bajó de 2,2 M a 417 k triángulos).
- **Rivales** (`race/render/RivalFleet.ts`): el mismo modelo procedural con
  menos detalle (`CarModel.detail`), convertido en mallas instanciadas. Cerca
  (≤ 75 m, hasta 8 autos): carrocería, flap del DRS, números (atlas), neumáticos
  y tapas que giran — 5 llamadas para todos. Lejos: todo fusionado — 1 llamada.
  Colores del equipo por instancia con una textura máscara (rojo/verde/azul =
  principal/secundario/acento).
- Sombras: una luz direccional cuya cámara de sombras sigue al jugador.
- Todo se escala con el nivel de calidad (sección 4.4). La calidad inicial se
  elige por la GPU (`WEBGL_debug_renderer_info`): por software o móvil → Baja,
  dedicada o Apple M con ≥ 6 núcleos → Alta, el resto → Media.
- **Rendimiento automático** (Ajustes → Gráficos, activado por defecto,
  `core/render/PerformanceGovernor.ts`): en carrera mide los FPS; si no llegan
  al 82 % del objetivo baja la resolución (−15 % hasta 60 %) y después la
  calidad; si se cumplen 20 s seguidos sube la resolución de a 5 %, y si una
  subida vuelve a bajar los FPS no lo intenta más (no oscila).
- HUD sin `backdrop-filter` (obligaba a releer el canvas en cada cuadro); sólo
  la pausa difumina el fondo, y con la pausa la escena deja de redibujarse.
- Sin posprocesado ni MSAA se dibuja directo al canvas (sin el composer).
- Planos de cámara por modo (cockpit 0,08 m, T-cam 0,12 m, persecución 0,3 m;
  lejano 6 km): más precisión de profundidad, sin parpadeo a lo lejos.
- Pantalla del volante a 10 Hz como máximo (marcha y DRS al instante); la
  trazada se precompila en la carga aunque esté apagada.
- Torre de posiciones a 4 Hz y rivales del minimapa a 20 Hz (con `transform`).
- Fase 5, medido en Monza con 20 autos en calidad Media: ~250 llamadas y
  ~520 k triángulos; la simulación de los 20 autos cuesta ~0,3 ms por paso
  (0,6 ms por cuadro a 60 FPS). La física ya no crea objetos por paso (tabla
  de potencia, contorno y entradas de la caja reutilizados): de ~120 MB a
  ~34 MB de basura cada 10 s de carrera, menos pausas del recolector.
- En la carga se precompilan también los sombreadores de lo que arranca oculto
  (trazada apagada, fantasma, rivales lejanos): nada da un tirón al aparecer.
- El volante (13 llamadas y su pantalla) sólo se dibuja con la cámara cockpit.
- Piezas fijas armadas con varias mallas (el puente de Monza) se fusionan por
  material (`addMerged`): de 15 llamadas a 4.

---

## 6. Convenciones de código

- Identificadores en inglés (coinciden con la API de Three.js y del navegador);
  **comentarios y textos del juego en español**.
- Un módulo = una responsabilidad. Clases para servicios con estado; funciones
  puras para cálculos (fáciles de probar).
- Nada de `any`. Los datos externos (guardado) se sanean antes de usarse.
- Todo lo que se crea se libera: `Disposer` en cada pantalla (listeners, tweens,
  geometrías, materiales, texturas).
- Unidades: metros, segundos, radianes, km/h sólo para mostrar. Eje Y hacia arriba;
  el morro del auto apunta a **−Z** (igual que las cámaras de Three.js).

---

## 7. Fases

Cada fase termina con `npm run check` en verde + prueba de humo en Chromium +
revisión propia del código + resumen y espera de confirmación.

### Fase 1 — Estructura, estados, guardado y menú principal ✅

- [x] Proyecto Vite + TypeScript estricto + ESLint (reglas con tipos) + Vitest.
- [x] `PLAN.md` (este documento) y `README.md`.
- [x] `EventBus` tipado y catálogo de eventos (`core/events.ts`).
- [x] Máquina de estados de pantallas con pila (`goTo` / `push` / `pop`), tabla
      de transiciones validada, cola de cambios, pantalla de rescate si una
      falla al entrar y tope de espera para animaciones (nunca se traba).
- [x] Game loop con paso fijo de 120 Hz, límite de FPS (30 / 60 / máximo) y
      medidor de FPS.
- [x] Guardado: IndexedDB → localStorage → memoria, esquema versionado,
      migraciones, saneo campo por campo, escritura agrupada y al ocultar la
      pestaña.
- [x] Entrada de UI con teclado, ratón y gamepad; navegación espacial con
      vuelta al extremo y scroll automático en listas.
- [x] Renderer compartido con niveles de calidad y postprocesado (MSAA + bloom).
- [x] Monoplaza procedural: carrocería paramétrica (loft), pontones, toma de
      aire, alerones con perfiles NACA y DRS móvil, halo, suspensión, espejos,
      difusor, ruedas con flanco de marca ficticia y tapas, casco con visera,
      livery con número y logos; ≈ 15 draw calls para la carrocería.
- [x] Estudio 3D: plataforma con aro luminoso, entorno de softboxes para los
      reflejos de la pintura, luces de estudio, piso con reflejo desenfocado,
      sombras suaves y de contacto, tiras de luz con bloom.
- [x] Audio: buses y volúmenes con curva perceptual, sonidos de interfaz
      sintetizados, motor V6 sintetizado (acelerón del splash con cambios).
- [x] Splash: línea de luz, destello, logo con desenfoque, "pulsa cualquier
      tecla", motor acelerando.
- [x] Menú principal: auto 3D con cámara que gira y paralaje con el ratón,
      entrada escalonada con rebote, botones con relleno, brillo que recorre el
      borde y sonido, tarjeta del piloto con nivel y XP que cuentan,
      descripción del acceso enfocado, ayudas de controles según el dispositivo.
- [x] Ajustes (parcial): Gráficos y Sonido, aplicados y guardados al instante.
- [x] Transición de barrido diagonal con desenfoque y sonido.
- [x] Accesibilidad: `prefers-reduced-motion` acorta todas las animaciones.
- [x] 53 pruebas unitarias + prueba de humo en Chromium (flujo completo,
      persistencia tras recargar y respaldo en localStorage).

### Fase 2 — Australia, auto y cámaras ✅

- [x] Formato `TrackDefinition` (tramos rectos y curvas con radio y ángulo) y
      registro de circuitos; el trazado se cierra solo y se escala a la
      longitud real.
- [x] Albert Park por spline (5,278 km, 14 curvas): asfalto con textura y
      relieve, líneas de borde, parrilla y meta a cuadros, pianos elevados,
      grava y escapatorias asfaltadas donde hacen falta según el análisis,
      muros con publicidad ficticia y barreras de neumáticos, alambrado con
      postes, tribunas con público instanciado, arboledas instanciadas (3
      especies), lago con ondas, pórtico de largada con semáforo, boxes con
      garajes de colores, carteles de 150/100/50 m, ciudad a lo lejos y cielo
      físico con nubes, niebla y sombras que siguen al auto.
- [x] Coordenadas de pista `(s, d)`, perfil de velocidad, detección de curvas,
      puntos de frenada y ápices.
- [x] Física del monoplaza (sección 5.2) con caja automática de 8 marchas,
      carga aerodinámica, superficies por rueda, TC/ABS y choques con muros.
- [x] Mandos de manejo: teclado con rampas + gamepad analógico.
- [x] Cámaras cockpit (halo, volante con LEDs de cambio y pantalla, espejos,
      cabeza por G), T-cam y persecución, con fundido suave (C / Y).
- [x] Motor sintetizado en tiempo real; derrape, pianos, grava/pasto, viento,
      cambios de marcha, choques; vibración del gamepad.
- [x] Pantalla de carga con el trazado dibujándose, datos del circuito,
      progreso real por etapa y consejos (en vez de la silueta del auto).
- [x] Acceso "Práctica libre" en el menú (Albert Park). La Fase 5 lo convierte
      en un modo más de la selección de carrera.
- [x] Ajustes: pestañas Controles (sensibilidad, zona muerta, vibración) y
      Juego (cámara por defecto, km/h o mph), y volumen de Efectos.
- [x] Sesión de ajuste del manejo: vuelta completa con piloto automático
      (108 s, sin salirse) y con mandos digitales de teclado (117 s, deriva
      máx. 4°), 0–100 km/h < 3,2 s, frenada 200→0 en ~80 m.
- [x] Adelantado de la Fase 3: HUD básico (tiempos, sectores, delta en vivo,
      tablero con LEDs, pedales, DRS/TC/ABS, minimapa), vueltas y récord
      guardado, límites de pista, pausa, presentación del circuito y volver a
      pista con R.

### Fase 3 — HUD, vueltas, semáforo, pausa y ayudas ✅

- [x] Carrera rápida (temporal: Albert Park a 3 vueltas, sin rivales hasta la
      Fase 4; la Fase 5 agrega la selección de circuito, vueltas y clima).
- [x] Semáforo de 5 luces en el pórtico y en pantalla, pitido por luz, pausa de
      tensión, "¡APAGADAS!" con el público; auto retenido en la parrilla.
- [x] Vueltas X/N, "ÚLTIMA VUELTA", "VUELTA RÁPIDA", "DRS ACTIVADO", bandera a
      cuadros, vuelta de enfriamiento automática y panel de fin de carrera
      (tiempo total que cuenta, tabla de vueltas con sectores, repetir o salir).
- [x] Radio del equipo en texto animado (letra por letra, con chasquido).
- [x] Ayudas completas: frenado (4 niveles), tracción (3), ABS, dirección
      asistida con control de estabilidad; niveles Principiante / Intermedio /
      Avanzado / Personalizado con multiplicador de XP.
- [x] Trazada ideal por curvatura mínima + línea en el asfalto con shader
      (brillo, bordes difuminados, chevrones), fija o dinámica, completa o
      sólo curvas.
- [x] HUD: íconos de las ayudas activadas que se encienden al actuar (TC
      parpadea al cortar potencia).
- [x] Ajustes → Ayudas: tarjetas grandes animadas por nivel + opciones
      personalizadas; la pausa abre Ajustes directo en esa pestaña.
- [x] Vueltas, tiempos, sectores, delta, mejor vuelta y pausa (desde la Fase 2).
- [ ] Posición (P3/20), tabla lateral con gaps y minimapa con posiciones:
      necesitan rivales → Fase 4.

### Fase 4 — Bots, colisiones y posiciones ✅

- [x] Rendimiento primero (el juego iba lento): árboles y público en celdas y
      low-poly, calidad inicial según la GPU, rendimiento automático, HUD sin
      `backdrop-filter`, pausa sin redibujar, planos de cámara por modo (§5.10).
- [x] IA (sección 5.5), 5 dificultades, 10–20 autos, 10 equipos y 19 pilotos
      ficticios; dificultad y cantidad de rivales en Ajustes → Juego.
- [x] Colisiones auto-auto (auto-muro desde la Fase 2) y autos fantasma al
      volver a pista.
- [x] Posición "P3/12" (salta al ganar o perder puestos), torre con intervalos
      (primeros tres + ventana alrededor del jugador), vuelta rápida en violeta,
      rivales con su color en el minimapa, indicador de rebufo.
- [x] Rebufo y DRS con detección a 1 s; los bots también los usan.
- [x] Bandera a cuadros para todos; panel final con la clasificación completa
      (se completa a medida que llegan los demás, doblados con "+1 VUELTA").
- [x] Rivales instanciados con LOD y motores 3D de los 3 más cercanos
      (PannerNode + Doppler).
- [x] Radio: posición ganada/perdida, líder, vuelta rápida, DRS disponible,
      victoria/podio/puntos.

### Fase 5 — Monza, selección de carrera y modos ✅

- [x] Monza (`tracks/data/monza.ts`): 5,793 km y 11 curvas calibradas contra el
      trazado real (Rettifilo, Curva Grande, Roggia, Lesmo 1 y 2, Ascari,
      Parabólica), rectas largas, grava en Curva Grande y Parabólica, arboleda
      densa, 6 tribunas y el puente peraltado de la vieja *Sopraelevata*
      (`scenery.bridges`). Dos zonas de DRS.
- [x] Pantalla de selección de carrera (`RaceSelectScreen.ts`): tarjetas de
      circuito con mapa SVG que se dibuja (zonas de DRS, meta y sentido),
      datos (longitud, curvas, récord, fantasma) y opciones según el modo
      (vueltas, dificultad, rivales, ayudas, clima). Recuerda la última
      elección. Práctica, Carrera rápida y Contrarreloj entran por acá.
- [x] Clima (`tracks/weather.ts`): soleado, nublado (nubes del cielo de
      Three.js, luz difusa y más niebla) y atardecer (sol bajo, luz cálida).
      Ajusta sol, cielo, niebla y exposición de cada circuito.
- [x] Contrarreloj: sin rivales ni semáforo; la mejor vuelta válida queda como
      fantasma translúcido (`race/session/Ghost.ts`) guardado por circuito, y
      el delta en vivo se mide contra ella.
- [x] Campeonato (`race/championship.ts`, `ChampionshipScreen.ts`): todos los
      circuitos con los mismos rivales, puntos 25-18-15-12-10-8-6-4-2-1, tabla
      con desempate por victorias, podios y mejor resultado; al terminar cada
      carrera "Continuar campeonato" anota la ronda. Se guarda (se puede
      seguir otro día), se abandona con doble confirmación y al final muestra
      al campeón.
- [x] Ronda de rendimiento: simulación sin basura en el bucle caliente,
      sombreadores precompilados también de lo que arranca oculto, volante
      sólo en la cámara cockpit, puente fusionado por material (§5.10).

### Fase 6 — Progresión ✅

- [x] XP por sesión (`progression/xp.ts`): en carrera, base por posición
      (escalada por las vueltas) + 50 por adelantamiento (tope 12) + 150 por
      vuelta rápida + 200 por carrera limpia + 150 por récord; en el
      campeonato, 20 por punto y un premio al cerrar la temporada
      (2 000 / 1 200 / 800 / 400). Todo × dificultad (×0,8 … ×1,5, continuo) ×
      ayudas. Práctica y contrarreloj: 60 / 80 por vuelta válida + récord, ×
      ayudas; se cobran al salir desde la pausa ("Terminar y ver XP").
- [x] Suma con subidas de nivel (1–100), XP total, pase y recompensas
      (`applyXp`); se guarda en cuanto cae la bandera.
- [x] Pase de temporada "Temporada 1 · Ignición" (`progression/seasonPass.ts`):
      50 niveles de 1 000 XP y un ítem ficticio por nivel
      (`progression/items.ts`: pinturas, materiales, llantas, alerones, cascos,
      avatares, títulos y celebraciones; legendarios en los niveles 10, 20… 50).
      Vistas previas dibujadas en SVG (`ui/components/ItemPreview.ts`).
- [x] Pantalla de resultados (`ResultsScreen.ts`): líneas de XP que cuentan,
      multiplicadores, total, barra de nivel con chispas en la punta
      (`ui/anim/SparkField.ts`, canvas 2D sin asignaciones), "¡NIVEL N!" con
      sonido y ráfaga, barra del pase y cartas que se dan vuelta al completar
      cada nivel (brillo y sonido según rareza). ENTER la adelanta.
- [x] Pantalla del pase (`SeasonPassScreen.ts`): tira de 50 niveles con riel,
      detalle del elegido y títulos / avatares que se equipan con ENTER (se
      ven en la tarjeta del piloto del menú).

### Fase 7 — Garaje ✅

- [x] Curvas rápidas estables (pedido del usuario al empezar la fase): ver
      §5.2 "Curvas rápidas".
- [x] Catálogo con rarezas y niveles (`progression/items.ts`): de fábrica
      (brillante, tapa aerodinámica, alerón y casco del equipo), 50 del pase
      y 10 que se desbloquean por nivel de piloto (llantas blancas en el 3,
      casco de franja en el 5, alerón de alta carga en el 8, metal satinado en
      el 12… cromo en el 25, pintura "Veterano" en el 40, casco "Leyenda" en
      el 50). Patrones y colores especiales también piden nivel
      (`garage/setup.ts`).
- [x] Garaje (`GarageScreen.ts`) en el mismo estudio del menú, con la cámara
      que se acerca a la pieza de cada pestaña (costado, vista general, rueda,
      alerón, casco, morro). Enfocar un ítem lo muestra en vivo (también los
      bloqueados, con candado y cómo se consiguen); ENTER equipa. Pintura:
      pinturas listas + patrón y tres colores; neumático: franja del compuesto;
      número 1–99.
- [x] Auto personalizable (`CarModel.setLivery`): 6 patrones de livery en
      canvas, acabados PBR con `MeshPhysicalMaterial` (brillante, mate, metal
      satinado, metalizado, carbono visible, cromo, perlado con iridiscencia),
      llantas con rayos, 6 formas de alerón trasero (se reconstruye sólo el
      alerón), 7 diseños de casco.
- [x] Lo elegido se guarda (`SaveData.garage`, con saneo: sólo piezas que se
      tienen) y se ve en el menú, en la carrera y en la torre (número).

### Fase 8 — Perfil, ajustes completos, audio completo, manual y tutorial ✅

- [x] Perfil (`ProfileScreen.ts`): tarjeta con nombre editable, 10
      estadísticas de la trayectoria (`progression/career.ts`, se suman al
      terminar cada sesión), récords por circuito, vitrina de trofeos (oro si
      ganaste en el circuito, plata si subiste al podio, copa del campeonato)
      y 21 logros de bronce, plata y oro con su avance. Los logros se revisan
      después de cada cambio del guardado y se anuncian con un aviso animado.
- [x] Ajustes completos: las 8 teclas del manejo se reasignan (intercambio si
      la tecla ya estaba usada; la navegación de menús queda fija), volumen de
      música, idioma (español) y acceso al manual desde Ayudas y desde la
      selección de carrera.
- [x] Audio: música generativa de menú (`audio/MenuMusic.ts`: acordes por
      cadena de Markov, bajo, arpegio con eco, percusión suave; se apaga en la
      pista) y ovación + fanfarria con la bandera a cuadros.
- [x] Manual de ayudas (`AssistsManualScreen.ts`) con demos animadas en canvas
      (`ui/components/AssistDemo.ts`): frenado, tracción, ABS (sin y con la
      ayuda), línea fija y dinámica, y la tabla de niveles.
- [x] Tutorial inicial (`TutorialScreen.ts`): nombre, experiencia → nivel de
      ayudas recomendado (se aplica) y los controles con las teclas elegidas.

### Fase 9 — Pulido final ✅

- [x] Presentación del circuito en tres tomas: vuelo sobre la pista hasta la
      recta, paneo a ras del suelo por la parrilla (con rivales) y la vuelta
      alrededor del auto. Cartel con bandera del país (SVG), longitud, curvas,
      récord del circuito y el tuyo, y un rótulo por toma (lugar, parrilla,
      piloto). Saltar desde el vuelo corta directo a la cámara de carrera.
- [x] Bandera a cuadros que flamea sobre la meta y cámara lenta al cruzar la
      línea.
- [x] Partículas en pista: humo, tierra, chispas del fondo plano y de los
      pianos, y choques (muros y entre autos).
- [x] Postprocesado: desenfoque radial de velocidad, aire caliente de los
      escapes y FOV con DRS / rebufo.
- [x] Podio 3D (`PodiumScreen.ts`, desde "Ver el podio" en los resultados de
      una carrera con rivales): los escalones suben 3.º, 2.º y 1.º con cada
      auto, carteles que siguen a cada auto, grúa de cámara y vaivén,
      ovación, confeti, serpentinas, champán y fuegos artificiales.
- [x] Festejo equipable: pestaña Festejo en el garaje con las Serpentinas de
      fábrica y los tres del pase; el equipado es el protagonista (más
      cantidad, todo el tiempo) y el resto aparece un poco.
- [x] Logos de equipo en los rivales: atlas de logos (una celda por auto) con
      el mismo material por instancia que los números.
- [x] Revisión y rendimiento: el aire caliente queda en Alta / Ultra (es una
      pasada casi siempre activa), las partículas escalan con la calidad, la
      pasada de velocidad se precompila, y pruebas nuevas (cámara lenta,
      partículas, festejo en el guardado). Versión 1.0.0.

### Versión 1.1 — Mejoras pedidas después de la Fase 9 ✅

- [x] Tracción en curvas: al acelerar, el eje trasero reserva más agarre
      lateral (círculo de fricción ×0,7 en tracción). A fondo en una curva a
      80 km/h sin control de tracción, antes giraba en trompo (76° de
      deriva); ahora sale con ~5°. Prueba nueva en `physics.test.ts`.
- [x] Fluidez: pantalla de carga animada con CSS (sigue fluida aunque el hilo
      principal esté ocupado), precalentamiento de la GPU (`core/render/prewarm.ts`:
      el circuito entero se dibuja oculto antes de mostrarse; también el estudio
      y el podio), cuadros de verdad detrás de la carga antes de descubrir la
      pista, el rendimiento automático ya no baja el nivel de calidad en plena
      carrera (queda para la próxima sesión) y el límite de FPS dibuja uno de
      cada N cuadros del monitor (ritmo parejo en 120/144 Hz).
- [x] Pistas: asfalto más ancho (Albert Park 16 m, Monza 15,5 m) y radios de
      curva ajustados a las velocidades reales (Lesmo 1 de 281 a ~173 km/h,
      curva 13 de Albert Park a ~155). Los trazados siguen cerrando exacto;
      DRS y escapatorias reubicados. Sin datos oficiales de coordenadas, las
      formas siguen siendo aproximaciones con rectas y arcos.
- [x] Gráficos: estudio del menú con conos de luz visibles, polvo en el aire
      y pulso de luz en el piso (`garage/StudioAtmosphere.ts`); césped con
      franjas de corte; gradación de color y viñeta en carrera; menos bruma
      (el resplandor del cielo cerca del sol ya no lava la imagen).

### Versión 1.2 — Gráficos de las pistas ✅

- [x] Asfalto "usado" (`tracks/build/asphalt.ts`): una textura de datos de
      1 × 2048 lleva la trazada a lo largo de la vuelta (desplazamiento,
      frenada fuerte y fuerza lateral) y el sombreador pinta la goma sobre la
      trazada con las dos huellas de las ruedas, rayas de frenada, bolitas de
      goma en los bordes de las curvas y parches de reparación. Donde hay goma
      el asfalto brilla un poco más.
- [x] Árboles nuevos (`tracks/build/trees.ts`): eucalipto, copa redonda y
      ciprés hechos con bultos deformados, normales de copa (luz suave, sin
      facetas), oclusión horneada y viento en el sombreador con fase por árbol.
- [x] Horizonte (`tracks/build/horizon.ts`): arboleda lejana y lomas
      azuladas que siguen el contorno del circuito; el piso ya no corta contra
      el cielo.
- [x] Barreras de neumáticos de verdad (pilas de 3 con banda blanca, en
      rojo y blanco) detrás de la grava, en lugar de una cara plana.
- [x] Grava con manchas de tono a gran escala, gradas más oscuras y público
      que salta y se balancea.
- [x] Costo medido en Calidad Media (conteo de toda la escena, antes del
      recorte por cámara): ~0,78 M triángulos en Albert Park; el peor cuadro
      visto fue ~0,95 M en la recta de Monza (tope: 1,5 M).

### Versión 1.3 — Menús ✅

- [x] Fondo animado común de las pantallas 2D (`.fx-backdrop`): resplandores
      que derivan despacio, rayas de velocidad que cruzan sin fin y viñeta.
      Sólo anima `transform` (lo resuelve el compositor) y se apaga con
      "reducir movimiento".
- [x] Mapa del circuito en la selección de carrera: sectores marcados (S1–S3
      y sus límites) y un destello con estela que recorre la vuelta.
- [x] Campeonato sin temporada en curso: tarjetas del calendario con el
      trazado y la bandera, y el reparto de puntos en barras (oro, plata,
      bronce).
- [x] Estudio del menú y del garaje: las tiras de luz del fondo ahora son
      paneles LED con brillo suave (antes, palos rectos duros).
- [x] Defectos corregidos: "Adelantamientos" se cortaba letra por letra en el
      perfil; los nombres de la vitrina pisaban el estante; la tira del pase
      dejaba media pantalla vacía al principio; el título grande del pase se
      encimaba con su tipo; las siete pestañas del garaje ya entran en una
      fila; récords con texto claro ("0 victorias · 0 podios"); el pie del
      menú ya no muestra la fase de desarrollo.
- [x] El cursor quieto ya no le roba el foco a la pantalla que se abre: el
      foco sigue al ratón sólo cuando se mueve de verdad (`pointermove`).

### Versión 1.4 — Texturas, ayudas de manejo y línea dinámica ✅

- [x] Texturas del circuito: filtrado anisotrópico según la calidad (8× en
      Baja, 16× en el resto, sin pasar el de la GPU; `RenderHost.textureAnisotropy`),
      mipmaps con filtrado trilineal explícitos en todas, y asfalto, pasto,
      grava, pianos y muros generados a 1024 px por repetición desde Media
      (antes 512). Son procedurales: no hay archivos ni compresión con pérdida.
      El asfalto se genera una sola vez por circuito (antes, tres).
- [x] Capa de detalle cercana (`tracks/build/detail.ts`): el asfalto, el pasto
      y la grava vuelven a leer su textura 3–5 veces más fina cerca de la
      cámara (se apaga a ~40 m): el grano sigue nítido junto al auto.
- [x] Nivel de detalle de los rivales según la calidad: distancia del modelo
      cercano 60/90/130/170 m, hasta 5/8/10/12 autos, con más detalle en Alta
      y Ultra (antes fijo: 75 m, 8 autos).
- [x] Ayuda de dirección (Principiante, `assists/SteeringAssist.ts`): en las
      curvas, si giras hacia el mismo lado, el volante se acerca al ángulo que
      lleva por la trazada hacia el ápice (persecución pura, apuntando 1,6 m
      adentro del borde). En las rectas no actúa; nunca maneja sola.
- [x] Anti-derrape "sobre rieles" (`Electronics.antiSlide`): deja al
      neumático trasero hasta el 60 % de la deriva de su pico de agarre y
      quita el resto de la velocidad lateral. Más agarre en Principiante
      (`gripBoost` ×1,08, como más carga aerodinámica). Pruebas: con volante
      todo o nada y a fondo, la vuelta completa sin choques, menos de 1 s con
      ruedas afuera y deriva máxima < 6°.
- [x] Línea dinámica por exceso de velocidad: para cada punto de adelante,
      v_permitida = √(v_curva² + 2·a·d); exceso = v/v_permitida − 1; color
      interpolado verde (0 %) → amarillo (6 %) → rojo (15 %), recalculado en
      cada cuadro y suavizado en el tiempo. Ahora es la línea de todos los
      niveles predefinidos (la fija queda en Personalizado); en la XP, fija y
      dinámica valen lo mismo y "sólo curvas" suma 0,15.

### Versión 1.5 — Aviso con tiempo en la línea y gráficos de pista ✅

- [x] Línea dinámica rehecha: el rojo aparecía cuando ya era tarde (a 330
      km/h, a ~54 m de la curva 1 cuando frenar con calma pide ~77 m). Ahora
      cada punto se compara con el límite de agarre de esa curva (no con el
      perfil de aceleración: en recta no marca nada) y se calcula el punto de
      frenada con reacción de 0,45 s y una frenada tranquila (55 % de la
      máxima, deja agarre para doblar a la vez). El margen en segundos hasta
      ese punto da el color: verde ≥ 1,6 s, amarillo 0,7 s, rojo al llegar.
      Curva 1 a 330 km/h: verde hasta ~350 m, amarillo ~250 m, rojo ~180 m
      (la frenada límite empieza a ~140 m). Prueba: en las 5 frenadas fuertes
      de Albert Park, al ponerse rojo quedan más metros que los que usa el
      auto real para frenar al 50 % con 0,3 s de reacción.
- [x] Resolución de render: tope de densidad de píxeles 1,5 en Media (antes
      1,25) y 2 en Alta (antes 1,5): menos serrucho y texturas más finas en
      pantallas de alta densidad.
- [x] Sombra de contacto al pie de muros y barreras y pasto gastado junto al
      asfalto (`tracks/build/groundDetail.ts`); pasto con un verde más real,
      franjas de corte suaves y manchas de pasto seco.
- [x] Árboles con copas subdivididas en Alta y Ultra (no se ven facetadas).

---

## 8. Pendientes anotados (lo que una fase deja para otra)

| Qué | Dónde queda hoy | Llega en |
|---|---|---|
| Poles en las estadísticas | El documento las pide, pero el juego no tiene sesión de clasificación (la parrilla se arma sola): el perfil muestra victorias, podios, vueltas rápidas y demás. Si se agrega una clasificación, `CareerStats` suma el campo | Fuera del alcance de las 9 fases |
| Otros idiomas | Ajustes → Juego → Idioma existe con Español (el documento pide español por defecto); traducir todos los textos queda fuera del alcance | Fuera del alcance de las 9 fases |
| Patrones y acabados en los rivales | Decisión de la Fase 9: los rivales llevan la librea de su equipo (colores, número y logo) con acabado brillante. Patrones por equipo pedirían una máscara por patrón (más texturas y variantes del sombreador) para 20 autos instanciados; la identidad de cada equipo ya se lee por colores y logo | Fuera del alcance de las 9 fases |
| Pilotos en el podio | El podio muestra los autos sobre los escalones (el modelo no tiene piloto de cuerpo entero); el champán sale de la cabina | Fuera del alcance de las 9 fases |

### Notas de pruebas

- Chromium sin GPU (CI, servidores) dibuja por software a 1–2 FPS: la prueba de
  humo emula `prefers-reduced-motion` para que las animaciones sean cortas.
- Las capturas de la prueba de humo quedan en `e2e/capturas/` (fuera de git).
- Por ese mismo motivo, en la prueba de humo la simulación avanza lento (el
  paso fijo tiene un tope de 8 pasos por cuadro): se verifica que el auto
  arranque, no una vuelta entera. Las vueltas completas se prueban sin
  navegador (`tests/physics.test.ts`, `tests/session.test.ts`).
- El piloto automático de las pruebas (`tests/helpers/autopilot.ts`) es el
  `LineFollower` del juego por el centro de la pista; el "piloto de teclado"
  (`tests/helpers/keyboardPilot.ts`) lo traduce a flechas pulsadas y pasa por
  las mismas rampas que el juego.
- Las carreras con rivales se prueban sin navegador (`tests/race.test.ts`):
  2 vueltas con 11 bots y el jugador manejado por un `BotDriver`, comprobando
  que todos reciben la bandera, la tabla y los intervalos, y que casi no hay
  choques fuertes. La prueba de humo verifica la torre y el minimapa.
- Trayectoria, logros y teclas se prueban sin navegador
  (`tests/career.test.ts`). La prueba de humo pasa por el tutorial (nombre y
  experiencia), abre el perfil y el manual.
- El garaje se prueba sin navegador (`tests/garage.test.ts`): propiedad de
  ítems por fábrica / nivel / pase, conversión a livery y saneo. La prueba de
  humo entra al garaje, cambia de pestaña con Q y sube el número.
- La progresión se prueba sin navegador (`tests/progression.test.ts`):
  catálogo, XP de cada modo, subidas de nivel, pase y saneo de lo equipado.
  La prueba de humo abre el pase de temporada desde el menú.
- Los efectos se prueban sin navegador donde se puede (`tests/effects.test.ts`:
  capacidad, vida y movimiento de las partículas; `tests/core.test.ts`: cámara
  lenta del bucle). La presentación, el podio y los festejos se revisaron con
  capturas del navegador (a 1–2 FPS por software se fuerza el tiempo de cada
  toma).
- Para publicar como página se usa `dist-artifact/web/` (página chica + JS y
  CSS aparte): el HTML único de 1,4 MB lo rechaza el validador de páginas.
- Los modos se prueban sin navegador (`tests/modes.test.ts`): fantasma
  (grabar, codificar y reproducir), contrarreloj, campeonato (puntos, tabla y
  desempates), clima y saneo de los ajustes de carrera guardados.
- Para jugar sin instalar nada: `npm run build:artifact` arma un solo HTML
  (JS, CSS y fuentes incrustados) en `dist-artifact/`, que se publica como
  página de claude.ai.

## 9. Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|---|---|
| Rendimiento con 20 autos detallados | Rivales instanciados en 2 niveles de detalle (6 llamadas de dibujo para todos), rendimiento automático. |
| Bots que se chocan entre ellos | Carril con límites laterales previstos, ceder por fuera, frenada prudente detrás de otro, primera vuelta prudente, simulaciones en las pruebas. |
| Manejo poco divertido | Modelo simple y ajustable, ayudas de estabilidad, sesión de ajuste dedicada. |
| Audio bloqueado por el navegador | Contexto creado en el primer gesto (pantalla "pulsa cualquier tecla"). |
| Guardado corrupto o bloqueado | Saneo campo por campo + cadena IndexedDB → localStorage → memoria. |
| Trazados poco fieles | Puntos de control calibrados contra la longitud real y la forma de las curvas. |

---

## 10. Estado

- **Fase 1**: completa.
- **Fase 2**: completa.
- **Fase 3**: completa.
- **Fase 4**: completa (incluye la ronda de rendimiento).
- **Fase 5**: completa (el usuario pidió seguir sin esperar confirmación entre
  la 4 y la 5).
- **Fase 6**: completa.
- **Fase 7**: completa (incluye el ajuste de curvas rápidas que pidió el
  usuario).
- **Fase 8**: completa.
- **Fase 9**: completa. Versión 1.0.0: las 9 fases del documento están hechas.
- **Versión 1.1**: tracción, fluidez, pistas y gráficos (pedido del usuario).
- **Versión 1.2**: gráficos y calidad de las pistas (pedido del usuario).
- **Versión 1.3**: menús y su calidad (pedido del usuario).
- **Versión 1.4**: texturas, ayudas de frenado/dirección y línea dinámica (pedido del usuario).
- **Versión 1.5**: rojo con tiempo en la línea dinámica y gráficos de pista (pedido del usuario).
