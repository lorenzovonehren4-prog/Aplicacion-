/**
 * Sesión en pista con un auto: práctica libre o carrera a N vueltas (en la
 * Fase 4 se suman los rivales). Reúne la física, las ayudas, el cronómetro y
 * las reglas: semáforo de largada, zonas de DRS, límites de pista, volver a
 * pista con R, última vuelta, bandera a cuadros y vuelta de enfriamiento.
 * No sabe nada del DOM ni del 3D: la pantalla de carrera la dibuja.
 */

import { BrakingAssist } from '../assists/BrakingAssist';
import { TRACTION_LEVELS, type ActiveAssists } from '../assists/presets';
import type { SessionMode } from '../core/screens/params';
import type { Track } from '../tracks/Track';
import { LineFollower } from './ai/LineFollower';
import type { DrivingControls } from './input/DrivingInput';
import type { CarSpec } from './physics/CarSpec';
import { Vehicle, type DriverInput } from './physics/Vehicle';
import { LapTimer, type LapEvent, type LapRecord } from './session/LapTimer';
import { StartLights } from './session/StartLights';

export type DrsState = 'off' | 'available' | 'open';

/** grid = en la parrilla con el semáforo · running = en pista · finished = después de la bandera. */
export type SessionPhase = 'grid' | 'running' | 'finished';

export interface SessionConfig {
  mode: SessionMode;
  /** Vueltas de la carrera (null en práctica: sin límite). */
  laps: number | null;
}

export interface RaceResult {
  totalTime: number;
  bestLap: LapRecord | null;
  laps: readonly LapRecord[];
}

export type SessionEvent =
  | LapEvent
  | { kind: 'drsZone'; entered: boolean }
  | { kind: 'drsOpened' }
  | { kind: 'drsEnabled' }
  | { kind: 'light'; index: number }
  | { kind: 'lightsOut' }
  | { kind: 'lastLap' }
  | { kind: 'finished'; result: RaceResult };

/** Velocidad mínima para avisar "sentido contrario" (m/s). */
const WRONG_WAY_SPEED = 4;
/** Distancia hacia atrás a la que se reaparece al volver a pista (m). */
const RESET_BACK = 15;
/** En carrera, el DRS se habilita desde esta vuelta (como en la realidad, no en la largada). */
const DRS_FROM_LAP = 2;
/** Vuelta de enfriamiento: velocidad a la que baja el auto (m/s) y en cuánto tiempo (s). */
const COOLDOWN_SPEED = 22;
const COOLDOWN_TIME = 6;

export class Session {
  readonly vehicle: Vehicle;
  timer: LapTimer;
  lights: StartLights | null = null;
  phase: SessionPhase = 'running';
  result: RaceResult | null = null;
  /** Ayuda de frenado (su `active` ilumina el ícono del HUD). */
  readonly brakingAssist: BrakingAssist;
  private assists: ActiveAssists;
  /** Choque más fuerte desde la última lectura (m/s). */
  private impactPeak = 0;
  private inDrsZone = false;
  private drsWasOpen = false;
  private cooldownTime = 0;
  private readonly cooldown: LineFollower;
  private readonly raw: DriverInput = { throttle: 0, brake: 0, steer: 0, drs: false };
  private readonly assisted: DriverInput = { throttle: 0, brake: 0, steer: 0, drs: false };

  /**
   * @param random para la pausa del semáforo (inyectable en las pruebas)
   */
  constructor(
    readonly track: Track,
    spec: CarSpec,
    private readonly personalBest: number | null,
    readonly config: SessionConfig,
    assists: ActiveAssists,
    private readonly random: () => number = Math.random,
  ) {
    this.vehicle = new Vehicle(spec, track);
    this.brakingAssist = new BrakingAssist(
      { speedAt: (s) => track.centerSpeedAt(s) },
      track.racingLine,
      assists.braking,
    );
    this.assists = assists;
    this.setAssists(assists);
    this.cooldown = new LineFollower(track, { margin: 0.8 });
    this.timer = this.createTimer(personalBest);
    this.start();
  }

  get isRace(): boolean {
    return this.config.mode === 'race';
  }

  /** Metros recorridos desde la línea de meta (0 … longitud). */
  get distance(): number {
    return this.track.geometry.wrapS(this.vehicle.projection.s - this.track.startS);
  }

  get drsState(): DrsState {
    if (this.vehicle.drs > 0.5) return 'open';
    return this.vehicle.drsAllowed ? 'available' : 'off';
  }

  /** ¿El auto va en sentido contrario a la pista? */
  get wrongWay(): boolean {
    const v = this.vehicle;
    if (this.phase !== 'running' || v.speed < WRONG_WAY_SPEED || v.vx < 0) return false;
    const g = this.track.geometry;
    const i = g.wrapIndex(v.projection.index);
    const dot = -Math.sin(v.heading) * (g.tx[i] ?? 0) - Math.cos(v.heading) * (g.tz[i] ?? 0);
    return dot < -0.3;
  }

  get activeAssists(): Readonly<ActiveAssists> {
    return this.assists;
  }

  /** Cambia las ayudas en caliente (desde Ajustes, con la sesión en pausa). */
  setAssists(assists: ActiveAssists): void {
    this.assists = assists;
    this.vehicle.electronics = {
      tractionControl: TRACTION_LEVELS[assists.traction],
      abs: assists.abs,
      stability: assists.steering ? 1 : 0,
    };
    this.brakingAssist.level = assists.braking;
  }

  /** Devuelve y reinicia el pico de impacto acumulado. */
  takeImpact(): number {
    const peak = this.impactPeak;
    this.impactPeak = 0;
    return peak;
  }

  /**
   * Avanza un paso fijo de simulación.
   * @param controls mandos del piloto
   * @param drsRequested el piloto pidió el DRS (se abre si está permitido)
   */
  step(dt: number, controls: DrivingControls, drsRequested: boolean): SessionEvent[] {
    const events: SessionEvent[] = [];
    const v = this.vehicle;
    const raw = this.raw;
    raw.throttle = controls.throttle;
    raw.brake = controls.brake;
    raw.steer = controls.steer;
    raw.drs = drsRequested;

    if (this.phase === 'grid') {
      this.stepGrid(dt, events);
      // En la parrilla el acelerador sólo sube las vueltas del motor.
      v.step(dt, raw);
      return events;
    }

    const distanceBefore = this.distance;
    this.updateDrs(events);

    let input: DriverInput;
    if (this.phase === 'finished') {
      input = this.cooldownInput(dt);
    } else {
      input = this.brakingAssist.apply(raw, v.projection.s, v.vx, this.assisted);
    }
    v.step(dt, input);
    this.impactPeak = Math.max(this.impactPeak, v.telemetry.impact);
    if (!this.drsWasOpen && v.drs > 0.5) events.push({ kind: 'drsOpened' });
    this.drsWasOpen = v.drs > 0.5;

    if (this.phase === 'running') {
      const lapEvents = this.timer.step(this.distance, dt);
      for (const event of lapEvents) {
        events.push(event);
        this.onLapEvent(event, events);
      }
      // Límites de pista: las cuatro ruedas fuera anulan la vuelta.
      if (v.telemetry.wheelsOff >= 4) {
        const event = this.timer.invalidate('trackLimits');
        if (event) events.push(event);
      }
    }
    // Evita cruces falsos si el auto quedó en otro punto (distancia imposible).
    const jump = Math.abs(this.distance - distanceBefore);
    if (jump > 100 && jump < this.track.length - 100) this.timer.teleported();
    return events;
  }

  /** Vuelve a la pista (tecla R): sobre el centro, un poco atrás, detenido. */
  resetToTrack(): SessionEvent[] {
    if (this.phase !== 'running') return [];
    const events: SessionEvent[] = [];
    const invalidated = this.timer.invalidate('reset');
    if (invalidated) events.push(invalidated);
    const g = this.track.geometry;
    this.vehicle.placeAt(g.wrapS(this.vehicle.projection.s - RESET_BACK), 0);
    this.timer.teleported();
    this.impactPeak = 0;
    return events;
  }

  /** Reinicia la sesión: auto en la parrilla y cronómetro a cero. */
  restart(): void {
    this.timer = this.createTimer(this.timer.personalBest ?? this.personalBest);
    this.result = null;
    this.start();
  }

  private start(): void {
    const slot = this.track.gridSlot(0);
    this.vehicle.placeAt(slot.s, slot.d);
    this.inDrsZone = false;
    this.drsWasOpen = false;
    this.impactPeak = 0;
    this.cooldownTime = 0;
    if (this.isRace) {
      this.phase = 'grid';
      this.lights = new StartLights(this.random);
      this.vehicle.held = true;
    } else {
      this.phase = 'running';
      this.lights = null;
      this.vehicle.held = false;
    }
  }

  private stepGrid(dt: number, events: SessionEvent[]): void {
    const lights = this.lights;
    if (!lights) return;
    for (const event of lights.step(dt)) {
      if (event.kind === 'light') {
        events.push({ kind: 'light', index: event.index });
      } else {
        this.vehicle.held = false;
        this.phase = 'running';
        events.push({ kind: 'lightsOut' });
        events.push(this.timer.beginRace());
      }
    }
  }

  private updateDrs(events: SessionEvent[]): void {
    const v = this.vehicle;
    const enabled = !this.isRace || this.timer.lap >= DRS_FROM_LAP;
    const inZone =
      enabled && this.phase === 'running' && this.track.drsZones.some((zone) => this.track.inRange(v.projection.s, zone.start, zone.end));
    if (inZone !== this.inDrsZone) {
      this.inDrsZone = inZone;
      events.push({ kind: 'drsZone', entered: inZone });
    }
    v.drsAllowed = inZone;
  }

  private onLapEvent(event: LapEvent, events: SessionEvent[]): void {
    const laps = this.config.laps;
    if (!this.isRace || laps === null) return;
    if (event.kind === 'lapStarted') {
      if (event.number === DRS_FROM_LAP && laps >= DRS_FROM_LAP) events.push({ kind: 'drsEnabled' });
      if (event.number === laps && laps > 1) events.push({ kind: 'lastLap' });
    } else if (event.kind === 'lapCompleted' && event.lap.number === laps) {
      this.phase = 'finished';
      const recorded = this.timer.laps.slice(0, laps);
      this.result = {
        totalTime: recorded.reduce((sum, lap) => sum + lap.time, 0),
        bestLap: this.timer.bestLap,
        laps: recorded,
      };
      events.push({ kind: 'finished', result: this.result });
    }
  }

  /** Después de la bandera: el auto sigue solo, bajando la velocidad. */
  private cooldownInput(dt: number): DriverInput {
    this.cooldownTime += dt;
    const t = Math.min(1, this.cooldownTime / COOLDOWN_TIME);
    const start = Math.max(COOLDOWN_SPEED, this.vehicle.vx);
    this.cooldown.options.speedCap = start + (COOLDOWN_SPEED - start) * t;
    return this.cooldown.drive(this.vehicle, dt, this.assisted);
  }

  private createTimer(personalBest: number | null): LapTimer {
    const g = this.track.geometry;
    return new LapTimer({
      length: this.track.length,
      sectorEnds: [
        g.wrapS(this.track.sectorEnds[0] - this.track.startS),
        g.wrapS(this.track.sectorEnds[1] - this.track.startS),
      ],
      personalBest,
      lapLimit: this.isRace ? this.config.laps : null,
    });
  }
}
