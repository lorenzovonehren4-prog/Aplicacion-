/**
 * Sombra de contacto de los autos: un rectángulo redondeado y difuso apoyado
 * en el piso debajo de cada auto (el del jugador y los rivales). Sin ella, en
 * calidad Baja (sin mapa de sombras) los autos parecen flotar; con el mapa de
 * sombras encendido es más tenue y sólo oscurece el rincón donde la luz no
 * llega (debajo del piso del auto).
 *
 * Una textura chica pintada a mano, una malla plana y un material
 * transparente compartidos: casi no cuesta.
 */

import {
  CanvasTexture,
  InstancedMesh,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';

/** Tamaño de la sombra (m): un poco más que el auto, que mide ~2 × 5,6 m. */
const WIDTH = 2.5;
const LENGTH = 6.2;
/** Alto sobre el piso (m): por encima del asfalto aunque el auto se incline. */
const LIFT = 0.05;
/** Opacidad sin mapa de sombras (la única sombra del auto) y con él (sólo el rincón de abajo). */
const OPACITY_ALONE = 0.72;
const OPACITY_WITH_SHADOWS = 0.38;

function paintTexture(): CanvasTexture {
  const w = 64;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo pintar la sombra de los autos.');
  const image = ctx.createImageData(w, h);
  // Distancia a un rectángulo redondeado (más angosto adelante, como el auto) y caída suave.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w - 0.5;
      const v = (y + 0.5) / h - 0.5;
      const halfWidth = 0.3 - 0.06 * Math.max(0, -v * 2);
      const dx = Math.max(0, Math.abs(u) - halfWidth);
      const dy = Math.max(0, Math.abs(v) - 0.36);
      const distance = Math.hypot(dx, dy * 0.5);
      const alpha = Math.max(0, 1 - distance / 0.16);
      const i = (y * w + x) * 4;
      image.data[i] = 0;
      image.data[i + 1] = 0;
      image.data[i + 2] = 0;
      image.data[i + 3] = Math.round(255 * alpha * alpha * (3 - 2 * alpha));
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

export class CarShadows {
  readonly geometry: PlaneGeometry;
  readonly material: MeshBasicMaterial;
  private readonly texture: CanvasTexture;

  constructor() {
    this.texture = paintTexture();
    this.geometry = new PlaneGeometry(WIDTH, LENGTH);
    // Acostada en el piso; el largo sobre el eje del auto (Z local).
    this.geometry.rotateX(-Math.PI / 2);
    this.geometry.translate(0, LIFT, 0);
    this.material = new MeshBasicMaterial({
      color: 0x000000,
      map: this.texture,
      transparent: true,
      depthWrite: false,
      // Negra y sin niebla: con niebla se aclararía hasta parecer un parche de color.
      fog: false,
      opacity: OPACITY_ALONE,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
  }

  /** Sombra de un auto (se agrega como hija de su raíz). */
  createSingle(): Mesh {
    const mesh = new Mesh(this.geometry, this.material);
    mesh.name = 'sombra-auto';
    mesh.renderOrder = 1;
    return mesh;
  }

  /** Sombras de una flota instanciada (una por auto, con la misma matriz que su carrocería). */
  createInstanced(count: number): InstancedMesh {
    const mesh = new InstancedMesh(this.geometry, this.material, Math.max(1, count));
    mesh.name = 'sombra-rivales';
    mesh.renderOrder = 1;
    mesh.frustumCulled = false;
    mesh.count = 0;
    return mesh;
  }

  /** Más tenue si el sol ya proyecta sombras (mapa de sombras encendido). */
  setShadowMapActive(active: boolean): void {
    this.material.opacity = active ? OPACITY_WITH_SHADOWS : OPACITY_ALONE;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
