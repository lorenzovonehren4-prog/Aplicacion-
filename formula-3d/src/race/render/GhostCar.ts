/**
 * Auto fantasma de la contrarreloj: el monoplaza con menos detalle, en
 * versión translúcida y azulada, que repite tu mejor vuelta. No proyecta
 * sombras ni choca, y se vuelve casi invisible cuando pasa junto a tu auto
 * (para no tapar la vista).
 */

import { Color, Mesh, type Material, type MeshStandardMaterial } from 'three';
import { CarModel } from '../../garage/CarModel';
import type { LiveryConfig } from '../../garage/livery';
import type { GhostPose } from '../session/Ghost';

const GHOST_LIVERY: LiveryConfig = { primary: '#7fc4ff', secondary: '#2b5c8a', accent: '#e8f4ff', number: 0, tireStripe: '#9fd4ff' };
const GHOST_TINT = new Color('#5fb4ff');
/** Opacidad normal y cerca de tu auto (a menos de `NEAR` m). */
const OPACITY = 0.42;
const OPACITY_NEAR = 0.08;
const NEAR = 6;
const FAR = 18;
/** Como `CarRig`: el origen del modelo está 0,2 m delante del CG. */
const MODEL_OFFSET = 0.2;

export class GhostCar {
  private readonly model: CarModel;
  private readonly materials: MeshStandardMaterial[] = [];
  private opacity = OPACITY;

  constructor(anisotropy: number) {
    this.model = new CarModel({ livery: GHOST_LIVERY, detail: 0.5, anisotropy });
    this.model.root.name = 'fantasma';
    const seen = new Set<Material>();
    this.model.root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.castShadow = false;
      object.receiveShadow = false;
      // Encima de todo lo translúcido de la pista (la trazada), debajo del HUD.
      object.renderOrder = 3;
      const material = object.material as MeshStandardMaterial;
      if (seen.has(material)) return;
      seen.add(material);
      material.transparent = true;
      material.depthWrite = false;
      material.opacity = OPACITY;
      material.emissive?.copy(GHOST_TINT);
      material.emissiveIntensity = 0.35;
      this.materials.push(material);
    });
    this.model.root.visible = false;
  }

  get root(): CarModel['root'] {
    return this.model.root;
  }

  /**
   * Muestra el fantasma en `pose` (o lo oculta con null).
   * @param playerX posición de tu auto: cerca, el fantasma casi desaparece
   */
  update(pose: GhostPose | null, playerX: number, playerZ: number): void {
    const root = this.model.root;
    root.visible = pose !== null;
    if (!pose) return;
    const sin = Math.sin(pose.heading);
    const cos = Math.cos(pose.heading);
    root.position.set(pose.x - sin * MODEL_OFFSET, 0.002, pose.z - cos * MODEL_OFFSET);
    root.rotation.set(0, pose.heading, 0);
    const distance = Math.hypot(pose.x - playerX, pose.z - playerZ);
    const t = Math.min(1, Math.max(0, (distance - NEAR) / (FAR - NEAR)));
    const opacity = OPACITY_NEAR + (OPACITY - OPACITY_NEAR) * t;
    if (Math.abs(opacity - this.opacity) > 0.01) {
      this.opacity = opacity;
      for (const material of this.materials) material.opacity = opacity;
    }
  }

  dispose(): void {
    this.model.dispose();
  }
}
