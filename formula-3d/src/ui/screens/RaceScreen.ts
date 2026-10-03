/**
 * Pantalla de carrera: práctica libre o carrera a N vueltas.
 *
 * Estados: carga → presentación (vuelta de cámara, se salta con ENTER/A) →
 * en pista (en carrera: parrilla con semáforo) ⇄ pausa → (en carrera)
 * bandera a cuadros y panel de fin de carrera → resultados. Al terminar (o,
 * sin rivales, al salir con vueltas válidas) se suma la XP de la sesión y se
 * pasa a la pantalla de resultados. La carga no bloquea la
 * transición: la pantalla aparece enseguida con la barra de progreso real y
 * el circuito se arma por etapas.
 */

import gsap from 'gsap';
import { Vector3 } from 'three';
import type { Object3D } from 'three';
import { activeAssists, LEVEL_INFO, xpMultiplier, type ActiveAssists } from '../../assists/presets';
import type { Game } from '../../core/Game';
import { compileScene } from '../../core/render/prewarm';
import { PerformanceGovernor, type GovernorDecision } from '../../core/render/PerformanceGovernor';
import { QUALITY_PRESETS } from '../../core/render/quality';
import type { UiAction } from '../../core/input/actions';
import { keyLabel } from '../../core/input/bindings';
import type { PodiumEntry, RaceParams, ResultsParams } from '../../core/screens/params';
import { clamp } from '../../core/utils/math';
import { formatLapTime } from '../../core/utils/format';
import { ENGINEER_NAME, RADIO_LINES, type RadioMoment } from '../../data/radio';
import { DRIVERS, liveryOf, pickRivals, playerCode, wordmarkOf, type DriverDef } from '../../data/teams';
import { isFinished, PLAYER_ID, pointsFor, recordRound, standings as championshipStandings } from '../../race/championship';
import { liveryFromSetup } from '../../garage/setup';
import { difficultyLabel, difficultyValue } from '../../race/ai/difficulty';
import { completeDaily, DAILY_COLOR, dailyChallenge, dailyCompleted, dailyReward, doneToday, type DailyChallenge } from '../../progression/daily';
import { MEDAL_INFO, medalsEarned, nextMedal, type Medal } from '../../progression/medals';
import { applyXp, computeXp, snapshotOf, type XpLine } from '../../progression/xp';
import { recordSession } from '../../progression/career';
import { applyUpgrades, devPointsFor } from '../../progression/upgrades';
import type { RivalCar } from '../../race/render/RivalFleet';
import { DrivingInput, type DrivingEvent } from '../../race/input/DrivingInput';
import { F1_SPEC } from '../../race/physics/CarSpec';
import { Session, TIME_PENALTY, TRACK_LIMIT_WARNINGS, type RaceResult, type SessionEvent } from '../../race/Session';
import { RaceAudio, type SurfaceMix } from '../../race/audio/RaceAudio';
import type { Listener } from '../../race/audio/BotEngines';
import { decodeGhost, encodeGhost, GhostPlayer, type GhostLap, type GhostPose } from '../../race/session/Ghost';
import type { Vehicle } from '../../race/physics/Vehicle';
import { CAMERA_LABELS } from '../../race/camera/RaceCamera';
import { RaceWorld, type IntroShot } from '../../race/RaceWorld';
import type { CrewStop } from '../../race/render/PitCrew';
import { BuildCancelled } from '../../tracks/TrackBuilder';
import { getTrack, TRACKS } from '../../tracks/registry';
import { Track } from '../../tracks/Track';
import { h, prefersReducedMotion } from '../dom';
import { ControlHints } from '../components/ControlHints';
import { createCountryFlag } from '../components/CountryFlag';
import { FinishPanel } from '../race/FinishPanel';
import { Hud, type HudAssists } from '../race/Hud';
import { LoadingOverlay } from '../race/LoadingOverlay';
import { PauseMenu, type PauseChoice } from '../race/PauseMenu';
import { BaseScreen } from './BaseScreen';

type Phase = 'loading' | 'intro' | 'running' | 'paused' | 'results' | 'error' | 'leaving';

/** Cada cuánto se renueva la vibración del gamepad (ms). */
const RUMBLE_INTERVAL = 90;
/** Vueltas de la carrera si no se indican. */
const DEFAULT_RACE_LAPS = 3;
/** Espera entre la bandera a cuadros y el panel de fin de carrera (ms). */
const FINISH_PANEL_DELAY = 2600;
/** Cámara lenta de la llegada: velocidad, segundos (reales) a esa velocidad y de vuelta a la normal. */
const SLOW_MOTION_SCALE = 0.3;
const SLOW_MOTION_HOLD = 1.3;
const SLOW_MOTION_RAMP = 0.9;
/** Frecuencia de la torre de posiciones (s) y de los rivales en el minimapa (s). */
const STANDINGS_INTERVAL = 0.25;
/** Con menos vueltas que esto (en total) se muestran las teclas al empezar. */
const NEWCOMER_LAPS = 15;
/** Reacción a la largada: excelente y buena (s). */
const REACTION_GREAT = 0.2;
const REACTION_GOOD = 0.32;
/** Hasta cuántos segundos detrás se nombra al que viene en el retrovisor. */
const MIRROR_NEAR = 3;
/** El retrovisor aparece este tiempo (s) después de la largada, cuando ya se fue el semáforo. */
const MIRROR_AFTER_START = 2.5;
const MINIMAP_INTERVAL = 0.05;
/** Tiempo mínimo entre dos mensajes de radio por cambios de posición (ms). */
const POSITION_RADIO_GAP = 12_000;
/** Choque (m/s) que merece un mensaje del ingeniero, y tiempo mínimo entre dos (ms). */
const RADIO_IMPACT = 14;
const RADIO_IMPACT_GAP = 20_000;

const QUALITY_LABELS = { low: 'Baja', medium: 'Media', high: 'Alta', ultra: 'Ultra' } as const;

/** Espera `count` cuadros del navegador. */
function waitFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    let left = count;
    const tick = (): void => {
      if (--left <= 0) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** Los bots de la sesión, como los dibuja la flota de rivales. */
function rivalCars(session: Session): RivalCar[] {
  return session.cars.flatMap((car) =>
    car.driver
      ? [
          {
            vehicle: car.vehicle,
            livery: liveryOf(car.driver),
            wordmark: wordmarkOf(car.team),
            get ghost() {
              return car.ghost;
            },
          },
        ]
      : [],
  );
}

/** Qué íconos de ayudas se muestran en el tablero. */
function hudAssists(assists: ActiveAssists): HudAssists {
  return {
    braking: assists.braking !== 'off',
    traction: assists.traction !== 'off',
    abs: assists.abs,
    stability: assists.steering,
  };
}

export class RaceScreen extends BaseScreen<RaceParams> {
  readonly id = 'race';
  private phase: Phase = 'loading';
  private params: RaceParams = { trackId: 'australia', mode: 'practice' };
  private track: Track | null = null;
  private session: Session | null = null;
  private world: RaceWorld | null = null;
  /** Los autos que emiten partículas (el jugador y los rivales). */
  private effectCars: Vehicle[] = [];
  private readonly contactBurst = (x: number, z: number, speed: number): void => this.world?.effects.burst(x, z, speed);
  private loading: LoadingOverlay | null = null;
  private hud: Hud | null = null;
  private pause: PauseMenu | null = null;
  private finish: FinishPanel | null = null;
  private driving: DrivingInput | null = null;
  private readonly audio: RaceAudio;
  private readonly surfaces: SurfaceMix = { grass: 0, gravel: 0, kerb: 0 };
  private readonly introCard = h('div', { class: 'race__intro' });
  private readonly skipHint = h('div', { class: 'race__skip' });
  private startHints: ControlHints | null = null;
  private introElapsed = 0;
  /** Rótulo de la toma de la presentación que se ve (lugar, parrilla, piloto). */
  private readonly introCaption = h('span', { class: 'race__intro-shot' });
  private introCaptions: Record<IntroShot, string> = { flyover: '', grid: '', orbit: '' };
  private introShot: IntroShot | null = null;
  /** Inicio de la cámara lenta de la llegada (`performance.now()`, −1 = sin cámara lenta). */
  private slowMotionStart = -1;
  /** Nivel de calidad más bajo que pidió el rendimiento automático (se aplica al salir de la pista). */
  private pendingQuality: GovernorDecision | null = null;
  private introTimeline: gsap.core.Timeline | null = null;
  private cancelled = false;
  private lastRumble = 0;
  private lastImpactRadio = -Infinity;
  /** Resultado de la carrera que espera para mostrarse en el panel final. */
  private pendingFinish: RaceResult | null = null;
  private readonly lastRadioLine = new Map<RadioMoment, string>();
  private covered = false;
  private readonly governor = new PerformanceGovernor();
  private standingsTimer = 0;
  /** Retrovisor a la vista (null = volver a medir su lugar). */
  private mirrorShown: boolean | null = null;
  private mirrorTimer = 0;
  /** Segundos que faltan para mostrar el retrovisor tras la largada. */
  private mirrorDelay = 0;
  private minimapTimer = 0;
  private lastPositionRadio = -Infinity;
  private readonly rivalDots: Array<{ x: number; z: number }> = [];
  private botVehicles: Vehicle[] = [];
  private readonly listener: Listener = { x: 0, y: 0, z: 0, forwardX: 0, forwardY: 0, forwardZ: -1, upX: 0, upY: 1, upZ: 0, vx: 0, vz: 0 };
  private readonly listenerForward = new Vector3();
  private readonly listenerUp = new Vector3();
  private readonly listenerVelocity = { x: 0, z: 0 };
  private ghostPlayer: GhostPlayer | null = null;
  /** Puestos ganados en pista (carrera) y vueltas válidas / récord sin rivales, para la XP. */
  private overtakes = 0;
  private soloLaps = 0;
  private soloPersonalBest = false;
  /** Medallas del circuito ganadas en esta sesión (para la XP de los resultados). */
  private readonly medalsWon: Medal[] = [];
  /** Desafío del día que se corre en esta sesión (null si es una sesión común). */
  private daily: DailyChallenge | null = null;
  /** Contrarreloj del desafío: ya se bajó el tiempo pedido. */
  private dailyMet = false;
  /** Resultados listos (XP ya sumada) para la pantalla siguiente. */
  private results: ResultsParams | null = null;
  private readonly ghostPose: GhostPose = { x: 0, z: 0, heading: 0 };
  /** Ya avisó por radio de neumáticos gastados o del alerón dañado (hasta la próxima parada). */
  private carWarned = { tyres: false, wing: false };
  private carTimer = 0;
  private readonly crewStops: CrewStop[] = [];

  constructor(game: Game) {
    super(game, 'screen--race');
    this.audio = new RaceAudio(game.audio);
    this.own.add(() => this.audio.dispose());
  }

  enter(params: RaceParams): void {
    this.params = params;
    this.daily = params.daily ? this.dailyFor(params.daily) : null;
    this.dailyMet = false;
    const def = getTrack(params.trackId);
    // Los datos del circuito se calculan en milisegundos; las mallas se arman después, por etapas.
    const track = Track.load(def, F1_SPEC);
    this.track = track;
    this.loading = new LoadingOverlay(track);
    this.root.append(this.loading.root);
    this.game.render.setView(null);
    this.game.releaseStudio();
    void this.load(track);
  }

  reveal(): void {
    this.loading?.reveal();
  }

  fixedUpdate(step: number): void {
    const session = this.session;
    const world = this.world;
    const driving = this.driving;
    if ((this.phase !== 'running' && this.phase !== 'results') || !session || !world || !driving) return;
    world.beforeStep();
    const events = session.step(step, driving.controls, driving.drsRequested);
    if (events.length > 0) this.handleSessionEvents(events);
  }

  update(dt: number, alpha: number): void {
    const session = this.session;
    const world = this.world;
    if (!session || !world || this.phase === 'loading') return;
    const vehicle = session.vehicle;
    const tel = vehicle.telemetry;
    this.updateSlowMotion();

    // Los mandos se leen siempre (Start del gamepad sale de la pausa), pero sólo
    // cuentan en pista.
    this.driving?.update(dt, vehicle.speed);
    if (this.phase !== 'running') this.driving?.release();
    if (this.phase === 'intro') {
      this.introElapsed += dt;
      this.updateIntroCaption(world.introShot);
      if (this.introElapsed >= world.introDuration) this.finishIntro();
    }

    const simulating = this.phase === 'running' || this.phase === 'results';
    world.update(dt, simulating ? alpha : 1, tel);
    this.updateCrews(session, world);
    if (simulating) session.takeContacts(this.contactBurst);
    world.updateEffects(dt, this.effectCars, simulating);
    world.renderMirrors(this.game.render.renderer);

    // Superficies bajo las ruedas (sonido y vibración).
    let grass = 0;
    let gravel = 0;
    let kerb = 0;
    for (const wheel of vehicle.wheels) {
      if (wheel.surface === 'grass') grass += 0.25;
      else if (wheel.surface === 'gravel') gravel += 0.25;
      else if (wheel.surface === 'kerb') kerb += 0.25;
    }
    this.surfaces.grass = grass;
    this.surfaces.gravel = gravel;
    this.surfaces.kerb = kerb;

    if (simulating) {
      const impact = session.takeImpact();
      this.audio.update(tel, this.surfaces, impact);
      this.updateTrafficAudio(world, session);
      if (impact > 3) world.raceCamera.kick(clamp(impact / 20, 0.2, 1.2));
      if (this.phase === 'running') this.rumble(tel.rumble, impact);
      const now = performance.now();
      if (impact > RADIO_IMPACT && now - this.lastImpactRadio > RADIO_IMPACT_GAP) {
        this.lastImpactRadio = now;
        this.radio('bigImpact');
      }
    }

    this.updateGhost();
    this.updateHud(dt);
    if (this.phase === 'running' && this.slowMotionStart < 0) this.governPerformance(dt);
    // Con el panel final abierto, la clasificación se completa a medida que llegan los demás.
    if (this.phase === 'results' && session.order) {
      this.standingsTimer -= dt;
      if (this.standingsTimer <= 0) {
        this.standingsTimer = STANDINGS_INTERVAL * 2;
        this.finish?.updateStandings(session.standings());
      }
    }
  }

  override onAction(action: UiAction): void {
    if (this.phase === 'error') {
      this.nav.handle(action);
      return;
    }
    if (this.phase === 'intro') {
      if (action === 'confirm' || action === 'back') this.finishIntro();
      return;
    }
    if (this.phase === 'paused') {
      this.pause?.onAction(action);
      return;
    }
    if (this.phase === 'results') {
      this.finish?.onAction(action);
      return;
    }
    if (this.phase === 'running' && action === 'back') this.setPaused(true);
  }

  onCovered(): void {
    // Ajustes encima de la pausa.
    this.covered = true;
    this.pause?.setEnabled(false);
  }

  onUncovered(): void {
    this.covered = false;
    this.pause?.setEnabled(true);
  }

  protected onBack(): void {
    if (this.phase === 'running') this.setPaused(true);
  }

  override exit(): void {
    this.cancelled = true;
    this.phase = 'leaving';
    this.stopSlowMotion();
    // El nivel de calidad que pidió el rendimiento automático se aplica al salir (sin tirones en pista).
    if (this.pendingQuality) this.commitPerformance(this.pendingQuality);
    this.pendingQuality = null;
    this.game.render.setView(null);
    this.stopRumble();
    this.driving?.dispose();
    this.hud?.dispose();
    this.pause?.dispose();
    this.finish?.dispose();
    this.loading?.dispose();
    this.world?.dispose();
    super.exit();
  }

  // ─── Carga ─────────────────────────────────────────────────────────────

  private async load(track: Track): Promise<void> {
    const game = this.game;
    const settings = game.settings;
    try {
      const record = game.save.data.records[track.def.id]?.bestLap ?? null;
      const laps = this.params.mode === 'race' ? (this.params.laps ?? DEFAULT_RACE_LAPS) : null;
      const assists = activeAssists(settings.assists);
      const race = settings.race;
      const rivals = this.params.mode === 'race' ? this.rivalDrivers(this.params.rivals ?? race.rivals) : [];
      const pilot = game.save.data.profile.name;
      // Contrarreloj: el fantasma del récord en línea si se eligió, si no el propio.
      const storedGhost = this.params.mode === 'timeTrial' ? (this.params.rivalGhost?.ghost ?? game.save.data.records[track.def.id]?.ghost) : undefined;
      const session = new Session(
        track,
        F1_SPEC,
        record,
        {
          playerSpec: applyUpgrades(F1_SPEC, game.save.data.workshop.levels),
          mode: this.params.mode,
          laps,
          rivals: { drivers: rivals, difficulty: this.params.difficulty ?? difficultyValue(race) },
          player: { name: pilot, code: playerCode(pilot), number: game.save.data.garage.number },
          ghost: storedGhost ? decodeGhost(storedGhost) : null,
          ...(this.params.startLast ? { startLast: true } : {}),
        },
        assists,
      );
      const livery = liveryFromSetup(game.save.data.garage);
      const world = await RaceWorld.create(session.vehicle, { rivals: rivalCars(session), ghost: session.isTimeTrial, livery }, settings.game.defaultCamera, {
        renderer: game.render.renderer,
        quality: settings.graphics.quality,
        anisotropy: game.render.textureAnisotropy,
        weather: this.params.weather ?? 'sunny',
        onProgress: (progress, stage) => this.loading?.setProgress(progress * 0.9, stage),
        cancelled: () => this.cancelled,
      });
      if (this.cancelled) {
        world.dispose();
        return;
      }
      this.session = session;
      this.world = world;
      world.setHudMirror(settings.game.mirror);
      this.effectCars = session.cars.map((car) => car.vehicle);
      world.raceCamera.shakeEnabled = !prefersReducedMotion();
      world.motionEffects = !prefersReducedMotion();
      world.configureLine(assists.line, assists.lineType);

      // Precompila los shaders con la cámara de presentación (evita tirones al arrancar).
      this.loading?.setProgress(0.95, 'Preparando sombreadores');
      // Primero los ajustes gráficos (p. ej. si el sol proyecta sombras): cambian
      // los sombreadores; aplicados después, todo se volvería a compilar.
      world.onGraphicsChanged(game.render.currentGraphics);
      world.startIntro(this.effectCars);
      world.update(0, 1, session.vehicle.telemetry);
      // También lo que ahora está oculto (trazada apagada, fantasma, rivales lejanos…):
      // que aparezca más tarde no debe dar un tirón por compilar su sombreador.
      const hidden: Object3D[] = [];
      world.scene.traverse((object) => {
        if (!object.visible) {
          hidden.push(object);
          object.visible = true;
        }
      });
      const renderer = game.render.renderer;
      // Para el destino real (lienzo o búfer del posprocesado): si no, cada sombreador se compila dos veces.
      const toCanvas = game.render.drawsToCanvas;
      try {
        await compileScene(renderer, world.scene, world.camera, toCanvas);
      } finally {
        for (const object of hidden) object.visible = false;
      }
      if (this.cancelled) return;
      // Geometría y texturas de todo el circuito a la GPU (sin tirones cuando entran en cuadro).
      this.loading?.setProgress(0.97, 'Subiendo el circuito a la GPU');
      await waitFrames(2);
      if (this.cancelled) return;
      world.prewarm(renderer, toCanvas);
      this.loading?.setProgress(1, 'Listo');
      this.buildInterface(track, session);
      game.render.setView(world);
      // Unos cuadros de verdad detrás de la pantalla de carga (el posprocesado
      // se compila y los búferes se llenan) y recién ahí se descubre la pista.
      await waitFrames(4);
      if (this.cancelled) return;
      await this.loading?.hide();
      this.loading = null;
      if (this.cancelled) return;
      this.startIntro();
    } catch (error) {
      if (error instanceof BuildCancelled || this.cancelled) return;
      console.error('[Carrera] No se pudo cargar el circuito:', error);
      this.showLoadError();
    }
  }

  private showLoadError(): void {
    const back = h('button', { class: 'race__error-button', attrs: { type: 'button' }, text: 'Volver al menú' });
    const panel = h(
      'div',
      { class: 'race__error' },
      h('h2', { text: 'No se pudo cargar el circuito' }),
      h('p', { text: 'Prueba bajar la calidad gráfica en Ajustes. Si sigue fallando, recarga la página.' }),
      back,
    );
    this.root.append(panel);
    this.phase = 'error';
    this.nav.clear();
    this.nav.add(back, { onConfirm: () => void this.game.screens.goTo('menu', undefined) });
    this.nav.focusFirst();
  }

  private buildInterface(track: Track, session: Session): void {
    const settings = this.game.settings;
    this.hud = new Hud(track, settings.game.units);
    this.hud.configure(session.config.laps, hudAssists(session.activeAssists));
    const rivals = session.cars.filter((car) => !car.isPlayer);
    this.botVehicles = rivals.map((car) => car.vehicle);
    this.hud.configureRace(session.order ? { count: session.cars.length, rivalColors: rivals.map((car) => car.team.primary) } : null);
    this.refreshMedalTarget();
    this.rivalDots.length = 0;
    for (let i = 0; i < rivals.length; i++) this.rivalDots.push({ x: 0, z: 0 });
    this.hud.setVisible(false);
    this.pause = new PauseMenu({
      onChoice: (choice) => this.onPauseChoice(choice),
      onMove: () => this.game.playUi('move'),
    });
    this.finish = new FinishPanel({
      onContinue: () => this.openResults(),
      onMove: () => this.game.playUi('move'),
    });
    this.driving = new DrivingInput(
      this.game.input,
      () => this.game.settings.controls,
      () => this.session?.activeAssists.steering ?? false,
    );
    this.own.add(this.driving.onEvent((event) => this.onDrivingEvent(event)));

    const def = track.def;
    const laps = session.config.laps;
    const grid = session.order ? ` · LARGAS P${session.position} DE ${session.cars.length}` : '';
    const round = this.params.championshipRound;
    const kicker = session.isTimeTrial
      ? 'CONTRARRELOJ'
      : laps === null
        ? 'PRÁCTICA LIBRE'
        : round !== undefined
          ? `CAMPEONATO · RONDA ${round + 1} · ${laps} VUELTAS${grid}`
          : `CARRERA · ${laps} VUELTAS${grid}`;
    const pilot = this.game.save.data.profile.name;
    this.introCaptions = {
      flyover: `${def.city}, ${def.country}`,
      grid: session.order ? `La parrilla · ${session.cars.length} autos · largas P${session.position}` : '',
      orbit: `${pilot} · #${this.game.save.data.garage.number}`,
    };
    this.introShot = null;
    this.introCard.replaceChildren(
      h('span', { class: 'race__intro-kicker', text: kicker }),
      h('span', { class: 'race__intro-head' }, createCountryFlag(def.countryCode, 'race__intro-flag'), h('span', { class: 'race__intro-title', text: def.grandPrix })),
      h('span', { class: 'race__intro-track', text: `${def.name} · ${def.country}` }),
      h(
        'span',
        { class: 'race__intro-facts' },
        h('span', {}, h('b', { text: `${def.lengthKm.toFixed(3)} km` }), h('small', { text: 'Longitud' })),
        h('span', {}, h('b', { text: String(def.turns) }), h('small', { text: 'Curvas' })),
        h('span', {}, h('b', { text: formatLapTime(def.lapRecord.seconds) }), h('small', { text: `Récord · ${def.lapRecord.driver} (${def.lapRecord.year})` })),
      ),
      h('span', {
        class: 'race__intro-record',
        text:
          session.timer.personalBest === null
            ? 'Todavía no tienes récord aquí'
            : `Tu récord: ${formatLapTime(session.timer.personalBest)}`,
      }),
      this.introCaption,
    );
    this.skipHint.replaceChildren(
      new ControlHints([{ keys: [{ keyboard: 'ENTER', gamepad: 'A' }], label: 'Saltar' }], this.game.input.lastDevice).element,
    );
    // Las teclas son las elegidas en Ajustes → Controles.
    const keys = this.game.settings.controls.keys;
    this.startHints = new ControlHints(
      [
        { keys: [{ keyboard: keyLabel(keys.throttle), gamepad: 'RT' }], label: 'Acelerar' },
        { keys: [{ keyboard: keyLabel(keys.brake), gamepad: 'LT' }], label: 'Frenar' },
        { keys: [{ keyboard: `${keyLabel(keys.left)}${keyLabel(keys.right)}`, gamepad: 'L' }], label: 'Doblar' },
        { keys: [{ keyboard: keyLabel(keys.drs), gamepad: 'X' }], label: 'DRS' },
        { keys: [{ keyboard: keyLabel(keys.pit), gamepad: '▼' }], label: 'Boxes' },
        { keys: [{ keyboard: keyLabel(keys.camera), gamepad: 'Y' }], label: 'Cámara' },
        { keys: [{ keyboard: keyLabel(keys.mirror), gamepad: '▲' }], label: 'Retrovisor' },
        { keys: [{ keyboard: keyLabel(keys.reset), gamepad: 'SELECT' }], label: 'Volver a pista' },
        { keys: [{ keyboard: 'ESC', gamepad: 'START' }], label: 'Pausa' },
      ],
      this.game.input.lastDevice,
    );
    this.startHints.element.classList.add('race__hints');
    this.own.add(
      this.game.events.on('input:device', ({ device }) => {
        this.startHints?.setDevice(device);
      }),
    );
    this.own.add(
      this.game.events.on('settings:changed', ({ settings: next }) => {
        this.hud?.setUnits(next.game.units);
        // Las ayudas se cambian en caliente (desde la pausa → Ajustes → Ayudas).
        const assists = activeAssists(next.assists);
        this.session?.setAssists(assists);
        this.world?.configureLine(assists.line, assists.lineType);
        this.hud?.configure(session.config.laps, hudAssists(assists));
        this.world?.setHudMirror(next.game.mirror);
        this.mirrorShown = null;
      }),
    );
    // El retrovisor se dibuja en el 3D justo debajo de su marco del HUD: se vuelve a medir al cambiar el tamaño.
    this.own.listen(window, 'resize', () => {
      this.mirrorShown = null;
    });
    // Si la ventana pierde el foco en plena vuelta, se pausa.
    this.own.listen(window, 'blur', () => {
      if (this.phase === 'running') this.setPaused(true);
    });

    this.root.append(this.hud.root, this.introCard, this.skipHint, this.startHints.element, this.pause.root, this.finish.root);
  }

  // ─── Presentación ──────────────────────────────────────────────────────

  private startIntro(): void {
    this.phase = 'intro';
    this.introElapsed = 0;
    const quick = prefersReducedMotion();
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(
      // El rótulo de la toma entra por su cuenta (`updateIntroCaption`).
      [...this.introCard.children].filter((child) => child !== this.introCaption),
      { x: -50, opacity: 0 },
      { x: 0, opacity: 1, duration: quick ? 0.01 : 0.7, stagger: quick ? 0 : 0.12 },
      0.2,
    );
    tl.fromTo(this.skipHint, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.8);
    this.introTimeline = this.own.tween(tl);
  }

  /** Al cambiar de toma, el rótulo cambia con un fundido corto. */
  private updateIntroCaption(shot: IntroShot | null): void {
    if (!shot || shot === this.introShot) return;
    this.introShot = shot;
    const text = this.introCaptions[shot];
    const caption = this.introCaption;
    caption.textContent = text;
    caption.hidden = text === '';
    if (text && !prefersReducedMotion()) this.own.tween(gsap.fromTo(caption, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }));
  }

  private finishIntro(): void {
    if (this.phase !== 'intro' || !this.world || !this.hud) return;
    this.phase = 'running';
    this.governor.reset();
    this.world.endIntro();
    this.driving?.release();
    // Si la entrada del cartel todavía corría, se corta para que no reaparezca.
    this.introTimeline?.kill();
    this.introTimeline = null;
    const quick = prefersReducedMotion();
    this.own.tween(gsap.to([this.introCard, this.skipHint], { opacity: 0, x: -30, duration: quick ? 0.01 : 0.35, ease: 'power2.in' }));
    this.hud.setVisible(true);
    this.hud.reveal();
    // Las teclas, sólo para quien recién empieza: en carrera, mientras espera en la
    // parrilla (se van con la largada); si no, unos segundos.
    const newcomer = this.game.save.data.stats.laps < NEWCOMER_LAPS;
    if (this.startHints && newcomer) {
      const hints = this.startHints.element;
      const tl = gsap.timeline();
      tl.fromTo(hints, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: quick ? 0.01 : 0.5, ease: 'power3.out' }, 0.3);
      if (!this.session?.isRace) tl.to(hints, { opacity: 0, duration: 0.8 }, '+=7');
      this.own.tween(tl);
    }
    // En la parrilla no se ve la trazada (cruzaba los autos de adelante): aparece con la largada.
    this.world.racingLine.setHidden(this.session?.phase === 'grid');
    if (this.daily) {
      const goal = this.daily.goal;
      this.own.timeout(() => this.hud?.message(`DESAFÍO DEL DÍA · ${this.daily?.title.toUpperCase() ?? ''}`, goal, 'gold'), 3200);
    }
    if (this.session?.isRace) {
      this.hud.message('A LA PARRILLA', 'No aceleres hasta que se apaguen las cinco luces', 'info');
    } else if (this.session?.isTimeTrial) {
      const ghost = this.session.ghost;
      const rival = this.params.rivalGhost;
      this.hud.message(
        rival && ghost ? `CONTRA EL RÉCORD · ${rival.name}` : 'CONTRARRELOJ',
        rival && ghost
          ? `Su fantasma (${formatLapTime(ghost.time)}) sale contigo al cruzar la línea`
          : ghost
            ? `Tu fantasma (${formatLapTime(ghost.time)}) sale contigo al cruzar la línea`
            : 'Marca una vuelta válida: será tu fantasma',
        rival && ghost ? 'gold' : 'info',
      );
    } else {
      this.hud.message('A PISTA', 'Vuelta de salida: el cronómetro arranca en la línea de meta', 'info');
      this.own.timeout(() => this.radio('practiceStart'), 1500);
    }
  }

  // ─── Eventos del manejo y de la sesión ─────────────────────────────────

  private onDrivingEvent(event: DrivingEvent): void {
    const world = this.world;
    const session = this.session;
    if (!world || !session) return;
    if (event === 'pause') {
      if (this.phase === 'running') this.setPaused(true);
      else if (this.phase === 'paused' && !this.covered) this.setPaused(false);
      return;
    }
    if (this.phase !== 'running') return;
    switch (event) {
      case 'camera': {
        const mode = world.raceCamera.cycle();
        this.hud?.showCamera(CAMERA_LABELS[mode]);
        this.game.playUi('tab');
        break;
      }
      case 'mirror': {
        const on = !this.game.settings.game.mirror;
        this.game.updateSettings((s) => (s.game.mirror = on));
        this.hud?.showCamera(on ? 'Retrovisor encendido' : 'Retrovisor apagado');
        this.game.playUi('tab');
        break;
      }
      case 'pit': {
        if (!session.pitsOpen || session.phase !== 'running' || session.player.pit) break;
        const on = session.togglePitRequest();
        this.hud?.message(on ? 'BOX, BOX' : 'BOX CANCELADO', on ? 'Entras a boxes al pasar por la entrada (antes de la recta)' : 'Te quedas en pista', on ? 'blue' : 'info');
        this.radio(on ? 'boxBox' : 'boxCancel');
        this.game.playUi('tab');
        break;
      }
      case 'reset': {
        if (session.phase !== 'running' || session.player.pit) break;
        this.handleSessionEvents(session.resetToTrack());
        world.snap();
        this.driving?.release();
        this.hud?.message('DE VUELTA EN PISTA', '', 'info');
        break;
      }
      case 'drs':
        if (this.driving?.drsRequested && !session.vehicle.drsAllowed) {
          // Sólo se abre dentro de una zona: se descarta el pedido.
          if (this.driving) this.driving.drsRequested = false;
          const early = session.isRace && session.timer.lap < 2;
          this.hud?.message(
            'DRS NO DISPONIBLE',
            early
              ? 'En carrera se habilita desde la vuelta 2'
              : session.hasRivals && session.isRace
                ? 'Hay que pasar la detección a menos de 1 s del de adelante'
                : 'Sólo en las zonas marcadas en verde en el mapa',
            'bad',
          );
        }
        break;
    }
  }

  private handleSessionEvents(events: SessionEvent[]): void {
    const hud = this.hud;
    const session = this.session;
    const world = this.world;
    if (!hud || !session || !world) return;
    // La vuelta que termina la carrera se anuncia con la bandera, no como una vuelta más.
    const finishing = events.some((e) => e.kind === 'finished');
    for (const event of events) {
      switch (event.kind) {
        case 'light':
          hud.setLights(event.index + 1);
          world.setStartLights(event.index + 1);
          this.audio.cue('light');
          break;
        case 'lightsOut':
          this.mirrorDelay = MIRROR_AFTER_START;
          hud.lightsOut();
          world.setStartLights(0);
          world.racingLine.setHidden(false);
          this.hideStartHints();
          this.audio.cue('lightsOut');
          if (!session.jumpStart) this.own.timeout(() => this.radio('raceStart'), 1800);
          break;
        case 'gridHint':
          hud.message('¡ESPERA LAS LUCES!', 'Acelera recién cuando se apaguen todas: antes es salida en falso', 'warn');
          break;
        case 'jumpStart':
          hud.message('SALIDA EN FALSO', `+${event.seconds} s de sanción: se suma a tu tiempo final`, 'bad');
          this.game.playUi('locked');
          this.own.timeout(() => this.radio('jumpStart'), 900);
          break;
        case 'reaction': {
          const time = event.time;
          const [label, tone] =
            time < REACTION_GREAT ? (['¡Reacción perfecta!', 'best'] as const) : time < REACTION_GOOD ? (['Buena reacción', 'good'] as const) : (['Reacción lenta', 'info'] as const);
          hud.message(`REACCIÓN ${time.toFixed(3)} s`, label, tone);
          break;
        }
        case 'trackLimits':
          this.onTrackLimits(event.count, event.penalty);
          break;
        case 'pitEntry':
          if (event.index === session.player.index) world.racingLine.setHidden(true);
          break;
        case 'pitService':
          if (event.index === session.player.index) world.showPitStop(session.player.box);
          break;
        case 'pitRelease':
          if (event.index === session.player.index) world.showPitStop(null);
          break;
        case 'pitExit':
          if (event.index === session.player.index) {
            world.racingLine.setHidden(false);
            hud.message('¡DE VUELTA EN PISTA!', `Parada de ${event.time.toFixed(1)} s · neumáticos nuevos`, 'good');
            this.own.timeout(() => this.radio('pitDone'), 600);
            this.carWarned = { tyres: false, wing: false };
          }
          break;
        case 'yellow': {
          const flags = session.flags;
          if (!event.on || !flags || session.phase !== 'running') break;
          const here = flags.sectorOf(session.distance);
          if (event.sector === here || event.sector === (here + 1) % 3) {
            hud.message('BANDERA AMARILLA', `Sector ${event.sector + 1}: hay un auto detenido o afuera. ¡Cuidado!`, 'warn');
          }
          break;
        }
        case 'blue': {
          const lapper = event.index === null ? undefined : session.cars[event.index];
          if (lapper && session.phase === 'running') hud.message('BANDERA AZUL', `Te va a doblar ${lapper.name}: déjalo pasar`, 'blue');
          break;
        }
        case 'lapStarted':
          hud.clearSectors();
          break;
        case 'sector':
          hud.setSector(event.index, event.result);
          break;
        case 'lapCompleted':
          hud.setSector(2, event.sector3);
          if (event.personalBest) this.saveRecord(event.lap.time);
          if (event.lap.valid) this.saveSectors(event.lap.sectors);
          if (!session.isRace) {
            if (event.lap.valid) this.soloLaps++;
            if (event.personalBest) this.soloPersonalBest = true;
          }
          if (event.lap.valid) this.checkDailyLap(event.lap.time);
          if (!finishing) this.announceLap(event.lap.number, event.lap.time, event.lap.valid, event.personalBest, event.bestOfSession);
          break;
        case 'invalidated':
          // El aviso lo da `trackLimits` (advertencias y sanciones); volver a pista avisa por su cuenta.
          break;
        case 'drsZone':
          // Al salir de la zona, el pedido de DRS se cancela.
          if (!event.entered && this.driving) this.driving.drsRequested = false;
          break;
        case 'drsOpened':
          hud.message('DRS ACTIVADO', '', 'good');
          this.audio.cue('drs');
          break;
        case 'drsEnabled':
          this.radio('drsEnabled');
          break;
        case 'drsArmed':
          hud.message('DRS DISPONIBLE', 'A menos de 1 s: ábrelo en la próxima zona', 'good');
          break;
        case 'position':
          if (event.to < event.from) this.overtakes += event.from - event.to;
          this.onPositionChange(event.from, event.to);
          break;
        case 'fastestLap': {
          const car = session.cars[event.index];
          if (!car || !session.hasRivals) break;
          if (car.isPlayer) {
            hud.message('VUELTA RÁPIDA DE LA CARRERA', formatLapTime(event.time), 'best');
            this.own.timeout(() => this.radio('fastestLap'), 1400);
          } else if (session.order && session.order.runners.some((r) => r.lapsDone > 1)) {
            hud.message(`VUELTA RÁPIDA · ${car.code}`, formatLapTime(event.time), 'info');
          }
          break;
        }
        case 'ghostLap':
          this.saveGhost(event.ghost);
          hud.message('NUEVO FANTASMA', `${formatLapTime(event.ghost.time)} · la próxima vuelta corres contra él`, 'best');
          break;
        case 'leaderFinished': {
          const winner = session.cars[event.index];
          if (winner && !winner.isPlayer && session.phase === 'running') {
            hud.message('BANDERA A CUADROS', `${winner.name} gana: termina al cruzar la línea`, 'gold');
          }
          break;
        }
        case 'lastLap':
          hud.message('ÚLTIMA VUELTA', '', 'gold');
          this.own.timeout(() => this.radio('lastLap'), 1200);
          break;
        case 'finished':
          this.onFinished(event.result);
          break;
      }
    }
  }

  /**
   * Las cuatro ruedas afuera. En carrera: advertencia (la última, con bandera
   * blanca y negra) o sanción; fuera de carrera, la vuelta no cuenta para el récord.
   */
  private onTrackLimits(count: number, penalty: number): void {
    const hud = this.hud;
    if (!hud) return;
    if (count === 0) {
      hud.message('LÍMITES DE PISTA', 'Las cuatro ruedas afuera: esta vuelta no cuenta para el récord', 'warn');
      return;
    }
    if (penalty > 0) {
      hud.message(`SANCIÓN +${penalty} s`, 'Límites de pista: se suma a tu tiempo final', 'bad');
      this.game.playUi('locked');
      this.own.timeout(() => this.radio('trackLimitsPenalty'), 900);
    } else if (count === TRACK_LIMIT_WARNINGS) {
      hud.message('BANDERA BLANCA Y NEGRA', `Advertencia ${count} de ${TRACK_LIMIT_WARNINGS}: la próxima salida, +${TIME_PENALTY} s`, 'warn');
      this.own.timeout(() => this.radio('trackLimitsFlag'), 900);
    } else {
      hud.message(`ADVERTENCIA ${count} DE ${TRACK_LIMIT_WARNINGS}`, 'Límites de pista: las cuatro ruedas afuera', 'warn');
      if (count === 1) this.own.timeout(() => this.radio('trackLimitsWarning'), 900);
    }
  }

  /** Las teclas de la largada se van con el semáforo. */
  private hideStartHints(): void {
    const hints = this.startHints?.element;
    if (!hints || Number(getComputedStyle(hints).opacity) === 0) return;
    this.own.tween(gsap.to(hints, { opacity: 0, duration: prefersReducedMotion() ? 0.01 : 0.5, overwrite: true }));
  }

  /** Mensaje y radio al completar una vuelta. */
  private announceLap(number: number, time: number, valid: boolean, personalBest: boolean, bestOfSession: boolean): void {
    const hud = this.hud;
    const session = this.session;
    if (!hud || !session) return;
    const text = formatLapTime(time);
    if (!valid) {
      hud.message(`VUELTA ${number} · ${text}`, 'Con salida de pista: no cuenta para el récord', 'info');
      if (!session.isRace) this.radio('invalidLap');
    } else if (personalBest) {
      hud.message('¡NUEVO RÉCORD PERSONAL!', text, 'best');
      this.radio('personalBest');
    } else if (bestOfSession && number > 1) {
      hud.message('VUELTA RÁPIDA', text, 'best');
      this.radio('goodLap');
    } else {
      hud.message(`VUELTA ${number}`, text, 'info');
      const best = session.timer.bestLap?.time ?? null;
      if (best !== null && time > best + 1.5) this.radio('slowerLap');
    }
  }

  /** Puesto ganado o perdido: el HUD lo marca solo; la radio habla de vez en cuando. */
  private onPositionChange(from: number, to: number): void {
    const session = this.session;
    if (!session || session.phase !== 'running' || session.timer.lap < 1) return;
    const now = performance.now();
    if (to === 1 && from > 1) {
      this.lastPositionRadio = now;
      this.radio('leading');
      return;
    }
    if (now - this.lastPositionRadio < POSITION_RADIO_GAP) return;
    this.lastPositionRadio = now;
    this.radio(to < from ? 'positionGained' : 'positionLost');
  }

  /** Bandera a cuadros: mensaje, radio y, al rato, el panel de fin de carrera. */
  private onFinished(result: RaceResult): void {
    const withRivals = result.starters > 1;
    const daily = this.daily;
    if (daily && daily.kind !== 'medal') {
      const met = dailyCompleted(daily, this.dailyOutcome(result));
      this.own.timeout(
        () => this.hud?.message(met ? '¡DESAFÍO CUMPLIDO!' : 'DESAFÍO NO CUMPLIDO', met ? daily.title : `${daily.goal} Prueba otra vez desde los resultados.`, met ? 'best' : 'bad'),
        1800,
      );
    }
    this.audio.cue('flag');
    this.world?.showCheckeredFlag();
    // Cámara lenta al cruzar la línea (no con "reducir movimiento").
    if (!prefersReducedMotion()) this.slowMotionStart = performance.now();
    const sanction = result.penalty > 0 ? ` · sanción +${result.penalty} s` : '';
    this.hud?.message(
      'BANDERA A CUADROS',
      withRivals ? `Cruzaste P${this.session?.position ?? result.position} de ${result.starters}${sanction}` : `Tiempo total ${formatLapTime(result.totalTime + result.penalty)}${sanction}`,
      'gold',
    );
    const moment: RadioMoment = result.penalty > 0 && withRivals
      ? 'penaltyAtFinish'
      : !withRivals
      ? 'finished'
      : result.position === 1
        ? 'raceWin'
        : result.position <= 3
          ? 'podium'
          : result.position <= 10
            ? 'pointsFinish'
            : 'finished';
    this.own.timeout(() => this.radio(moment), 900);
    if (this.driving) this.driving.drsRequested = false;
    this.pendingFinish = result;
    this.own.timeout(() => this.showFinish(), FINISH_PANEL_DELAY);
  }

  /** Cámara lenta de la llegada: 30 % de velocidad y vuelta gradual a la normal (tiempo real). */
  private updateSlowMotion(): void {
    if (this.slowMotionStart < 0) return;
    const elapsed = (performance.now() - this.slowMotionStart) / 1000;
    if (this.phase === 'paused' || elapsed >= SLOW_MOTION_HOLD + SLOW_MOTION_RAMP) {
      this.stopSlowMotion();
      return;
    }
    const ramp = clamp((elapsed - SLOW_MOTION_HOLD) / SLOW_MOTION_RAMP, 0, 1);
    this.game.loop.timeScale = SLOW_MOTION_SCALE + (1 - SLOW_MOTION_SCALE) * ramp * ramp;
  }

  private stopSlowMotion(): void {
    this.slowMotionStart = -1;
    this.game.loop.timeScale = 1;
  }

  /**
   * Muestra el panel de fin de carrera pendiente. Si el jugador está en pausa,
   * espera a que la cierre; si reinició la carrera, ya no hay nada pendiente.
   */
  private showFinish(): void {
    const result = this.pendingFinish;
    if (!result || this.phase !== 'running' || !this.finish || !this.session) return;
    // Con sanción, la posición final depende de quién cruce la meta dentro de ese tiempo: se espera.
    const pending = this.session.classificationPending;
    if (pending > 0) {
      this.own.timeout(() => this.showFinish(), Math.min(6, pending) * 1000 + 150);
      return;
    }
    result.position = this.session.finalPosition;
    this.pendingFinish = null;
    this.phase = 'results';
    this.driving?.release();
    this.hud?.setVisible(false);
    const personalBest = result.laps.some((lap) => lap.valid && lap.time === this.session?.timer.personalBest);
    // La carrera cuenta en cuanto el jugador recibe la bandera: campeonato y XP se guardan ya.
    this.recordChampionshipRound();
    this.results = this.awardSession(result, personalBest);
    this.finish.show(result, personalBest, this.session.standings(), this.results.award.total);
  }

  /** "Continuar" en el panel final: a los resultados. */
  private openResults(): void {
    if (!this.results) return;
    this.game.playUi('confirm');
    this.phase = 'leaving';
    // El podio con el orden de ahora: los que venían atrás ya pudieron terminar.
    void this.game.screens.goTo('results', { ...this.results, podium: this.podiumEntries() });
  }

  /** Los tres primeros de la carrera (vacío sin rivales), con sus autos. */
  private podiumEntries(): PodiumEntry[] {
    const session = this.session;
    if (!session?.order) return [];
    return session
      .standings()
      .slice(0, 3)
      .flatMap((row) => {
        const car = session.cars[row.index];
        if (!car) return [];
        const livery = car.driver ? liveryOf(car.driver) : liveryFromSetup(this.game.save.data.garage);
        return [{ name: row.name, teamName: row.teamName, teamColor: row.teamColor, livery, isPlayer: row.isPlayer }];
      });
  }

  /**
   * Calcula la XP de la sesión, la suma al guardado (nivel, pase y
   * recompensas) y arma los parámetros de la pantalla de resultados.
   * @param result null en práctica y contrarreloj (se cuentan las vueltas válidas)
   */
  private awardSession(result: RaceResult | null, personalBest: boolean): ResultsParams {
    const session = this.session;
    const settings = this.game.settings;
    const round = this.params.championshipRound;
    const season = this.game.save.data.championship;
    const difficulty = this.params.difficulty ?? difficultyValue(settings.race);
    const playerRow = session?.standings().find((row) => row.isPlayer);
    const withRivals = result !== null && result.starters > 1;
    let championshipPoints: number | null = null;
    let seasonPosition: number | null = null;
    if (result && round !== undefined && season) {
      championshipPoints = season.rounds[round]?.results?.find((entry) => entry.id === PLAYER_ID)?.points ?? pointsFor(result.position);
      // Última carrera: premio según la tabla final.
      if (isFinished(season)) seasonPosition = championshipStandings(season).find((row) => row.id === PLAYER_ID)?.position ?? null;
    }
    const dailyClaim = this.claimDaily(result);
    const award = computeXp(
      {
        mode: this.params.mode,
        position: result?.position ?? 1,
        starters: result?.starters ?? 1,
        laps: result ? (this.params.laps ?? DEFAULT_RACE_LAPS) : this.soloLaps,
        overtakes: this.overtakes,
        fastestLap: withRivals && playerRow?.fastestLap === true,
        clean: result !== null && result.contacts === 0 && result.penalty === 0 && result.laps.every((lap) => lap.valid),
        personalBest: result ? personalBest : this.soloPersonalBest,
        difficulty,
        assistMultiplier: xpMultiplier(settings.assists),
        championshipPoints,
        seasonPosition,
      },
      { difficulty: difficultyLabel(difficulty), assists: LEVEL_INFO[settings.assists.level].name },
      dailyClaim ? [...this.sessionBonuses(), dailyClaim.line] : this.sessionBonuses(),
    );
    const before = snapshotOf(this.game.save.data.progression);
    const gain = applyXp(this.game.save.data.progression, award.total);
    const lapsDriven = result ? result.laps.length : (session?.timer.laps.length ?? 0);
    const trackKm = (this.track?.length ?? 0) / 1000;
    const stats = recordSession(this.game.save.data.stats, {
      mode: this.params.mode,
      trackId: this.params.trackId,
      position: result?.position ?? 1,
      starters: result?.starters ?? 1,
      raceLaps: result ? (this.params.laps ?? DEFAULT_RACE_LAPS) : 0,
      validLaps: result ? result.laps.filter((lap) => lap.valid).length : this.soloLaps,
      distanceKm: lapsDriven * trackKm,
      fastestLap: withRivals && playerRow?.fastestLap === true,
      clean: result !== null && result.contacts === 0 && result.penalty === 0 && result.laps.every((lap) => lap.valid),
      overtakes: this.overtakes,
      difficulty,
      assistMultiplier: xpMultiplier(settings.assists),
      seasonPosition,
    });
    const devPoints = (dailyClaim?.points ?? 0) + devPointsFor({
      mode: this.params.mode,
      position: result?.position ?? 1,
      starters: result?.starters ?? 1,
      laps: result ? (this.params.laps ?? DEFAULT_RACE_LAPS) : this.soloLaps,
      personalBest: result ? personalBest : this.soloPersonalBest,
      difficulty,
      seasonPosition,
    });
    this.game.save.update((data) => {
      data.progression = gain.progression;
      data.stats = stats;
      data.workshop = { ...data.workshop, points: data.workshop.points + devPoints, earned: data.workshop.earned + devPoints };
    });
    const track = this.track?.def;
    const modeLabel =
      this.params.daily
        ? 'Desafío del día'
        : round !== undefined
        ? `Campeonato · Ronda ${round + 1}`
        : this.params.mode === 'race'
          ? 'Carrera rápida'
          : this.params.mode === 'timeTrial'
            ? 'Contrarreloj'
            : 'Práctica libre';
    return {
      race: this.params,
      trackName: track?.grandPrix ?? '',
      modeLabel,
      position: withRivals ? result.position : null,
      starters: result?.starters ?? 1,
      totalTime: result ? result.totalTime + result.penalty : null,
      bestLap: result ? (result.bestLap?.time ?? null) : (session?.timer.bestLap?.time ?? null),
      personalBest: result ? personalBest : this.soloPersonalBest,
      award,
      before,
      after: snapshotOf(gain.progression),
      rewards: gain.rewards,
      devPoints: { gained: devPoints, available: this.game.save.data.workshop.points },
      podium: this.podiumEntries(),
    };
  }

  /**
   * Rivales de la carrera: los de la temporada en el campeonato (siempre los
   * mismos) o una parrilla nueva en la carrera rápida.
   */
  private rivalDrivers(count: number): DriverDef[] {
    const round = this.params.championshipRound;
    const season = this.game.save.data.championship;
    if (round === undefined || !season) return pickRivals(count);
    const byId = new Map(DRIVERS.map((driver) => [driver.id, driver]));
    return season.rivals.flatMap((id) => byId.get(id) ?? []);
  }

  /** Anota la carrera en el campeonato con el orden de llegada (los que siguen en pista, por posición). */
  private recordChampionshipRound(): void {
    const round = this.params.championshipRound;
    const session = this.session;
    if (round === undefined || !session) return;
    const order = session.standings().map((row) => {
      const car = session.cars[row.index];
      return car?.isPlayer ? PLAYER_ID : (car?.driver?.id ?? '');
    });
    this.game.save.update((data) => {
      const season = data.championship;
      if (!season || season.rounds[round]?.results !== null) return;
      data.championship = recordRound(season, round, order.filter((id) => id !== ''));
    });
  }

  /** Mensaje del ingeniero (sin repetir la misma frase dos veces seguidas). */
  private radio(moment: RadioMoment): void {
    if (this.phase === 'leaving' || !this.hud) return;
    const lines = RADIO_LINES[moment];
    const last = this.lastRadioLine.get(moment);
    const options = lines.length > 1 ? lines.filter((line) => line !== last) : lines;
    const line = options[Math.floor(Math.random() * options.length)] ?? lines[0] ?? '';
    this.lastRadioLine.set(moment, line);
    this.hud.radio(ENGINEER_NAME, line);
    this.audio.cue('radio');
  }

  /** Guarda el fantasma de la contrarreloj (sólo si mejora el guardado). */
  private saveGhost(ghost: GhostLap): void {
    const id = this.params.trackId;
    this.game.save.update((data) => {
      const current = data.records[id] ?? { bestLap: null };
      if (current.ghost && current.ghost.time <= ghost.time) return;
      data.records[id] = { ...current, ghost: encodeGhost(ghost) };
    });
  }

  /** Fantasma: repite su vuelta al ritmo del cronómetro de la vuelta en curso. */
  private updateGhost(): void {
    const session = this.session;
    const car = this.world?.ghost;
    if (!session || !car) return;
    const lap = session.ghost;
    if (lap && this.ghostPlayer?.lap !== lap) this.ghostPlayer = new GhostPlayer(lap);
    const timer = session.timer;
    const visible = this.ghostPlayer !== null && timer.lap > 0 && this.ghostPlayer.poseAt(timer.lapTime, this.ghostPose);
    const pose = session.vehicle;
    car.update(visible ? this.ghostPose : null, pose.x, pose.z);
  }

  /** Guarda los mejores sectores del circuito (de cualquier vuelta válida). */
  private saveSectors(sectors: readonly [number, number, number]): void {
    const id = this.params.trackId;
    const current = this.game.save.data.records[id]?.bestSectors;
    const better = sectors.some((time, i) => {
      const best = current?.[i];
      return best === null || best === undefined || time < best;
    });
    if (!better) return;
    this.game.save.update((data) => {
      const record = data.records[id] ?? { bestLap: null };
      const previous = record.bestSectors ?? [null, null, null];
      const merged = sectors.map((time, i) => {
        const best = previous[i];
        return best === null || best === undefined || time < best ? time : best;
      }) as [number, number, number];
      data.records[id] = { ...record, bestSectors: merged };
    });
  }

  private saveRecord(time: number): void {
    const id = this.params.trackId;
    const before = this.game.save.data.records[id]?.bestLap ?? null;
    const def = this.track?.def;
    if (def && (before === null || time < before)) this.announceMedals(medalsEarned(def, before, time), time);
    this.game.save.update((data) => {
      const record = data.records[id];
      const current = record?.bestLap ?? null;
      // Conserva el fantasma guardado (si lo hay); anota las ayudas con que se hizo (tablas de récords).
      if (current === null || time < current) data.records[id] = { ...record, bestLap: time, assists: this.game.settings.assists.level };
    });
  }

  /** ¡Medalla! Aviso en pista y sonido; la XP se suma en los resultados. */
  private announceMedals(earned: readonly Medal[], time: number): void {
    const top = earned[earned.length - 1];
    if (!top) return;
    this.medalsWon.push(...earned);
    const def = this.track?.def;
    const next = def ? nextMedal(def, time) : null;
    const detail = next ? `Próxima: ${MEDAL_INFO[next.medal].label} en ${formatLapTime(next.time)}` : 'La mejor medalla de este circuito';
    // Después del aviso de la vuelta (récord personal), para que se lean los dos.
    this.own.timeout(() => {
      this.hud?.message(`¡MEDALLA DE ${MEDAL_INFO[top].label.toUpperCase()}!`, detail, 'gold');
      this.game.playUi('rewardBig');
    }, 900);
    this.refreshMedalTarget(time);
  }

  /** Fila de la próxima medalla en el HUD: en práctica y contrarreloj (en carrera, la posición importa más). */
  private refreshMedalTarget(best: number | null = this.game.save.data.records[this.params.trackId]?.bestLap ?? null): void {
    const def = this.track?.def;
    if (!this.hud || !def) return;
    const next = this.params.mode === 'race' ? null : nextMedal(def, best);
    this.hud.setMedalTarget(next ? { label: MEDAL_INFO[next.medal].label, color: MEDAL_INFO[next.medal].color, time: next.time } : null);
  }

  /** Premios fijos de la sesión: cada medalla ganada (sin multiplicar por dificultad ni ayudas). */
  private sessionBonuses(): XpLine[] {
    const def = this.track?.def;
    return this.medalsWon.map((medal) => ({
      label: `Medalla de ${MEDAL_INFO[medal].label}`,
      detail: def?.name ?? '',
      xp: MEDAL_INFO[medal].xp,
      color: MEDAL_INFO[medal].color,
    }));
  }

  /** El desafío de una fecha, con la dificultad y los tiempos de este jugador. */
  private dailyFor(date: string): DailyChallenge {
    const data = this.game.save.data;
    return dailyChallenge(date, TRACKS, (id) => data.records[id]?.bestLap, difficultyValue(this.game.settings.race));
  }

  /** Cómo terminó la sesión, para ver si se cumplió el desafío. */
  private dailyOutcome(result: RaceResult | null): { bestLap: number | null; position: number | null; contacts: number; allValid: boolean } {
    const best = result ? result.laps.filter((lap) => lap.valid).reduce<number | null>((min, lap) => (min === null || lap.time < min ? lap.time : min), null) : null;
    return {
      bestLap: this.dailyMet && this.daily?.target !== undefined ? this.daily.target : (best ?? this.session?.timer.bestLap?.time ?? null),
      position: result && result.starters > 1 ? result.position : null,
      contacts: result?.contacts ?? 0,
      allValid: result ? result.laps.every((lap) => lap.valid) : true,
    };
  }

  /** Contrarreloj del desafío: aviso en cuanto una vuelta válida baja el tiempo pedido. */
  private checkDailyLap(time: number): void {
    const daily = this.daily;
    if (!daily || daily.kind !== 'medal' || this.dailyMet || daily.target === undefined || time > daily.target) return;
    this.dailyMet = true;
    this.own.timeout(() => {
      this.hud?.message('¡DESAFÍO CUMPLIDO!', `${daily.title}: vuelve a los resultados para cobrar el premio`, 'best');
      this.game.playUi('rewardBig');
    }, 1600);
  }

  /**
   * Si la sesión cumplió el desafío del día (y todavía no se cobró), anota la
   * racha y devuelve el premio para los resultados.
   */
  private claimDaily(result: RaceResult | null): { line: XpLine; points: number } | null {
    const daily = this.daily;
    const state = this.game.save.data.daily;
    if (!daily || doneToday(state, daily.date) || !dailyCompleted(daily, this.dailyOutcome(result))) return null;
    const next = completeDaily(state, daily.date);
    const reward = dailyReward(next.streak);
    this.game.save.update((data) => {
      data.daily = next;
    });
    const streak = next.streak > 1 ? ` · racha de ${next.streak} días` : '';
    return { line: { label: 'Desafío del día', detail: `${daily.title}${streak}`, xp: reward.xp, color: DAILY_COLOR }, points: reward.points };
  }

  // ─── Rendimiento ───────────────────────────────────────────────────────

  /** Ajuste automático: si el equipo no llega a los FPS, baja resolución y luego calidad. */
  private governPerformance(dt: number): void {
    const graphics = this.game.settings.graphics;
    if (!graphics.autoPerformance || this.pendingQuality) return;
    const decision = this.governor.sample(dt, graphics);
    if (decision) this.applyPerformance(decision);
  }

  private applyPerformance(decision: GovernorDecision): void {
    // Bajar el nivel de calidad recompila todos los sombreadores (un tirón de
    // varios cientos de ms): el nivel nuevo queda para la próxima sesión y en
    // ésta se alivia al instante lo que no recompila nada (sin bloom ni MSAA,
    // sombras más chicas), con la imagen igual de nítida.
    if (decision.kind === 'quality') {
      if (this.pendingQuality) return;
      this.pendingQuality = decision;
      this.game.render.lighten();
      this.hud?.message('RENDIMIENTO', `Efectos aliviados · calidad ${QUALITY_LABELS[decision.quality]} desde la próxima sesión`, 'info');
      return;
    }
    this.commitPerformance(decision);
  }

  private commitPerformance(decision: GovernorDecision): void {
    const lowered = decision.kind === 'quality' || decision.scale < this.game.settings.graphics.resolutionScale;
    this.game.updateSettings((s) => {
      s.graphics.resolutionScale = decision.scale;
      if (decision.kind !== 'quality') return;
      const preset = QUALITY_PRESETS[decision.quality];
      s.graphics.quality = decision.quality;
      // Sólo se apaga lo que el nivel nuevo no incluye: nunca se enciende nada.
      if (preset.shadows === 'off' || (preset.shadows === 'low' && s.graphics.shadows === 'high')) {
        s.graphics.shadows = preset.shadows;
      }
      if (!preset.postprocessing) s.graphics.postprocessing = false;
    });
    // El cambio de nivel (al salir de la pista) ya se avisó cuando se decidió.
    if (lowered && decision.kind === 'resolution') this.hud?.message('RENDIMIENTO', `Resolución al ${Math.round(decision.scale * 100)} %`, 'info');
  }

  // ─── Pausa ─────────────────────────────────────────────────────────────

  private setPaused(paused: boolean): void {
    if (!this.pause || !this.session || !this.track) return;
    if (paused && this.phase === 'running') {
      this.phase = 'paused';
      // La escena queda quieta: se deja de redibujar (la GPU descansa en la pausa).
      if (this.world) this.world.frozen = true;
      this.driving?.release();
      this.audio.setMuted(true);
      this.stopRumble();
      this.game.playUi('confirm');
      this.hud?.setVisible(false);
      const total = this.session.config.laps;
      this.pause.show({
        trackName: this.track.def.name,
        laps: this.session.timer.laps.length,
        totalLaps: total,
        bestLap: this.session.timer.bestLap?.time ?? null,
        ...(this.soloLaps > 0 ? { exitLabel: 'Terminar y ver XP' } : {}),
      });
    } else if (!paused && this.phase === 'paused') {
      this.phase = 'running';
      this.governor.reset();
      if (this.world) this.world.frozen = false;
      this.driving?.release();
      this.audio.setMuted(false);
      this.game.playUi('back');
      this.hud?.setVisible(true);
      void this.pause.hide();
      // Si la bandera cayó y se pausó antes del panel, se muestra ahora.
      if (this.pendingFinish) this.own.timeout(() => this.showFinish(), 700);
    }
  }

  private onPauseChoice(choice: PauseChoice): void {
    switch (choice) {
      case 'resume':
        this.setPaused(false);
        break;
      case 'restart':
        this.restartSession();
        break;
      case 'settings':
        this.game.playUi('confirm');
        void this.game.screens.push('settings', { tab: 'assists' });
        break;
      case 'exit':
        this.game.playUi('confirm');
        // Sin rivales, las vueltas válidas dan XP al terminar la sesión; una carrera a medias no.
        if (this.session && !this.session.isRace && this.soloLaps > 0) {
          this.phase = 'leaving';
          void this.game.screens.goTo('results', this.awardSession(null, false));
        } else {
          void this.game.screens.goTo('menu', undefined);
        }
        break;
    }
  }

  private restartSession(): void {
    const session = this.session;
    const world = this.world;
    if (!session || !world) return;
    session.restart();
    this.pendingFinish = null;
    this.overtakes = 0;
    this.hud?.configureRace(
      session.order ? { count: session.cars.length, rivalColors: session.cars.filter((car) => !car.isPlayer).map((car) => car.team.primary) } : null,
    );
    world.snap();
    world.effects.clear();
    world.hideCheckeredFlag();
    this.stopSlowMotion();
    session.takeContacts(() => undefined);
    world.setStartLights(0);
    this.hud?.setLights(0);
    this.hud?.clearSectors();
    this.driving?.release();
    if (this.phase === 'results') {
      void this.finish?.hide();
      this.phase = 'running';
      this.hud?.setVisible(true);
    } else {
      this.setPaused(false);
    }
    world.racingLine.setHidden(session.phase === 'grid');
    world.showPitStop(null);
    this.carWarned = { tyres: false, wing: false };
    if (session.isRace) this.hud?.message('A LA PARRILLA', 'Nueva largada: no aceleres hasta que se apaguen las luces', 'info');
    else this.hud?.message('SESIÓN REINICIADA', 'Vuelta de salida', 'info');
  }

  // ─── HUD y vibración ───────────────────────────────────────────────────

  /** Equipos de boxes: los de las paradas en curso. */
  private updateCrews(session: Session, world: RaceWorld): void {
    const stops = this.crewStops;
    stops.length = 0;
    for (const car of session.cars) {
      const pit = car.pit;
      if (!pit) continue;
      stops.push({ box: car.box, color: car.team.primary, toBox: pit.toBox, working: pit.phase === 'stop' });
    }
    world.updateCrew(stops);
  }

  /** Motores de los rivales en 3D, oídos desde la cámara. */
  private updateTrafficAudio(world: RaceWorld, session: Session): void {
    if (this.botVehicles.length === 0) return;
    const camera = world.camera;
    camera.getWorldDirection(this.listenerForward);
    this.listenerUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    session.vehicle.worldVelocity(this.listenerVelocity);
    const l = this.listener;
    l.x = camera.position.x;
    l.y = camera.position.y;
    l.z = camera.position.z;
    l.forwardX = this.listenerForward.x;
    l.forwardY = this.listenerForward.y;
    l.forwardZ = this.listenerForward.z;
    l.upX = this.listenerUp.x;
    l.upY = this.listenerUp.y;
    l.upZ = this.listenerUp.z;
    l.vx = this.listenerVelocity.x;
    l.vz = this.listenerVelocity.z;
    this.audio.updateTraffic(l, this.botVehicles);
  }

  /** Torre de posiciones y banderas (4 veces por segundo) y rivales en el minimapa (20 por segundo). */
  private updateRivals(dt: number): void {
    const session = this.session;
    const hud = this.hud;
    if (!session?.order || !hud) return;
    this.standingsTimer -= dt;
    if (this.standingsTimer <= 0) {
      this.standingsTimer = STANDINGS_INTERVAL;
      hud.updateStandings(session.standings());
      this.updateFlags(session, hud);
    }
    this.minimapTimer -= dt;
    if (this.minimapTimer <= 0) {
      this.minimapTimer = MINIMAP_INTERVAL;
      let i = 0;
      for (const car of session.cars) {
        if (car.isPlayer) continue;
        const dot = this.rivalDots[i++];
        if (!dot) continue;
        dot.x = car.vehicle.x;
        dot.z = car.vehicle.z;
      }
      hud.setRivals(this.rivalDots);
    }
  }

  /**
   * Estado del auto (neumáticos, alerón, pedido de boxes) 4 veces por segundo,
   * avisos de radio cuando conviene parar y el panel de la parada en boxes.
   */
  private updateCar(dt: number, session: Session, hud: Hud): void {
    const pit = session.player.pit;
    if (pit) {
      const box = pit.phase === 'stop';
      hud.setPit({
        title: box ? 'PARADA EN BOXES' : pit.phase === 'out' ? 'SALIDA DE BOXES' : 'ENTRANDO A BOXES',
        detail: box
          ? `${pit.serviceLeft.toFixed(1)} s · ${pit.repair ? 'gomas nuevas y alerón' : 'gomas nuevas'}`
          : pit.limited
            ? 'LIMITADOR · 80 km/h'
            : 'El equipo maneja por la calle',
        progress: box ? 1 - pit.serviceLeft / pit.serviceTime : null,
      });
    } else {
      hud.setPit(null);
    }
    this.carTimer -= dt;
    if (this.carTimer > 0) return;
    this.carTimer = 0.25;
    const vehicle = session.vehicle;
    hud.setCar(session.pitsOpen ? { wear: vehicle.tyreWear, damage: vehicle.damage, boxRequested: session.pitRequested } : null);
    // Avisos de radio (una vez hasta la próxima parada), si todavía conviene parar.
    const laps = session.config.laps;
    const lapsLeft = laps === null ? Infinity : laps - session.timer.lap;
    if (!session.pitsOpen || pit || session.pitRequested || session.phase !== 'running' || lapsLeft < 2) return;
    if (!this.carWarned.tyres && vehicle.tyreWear > 0.72) {
      this.carWarned.tyres = true;
      this.radio('tyresWorn');
    } else if (!this.carWarned.wing && vehicle.damage > 0.3) {
      this.carWarned.wing = true;
      this.radio('wingDamage');
    }
  }

  /** Banderas: sectores amarillos en el minimapa y la que le toca al jugador. */
  private updateFlags(session: Session, hud: Hud): void {
    const flags = session.flags;
    if (!flags) return;
    const yellow = flags.yellow.map((left) => left > 0);
    const here = flags.sectorOf(session.distance);
    const next = (here + 1) % yellow.length;
    const running = session.phase === 'running';
    const lapper = flags.blue[session.player.index];
    hud.setFlags({
      yellow,
      yellowHere: !running ? null : yellow[here] ? here : yellow[next] ? next : null,
      blue: running && lapper !== null && lapper !== undefined ? (session.cars[lapper]?.code ?? null) : null,
      blackWhite: running && session.warnings === TRACK_LIMIT_WARNINGS,
    });
  }

  /**
   * Retrovisor de la pantalla: visible en carrera (no en la parrilla, donde
   * está el semáforo) si el jugador lo tiene encendido. El 3D lo dibuja en el
   * rectángulo de su marco; se mide sólo al aparecer o al cambiar el tamaño.
   */
  private updateMirror(dt: number): void {
    const session = this.session;
    const world = this.world;
    const hud = this.hud;
    if (!session || !world || !hud) return;
    // Después de la largada espera a que se vaya el semáforo (ocupa el mismo lugar).
    this.mirrorDelay = Math.max(0, this.mirrorDelay - dt);
    // Con la pausa o el panel final el HUD se oculta: el retrovisor también (si no, quedaría sin marco).
    const visible = this.game.settings.game.mirror && this.phase === 'running' && session.phase !== 'grid' && this.mirrorDelay <= 0 && !session.player.pit;
    if (visible !== this.mirrorShown) {
      this.mirrorShown = visible;
      hud.setMirror(visible);
      if (visible) {
        const glass = hud.mirrorGlass.getBoundingClientRect();
        const canvas = this.game.render.canvas.getBoundingClientRect();
        world.setMirrorRect({ x: glass.left - canvas.left, y: glass.top - canvas.top, width: glass.width, height: glass.height });
        this.mirrorTimer = 0;
      } else {
        world.setMirrorRect(null);
      }
    }
    if (!visible) return;
    // Quién viene detrás (4 veces por segundo).
    this.mirrorTimer -= dt;
    if (this.mirrorTimer > 0) return;
    this.mirrorTimer = 0.25;
    const order = session.order;
    const me = order?.runners[session.player.index];
    const behindIndex = me && order ? order.order[me.position] : undefined;
    const behind = behindIndex === undefined ? undefined : session.cars[behindIndex];
    const gap = behindIndex === undefined || !order ? null : order.interval(behindIndex);
    if (!behind || !gap || gap.laps > 0 || (gap.seconds !== null && gap.seconds > MIRROR_NEAR)) {
      hud.setMirrorBehind(null);
      return;
    }
    hud.setMirrorBehind({ code: behind.code, color: behind.team.primary, gap: gap.seconds });
  }

  private updateHud(dt: number): void {
    const session = this.session;
    const world = this.world;
    const hud = this.hud;
    if (!session || !world || !hud) return;
    this.updateMirror(dt);
    const vehicle = session.vehicle;
    const tel = vehicle.telemetry;
    const timer = session.timer;
    const distance = session.distance;
    const delta = timer.delta(distance);
    const shift = vehicle.spec.shiftRpm;
    hud.update({
      speed: tel.speed,
      gear: tel.gear,
      shift: (tel.rpm - (shift - 3200)) / 3200,
      limiter: tel.limiter,
      throttle: tel.throttle,
      brake: tel.brake,
      drs: session.drsState,
      tcActive: tel.tcActive,
      absActive: tel.absActive,
      brakeAssistActive: session.brakingAssist.active,
      stabilityActive: tel.stabilityActive,
      onGrid: session.phase === 'grid',
      lap: timer.lap,
      lapTime: timer.lap > 0 ? timer.lapTime : null,
      lapValid: timer.valid,
      warnings: session.isRace ? session.warnings : null,
      penalty: session.penalties[session.player.index] ?? 0,
      delta,
      lastLap: timer.lastLap?.time ?? null,
      bestLap: timer.bestLap?.time ?? null,
      personalBest: timer.personalBest,
      x: world.rig.pose.x,
      z: world.rig.pose.z,
      wrongWay: this.phase === 'running' && session.wrongWay,
      position: session.order ? session.position : null,
      slipstream: session.player.slipstream,
    });
    this.updateRivals(dt);
    this.updateCar(dt, session, hud);
    // La pantalla del volante sólo se redibuja si el volante está a la vista.
    if (!world.rig.wheel.root.visible) return;
    const units = this.game.settings.game.units;
    world.rig.wheel.setDisplay({
      gear: tel.gear,
      speed: String(Math.round(units === 'kmh' ? tel.speed * 3.6 : tel.speed * 2.23694)),
      unit: units === 'kmh' ? 'KM/H' : 'MPH',
      delta: delta === null ? '' : `${delta < 0 ? '−' : '+'}${Math.abs(delta).toFixed(2)}`,
      deltaPositive: delta === null ? null : delta > 0,
      drs: session.drsState === 'open',
      position: session.order ? session.position : null,
      cars: session.cars.length,
      lap: Math.max(1, timer.lap),
      totalLaps: session.config.laps,
    });
  }

  /** Vibración del gamepad: pianos, grava y choques. */
  private rumble(surface: number, impact: number): void {
    if (!this.game.settings.controls.vibration) return;
    const pad = this.game.input.gamepad;
    const actuator = pad?.vibrationActuator;
    if (!actuator) return;
    const now = performance.now();
    const strong = clamp(impact / 15, 0, 1);
    const weak = clamp(surface * 0.6, 0, 1);
    if (strong <= 0.02 && weak <= 0.02) return;
    if (now - this.lastRumble < RUMBLE_INTERVAL && strong <= 0.02) return;
    this.lastRumble = now;
    actuator
      .playEffect('dual-rumble', {
        duration: strong > 0.02 ? 220 : RUMBLE_INTERVAL + 30,
        strongMagnitude: strong,
        weakMagnitude: weak,
      })
      .catch(() => undefined);
  }

  private stopRumble(): void {
    const actuator = this.game.input.gamepad?.vibrationActuator;
    actuator?.reset().catch(() => undefined);
  }
}
