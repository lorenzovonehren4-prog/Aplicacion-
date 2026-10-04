/**
 * Une la física con el modelo 3D: interpola la pose entre pasos fijos (el
 * auto se mueve suave a cualquier FPS), gira y dobla las ruedas, abre el
 * flap del DRS, inclina la carrocería con las fuerzas G y enciende la luz
 * trasera al recuperar energía en las frenadas.
 */

import type { Group } from 'three';
import { CAR_DIMENSIONS, CarModel } from '../../garage/CarModel';
import type { LiveryConfig } from '../../garage/livery';
import { clamp, damp } from '../../core/utils/math';
import type { Vehicle } from '../physics/Vehicle';
import { SteeringWheel } from './SteeringWheel';

/** El origen del modelo está 0,2 m delante del centro de gravedad. */
const MODEL_OFFSET = 0.2;
/** Inclinación visual (rad) por m/s² de aceleración. */
const PITCH_PER_ACCEL = 0.0011;
const ROLL_PER_ACCEL = 0.0013;
/** Entre ejes del modelo (m) y altura del origen (z = 0) entre los dos gatos. */
const WHEELBASE = CAR_DIMENSIONS.rearAxleZ - CAR_DIMENSIONS.frontAxleZ;
const ORIGIN_FROM_REAR = CAR_DIMENSIONS.rearAxleZ / WHEELBASE;

export interface PoseSnapshot {
  x: number;
  z: number;
  heading: number;
}

/** Interpola ángulos por el camino corto. */
function lerpAngle(a: number, b: number, t: number): number {
  let delta = b - a;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return a + delta * t;
}

export class CarRig {
  readonly model: CarModel;
  readonly wheel: SteeringWheel;
  /** Pose interpolada (lo que se dibuja): la usa la cámara. */
  readonly pose: PoseSnapshot = { x: 0, z: 0, heading: 0 };
  /** Inclinación de la carrocería (para la cámara cockpit). */
  pitch = 0;
  roll = 0;
  private readonly previous: PoseSnapshot = { x: 0, z: 0, heading: 0 };
  private time = 0;

  constructor(
    private readonly vehicle: Vehicle,
    livery: LiveryConfig,
    anisotropy: number,
  ) {
    this.model = new CarModel({ livery, anisotropy });
    this.wheel = new SteeringWheel({ suit: livery.primary, stripe: livery.secondary, accent: livery.accent });
    this.model.root.add(this.wheel.root);
    this.snap();
  }

  get root(): Group {
    return this.model.root;
  }

  /** Guarda la pose antes de un paso fijo (para interpolar). */
  beforeStep(): void {
    this.previous.x = this.vehicle.x;
    this.previous.z = this.vehicle.z;
    this.previous.heading = this.vehicle.heading;
  }

  /** Sin interpolación (al colocar o reiniciar el auto). */
  snap(): void {
    this.beforeStep();
    this.pitch = 0;
    this.roll = 0;
    this.apply(1, 0);
  }

  /** Dibuja la pose interpolada con `alpha` entre el paso anterior y el actual. */
  update(dt: number, alpha: number): void {
    this.time += dt;
    this.apply(alpha, dt);
  }

  /** Ángulo de las ruedas delanteras (rad, + izquierda): la cabeza del piloto mira hacia la curva. */
  get steer(): number {
    return this.vehicle.steerAngle;
  }

  /** Muestra u oculta el casco (en la cámara cockpit la cámara está adentro). */
  setDriverVisible(visible: boolean): void {
    this.model.driver.visible = visible;
  }

  dispose(): void {
    this.wheel.dispose();
    this.model.dispose();
  }

  private apply(alpha: number, dt: number): void {
    const v = this.vehicle;
    const t = clamp(alpha, 0, 1);
    const x = this.previous.x + (v.x - this.previous.x) * t;
    const z = this.previous.z + (v.z - this.previous.z) * t;
    const heading = lerpAngle(this.previous.heading, v.heading, t);
    this.pose.x = x;
    this.pose.z = z;
    this.pose.heading = heading;

    // Inclinación por fuerzas G (frenar baja la trompa; doblar inclina hacia afuera).
    const tel = v.telemetry;
    if (dt > 0) {
      this.pitch = damp(this.pitch, clamp(-tel.ax * PITCH_PER_ACCEL, -0.035, 0.035), 8, dt);
      this.roll = damp(this.roll, clamp(tel.ay * ROLL_PER_ACCEL, -0.04, 0.04), 8, dt);
    }

    const root = this.model.root;
    const sin = Math.sin(heading);
    const cos = Math.cos(heading);
    // En boxes, los gatos levantan la trompa y la cola (cada eje a su altura).
    const jacks = v.pitPose;
    const raise = jacks.liftRear + (jacks.liftFront - jacks.liftRear) * ORIGIN_FROM_REAR;
    const tilt = Math.atan2(jacks.liftFront - jacks.liftRear, WHEELBASE);
    // Adelante = (−sin ψ, −cos ψ).
    root.position.set(x - sin * MODEL_OFFSET, 0.001 + raise, z - cos * MODEL_OFFSET);
    root.rotation.set(this.pitch + tilt, heading, this.roll, 'YXZ');

    // Ruedas: giro de rodado (derecha gira en −X local; la izquierda está espejada).
    // Las que el equipo sacó no se ven (las lleva un mecánico).
    const wheels = this.model.wheels;
    wheels.fl.steer.visible = (jacks.wheelsOff & 1) === 0;
    wheels.fr.steer.visible = (jacks.wheelsOff & 2) === 0;
    wheels.rl.steer.visible = (jacks.wheelsOff & 4) === 0;
    wheels.rr.steer.visible = (jacks.wheelsOff & 8) === 0;
    for (const rig of [wheels.fl, wheels.fr]) rig.spin.rotation.x = -v.wheelSpinFront * rig.side;
    for (const rig of [wheels.rl, wheels.rr]) rig.spin.rotation.x = -v.wheelSpinRear * rig.side;
    this.model.setSteer(v.steerAngle);
    this.model.setDrs(v.drs);

    // Luz trasera: parpadea al recuperar energía (frenando o soltando a alta velocidad).
    const harvesting = tel.brake > 0.2 || (tel.throttle < 0.05 && tel.speed > 30);
    this.model.setRearLight(harvesting ? (Math.floor(this.time * 8) % 2 === 0 ? 1 : 0.1) : 0.12);
  }
}
