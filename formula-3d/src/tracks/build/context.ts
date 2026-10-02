/** Contexto compartido por las etapas de construcción del escenario del circuito. */

import { InstancedMesh, LOD, Matrix4, Mesh, Quaternion, Vector3, type BufferGeometry, type Color, type Group, type Material, type Object3D, type Texture } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Disposer } from '../../core/utils/Disposer';
import type { Random } from '../../core/utils/random';
import type { Track } from '../Track';

export interface BuildContext {
  track: Track;
  root: Group;
  own: Disposer;
  rng: Random;
  anisotropy: number;
  /** px por repetición de las texturas de superficie (512 o 1024 según la calidad). */
  textureSize: number;
  /** Texturas del asfalto (se generan una sola vez y se comparten). */
  asphalt?: { map: Texture; bump: Texture };
  /** Densidad de árboles y público (según la calidad gráfica). */
  density: number;
  /** ¿Los árboles y tribunas proyectan sombra? (calidades altas) */
  detailShadows: boolean;
  /** Lo que se anima con el tiempo (viento en los árboles, público…). */
  tickers: Array<(time: number) => void>;
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

/**
 * Agrega al circuito una pieza fija armada con varias mallas (un puente…) como
 * una sola malla por material: menos llamadas de dibujo (y de sombras) que
 * dibujar cada pieza. Las geometrías de `object` quedan transformadas en
 * coordenadas del circuito y se liberan las originales.
 */
export function addMerged(ctx: BuildContext, object: Object3D, name: string): void {
  object.updateMatrixWorld(true);
  const parts = new Map<Material, { geometries: BufferGeometry[]; cast: boolean; receive: boolean }>();
  object.traverse((child) => {
    if (!(child instanceof Mesh) || Array.isArray(child.material)) return;
    const material = child.material as Material;
    const entry = parts.get(material) ?? { geometries: [], cast: false, receive: false };
    // Sin índices: las piezas pueden venir de geometrías con y sin índice.
    const source = child.geometry as BufferGeometry;
    const geometry = source.index ? source.toNonIndexed() : source.clone();
    geometry.applyMatrix4(child.matrixWorld);
    entry.geometries.push(geometry);
    entry.cast ||= child.castShadow;
    entry.receive ||= child.receiveShadow;
    parts.set(material, entry);
  });
  for (const [material, entry] of parts) {
    const merged = mergeGeometries(entry.geometries);
    for (const geometry of entry.geometries) geometry.dispose();
    if (!merged) continue;
    addMesh(ctx, merged, material, { cast: entry.cast, receive: entry.receive, name });
  }
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
  options: { cell: number; name: string; cast: boolean; receive: boolean; depthMaterial?: Material },
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

/**
 * Como `addChunkedInstances`, pero cada celda es un `LOD` con una versión del
 * objeto por distancia (la cámara elige sola cuál dibujar en cada cuadro):
 * cerca, la geometría completa; lejos, versiones más simples que a esa
 * distancia se ven igual. Las instancias se guardan relativas al centro de
 * la celda, que es desde donde el LOD mide la distancia.
 * @param levels geometría de cada nivel y la distancia (m) desde la que se usa
 */
export function addChunkedLodInstances(
  ctx: BuildContext,
  levels: ReadonlyArray<{ geometry: BufferGeometry; distance: number }>,
  material: Material,
  items: readonly InstanceItem[],
  options: { cell: number; name: string; cast: boolean; receive: boolean; depthMaterial?: Material },
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
    let cx = 0;
    let cz = 0;
    for (const item of list) {
      cx += item.x / list.length;
      cz += item.z / list.length;
    }
    const lod = new LOD();
    lod.name = options.name;
    lod.position.set(cx, 0, cz);
    lod.matrixAutoUpdate = false;
    lod.updateMatrix();
    for (const level of levels) {
      const mesh = new InstancedMesh(level.geometry, material, list.length);
      list.forEach((item, i) => {
        q.setFromAxisAngle(up, item.yaw);
        matrix.compose(position.set(item.x - cx, item.y, item.z - cz), q, scale.set(item.sx, item.sy, item.sz));
        mesh.setMatrixAt(i, matrix);
        mesh.setColorAt(i, item.color);
      });
      mesh.castShadow = options.cast;
      mesh.receiveShadow = options.receive;
      // Sombra con la forma recortada (hojas), no la de cada tarjeta entera.
      if (options.depthMaterial) mesh.customDepthMaterial = options.depthMaterial;
      mesh.name = options.name;
      mesh.matrixAutoUpdate = false;
      mesh.computeBoundingSphere();
      lod.addLevel(mesh, level.distance, level.distance * 0.05);
    }
    ctx.root.add(lod);
  }
}
