/** Contexto compartido por las etapas de construcción del escenario del circuito. */

import { InstancedMesh, Matrix4, Mesh, Quaternion, Vector3, type BufferGeometry, type Color, type Group, type Material } from 'three';
import type { Disposer } from '../../core/utils/Disposer';
import type { Random } from '../../core/utils/random';
import type { Track } from '../Track';

export interface BuildContext {
  track: Track;
  root: Group;
  own: Disposer;
  rng: Random;
  anisotropy: number;
  /** Densidad de árboles y público (según la calidad gráfica). */
  density: number;
  /** ¿Los árboles y tribunas proyectan sombra? (calidades altas) */
  detailShadows: boolean;
}

/** Crea una malla, la agrega a la escena y registra geometría y material para liberarlos. */
export function addMesh(
  ctx: BuildContext,
  geometry: BufferGeometry,
  material: Material,
  options: { cast?: boolean; receive?: boolean; name?: string } = {},
): Mesh {
  ctx.own.own(geometry);
  ctx.own.own(material);
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = options.cast ?? false;
  mesh.receiveShadow = options.receive ?? true;
  if (options.name) mesh.name = options.name;
  // El escenario no se mueve: se ahorra el recálculo de matrices.
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  ctx.root.add(mesh);
  return mesh;
}

/** Una instancia de un objeto repetido (árbol, persona…). */
export interface InstanceItem {
  x: number;
  y: number;
  z: number;
  /** Giro sobre el eje vertical (rad). */
  yaw: number;
  sx: number;
  sy: number;
  sz: number;
  color: Color;
}

/**
 * Agrega muchas copias de un objeto agrupadas por celdas de `cell` metros:
 * cada celda es un `InstancedMesh` con su propia esfera envolvente, así la
 * GPU sólo dibuja las celdas que están a la vista (y la pasada de sombras,
 * sólo las cercanas al auto). Un único grupo para todo el circuito se
 * dibujaría entero en cada cuadro.
 */
export function addChunkedInstances(
  ctx: BuildContext,
  geometry: BufferGeometry,
  material: Material,
  items: readonly InstanceItem[],
  options: { cell: number; name: string; cast: boolean; receive: boolean },
): void {
  const cells = new Map<string, InstanceItem[]>();
  for (const item of items) {
    const key = `${Math.floor(item.x / options.cell)}:${Math.floor(item.z / options.cell)}`;
    let list = cells.get(key);
    if (!list) {
      list = [];
      cells.set(key, list);
    }
    list.push(item);
  }
  const matrix = new Matrix4();
  const q = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const position = new Vector3();
  const scale = new Vector3();
  for (const list of cells.values()) {
    const mesh = new InstancedMesh(geometry, material, list.length);
    list.forEach((item, i) => {
      q.setFromAxisAngle(up, item.yaw);
      matrix.compose(position.set(item.x, item.y, item.z), q, scale.set(item.sx, item.sy, item.sz));
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, item.color);
    });
    mesh.castShadow = options.cast;
    mesh.receiveShadow = options.receive;
    mesh.name = options.name;
    mesh.matrixAutoUpdate = false;
    mesh.computeBoundingSphere();
    ctx.root.add(mesh);
  }
}
