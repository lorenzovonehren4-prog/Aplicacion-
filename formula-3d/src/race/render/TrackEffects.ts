/**
 * Efectos de partículas de la pista, a partir de la telemetría de cada auto:
 * - Humo de neumáticos al derrapar, bloquear o patinar (en asfalto y pianos).
 * - Tierra y pasto que levantan las ruedas fuera de la pista.
 * - Chispas: el fondo plano que roza a alta velocidad o sobre los pianos, y
 *   ráfagas en los choques contra muros o entre autos (con una nube de humo).
 * La cantidad se escala con la calidad gráfica, y los autos lejanos a la
 * cámara no emiten (no se verían).
 */

import type { PerspectiveCamera, Scene } from 'three';
import type { Vehicle } from '../physics/Vehicle';
import { DUST, ParticleSystem, SMOKE, SPARKS } from './Particles';

/** Más allá de esta distancia a la cámara (m) un auto no emite. */
const EMIT_DISTANCE = 140;
const TWO_PI = Math.PI * 2;
const SLOTS = 6;
const IMPACT_SLOT = 5;

export class TrackEffects {
  private readonly smoke: ParticleSystem;
  private readonly dust: ParticleSystem;
  private readonly sparks: ParticleSystem;
  /**
   * Por auto, `SLOTS` valores: el resto fraccionario de partículas de cada
   * emisor (4 ruedas y el fondo plano, para no perderlas a altos FPS) y la
   * espera hasta la próxima ráfaga de choque.
   */
  private carry = new Float32Array(0);
  private readonly velocity = { x: 0, z: 0 };
  private viewHeight = 720;

  constructor(
    scene: Scene,
    /** Multiplicador de la calidad (0.3 en Baja … 1.3 en Ultra). */
    private readonly amount: number,
  ) {
    this.smoke = new ParticleSystem(SMOKE, amount);
    this.dust = new ParticleSystem(DUST, amount);
    this.sparks = new ParticleSystem(SPARKS, amount);
    scene.add(this.smoke.points, this.dust.points, this.sparks.points);
  }

  /** Alto de la imagen en píxeles reales (para el tamaño de las partículas). */
  setViewHeight(pixels: number): void {
    this.viewHeight = Math.max(1, pixels);
  }

  /**
   * Emite según el estado de los autos y mueve las partículas.
   * @param emit false en pausa o en la presentación (sólo se mueven las que ya hay)
   */
  update(dt: number, cars: readonly Vehicle[], camera: PerspectiveCamera, emit: boolean): void {
    if (dt <= 0) return;
    if (this.carry.length < cars.length * SLOTS) this.carry = new Float32Array(cars.length * SLOTS);
    if (emit) {
      const limit = EMIT_DISTANCE * EMIT_DISTANCE;
      for (let i = 0; i < cars.length; i++) {
        const car = cars[i];
        if (!car) continue;
        const dx = car.x - camera.position.x;
        const dz = car.z - camera.position.z;
        if (dx * dx + dz * dz > limit) continue;
        this.emitCar(i, car, dt);
      }
    }
    const scale = (this.viewHeight * 0.5) / Math.tan((camera.fov * Math.PI) / 360);
    this.smoke.setViewScale(scale);
    this.dust.setViewScale(scale);
    this.sparks.setViewScale(scale);
    this.smoke.update(dt);
    this.dust.update(dt);
    this.sparks.update(dt);
  }

  /** Ráfaga de chispas y humo en un choque (contra un muro o entre autos). */
  burst(x: number, z: number, speed: number, vx = 0, vz = 0): void {
    const strength = Math.min(1, speed / 18);
    const sparks = Math.round((10 + 50 * strength) * this.amount);
    for (let i = 0; i < sparks; i++) {
      const angle = Math.random() * TWO_PI;
      const out = 3 + Math.random() * 9 * (0.5 + strength);
      this.sparks.emit(
        x + (Math.random() - 0.5) * 0.8,
        0.2 + Math.random() * 0.4,
        z + (Math.random() - 0.5) * 0.8,
        vx * 0.5 + Math.cos(angle) * out,
        2 + Math.random() * 6,
        vz * 0.5 + Math.sin(angle) * out,
        0.35 + Math.random() * 0.5,
        0.13 + Math.random() * 0.08,
        1,
        1,
        0.55 + Math.random() * 0.3,
        0.18,
      );
    }
    const puffs = Math.round((4 + 14 * strength) * this.amount);
    for (let i = 0; i < puffs; i++) {
      const angle = Math.random() * TWO_PI;
      this.smoke.emit(
        x + Math.cos(angle) * 0.6,
        0.4 + Math.random() * 0.5,
        z + Math.sin(angle) * 0.6,
        vx * 0.3 + Math.cos(angle) * 2,
        0.8 + Math.random(),
        vz * 0.3 + Math.sin(angle) * 2,
        1.4 + Math.random() * 1.2,
        0.9 + Math.random() * 0.8,
        0.5,
        0.62,
        0.6,
        0.58,
      );
    }
  }

  /** Borra todo (al reiniciar la sesión o volver a la pista). */
  clear(): void {
    this.smoke.clear();
    this.dust.clear();
    this.sparks.clear();
    this.carry.fill(0);
  }

  dispose(): void {
    this.smoke.dispose();
    this.dust.dispose();
    this.sparks.dispose();
  }

  private emitCar(index: number, car: Vehicle, dt: number): void {
    const t = car.telemetry;
    const speed = t.speed;
    const v = car.worldVelocity(this.velocity);
    const forwardX = -Math.sin(car.heading);
    const forwardZ = -Math.cos(car.heading);

    // ─── Humo de neumáticos y tierra, rueda por rueda ───
    if (speed > 2) {
      for (let w = 0; w < 4; w++) {
        const wheel = car.wheels[w];
        if (!wheel) continue;
        const rear = w >= 2;
        const onTrack = wheel.surface === 'asphalt' || wheel.surface === 'kerb';
        if (onTrack) {
          const intensity = Math.max(t.slide * 0.9, t.lockup, rear ? t.wheelspin : 0) - 0.12;
          if (intensity <= 0) continue;
          const count = this.take(index, w, intensity * 55 * dt);
          for (let k = 0; k < count; k++) {
            this.smoke.emit(
              wheel.x + (Math.random() - 0.5) * 0.3,
              0.2,
              wheel.z + (Math.random() - 0.5) * 0.3,
              v.x * 0.35 + (Math.random() - 0.5) * 1.6,
              0.4 + Math.random() * 0.8,
              v.z * 0.35 + (Math.random() - 0.5) * 1.6,
              1.3 + Math.random() * 1.1,
              0.45 + Math.random() * 0.3,
              0.35 + 0.3 * Math.min(1, intensity),
              0.86,
              0.86,
              0.84,
            );
          }
        } else if (wheel.surface === 'grass' || wheel.surface === 'gravel') {
          const count = this.take(index, w, Math.min(1, speed / 40) * 40 * dt);
          const gravel = wheel.surface === 'gravel';
          for (let k = 0; k < count; k++) {
            this.dust.emit(
              wheel.x,
              0.15,
              wheel.z,
              v.x * 0.25 + (Math.random() - 0.5) * 2.4,
              1 + Math.random() * 2.2,
              v.z * 0.25 + (Math.random() - 0.5) * 2.4,
              0.8 + Math.random() * 0.8,
              0.35 + Math.random() * 0.3,
              gravel ? 0.55 : 0.4,
              gravel ? 0.66 : 0.42,
              gravel ? 0.58 : 0.4,
              gravel ? 0.46 : 0.26,
            );
          }
        }
      }
    }

    // ─── Chispas del fondo plano: a alta velocidad (compresión) y sobre los pianos ───
    const bottoming = speed > 62 ? (speed - 62) / 30 : 0;
    const kerbing = t.rumble > 0.5 && speed > 35 ? 0.9 : 0;
    const rate = Math.max(bottoming, kerbing) * (0.35 + Math.random() * 0.65);
    if (rate > 0) {
      const count = this.take(index, 4, rate * 70 * dt);
      for (let k = 0; k < count; k++) {
        const along = -0.6 - Math.random() * 1.6;
        this.sparks.emit(
          car.x + forwardX * along + (Math.random() - 0.5) * 0.5,
          0.04,
          car.z + forwardZ * along + (Math.random() - 0.5) * 0.5,
          v.x * 0.55 + (Math.random() - 0.5) * 3,
          0.6 + Math.random() * 2.4,
          v.z * 0.55 + (Math.random() - 0.5) * 3,
          0.18 + Math.random() * 0.25,
          0.06 + Math.random() * 0.04,
          1,
          1,
          0.62,
          0.25,
        );
      }
    }

    // ─── Golpe contra un muro (una ráfaga por golpe, aunque dure varios pasos) ───
    const wait = index * SLOTS + IMPACT_SLOT;
    this.carry[wait] = Math.max(0, (this.carry[wait] ?? 0) - dt);
    if (t.impact > 2.5 && (this.carry[wait] ?? 0) <= 0) {
      this.carry[wait] = 0.25;
      this.burst(car.x, car.z, t.impact, v.x, v.z);
    }
  }

  /** Cuántas partículas toca emitir, guardando el resto fraccionario del emisor. */
  private take(car: number, slot: number, amount: number): number {
    const key = car * SLOTS + slot;
    const total = (this.carry[key] ?? 0) + amount * this.amount;
    const whole = Math.floor(total);
    this.carry[key] = total - whole;
    return whole;
  }
}
