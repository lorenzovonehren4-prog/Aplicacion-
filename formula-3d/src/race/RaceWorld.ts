/**
 * Mundo 3D de una sesión en pista: el circuito, el auto del jugador y las
 * cámaras (de carrera y de presentación). Es la vista que dibuja el
 * `RenderHost` mientras la pantalla de carrera está activa.
 */

import { MathUtils, Scene, Vector3 } from 'three';
import type { RenderView } from '../core/render/RenderHost';
import { shadowMapSize } from '../core/render/quality';
import { RacingLineMesh } from '../assists/RacingLineMesh';
import type { CameraMode, GraphicsSettings, LineMode, LineType } from '../core/save/schema';
import { clamp } from '../core/utils/math';
import { PLAYER_DEFAULT_LIVERY } from '../garage/livery';
import { buildTrackScene, type BuildOptions, type TrackScene } from '../tracks/TrackBuilder';
import { RaceCamera } from './camera/RaceCamera';
import { performanceModel } from './physics/CarSpec';
import type { Telemetry, Vehicle } from './physics/Vehicle';
import { CarRig } from './render/CarRig';

/** Duración de la vuelta de cámara de presentación (s). */
export const INTRO_DURATION = 4.2;

export class RaceWorld implements RenderView {
  readonly scene = new Scene();
  /** Exposición a pleno sol (un poco por debajo de la del estudio). */
  readonly exposure = 1;
  /** A cielo abierto sólo brillan los reflejos intensos del sol. */
  readonly bloomThreshold = 1.2;
  /** En pausa la imagen se congela (el renderer no vuelve a dibujar). */
  frozen = false;
  readonly rig: CarRig;
  readonly raceCamera: RaceCamera;
  /** La ayuda de la línea de trazada. */
  readonly racingLine: RacingLineMesh;
  private introTime = -1;
  private time = 0;

  private constructor(
    readonly trackScene: TrackScene,
    private readonly vehicle: Vehicle,
    anisotropy: number,
    cameraMode: CameraMode,
  ) {
    this.scene.add(trackScene.root);
    this.scene.environment = trackScene.sky.environment;
    this.scene.environmentIntensity = 1;
    this.scene.fog = trackScene.sky.fog;
    this.rig = new CarRig(vehicle, PLAYER_DEFAULT_LIVERY, anisotropy);
    this.scene.add(this.rig.root);
    this.raceCamera = new RaceCamera(this.rig, cameraMode);
    this.racingLine = new RacingLineMesh(vehicle.track.racingLine, performanceModel(vehicle.spec));
    this.scene.add(this.racingLine.mesh);
  }

  /** Muestra la línea de trazada según la ayuda elegida. */
  configureLine(mode: LineMode, type: LineType): void {
    this.racingLine.configure(mode, type);
  }

  /** Enciende las primeras `lit` columnas del semáforo del pórtico (0 = apagado). */
  setStartLights(lit: number): void {
    this.trackScene.gantry.lights.forEach((material, column) => {
      material.emissiveIntensity = column < lit ? 6 : 0;
      material.color.set(column < lit ? '#ff2a36' : '#2a0508');
    });
  }

  /** Construye el circuito por etapas y arma el mundo. */
  static async create(
    vehicle: Vehicle,
    cameraMode: CameraMode,
    options: BuildOptions,
  ): Promise<RaceWorld> {
    const trackScene = await buildTrackScene(vehicle.track, options);
    return new RaceWorld(trackScene, vehicle, options.anisotropy, cameraMode);
  }

  get camera(): RaceCamera['camera'] {
    return this.raceCamera.camera;
  }

  get introPlaying(): boolean {
    return this.introTime >= 0;
  }

  /** Empieza la presentación: la cámara gira alrededor del auto en la parrilla. */
  startIntro(): void {
    this.introTime = 0;
    this.rig.setDriverVisible(true);
  }

  /** Termina la presentación y pasa suave a la cámara de carrera. */
  endIntro(): void {
    if (this.introTime < 0) return;
    this.introTime = -1;
    const camera = this.camera;
    this.raceCamera.blendFrom(camera.position.clone(), camera.quaternion.clone(), camera.fov, 1.1);
    this.rig.setDriverVisible(this.raceCamera.currentMode !== 'cockpit');
  }

  /** Antes de cada paso fijo (para interpolar la pose del auto). */
  beforeStep(): void {
    this.rig.beforeStep();
  }

  /** Sin interpolación: tras colocar el auto en otro lugar. */
  snap(): void {
    this.rig.snap();
    this.raceCamera.resetFollow();
  }

  update(dt: number, alpha: number, telemetry: Telemetry): void {
    this.time += dt;
    this.rig.update(dt, alpha);
    if (this.introTime >= 0) {
      this.introTime += dt;
      this.updateIntroCamera();
    } else {
      this.raceCamera.update(dt, telemetry);
    }
    const shift = this.vehicle.spec.shiftRpm;
    this.rig.wheel.update(this.vehicle.steerAngle, (telemetry.rpm - (shift - 3200)) / 3200, telemetry.limiter, this.time);
    this.racingLine.update(dt, this.time, this.vehicle.projection.s, Math.max(0, this.vehicle.vx));
    this.trackScene.sky.follow(this.rig.pose.x, this.rig.pose.z);
    this.trackScene.update(this.time);
  }

  onGraphicsChanged(graphics: GraphicsSettings): void {
    // Sin mapa de sombras el sol deja de proyectarlas (auto y escenario).
    this.trackScene.sky.setShadowMapSize(shadowMapSize(graphics.shadows, graphics.quality));
  }

  onResize(width: number, height: number): void {
    this.raceCamera.setAspect(width / Math.max(1, height));
  }

  dispose(): void {
    this.racingLine.dispose();
    this.rig.dispose();
    this.trackScene.dispose();
    this.scene.clear();
  }

  /** Órbita de presentación: arranca baja y cerca del alerón y se abre por el costado. */
  private updateIntroCamera(): void {
    const t = clamp(this.introTime / INTRO_DURATION, 0, 1);
    const ease = MathUtils.smootherstep(t, 0, 1);
    const pose = this.rig.pose;
    const angle = pose.heading + Math.PI * (0.15 + 1.05 * ease);
    const radius = 5.2 + 2.6 * ease;
    const height = 0.55 + 1.7 * ease;
    const camera = this.camera;
    camera.position.set(pose.x + Math.sin(angle) * radius, height, pose.z + Math.cos(angle) * radius);
    camera.up.set(0, 1, 0);
    camera.lookAt(new Vector3(pose.x, 0.55, pose.z));
    const fov = 42 + 14 * ease;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }
}
