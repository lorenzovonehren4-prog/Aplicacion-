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
import { applyXp, computeXp, snapshotOf } from '../../progression/xp';
import { recordSession } from '../../progression/career';
import type { RivalCar } from '../../race/render/RivalFleet';
import { DrivingInput, type DrivingEvent } from '../../race/input/DrivingInput';
import { F1_SPEC } from '../../race/physics/CarSpec';
import { Session, type RaceResult, type SessionEvent } from '../../race/Session';
import { RaceAudio, type SurfaceMix } from '../../race/audio/RaceAudio';
import type { Listener } from '../../race/audio/BotEngines';
import { decodeGhost, encodeGhost, GhostPlayer, type GhostLap, type GhostPose } from '../../race/session/Ghost';
import type { Vehicle } from '../../race/physics/Vehicle';
import { CAMERA_LABELS } from '../../race/camera/RaceCamera';
import { RaceWorld, type IntroShot } from '../../race/RaceWorld';
import { BuildCancelled } from '../../tracks/TrackBuilder';
import { getTrack } from '../../tracks/registry';
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
  /** Resultados listos (XP ya sumada) para la pantalla siguiente. */
  private results: ResultsParams | null = null;
  private readonly ghostPose: GhostPose = { x: 0, z: 0, heading: 0 };

  constructor(game: Game) {
    super(game, 'screen--race');
    this.audio = new RaceAudio(game.audio);
    this.own.add(() => this.audio.dispose());
  }

  enter(params: RaceParams): void {
    this.params = params;
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
    if (simulating) session.takeContacts(this.contactBurst);
    world.updateEffects(dt, this.effectCars, simulating);

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
      const storedGhost = this.params.mode === 'timeTrial' ? game.save.data.records[track.def.id]?.ghost : undefined;
      const session = new Session(
        track,
        F1_SPEC,
        record,
        {
          mode: this.params.mode,
          laps,
          rivals: { drivers: rivals, difficulty: this.params.difficulty ?? difficultyValue(race) },
          player: { name: pilot, code: playerCode(pilot), number: game.save.data.garage.number },
          ghost: storedGhost ? decodeGhost(storedGhost) : null,
        },
        assists,
      );
      const livery = liveryFromSetup(game.save.data.garage);
      const world = await RaceWorld.create(session.vehicle, { rivals: rivalCars(session), ghost: session.isTimeTrial, livery }, settings.game.defaultCamera, {
        renderer: game.render.renderer,
        quality: settings.graphics.quality,
        anisotropy: game.render.maxAnisotropy,
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
      this.effectCars = session.cars.map((car) => car.vehicle);
      world.raceCamera.shakeEnabled = !prefersReducedMotion();
      world.motionEffects = !prefersReducedMotion();
      world.configureLine(assists.line, assists.lineType);

      // Precompila los shaders con la cámara de presentación (evita tirones al arrancar).
      this.loading?.setProgress(0.95, 'Preparando sombreadores');
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
      try {
        if (renderer.extensions.has('KHR_parallel_shader_compile')) {
          await renderer.compileAsync(world.scene, world.camera);
        } else {
          renderer.compile(world.scene, world.camera);
        }
      } finally {
        for (const object of hidden) object.visible = false;
      }
      if (this.cancelled) return;
      // Geometría y texturas de todo el circuito a la GPU (sin tirones cuando entran en cuadro).
      this.loading?.setProgress(0.97, 'Subiendo el circuito a la GPU');
      await waitFrames(2);
      if (this.cancelled) return;
      world.prewarm(renderer);
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
        { keys: [{ keyboard: keyLabel(keys.camera), gamepad: 'Y' }], label: 'Cámara' },
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
      }),
    );
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
    if (this.startHints) {
      const hints = this.startHints.element;
      const tl = gsap.timeline();
      tl.fromTo(hints, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: quick ? 0.01 : 0.5, ease: 'power3.out' }, 0.3);
      tl.to(hints, { opacity: 0, duration: 0.8 }, '+=7');
      this.own.tween(tl);
    }
    if (this.session?.isRace) {
      this.hud.message('A LA PARRILLA', 'Acelera para subir las vueltas del motor y espera las luces', 'info');
    } else if (this.session?.isTimeTrial) {
      const ghost = this.session.ghost;
      this.hud.message(
        'CONTRARRELOJ',
        ghost ? `Tu fantasma (${formatLapTime(ghost.time)}) sale contigo al cruzar la línea` : 'Marca una vuelta válida: será tu fantasma',
        'info',
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
      case 'reset': {
        if (session.phase !== 'running') break;
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
          hud.lightsOut();
          world.setStartLights(0);
          this.audio.cue('lightsOut');
          this.own.timeout(() => this.radio('raceStart'), 1800);
          break;
        case 'lapStarted':
          hud.clearSectors();
          break;
        case 'sector':
          hud.setSector(event.index, event.result);
          break;
        case 'lapCompleted':
          hud.setSector(2, event.sector3);
          if (event.personalBest) this.saveRecord(event.lap.time);
          if (!session.isRace) {
            if (event.lap.valid) this.soloLaps++;
            if (event.personalBest) this.soloPersonalBest = true;
          }
          if (!finishing) this.announceLap(event.lap.number, event.lap.time, event.lap.valid, event.personalBest, event.bestOfSession);
          break;
        case 'invalidated':
          if (event.reason === 'trackLimits') hud.message('VUELTA ANULADA', 'Límites de pista: las cuatro ruedas afuera', 'bad');
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

  /** Mensaje y radio al completar una vuelta. */
  private announceLap(number: number, time: number, valid: boolean, personalBest: boolean, bestOfSession: boolean): void {
    const hud = this.hud;
    const session = this.session;
    if (!hud || !session) return;
    const text = formatLapTime(time);
    if (!valid) {
      hud.message(`VUELTA ${number} · ${text}`, 'Anulada: no cuenta para el récord', 'bad');
      this.radio('invalidLap');
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
    this.audio.cue('flag');
    this.world?.showCheckeredFlag();
    // Cámara lenta al cruzar la línea (no con "reducir movimiento").
    if (!prefersReducedMotion()) this.slowMotionStart = performance.now();
    this.hud?.message(
      'BANDERA A CUADROS',
      withRivals ? `Terminaste P${result.position} de ${result.starters}` : `Tiempo total ${formatLapTime(result.totalTime)}`,
      'gold',
    );
    const moment: RadioMoment = !withRivals
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
    const award = computeXp(
      {
        mode: this.params.mode,
        position: result?.position ?? 1,
        starters: result?.starters ?? 1,
        laps: result ? (this.params.laps ?? DEFAULT_RACE_LAPS) : this.soloLaps,
        overtakes: this.overtakes,
        fastestLap: withRivals && playerRow?.fastestLap === true,
        clean: result !== null && result.contacts === 0 && result.laps.every((lap) => lap.valid),
        personalBest: result ? personalBest : this.soloPersonalBest,
        difficulty,
        assistMultiplier: xpMultiplier(settings.assists),
        championshipPoints,
        seasonPosition,
      },
      { difficulty: difficultyLabel(difficulty), assists: LEVEL_INFO[settings.assists.level].name },
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
      clean: result !== null && result.contacts === 0 && result.laps.every((lap) => lap.valid),
      overtakes: this.overtakes,
      difficulty,
      assistMultiplier: xpMultiplier(settings.assists),
      seasonPosition,
    });
    this.game.save.update((data) => {
      data.progression = gain.progression;
      data.stats = stats;
    });
    const track = this.track?.def;
    const modeLabel =
      round !== undefined
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
      totalTime: result?.totalTime ?? null,
      bestLap: result ? (result.bestLap?.time ?? null) : (session?.timer.bestLap?.time ?? null),
      personalBest: result ? personalBest : this.soloPersonalBest,
      award,
      before,
      after: snapshotOf(gain.progression),
      rewards: gain.rewards,
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

  private saveRecord(time: number): void {
    const id = this.params.trackId;
    this.game.save.update((data) => {
      const record = data.records[id];
      const current = record?.bestLap ?? null;
      // Conserva el fantasma guardado (si lo hay).
      if (current === null || time < current) data.records[id] = { ...record, bestLap: time };
    });
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
    // varios cientos de ms): en carrera sólo se toca la resolución y el nivel
    // nuevo queda para la próxima sesión.
    if (decision.kind === 'quality') {
      if (this.pendingQuality) return;
      this.pendingQuality = decision;
      this.hud?.message('RENDIMIENTO', `Calidad ${QUALITY_LABELS[decision.quality]} desde la próxima sesión`, 'info');
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
    if (session.isRace) this.hud?.message('A LA PARRILLA', 'Nueva largada: espera las luces', 'info');
    else this.hud?.message('SESIÓN REINICIADA', 'Vuelta de salida', 'info');
  }

  // ─── HUD y vibración ───────────────────────────────────────────────────

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

  /** Torre de posiciones (4 veces por segundo) y rivales en el minimapa (20 por segundo). */
  private updateRivals(dt: number): void {
    const session = this.session;
    const hud = this.hud;
    if (!session?.order || !hud) return;
    this.standingsTimer -= dt;
    if (this.standingsTimer <= 0) {
      this.standingsTimer = STANDINGS_INTERVAL;
      hud.updateStandings(session.standings());
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

  private updateHud(dt: number): void {
    const session = this.session;
    const world = this.world;
    const hud = this.hud;
    if (!session || !world || !hud) return;
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
    // La pantalla del volante sólo se redibuja si el volante está a la vista.
    if (!world.rig.wheel.root.visible) return;
    const units = this.game.settings.game.units;
    world.rig.wheel.setDisplay({
      gear: tel.gear,
      speed: String(Math.round(units === 'kmh' ? tel.speed * 3.6 : tel.speed * 2.23694)),
      delta: delta === null ? '' : `${delta < 0 ? '−' : '+'}${Math.abs(delta).toFixed(2)}`,
      deltaPositive: delta === null ? null : delta > 0,
      drs: session.drsState === 'open',
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
