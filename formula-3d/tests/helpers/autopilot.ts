import type { Track } from '../../src/tracks/Track';
import type { DriverInput, Vehicle } from '../../src/race/physics/Vehicle';

/**
 * Piloto de prueba: sigue la línea central mirando hacia adelante (pure
 * pursuit) y respeta el perfil de velocidad del análisis del circuito, con un
 * margen. Sirve para comprobar que la física y la pista permiten dar una vuelta.
 */
let lastThrottle = 0;

export function autopilot(car: Vehicle, track: Track, margin = 0.92): DriverInput {
  const g = track.geometry;
  const s = car.projection.s;
  const speed = Math.max(0, car.vx);
  const lookahead = 6 + speed * 0.4;
  const target = { x: 0, z: 0 };
  g.pointAt(s + lookahead, 0, target);
  // Punto objetivo en ejes del auto.
  const dx = target.x - car.x;
  const dz = target.z - car.z;
  const sinH = Math.sin(car.heading);
  const cosH = Math.cos(car.heading);
  const forward = dx * -sinH + dz * -cosH;
  const left = dx * -cosH + dz * sinH;
  const curvature = (2 * left) / (forward * forward + left * left);
  const wheelbase = car.spec.cgToFront + car.spec.cgToRear;
  const wheelAngle = Math.atan(curvature * wheelbase);
  const maxSteer =
    car.spec.maxSteerHigh + (car.spec.maxSteerLow - car.spec.maxSteerHigh) / (1 + (speed / car.spec.steerSpeedFalloff) ** 2);
  const steer = Math.max(-1, Math.min(1, -wheelAngle / maxSteer));

  // Velocidad objetivo: mínimo del perfil en los próximos metros de frenada.
  let targetSpeed = Infinity;
  for (let ahead = 0; ahead < 60 + speed * 1.6; ahead += 4) {
    targetSpeed = Math.min(targetSpeed, (track.analysis.speed[g.indexAt(s + ahead)] ?? 0) * margin);
  }
  const error = targetSpeed - speed;
  // Acelerador con rampa, como un pie (o la rampa del teclado).
  const wanted = error > 0 ? Math.min(1, error * 0.5) : 0;
  lastThrottle = Math.min(wanted, lastThrottle + 1 / 120 / 0.25);
  return {
    throttle: lastThrottle,
    brake: error < -1 ? Math.min(1, -error * 0.25) : 0,
    steer,
    drs: false,
  };
}
