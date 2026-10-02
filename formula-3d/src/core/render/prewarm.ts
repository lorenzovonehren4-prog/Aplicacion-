/**
 * Precalentamiento de la GPU: dibuja una escena una vez, oculta, con todo
 * visible (también lo que empieza oculto y las mallas instanciadas vacías).
 * Así la geometría y las texturas ya están en la GPU antes de mostrar la
 * escena: sin tirones la primera vez que algo entra en cuadro (el otro lado
 * del circuito, un rival que se acerca, la bandera…).
 *
 * Los sombreadores se compilan aparte (`compileScene`); esto sube los datos.
 *
 * Importante: three.js arma una variante distinta de cada sombreador según
 * dónde se dibuja (al lienzo: con tono y sRGB; a un búfer: lineal). Compilar
 * o precalentar para el destino equivocado compila todo dos veces (la carga
 * tardaba el doble). Por eso las dos funciones reciben `toCanvas`: el mismo
 * destino que va a usar el `RenderHost` (`drawsToCanvas`).
 */

import {
  Mesh,
  type InstancedMesh,
  type LOD,
  Vector4,
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

/** Compila los sombreadores de la escena para el destino real (en paralelo si la GPU lo permite). */
export async function compileScene(renderer: WebGLRenderer, scene: Scene, camera: Camera, toCanvas: boolean): Promise<void> {
  const previous = renderer.getRenderTarget();
  const target = toCanvas ? null : new WebGLRenderTarget(1, 1);
  renderer.setRenderTarget(target);
  try {
    if (renderer.extensions.has('KHR_parallel_shader_compile')) await renderer.compileAsync(scene, camera);
    else renderer.compile(scene, camera);
  } finally {
    renderer.setRenderTarget(previous);
    target?.dispose();
  }
}

/**
 * @param camera una cámara que vea toda la escena (si no, lo que quede fuera
 *   de cuadro igual sube sus texturas, pero no su geometría)
 * @param toCanvas dibuja al lienzo (en un solo píxel de la esquina) en vez de
 *   a un búfer: así usa las mismas variantes de sombreadores que el juego
 */
export function prewarm(renderer: WebGLRenderer, scene: Scene, camera: Camera, toCanvas: boolean): void {
  const hidden: Object3D[] = [];
  const emptyInstances: InstancedMesh[] = [];
  const lods: LOD[] = [];
  const textures = new Set<Texture>();
  scene.traverse((object) => {
    // Niveles de detalle: se dibujan todos (si no, el LOD elige uno solo y
    // los otros subirían su geometría recién al aparecer: un tirón).
    if ((object as Partial<LOD>).isLOD === true) {
      const lod = object as LOD;
      if (lod.autoUpdate) {
        lods.push(lod);
        lod.autoUpdate = false;
      }
    }
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
  const target = toCanvas ? null : new WebGLRenderTarget(64, 64);
  const previous = renderer.getRenderTarget();
  const viewport = renderer.getViewport(new Vector4());
  const scissor = renderer.getScissor(new Vector4());
  const scissorTest = renderer.getScissorTest();
  try {
    for (const texture of textures) renderer.initTexture(texture);
    renderer.setRenderTarget(target);
    if (toCanvas) {
      // Un píxel: alcanza para subir todo a la GPU y queda tapado por la pantalla de carga.
      renderer.setViewport(0, 0, 1, 1);
      renderer.setScissor(0, 0, 1, 1);
      renderer.setScissorTest(true);
    }
    renderer.render(scene, camera);
  } finally {
    if (toCanvas) {
      renderer.setViewport(viewport);
      renderer.setScissor(scissor);
      renderer.setScissorTest(scissorTest);
    }
    renderer.setRenderTarget(previous);
    target?.dispose();
    for (const object of hidden) object.visible = false;
    for (const mesh of emptyInstances) mesh.count = 0;
    for (const lod of lods) lod.autoUpdate = true;
  }
}
