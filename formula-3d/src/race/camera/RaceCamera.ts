/**
 * Cámaras de carrera:
 * - cockpit: a la altura del casco, con el halo y el volante a la vista; la
 *   cabeza se mueve con las fuerzas G,
 * - T-cam: sobre la toma de aire, como en las transmisiones,
 * - persecución: detrás y arriba, con el rumbo retrasado para que se note el
 *   giro y el campo de visión que se abre con la velocidad.
 *
 * El cambio entre cámaras es un fundido de 0,35 s de posición, orientación y
 * FOV. Los pianos, la grava y los choques sacuden la cámara.
 */

import { MathUtils, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import type { CameraMode } from '../../core/save/schema';
import { clamp, damp } from '../../core/utils/math';
import type { Telemetry } from '../physics/Vehicle';
import type { CarRig } from '../render/CarRig';

export const CAMERA_ORDER: readonly CameraMode[] = ['cockpit', 'tcam', 'chase'];

export const CAMERA_LABELS: Readonly<Record<CameraMode, string>> = {
  cockpit: 'Cockpit',
  tcam: 'T-cam',
  chase: 'Persecución',
};

const TRANSITION_TIME = 0.35;

interface Pose {
  position: Vector3;
  quaternion: Quaternion;
  fov: number;
}

function createPose(): Pose {
  return { position: new Vector3(), quaternion: new Quaternion(), fov: 60 };
}

const UP = new Vector3(0, 1, 0);

export class RaceCamera {
  readonly camera = new PerspectiveCamera(62, 16 / 9, 0.08, 12000);
  private mode: CameraMode;
  private previousMode: CameraMode | null = null;
  private transition = 1;
  private transitionTime = TRANSITION_TIME;
  private readonly current = createPose();
  private readonly from = createPose();
  private readonly scratch = createPose();
  private readonly target = new Vector3();
  private readonly local = new Vector3();
  private readonly carUp = new Vector3();
  private readonly carOrigin = new Vector3();
  /** Rumbo retrasado de la cámara de persecución. */
  private chaseHeading = 0;
  private chaseSpeed = 0;
  /** Desplazamiento de la cabeza por fuerzas G (m, ejes del auto). */
  private headX = 0;
  private headZ = 0;
  private shake = 0;
  private time = 0;
  /** Sacudones activados (se desactivan con "reducir movimiento"). */
  shakeEnabled = true;

  constructor(
    private readonly rig: CarRig,
    initial: CameraMode,
  ) {
    this.mode = initial;
    this.chaseHeading = rig.pose.heading;
    rig.setDriverVisible(initial !== 'cockpit');
  }

  get currentMode(): CameraMode {
    return this.mode;
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Pasa a la siguiente cámara y devuelve la nueva. */
  cycle(): CameraMode {
    const next = CAMERA_ORDER[(CAMERA_ORDER.indexOf(this.mode) + 1) % CAMERA_ORDER.length] ?? 'chase';
    this.setMode(next);
    return next;
  }

  setMode(mode: CameraMode, instant = false): void {
    if (mode === this.mode) return;
    this.from.position.copy(this.current.position);
    this.from.quaternion.copy(this.current.quaternion);
    this.from.fov = this.current.fov;
    this.previousMode = this.mode;
    this.mode = mode;
    this.transition = instant ? 1 : 0;
    this.transitionTime = TRANSITION_TIME;
    this.rig.setDriverVisible(mode !== 'cockpit');
  }

  /**
   * Arranca una transición desde una pose externa (la cámara de presentación)
   * hacia la cámara elegida.
   */
  blendFrom(position: Vector3, quaternion: Quaternion, fov: number, seconds: number): void {
    this.from.position.copy(position);
    this.from.quaternion.copy(quaternion);
    this.from.fov = fov;
    this.previousMode = this.mode;
    this.transition = 0;
    this.transitionTime = Math.max(0.05, seconds);
    this.resetFollow();
  }

  /** Coloca la persecución detrás del auto sin arrastre (tras un reinicio). */
  resetFollow(): void {
    this.chaseHeading = this.rig.pose.heading;
    this.headX = 0;
    this.headZ = 0;
  }

  /** Suma un sacudón (0–1) que se apaga solo. */
  kick(amount: number): void {
    this.shake = Math.min(1.5, this.shake + amount);
  }

  update(dt: number, telemetry: Telemetry): void {
    this.time += dt;
    const speed = telemetry.speed;

    // Estado compartido: arrastre de la persecución y movimiento de la cabeza.
    this.chaseHeading = damp(this.chaseHeading, this.unwrapNear(this.rig.pose.heading, this.chaseHeading), 5.5 + speed * 0.02, dt);
    this.chaseSpeed = damp(this.chaseSpeed, speed, 2, dt);
    this.headX = damp(this.headX, clamp(telemetry.ay * 0.0035, -0.05, 0.05), 6, dt);
    this.headZ = damp(this.headZ, clamp(telemetry.ax * 0.0028, -0.045, 0.045), 6, dt);
    this.shake = Math.max(0, this.shake - dt * 3);

    this.computePose(this.mode, this.current, telemetry);
    if (this.transition < 1 && this.previousMode) {
      this.transition = Math.min(1, this.transition + dt / this.transitionTime);
      const t = MathUtils.smootherstep(this.transition, 0, 1);
      this.current.position.lerpVectors(this.from.position, this.current.position, t);
      this.scratch.quaternion.copy(this.from.quaternion).slerp(this.current.quaternion, t);
      this.current.quaternion.copy(this.scratch.quaternion);
      this.current.fov = this.from.fov + (this.current.fov - this.from.fov) * t;
    }

    this.camera.position.copy(this.current.position);
    this.camera.quaternion.copy(this.current.quaternion);

    // Sacudón: vibración de pianos/grava + impactos.
    if (this.shakeEnabled) {
      const rumble = telemetry.rumble * clamp(speed / 40, 0.2, 1) * (this.mode === 'chase' ? 0.4 : 1);
      const amount = rumble * 0.012 + this.shake * 0.05;
      if (amount > 0.0005) {
        const f = this.time * 60;
        this.camera.position.y += Math.sin(f * 1.7) * amount;
        this.camera.position.x += Math.sin(f * 1.3 + 1) * amount * 0.6;
        this.camera.rotateZ(Math.sin(f * 0.9 + 2) * amount * 0.5);
      }
    }

    if (Math.abs(this.camera.fov - this.current.fov) > 0.01) {
      this.camera.fov = this.current.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Punto del auto (ejes del modelo: x derecha, y arriba, z atrás) → mundo. */
  private toWorld(x: number, y: number, z: number, out: Vector3): Vector3 {
    return out.set(x, y, z).applyMatrix4(this.rig.root.matrixWorld);
  }

  private computePose(mode: CameraMode, pose: Pose, telemetry: Telemetry): void {
    this.rig.root.updateMatrixWorld();
    const speedKmh = telemetry.speed * 3.6;
    switch (mode) {
      case 'cockpit': {
        // Ojos del piloto: bajo el arco del halo, detrás de la visera.
        this.toWorld(this.headX, 0.765 - Math.abs(this.headZ) * 0.2, -0.17 + this.headZ, pose.position);
        this.toWorld(this.headX * 0.4, 0.62, -12, this.target);
        pose.fov = 72 + clamp(speedKmh / 330, 0, 1) * 4;
        break;
      }
      case 'tcam': {
        this.toWorld(0, 1.14, 0.26, pose.position);
        this.toWorld(0, 0.72, -14, this.target);
        pose.fov = 64 + clamp(speedKmh / 330, 0, 1) * 5;
        break;
      }
      case 'chase': {
        // Detrás del auto según el rumbo retrasado, mirando un poco por delante.
        const h = this.chaseHeading;
        const distance = 6.4 + clamp(this.chaseSpeed / 90, 0, 1) * 1.1;
        const pose2d = this.rig.pose;
        pose.position.set(pose2d.x + Math.sin(h) * distance, 2.05, pose2d.z + Math.cos(h) * distance);
        this.target.set(pose2d.x - Math.sin(h) * 4, 0.9, pose2d.z - Math.cos(h) * 4);
        pose.fov = 60 + clamp(speedKmh / 330, 0, 1) * 10;
        break;
      }
    }
    // Orientación mirando al objetivo, con el "arriba" del auto en cockpit y T-cam.
    this.local.copy(this.target).sub(pose.position).normalize();
    if (mode === 'chase') {
      this.carUp.copy(UP);
    } else {
      this.toWorld(0, 0, 0, this.carOrigin);
      this.toWorld(0, 1, 0, this.carUp).sub(this.carOrigin).normalize();
    }
    this.lookRotation(this.local, this.carUp, pose.quaternion);
  }

  /** Cuaternión de una cámara que mira hacia `forward` con `up` como arriba. */
  private lookRotation(forward: Vector3, up: Vector3, out: Quaternion): void {
    const eye = this.camera;
    eye.position.set(0, 0, 0);
    eye.up.copy(up);
    eye.lookAt(forward);
    out.copy(eye.quaternion);
    eye.up.copy(UP);
  }

  /** Lleva `angle` al múltiplo de 2π más cercano a `reference` (evita vueltas de 360°). */
  private unwrapNear(angle: number, reference: number): number {
    let a = angle;
    while (a - reference > Math.PI) a -= Math.PI * 2;
    while (a - reference < -Math.PI) a += Math.PI * 2;
    return a;
  }
}
