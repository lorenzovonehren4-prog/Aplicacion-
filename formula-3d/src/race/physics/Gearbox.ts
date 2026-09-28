/**
 * Caja de cambios automática de 8 marchas (siempre automática, sin modo
 * manual). Sube cerca del corte, baja cuando la marcha inferior quedaría por
 * debajo del régimen de cambio (antes al frenar), corta la potencia unos
 * milisegundos en cada cambio y no "duda" entre dos marchas.
 */

import type { CarSpec } from './CarSpec';

/** −1 = marcha atrás; 1 a 8 = marchas adelante. */
export type Gear = number;

/** Tiempo mínimo entre dos cambios (s): evita que la caja "cace" marchas. */
const MIN_SHIFT_INTERVAL = 0.22;

export interface GearboxInputs {
  /** Velocidad de avance (m/s, negativa marcha atrás). */
  speed: number;
  throttle: number;
  brake: number;
  /** ¿Las ruedas traseras patinan? (no se sube de marcha por eso). */
  wheelspin: boolean;
}

export class Gearbox {
  gear: Gear = 1;
  /** Tiempo restante de corte de potencia por cambio (s). */
  shiftCut = 0;
  /** Cambios hechos (para sonidos y la animación "pop" del HUD). */
  shiftCount = 0;
  private sinceShift = 1;

  constructor(private readonly spec: CarSpec) {}

  reset(gear: Gear = 1): void {
    this.gear = gear;
    this.shiftCut = 0;
    this.sinceShift = 1;
  }

  /** Relación total de la marcha actual. */
  get ratio(): number {
    if (this.gear < 0) return this.spec.reverseRatio;
    return this.spec.gearRatios[this.gear - 1] ?? this.spec.gearRatios[0] ?? 1;
  }

  /** Régimen que tendría el motor en la marcha `gear` a velocidad `speed`. */
  rpmFor(gear: Gear, speed: number): number {
    const ratio = gear < 0 ? this.spec.reverseRatio : (this.spec.gearRatios[gear - 1] ?? 1);
    return ((Math.abs(speed) / this.spec.wheelRadius) * ratio * 60) / (2 * Math.PI);
  }

  update(dt: number, inputs: GearboxInputs): void {
    this.sinceShift += dt;
    this.shiftCut = Math.max(0, this.shiftCut - dt);
    if (this.gear < 0) return;
    if (this.sinceShift < MIN_SHIFT_INTERVAL) return;

    const top = this.spec.gearRatios.length;
    const rpm = this.rpmFor(this.gear, inputs.speed);
    if (this.gear < top && rpm >= this.spec.shiftRpm && inputs.brake < 0.1) {
      this.shift(this.gear + 1);
      return;
    }
    if (this.gear > 1) {
      const lower = this.rpmFor(this.gear - 1, inputs.speed);
      // Al frenar se baja antes (freno motor y marcha lista para salir de la curva).
      const threshold = inputs.brake > 0.1 ? this.spec.shiftRpm - 500 : this.spec.shiftRpm - 1900;
      if (lower < threshold) this.shift(this.gear - 1);
    }
  }

  /** Pone o saca la marcha atrás (sólo detenido). */
  setReverse(reverse: boolean): void {
    if (reverse && this.gear > 0) this.shift(-1);
    else if (!reverse && this.gear < 0) this.shift(1);
  }

  private shift(gear: Gear): void {
    this.gear = gear;
    this.shiftCut = this.spec.shiftTime;
    this.sinceShift = 0;
    this.shiftCount++;
  }
}
