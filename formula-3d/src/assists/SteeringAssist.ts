/**
 * Ayuda de dirección (nivel Principiante): cuando giras hacia una curva, el
 * volante se acerca al ángulo que lleva el auto por la trazada ideal hacia el
 * ápice (persecución pura hacia un punto de la trazada un poco más adelante).
 *
 * - Sólo en curvas (frenada, curva y salida: la máscara de curvas de la
 *   trazada): en las rectas el volante es todo tuyo para cambiar de carril.
 * - Sólo corrige si ya estás girando hacia el mismo lado que pide la curva:
 *   si no tocas el volante o giras al revés (para adelantar o esquivar), no
 *   hace nada. Nunca maneja por ti.
 * - Con teclado (siempre a fondo) quita casi todo el giro de más, que haría
 *   patinar el tren delantero y cerrarse hacia adentro; con un giro tímido,
 *   completa lo que falta.
 */

import type { RacingLine } from '../tracks/RacingLine';
import type { TrackGeometry } from '../tracks/TrackGeometry';
import type { DriverInput, Vehicle } from '../race/physics/Vehicle';

/** Cuánto completa el giro cuando giras menos de lo necesario (0–1). */
const STRENGTH = 0.75;
/** Cuánto giro de más se respeta cuando giras más de lo necesario (0–1). */
const EXTRA_KEPT = 0.1;
/** Distancia al borde del asfalto que la ayuda respeta (m). */
const EDGE_MARGIN = 1.6;
/** Por debajo de esta velocidad no actúa (maniobras). */
const MIN_SPEED = 8;
/** Giro mínimo del jugador para considerar que "está girando". */
const DEADZONE = 0.05;

export class SteeringAssist {
  enabled = false;
  /** Corrigió el volante en el último paso (para iluminar su ícono). */
  active = false;
  private readonly target = { x: 0, z: 0 };

  constructor(
    private readonly geometry: TrackGeometry,
    private readonly line: RacingLine,
  ) {}

  /** Volante que lleva el auto hacia la trazada ideal (−1 … 1, como el mando). */
  idealSteer(car: Vehicle): number {
    const speed = Math.max(0, car.vx);
    const s = car.projection.s;
    const lookahead = 6 + speed * 0.45;
    // La trazada ideal usa todo el ancho (pianos incluidos); la ayuda apunta
    // un poco más adentro para que las ruedas no pisen afuera a la salida.
    const limit = this.geometry.halfWidth - EDGE_MARGIN;
    const offset = Math.max(-limit, Math.min(limit, this.line.offsetAt(s + lookahead)));
    this.geometry.pointAt(s + lookahead, offset, this.target);
    const dx = this.target.x - car.x;
    const dz = this.target.z - car.z;
    const sinH = Math.sin(car.heading);
    const cosH = Math.cos(car.heading);
    const forward = dx * -sinH + dz * -cosH;
    const left = dx * -cosH + dz * sinH;
    const curvature = (2 * left) / Math.max(1, forward * forward + left * left);
    const spec = car.spec;
    const wheelAngle = Math.atan(curvature * (spec.cgToFront + spec.cgToRear));
    const maxSteer =
      spec.maxSteerHigh + (spec.maxSteerLow - spec.maxSteerHigh) / (1 + (speed / spec.steerSpeedFalloff) ** 2);
    return Math.max(-1, Math.min(1, -wheelAngle / maxSteer));
  }

  /** Corrige el volante de `input` (escribe en `out`, que puede ser el mismo objeto). */
  apply(input: DriverInput, car: Vehicle, out: DriverInput): DriverInput {
    this.active = false;
    out.steer = input.steer;
    if (!this.enabled || car.vx < MIN_SPEED || Math.abs(input.steer) < DEADZONE) return out;
    const s = car.projection.s;
    const corner = Math.max(this.line.cornerMask[this.line.indexAt(s)] ?? 0, this.line.cornerMask[this.line.indexAt(s + 25)] ?? 0);
    if (corner < 0.5) return out;
    const ideal = this.idealSteer(car);
    if (Math.sign(ideal) !== Math.sign(input.steer)) return out;
    // Más giro que el ideal (típico con teclado, siempre a fondo): se queda
    // casi en el ideal, dejando un poco de tu intención para cerrar la línea.
    // Menos giro que el ideal: completa buena parte de lo que falta.
    const steer =
      Math.abs(input.steer) >= Math.abs(ideal)
        ? ideal + (input.steer - ideal) * EXTRA_KEPT
        : input.steer + (ideal - input.steer) * STRENGTH;
    this.active = Math.abs(steer - input.steer) > 0.08;
    out.steer = steer;
    return out;
  }
}
