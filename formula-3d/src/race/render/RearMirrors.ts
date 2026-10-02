/**
 * Retrovisores del auto del jugador (se ven desde el cockpit). En calidad Alta
 * y Ultra muestran la pista de verdad: una cámara que mira hacia atrás dibuja
 * la escena en una textura chica (cada dos cuadros y sin recalcular las
 * sombras) y cada espejo muestra su mitad, invertida como en un espejo. En
 * Baja y Media, una imagen pintada (cielo, árboles y asfalto) en lugar del
 * reflejo blanco del cielo.
 */

import {
  CanvasTexture,
  Group,
  HalfFloatType,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  SRGBColorSpace,
  WebGLRenderTarget,
  type Object3D,
  type Scene,
  type WebGLRenderer,
} from 'three';
import { Disposer } from '../../core/utils/Disposer';

/** Vidrio de cada espejo (m) y su lugar en el modelo (ver `CarModel.buildDetails`), apenas delante. */
const GLASS_W = 0.13;
const GLASS_H = 0.042;
const GLASS_X = 0.47;
const GLASS_Y = 0.645;
const GLASS_Z = -0.5765;
/** Imagen de la cámara: los dos espejos uno al lado del otro (misma proporción que los vidrios). */
const ASPECT = (GLASS_W / GLASS_H) * 2;
const TARGET_WIDTH = 640;
const TARGET_HEIGHT = Math.round(TARGET_WIDTH / ASPECT);
/** Campo horizontal total (°): cada espejo cubre la mitad, desde justo detrás hacia su lado. */
const HORIZONTAL_FOV = 64;
/** Un espejo devuelve algo menos de luz que la que recibe. */
const MIRROR_TINT = 0xd4d8de;

/** Reflejo pintado para las calidades sin cámara trasera: cielo, árboles al fondo y asfalto. */
function paintFakeReflection(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo pintar el reflejo de los espejos.');
  const sky = ctx.createLinearGradient(0, 0, 0, 34);
  sky.addColorStop(0, '#6f9fd2');
  sky.addColorStop(1, '#c9dcec');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 256, 34);
  // Línea de árboles irregular en el horizonte.
  ctx.fillStyle = '#3d5a34';
  ctx.beginPath();
  ctx.moveTo(0, 36);
  for (let x = 0; x <= 256; x += 8) ctx.lineTo(x, 29 + Math.sin(x * 0.21) * 2 + Math.sin(x * 0.07) * 2.5);
  ctx.lineTo(256, 38);
  ctx.lineTo(0, 38);
  ctx.fill();
  const road = ctx.createLinearGradient(0, 36, 0, 64);
  road.addColorStop(0, '#6c6f74');
  road.addColorStop(1, '#3a3c40');
  ctx.fillStyle = road;
  ctx.fillRect(0, 36, 256, 28);
  // Bordes de la pista que se abren hacia el auto (los dos espejos los ven).
  ctx.strokeStyle = 'rgba(235, 238, 242, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(110, 37);
  ctx.lineTo(10, 64);
  ctx.moveTo(146, 37);
  ctx.lineTo(246, 64);
  ctx.stroke();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export class RearMirrors {
  /** Vidrios (hijos de la raíz del auto). */
  readonly root = new Group();
  private readonly camera: PerspectiveCamera;
  private readonly material: MeshBasicMaterial;
  private readonly fake: CanvasTexture;
  private target: WebGLRenderTarget | null = null;
  private frame = 0;
  private readonly own = new Disposer();

  constructor() {
    this.root.name = 'retrovisores';
    this.fake = this.own.own(paintFakeReflection());
    this.material = this.own.own(new MeshBasicMaterial({ map: this.fake, color: MIRROR_TINT, fog: false }));
    for (const side of [-1, 1]) {
      const geometry = this.own.own(new PlaneGeometry(GLASS_W, GLASS_H));
      // La imagen de la cámara tiene la derecha del auto a la izquierda; el espejo la invierte.
      // Espejo derecho: borde interno = justo detrás (u 0,5), externo = u 0. Izquierdo: externo = 1.
      const uv = geometry.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) {
        const outer = side > 0 ? uv.getX(i) > 0.5 : uv.getX(i) < 0.5;
        uv.setX(i, side > 0 ? (outer ? 0 : 0.5) : outer ? 1 : 0.5);
      }
      geometry.translate(side * GLASS_X, GLASS_Y, GLASS_Z);
      const mesh = new Mesh(geometry, this.material);
      mesh.name = side > 0 ? 'espejo-derecho' : 'espejo-izquierdo';
      this.root.add(mesh);
    }
    const verticalFov = (2 * Math.atan(Math.tan((HORIZONTAL_FOV * Math.PI) / 360) / ASPECT) * 180) / Math.PI;
    this.camera = new PerspectiveCamera(verticalFov, ASPECT, 0.5, 450);
    // A la altura de los espejos, mirando hacia atrás y apenas hacia abajo.
    this.camera.position.set(0, 0.72, -0.45);
    this.camera.rotation.set(-0.035, Math.PI, 0, 'YXZ');
    this.root.add(this.camera);
  }

  /** Con reflejo de verdad (cámara trasera) o con la imagen pintada. */
  setLive(live: boolean): void {
    if (live === (this.target !== null)) return;
    if (live) {
      this.target = new WebGLRenderTarget(TARGET_WIDTH, TARGET_HEIGHT, { type: HalfFloatType, samples: 0 });
      this.material.map = this.target.texture;
      this.frame = 0;
    } else {
      this.material.map = this.fake;
      this.target?.dispose();
      this.target = null;
    }
  }

  get live(): boolean {
    return this.target !== null;
  }

  /**
   * Dibuja lo que ven los espejos (cada dos cuadros). Las sombras no se
   * recalculan: sirven las del cuadro principal.
   * @param hidden lo que no debe verse en el espejo (el propio auto, partículas...)
   */
  render(renderer: WebGLRenderer, scene: Scene, hidden: readonly Object3D[]): void {
    const target = this.target;
    if (!target) return;
    this.frame++;
    if (this.frame % 2 === 0) return;
    const visible = hidden.map((object) => object.visible);
    for (const object of hidden) object.visible = false;
    const shadowAuto = renderer.shadowMap.autoUpdate;
    const autoClear = renderer.autoClear;
    const previous = renderer.getRenderTarget();
    renderer.shadowMap.autoUpdate = false;
    renderer.autoClear = true;
    renderer.setRenderTarget(target);
    renderer.render(scene, this.camera);
    renderer.setRenderTarget(previous);
    renderer.autoClear = autoClear;
    renderer.shadowMap.autoUpdate = shadowAuto;
    hidden.forEach((object, i) => {
      object.visible = visible[i] ?? true;
    });
  }

  dispose(): void {
    this.root.removeFromParent();
    this.target?.dispose();
    this.target = null;
    this.own.dispose();
  }
}
