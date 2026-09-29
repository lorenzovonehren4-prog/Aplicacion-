/**
 * Ayuda de frenado: compara tu velocidad con la de un perfil de referencia
 * un poco más adelante (el tiempo de reacción) y, si vas pasado, frena por
 * ti. Los perfiles ya incluyen las curvas de frenada hacia cada curva, así
 * que "la velocidad del perfil en este punto" es la máxima con la que todavía
 * se llega a la próxima curva.
 *
 * Hay dos referencias: la del centro de la pista (prudente: sirve aunque no
 * sigas la trazada) y la de la trazada ideal (más rápida). Cuanto más baja la
 * ayuda, más se acerca a la ideal: sólo actúa cuando de verdad no llegas.
 *
 * - Completa: frena todo lo necesario y levanta el acelerador antes.
 * - Media: hasta 50 % de freno y sólo si vas bastante pasado.
 * - Baja: hasta 25 % y sólo en emergencias.
 */

import type { BrakingAssist as BrakingLevel } from '../core/save/schema';
import type { DriverInput } from '../race/physics/Vehicle';

/** Algo que da la velocidad de referencia en cada punto de la pista (m/s). */
export interface SpeedReference {
  speedAt(s: number): number;
}

interface LevelTuning {
  /** 0 = referencia del centro de la pista, 1 = trazada ideal. */
  blend: number;
  /**
   * Anticipación (s): se mira el perfil donde estará el auto en ese tiempo.
   * Con 0 sólo actúa cuando ya no se llega ni frenando a fondo (emergencia).
   */
  reaction: number;
  /** Fracción de la velocidad del perfil que se toma como límite. */
  margin: number;
  /** Exceso (m/s) a partir del cual actúa. */
  threshold: number;
  /** Freno máximo que aplica (0–1). */
  maxBrake: number;
  /** m/s de exceso para llegar al freno máximo. */
  ramp: number;
  /** Levanta el acelerador al acercarse al límite. */
  liftThrottle: boolean;
}

const TUNING: Readonly<Record<Exclude<BrakingLevel, 'off'>, LevelTuning>> = {
  full: { blend: 0, reaction: 0.35, margin: 0.95, threshold: 0, maxBrake: 1, ramp: 2.5, liftThrottle: true },
  medium: { blend: 0.5, reaction: 0.15, margin: 1, threshold: 3, maxBrake: 0.5, ramp: 5, liftThrottle: false },
  low: { blend: 1, reaction: 0, margin: 1, threshold: 4, maxBrake: 0.25, ramp: 5, liftThrottle: false },
};

/** Por debajo de esta velocidad la ayuda no actúa (maniobras, salida). */
const MIN_SPEED = 10;

export class BrakingAssist {
  /** La ayuda actuó en el último paso (para iluminar su ícono). */
  active = false;

  constructor(
    private readonly safe: SpeedReference,
    private readonly ideal: SpeedReference,
    public level: BrakingLevel,
  ) {}

  /**
   * Devuelve los mandos corregidos (no modifica `input`).
   * @param s posición del auto en la pista (m)
   * @param speed velocidad hacia adelante (m/s)
   */
  apply(input: DriverInput, s: number, speed: number, out: DriverInput): DriverInput {
    out.throttle = input.throttle;
    out.brake = input.brake;
    out.steer = input.steer;
    out.drs = input.drs;
    this.active = false;
    if (this.level === 'off' || speed < MIN_SPEED) return out;
    const tuning = TUNING[this.level];

    // El límite más bajo entre acá y donde estaremos en el tiempo de reacción.
    const ahead = speed * tuning.reaction;
    const at = (x: number): number => {
      const safe = this.safe.speedAt(x);
      return safe + (this.ideal.speedAt(x) - safe) * tuning.blend;
    };
    let limit = at(s + ahead);
    for (let x = 0; x < ahead; x += 4) limit = Math.min(limit, at(s + x));
    limit *= tuning.margin;

    const excess = speed - limit;
    if (tuning.liftThrottle && excess > -3) {
      // Levanta de a poco en los últimos 3 m/s antes del límite.
      out.throttle = Math.min(out.throttle, Math.max(0, -excess / 3));
      if (out.throttle < input.throttle - 0.05) this.active = true;
    }
    if (excess > tuning.threshold) {
      const brake = Math.min(tuning.maxBrake, (excess - tuning.threshold) / tuning.ramp + 0.1);
      if (brake > out.brake) {
        out.brake = brake;
        out.throttle = 0;
        this.active = true;
      }
    }
    return out;
  }
}
