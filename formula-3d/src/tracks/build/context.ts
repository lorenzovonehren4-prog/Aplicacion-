/** Contexto compartido por las etapas de construcción del escenario del circuito. */

import { Mesh, type BufferGeometry, type Group, type Material } from 'three';
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
