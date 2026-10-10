/**
 * Vista trasera del auto del jugador: una cámara que mira hacia atrás dibuja
 * la pista en una textura chica (sin recalcular las sombras), y esa imagen la
 * usan:
 * - el retrovisor de la pantalla (arriba al centro, en todas las cámaras),
 *   invertido como un espejo (ver `MirrorOverlay`);
 * - los espejos del auto en el cockpit (cada uno su mitad), en Alta y Ultra.
 *   En Baja y Media los espejos del auto muestran una imagen pintada (cielo,
 *   árboles y asfalto) en lugar del reflejo blanco del cielo.
 *
 * Para no compilar sombreadores nuevos, la textura usa la misma variante de
 * los materiales que la carrera: si la escena se dibuja en un búfer (con
 * posprocesado o MSAA), la imagen queda lineal y el retrovisor le aplica el
 * tono y el sRGB al dibujarla; si va directo al lienzo (calidad Baja), la
 * textura se marca como destino "de pantalla" y guarda la imagen ya
 * terminada (`encoded`).
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
  UnsignedByteType,
  WebGLRenderTarget,
  type Object3D,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { Disposer } from '../../core/utils/Disposer';

/** Vidrio de cada espejo (m) y su lugar en el modelo (ver `CarModel.buildDetails`), apenas delante. */
const GLASS_W = 0.13;
const GLASS_H = 0.042;
const GLASS_X = 0.47;
const GLASS_Y = 0.645;
const GLASS_Z = -0.5765;
/** Proporción de la imagen trasera (la del retrovisor de la pantalla). */
export const REAR_ASPECT = 4;
/** Los dos vidrios juntos son más apaisados: muestran la franja central de la imagen. */
const GLASS_ASPECT = (GLASS_W / GLASS_H) * 2;
const GLASS_V = REAR_ASPECT / GLASS_ASPECT;
/** Campo horizontal (°): de un costado al otro del auto que viene detrás y algo más. */
const HORIZONTAL_FOV = 62;
/** Hasta dónde se ve (m): lo que importa son los autos cercanos; más lejos sólo dibujaría de más. */
const FAR = 320;
/** Un espejo devuelve algo menos de luz que la que recibe. */
const MIRROR_TINT = 0xd4d8de;

export type RearViewMode = 'off' | 'linear' | 'encoded';

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
  private mode: RearViewMode = 'off';
  /** Los vidrios del auto muestran la imagen de verdad. */
  private liveGlass = false;
  private width = 0;
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
      // En alto, cada vidrio muestra la franja central (la imagen es menos apaisada que los dos vidrios).
      const uv = geometry.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) {
        const outer = side > 0 ? uv.getX(i) > 0.5 : uv.getX(i) < 0.5;
        uv.setX(i, side > 0 ? (outer ? 0 : 0.5) : outer ? 1 : 0.5);
        uv.setY(i, 0.5 + (uv.getY(i) - 0.5) * GLASS_V);
      }
      geometry.translate(side * GLASS_X, GLASS_Y, GLASS_Z);
      const mesh = new Mesh(geometry, this.material);
      mesh.name = side > 0 ? 'espejo-derecho' : 'espejo-izquierdo';
      this.root.add(mesh);
    }
    const verticalFov = (2 * Math.atan(Math.tan((HORIZONTAL_FOV * Math.PI) / 360) / REAR_ASPECT) * 180) / Math.PI;
    this.camera = new PerspectiveCamera(verticalFov, REAR_ASPECT, 0.5, FAR);
    // A la altura de la cabeza del piloto, mirando hacia atrás y apenas hacia abajo:
    // por encima del alerón se ve el auto que viene detrás.
    this.camera.position.set(0, 0.98, -0.3);
    this.camera.rotation.set(-0.05, Math.PI, 0, 'YXZ');
    this.root.add(this.camera);
  }

  /**
   * Prende o apaga la vista trasera.
   * @param mode 'linear' si la carrera se dibuja en un búfer, 'encoded' si va directo al lienzo
   * @param width ancho de la imagen (px); el alto sale de la proporción
   * @param glass los espejos del auto muestran la imagen (sólo con 'linear')
   */
  configure(mode: RearViewMode, width: number, glass: boolean): void {
    const size = Math.max(64, Math.round(width));
    if (mode !== this.mode || (mode !== 'off' && size !== this.width)) {
      this.target?.dispose();
      this.target = null;
      this.mode = mode;
      this.width = size;
      if (mode !== 'off') {
        const height = Math.max(16, Math.round(size / REAR_ASPECT));
        if (mode === 'linear') {
          this.target = new WebGLRenderTarget(size, height, { type: HalfFloatType, samples: 0 });
        } else {
          // Variante "de pantalla" de los materiales (tono y sRGB incluidos): la de la carrera en Baja.
          // El formato interno RGBA8 evita que la GPU vuelva a codificar a sRGB al escribir.
          const target = new WebGLRenderTarget(size, height, { type: UnsignedByteType, samples: 0, colorSpace: SRGBColorSpace });
          target.texture.internalFormat = 'RGBA8';
          (target as WebGLRenderTarget & { isXRRenderTarget: boolean }).isXRRenderTarget = true;
          this.target = target;
        }
        this.frame = 0;
      }
    }
    this.liveGlass = glass && mode === 'linear';
    this.material.map = this.liveGlass && this.target ? this.target.texture : this.fake;
    this.material.needsUpdate = true;
  }

  get live(): boolean {
    return this.target !== null;
  }

  get glassLive(): boolean {
    return this.liveGlass;
  }

  /** Imagen trasera (sin invertir) y si ya tiene el tono y el sRGB aplicados. */
  get image(): { texture: Texture; encoded: boolean } | null {
    return this.target ? { texture: this.target.texture, encoded: this.mode === 'encoded' } : null;
  }

  /**
   * Dibuja lo que se ve hacia atrás. Las sombras no se recalculan: sirven
   * las del cuadro principal.
   * @param every cada cuántos cuadros (1 = todos, 2 = uno sí y uno no)
   * @param hidden lo que no debe verse (el propio auto, partículas...)
   */
  render(renderer: WebGLRenderer, scene: Scene, hidden: readonly Object3D[], every: number): void {
    const target = this.target;
    if (!target) return;
    this.frame++;
    if (every > 1 && this.frame % every !== 1) return;
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
