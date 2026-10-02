/**
 * Física del monoplaza (arcade-simulación). Ver PLAN.md §5.2.
 *
 * Modelo de bicicleta dinámico en el plano (eje delantero y trasero) con:
 * - neumáticos con curva de saturación tipo Pacejka y círculo de fricción,
 * - carga aerodinámica (más agarre cuanto más rápido) y transferencia de carga,
 * - motor con curva de potencia + caja automática de 8 marchas,
 * - superficie bajo cada rueda (asfalto, piano, pasto, grava…) con su agarre y
 *   arrastre: una rueda en el pasto tira del auto hacia afuera,
 * - control de tracción y ABS como "electrónica" del auto (las ayudas de la
 *   Fase 3 ajustan su nivel),
 * - choques contra muros con impulso, rebote bajo y fricción.
 *
 * Convenciones (ISO): x adelante, y izquierda, guiñada positiva = giro a la
 * izquierda. En el mundo, rumbo 0 mira a −Z y `heading` es la rotación Y.
 * Se integra a paso fijo (120 Hz) con dos subpasos.
 */

import type { SurfaceType } from '../../tracks/Trackside';
import type { Track } from '../../tracks/Track';
import type { TrackProjection } from '../../tracks/TrackGeometry';
import type { CarSpec } from './CarSpec';
import { powerCurve } from './CarSpec';
import { Gearbox } from './Gearbox';
import type { GearboxInputs } from './Gearbox';

export interface DriverInput {
  /** 0–1 */
  throttle: number;
  /** 0–1 */
  brake: number;
  /** −1 (izquierda) a 1 (derecha). */
  steer: number;
  /** El piloto quiere el DRS abierto (las reglas deciden si puede). */
  drs: boolean;
}

export interface Electronics {
  /** Control de tracción: 0 = apagado, 1 = no patina nunca. */
  tractionControl: number;
  abs: boolean;
  /**
   * Control de estabilidad (0–1): cuando la cola se va, aplica un momento que
   * la endereza. Es la "dirección asistida más estable" del nivel Principiante.
   */
  stability: number;
  /**
   * Anti-derrape (0–1): quita la velocidad lateral que no acompaña al giro
   * (la que hace deslizar la cola), como si el auto fuera sobre rieles. 0 =
   * física normal. Lo usa el nivel Principiante.
   */
  antiSlide?: number;
  /**
   * Agarre extra (multiplicador ≥ 1): simula más carga aerodinámica para que
   * el auto se "pegue" al piso en las curvas. 1 = auto normal.
   */
  gripBoost?: number;
}

/** Agarre relativo, arrastre y vibración de cada superficie. */
const SURFACES: Readonly<Record<SurfaceType, { grip: number; drag: number; rumble: number }>> = {
  asphalt: { grip: 1, drag: 0, rumble: 0 },
  kerb: { grip: 0.93, drag: 0.006, rumble: 1 },
  tarmac: { grip: 0.94, drag: 0.004, rumble: 0.05 },
  grass: { grip: 0.52, drag: 0.09, rumble: 0.35 },
  gravel: { grip: 0.42, drag: 0.85, rumble: 0.9 },
  wall: { grip: 0.9, drag: 0, rumble: 0 },
};

export interface WheelState {
  /** Posición en el mundo. */
  x: number;
  z: number;
  surface: SurfaceType;
  projection: TrackProjection;
  /** Carga vertical (N). */
  load: number;
}

/** Datos que leen cámara, sonido, HUD y efectos. */
export interface Telemetry {
  speed: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
  /** Aceleraciones en ejes del auto (m/s²): x adelante, y izquierda. */
  ax: number;
  ay: number;
  /** 0–1: cuánto patinan las traseras / se bloquean las ruedas / derrapa el auto. */
  wheelspin: number;
  lockup: number;
  slide: number;
  /** 0–1: vibración de pianos o grava bajo las ruedas. */
  rumble: number;
  /** ¿Cuántas ruedas están fuera del asfalto y los pianos? */
  wheelsOff: number;
  /** Actúan las ayudas en este instante (para iluminar sus íconos). */
  tcActive: boolean;
  absActive: boolean;
  stabilityActive: boolean;
  /** Velocidad de un impacto contra un muro en este paso (m/s, 0 = ninguno). */
  impact: number;
  /** Rueda con el rev limiter (corte). */
  limiter: boolean;
}

const SUBSTEPS = 2;
/** Por debajo de esta velocidad el giro pasa a ser cinemático (sin inestabilidad numérica). */
const KINEMATIC_SPEED = 4;
const WALL_RESTITUTION = 0.18;
const WALL_FRICTION = 0.32;
/** Giro máximo que puede provocar un solo impacto (rad/s): el auto real absorbe energía. */
const MAX_IMPACT_SPIN = 2.2;
/** Desde qué rapidez actúa el limitador de dirección (m/s), en cuánto entra del todo y cuánto del pico de deriva deja usar. */
const STEER_GUARD_FROM = 12;
const STEER_GUARD_RAMP = 14;
const STEER_GUARD_REACH = 1;
/** Rapidez (1/s) con la que el control de estabilidad corrige la guiñada. */
const STABILITY_GAIN = 7;
/** Rapidez (1/s) con la que el anti-derrape quita el deslizamiento lateral. */
const ANTI_SLIDE_RATE = 12;
/** Fracción de la deriva del pico de agarre trasero que el anti-derrape deja usar. */
const ANTI_SLIDE_KEEP = 0.6;
/** Puntos del contorno del auto relativos al CG, en pares (x adelante, y izquierda). */
const HULL: readonly number[] = [
  3.1, 0.95,
  3.1, -0.95,
  1.95, 1.0,
  1.95, -1.0,
  0, 0.78,
  0, -0.78,
  -1.62, 0.98,
  -1.62, -0.98,
  -2.5, 0.5,
  -2.5, -0.5,
];

export class Vehicle {
  /** Posición del centro de gravedad. */
  x = 0;
  z = 0;
  /** Rumbo (rotación Y): 0 = mirando a −Z. */
  heading = 0;
  /** Velocidad en ejes del auto (m/s). */
  vx = 0;
  vy = 0;
  /** Velocidad de guiñada (rad/s, + izquierda). */
  yawRate = 0;
  /** Ángulo de las ruedas delanteras (rad, + izquierda). */
  steerAngle = 0;
  /** 0–1: apertura del flap del DRS. */
  drs = 0;
  /** El DRS está permitido en este momento (zona de DRS). La fijan las reglas. */
  drsAllowed = false;
  /** 0–1: reducción de arrastre por ir en el rebufo de otro auto (Fase 4). */
  slipstream = 0;
  /** Giro acumulado de las ruedas (rad) para dibujarlas. */
  wheelSpinFront = 0;
  wheelSpinRear = 0;
  /** Proyección del CG sobre la pista. */
  readonly projection: TrackProjection = { index: -1, s: 0, d: 0 };
  /** Proyección auxiliar del contorno contra los muros (reutilizada). */
  private readonly probe: TrackProjection = { index: 0, s: 0, d: 0 };
  /** Entradas de la caja automática (reutilizadas en cada paso). */
  private readonly shiftInputs: GearboxInputs = { speed: 0, throttle: 0, brake: 0, wheelspin: false };
  readonly wheels: WheelState[];
  readonly gearbox: Gearbox;
  readonly telemetry: Telemetry = {
    speed: 0,
    rpm: 0,
    gear: 1,
    throttle: 0,
    brake: 0,
    ax: 0,
    ay: 0,
    wheelspin: 0,
    lockup: 0,
    slide: 0,
    rumble: 0,
    wheelsOff: 0,
    tcActive: false,
    absActive: false,
    stabilityActive: false,
    impact: 0,
    limiter: false,
  };
  electronics: Electronics = { tractionControl: 0.6, abs: true, stability: 0 };
  /**
   * Retenido en la parrilla (embrague automático): no avanza, pero el motor
   * sube de vueltas con el acelerador. Se suelta al apagarse el semáforo.
   */
  held = false;

  private rpm: number;
  private smoothedAx = 0;
  private reverseTimer = 0;
  private readonly wheelbase: number;

  constructor(
    readonly spec: CarSpec,
    readonly track: Track,
  ) {
    this.gearbox = new Gearbox(spec);
    this.rpm = spec.idleRpm;
    this.wheelbase = spec.cgToFront + spec.cgToRear;
    this.wheels = [0, 1, 2, 3].map(() => ({
      x: 0,
      z: 0,
      surface: 'asphalt',
      projection: { index: -1, s: 0, d: 0 },
      load: 0,
    }));
  }

  get speed(): number {
    return Math.hypot(this.vx, this.vy);
  }

  /** Coloca el auto detenido en (s, d) mirando en el sentido de la pista. */
  placeAt(s: number, d: number): void {
    const p = { x: 0, z: 0 };
    const t = { x: 0, z: 0 };
    this.track.geometry.pointAt(s, d, p, t);
    this.x = p.x;
    this.z = p.z;
    // Tangente (tx, tz) = (−sin ψ, −cos ψ).
    this.heading = Math.atan2(-t.x, -t.z);
    this.vx = 0;
    this.vy = 0;
    this.yawRate = 0;
    this.steerAngle = 0;
    this.drs = 0;
    this.rpm = this.spec.idleRpm;
    this.smoothedAx = 0;
    this.gearbox.reset(1);
    this.projection.index = -1;
    for (const wheel of this.wheels) wheel.projection.index = -1;
    // Las ruedas, en la posición nueva: si no, se proyectaban desde donde estaba
    // el auto antes y la búsqueda podía quedar trabada en otro tramo de la pista.
    this.updateWheelPositions();
    this.updateProjections();
  }

  /** Velocidad en el mundo (m/s) en `out`. */
  worldVelocity(out: { x: number; z: number }): { x: number; z: number } {
    const sinH = Math.sin(this.heading);
    const cosH = Math.cos(this.heading);
    // adelante = (−sin, −cos), izquierda = (−cos, sin)
    out.x = -sinH * this.vx - cosH * this.vy;
    out.z = -cosH * this.vx + sinH * this.vy;
    return out;
  }

  /**
   * Aplica un impulso (N·s, ejes del mundo) en un punto (relativo al CG, ejes
   * del mundo): cambia la velocidad y el giro. Lo usan los choques entre autos.
   * @returns giro que provocó (rad/s)
   */
  applyImpulse(jx: number, jz: number, rx: number, rz: number): number {
    const sinH = Math.sin(this.heading);
    const cosH = Math.cos(this.heading);
    // Mundo → ejes del auto (x adelante, y izquierda).
    const ix = -sinH * jx - cosH * jz;
    const iy = -cosH * jx + sinH * jz;
    const px = -sinH * rx - cosH * rz;
    const py = -cosH * rx + sinH * rz;
    this.vx += ix / this.spec.mass;
    this.vy += iy / this.spec.mass;
    const spin = Math.max(-MAX_IMPACT_SPIN, Math.min(MAX_IMPACT_SPIN, (px * iy - py * ix) / this.spec.yawInertia));
    this.yawRate += spin;
    return spin;
  }

  /** Desplaza el auto (separación tras un choque) y actualiza su posición en la pista. */
  translate(dx: number, dz: number): void {
    this.x += dx;
    this.z += dz;
    this.updateWheelPositions();
    this.updateProjections();
  }

  /** Registra un golpe (m/s) en la telemetría de este paso (sonido, cámara, vibración). */
  reportImpact(speed: number): void {
    this.telemetry.impact = Math.max(this.telemetry.impact, speed);
  }

  /** Avanza la simulación `dt` segundos con los mandos del piloto. */
  step(dt: number, input: DriverInput): void {
    this.telemetry.impact = 0;
    this.telemetry.tcActive = false;
    this.telemetry.absActive = false;
    this.telemetry.stabilityActive = false;
    if (this.held) {
      this.holdOnGrid(dt, input);
      return;
    }
    const h = dt / SUBSTEPS;
    for (let i = 0; i < SUBSTEPS; i++) this.substep(h, input);
    this.telemetry.speed = this.speed;
    this.telemetry.rpm = this.rpm;
    this.telemetry.gear = this.gearbox.gear;
    this.telemetry.throttle = input.throttle;
    this.telemetry.brake = input.brake;
  }

  private substep(dt: number, input: DriverInput): void {
    const spec = this.spec;
    const g = 9.81;
    const speed = Math.abs(this.vx);

    // ─── Dirección: el ángulo máximo baja con la velocidad ───
    const maxSteer =
      spec.maxSteerHigh + (spec.maxSteerLow - spec.maxSteerHigh) / (1 + (speed / spec.steerSpeedFalloff) ** 2);
    let target = -input.steer * maxSteer;
    // Limitador de agarre: a velocidad, las ruedas no giran más allá del ángulo
    // que da el máximo agarre delantero respecto de hacia dónde va el eje (lo que
    // haría un piloto; con teclado no se puede dosificar). Girar más sólo haría
    // patinar el tren delantero y, al recuperar agarre, cruzar la cola. Deja
    // contravolantear: el rango sigue la dirección real del eje.
    const guard = Math.min(1, Math.max(0, (speed - STEER_GUARD_FROM) / STEER_GUARD_RAMP));
    if (guard > 0) {
      const flow = Math.atan2(this.vy + spec.cgToFront * this.yawRate, Math.max(speed, 3));
      const reach = spec.peakSlipAngle * STEER_GUARD_REACH;
      const limited = Math.max(flow - reach, Math.min(flow + reach, target));
      target += (limited - target) * guard;
    }
    const rack = 5 * dt;
    this.steerAngle += Math.max(-rack, Math.min(rack, target - this.steerAngle));

    // ─── DRS: se abre sólo si está permitido; se cierra al frenar ───
    const wantDrs = input.drs && this.drsAllowed && input.brake < 0.05;
    this.drs = Math.max(0, Math.min(1, this.drs + (wantDrs ? 4 : -6) * dt));

    // ─── Marcha atrás: detenido y manteniendo el freno ───
    this.handleReverse(dt, input);
    const reversing = this.gearbox.gear < 0;
    const throttle = reversing ? input.brake : input.throttle;
    const brake = reversing ? input.throttle : input.brake;

    // ─── Cargas: peso + carga aerodinámica + transferencia longitudinal ───
    const v2 = this.vx * this.vx + this.vy * this.vy;
    const half = 0.5 * spec.airDensity;
    const downforce = half * spec.downforceArea * v2 * (1 - spec.drsDownforceCut * this.drs);
    const drag = half * spec.dragArea * v2 * (1 - spec.drsDragCut * this.drs) * (1 - 0.25 * this.slipstream);
    const transfer = (spec.mass * this.smoothedAx * spec.cgHeight) / this.wheelbase;
    const loadFront = Math.max(
      0.15 * spec.mass * g,
      (spec.mass * g * spec.cgToRear) / this.wheelbase + downforce * spec.aeroBalanceFront - transfer,
    );
    const loadRear = Math.max(
      0.15 * spec.mass * g,
      (spec.mass * g * spec.cgToFront) / this.wheelbase + downforce * (1 - spec.aeroBalanceFront) + transfer,
    );

    // ─── Superficies bajo cada rueda (0 = del. izq., 1 = del. der., 2 = tras. izq., 3 = tras. der.) ───
    this.updateWheelPositions();
    this.updateProjections();
    let rumble = 0;
    let wheelsOff = 0;
    for (let i = 0; i < 4; i++) {
      const wheel = this.wheels[i];
      if (!wheel) continue;
      wheel.load = i < 2 ? loadFront / 2 : loadRear / 2;
      rumble = Math.max(rumble, SURFACES[wheel.surface].rumble);
      if (wheel.surface !== 'asphalt' && wheel.surface !== 'kerb') wheelsOff++;
    }
    const boost = this.electronics.gripBoost ?? 1;
    const muFront = boost * spec.grip * spec.frontGripBias * (this.gripAt(0) + this.gripAt(1)) * 0.5;
    const muRear = boost * spec.grip * (this.gripAt(2) + this.gripAt(3)) * 0.5;
    const capFront = muFront * loadFront;
    const capRear = muRear * loadRear;
    // Capacidad longitudinal (tracción y frenada): algo mayor que la lateral.
    const longCapFront = capFront * spec.longitudinalGrip;
    const longCapRear = capRear * spec.longitudinalGrip;

    // ─── Motor, caja y fuerza de tracción ───
    const wheelRpm = this.gearbox.rpmFor(this.gearbox.gear, this.vx);
    const inFirst = this.gearbox.gear === 1 || reversing;
    // Embrague que patina en la salida: el motor no cae por debajo de un régimen útil.
    const launchRpm = inFirst ? spec.idleRpm + throttle * 5200 : spec.idleRpm;
    const engineRpm = Math.max(wheelRpm, launchRpm);
    const limiter = engineRpm >= spec.limiterRpm;
    const omega = (engineRpm * 2 * Math.PI) / 60;
    const torque = (spec.maxPower * powerCurve(engineRpm)) / omega;
    let drive = 0;
    if (this.gearbox.shiftCut <= 0 && !limiter) {
      const map = reversing ? 0.5 : (spec.gearTorqueMap[this.gearbox.gear - 1] ?? 1);
      drive = (throttle * torque * map * this.gearbox.ratio * spec.drivetrainEfficiency) / spec.wheelRadius;
      if (reversing && this.vx < -spec.reverseMaxSpeed) drive = 0;
    }
    // Freno motor al soltar el acelerador.
    const engineBrake = throttle < 0.05 ? 0.045 * spec.mass * g * Math.min(1, engineRpm / spec.shiftRpm) : 0;

    // Tracción limitada por el agarre trasero (con control de tracción).
    let wheelspin = 0;
    const tractionCap = longCapRear * 0.98;
    if (drive > tractionCap) {
      const tc = this.electronics.tractionControl;
      const effective = drive + (tractionCap - drive) * tc;
      if (tc > 0 && effective < drive - 1) this.telemetry.tcActive = true;
      wheelspin = Math.min(1, Math.max(0, effective / tractionCap - 1) * 1.8);
      // Con las ruedas patinando el motor se revoluciona (se refleja en las rpm al final del paso).
      drive = Math.min(effective, tractionCap) * (1 - 0.15 * wheelspin);
    }

    // ─── Frenos (con ABS o bloqueo) ───
    const brakeForce = brake * spec.maxBrakeForce;
    let brakeFront = brakeForce * spec.brakeBias;
    let brakeRear = brakeForce * (1 - spec.brakeBias);
    let lockFront = 0;
    let lockRear = 0;
    if (this.electronics.abs) {
      if (brakeFront > longCapFront * 0.97 || brakeRear > longCapRear * 0.97) this.telemetry.absActive = speed > 3;
      brakeFront = Math.min(brakeFront, longCapFront * 0.97);
      brakeRear = Math.min(brakeRear, longCapRear * 0.97);
    } else {
      if (brakeFront > longCapFront) {
        lockFront = Math.min(1, (brakeFront / longCapFront - 1) * 4 + 0.5);
        brakeFront = longCapFront * 0.82;
      }
      if (brakeRear > longCapRear) {
        lockRear = Math.min(1, (brakeRear / longCapRear - 1) * 4 + 0.5);
        brakeRear = longCapRear * 0.82;
      }
    }
    const direction = this.vx >= 0 ? 1 : -1;
    const stopped = speed < 0.3 && throttle < 0.05;
    const longFront = stopped ? 0 : -direction * brakeFront;
    const longRear = (reversing ? -drive : drive) - (stopped ? 0 : direction * (brakeRear + engineBrake));

    // ─── Fuerzas laterales (Pacejka simplificado + círculo de fricción) ───
    const denom = Math.max(Math.abs(this.vx), 3);
    const slipFront = Math.atan2(this.vy + spec.cgToFront * this.yawRate, denom) - this.steerAngle * direction;
    const slipRear = Math.atan2(this.vy - spec.cgToRear * this.yawRate, denom);
    const shape = tireShape(spec);
    // Círculo de fricción algo generoso (×0,85): se puede doblar un poco frenando a fondo.
    // Atrás, al acelerar, todavía más (×0,7): el diferencial y la carga aerodinámica
    // sostienen la cola a la salida de las curvas (tracción con el volante girado).
    const usageFront = Math.min(1, Math.abs(longFront) / Math.max(1, longCapFront)) * 0.85;
    const usageRear = Math.min(1, Math.abs(longRear) / Math.max(1, longCapRear)) * (longRear > 0 ? 0.7 : 0.85);
    let lateralFront = -capFront * magicFormula(slipFront, shape) * Math.sqrt(1 - usageFront * usageFront);
    let lateralRear = -capRear * magicFormula(slipRear, shape) * Math.sqrt(1 - usageRear * usageRear);
    lateralFront *= 1 - 0.75 * lockFront;
    // Ruedas que patinan pierden agarre lateral de forma progresiva (se puede corregir).
    lateralRear *= (1 - 0.7 * lockRear) * (1 - 0.2 * wheelspin);

    // ─── Arrastre de la superficie por rueda (tira del auto hacia el pasto) ───
    let surfaceFx = 0;
    let surfaceMz = 0;
    const staticWheelLoad = (spec.mass * g) / 4;
    const halfTrack = spec.track / 2;
    for (let i = 0; i < 4; i++) {
      const wheel = this.wheels[i];
      if (!wheel) continue;
      const coefficient = SURFACES[wheel.surface].drag;
      if (coefficient <= 0 || speed < 0.1) continue;
      // Sobre el peso estático (no la carga aerodinámica): la grava frena ~1 g, no 4.
      const force = -direction * coefficient * staticWheelLoad * (0.5 + 0.5 * Math.min(1, speed / 25));
      surfaceFx += force;
      const y = i % 2 === 0 ? halfTrack : -halfTrack;
      surfaceMz -= y * force;
    }

    // ─── Suma de fuerzas en ejes del auto ───
    const cosSteer = Math.cos(this.steerAngle);
    const sinSteer = Math.sin(this.steerAngle);
    const rolling = speed > 0.1 ? direction * spec.rollingResistance * (loadFront + loadRear) : 0;
    const fx =
      longFront * cosSteer - lateralFront * sinSteer + longRear - direction * drag - rolling + surfaceFx;
    const fy = longFront * sinSteer + lateralFront * cosSteer + lateralRear;
    const mz =
      spec.cgToFront * (longFront * sinSteer + lateralFront * cosSteer) - spec.cgToRear * lateralRear + surfaceMz;

    const ax = fx / spec.mass + this.yawRate * this.vy;
    const ay = fy / spec.mass - this.yawRate * this.vx;
    this.vx += ax * dt;
    this.vy += ay * dt;
    this.yawRate += ((mz + this.stabilityMoment(slipRear, capFront + capRear)) / spec.yawInertia) * dt;
    this.applyAntiSlide(dt);

    // Detenido: sin deslizamiento residual.
    if (stopped && Math.abs(this.vx) < 0.3) {
      this.vx *= 0.8;
      this.vy *= 0.8;
    }

    // A muy baja velocidad el giro es cinemático (estable al maniobrar).
    const kinematic = Math.max(0, 1 - Math.abs(this.vx) / KINEMATIC_SPEED);
    if (kinematic > 0) {
      const kinematicYaw = (this.vx * Math.tan(this.steerAngle)) / this.wheelbase;
      this.yawRate += (kinematicYaw - this.yawRate) * kinematic;
      this.vy *= 1 - kinematic;
    }

    // ─── Integración de la posición ───
    this.heading += this.yawRate * dt;
    const sinH = Math.sin(this.heading);
    const cosH = Math.cos(this.heading);
    // adelante = (−sin, −cos), izquierda = (−cos, sin)
    this.x += (-sinH * this.vx - cosH * this.vy) * dt;
    this.z += (-cosH * this.vx + sinH * this.vy) * dt;

    this.collideWithWalls();

    // ─── Estado para el resto del juego ───
    this.smoothedAx += (fx / spec.mass - this.smoothedAx) * Math.min(1, dt * 10);
    const shift = this.shiftInputs;
    shift.speed = this.vx;
    shift.throttle = throttle;
    shift.brake = brake;
    shift.wheelspin = wheelspin > 0.2;
    this.gearbox.update(dt, shift);
    const shiftedRpm = Math.max(wheelRpm, launchRpm) + wheelspin * 2500;
    this.rpm += (Math.min(spec.limiterRpm, Math.max(spec.idleRpm * 0.95, shiftedRpm)) - this.rpm) * Math.min(1, dt * 25);
    this.wheelSpinFront += (this.vx / spec.wheelRadius) * dt * (1 - lockFront);
    this.wheelSpinRear += ((this.vx / spec.wheelRadius) * (1 + wheelspin * 0.6) * (1 - lockRear)) * dt;

    const t = this.telemetry;
    t.ax = fx / spec.mass;
    t.ay = fy / spec.mass;
    t.wheelspin = wheelspin;
    t.lockup = Math.max(lockFront, lockRear);
    t.slide = Math.min(1, Math.max(0, Math.abs(slipRear) - spec.peakSlipAngle * 0.8) * 4 + Math.max(0, Math.abs(slipFront) - spec.peakSlipAngle) * 3);
    t.rumble = speed > 3 ? rumble : 0;
    t.wheelsOff = wheelsOff;
    t.limiter = limiter;
  }

  /**
   * Control de estabilidad: si la cola se acerca al límite de su agarre
   * (sobreviraje), un momento lleva la guiñada hacia la que pide la dirección.
   * Mira la deriva trasera sola: con el volante muy girado el tren delantero
   * también deriva mucho y compararlos escondía el trompo.
   */
  private stabilityMoment(slipRear: number, lateralCapacity: number): number {
    const gain = this.electronics.stability;
    const speed = this.vx;
    if (gain <= 0 || speed < 8) return 0;
    const peak = this.spec.peakSlipAngle;
    const oversteer = Math.abs(slipRear) - peak * 0.7;
    if (oversteer <= 0) return 0;
    // Guiñada de referencia: la geométrica, limitada por el agarre disponible.
    const maxYaw = lateralCapacity / (this.spec.mass * speed);
    const reference = Math.max(-maxYaw, Math.min(maxYaw, (speed * Math.tan(this.steerAngle)) / this.wheelbase));
    const error = this.yawRate - reference;
    this.telemetry.stabilityActive = true;
    // Más corrección cuanto más se cruza la cola (proporcional al exceso de deriva).
    const strength = Math.min(1, oversteer / (peak * 0.5));
    return -gain * strength * STABILITY_GAIN * error * this.spec.yawInertia;
  }

  /**
   * Anti-derrape ("sobre rieles"): el neumático trasero necesita algo de
   * deriva para doblar, así que se deja hasta el 60 % de la del pico de
   * agarre; todo lo que pase de eso (la cola que se va) se quita de la
   * velocidad lateral. Girando el volante el auto rota y sigue su trayectoria
   * en vez de cruzar la cola. Sólo en movimiento: a baja velocidad el giro ya
   * es cinemático.
   */
  private applyAntiSlide(dt: number): void {
    const amount = this.electronics.antiSlide ?? 0;
    const speed = this.vx;
    if (amount <= 0 || speed < 8) return;
    const slip = (this.vy - this.spec.cgToRear * this.yawRate) / speed;
    const allowed = Math.tan(this.spec.peakSlipAngle * ANTI_SLIDE_KEEP);
    const excess = Math.abs(slip) - allowed;
    if (excess <= 0) return;
    const blend = Math.min(1, amount * ANTI_SLIDE_RATE * dt);
    this.vy -= Math.sign(slip) * excess * speed * blend;
    this.telemetry.stabilityActive = true;
  }

  /** En la parrilla: quieto, con el motor subiendo de vueltas según el acelerador. */
  private holdOnGrid(dt: number, input: DriverInput): void {
    const spec = this.spec;
    this.vx = 0;
    this.vy = 0;
    this.yawRate = 0;
    const target = spec.idleRpm + input.throttle * (spec.shiftRpm - 1100 - spec.idleRpm);
    this.rpm += (target - this.rpm) * Math.min(1, dt * 8);
    this.updateWheelPositions();
    this.updateProjections();
    const t = this.telemetry;
    t.speed = 0;
    t.rpm = this.rpm;
    t.gear = this.gearbox.gear;
    t.throttle = input.throttle;
    t.brake = input.brake;
    t.ax = 0;
    t.ay = 0;
    t.wheelspin = 0;
    t.lockup = 0;
    t.slide = 0;
    t.rumble = 0;
    t.limiter = false;
  }

  private handleReverse(dt: number, input: DriverInput): void {
    const nearlyStopped = Math.abs(this.vx) < 0.8;
    if (this.gearbox.gear > 0) {
      this.reverseTimer = nearlyStopped && input.brake > 0.5 && input.throttle < 0.05 ? this.reverseTimer + dt : 0;
      if (this.reverseTimer > 0.45) {
        this.gearbox.setReverse(true);
        this.reverseTimer = 0;
      }
    } else if (input.throttle > 0.3 && this.vx > -0.8) {
      this.gearbox.setReverse(false);
    }
  }

  /** Agarre de la superficie bajo una rueda. */
  private gripAt(i: number): number {
    const wheel = this.wheels[i];
    return wheel ? SURFACES[wheel.surface].grip : 1;
  }

  private updateWheelPositions(): void {
    const spec = this.spec;
    const sinH = Math.sin(this.heading);
    const cosH = Math.cos(this.heading);
    const fx = -sinH;
    const fz = -cosH;
    const lx = -cosH;
    const lz = sinH;
    const half = spec.track / 2;
    for (let i = 0; i < 4; i++) {
      const wheel = this.wheels[i];
      if (!wheel) continue;
      // 0 = del. izq., 1 = del. der., 2 = tras. izq., 3 = tras. der.
      const along = i < 2 ? spec.cgToFront : -spec.cgToRear;
      const side = i % 2 === 0 ? half : -half;
      wheel.x = this.x + fx * along + lx * side;
      wheel.z = this.z + fz * along + lz * side;
    }
  }

  private updateProjections(): void {
    const geometry = this.track.geometry;
    geometry.project(this.x, this.z, this.projection, this.projection.index);
    for (let i = 0; i < 4; i++) {
      const wheel = this.wheels[i];
      if (!wheel) continue;
      geometry.project(wheel.x, wheel.z, wheel.projection, wheel.projection.index >= 0 ? wheel.projection.index : this.projection.index);
      wheel.surface = this.track.surfaceAt(wheel.projection.index, wheel.projection.d);
    }
  }

  /** Empuja el auto fuera del muro y aplica el impulso del choque. */
  private collideWithWalls(): void {
    const geometry = this.track.geometry;
    const trackside = this.track.trackside;
    const sinH = Math.sin(this.heading);
    const cosH = Math.cos(this.heading);
    let deepest = 0;
    let contactX = 0;
    let contactY = 0;
    let normalX = 0;
    let normalZ = 0;
    const probe = this.probe;
    for (let i = 0; i < HULL.length; i += 2) {
      const px = HULL[i] ?? 0;
      const py = HULL[i + 1] ?? 0;
      const wx = this.x - sinH * px - cosH * py;
      const wz = this.z - cosH * px + sinH * py;
      geometry.project(wx, wz, probe, this.projection.index);
      const right = probe.d > 0;
      // Donde otro tramo cruza la pista no hay muro.
      if ((right ? trackside.gapRight : trackside.gapLeft)[probe.index] === 1) continue;
      const wall = (right ? trackside.wallRight : trackside.wallLeft)[probe.index] ?? Infinity;
      const penetration = Math.abs(probe.d) - wall;
      if (penetration > deepest) {
        deepest = penetration;
        contactX = px;
        contactY = py;
        // Normal hacia el interior de la pista: −signo(d) × derecha.
        const tx = geometry.tx[probe.index] ?? 0;
        const tz = geometry.tz[probe.index] ?? 1;
        const sign = right ? -1 : 1;
        normalX = sign * -tz;
        normalZ = sign * tx;
      }
    }
    if (deepest <= 0) return;

    // Separación.
    this.x += normalX * deepest;
    this.z += normalZ * deepest;

    // Normal en ejes del auto: n·adelante y n·izquierda.
    const nx = normalX * -sinH + normalZ * -cosH;
    const ny = normalX * -cosH + normalZ * sinH;
    // Velocidad del punto de contacto (ω × r en 2D).
    const vcx = this.vx - this.yawRate * contactY;
    const vcy = this.vy + this.yawRate * contactX;
    const vn = vcx * nx + vcy * ny;
    if (vn >= 0) return;

    const spec = this.spec;
    const rn = contactX * ny - contactY * nx;
    const inverseMass = 1 / spec.mass + (rn * rn) / spec.yawInertia;
    const j = (-(1 + WALL_RESTITUTION) * vn) / inverseMass;
    // Fricción a lo largo del muro (roza y frena).
    const tangentX = -ny;
    const tangentY = nx;
    const vt = vcx * tangentX + vcy * tangentY;
    const jt = Math.max(-WALL_FRICTION * j, Math.min(WALL_FRICTION * j, -vt / inverseMass));
    const ix = j * nx + jt * tangentX;
    const iy = j * ny + jt * tangentY;
    this.vx += ix / spec.mass;
    this.vy += iy / spec.mass;
    const spin = (contactX * iy - contactY * ix) / spec.yawInertia;
    this.yawRate += Math.max(-MAX_IMPACT_SPIN, Math.min(MAX_IMPACT_SPIN, spin));
    this.telemetry.impact = Math.max(this.telemetry.impact, -vn);
  }
}

interface TireShape {
  B: number;
  C: number;
}

const shapes = new WeakMap<CarSpec, TireShape>();

/** Parámetros de la curva de Pacejka para el pico y la caída de la ficha. */
function tireShape(spec: CarSpec): TireShape {
  let shape = shapes.get(spec);
  if (!shape) {
    // sin(C·π/2) = 1 − caída  →  C; el pico en α_p  →  B.
    const C = (Math.PI - Math.asin(1 - spec.slipFalloff)) / (Math.PI / 2);
    const B = Math.tan(Math.PI / (2 * C)) / spec.peakSlipAngle;
    shape = { B, C };
    shapes.set(spec, shape);
  }
  return shape;
}

/** Fuerza lateral normalizada (−1…1) para un ángulo de deriva. */
export function magicFormula(slip: number, shape: TireShape): number {
  return Math.sin(shape.C * Math.atan(shape.B * slip));
}
