/**
 * Precalentamiento de la GPU: dibuja una escena una vez, oculta, en un búfer
 * chico, con todo visible (también lo que empieza oculto y las mallas
 * instanciadas vacías). Así la geometría y las texturas ya están en la GPU
 * antes de mostrar la escena: sin tirones la primera vez que algo entra en
 * cuadro (el otro lado del circuito, un rival que se acerca, la bandera…).
 *
 * Los sombreadores se compilan aparte (`compileAsync`); esto sube los datos.
 */

import {
  Mesh,
  type InstancedMesh,
  WebGLRenderTarget,
  type Camera,
  type Material,
  type Object3D,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from 'three';

/** Todas las texturas de un material (map, normalMap, envMap, uniforms…). */
function texturesOf(material: Material, out: Set<Texture>): void {
  for (const value of Object.values(material)) {
    if ((value as Partial<Texture> | null)?.isTexture === true) out.add(value as Texture);
  }
  const uniforms = (material as { uniforms?: Record<string, { value: unknown }> }).uniforms;
  if (uniforms) {
    for (const uniform of Object.values(uniforms)) {
      if ((uniform.value as Partial<Texture> | null)?.isTexture === true) out.add(uniform.value as Texture);
    }
  }
}

/**
 * @param camera una cámara que vea toda la escena (si no, lo que quede fuera
 *   de cuadro igual sube sus texturas, pero no su geometría)
 */
export function prewarm(renderer: WebGLRenderer, scene: Scene, camera: Camera): void {
  const hidden: Object3D[] = [];
  const emptyInstances: InstancedMesh[] = [];
  const textures = new Set<Texture>();
  scene.traverse((object) => {
    if (!object.visible) {
      hidden.push(object);
      object.visible = true;
    }
    if ((object as Partial<InstancedMesh>).isInstancedMesh === true) {
      const instanced = object as InstancedMesh;
      if (instanced.count === 0) {
        emptyInstances.push(instanced);
        instanced.count = 1;
      }
    }
    if (object instanceof Mesh) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials as Material[]) texturesOf(material, textures);
    }
  });
  const target = new WebGLRenderTarget(64, 64);
  const previous = renderer.getRenderTarget();
  try {
    for (const texture of textures) renderer.initTexture(texture);
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
  } finally {
    renderer.setRenderTarget(previous);
    target.dispose();
    for (const object of hidden) object.visible = false;
    for (const mesh of emptyInstances) mesh.count = 0;
  }
}
