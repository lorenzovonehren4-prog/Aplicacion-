/**
 * Choques entre autos. Cada auto es una cadena de tres círculos a lo largo de
 * su eje (trompa, centro y cola): barato de probar y fiel a la forma larga y
 * angosta de un monoplaza. Cuando dos se tocan, se separan a medias y se
 * aplica un impulso en el punto de contacto con rebote bajo y fricción: un
 * toque de costado hace girar al otro, un golpe por detrás lo empuja.
 */

import type { Vehicle } from './Vehicle';

/** Centros de los círculos (m, adelante del CG) y su radio. */
const CIRCLES = [2.15, 0.3, -1.6] as const;
const RADIUS = 0.92;
/** Distancia entre CG por encima de la cual dos autos no pueden tocarse. */
const BROAD_PHASE = 2 * (2.15 + RADIUS);
const RESTITUTION = 0.15;
const FRICTION = 0.3;

export interface CarContact {
  a: number;
  b: number;
  /** Velocidad de impacto (m/s). */
  speed: number;
}

interface Point {
  x: number;
  z: number;
}

/** Más separados que esto a lo largo de la vuelta (m), dos autos van por tramos distintos. */
const CROSSING_SPAN = 40;
const circleA: Point = { x: 0, z: 0 };
const circleB: Point = { x: 0, z: 0 };
const velocityA: Point = { x: 0, z: 0 };
const velocityB: Point = { x: 0, z: 0 };

function circleCenter(car: Vehicle, offset: number, out: Point): Point {
  out.x = car.x - Math.sin(car.heading) * offset;
  out.z = car.z - Math.cos(car.heading) * offset;
  return out;
}

/**
 * Resuelve los choques de este paso.
 * @param solid qué autos chocan (un auto que vuelve a la pista es "fantasma" unos segundos)
 * @returns los contactos con impacto (para sonido, cámara y estadísticas)
 */
export function resolveCarCollisions(
  cars: readonly Vehicle[],
  contacts: CarContact[] = [],
  solid: readonly boolean[] = [],
): CarContact[] {
  contacts.length = 0;
  for (let i = 0; i < cars.length; i++) {
    const a = cars[i];
    if (!a || solid[i] === false) continue;
    for (let j = i + 1; j < cars.length; j++) {
      const b = cars[j];
      if (!b || solid[j] === false) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      if (dx * dx + dz * dz > BROAD_PHASE * BROAD_PHASE) continue;
      // En un cruce de la pista (Suzuka) dos autos pueden coincidir en el plano
      // yendo por tramos distintos de la vuelta: ahí no se tocan.
      if (Math.abs(a.track.geometry.deltaS(a.projection.s, b.projection.s)) > CROSSING_SPAN) continue;
      const speed = collide(a, b);
      if (speed > 0) contacts.push({ a: i, b: j, speed });
    }
  }
  return contacts;
}

/** Choque entre dos autos: devuelve la velocidad de impacto (0 si no se tocan o se alejan). */
function collide(a: Vehicle, b: Vehicle): number {
  // Par de círculos con más penetración.
  let deepest = 0;
  let nx = 0;
  let nz = 0;
  let contactX = 0;
  let contactZ = 0;
  for (const oa of CIRCLES) {
    circleCenter(a, oa, circleA);
    for (const ob of CIRCLES) {
      circleCenter(b, ob, circleB);
      const dx = circleB.x - circleA.x;
      const dz = circleB.z - circleA.z;
      const distance = Math.hypot(dx, dz);
      const penetration = 2 * RADIUS - distance;
      if (penetration <= deepest) continue;
      deepest = penetration;
      // Normal de A hacia B (si coinciden, se separan de costado).
      if (distance > 1e-6) {
        nx = dx / distance;
        nz = dz / distance;
      } else {
        nx = -Math.cos(a.heading);
        nz = Math.sin(a.heading);
      }
      contactX = (circleA.x + circleB.x) / 2;
      contactZ = (circleA.z + circleB.z) / 2;
    }
  }
  if (deepest <= 0) return 0;

  // Separación: mitad y mitad.
  a.translate(-nx * deepest * 0.5, -nz * deepest * 0.5);
  b.translate(nx * deepest * 0.5, nz * deepest * 0.5);

  // Velocidad relativa de los puntos de contacto.
  const rax = contactX - a.x;
  const raz = contactZ - a.z;
  const rbx = contactX - b.x;
  const rbz = contactZ - b.z;
  a.worldVelocity(velocityA);
  b.worldVelocity(velocityB);
  // Velocidad por el giro: rotación Y de three.js → (ω·rz, −ω·rx).
  const pointAx = velocityA.x + a.yawRate * raz;
  const pointAz = velocityA.z - a.yawRate * rax;
  const pointBx = velocityB.x + b.yawRate * rbz;
  const pointBz = velocityB.z - b.yawRate * rbx;
  const relX = pointBx - pointAx;
  const relZ = pointBz - pointAz;
  const vn = relX * nx + relZ * nz;
  if (vn >= 0) return 0;

  const massA = a.spec.mass;
  const massB = b.spec.mass;
  const crossA = rax * nz - raz * nx;
  const crossB = rbx * nz - rbz * nx;
  const inverse = 1 / massA + 1 / massB + (crossA * crossA) / a.spec.yawInertia + (crossB * crossB) / b.spec.yawInertia;
  const j = (-(1 + RESTITUTION) * vn) / inverse;
  // Fricción a lo largo del contacto (roce de costado).
  const tx = -nz;
  const tz = nx;
  const vt = relX * tx + relZ * tz;
  const jt = Math.max(-FRICTION * j, Math.min(FRICTION * j, -vt / inverse));
  const ix = j * nx + jt * tx;
  const iz = j * nz + jt * tz;
  a.applyImpulse(-ix, -iz, rax, raz);
  b.applyImpulse(ix, iz, rbx, rbz);
  const speed = -vn;
  a.reportImpact(speed);
  b.reportImpact(speed);
  return speed;
}
