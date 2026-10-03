/**
 * Reproduce una carrera grabada: avanza el reloj de la repetición (con pausa,
 * velocidades y saltos), muestra cada auto en su pose grabada (sin física) y
 * dice qué pasaba en ese momento: posiciones, vuelta del jugador, semáforo,
 * bandera a cuadros y choques (para las chispas).
 */

import { clamp } from '../core/utils/math';
import type { Vehicle } from './physics/Vehicle';
import { emptyReplayCar, type ReplayCar, type ReplayRecorder } from './session/Replay';

/** La repetición empieza estos segundos antes de que se apaguen las luces. */
const PRE_START = 3;
/** Velocidades disponibles. */
export const PLAYBACK_SPEEDS: readonly number[] = [0.25, 0.5, 1, 2, 4];

export class ReplayPlayer {
  /** Hora de la grabación que se ve (s desde el primer cuadro). */
  time: number;
  playing = true;
  /** Auto que sigue la cámara (índice en la sesión). */
  focus: number;
  readonly from: number;
  readonly to: number;
  /** Pose de cada auto en el momento que se ve. */
  readonly cars: ReplayCar[];
  private speedIndex = PLAYBACK_SPEEDS.indexOf(1);
  private readonly order: number[];

  constructor(
    readonly recorder: ReplayRecorder,
    focus: number,
  ) {
    this.focus = focus;
    this.from = Math.max(0, (recorder.startTime ?? 0) - PRE_START);
    this.to = recorder.duration;
    this.time = this.from;
    this.cars = Array.from({ length: recorder.cars }, () => emptyReplayCar());
    this.order = Array.from({ length: recorder.cars }, (_, i) => i);
  }

  get speed(): number {
    return PLAYBACK_SPEEDS[this.speedIndex] ?? 1;
  }

  /** Largo de la repetición y lo que va (s). */
  get duration(): number {
    return Math.max(0.001, this.to - this.from);
  }

  get elapsed(): number {
    return this.time - this.from;
  }

  /** Reloj de carrera en el momento que se ve (s desde la largada; negativo en la parrilla). */
  get clock(): number {
    return this.time - (this.recorder.startTime ?? this.from);
  }

  /** Avanza el reloj (si no está en pausa). Al llegar al final queda en pausa. */
  advance(dt: number): void {
    if (!this.playing) return;
    this.time = Math.min(this.to, this.time + dt * this.speed);
    if (this.time >= this.to) this.playing = false;
  }

  togglePlay(): void {
    // Terminada: vuelve a empezar.
    if (!this.playing && this.time >= this.to - 0.05) this.time = this.from;
    this.playing = !this.playing;
  }

  /** Salta a una fracción (0–1) de la repetición. */
  seek(fraction: number): void {
    this.time = this.from + clamp(fraction, 0, 1) * this.duration;
  }

  skip(seconds: number): void {
    this.time = clamp(this.time + seconds, this.from, this.to);
  }

  /** Más rápida (+1) o más lenta (−1). */
  changeSpeed(step: number): void {
    this.speedIndex = clamp(this.speedIndex + step, 0, PLAYBACK_SPEEDS.length - 1);
  }

  /**
   * Lee el momento actual y pone cada auto en su pose (para dibujar, el humo y el sonido).
   * @param vehicles los autos de la sesión, en el mismo orden que la grabación
   */
  apply(vehicles: readonly Vehicle[], dt: number): void {
    vehicles.forEach((vehicle, i) => {
      const pose = this.cars[i];
      if (!pose) return;
      this.recorder.read(this.time, i, pose);
      vehicle.showPose(pose, dt);
    });
  }

  /** Índices de los autos del primero al último en el momento que se ve (por progreso en la carrera). */
  standings(): readonly number[] {
    const order = this.order;
    order.sort((a, b) => (this.cars[b]?.progress ?? 0) - (this.cars[a]?.progress ?? 0));
    return order;
  }

  /** Auto siguiente (+1) o anterior (−1) en la clasificación de ese momento. */
  cycleFocus(step: number): void {
    const order = this.standings();
    const at = order.indexOf(this.focus);
    const next = order[(at + step + order.length) % order.length];
    if (next !== undefined) this.focus = next;
  }

  /** Vuelta del jugador en el momento que se ve (0 = todavía en la parrilla). */
  get lap(): number {
    let lap = 0;
    for (const event of this.recorder.events) {
      if (event.t > this.time) break;
      if (event.kind === 'lap') lap = event.number;
    }
    return lap;
  }

  /** Luces del semáforo encendidas en ese momento. */
  get lights(): number {
    let lit = 0;
    for (const event of this.recorder.events) {
      if (event.t > this.time) break;
      if (event.kind === 'lights') lit = event.lit;
    }
    return lit;
  }

  /** ¿Ya cayó la bandera a cuadros para el jugador? */
  get flag(): boolean {
    return this.recorder.events.some((event) => event.kind === 'flag' && event.t <= this.time);
  }

  /** Choques entre dos momentos (para las chispas al reproducir hacia adelante). */
  burstsBetween(from: number, to: number, visit: (x: number, z: number, speed: number) => void): void {
    if (to <= from) return;
    for (const event of this.recorder.events) {
      if (event.kind === 'burst' && event.t > from && event.t <= to) visit(event.x, event.z, event.speed);
    }
  }

  /** Marcas de las vueltas del jugador en la línea de tiempo (0–1). */
  lapMarks(): Array<{ at: number; label: string }> {
    return this.recorder.events.flatMap((event) =>
      event.kind === 'lap' && event.t >= this.from ? [{ at: (event.t - this.from) / this.duration, label: `Vuelta ${event.number}` }] : [],
    );
  }
}
