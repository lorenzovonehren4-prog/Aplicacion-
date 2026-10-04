/**
 * Parada en boxes con piloto automático (para el jugador y los bots): el
 * auto deja la pista por el desvío de entrada, baja al límite de velocidad,
 * para en el box de su equipo, el equipo cambia los neumáticos (y arregla el
 * daño), sale por la calle y vuelve a la pista por el desvío de salida.
 *
 * El camino es un trazado (distancia a lo largo de la pista, distancia al
 * centro) y la velocidad, un perfil calculado de antemano (frena antes del
 * límite y del box, acelera al salir): el auto lo sigue sin física, así que
 * nunca se sale ni choca.
 */

import { clamp } from '../../core/utils/math';
import type { PitLane } from '../../tracks/PitLane';
import type { Track } from '../../tracks/Track';
import type { Vehicle } from '../physics/Vehicle';

export type PitPhase = 'in' | 'stop' | 'out' | 'done';

/** Límite de velocidad en la calle de boxes (m/s): 80 km/h. */
export const PIT_SPEED = 80 / 3.6;
/** Velocidad en la calle fuera de la zona del límite (m/s). */
const LANE_SPEED = 60;
/** Frenada, aceleración y aceleración lateral del piloto automático (m/s²). */
const PIT_DECEL = 15;
/** Frenada fuerte si entra más rápido de lo que pide el perfil (m/s², ~3 g). */
const HARD_DECEL = 30;
const PIT_ACCEL = 11;
const PIT_LATERAL = 14;
/** Velocidad mínima al acercarse al box (m/s): llega siempre hasta la marca, sin quedarse a centímetros. */
const CREEP_SPEED = 0.6;
/** Con el box ocupado por el compañero, espera esta distancia antes de la marca (m). */
const QUEUE_GAP = 9;
/** Servicio: tiempo base, variación y lo que suma arreglar un auto destrozado (s). */
export const SERVICE_BASE = 1.9;
const SERVICE_JITTER = 0.7;
const REPAIR_TIME = 2.5;
/** Tramo (m) en que pasa del carril rápido al de trabajo antes del box (y vuelve después). */
const BOX_SWING = 24;
/** Llega al carril rápido este tramo (m) antes de la punta del muro. */
const ENTRY_MARGIN = 10;
/** Vuelve a la pista a esta distancia del borde del lado de boxes (m, hacia adentro). */
const MERGE_INSET = 2;
/** Resolución del perfil de velocidad (m). */
const PROFILE_STEP = 1;
/** Velocidad mínima para arrancar del box (m/s): la aceleración la pone `step`. */
const LAUNCH_SPEED = 1.5;

const smooth = (t: number): number => {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

export class PitStop {
  phase: PitPhase = 'in';
  /** Metros recorridos desde que empezó la parada (a lo largo de la pista). */
  along = 0;
  speed: number;
  /** Segundos de servicio (en el box) y los que faltan. */
  readonly serviceTime: number;
  serviceLeft: number;
  /** Se arregla el daño (además de los neumáticos). */
  readonly repair: boolean;
  /** Segundos desde que salió del box (para que el equipo se vaya). */
  sinceRelease = 0;
  /** El box está ocupado (el compañero de equipo está parado o llega antes): espera detrás. */
  holdShort = false;
  /** Dónde para (s) y de qué lado: para el equipo de boxes y la cámara. */
  readonly boxS: number;
  readonly pit: PitLane;
  private readonly startS: number;
  private readonly startD: number;
  /** Marcas del recorrido (m desde el comienzo). */
  private readonly toLane: number;
  private readonly swingIn: number;
  private readonly stopAt: number;
  private readonly swingOut: number;
  private readonly toExit: number;
  private readonly total: number;
  /** Zona del límite de velocidad (m desde el comienzo). */
  private readonly limitFrom: number;
  private readonly limitTo: number;
  private readonly profile: Float32Array;
  private readonly point = { x: 0, z: 0 };
  private readonly ahead = { x: 0, z: 0 };
  private readonly behind = { x: 0, z: 0 };

  /**
   * @param box índice del box del equipo (0 … PIT_BOXES − 1)
   * @param random 0–1 para la duración del servicio
   */
  constructor(
    private readonly track: Track,
    vehicle: Vehicle,
    box: number,
    random: () => number = Math.random,
  ) {
    const g = track.geometry;
    const pit = track.pitLane;
    this.pit = pit;
    this.startS = vehicle.projection.s;
    this.startD = vehicle.projection.d;
    this.speed = Math.max(0, vehicle.vx);
    this.boxS = pit.boxes[clamp(box, 0, pit.boxes.length - 1)] ?? pit.boxes[0] ?? pit.wallFrom;
    const at = (s: number): number => g.wrapS(s - this.startS);
    this.toLane = Math.max(20, at(pit.wallFrom) - ENTRY_MARGIN);
    this.stopAt = at(this.boxS);
    this.swingIn = this.stopAt - BOX_SWING;
    this.swingOut = this.stopAt + BOX_SWING;
    this.toExit = at(pit.wallTo);
    this.total = at(pit.exit);
    this.repair = vehicle.damage > 0.02;
    this.serviceTime = SERVICE_BASE + SERVICE_JITTER * random() + (this.repair ? REPAIR_TIME * vehicle.damage : 0);
    this.serviceLeft = this.serviceTime;
    this.limitFrom = at(pit.limitFrom);
    this.limitTo = at(pit.limitTo);
    this.profile = this.buildProfile(this.limitFrom, this.limitTo);
  }

  /** ¿En la zona con límite de velocidad? */
  get limited(): boolean {
    const g = this.track.geometry;
    const s = this.startS + this.along;
    return this.phase !== 'done' && this.track.inRange(g.wrapS(s), this.pit.limitFrom, this.pit.limitTo);
  }

  /** Un paso: mueve el auto por el camino (y lo deja en el box el tiempo del servicio). */
  step(dt: number, vehicle: Vehicle): void {
    if (this.phase === 'done') return;
    let accel = 0;
    if (this.phase === 'out') this.sinceRelease += dt;
    if (this.phase === 'stop') {
      this.speed = 0;
      this.serviceLeft = Math.max(0, this.serviceLeft - dt);
      if (this.serviceLeft === 0) {
        vehicle.renew();
        this.phase = 'out';
      }
    } else {
      const before = this.speed;
      // Mira también hasta dónde llega en este paso (no pasarse del límite al entrar a la zona).
      const reach = this.along + before * dt;
      let allowed = Math.min(this.allowedAt(this.along), this.allowedAt(reach));
      if (reach >= this.limitFrom && this.along <= this.limitTo) allowed = Math.min(allowed, PIT_SPEED);
      let target: number;
      if (this.phase === 'in') {
        // Frena para parar justo en la marca del box (y nunca se queda a centímetros);
        // con el box ocupado, frena antes y espera ahí.
        const queue = this.stopAt - QUEUE_GAP;
        const waiting = this.holdShort && this.along < queue;
        const left = Math.max(0, (waiting ? queue : this.stopAt) - this.along);
        target = waiting && left < 0.05 ? 0 : Math.max(CREEP_SPEED, Math.min(allowed, Math.sqrt(2 * PIT_DECEL * left)));
        if (waiting) target = Math.min(target, Math.sqrt(2 * PIT_DECEL * left));
      } else {
        target = Math.max(LAUNCH_SPEED, allowed);
      }
      // Acelera de a poco; si viene pasado (entró rápido) frena fuerte, nunca de golpe.
      this.speed = clamp(target, before - HARD_DECEL * dt, before + PIT_ACCEL * dt);
      this.along += this.speed * dt;
      accel = (this.speed - before) / Math.max(1e-4, dt);
      if (this.phase === 'in' && this.along >= this.stopAt) {
        this.along = this.stopAt;
        this.speed = 0;
        this.phase = 'stop';
      } else if (this.phase === 'out' && this.along >= this.total) {
        this.along = this.total;
        this.phase = 'done';
      }
    }
    this.place(vehicle, dt, accel);
  }

  /** Segundos desde que paró en el box (mientras el equipo trabaja). */
  get serviceElapsed(): number {
    return this.serviceTime - this.serviceLeft;
  }

  /** Metros que le faltan para llegar al box (negativo: ya lo pasó). */
  get toBox(): number {
    return this.stopAt - this.along;
  }

  /** Velocidad con la que vuelve a la pista (m/s). */
  get exitSpeed(): number {
    return this.speed;
  }

  /** Distancia al centro (con signo) del camino a `along` m del comienzo. */
  offsetAt(along: number): number {
    const pit = this.pit;
    const sign = pit.sign;
    const hw = this.track.geometry.halfWidth;
    const fast = sign * pit.fast;
    if (along <= this.toLane) return this.startD + (fast - this.startD) * smooth(along / this.toLane);
    if (along <= this.swingIn) return fast;
    if (along <= this.stopAt) return fast + sign * (pit.box - pit.fast) * smooth((along - this.swingIn) / BOX_SWING);
    if (along <= this.swingOut) return fast + sign * (pit.box - pit.fast) * smooth(1 - (along - this.stopAt) / BOX_SWING);
    if (along <= this.toExit) return fast;
    const merge = sign * (hw - MERGE_INSET);
    return fast + (merge - fast) * smooth((along - this.toExit) / Math.max(1, this.total - this.toExit));
  }

  /** Ubica el auto en el camino: posición, rumbo (según hacia dónde va el camino) y giro de las ruedas. */
  private place(vehicle: Vehicle, dt: number, accel: number): void {
    const g = this.track.geometry;
    const along = this.along;
    const s = this.startS + along;
    g.pointAt(s, this.offsetAt(along), this.point);
    g.pointAt(s + 1.5, this.offsetAt(along + 1.5), this.ahead);
    g.pointAt(s - 1.5, this.offsetAt(along - 1.5), this.behind);
    const heading = Math.atan2(-(this.ahead.x - this.behind.x), -(this.ahead.z - this.behind.z));
    // Giro de las ruedas según cuánto dobla el camino.
    const h1 = Math.atan2(-(this.point.x - this.behind.x), -(this.point.z - this.behind.z));
    const h2 = Math.atan2(-(this.ahead.x - this.point.x), -(this.ahead.z - this.point.z));
    let turn = h2 - h1;
    if (turn > Math.PI) turn -= Math.PI * 2;
    if (turn < -Math.PI) turn += Math.PI * 2;
    const wheelbase = vehicle.spec.cgToFront + vehicle.spec.cgToRear;
    const steer = clamp(Math.atan((turn / 1.5) * wheelbase), -0.35, 0.35);
    vehicle.moveAlong(dt, this.point.x, this.point.z, heading, this.speed, accel, steer);
  }

  /** Velocidad máxima en cada punto del recorrido, con las frenadas ya contadas. */
  private allowedAt(along: number): number {
    const i = along / PROFILE_STEP;
    const k = Math.floor(i);
    const a = this.profile[clamp(k, 0, this.profile.length - 1)] ?? 0;
    const b = this.profile[clamp(k + 1, 0, this.profile.length - 1)] ?? 0;
    return a + (b - a) * (i - k);
  }

  /**
   * Perfil de velocidad: límites de cada tramo (calle, zona del límite,
   * curvas) y, de atrás para adelante, frenadas para llegar a cada uno. La
   * frenada hasta el box y la arrancada las calcula `step`.
   */
  private buildProfile(limitFrom: number, limitTo: number): Float32Array {
    const g = this.track.geometry;
    const n = Math.ceil(this.total / PROFILE_STEP) + 2;
    const profile = new Float32Array(n);
    // Al volver a la pista: la velocidad de la trazada en ese punto (con margen).
    const exitCap = Math.min(LANE_SPEED + 8, this.track.racingLine.speedAt(this.pit.exit) * 0.85);
    for (let k = 0; k < n; k++) {
      const along = k * PROFILE_STEP;
      const s = this.startS + along;
      const bend = Math.abs(g.curvatureAt(s));
      let cap = bend > 1e-5 ? Math.sqrt(PIT_LATERAL / bend) : Infinity;
      cap = Math.min(cap, along >= limitFrom && along <= limitTo ? PIT_SPEED : along > this.toExit ? exitCap : LANE_SPEED);
      profile[k] = cap;
    }
    for (let k = n - 2; k >= 0; k--) {
      const next = profile[k + 1] ?? 0;
      profile[k] = Math.min(profile[k] ?? 0, Math.sqrt(next * next + 2 * PIT_DECEL * PROFILE_STEP));
    }
    return profile;
  }
}
