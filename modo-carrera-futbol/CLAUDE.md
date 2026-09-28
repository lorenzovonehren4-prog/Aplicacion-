# Modo Carrera Fútbol

Simulador de carrera de futbolista para computadora (navegador). Vives toda la carrera de un jugador peruano, de los 16 a los 40 años: fichajes, contratos, partidos simulados, selección, plata, casa, carros, pareja, familia, fiestas y decisiones. Al retirarte recibes un **puntaje de carrera del 1 al 100** que se guarda en "Mis carreras" para comparar todas tus carreras.

Todo el texto está en español de Perú. Los clubes son **inventados pero reconocibles** (por ejemplo "Íntimos de La Victoria", "Real Castilla", "Mánchester Rojo"). Nunca usar nombres, escudos ni jugadores reales, porque el juego se quiere publicar.

## Visión del diseño

- No se controla al jugador en la cancha. **La carrera es el juego**: los partidos se simulan minuto a minuto según las decisiones que tomaste (entrenamiento, descanso, fiestas, relación con el DT, forma, cansancio).
- Cada semana: eliges cómo vivir la semana, te pasan eventos con decisiones, se juegan los partidos, cobras y gastas.
- La vida fuera de la cancha se ve en **escenas 3D**: tu casa (4 niveles), tu cochera con tus carros, tu vitrina de trofeos, tu pareja e hijos, y el estadio con la animación de tus goles.
- Una temporada debe durar unos 25 minutos de juego real. Una carrera completa, unas 10 horas.
- Las relaciones de pareja y las salidas de fiesta solo se habilitan desde los 18 años. Antes, el jugador vive con su mamá, va al colegio y juega en menores.
- Todo debe mantener un tono divertido y apto para todo público: sin contenido sexual, sin violencia explícita y sin apuestas con dinero real.

## Cómo correrlo

- `npx serve .` y abrir la dirección que muestre (o abrir `index.html` directo).
- Sin compilación: scripts clásicos que comparten el ámbito global.
- `vendor/three.min.js` es three.js r160 (UMD).

## Estructura

El orden de carga en `index.html` importa: `data.js` → `audio.js` → `scene3d.js` → `helpers.js` → `scene-life.js` → `engine.js` → `ui.js`.

Resumen de lo agregado en las etapas 1 a 6 (el detalle de cada archivo está más abajo):

- `src/audio.js`: opciones del jugador (`OPTS`, en `localStorage['mcf_opts_v1']`) y todo el sonido sintetizado con Web Audio: silbato, gol, hinchada (`crowdOn/crowdOff`), fuegos artificiales y música (`setMusic('menu'|'disco'|'none')`). No hay archivos de audio.
- `src/scene3d.js`: motor 3D, calidad (`setQuality`), escudos y uniformes generados (`kitOf`, `drawKit`, `kitMat`, `drawCrest`, `crestURL`, `crestTex`), partículas (`burst`, `confetti`, `fireworks`), estadio completo (`buildStadium(kitLocal, kitRival, hinchada)`, tribunas con `InstancedMesh`, carteles LED, torres de luz, 16 jugadores y árbitro) y jugadas con cámaras de TV (`playMoment('goal'|'assist'|'defense')`: en vivo, celebración y repetición en cámara lenta; `S3.tv` dice qué etiqueta mostrar).
- `src/scene-life.js`: casa recorrible por clic (`buildHome`, objetos en `S3.inter`, etiquetas en `S3.labels`, `homeGo`), carros detallados (`makeCarModel`), trofeos (`makeTrophy`), mascotas (`makePet`), oficina de negociación (`buildOffice`, `officeReact`), discoteca (`buildDisco`), llegada al estadio (`buildArrival`) y ceremonia de retiro (`buildCeremony`). `updateLife` anima todas estas escenas.
- `tools/empaquetar.mjs`: arma `dist/modo-carrera-futbol.html` (un solo archivo) y `dist/modo-carrera-futbol-itch.zip`. Pasos de publicación en `PUBLICAR_ITCH.md`.

Sistemas nuevos del motor (`engine.js`):
- Negociación: `prepOffer`, `negotiate(oferta, pedido)` → `accept` / `counter` / `walk`, `greed`, `tolerance`, `agentTalk`. Contratos con bono por gol (`C.bonus`) y cláusula (`C.clause`).
- Préstamos: `makeLoanOffer`, `C.onLoan`, `endLoan` al terminar la temporada. Cambiar de liga a mitad de temporada rehace la tabla con `switchClubMidSeason`.
- Historial de fichajes en `C.moves`.
- Relaciones: `C.people` (dt, amigo, rival, agente) con `relAdd`. Eventos en cadena: `fx.chain = { id, in }` guarda en `C.chains` y `pickEvent` los dispara primero. Los eventos con `chainOnly` solo salen así.
- Clásicos: `DERBIES` en data, `isDerby`, `rivalOf`, `C.derbyWins`.
- Goleadores: `buildScorers`, `scorerTable`. El premio de goleador se gana siendo primero de la tabla.
- Redes (`fanPosts`, `C.social`), apodos de la prensa (`pressNick`, `C.nick`), relato (`phrase`).
- Logros permanentes (`ACHIEVEMENTS`, `localStorage['mcf_ach_v1']`) y récords del salón (`RECORDS`).
- `autoWeek(plan)` juega una semana sin interfaz para simular carreras de prueba.

Versión 2 (más decisiones de carrera):
- Jugadas decisivas en los partidos: `simMatch` agrega eventos `type: 'decision'` (`pickDecision` según la posición). La interfaz pregunta (`decisionUI`, 12 segundos) y `resolveDecision(r, e, opción)` decide con los atributos, la forma y las habilidades. Los goles de estas jugadas van a `r.extra` y `finalizeMatch(r)` recalcula el marcador, los penales de definición y la nota. Por eso `applyMatch` se llama **después** de mostrar el partido (dentro de `showMatch`). Tipos en `DECISIONS`: penal, mano, libre, contra, ultimo.
- Penales: el arquero estudia tus últimos remates (`C.penHist`, `keeperGuess`). Animación propia: `playPenalty`.
- Festejos (`CELEBRATIONS`) después de tus goles de jugada decisiva.
- Mentalidad antes de clásicos, eliminaciones y selección (`MINDSETS`, `m.mind`).
- Enfoque del entrenamiento (`C.focus`, `TRAIN_FOCUS`).
- Habilidades (`PERKS`, `C.perks`, `C.perkPts`, `hasPerk`), máximo `MAX_PERKS = 6`. Se ganan con retos cumplidos, temporadas de nota 7.3 o más y niveles 60/67/74/81/88 (`perkCheck`).
- Retos de temporada (`SEASON_GOALS`, `C.goalOpts`, `C.goal`, `goalInfo`), se eligen al empezar la temporada.
- Eventos con efectos nuevos: `forceOffers`, `forceLeague`, `salaryMul`, `contractAdd`.
- Constantes de balance arriba de `engine.js`: `TITLE_K`, `SCORE_DIV`, `DEC_SOLO`, `MAX_PERKS`.

- `src/data.js`: utilidades, las 10 ligas con 8 clubes cada una (`LEAGUES`), posiciones y pesos de atributos (`POSITIONS`), nombres, casas (`HOUSES`), carros (`CARS`), planes semanales (`WEEK_PLANS`) y eventos de vida con decisiones (`EVENTS`).
- `src/engine.js`: el motor. Objeto global `C` con toda la carrera.
  - Crear carrera: `newCareer`.
  - Temporadas: `startSeason`, liga ida y vuelta, copa nacional y copa continental por eliminación.
  - Semana: `weekMatches`, `applyPlan`, `pickEvent`, `applyFx`, `weeklyMoney`, `endWeekUpdate`.
  - Partido simulado: `simMatch` (rol titular, suplente, banca o reserva según nivel, confianza del DT, forma y cansancio; goles y asistencias propias; nota del 1 al 10) y `applyMatch`.
  - Progresión: `train`, `ageFactor`, `ageUp` (sube hasta los 27-30, baja después).
  - Fichajes: `makeOffers`, `signOffer`, `wageFor`, `marketValue`.
  - Fin de temporada: `endSeason` (títulos, premios individuales, Balón de Oro, Mundial y Copa América con `playTournament`).
  - Final: `careerScore`, `gradeFor`, `retire` y el salón de carreras (`loadHall`, `saveHall`).
- `src/scene3d.js`: escenas 3D: `buildHome()` (casa según `C.house`, carros en `C.cars`, trofeos en la vitrina, pareja e hijos) y `buildStadium()` con `playGoalAnim()`.
- `src/helpers.js`: materiales, texturas con canvas, `box/cyl/sph/plane`, `makePerson` y `posePerson` (personas animadas), `bake`.
- `src/ui.js`: pantallas (inicio, crear jugador, centro de mando, partido en vivo, eventos, fichajes, tienda, tabla, trofeos, fin de temporada, retiro con puntaje animado, mis carreras) y el flujo de la semana (`playWeek`).
- `index.html`: HTML y CSS.

## Guardado

- Carrera en curso: `localStorage['mcf_save_v1']` (el objeto `C` completo).
- Carreras terminadas: `localStorage['mcf_hall_v1']`, lista ordenada por puntaje (máximo 100).
- Si agregas campos a `C`, dales valor por defecto al cargar para no romper partidas guardadas.

## Puntaje de carrera (1 a 100)

`careerScore()` suma puntos por: títulos colectivos (cada uno con un peso según su importancia y según cuánto jugaste esa temporada: `peso × min(1, partidos/12) × TITLE_K`, y hacen falta al menos 4 partidos), premios individuales, goles y asistencias (ajustados por posición), nivel máximo alcanzado, partidos con la selección, temporadas jugadas en ligas top y fama. Los que dependen de jugar se multiplican por la participación real, para que una carrera en la banca no sume. Luego `puntaje = 100 × (1 − e^(−puntos/SCORE_DIV))` con `SCORE_DIV = 155`.

Balance medido con 50 a 80 carreras simuladas por tanda (versión 2, con jugadas decisivas, habilidades y retos): un jugador disciplinado promedia entre 66 y 70 (casi siempre entre 40 y 90) y llega a 90 en un 3 a 10 % de las carreras; uno fiestero promedia entre 33 y 37. Mantener esos rangos al cambiar el balance.

## Reglas de trabajo

- Separación: datos en `data.js`, reglas en `engine.js`, 3D en `scene3d.js`, interfaz en `ui.js`.
- Cada evento nuevo va en `EVENTS` con `when(C)` y opciones con efectos (`fx`). Los efectos que dependen del azar se escriben como función: `fx: () => (...)`.
- Rendimiento: reutilizar geometrías y materiales, usar `bake()` en modelos estáticos, no crear objetos en cada cuadro.
- Nada de `alert()`. Usar los modales del juego.
- Después de cada cambio, probar en el navegador y revisar la consola.
- Para probar el balance rápido, simula carreras completas desde la consola llamando a las funciones del motor sin la interfaz.
