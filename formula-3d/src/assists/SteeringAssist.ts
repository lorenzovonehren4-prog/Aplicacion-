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
 * - Si giras de más, quita casi todo el exceso (que haría patinar el tren
 *   delantero); si giras de menos, ayuda en proporción a lo que pides: un
 *   toque corto recibe poca ayuda.
 *
 * Además, el guardián de bordes (en cualquier parte de la pista): si el auto
 * se acerca al borde del asfalto yendo hacia afuera, el volante se corrige
 * solo hacia adentro, cada vez más fuerte cuanto más cerca del borde, hasta
 * volver a un par de metros adentro. Así cuesta mucho salirse.
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
/** Guardián de bordes: empieza a actuar a esta distancia del borde (m) y manda del todo en el borde. */
const GUARD_FROM = 4.5;
/** Cuánto manda el guardián sobre tu volante, como máximo (0–1). */
const GUARD_MAX = 0.9;
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
    const lookahead = 6 + Math.max(0, car.vx) * 0.45;
    // La trazada ideal usa todo el ancho (pianos incluidos); la ayuda apunta
    // un poco más adentro para que las ruedas no pisen afuera a la salida.
    const limit = this.geometry.halfWidth - EDGE_MARGIN;
    const offset = Math.max(-limit, Math.min(limit, this.line.offsetAt(car.projection.s + lookahead)));
    return this.steerTowards(car, lookahead, offset);
  }

  /** Volante (persecución pura) hacia el punto de la pista `lookahead` m adelante, a `offset` del centro. */
  private steerTowards(car: Vehicle, lookahead: number, offset: number): number {
    const speed = Math.max(0, car.vx);
    this.geometry.pointAt(car.projection.s + lookahead, offset, this.target);
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
    if (!this.enabled || car.vx < MIN_SPEED) return out;
    out.steer = this.cornerHelp(input.steer, car);
    out.steer = this.edgeGuard(out.steer, car);
    this.active = Math.abs(out.steer - input.steer) > 0.08;
    return out;
  }

  /**
   * Guardián de bordes: cerca del borde y yendo hacia afuera, mezcla tu
   * volante con uno que vuelve a 2 m adentro del borde.
   */
  edgeGuard(steer: number, car: Vehicle): number {
    const g = this.geometry;
    const d = car.projection.d;
    const edge = g.halfWidth - Math.abs(d);
    if (edge > GUARD_FROM) return steer;
    // ¿Va hacia el borde? Velocidad lateral respecto de la pista (+ = derecha).
    const i = car.projection.index;
    const tx = g.tx[i] ?? 0;
    const tz = g.tz[i] ?? 1;
    const vx = -Math.sin(car.heading) * car.vx - Math.cos(car.heading) * car.vy;
    const vz = -Math.cos(car.heading) * car.vx + Math.sin(car.heading) * car.vy;
    const lateral = -vx * tz + vz * tx;
    const outward = lateral * Math.sign(d);
    // Si ya vuelve hacia adentro con decisión, no hace falta corregir.
    if (outward < -1.5) return steer;
    const weight = GUARD_MAX * Math.min(1, (GUARD_FROM - edge) / GUARD_FROM) * (outward > 0 ? 1 : 0.5);
    const inside = Math.sign(d) * (g.halfWidth - 2);
    const back = this.steerTowards(car, 8 + Math.max(0, car.vx) * 0.35, inside);
    return steer + (back - steer) * weight;
  }

  /** Ayuda en las curvas hacia el ápice (sólo si ya giras hacia ese lado). */
  private cornerHelp(steer: number, car: Vehicle): number {
    if (Math.abs(steer) < DEADZONE) return steer;
    const s = car.projection.s;
    const corner = Math.max(this.line.cornerMask[this.line.indexAt(s)] ?? 0, this.line.cornerMask[this.line.indexAt(s + 25)] ?? 0);
    if (corner < 0.5) return steer;
    const ideal = this.idealSteer(car);
    if (Math.sign(ideal) !== Math.sign(steer)) return steer;
    // Más giro que el ideal: se queda casi en el ideal, dejando un poco de tu
    // intención para cerrar la línea. Menos giro que el ideal: ayuda en
    // proporción a lo que pides (un toque corto recibe poca ayuda: nunca un
    // volantazo que no pediste).
    const asked = Math.min(1, Math.abs(steer) / Math.max(1e-3, Math.abs(ideal)));
    return Math.abs(steer) >= Math.abs(ideal)
      ? ideal + (steer - ideal) * EXTRA_KEPT
      : steer + (ideal - steer) * STRENGTH * asked;
  }
}
