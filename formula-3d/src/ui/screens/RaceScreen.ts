/**
 * Pantalla de carrera (Fase 2: práctica libre).
 *
 * Estados: carga → presentación (vuelta de cámara, se salta con ENTER/A) →
 * en pista ⇄ pausa. La carga no bloquea la transición: la pantalla aparece
 * enseguida con la barra de progreso real y el circuito se arma por etapas.
 */

import gsap from 'gsap';
import type { Game } from '../../core/Game';
import type { UiAction } from '../../core/input/actions';
import type { RaceParams } from '../../core/screens/params';
import { clamp } from '../../core/utils/math';
import { formatLapTime } from '../../core/utils/format';
import { DrivingInput, type DrivingEvent } from '../../race/input/DrivingInput';
import { F1_SPEC } from '../../race/physics/CarSpec';
import { PracticeSession, type SessionEvent } from '../../race/PracticeSession';
import { RaceAudio, type SurfaceMix } from '../../race/audio/RaceAudio';
import { CAMERA_LABELS } from '../../race/camera/RaceCamera';
import { INTRO_DURATION, RaceWorld } from '../../race/RaceWorld';
import { BuildCancelled } from '../../tracks/TrackBuilder';
import { getTrack } from '../../tracks/registry';
import { Track } from '../../tracks/Track';
import { h, prefersReducedMotion } from '../dom';
import { ControlHints } from '../components/ControlHints';
import { Hud } from '../race/Hud';
import { LoadingOverlay } from '../race/LoadingOverlay';
import { PauseMenu, type PauseChoice } from '../race/PauseMenu';
import { BaseScreen } from './BaseScreen';

type Phase = 'loading' | 'intro' | 'running' | 'paused' | 'error' | 'leaving';

/** Cada cuánto se renueva la vibración del gamepad (ms). */
const RUMBLE_INTERVAL = 90;

export class RaceScreen extends BaseScreen<RaceParams> {
  readonly id = 'race';
  private phase: Phase = 'loading';
  private params: RaceParams = { trackId: 'australia', mode: 'practice' };
  private track: Track | null = null;
  private session: PracticeSession | null = null;
  private world: RaceWorld | null = null;
  private loading: LoadingOverlay | null = null;
  private hud: Hud | null = null;
  private pause: PauseMenu | null = null;
  private driving: DrivingInput | null = null;
  private readonly audio: RaceAudio;
  private readonly surfaces: SurfaceMix = { grass: 0, gravel: 0, kerb: 0 };
  private readonly introCard = h('div', { class: 'race__intro' });
  private readonly skipHint = h('div', { class: 'race__skip' });
  private startHints: ControlHints | null = null;
  private introElapsed = 0;
  private introTimeline: gsap.core.Timeline | null = null;
  private cancelled = false;
  private lastRumble = 0;
  private covered = false;

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
    if (this.phase !== 'running' || !session || !world || !driving) return;
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

    // Los mandos se leen siempre (Start del gamepad sale de la pausa), pero sólo
    // cuentan en pista.
    this.driving?.update(dt, vehicle.speed);
    if (this.phase !== 'running') this.driving?.release();
    if (this.phase === 'intro') {
      this.introElapsed += dt;
      if (this.introElapsed >= INTRO_DURATION) this.finishIntro();
    }

    world.update(dt, this.phase === 'running' ? alpha : 1, tel);

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

    if (this.phase === 'running') {
      const impact = session.takeImpact();
      this.audio.update(tel, this.surfaces, impact);
      if (impact > 3) world.raceCamera.kick(clamp(impact / 20, 0.2, 1.2));
      this.rumble(tel.rumble, impact);
    }

    this.updateHud();
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
    this.game.render.setView(null);
    this.stopRumble();
    this.driving?.dispose();
    this.hud?.dispose();
    this.pause?.dispose();
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
      const session = new PracticeSession(track, F1_SPEC, record);
      const world = await RaceWorld.create(session.vehicle, settings.game.defaultCamera, {
        renderer: game.render.renderer,
        quality: settings.graphics.quality,
        anisotropy: game.render.maxAnisotropy,
        onProgress: (progress, stage) => this.loading?.setProgress(progress * 0.9, stage),
        cancelled: () => this.cancelled,
      });
      if (this.cancelled) {
        world.dispose();
        return;
      }
      this.session = session;
      this.world = world;
      world.raceCamera.shakeEnabled = !prefersReducedMotion();

      // Precompila los shaders con la cámara de presentación (evita tirones al arrancar).
      this.loading?.setProgress(0.95, 'Preparando sombreadores');
      world.startIntro();
      world.update(0, 1, session.vehicle.telemetry);
      const renderer = game.render.renderer;
      if (renderer.extensions.has('KHR_parallel_shader_compile')) {
        await renderer.compileAsync(world.scene, world.camera);
      } else {
        renderer.compile(world.scene, world.camera);
      }
      if (this.cancelled) return;
      this.loading?.setProgress(1, 'Listo');
      this.buildInterface(track, session);
      game.render.setView(world);
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

  private buildInterface(track: Track, session: PracticeSession): void {
    const settings = this.game.settings;
    this.hud = new Hud(track, settings.game.units);
    this.hud.setVisible(false);
    this.pause = new PauseMenu({
      onChoice: (choice) => this.onPauseChoice(choice),
      onMove: () => this.game.playUi('move'),
    });
    this.driving = new DrivingInput(this.game.input, () => this.game.settings.controls);
    this.own.add(this.driving.onEvent((event) => this.onDrivingEvent(event)));

    const def = track.def;
    this.introCard.replaceChildren(
      h('span', { class: 'race__intro-kicker', text: 'PRÁCTICA LIBRE' }),
      h('span', { class: 'race__intro-title', text: def.grandPrix }),
      h('span', { class: 'race__intro-track', text: `${def.name} · ${def.lengthKm.toFixed(3)} km` }),
      h('span', {
        class: 'race__intro-record',
        text:
          session.timer.personalBest === null
            ? 'Todavía no tienes récord aquí'
            : `Tu récord: ${formatLapTime(session.timer.personalBest)}`,
      }),
    );
    this.skipHint.replaceChildren(
      new ControlHints([{ keys: [{ keyboard: 'ENTER', gamepad: 'A' }], label: 'Saltar' }], this.game.input.lastDevice).element,
    );
    this.startHints = new ControlHints(
      [
        { keys: [{ keyboard: '↑', gamepad: 'RT' }], label: 'Acelerar' },
        { keys: [{ keyboard: '↓', gamepad: 'LT' }], label: 'Frenar' },
        { keys: [{ keyboard: '←→', gamepad: 'L' }], label: 'Doblar' },
        { keys: [{ keyboard: 'D', gamepad: 'X' }], label: 'DRS' },
        { keys: [{ keyboard: 'C', gamepad: 'Y' }], label: 'Cámara' },
        { keys: [{ keyboard: 'R', gamepad: 'SELECT' }], label: 'Volver a pista' },
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
      }),
    );
    // Si la ventana pierde el foco en plena vuelta, se pausa.
    this.own.listen(window, 'blur', () => {
      if (this.phase === 'running') this.setPaused(true);
    });

    this.root.append(this.hud.root, this.introCard, this.skipHint, this.startHints.element, this.pause.root);
  }

  // ─── Presentación ──────────────────────────────────────────────────────

  private startIntro(): void {
    this.phase = 'intro';
    this.introElapsed = 0;
    const quick = prefersReducedMotion();
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(
      this.introCard.children,
      { x: -50, opacity: 0 },
      { x: 0, opacity: 1, duration: quick ? 0.01 : 0.7, stagger: quick ? 0 : 0.12 },
      0.2,
    );
    tl.fromTo(this.skipHint, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.8);
    this.introTimeline = this.own.tween(tl);
  }

  private finishIntro(): void {
    if (this.phase !== 'intro' || !this.world || !this.hud) return;
    this.phase = 'running';
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
    this.hud.message('A PISTA', 'Vuelta de salida: el cronómetro arranca en la línea de meta', 'info');
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
          this.hud?.message('DRS NO DISPONIBLE', 'Sólo en las zonas marcadas en verde en el mapa', 'bad');
        }
        break;
    }
  }

  private handleSessionEvents(events: SessionEvent[]): void {
    const hud = this.hud;
    if (!hud) return;
    for (const event of events) {
      switch (event.kind) {
        case 'lapStarted':
          hud.clearSectors();
          break;
        case 'sector':
          hud.setSector(event.index, event.result);
          break;
        case 'lapCompleted': {
          hud.setSector(2, event.sector3);
          const time = formatLapTime(event.lap.time);
          if (!event.lap.valid) hud.message(`VUELTA ${event.lap.number} · ${time}`, 'Anulada: no cuenta para el récord', 'bad');
          else if (event.personalBest) {
            hud.message('¡NUEVO RÉCORD PERSONAL!', time, 'best');
            this.saveRecord(event.lap.time);
          } else if (event.bestOfSession) hud.message('MEJOR VUELTA DE LA SESIÓN', time, 'good');
          else hud.message(`VUELTA ${event.lap.number}`, time, 'info');
          break;
        }
        case 'invalidated':
          if (event.reason === 'trackLimits') hud.message('VUELTA ANULADA', 'Límites de pista: las cuatro ruedas afuera', 'bad');
          break;
        case 'drsZone':
          // Al salir de la zona, el pedido de DRS se cancela.
          if (!event.entered && this.driving) this.driving.drsRequested = false;
          break;
      }
    }
  }

  private saveRecord(time: number): void {
    const id = this.params.trackId;
    this.game.save.update((data) => {
      const current = data.records[id]?.bestLap ?? null;
      if (current === null || time < current) data.records[id] = { bestLap: time };
    });
  }

  // ─── Pausa ─────────────────────────────────────────────────────────────

  private setPaused(paused: boolean): void {
    if (!this.pause || !this.session || !this.track) return;
    if (paused && this.phase === 'running') {
      this.phase = 'paused';
      this.driving?.release();
      this.audio.setMuted(true);
      this.stopRumble();
      this.game.playUi('confirm');
      this.hud?.setVisible(false);
      this.pause.show({
        trackName: this.track.def.name,
        laps: this.session.timer.laps.length,
        bestLap: this.session.timer.bestLap?.time ?? null,
      });
    } else if (!paused && this.phase === 'paused') {
      this.phase = 'running';
      this.driving?.release();
      this.audio.setMuted(false);
      this.game.playUi('back');
      this.hud?.setVisible(true);
      void this.pause.hide();
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
        void this.game.screens.push('settings', { tab: 'controls' });
        break;
      case 'exit':
        this.game.playUi('confirm');
        void this.game.screens.goTo('menu', undefined);
        break;
    }
  }

  private restartSession(): void {
    const session = this.session;
    const world = this.world;
    if (!session || !world) return;
    session.restart();
    world.snap();
    this.hud?.clearSectors();
    this.setPaused(false);
    this.hud?.message('SESIÓN REINICIADA', 'Vuelta de salida', 'info');
  }

  // ─── HUD y vibración ───────────────────────────────────────────────────

  private updateHud(): void {
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
    });
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
