/**
 * Grabación de la carrera para la repetición (lógica pura, sin 3D ni DOM).
 *
 * Cada auto se graba `REPLAY_HZ` veces por segundo: posición, rumbo y
 * progreso en la carrera (números con coma) y el resto en un byte cada uno
 * (velocidad, dirección, DRS, pedales, humo, tierra, marcha, régimen,
 * boxes). Se guarda en bloques de 30 s: con 20 autos son ~6 KB por segundo.
 * Además, los momentos (semáforo, bandera, choques, vueltas) con su hora.
 *
 * Al mostrar, cada cuadro se interpola entre los dos grabados más cercanos.
 */

import { clamp } from '../../core/utils/math';
import type { ShownPose, Vehicle } from '../physics/Vehicle';

/** Cuadros por segundo de la grabación. */
export const REPLAY_HZ = 20;
const STEP = 1 / REPLAY_HZ;
/** Cuadros por bloque (30 s). */
const CHUNK = 600;
/** Valores con coma por auto y cuadro: x, z, rumbo, progreso. */
const FLOATS = 4;
/** Valores de un byte por auto y cuadro (ver `write`). */
const BYTES = 14;
/** Escala de la velocidad (m/s por unidad) y del régimen (rpm por unidad). */
const SPEED_UNIT = 0.4;
const RPM_UNIT = 64;

/** Estado de un auto en boxes: 0 en pista, 1 en la calle, 2 parado con el equipo trabajando. */
export type PitMark = 0 | 1 | 2;

/** Un momento de la carrera (sin la hora). */
export type ReplayMark =
  /** Luces encendidas del semáforo (0 = apagado). */
  | { kind: 'lights'; lit: number }
  /** El jugador recibió la bandera a cuadros. */
  | { kind: 'flag' }
  /** Choque (chispas). */
  | { kind: 'burst'; x: number; z: number; speed: number }
  /** El jugador empezó una vuelta. */
  | { kind: 'lap'; number: number };

/** Un momento con su hora (s desde el primer cuadro). */
export type ReplayEvent = ReplayMark & { t: number };

/** Lo que se lee de un auto en un instante (pose para mostrar, progreso y boxes). */
export interface ReplayCar extends ShownPose {
  progress: number;
  pit: PitMark;
}

/** Lo que la grabación necesita de cada auto en cada cuadro. */
export interface ReplaySource {
  vehicle: Vehicle;
  progress: number;
  pit: PitMark;
}

const lerpAngle = (a: number, b: number, t: number): number => {
  let delta = b - a;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return a + delta * t;
};

const byte = (value: number): number => clamp(Math.round(value * 255), 0, 255);

export class ReplayRecorder {
  /** Cuadros grabados. */
  frames = 0;
  readonly events: ReplayEvent[] = [];
  /** Hora de la largada (s desde el primer cuadro): la repetición empieza un poco antes. */
  startTime: number | null = null;
  /** Ya no graba (la carrera del jugador terminó hace un rato). */
  closed = false;
  private readonly floats: Float32Array[] = [];
  private readonly bytes: Uint8Array[] = [];
  private accumulator = STEP;

  constructor(readonly cars: number) {}

  /** Segundos grabados. */
  get duration(): number {
    return Math.max(0, (this.frames - 1) * STEP);
  }

  /** Hora actual de la grabación (s desde el primer cuadro). */
  get now(): number {
    return this.frames * STEP;
  }

  /** Avanza `dt` segundos y, si toca, graba un cuadro de todos los autos. */
  record(dt: number, sources: readonly ReplaySource[]): void {
    if (this.closed) return;
    this.accumulator += dt;
    if (this.accumulator < STEP) return;
    this.accumulator -= STEP;
    const chunk = Math.floor(this.frames / CHUNK);
    if (chunk >= this.floats.length) {
      this.floats.push(new Float32Array(CHUNK * this.cars * FLOATS));
      this.bytes.push(new Uint8Array(CHUNK * this.cars * BYTES));
    }
    const floats = this.floats[chunk];
    const bytes = this.bytes[chunk];
    if (!floats || !bytes) return;
    const row = this.frames % CHUNK;
    sources.forEach((source, i) => {
      if (i >= this.cars) return;
      const v = source.vehicle;
      const t = v.telemetry;
      const f = (row * this.cars + i) * FLOATS;
      floats[f] = v.x;
      floats[f + 1] = v.z;
      floats[f + 2] = v.heading;
      floats[f + 3] = source.progress;
      const b = (row * this.cars + i) * BYTES;
      bytes[b] = clamp(Math.round(v.vx / SPEED_UNIT), 0, 255);
      bytes[b + 1] = byte(0.5 + v.steerAngle);
      bytes[b + 2] = byte(v.drs);
      bytes[b + 3] = byte(t.throttle);
      bytes[b + 4] = byte(t.brake);
      bytes[b + 5] = byte(t.slide);
      bytes[b + 6] = byte(t.lockup);
      bytes[b + 7] = byte(t.wheelspin);
      bytes[b + 8] = byte(t.rumble);
      bytes[b + 9] = clamp(t.wheelsOff, 0, 4);
      bytes[b + 10] = clamp(t.gear + 1, 0, 255);
      bytes[b + 11] = clamp(Math.round(t.rpm / RPM_UNIT), 0, 255);
      bytes[b + 12] = source.pit;
      bytes[b + 13] = byte(0.5 + clamp(v.yawRate / 4, -0.5, 0.5));
    });
    this.frames++;
  }

  /** Anota un momento a la hora actual. */
  mark(event: ReplayMark): void {
    if (this.closed) return;
    this.events.push({ ...event, t: this.now });
  }

  /** Marca la largada (la repetición empieza unos segundos antes). */
  markStart(): void {
    if (this.startTime === null) this.startTime = this.now;
  }

  /**
   * Lee un auto a la hora `time` (s desde el primer cuadro), interpolando
   * posición, rumbo, velocidad y progreso entre los dos cuadros vecinos.
   */
  read(time: number, car: number, out: ReplayCar): ReplayCar {
    const position = clamp(time / STEP, 0, Math.max(0, this.frames - 1));
    const f0 = Math.floor(position);
    const f1 = Math.min(this.frames - 1, f0 + 1);
    const a = position - f0;
    const i0 = this.locate(f0, car);
    const i1 = this.locate(f1, car);
    const floats0 = this.floats[i0.chunk];
    const floats1 = this.floats[i1.chunk];
    const bytes0 = this.bytes[i0.chunk];
    const bytes1 = this.bytes[i1.chunk];
    if (!floats0 || !floats1 || !bytes0 || !bytes1) return out;
    const p0 = i0.offset * FLOATS;
    const p1 = i1.offset * FLOATS;
    const b0 = i0.offset * BYTES;
    const b1 = i1.offset * BYTES;
    const mix = (x: number, y: number): number => x + (y - x) * a;
    const near = a < 0.5 ? bytes0 : bytes1;
    const bn = a < 0.5 ? b0 : b1;
    out.x = mix(floats0[p0] ?? 0, floats1[p1] ?? 0);
    out.z = mix(floats0[p0 + 1] ?? 0, floats1[p1 + 1] ?? 0);
    out.heading = lerpAngle(floats0[p0 + 2] ?? 0, floats1[p1 + 2] ?? 0, a);
    out.progress = mix(floats0[p0 + 3] ?? 0, floats1[p1 + 3] ?? 0);
    const s0 = (bytes0[b0] ?? 0) * SPEED_UNIT;
    const s1 = (bytes1[b1] ?? 0) * SPEED_UNIT;
    out.speed = mix(s0, s1);
    out.accel = (s1 - s0) * REPLAY_HZ;
    out.steer = mix((bytes0[b0 + 1] ?? 128) / 255 - 0.5, (bytes1[b1 + 1] ?? 128) / 255 - 0.5);
    out.drs = mix((bytes0[b0 + 2] ?? 0) / 255, (bytes1[b1 + 2] ?? 0) / 255);
    out.throttle = (near[bn + 3] ?? 0) / 255;
    out.brake = (near[bn + 4] ?? 0) / 255;
    out.slide = (near[bn + 5] ?? 0) / 255;
    out.lockup = (near[bn + 6] ?? 0) / 255;
    out.wheelspin = (near[bn + 7] ?? 0) / 255;
    out.rumble = (near[bn + 8] ?? 0) / 255;
    out.wheelsOff = near[bn + 9] ?? 0;
    out.gear = (near[bn + 10] ?? 1) - 1;
    out.rpm = mix(bytes0[b0 + 11] ?? 0, bytes1[b1 + 11] ?? 0) * RPM_UNIT;
    out.pit = (near[bn + 12] ?? 0) as PitMark;
    out.yawRate = ((near[bn + 13] ?? 128) / 255 - 0.5) * 4;
    return out;
  }

  private locate(frame: number, car: number): { chunk: number; offset: number } {
    return { chunk: Math.floor(frame / CHUNK), offset: (frame % CHUNK) * this.cars + car };
  }
}

/** Una pose vacía para leer en ella. */
export function emptyReplayCar(): ReplayCar {
  return {
    x: 0,
    z: 0,
    heading: 0,
    speed: 0,
    accel: 0,
    yawRate: 0,
    steer: 0,
    drs: 0,
    throttle: 0,
    brake: 0,
    slide: 0,
    lockup: 0,
    wheelspin: 0,
    rumble: 0,
    wheelsOff: 0,
    gear: 1,
    rpm: 0,
    progress: 0,
    pit: 0,
  };
}
