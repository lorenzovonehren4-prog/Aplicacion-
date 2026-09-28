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
    │   ├── session/LapTimer.ts   [2] vueltas, sectores, delta en vivo, validez · [3] semáforo
    │   ├── PracticeSession.ts    [2] práctica libre: física + cronómetro + DRS + límites de pista
    │   ├── RaceWorld.ts          [2] escena 3D de la sesión (circuito + auto + cámaras) = vista del renderer
    │   ├── ai/                   [4] bots: seguimiento de línea, adelantar, defender, errores
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
    │   ├── RacingLine.ts         [3] trazada ideal (mínima curvatura)
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
    ├── assists/                  [3] niveles de ayudas, frenado, TC, ABS, línea de trazada
    ├── ui/
    │   ├── dom.ts                [1] creación de elementos tipada (`h`)
    │   ├── nav/FocusNavigator.ts [1] navegación espacial con teclado/gamepad + ratón
    │   ├── anim/                 [1] barrido diagonal, stagger, contadores
    │   ├── components/           [1] botón de menú, slider, selector, pestañas, tarjeta de piloto, FPS
    │   ├── race/                 [2] HUD (tiempos, minimapa, tablero), pantalla de carga, pausa
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
| Principiante | Completa | Completo | Sí | Completa | Fija | ×1.0 |
| Intermedio | Media | No | Sí | Completa | Fija | ×1.25 |
| Avanzado | Baja | No | Sí | Sólo curvas | Dinámica | ×1.5 |
| Personalizado | Off/Baja/Media/Completa | Off/Medio/Completo | On/Off | Off/Curvas/Completa | Fija/Dinámica | calculado |

- **Ayuda de frenado**: mira adelante sobre el perfil de velocidad; si tu
  velocidad supera la segura para la próxima curva más la distancia de frenada,
  aplica freno (Completa: todo lo necesario; Media: 50 % y sólo si vas muy
  pasado; Baja: 25 % y sólo en emergencias).
- **Control de tracción**: limita el acelerador cuando el deslizamiento de las
  ruedas traseras supera un umbral (Medio: umbral alto; Completo: sin patinar).
- **ABS**: limita la presión de freno por eje antes del bloqueo (sin ABS las
  ruedas se bloquean: humo, pérdida de dirección).
- **XP personalizado**: `1.0 + 0.1·(frenado quitado) + 0.1·(tracción quitada) +
  0.05·(sin ABS) + 0.1·(línea reducida) + 0.05·(línea dinámica)`, tope ×1.6.
- **Línea de trazada**: cinta sobre el asfalto siguiendo la trazada ideal
  (`BufferGeometry` con color por vértice + shader propio: brillo suave,
  transparencia, bordes difuminados y chevrones animados). Fija = color por
  tramo desde el perfil (verde acelerar / amarillo levantar / rojo frenar).
  Dinámica = uniforme por tramo recalculado cada fotograma comparando tu
  velocidad con la segura de la próxima curva, con transición suave (sin saltos).
  "Sólo curvas" oculta la cinta en rectas con un desvanecido en los extremos.
- HUD: íconos de ayudas activas que se iluminan cuando actúan.

### 5.5 Bots (`race/ai/`)

- Siguen la trazada ideal con un **desplazamiento lateral** propio que cambia con
  suavidad: para adelantar (eligen el lado libre al detectar un auto más lento
  adelante), para defender (cierran el interior antes de la frenada, una vez) y
  para evitar choques (se abren si hay un auto al lado).
- Velocidad objetivo = perfil de velocidad × factor de dificultad; puntos de
  frenada desplazados según dificultad; mantienen distancia con el auto de
  adelante para no chocar por detrás.
- **Dificultad** (Novato, Amateur, Profesional, Leyenda, Personalizada 0–100)
  mueve: velocidad máxima (−8 % a +1 %), puntos de frenada, agresividad (qué tan
  rápido deciden adelantar/defender) y frecuencia de errores (frenadas largas,
  salidas leves).
- Parrilla de 10 a 20 autos. Equipos, pilotos, números y colores **ficticios**
  en `data/teams.ts`.
- Rendimiento: los autos de bots comparten geometría; las piezas estáticas se
  fusionan por material y hay un **LOD** para autos lejanos.

### 5.6 Reglas y modos (`race/rules/`)

- Semáforo de 5 luces (una por segundo, sonido en cada una), pausa aleatoria de
  0,5–2,5 s, "¡APAGADAS!". Salida anticipada: aviso (sin penalización en
  Principiante).
- Vueltas, tiempo por vuelta y por sector, mejor vuelta, delta en vivo contra tu
  mejor vuelta (verde/rojo), posiciones por `vueltas × longitud + s`, gaps.
- Fin: el líder cruza la meta en la última vuelta → bandera a cuadros → el resto
  termina su vuelta.
- **Carrera rápida**: circuito, vueltas (3/5/10), dificultad, rivales (9–19),
  ayudas, clima (soleado / nublado / atardecer).
- **Contrarreloj**: sin rivales; fantasma de tu mejor vuelta (posición y rumbo a
  20 Hz, ~20 KB por vuelta) guardado por circuito.
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

Partículas instanciadas con pool (sin crear objetos por fotograma): chispas bajo
el auto a alta velocidad y en pianos, humo al bloquear o derrapar, confeti,
champán y fuegos artificiales en el podio. Distorsión de calor detrás de los
autos (pase de postprocesado con máscara), motion blur de cámara, zoom de FOV,
sacudidas, bandera a cuadros ondeando (shader de vértices), cámara lenta al
cruzar la meta.

### 5.10 Rendimiento

- Presupuesto en calidad Media: ≤ 350 draw calls, ≤ 1,5 M triángulos, 60 FPS en
  una PC normal con gráfica integrada reciente.
- Sin asignaciones en el bucle caliente (vectores reutilizados).
- `InstancedMesh` para árboles, público, conos y partículas; mallas estáticas del
  circuito fusionadas por material.
- Sombras: una luz direccional cuya cámara de sombras sigue al jugador.
- Todo se escala con el nivel de calidad (sección 4.4).

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

### Fase 3 — HUD completo, semáforo y ayudas

- [ ] HUD completo (sección 9 del documento de diseño): posiciones, gaps,
      ayudas activas; sobre la base de `ui/race/Hud.ts`.
- [x] Vueltas, tiempos, sectores, delta, mejor vuelta (Fase 2).
- [ ] Semáforo de 5 luces con sonido (el pórtico ya tiene las luces).
- [x] Pausa con desenfoque (continuar, reiniciar, ajustes, salir) (Fase 2).
- [ ] Sistema de ayudas completo + línea de trazada fija y dinámica.
- [ ] Ajustes: pestaña Ayudas. (Unidades km/h / mph: Fase 2.)

### Fase 4 — Bots, colisiones y posiciones

- [ ] IA (sección 5.5), dificultades, 10–20 autos, equipos ficticios.
- [ ] Colisiones auto-auto y auto-muro.
- [ ] Posiciones y gaps en vivo; rebufo.
- [ ] Optimización de autos (fusión por material, LOD) y motores 3D de bots.

### Fase 5 — Monza, selección de carrera y modos

- [ ] Monza (rectas largas, chicanes, arboleda).
- [ ] Pantalla de selección de carrera (circuito, vueltas, dificultad, rivales,
      ayudas, clima) — reemplaza el acceso temporal de la Fase 2.
- [ ] Clima: soleado, nublado, atardecer.
- [ ] Contrarreloj con fantasma guardado; Campeonato con puntos y tabla.

### Fase 6 — Progresión

- [ ] XP por carrera (`progression/xp.ts`) y suma de XP con subidas de nivel
      (la curva de niveles ya existe en `progression/levels.ts`).
- [ ] Pase de temporada de 50 niveles.
- [ ] Pantalla de resultados (filas animadas, barra de XP con partículas, subida
      de nivel, cartas de recompensa que giran según rareza).
- [ ] Pantalla del pase de temporada.

### Fase 7 — Garaje

- [ ] Catálogo de ítems con rarezas y niveles.
- [ ] Garaje 3D: colores, patrones de livery, número, llantas, franja del
      neumático, alerones, casco, materiales PBR. Vista previa en vivo.

### Fase 8 — Perfil, ajustes completos, audio completo, manual y tutorial

- [ ] Perfil: estadísticas, récords por circuito, vitrina de trofeos y logros.
- [ ] Ajustes completos (reasignar teclas, idioma, etc.).
- [ ] Audio completo: efectos restantes, música generativa de menú.
- [ ] Manual de ayudas con demos animadas (mini auto en curva vista desde arriba).
- [ ] Tutorial inicial (nombre, experiencia → nivel de ayudas recomendado).

### Fase 9 — Pulido final

- [ ] Presentación del circuito completa (vuelo por el trazado, parrilla con
      rivales); la Fase 2 ya tiene la vuelta de cámara alrededor del auto.
- [ ] Podio 3D (confeti, champán, fuegos artificiales, cámara girando).
- [ ] Postprocesado completo (motion blur, calor, FOV), partículas.
- [ ] Optimización y revisión general de bugs.

---

## 8. Pendientes anotados (lo que una fase deja para otra)

| Qué | Dónde queda hoy | Llega en |
|---|---|---|
| Accesos del menú a pantallas futuras | Bloqueados con "FASE N"; se habilitan agregando su entrada en `OPENERS` (`MainMenuScreen.ts`) | 5, 6, 7, 8 |
| Parámetros de pantallas nuevas | `core/screens/params.ts`: splash, menú, ajustes y carrera (`mode: 'practice'`) | 3 en adelante |
| Ajustes: Ayudas y volumen de Música | No se muestran hasta que tengan efecto | 3, 8 |
| Tutorial inicial | El splash va siempre al menú; se agrega el desvío al tutorial la primera vez | 8 |
| Nombre del piloto editable | Por ahora "PILOTO" | 8 (tutorial y perfil) |
| Música de menú | — | 8 |
| Patrones de livery y materiales | El auto usa la livery base del jugador | 7 |
| Autos de bots livianos (piezas compartidas, LOD) | `CarModel` crea sus propias texturas | 4 |
| Semáforo de largada | `StartGantry.lights` (materiales de las 10 luces) listo para encender | 3 |
| DRS con detección (a menos de 1 s del de adelante) | En práctica se permite en toda la zona; `DrsZone.detection` ya está en los datos | 4 |
| Rebufo | `Vehicle.slipstream` existe y reduce el arrastre; nadie lo fija todavía | 4 |
| Nivel de TC/ABS elegible | `Vehicle.electronics` (TC 0,6 y ABS fijos) | 3 |

### Notas de pruebas

- Chromium sin GPU (CI, servidores) dibuja por software a 1–2 FPS: la prueba de
  humo emula `prefers-reduced-motion` para que las animaciones sean cortas.
- Las capturas de la prueba de humo quedan en `e2e/capturas/` (fuera de git).
- Por ese mismo motivo, en la prueba de humo la simulación avanza lento (el
  paso fijo tiene un tope de 8 pasos por cuadro): se verifica que el auto
  arranque, no una vuelta entera. Las vueltas completas se prueban sin
  navegador (`tests/physics.test.ts`, `tests/session.test.ts`).
- El piloto automático de las pruebas (`tests/helpers/autopilot.ts`) sigue el
  centro de la pista con el perfil de velocidad del análisis; el "piloto de
  teclado" (`tests/helpers/keyboardPilot.ts`) lo traduce a flechas pulsadas y
  pasa por las mismas rampas que el juego.

## 9. Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|---|---|
| Rendimiento con 20 autos detallados | Fusión por material, LOD, instancias, presupuesto por calidad. |
| Manejo poco divertido | Modelo simple y ajustable, ayudas de estabilidad, sesión de ajuste dedicada. |
| Audio bloqueado por el navegador | Contexto creado en el primer gesto (pantalla "pulsa cualquier tecla"). |
| Guardado corrupto o bloqueado | Saneo campo por campo + cadena IndexedDB → localStorage → memoria. |
| Trazados poco fieles | Puntos de control calibrados contra la longitud real y la forma de las curvas. |

---

## 10. Estado

- **Fase 1**: completa.
- **Fase 2**: completa. A la espera de confirmación para empezar la Fase 3.
