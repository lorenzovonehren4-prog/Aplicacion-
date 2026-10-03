/**
 * Sesión en pista: práctica libre (sola) o carrera a N vueltas contra bots.
 * Reúne la física, las ayudas, la IA, el cronómetro y las reglas: parrilla y
 * semáforo, zonas de DRS (en carrera, con detección a menos de 1 s del de
 * adelante), rebufo, choques entre autos, límites de pista, volver a pista
 * con R, posiciones e intervalos, bandera a cuadros para todos y vuelta de
 * enfriamiento. No sabe nada del DOM ni del 3D: la pantalla de carrera la dibuja.
 */

import { BrakingAssist } from '../assists/BrakingAssist';
import { SteeringAssist } from '../assists/SteeringAssist';
import { TRACTION_LEVELS, type ActiveAssists } from '../assists/presets';
import type { SessionMode } from '../core/screens/params';
import { PLAYER_TEAM_ID, teamOf, type DriverDef, type TeamDef } from '../data/teams';
import type { Track } from '../tracks/Track';
import { BotDriver, CAR_LENGTH } from './ai/BotDriver';
import { botParams } from './ai/difficulty';
import type { DrivingControls } from './input/DrivingInput';
import { resolveCarCollisions, type CarContact } from './physics/CarCollisions';
import { performanceModel, type CarSpec } from './physics/CarSpec';
import { Vehicle, type DriverInput } from './physics/Vehicle';
import { LapTimer, type LapEvent, type LapRecord } from './session/LapTimer';
import { GhostRecorder, type GhostLap } from './session/Ghost';
import { RaceOrder, type OrderEvent } from './session/RaceOrder';

/** Agarre extra del nivel Principiante (×1,08: como más carga aerodinámica). */
const BEGINNER_GRIP = 1.08;
import { StartLights } from './session/StartLights';

/** off = sin DRS · armed = habilitado para la próxima zona · available = en la zona · open = abierto. */
export type DrsState = 'off' | 'armed' | 'available' | 'open';

/** grid = en la parrilla con el semáforo · running = en pista · finished = después de la bandera. */
export type SessionPhase = 'grid' | 'running' | 'finished';

export interface RivalsConfig {
  drivers: readonly DriverDef[];
  /** Dificultad 0–100. */
  difficulty: number;
}

export interface PlayerIdentity {
  name: string;
  code: string;
  number: number;
}

export interface SessionConfig {
  mode: SessionMode;
  /** Vueltas de la carrera (null en práctica: sin límite). */
  laps: number | null;
  /** Rivales (sólo en carrera). */
  rivals?: RivalsConfig;
  player?: PlayerIdentity;
  /** Contrarreloj: fantasma guardado (la referencia a batir). */
  ghost?: GhostLap | null;
  /** Auto del jugador con sus mejoras (sin esto, el mismo de los rivales). */
  playerSpec?: CarSpec;
  /** El jugador larga último (el desafío de remontada); si no, en la mitad de la parrilla. */
  startLast?: boolean;
}

/** Un auto en pista: el jugador o un bot. */
export interface Competitor {
  readonly index: number;
  readonly vehicle: Vehicle;
  readonly isPlayer: boolean;
  readonly name: string;
  readonly code: string;
  readonly number: number;
  readonly team: TeamDef;
  /** Piloto bot (null para el jugador). */
  readonly driver: DriverDef | null;
  readonly bot: BotDriver | null;
  /** Habilitado para abrir el DRS en la próxima zona (detección a menos de 1 s). */
  drsArmed: boolean;
  /** Intensidad del rebufo (0–1), suavizada. */
  slipstream: number;
  /** Segundos que le quedan como "fantasma" (sin choques) tras volver a la pista. */
  ghost: number;
}

/** Fila de la clasificación o de la tabla de posiciones. */
export interface StandingRow {
  position: number;
  index: number;
  name: string;
  code: string;
  number: number;
  teamName: string;
  teamColor: string;
  isPlayer: boolean;
  finished: boolean;
  /** Vueltas completas. */
  laps: number;
  /** Hora de carrera al recibir la bandera (s). */
  finishTime: number | null;
  /** Intervalo con el de adelante: segundos o vueltas. */
  interval: { seconds: number | null; laps: number };
  /** Diferencia con el líder: segundos o vueltas. */
  gap: { seconds: number | null; laps: number };
  bestLap: number | null;
  /** Tiene la vuelta rápida de la carrera. */
  fastestLap: boolean;
}

export interface RaceResult {
  totalTime: number;
  bestLap: LapRecord | null;
  laps: readonly LapRecord[];
  /** Posición final del jugador (1 si corrió solo). */
  position: number;
  /** Autos en carrera (con el jugador). */
  starters: number;
  /** Choques del jugador con otros autos durante la carrera. */
  contacts: number;
}

export type SessionEvent =
  | LapEvent
  | { kind: 'drsZone'; entered: boolean }
  | { kind: 'drsOpened' }
  | { kind: 'drsEnabled' }
  | { kind: 'drsArmed' }
  | { kind: 'light'; index: number }
  | { kind: 'lightsOut' }
  | { kind: 'lastLap' }
  | { kind: 'position'; from: number; to: number }
  | { kind: 'fastestLap'; index: number; time: number }
  | { kind: 'leaderFinished'; index: number }
  | { kind: 'ghostLap'; ghost: GhostLap }
  | { kind: 'finished'; result: RaceResult };

/** Velocidad mínima para avisar "sentido contrario" (m/s). */
const WRONG_WAY_SPEED = 4;
/** Distancia hacia atrás a la que se reaparece al volver a pista (m). */
const RESET_BACK = 15;
/** En carrera, el DRS se habilita desde esta vuelta (como en la realidad, no en la largada). */
const DRS_FROM_LAP = 2;
/** Intervalo máximo con el de adelante en el punto de detección para ganar el DRS (s). */
const DRS_GAP = 1;
/** Vuelta de enfriamiento: velocidad a la que baja el auto (m/s) y en cuánto tiempo (s). */
const COOLDOWN_SPEED = 22;
const COOLDOWN_TIME = 6;
/** Rebufo: alcance (m) y ancho de la estela (m, desalineación lateral máxima). */
const SLIPSTREAM_RANGE = 45;
const SLIPSTREAM_WIDTH = 1.7;
/** Golpe mínimo (m/s) que cuenta como choque del jugador. */
const CONTACT_SPEED = 1.5;
/** Tiempo sin choques tras volver a la pista (s): así no reaparece encima de nadie. */
const GHOST_TIME = 3.5;
/** Si al terminar el fantasma hay un auto encima, sigue fantasma de a este tiempo (s) hasta quedar libre. */
const GHOST_EXTEND = 0.25;
/** Distancia entre centros (m) desde la que dos autos ya no pueden tocarse (largo de un auto y algo más). */
const GHOST_CLEARANCE = 6.4;

export class Session {
  readonly vehicle: Vehicle;
  /** Todos los autos: el jugador y los bots (en orden de parrilla). */
  readonly cars: Competitor[];
  readonly player: Competitor;
  timer: LapTimer;
  lights: StartLights | null = null;
  phase: SessionPhase = 'running';
  result: RaceResult | null = null;
  /** Orden de carrera (null en práctica o sin rivales). */
  order: RaceOrder | null = null;
  /** Contrarreloj: el fantasma que se muestra (el guardado o la mejor vuelta de hoy). */
  ghost: GhostLap | null;
  /** Ayuda de frenado (su `active` ilumina el ícono del HUD). */
  readonly brakingAssist: BrakingAssist;
  readonly steeringAssist: SteeringAssist;
  private assists: ActiveAssists;
  /** Choque más fuerte desde la última lectura (m/s). */
  private impactPeak = 0;
  /** Choques entre autos desde la última lectura (x, z, velocidad), para las chispas. */
  private readonly contactPoints: number[] = [];
  private inDrsZone = false;
  private drsWasOpen = false;
  private cooldownTime = 0;
  private playerContacts = 0;
  private lastPosition = 0;
  private readonly cooldown: BotDriver;
  private readonly recorder = new GhostRecorder();
  private readonly vehicles: Vehicle[];
  /** Autos que chocan en este paso (los fantasmas no) y los que ven los bots. */
  private readonly solid: boolean[];
  private readonly visible: Vehicle[] = [];
  private readonly contacts: CarContact[] = [];
  private readonly distances: number[];
  private readonly lastS: number[];
  private readonly orderEvents: OrderEvent[] = [];
  private readonly raw: DriverInput = { throttle: 0, brake: 0, steer: 0, drs: false };
  private readonly assisted: DriverInput = { throttle: 0, brake: 0, steer: 0, drs: false };
  private readonly botInput: DriverInput = { throttle: 0, brake: 0, steer: 0, drs: false };

  /**
   * @param random para la pausa del semáforo y los bots (inyectable en las pruebas)
   */
  constructor(
    readonly track: Track,
    spec: CarSpec,
    private readonly personalBest: number | null,
    readonly config: SessionConfig,
    assists: ActiveAssists,
    private readonly random: () => number = Math.random,
  ) {
    const model = performanceModel(spec);
    this.ghost = config.ghost ?? null;
    const identity = config.player ?? { name: 'PILOTO', code: 'PIL', number: 7 };
    this.vehicle = new Vehicle(config.playerSpec ?? spec, track);
    const playerTeam = teamOf({ teamId: PLAYER_TEAM_ID });

    // Bots, ordenados por ritmo: los más rápidos adelante.
    const rivals = config.mode === 'race' ? (config.rivals?.drivers ?? []) : [];
    const difficulty = config.rivals?.difficulty ?? 50;
    const bots = rivals
      .map((driver) => ({ driver, params: botParams(difficulty, driver, random()) }))
      .sort((a, b) => b.params.pace - a.params.pace);
    const grid: Competitor[] = bots.map(({ driver, params }) => {
      const vehicle = new Vehicle(spec, track);
      // Los bots manejan sin ayudas de estabilidad, con electrónica de fábrica.
      vehicle.electronics = { tractionControl: 0.85, abs: true, stability: 0.4 };
      return {
        index: 0,
        vehicle,
        isPlayer: false,
        name: driver.name,
        code: driver.code,
        number: driver.number,
        team: teamOf(driver),
        driver,
        bot: new BotDriver(track, model, params, random),
        drsArmed: false,
        slipstream: 0,
        ghost: 0,
      };
    });
    // El jugador larga en la mitad de la parrilla (o último, si se pide).
    const playerSlot = config.startLast ? grid.length : Math.floor((grid.length + 1) / 2);
    grid.splice(playerSlot, 0, {
      index: 0,
      vehicle: this.vehicle,
      isPlayer: true,
      name: identity.name,
      code: identity.code,
      number: identity.number,
      team: playerTeam,
      driver: null,
      bot: null,
      drsArmed: false,
      slipstream: 0,
      ghost: 0,
    });
    this.cars = grid.map((car, index) => ({ ...car, index }));
    const player = this.cars[playerSlot];
    if (!player) throw new Error('No se pudo ubicar al jugador en la parrilla.');
    this.player = player;
    this.vehicles = this.cars.map((car) => car.vehicle);
    this.solid = this.cars.map(() => true);
    this.distances = this.cars.map(() => 0);
    this.lastS = this.cars.map(() => 0);

    this.brakingAssist = new BrakingAssist(
      { speedAt: (s) => track.centerSpeedAt(s) },
      track.racingLine,
      assists.braking,
    );
    this.steeringAssist = new SteeringAssist(track.geometry, track.racingLine);
    this.assists = assists;
    this.setAssists(assists);
    this.cooldown = new BotDriver(track, model, botParams(40, { skill: 0.84, aggression: 0 }, 0), random);
    this.timer = this.createTimer(personalBest);
    this.start();
  }

  get isRace(): boolean {
    return this.config.mode === 'race';
  }

  get isTimeTrial(): boolean {
    return this.config.mode === 'timeTrial';
  }

  /** ¿Hay rivales en pista? */
  get hasRivals(): boolean {
    return this.cars.length > 1;
  }

  /** Metros recorridos desde la línea de meta (0 … longitud). */
  get distance(): number {
    return this.track.geometry.wrapS(this.vehicle.projection.s - this.track.startS);
  }

  /** Posición actual del jugador (1 si corre solo). */
  get position(): number {
    return this.order?.runners[this.player.index]?.position ?? 1;
  }

  get drsState(): DrsState {
    if (this.vehicle.drs > 0.5) return 'open';
    if (this.vehicle.drsAllowed) return 'available';
    return this.player.drsArmed && this.drsEnabledFor(this.player) ? 'armed' : 'off';
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
      // Principiante: "sobre rieles" (sin derrapes) y algo más de agarre, como con más carga aerodinámica.
      antiSlide: assists.steering ? 1 : 0,
      gripBoost: assists.steering ? BEGINNER_GRIP : 1,
    };
    this.brakingAssist.level = assists.braking;
    this.steeringAssist.enabled = assists.steering;
  }

  /** Devuelve y reinicia el pico de impacto acumulado. */
  takeImpact(): number {
    const peak = this.impactPeak;
    this.impactPeak = 0;
    return peak;
  }

  /** Recorre y vacía los choques entre autos acumulados (punto medio y velocidad). */
  takeContacts(visit: (x: number, z: number, speed: number) => void): void {
    const points = this.contactPoints;
    for (let i = 0; i + 2 < points.length; i += 3) visit(points[i] ?? 0, points[i + 1] ?? 0, points[i + 2] ?? 0);
    points.length = 0;
  }

  /** Tabla de posiciones (del primero al último). Vacía si no hay rivales. */
  standings(): StandingRow[] {
    const order = this.order;
    if (!order) return [];
    return order.order.map((index) => {
      const runner = order.runners[index];
      const car = this.cars[index];
      if (!runner || !car) throw new Error('Orden de carrera inconsistente.');
      return {
        position: runner.position,
        index,
        name: car.name,
        code: car.code,
        number: car.number,
        teamName: car.team.name,
        teamColor: car.team.primary,
        isPlayer: car.isPlayer,
        finished: runner.finished,
        laps: runner.finished ? runner.lapsDone : Math.max(0, runner.lap - 1),
        finishTime: runner.finishTime,
        interval: order.interval(index),
        gap: order.gapToLeader(index),
        bestLap: runner.bestLap,
        fastestLap: order.fastest?.index === index,
      };
    });
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
      for (const car of this.cars) {
        car.vehicle.step(dt, car.bot ? car.bot.grid(this.botInput) : raw);
      }
      return events;
    }

    const distanceBefore = this.distance;
    this.updateDrs(events);
    this.updateSlipstream(dt);

    // ─── Mandos de cada auto ───
    // Los fantasmas no chocan ni cuentan como tráfico para los bots.
    this.visible.length = 0;
    for (const car of this.cars) {
      const wasGhost = car.ghost > 0;
      car.ghost = Math.max(0, car.ghost - dt);
      // El fantasma no termina encima de otro auto: el choque los separaba de golpe.
      if (wasGhost && car.ghost === 0 && this.overlapsAnyone(car)) car.ghost = GHOST_EXTEND;
      this.solid[car.index] = car.ghost <= 0;
      if (car.ghost <= 0) this.visible.push(car.vehicle);
    }
    for (const car of this.cars) {
      const vehicle = car.vehicle;
      let input: DriverInput;
      if (car.isPlayer) {
        input =
          this.phase === 'finished'
            ? this.cooldownInput(dt)
            : this.steeringAssist.apply(this.brakingAssist.apply(raw, v.projection.s, v.vx, this.assisted), v, this.assisted);
      } else if (car.bot) {
        const done = this.order?.runners[car.index]?.finished ?? false;
        input = car.bot.drive(vehicle, dt, this.visible, this.botInput, done ? COOLDOWN_SPEED : Infinity);
        vehicle.held = car.bot.holding;
      } else {
        continue;
      }
      vehicle.step(dt, input);
    }

    // ─── Choques entre autos ───
    if (this.hasRivals) {
      for (const contact of resolveCarCollisions(this.vehicles, this.contacts, this.solid)) {
        const involvesPlayer = contact.a === this.player.index || contact.b === this.player.index;
        if (involvesPlayer && contact.speed > CONTACT_SPEED && this.phase === 'running') this.playerContacts++;
        const a = this.vehicles[contact.a];
        const b = this.vehicles[contact.b];
        // Con tope: si nadie los lee (pausa), no crecen sin límite.
        if (a && b && contact.speed > 1.5 && this.contactPoints.length < 48) this.contactPoints.push((a.x + b.x) / 2, (a.z + b.z) / 2, contact.speed);
      }
      this.recoverStuckBots();
    }
    this.impactPeak = Math.max(this.impactPeak, v.telemetry.impact);
    if (!this.drsWasOpen && v.drs > 0.5) events.push({ kind: 'drsOpened' });
    this.drsWasOpen = v.drs > 0.5;

    // ─── Cronómetro del jugador y orden de carrera ───
    if (this.phase === 'running') {
      const lapEvents = this.timer.step(this.distance, dt);
      for (const event of lapEvents) {
        events.push(event);
        this.onLapEvent(event, events);
      }
      if (this.isTimeTrial && this.timer.lap > 0) this.recorder.record(this.timer.lapTime, v.x, v.z, v.heading);
      // Límites de pista: las cuatro ruedas fuera anulan la vuelta.
      if (v.telemetry.wheelsOff >= 4) {
        const event = this.timer.invalidate('trackLimits');
        if (event) events.push(event);
      }
    }
    this.updateOrder(dt, events);

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
    this.player.ghost = GHOST_TIME;
    this.timer.teleported();
    this.impactPeak = 0;
    return events;
  }

  /** Reinicia la sesión: todos a la parrilla y cronómetro a cero. */
  restart(): void {
    this.timer = this.createTimer(this.timer.personalBest ?? this.personalBest);
    this.result = null;
    this.start();
  }

  private start(): void {
    this.cars.forEach((car, position) => {
      const slot = this.track.gridSlot(position);
      car.vehicle.placeAt(slot.s, slot.d);
      car.drsArmed = false;
      car.slipstream = 0;
      car.ghost = 0;
      car.vehicle.slipstream = 0;
      car.bot?.reset(car.vehicle);
    });
    this.cooldown.reset(null);
    this.inDrsZone = false;
    this.drsWasOpen = false;
    this.impactPeak = 0;
    this.cooldownTime = 0;
    this.playerContacts = 0;
    this.lastPosition = this.player.index + 1;
    this.cars.forEach((car, i) => {
      this.lastS[i] = car.vehicle.projection.s;
      this.distances[i] = this.distanceOf(car.vehicle);
    });
    this.order =
      this.isRace && this.hasRivals && this.config.laps !== null ? new RaceOrder(this.track.length, this.config.laps, this.distances) : null;
    if (this.isRace) {
      this.phase = 'grid';
      this.lights = new StartLights(this.random);
      for (const car of this.cars) car.vehicle.held = true;
    } else {
      this.phase = 'running';
      this.lights = null;
      for (const car of this.cars) car.vehicle.held = false;
    }
  }

  private stepGrid(dt: number, events: SessionEvent[]): void {
    const lights = this.lights;
    if (!lights) return;
    for (const event of lights.step(dt)) {
      if (event.kind === 'light') {
        events.push({ kind: 'light', index: event.index });
      } else {
        // El jugador sale al instante; cada bot, tras su tiempo de reacción.
        this.vehicle.held = false;
        this.phase = 'running';
        events.push({ kind: 'lightsOut' });
        events.push(this.timer.beginRace());
      }
    }
  }

  /** Metros desde la línea de meta de un auto. */
  private distanceOf(vehicle: Vehicle): number {
    return this.track.geometry.wrapS(vehicle.projection.s - this.track.startS);
  }

  /** ¿El DRS está habilitado para este auto? (en carrera, desde la vuelta 2). */
  private drsEnabledFor(car: Competitor): boolean {
    if (!this.isRace) return true;
    const lap = car.isPlayer ? this.timer.lap : (this.order?.runners[car.index]?.lap ?? 0);
    return lap >= DRS_FROM_LAP;
  }

  private updateDrs(events: SessionEvent[]): void {
    const track = this.track;
    const g = track.geometry;
    for (const car of this.cars) {
      const v = car.vehicle;
      const s = v.projection.s;
      const before = this.lastS[car.index] ?? s;
      this.lastS[car.index] = s;
      const enabled = this.drsEnabledFor(car) && this.phase === 'running';
      // Detección: al pasar por el punto, ¿el de adelante está a menos de 1 s?
      if (this.hasRivals && this.isRace) {
        for (const zone of track.drsZones) {
          const crossed = g.deltaS(before, zone.detection) > 0 && g.deltaS(s, zone.detection) <= 0;
          if (!crossed) continue;
          const wasArmed = car.drsArmed;
          car.drsArmed = enabled && this.gapAhead(car) < DRS_GAP;
          if (car.isPlayer && car.drsArmed && !wasArmed) events.push({ kind: 'drsArmed' });
        }
      }
      const zone = track.drsZones.find((z) => track.inRange(s, z.start, z.end));
      const inZone = enabled && zone !== undefined && (!this.hasRivals || !this.isRace || car.drsArmed);
      // Al salir de la zona se pierde la habilitación hasta la próxima detección.
      if (!zone && v.drsAllowed && this.hasRivals) car.drsArmed = false;
      v.drsAllowed = inZone;
      if (car.isPlayer && inZone !== this.inDrsZone) {
        this.inDrsZone = inZone;
        events.push({ kind: 'drsZone', entered: inZone });
      }
    }
  }

  /** Tiempo (s) hasta el auto de adelante en la pista (Infinity si no hay nadie cerca). */
  private gapAhead(car: Competitor): number {
    const g = this.track.geometry;
    const s = car.vehicle.projection.s;
    let nearest = Infinity;
    for (const other of this.cars) {
      if (other === car) continue;
      const ds = g.deltaS(s, other.vehicle.projection.s);
      if (ds > 0 && ds < nearest) nearest = ds;
    }
    return nearest / Math.max(10, car.vehicle.speed);
  }

  /** Rebufo: detrás de otro auto, alineado y en velocidad, menos arrastre. */
  private updateSlipstream(dt: number): void {
    if (!this.hasRivals) return;
    const g = this.track.geometry;
    for (const car of this.cars) {
      const v = car.vehicle;
      let target = 0;
      for (const other of this.cars) {
        if (other === car) continue;
        const ds = g.deltaS(v.projection.s, other.vehicle.projection.s) - CAR_LENGTH;
        if (ds <= 0 || ds > SLIPSTREAM_RANGE) continue;
        const lateral = Math.abs(other.vehicle.projection.d - v.projection.d);
        if (lateral > SLIPSTREAM_WIDTH) continue;
        const strength = (1 - ds / SLIPSTREAM_RANGE) * (1 - lateral / SLIPSTREAM_WIDTH) * Math.min(1, v.speed / 45);
        target = Math.max(target, strength);
      }
      car.slipstream += (target - car.slipstream) * Math.min(1, dt * 3);
      v.slipstream = car.slipstream;
    }
  }

  /** ¿Hay otro auto tan cerca que podrían tocarse (en el mismo tramo de la pista)? */
  private overlapsAnyone(car: Competitor): boolean {
    const v = car.vehicle;
    const g = this.track.geometry;
    for (const other of this.cars) {
      if (other === car) continue;
      const o = other.vehicle;
      if (Math.hypot(o.x - v.x, o.z - v.z) < GHOST_CLEARANCE && Math.abs(g.deltaS(v.projection.s, o.projection.s)) < GHOST_CLEARANCE * 2) return true;
    }
    return false;
  }

  /** Bots detenidos (contra un muro, en la grava): vuelven a la trazada como fantasmas. */
  private recoverStuckBots(): void {
    const g = this.track.geometry;
    for (const car of this.cars) {
      if (!car.bot?.needsReset) continue;
      const s = g.wrapS(car.vehicle.projection.s - 10);
      car.vehicle.placeAt(s, this.track.racingLine.offsetAt(s));
      car.ghost = GHOST_TIME;
      car.bot.recovered();
    }
  }

  private updateOrder(dt: number, events: SessionEvent[]): void {
    const order = this.order;
    if (!order) return;
    this.cars.forEach((car, i) => (this.distances[i] = this.distanceOf(car.vehicle)));
    const orderEvents = order.update(dt, this.distances, this.orderEvents.splice(0));
    for (const event of orderEvents) {
      if (event.kind === 'fastestLap' && event.time !== undefined) {
        events.push({ kind: 'fastestLap', index: event.index, time: event.time });
      } else if (event.kind === 'leaderFinished') {
        events.push({ kind: 'leaderFinished', index: event.index });
      } else if (event.kind === 'finished' && event.index === this.player.index && this.phase === 'running') {
        this.finish(events);
      }
    }
    const position = this.position;
    if (this.phase === 'running' && position !== this.lastPosition) {
      events.push({ kind: 'position', from: this.lastPosition, to: position });
    }
    this.lastPosition = position;
  }

  private onLapEvent(event: LapEvent, events: SessionEvent[]): void {
    if (this.isTimeTrial) {
      this.onTimeTrialLap(event, events);
      return;
    }
    const laps = this.config.laps;
    if (!this.isRace || laps === null) return;
    if (event.kind === 'lapStarted') {
      if (event.number === DRS_FROM_LAP && laps >= DRS_FROM_LAP) events.push({ kind: 'drsEnabled' });
      if (event.number === laps && laps > 1) events.push({ kind: 'lastLap' });
    } else if (event.kind === 'lapCompleted' && event.lap.number === laps && !this.order) {
      // Sin rivales, la carrera termina al completar las vueltas; con rivales decide la bandera.
      this.finish(events);
    }
  }

  /** Contrarreloj: se graba cada vuelta; una válida más rápida que el fantasma pasa a serlo. */
  private onTimeTrialLap(event: LapEvent, events: SessionEvent[]): void {
    if (event.kind === 'lapStarted') {
      this.recorder.start();
    } else if (event.kind === 'lapCompleted' && event.lap.valid && (this.ghost === null || event.lap.time < this.ghost.time)) {
      this.ghost = this.recorder.finish(event.lap.time, this.timer.lastTrace);
      events.push({ kind: 'ghostLap', ghost: this.ghost });
    }
  }

  private finish(events: SessionEvent[]): void {
    this.phase = 'finished';
    const laps = this.config.laps ?? this.timer.laps.length;
    const recorded = this.timer.laps.slice(0, laps);
    this.result = {
      totalTime: recorded.reduce((sum, lap) => sum + lap.time, 0),
      bestLap: this.timer.bestLap,
      laps: recorded,
      position: this.position,
      starters: this.cars.length,
      contacts: this.playerContacts,
    };
    events.push({ kind: 'finished', result: this.result });
  }

  /** Después de la bandera: el auto sigue solo, bajando la velocidad y cuidando el tráfico. */
  private cooldownInput(dt: number): DriverInput {
    this.cooldownTime += dt;
    const t = Math.min(1, this.cooldownTime / COOLDOWN_TIME);
    const start = Math.max(COOLDOWN_SPEED, this.vehicle.vx);
    const cap = start + (COOLDOWN_SPEED - start) * t;
    const input = this.cooldown.drive(this.vehicle, dt, this.visible, this.assisted, cap);
    input.drs = false;
    return input;
  }

  private createTimer(personalBest: number | null): LapTimer {
    const g = this.track.geometry;
    const timer = new LapTimer({
      length: this.track.length,
      sectorEnds: [
        g.wrapS(this.track.sectorEnds[0] - this.track.startS),
        g.wrapS(this.track.sectorEnds[1] - this.track.startS),
      ],
      personalBest,
      lapLimit: this.isRace ? this.config.laps : null,
    });
    // En la contrarreloj el delta se mide contra el fantasma desde la primera vuelta.
    if (this.isTimeTrial && this.ghost) timer.setReference(this.ghost.time, this.ghost.trace);
    return timer;
  }
}
