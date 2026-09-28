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

El orden de carga en `index.html` importa: `data.js` → `scene3d.js` → `helpers.js` → `engine.js` → `ui.js`.

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

`careerScore()` suma puntos por: títulos colectivos (cada uno con un peso según su importancia), premios individuales, goles y asistencias (ajustados por posición), nivel máximo alcanzado, partidos con la selección, temporadas jugadas en ligas top y fama. Los tres últimos se multiplican por la participación real (partidos jugados), para que una carrera en la banca no sume. Luego `puntaje = 100 × (1 − e^(−puntos/95))`.

Balance medido con 10 carreras simuladas: un jugador disciplinado saca entre 58 y 99; uno fiestero, entre 20 y 40. Mantener ese rango al cambiar el balance.

## Reglas de trabajo

- Separación: datos en `data.js`, reglas en `engine.js`, 3D en `scene3d.js`, interfaz en `ui.js`.
- Cada evento nuevo va en `EVENTS` con `when(C)` y opciones con efectos (`fx`). Los efectos que dependen del azar se escriben como función: `fx: () => (...)`.
- Rendimiento: reutilizar geometrías y materiales, usar `bake()` en modelos estáticos, no crear objetos en cada cuadro.
- Nada de `alert()`. Usar los modales del juego.
- Después de cada cambio, probar en el navegador y revisar la consola.
- Para probar el balance rápido, simula carreras completas desde la consola llamando a las funciones del motor sin la interfaz.
