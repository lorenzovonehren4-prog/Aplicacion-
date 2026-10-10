import { LineFollower } from '../../src/race/ai/LineFollower';
import type { DriverInput, Vehicle } from '../../src/race/physics/Vehicle';
import type { Track } from '../../src/tracks/Track';

/**
 * Piloto de prueba: el `LineFollower` del juego por el centro de la pista, con
 * un margen sobre el perfil de velocidad. Sirve para comprobar que la física y
 * la pista permiten dar una vuelta. Mantiene un piloto por auto.
 */
const pilots = new WeakMap<Vehicle, LineFollower>();
const STEP = 1 / 120;

export function autopilot(car: Vehicle, track: Track, margin = 0.92): DriverInput {
  let pilot = pilots.get(car);
  if (!pilot) {
    pilot = new LineFollower(track, { margin });
    pilots.set(car, pilot);
  }
  pilot.options.margin = margin;
  return pilot.drive(car, STEP, { throttle: 0, brake: 0, steer: 0, drs: false });
}
