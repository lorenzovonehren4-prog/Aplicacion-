/**
 * Piloto que sigue una línea: persecución pura hacia un punto adelante sobre
 * el centro de la pista o sobre la trazada ideal, y acelerador/freno para
 * respetar un perfil de velocidad con un margen.
 *
 * Lo usan la vuelta de enfriamiento al terminar una carrera y las pruebas
 * automáticas; en la Fase 4 es la base de los bots.
 */

import type { Track } from '../../tracks/Track';
import type { DriverInput, Vehicle } from '../physics/Vehicle';

export interface LineFollowerOptions {
  /** Sigue la trazada ideal (si no, el centro de la pista). */
  racingLine: boolean;
  /** Fracción de la velocidad del perfil a la que apunta (0–1). */
  margin: number;
  /** Velocidad máxima (m/s), p. ej. en la vuelta de enfriamiento. */
  speedCap: number;
}

const DEFAULTS: LineFollowerOptions = { racingLine: false, margin: 0.92, speedCap: Infinity };
/** El acelerador sube como un pie: de 0 a 1 en este tiempo (s). */
const THROTTLE_RISE = 0.25;

export class LineFollower {
  options: LineFollowerOptions;
  private throttle = 0;
  private readonly target = { x: 0, z: 0 };

  constructor(
    private readonly track: Track,
    options: Partial<LineFollowerOptions> = {},
  ) {
    this.options = { ...DEFAULTS, ...options };
  }

  /** Calcula los mandos para este paso. */
  drive(car: Vehicle, dt: number, out: DriverInput): DriverInput {
    const g = this.track.geometry;
    const line = this.track.racingLine;
    const s = car.projection.s;
    const speed = Math.max(0, car.vx);

    // ─── Dirección: persecución pura ───
    const lookahead = 6 + speed * 0.4;
    const offset = this.options.racingLine ? line.offsetAt(s + lookahead) : 0;
    g.pointAt(s + lookahead, offset, this.target);
    const dx = this.target.x - car.x;
    const dz = this.target.z - car.z;
    const sinH = Math.sin(car.heading);
    const cosH = Math.cos(car.heading);
    const forward = dx * -sinH + dz * -cosH;
    const left = dx * -cosH + dz * sinH;
    const curvature = (2 * left) / (forward * forward + left * left);
    const spec = car.spec;
    const wheelAngle = Math.atan(curvature * (spec.cgToFront + spec.cgToRear));
    const maxSteer =
      spec.maxSteerHigh + (spec.maxSteerLow - spec.maxSteerHigh) / (1 + (speed / spec.steerSpeedFalloff) ** 2);
    out.steer = Math.max(-1, Math.min(1, -wheelAngle / maxSteer));

    // ─── Velocidad: lo más bajo del perfil en la distancia de frenada ───
    let targetSpeed = this.options.speedCap;
    for (let ahead = 0; ahead < 60 + speed * 1.6; ahead += 4) {
      const reference = this.options.racingLine ? line.speedAt(s + ahead) : this.track.centerSpeedAt(s + ahead);
      targetSpeed = Math.min(targetSpeed, reference * this.options.margin);
    }
    const error = targetSpeed - speed;
    const wanted = error > 0 ? Math.min(1, error * 0.5) : 0;
    this.throttle = Math.min(wanted, this.throttle + dt / THROTTLE_RISE);
    out.throttle = this.throttle;
    out.brake = error < -1 ? Math.min(1, -error * 0.25) : 0;
    out.drs = false;
    return out;
  }
}
