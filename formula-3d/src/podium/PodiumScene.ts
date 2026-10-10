/**
 * Podio 3D: tres escalones que suben uno por uno (3.º, 2.º y 1.º) con el auto
 * de cada piloto encima, un telón con el nombre del Gran Premio, luces de
 * escenario y la cámara girando despacio por delante. Cuando el ganador llega
 * arriba empieza el festejo (`Celebration`).
 *
 * Ejes: los autos miran a −Z (hacia la cámara); el telón queda en +Z.
 */

import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  FogExp2,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SpotLight,
  SRGBColorSpace,
  Vector3,
  type Material,
  type WebGLRenderer,
} from 'three';
import { createStudioEnvironment, type EnvironmentMap } from '../core/render/environment';
import { QUALITY_PRESETS, shadowMapSize } from '../core/render/quality';
import type { RenderView } from '../core/render/RenderHost';
import type { GraphicsSettings } from '../core/save/schema';
import { Disposer } from '../core/utils/Disposer';
import { clamp } from '../core/utils/math';
import { CarModel } from '../garage/CarModel';
import type { LiveryConfig } from '../garage/livery';
import type { CelebrationStyle } from '../progression/items';
import { Celebration } from './Celebration';

const BACKGROUND = new Color('#05060a');

/** Escalones en orden de llegada a la pantalla: 1.º al centro, 2.º a la izquierda (desde la cámara), 3.º a la derecha. */
const STEPS = [
  { place: 1, x: 0, height: 1.3, color: '#f5c542', rises: 2.3, turn: 0 },
  { place: 2, x: 4, height: 0.9, color: '#c9d1dc', rises: 1.3, turn: 0.22 },
  { place: 3, x: -4, height: 0.55, color: '#d0874a', rises: 0.4, turn: -0.22 },
] as const;
const STEP_WIDTH = 3.5;
const STEP_DEPTH = 6.8;
const RISE_TIME = 1.1;
/** Cuándo arranca el festejo (s): el ganador ya llegó arriba. */
const CELEBRATE_AT = 3.5;

export interface PodiumSceneOptions {
  /** Liveries de los tres autos (1.º, 2.º y 3.º). */
  liveries: readonly LiveryConfig[];
  /** Nombre del Gran Premio (para el telón). */
  title: string;
  celebration: CelebrationStyle;
  quality: GraphicsSettings['quality'];
  onFirework?: () => void;
}

/** Cara frontal del escalón: el número de la posición sobre un degradado. */
function createStepTexture(place: number, color: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#1a1c22');
    gradient.addColorStop(1, '#0b0c10');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 10);
    ctx.font = 'italic 900 170px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(place), 256, 140);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Telón: el nombre del Gran Premio y la marca del juego. */
function createBannerTexture(title: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 2048, 0);
    gradient.addColorStop(0, '#0b0c12');
    gradient.addColorStop(0.5, '#171a24');
    gradient.addColorStop(1, '#0b0c12');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2048, 512);
    ctx.fillStyle = '#ff2a3c';
    ctx.fillRect(0, 470, 2048, 14);
    // Cuadros de bandera en los extremos.
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 3; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#e9eaec' : '#15161b';
        ctx.fillRect(40 + x * 60, 110 + y * 60, 60, 60);
        ctx.fillRect(2048 - 220 + x * 60, 110 + y * 60, 60, 60);
      }
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f3f4f6';
    ctx.font = 'italic 900 170px system-ui, sans-serif';
    ctx.fillText('ÁPICE GP', 1024, 220, 1500);
    ctx.fillStyle = '#f5c542';
    ctx.font = '700 58px system-ui, sans-serif';
    ctx.fillText(title.toUpperCase(), 1024, 380, 1500);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export class PodiumScene implements RenderView {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(38, 16 / 9, 0.1, 200);
  readonly bloomThreshold = 0.95;
  private readonly own = new Disposer();
  private readonly environment: EnvironmentMap;
  private readonly cars: CarModel[] = [];
  private readonly steps: Group[] = [];
  private readonly key: SpotLight;
  private readonly celebration: Celebration;
  private readonly look = new Vector3(0, 1.7, 0);
  private time = 0;
  private celebrating = false;

  constructor(
    renderer: WebGLRenderer,
    options: PodiumSceneOptions,
    anisotropy: number,
  ) {
    this.scene.background = BACKGROUND;
    this.scene.fog = new FogExp2(BACKGROUND, 0.018);
    this.environment = createStudioEnvironment(renderer);
    this.own.add(() => this.environment.dispose());
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.9;

    // ─── Luces ───
    this.scene.add(new HemisphereLight('#26304a', '#000000', 0.5));
    this.key = new SpotLight('#fff4e0', 260, 30, 0.42, 0.7, 2);
    this.key.position.set(0, 13, -6);
    this.key.target.position.set(0, 1.3, 0);
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.02;
    this.key.shadow.camera.near = 5;
    this.key.shadow.camera.far = 26;
    this.scene.add(this.key, this.key.target);
    for (const x of [-4, 4]) {
      const side = new SpotLight('#dfe8ff', 140, 26, 0.36, 0.8, 2);
      side.position.set(x * 1.4, 11, -7);
      side.target.position.set(x, 0.9, 0);
      this.scene.add(side, side.target);
    }
    const rim = new SpotLight('#ff2a3c', 55, 30, 0.7, 1, 2);
    rim.position.set(0, 6, 12);
    rim.target.position.set(0, 1, 0);
    this.scene.add(rim, rim.target);

    // ─── Piso y telón ───
    const floorGeometry = this.own.own(new CircleGeometry(60, 64));
    floorGeometry.rotateX(-Math.PI / 2);
    const floor = new Mesh(floorGeometry, this.own.own(new MeshStandardMaterial({ color: '#0a0b0e', roughness: 0.4, metalness: 0.2 })));
    floor.receiveShadow = true;
    this.scene.add(floor);

    const bannerTexture = this.own.own(createBannerTexture(options.title));
    const bannerGeometry = this.own.own(new PlaneGeometry(17, 4.25));
    const banner = new Mesh(bannerGeometry, this.own.own(new MeshBasicMaterial({ map: bannerTexture, color: new Color(0.85, 0.85, 0.85), fog: false })));
    banner.position.set(0, 4.7, 9);
    banner.rotation.y = Math.PI;
    this.scene.add(banner);

    // Columnas de luz detrás del podio (brillan con el bloom).
    const stripGeometry = this.own.own(new PlaneGeometry(0.12, 9));
    const white = this.own.own(new MeshBasicMaterial({ color: new Color('#dfe8ff').multiplyScalar(2), fog: false, side: DoubleSide }));
    const gold = this.own.own(new MeshBasicMaterial({ color: new Color('#f5c542').multiplyScalar(2.2), fog: false, side: DoubleSide }));
    for (let i = 0; i < 12; i++) {
      const x = -16.5 + i * 3;
      if (Math.abs(x) < 10.5) continue;
      const strip = new Mesh(stripGeometry, i % 2 === 0 ? gold : white);
      strip.position.set(x, 4.5, 10 + Math.abs(x) * 0.2);
      this.scene.add(strip);
    }

    // ─── Escalones y autos ───
    const topMaterial = this.own.own(new MeshStandardMaterial({ color: '#15171c', roughness: 0.35, metalness: 0.6 }));
    const sideMaterial = this.own.own(new MeshStandardMaterial({ color: '#0e0f13', roughness: 0.6, metalness: 0.3 }));
    options.liveries.slice(0, 3).forEach((livery, index) => {
      const def = STEPS[index];
      if (!def) return;
      const group = new Group();
      const geometry = this.own.own(new BoxGeometry(STEP_WIDTH, def.height, STEP_DEPTH));
      const front = this.own.own(new MeshStandardMaterial({ map: this.own.own(createStepTexture(def.place, def.color)), roughness: 0.5, metalness: 0.2 }));
      // Caras: +x, −x, +y, −y, +z, −z (la −z mira a la cámara).
      const materials: Material[] = [sideMaterial, sideMaterial, topMaterial, sideMaterial, sideMaterial, front];
      const step = new Mesh(geometry, materials);
      step.position.y = def.height / 2;
      step.castShadow = true;
      step.receiveShadow = true;
      group.add(step);
      // Filete de luz del color del puesto en el borde de arriba.
      const trimGeometry = this.own.own(new CylinderGeometry(0.025, 0.025, STEP_WIDTH, 8));
      trimGeometry.rotateZ(Math.PI / 2);
      const trim = new Mesh(trimGeometry, this.own.own(new MeshBasicMaterial({ color: new Color(def.color).multiplyScalar(2.6) })));
      trim.position.set(0, def.height, -STEP_DEPTH / 2);
      group.add(trim);
      const car = new CarModel({ livery, anisotropy });
      car.root.position.y = def.height + 0.001;
      car.root.rotation.y = def.turn;
      car.setSteer(def.turn * 0.8);
      group.add(car.root);
      this.cars.push(car);
      group.position.set(def.x, -def.height - 0.05, 0);
      group.visible = false;
      this.steps.push(group);
      this.scene.add(group);
    });

    // ─── Festejo ───
    const winner = options.liveries[0];
    this.celebration = new Celebration(this.scene, {
      style: options.celebration,
      colors: winner ? [winner.primary, winner.secondary, winner.accent] : ['#ff2a3c'],
      amount: QUALITY_PRESETS[options.quality].particles,
      // Desde la cabina de cada auto (casco a ~1 m sobre el escalón).
      sprays: STEPS.map((def) => new Vector3(def.x, def.height + 1.15, -0.1)),
      ...(options.onFirework ? { onFirework: options.onFirework } : {}),
    });
    this.updateCamera();
  }

  /** Punto sobre cada auto (1.º, 2.º, 3.º) para colgar su cartel en la interfaz. */
  labelAnchor(index: number, out: Vector3): Vector3 {
    const group = this.steps[index];
    const def = STEPS[index];
    if (!group || !def) return out.set(0, -100, 0);
    return out.set(group.position.x, group.position.y + def.height + 1.9, 0);
  }

  /** ¿Ya subió el escalón `index`? (los carteles aparecen entonces). */
  stepReady(index: number): boolean {
    const def = STEPS[index];
    return def !== undefined && this.time >= def.rises + RISE_TIME * 0.8;
  }

  /** Salta la subida de los escalones (ENTER): todo queda en su lugar y empieza el festejo. */
  skipIntro(): void {
    if (this.time < CELEBRATE_AT) this.time = CELEBRATE_AT;
  }

  update(dt: number): void {
    this.time += dt;
    this.steps.forEach((group, index) => {
      const def = STEPS[index];
      if (!def) return;
      const t = clamp((this.time - def.rises) / RISE_TIME, 0, 1);
      group.visible = this.time >= def.rises;
      // Sube desde abajo del piso y frena al llegar (no se despega del piso).
      const eased = 1 - Math.pow(1 - t, 3);
      group.position.y = (-def.height - 0.05) * (1 - eased);
      this.cars[index]?.setRearLight(0.3 + 0.7 * (0.5 + 0.5 * Math.sin(this.time * 3 + index)));
    });
    if (!this.celebrating && this.time >= CELEBRATE_AT) {
      this.celebrating = true;
      this.celebration.start();
    }
    this.updateCamera();
    this.celebration.update(dt, this.camera);
  }

  onGraphicsChanged(graphics: GraphicsSettings): void {
    const size = shadowMapSize(graphics.shadows, graphics.quality);
    this.key.castShadow = size > 0;
    if (size > 0 && this.key.shadow.mapSize.x !== size) {
      this.key.shadow.mapSize.set(size, size);
      this.key.shadow.map?.dispose();
      this.key.shadow.map = null;
    }
  }

  onResize(width: number, height: number, pixelRatio: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.celebration.setViewHeight(height * pixelRatio);
  }

  dispose(): void {
    this.celebration.dispose();
    for (const car of this.cars) car.dispose();
    this.own.dispose();
    this.scene.clear();
  }

  /** Grúa de entrada (baja y cerca → alta y abierta) y después un vaivén lento por delante. */
  private updateCamera(): void {
    const intro = MathUtils.smootherstep(this.time, 0, CELEBRATE_AT + 0.8);
    const angle = Math.PI + Math.sin(this.time * 0.13) * 0.28 * intro - 0.5 * (1 - intro);
    const radius = 9 + 6.5 * intro;
    const height = 1 + 3.2 * intro;
    this.camera.position.set(this.look.x + Math.sin(angle) * radius, height, this.look.z + Math.cos(angle) * radius);
    // Al final mira un poco más arriba: entran los fuegos artificiales sobre el telón.
    this.look.y = 1.2 + 1.3 * intro;
    this.camera.lookAt(this.look);
  }
}
