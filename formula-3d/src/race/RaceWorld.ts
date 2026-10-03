/**
 * Mundo 3D de una sesión en pista: el circuito, el auto del jugador, los
 * rivales (instanciados) y las cámaras (de carrera y de presentación). Es la vista que dibuja el
 * `RenderHost` mientras la pantalla de carrera está activa.
 */

import { MathUtils, PerspectiveCamera, Scene, Vector3, type Object3D, type WebGLRenderer } from 'three';
import { prewarm, stabilizeShadowDepth } from '../core/render/prewarm';
import type { RenderView } from '../core/render/RenderHost';
import { QUALITY_PRESETS, shadowMapSize, type QualityPreset } from '../core/render/quality';
import { createSpeedFx, HAZE_POINTS } from '../core/render/SpeedPass';
import { RacingLineMesh } from '../assists/RacingLineMesh';
import type { CameraMode, GraphicsSettings, LineMode, LineType } from '../core/save/schema';
import { clamp } from '../core/utils/math';
import type { LiveryConfig } from '../garage/livery';
import { buildTrackScene, type BuildOptions, type TrackScene } from '../tracks/TrackBuilder';
import { RaceCamera } from './camera/RaceCamera';
import { performanceModel } from './physics/CarSpec';
import type { Telemetry, Vehicle } from './physics/Vehicle';
import { CarRig } from './render/CarRig';
import { CarShadows } from './render/CarShadow';
import { MirrorOverlay } from './render/MirrorOverlay';
import { RearMirrors, type RearViewMode } from './render/RearMirrors';
import { CheckeredFlag } from './render/CheckeredFlag';
import { GhostCar } from './render/GhostCar';
import { RivalFleet, type RivalCar } from './render/RivalFleet';
import { TrackEffects } from './render/TrackEffects';

/** Duración de la vuelta de cámara alrededor del auto, al final de la presentación (s). */
export const INTRO_DURATION = 4.2;
/** Vuelo sobre la pista (s). */
const FLY_DURATION = 4.8;
/** Paneo por la parrilla (s). */
const GRID_DURATION = 3.6;

export type IntroShot = 'flyover' | 'grid' | 'orbit';

export class RaceWorld implements RenderView {
  readonly scene = new Scene();
  /** Exposición según el clima (a pleno sol, 1). */
  readonly exposure: number;
  /** A cielo abierto sólo brillan los reflejos intensos del sol. */
  readonly bloomThreshold = 1.9;
  /** En pausa la imagen se congela (el renderer no vuelve a dibujar). */
  frozen = false;
  readonly rig: CarRig;
  readonly raceCamera: RaceCamera;
  /** La ayuda de la línea de trazada. */
  readonly racingLine: RacingLineMesh;
  /** Autos rivales (null en práctica libre). */
  readonly rivals: RivalFleet | null;
  /** Auto fantasma (sólo en contrarreloj). */
  readonly ghost: GhostCar | null;
  /** Humo, tierra y chispas. */
  readonly effects: TrackEffects;
  /** Desenfoque de velocidad y aire caliente de los escapes (lo lee el `RenderHost`). */
  readonly speedFx = createSpeedFx();
  /** Con "reducir movimiento" no hay desenfoque ni apertura del FOV. */
  motionEffects = true;
  /** Aire caliente de los escapes: sólo en calidad Alta y Ultra (es una pasada más casi siempre activa). */
  private hazeEnabled = false;
  private introTime = -1;
  private time = 0;
  private readonly flag = new CheckeredFlag();
  /** Sombras de contacto bajo el auto del jugador y los rivales. */
  private readonly carShadows = new CarShadows();
  /** Vista trasera del auto del jugador (espejos del cockpit y retrovisor de la pantalla). */
  private readonly mirrors = new RearMirrors();
  /** Retrovisor de la pantalla: la imagen trasera encima del cuadro. */
  private readonly mirrorOverlay = new MirrorOverlay();
  /** El jugador quiere el retrovisor de la pantalla (ajuste del juego). */
  private hudMirror = true;
  /** Cómo se configuró la vista trasera con los últimos ajustes gráficos. */
  private rearView: { mode: RearViewMode; width: number; glass: boolean; every: number } = { mode: 'off', width: 0, glass: false, every: 2 };
  private lastGraphics: GraphicsSettings | null = null;
  private readonly releaseShadowDepth: () => void;
  private lightened = false;
  /** Lo que no se dibuja en los espejos (se arma una vez). */
  private mirrorHidden: Object3D[] = [];
  private readonly probe = new Vector3();
  private readonly lookAt = new Vector3();
  private readonly point = { x: 0, z: 0 };
  /** Tramo de pista (s) que ocupa la parrilla, para el paneo de la presentación. */
  private gridSpan: { from: number; to: number } | null = null;
  private readonly hazeDistance: number[] = Array.from({ length: HAZE_POINTS }, () => Infinity);

  private constructor(
    readonly trackScene: TrackScene,
    private readonly vehicle: Vehicle,
    anisotropy: number,
    cameraMode: CameraMode,
    rivals: readonly RivalCar[],
    ghost: boolean,
    livery: LiveryConfig,
    preset: QualityPreset,
  ) {
    this.exposure = trackScene.look.exposure;
    this.scene.add(trackScene.root);
    this.scene.environment = trackScene.sky.environment;
    this.scene.environmentIntensity = 1;
    this.scene.fog = trackScene.sky.fog;
    this.rig = new CarRig(vehicle, livery, anisotropy);
    this.scene.add(this.rig.root);
    this.rig.root.add(this.carShadows.createSingle());
    this.rig.root.add(this.mirrors.root);
    this.raceCamera = new RaceCamera(this.rig, cameraMode);
    this.racingLine = new RacingLineMesh(vehicle.track.racingLine, performanceModel(vehicle.spec));
    this.scene.add(this.racingLine.mesh);
    this.rivals = rivals.length > 0 ? new RivalFleet(rivals, anisotropy, preset.rivalLod, this.carShadows) : null;
    if (this.rivals) this.scene.add(this.rivals.root);
    this.ghost = ghost ? new GhostCar(anisotropy) : null;
    if (this.ghost) this.scene.add(this.ghost.root);
    this.effects = new TrackEffects(this.scene, preset.particles);
    // En el espejo no aparecen el propio auto, la línea de la trazada ni las partículas
    // (su tamaño está calculado para la pantalla, no para la imagen chica del espejo).
    this.mirrorHidden = [this.rig.root, this.racingLine.mesh, ...this.effects.objects];

    // Bandera a cuadros del lado de los boxes, sobre la línea de meta, con la tela sobre la pista.
    const track = vehicle.track;
    const geometry = track.geometry;
    const pitSign = track.def.pits.side === 'right' ? 1 : -1;
    const tangent = { x: 0, z: 0 };
    geometry.pointAt(geometry.designToS(track.def.startLine), pitSign * (geometry.halfWidth + 1), this.point, tangent);
    this.flag.root.position.set(this.point.x, 0, this.point.z);
    // Hacia el centro de la pista = −(derecha) · lado de boxes; derecha = (−tz, tx).
    const towardX = pitSign * tangent.z;
    const towardZ = -pitSign * tangent.x;
    this.flag.root.rotation.y = Math.atan2(-towardZ, towardX);
    this.scene.add(this.flag.root);
    // Sombras: un material de profundidad estable por combinación (ver `stabilizeShadowDepth`).
    this.releaseShadowDepth = stabilizeShadowDepth(this.scene);
  }

  /** La bandera a cuadros sale a flamear (el jugador terminó). */
  showCheckeredFlag(): void {
    this.flag.show();
  }

  /** Vuelve a guardar la bandera (al reiniciar la sesión). */
  hideCheckeredFlag(): void {
    this.flag.hide();
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
    /** Rivales, fantasma (contrarreloj) y la decoración del auto del jugador (la del garaje). */
    extras: { rivals: readonly RivalCar[]; ghost: boolean; livery: LiveryConfig },
    cameraMode: CameraMode,
    options: BuildOptions,
  ): Promise<RaceWorld> {
    const trackScene = await buildTrackScene(vehicle.track, options);
    return new RaceWorld(trackScene, vehicle, options.anisotropy, cameraMode, extras.rivals, extras.ghost, extras.livery, QUALITY_PRESETS[options.quality]);
  }

  get camera(): RaceCamera['camera'] {
    return this.raceCamera.camera;
  }

  get introPlaying(): boolean {
    return this.introTime >= 0;
  }

  /**
   * Sube a la GPU todo el circuito (geometría y texturas) dibujándolo una vez,
   * oculto, desde arriba: después no hay tirones cuando algo entra en cuadro.
   * @param toCanvas el mismo destino donde se dibuja la carrera (ver `prewarm`)
   */
  prewarm(renderer: WebGLRenderer, toCanvas: boolean): void {
    const g = this.vehicle.track.geometry;
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < g.count; i++) {
      minX = Math.min(minX, g.x[i] ?? 0);
      maxX = Math.max(maxX, g.x[i] ?? 0);
      minZ = Math.min(minZ, g.z[i] ?? 0);
      maxZ = Math.max(maxZ, g.z[i] ?? 0);
    }
    const radius = Math.hypot(maxX - minX, maxZ - minZ) / 2 + 400;
    const height = radius / Math.tan(MathUtils.degToRad(35));
    const overhead = new PerspectiveCamera(70, 1, 10, height + 2000);
    overhead.position.set((minX + maxX) / 2, height, (minZ + maxZ) / 2);
    overhead.lookAt((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
    overhead.updateMatrixWorld();
    // La zona de sombras sigue al auto: lo que proyecta sombra lejos de la
    // parrilla compilaba su variante de profundidad recién al acercarse (un
    // tirón a mitad de carrera). Durante el precalentamiento cubre todo el circuito.
    const restoreShadows = this.widenShadows((minX + maxX) / 2, (minZ + maxZ) / 2, radius);
    try {
      prewarm(renderer, this.scene, overhead, toCanvas);
    } finally {
      restoreShadows();
    }
    // Y desde la cámara de verdad (las sombras y los reflejos de su encuadre).
    prewarm(renderer, this.scene, this.camera, toCanvas);
    // Los sombreadores del retrovisor de la pantalla (chiquitos, pero mejor ahora que en pista).
    this.mirrorOverlay.compile(renderer);
  }

  /**
   * Agranda la zona de sombras del sol para que abarque el círculo (cx, cz, r).
   * @returns la función que la deja como estaba
   */
  private widenShadows(cx: number, cz: number, radius: number): () => void {
    const sun = this.trackScene.sky.sun;
    const camera = sun.shadow.camera;
    const saved = {
      left: camera.left,
      right: camera.right,
      top: camera.top,
      bottom: camera.bottom,
      far: camera.far,
      position: sun.position.clone(),
      target: sun.target.position.clone(),
    };
    const direction = saved.position.clone().sub(saved.target).normalize();
    const distance = radius + 500;
    sun.target.position.set(cx, 0, cz);
    sun.position.set(cx + direction.x * distance, direction.y * distance, cz + direction.z * distance);
    camera.left = -radius;
    camera.right = radius;
    camera.top = radius;
    camera.bottom = -radius;
    camera.far = distance + radius * 2;
    camera.updateProjectionMatrix();
    sun.updateMatrixWorld();
    sun.target.updateMatrixWorld();
    return () => {
      camera.left = saved.left;
      camera.right = saved.right;
      camera.top = saved.top;
      camera.bottom = saved.bottom;
      camera.far = saved.far;
      camera.updateProjectionMatrix();
      sun.position.copy(saved.position);
      sun.target.position.copy(saved.target);
      sun.updateMatrixWorld();
      sun.target.updateMatrixWorld();
    };
  }

  /** Duración total de la presentación (s): depende de si hay parrilla que mostrar. */
  get introDuration(): number {
    return FLY_DURATION + (this.gridSpan ? GRID_DURATION : 0) + INTRO_DURATION;
  }

  /** Toma de la presentación que se está viendo (null fuera de ella). */
  get introShot(): IntroShot | null {
    if (this.introTime < 0) return null;
    if (this.introTime < FLY_DURATION) return 'flyover';
    if (this.gridSpan && this.introTime < FLY_DURATION + GRID_DURATION) return 'grid';
    return 'orbit';
  }

  /**
   * Empieza la presentación: un vuelo sobre la pista hasta la recta, un paneo
   * a ras del suelo por la parrilla (si hay rivales) y la vuelta alrededor del auto.
   * @param cars los autos en la parrilla (el jugador incluido)
   */
  startIntro(cars: readonly Vehicle[] = []): void {
    this.introTime = 0;
    this.rig.setDriverVisible(true);
    const geometry = this.vehicle.track.geometry;
    const playerS = this.vehicle.projection.s;
    if (cars.length > 1) {
      // Extremos de la parrilla, relativos al jugador.
      let back = 0;
      let front = 0;
      for (const car of cars) {
        const delta = geometry.deltaS(playerS, car.projection.s);
        back = Math.min(back, delta);
        front = Math.max(front, delta);
      }
      this.gridSpan = { from: playerS + back - 10, to: playerS + front + 8 };
    } else {
      this.gridSpan = null;
    }
  }

  /** Termina la presentación y pasa suave a la cámara de carrera. */
  endIntro(): void {
    if (this.introTime < 0) return;
    // Desde la órbita se funde con la cámara de carrera; desde el vuelo o el paneo, corte directo.
    const blend = this.introShot === 'orbit' ? 1.1 : 0.05;
    this.introTime = -1;
    const camera = this.camera;
    this.raceCamera.blendFrom(camera.position.clone(), camera.quaternion.clone(), camera.fov, blend);
    this.rig.setDriverVisible(this.raceCamera.currentMode !== 'cockpit');
  }

  /** Antes de cada paso fijo (para interpolar la pose del auto). */
  beforeStep(): void {
    this.rig.beforeStep();
    this.rivals?.beforeStep();
  }

  /** Sin interpolación: tras colocar el auto en otro lugar. */
  snap(): void {
    this.rig.snap();
    this.rivals?.snap();
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
    this.rivals?.update(dt, alpha, this.camera.position);
    // El volante sólo se ve desde el cockpit (y en la presentación, que gira alrededor del
    // auto): con las otras cámaras se ahorran sus llamadas de dibujo y los redibujos de la pantalla.
    const wheel = this.rig.wheel;
    wheel.root.visible = this.introTime >= 0 || this.raceCamera.currentMode === 'cockpit';
    if (wheel.root.visible) {
      const shift = this.vehicle.spec.shiftRpm;
      wheel.update(this.vehicle.steerAngle, (telemetry.rpm - (shift - 3200)) / 3200, telemetry.limiter, this.time);
    }
    this.racingLine.update(dt, this.time, this.vehicle.projection.s, Math.max(0, this.vehicle.vx));
    // Las sombras cubren lo que se mira: en el vuelo y el paneo, el punto de mira.
    const shot = this.introShot;
    if (shot === 'flyover' || shot === 'grid') this.trackScene.sky.follow(this.lookAt.x, this.lookAt.z);
    else this.trackScene.sky.follow(this.rig.pose.x, this.rig.pose.z);
    this.trackScene.update(this.time);
    this.flag.update(dt, this.time);
  }

  /**
   * Partículas y efectos de velocidad del cuadro (después de `update`).
   * @param cars todos los autos de la sesión (el jugador incluido)
   * @param simulating false en la presentación: nada emite ni se mueve
   */
  updateEffects(dt: number, cars: readonly Vehicle[], simulating: boolean): void {
    const camera = this.camera;
    this.effects.update(simulating ? dt : 0, cars, camera, simulating);
    const fx = this.speedFx;
    fx.time = this.time;
    const v = this.vehicle;

    // Empuje (DRS o rebufo) → FOV; velocidad → desenfoque radial desde el punto de fuga.
    const rush = this.motionEffects && simulating ? Math.max(v.drs, Math.min(1, v.slipstream * 1.4)) : 0;
    this.raceCamera.setRush(rush);
    const fast = MathUtils.smoothstep(v.speed, 42, 88);
    const mode = this.raceCamera.currentMode;
    const modeFactor = mode === 'chase' ? 0.7 : mode === 'tcam' ? 1 : 0.85;
    fx.blur = this.motionEffects && simulating && this.introTime < 0 ? (fast * 0.75 + rush * 0.35) * modeFactor : 0;
    if (fx.blur > 0) {
      const ahead = 300;
      this.probe.set(v.x - Math.sin(v.heading) * ahead, 0.8, v.z - Math.cos(v.heading) * ahead).project(camera);
      if (this.probe.z < 1) fx.center.set(clamp(this.probe.x * 0.5 + 0.5, 0.2, 0.8), clamp(this.probe.y * 0.5 + 0.5, 0.25, 0.75));
      else fx.center.set(0.5, 0.5);
    }

    // Aire caliente detrás de los escapes de los autos más cercanos a la cámara.
    const distances = this.hazeDistance;
    distances.fill(Infinity);
    for (const point of fx.haze) point.set(0, 0, 0, 0);
    if (!this.hazeEnabled) return;
    const focal = 1 / Math.tan((camera.fov * Math.PI) / 360);
    const cockpit = mode === 'cockpit' || mode === 'tcam';
    for (const car of cars) {
      if (car === v && (cockpit || this.introTime >= 0)) continue;
      const back = car.spec.cgToRear + 0.75;
      this.probe.set(car.x + Math.sin(car.heading) * back, 0.62, car.z + Math.cos(car.heading) * back);
      const distance = this.probe.distanceTo(camera.position);
      if (distance > 45 || distance < 1.5) continue;
      // Inserción ordenada en los HAZE_POINTS más cercanos (sin crear arreglos).
      let slot = -1;
      for (let i = 0; i < HAZE_POINTS; i++) {
        if (distance < (distances[i] ?? Infinity)) {
          slot = i;
          break;
        }
      }
      if (slot < 0) continue;
      this.probe.project(camera);
      if (this.probe.z >= 1 || Math.abs(this.probe.x) > 1.2 || Math.abs(this.probe.y) > 1.2) continue;
      for (let i = HAZE_POINTS - 1; i > slot; i--) {
        distances[i] = distances[i - 1] ?? Infinity;
        const previous = fx.haze[i - 1];
        if (previous) fx.haze[i]?.copy(previous);
      }
      distances[slot] = distance;
      const heat = (1 - distance / 45) * (0.55 + 0.45 * car.telemetry.throttle);
      const radius = clamp((0.85 * focal) / distance * 0.5, 0.015, 0.22);
      fx.haze[slot]?.set(this.probe.x * 0.5 + 0.5, this.probe.y * 0.5 + 0.5, heat, radius);
    }
  }

  onGraphicsChanged(graphics: GraphicsSettings): void {
    this.hazeEnabled = graphics.quality === 'high' || graphics.quality === 'ultra';
    // Gradación de color y viñeta con posprocesado (una pasada liviana).
    this.speedFx.grade = graphics.postprocessing ? 1 : 0;
    // Sin mapa de sombras el sol deja de proyectarlas (auto y escenario).
    const shadowSize = shadowMapSize(graphics.shadows, graphics.quality);
    this.trackScene.sky.setShadowMapSize(shadowSize);
    this.carShadows.setShadowMapActive(shadowSize > 0);
    this.lastGraphics = graphics;
    this.lightened = false;
    this.configureRearView();
  }

  /** Prende o apaga el retrovisor de la pantalla (ajuste del juego). */
  setHudMirror(on: boolean): void {
    this.hudMirror = on;
    this.configureRearView();
  }

  /** Dónde va el retrovisor de la pantalla (píxeles CSS del lienzo), o null si no se ve. */
  setMirrorRect(rect: { x: number; y: number; width: number; height: number } | null): void {
    this.mirrorOverlay.setRect(this.hudMirror ? rect : null);
  }

  /**
   * La vista trasera: el retrovisor de la pantalla en cualquier calidad y los
   * espejos del cockpit con imagen de verdad en Alta y Ultra. Usa la misma
   * variante de los sombreadores que la carrera (búfer o lienzo): nada que
   * compilar en pista.
   */
  private configureRearView(): void {
    const graphics = this.lastGraphics;
    if (!graphics) return;
    const preset = QUALITY_PRESETS[graphics.quality];
    const offscreen = graphics.postprocessing || preset.msaaSamples > 0;
    const glass = offscreen && !this.lightened && (graphics.quality === 'high' || graphics.quality === 'ultra');
    const mode: RearViewMode = this.hudMirror || glass ? (offscreen ? 'linear' : 'encoded') : 'off';
    // Ancho de la imagen trasera (px) y cada cuántos cuadros se dibuja.
    const width = this.lightened ? 400 : { low: 400, medium: 512, high: 640, ultra: 768 }[graphics.quality];
    const every = graphics.quality === 'ultra' && !this.lightened ? 1 : 2;
    this.rearView = { mode, width, glass, every };
    this.mirrors.configure(mode, width, glass);
  }

  /**
   * Imagen trasera: si se ve el retrovisor de la pantalla o, en el cockpit,
   * los espejos del auto. Va después de `update` y antes de dibujar el cuadro.
   */
  renderMirrors(renderer: WebGLRenderer): void {
    if (!this.mirrors.live || this.frozen || this.introTime >= 0) return;
    const glass = this.mirrors.glassLive && this.raceCamera.currentMode === 'cockpit';
    if (!glass && !this.mirrorOverlay.visible) return;
    this.mirrors.render(renderer, this.scene, this.mirrorHidden, this.rearView.every);
  }

  /** El retrovisor de la pantalla, encima del cuadro terminado. */
  overlay(renderer: WebGLRenderer): void {
    if (this.introTime >= 0) return;
    this.mirrorOverlay.render(renderer, this.mirrors.image);
  }

  /** Alivio sin recompilar: sombras más chicas (el sol las sigue proyectando) y vista trasera más liviana. */
  onLighten(): void {
    this.trackScene.sky.lightenShadows();
    this.lightened = true;
    this.configureRearView();
  }

  onResize(width: number, height: number, pixelRatio: number): void {
    this.raceCamera.setAspect(width / Math.max(1, height));
    this.effects.setViewHeight(height * pixelRatio);
  }

  dispose(): void {
    this.flag.dispose();
    this.effects.dispose();
    this.ghost?.dispose();
    this.rivals?.dispose();
    this.racingLine.dispose();
    this.mirrors.dispose();
    this.mirrorOverlay.dispose();
    this.rig.dispose();
    this.carShadows.dispose();
    this.releaseShadowDepth();
    this.trackScene.dispose();
    this.scene.clear();
  }

  /** Cámara de la presentación según la toma. */
  private updateIntroCamera(): void {
    const camera = this.camera;
    camera.up.set(0, 1, 0);
    const shot = this.introShot;
    if (shot === 'flyover') this.flyoverCamera(this.introTime / FLY_DURATION);
    else if (shot === 'grid') this.gridCamera((this.introTime - FLY_DURATION) / GRID_DURATION);
    else this.orbitCamera((this.introTime - FLY_DURATION - (this.gridSpan ? GRID_DURATION : 0)) / INTRO_DURATION);
  }

  /** Vuelo alto a lo largo de la pista, bajando hacia la recta de la parrilla. */
  private flyoverCamera(progress: number): void {
    const t = clamp(progress, 0, 1);
    const geometry = this.vehicle.track.geometry;
    const gridS = this.gridSpan ? this.gridSpan.from : this.vehicle.projection.s - 10;
    // Viene de 900 m antes de la parrilla, a un costado de la pista y bajando.
    const s = gridS - 900 + 700 * t;
    const side = geometry.halfWidth + 40 - 22 * t;
    geometry.pointAt(s, side, this.point);
    const camera = this.camera;
    camera.position.set(this.point.x, 52 - 30 * MathUtils.smoothstep(t, 0, 1), this.point.z);
    geometry.pointAt(s + 170, 0, this.point);
    this.lookAt.set(this.point.x, 0, this.point.z);
    camera.lookAt(this.lookAt);
    this.setIntroFov(48);
  }

  /** A ras del suelo, al borde del asfalto, recorriendo la parrilla de atrás hacia adelante. */
  private gridCamera(progress: number): void {
    const span = this.gridSpan;
    if (!span) return;
    const t = MathUtils.smootherstep(clamp(progress, 0, 1), 0, 1);
    const geometry = this.vehicle.track.geometry;
    // Del lado opuesto a los boxes (ahí no hay muro de pits que tape).
    const sign = this.vehicle.track.def.pits.side === 'right' ? -1 : 1;
    const s = span.from + (span.to - span.from) * t;
    geometry.pointAt(s, sign * (geometry.halfWidth - 0.6), this.point);
    const camera = this.camera;
    camera.position.set(this.point.x, 1.25, this.point.z);
    geometry.pointAt(s + 9, -sign * 1.5, this.point);
    this.lookAt.set(this.point.x, 0.55, this.point.z);
    camera.lookAt(this.lookAt);
    this.setIntroFov(40);
  }

  /** Órbita alrededor del auto: arranca baja y cerca del alerón y se abre por el costado. */
  private orbitCamera(progress: number): void {
    const t = clamp(progress, 0, 1);
    const ease = MathUtils.smootherstep(t, 0, 1);
    const pose = this.rig.pose;
    const angle = pose.heading + Math.PI * (0.15 + 1.05 * ease);
    const radius = 5.2 + 2.6 * ease;
    const height = 0.55 + 1.7 * ease;
    const camera = this.camera;
    camera.position.set(pose.x + Math.sin(angle) * radius, height, pose.z + Math.cos(angle) * radius);
    this.lookAt.set(pose.x, 0.55, pose.z);
    camera.lookAt(this.lookAt);
    this.setIntroFov(42 + 14 * ease);
  }

  private setIntroFov(fov: number): void {
    const camera = this.camera;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }
}
