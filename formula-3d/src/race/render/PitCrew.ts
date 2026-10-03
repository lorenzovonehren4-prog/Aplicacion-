/**
 * Equipos de boxes: ocho mecánicos con el mono del color del equipo (uno por
 * rueda, los de los gatos adelante y atrás y dos a los costados). Aparecen en
 * el box cuando su auto viene entrando; los de las ruedas se arrodillan
 * mientras cambian las gomas, y todos se van cuando el auto salió.
 *
 * Dos mallas instanciadas para todos los equipos (de pie y arrodillado):
 * figuras simples con colores por vértice (casco, visor, botas); el color del
 * equipo va por instancia.
 */

import {
  BoxGeometry,
  CapsuleGeometry,
  Color,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Track } from '../../tracks/Track';

/** Mecánicos por box. */
const CREW_SIZE = 8;
/**
 * Dónde se para cada uno, en el sistema del auto parado: metros hacia
 * adelante y hacia un costado, y si se arrodilla para trabajar (los de las ruedas).
 */
const SPOTS: ReadonlyArray<readonly [number, number, boolean]> = [
  [1.9, 1.55, true],
  [1.9, -1.55, true],
  [-1.6, 1.6, true],
  [-1.6, -1.6, true],
  [3.6, 0, false],
  [-3.2, 0, false],
  [0.2, 1.9, false],
  [0.2, -1.9, false],
];
/** El equipo aparece cuando el auto está a esta distancia del box (m) y se va cuando lo pasó por esta otra. */
const SHOW_BEFORE = 90;
const HIDE_AFTER = 25;
/** Tonos (por vértice) que multiplican el color del equipo. */
const SUIT = 1;
const HELMET = 0.82;
const DARK = 0.07;

/** Lo que el equipo necesita saber de una parada en curso. */
export interface CrewStop {
  /** Box (índice) y color del equipo. */
  box: number;
  color: string;
  /** Metros que le faltan al auto para llegar al box (negativo: ya lo pasó). */
  toBox: number;
  /** Cambiando las gomas ahora. */
  working: boolean;
}

type Part = [geometry: BufferGeometry, shade: number];

/** Una pieza de la figura: girada en X (inclinación hacia adelante), ubicada y con su tono. */
function part(geometry: BufferGeometry, x: number, y: number, z: number, shade: number, tilt = 0): Part {
  if (tilt !== 0) geometry.rotateX(tilt);
  geometry.translate(x, y, z);
  return [geometry, shade];
}

/** Junta las piezas en una sola geometría con el tono en el color de cada vértice. */
function figure(parts: Part[]): BufferGeometry {
  const shaded = parts.map(([geometry, shade]) => {
    const flat = geometry.toNonIndexed();
    geometry.dispose();
    const count = flat.getAttribute('position').count;
    flat.setAttribute('color', new Float32BufferAttribute(new Array<number>(count * 3).fill(shade), 3));
    flat.deleteAttribute('uv');
    return flat;
  });
  const merged = mergeGeometries(shaded, false);
  for (const geometry of shaded) geometry.dispose();
  if (!merged) throw new Error('No se pudo armar el equipo de boxes.');
  merged.computeVertexNormals();
  return merged;
}

const limb = (radius: number, length: number): CapsuleGeometry => new CapsuleGeometry(radius, length, 2, 7);
const head = (): BufferGeometry[] => [new SphereGeometry(0.16, 12, 9), new BoxGeometry(0.2, 0.07, 0.06)];

/** Mecánico de pie (mira a +Z): piernas, torso, brazos adelante, casco con visor y botas. */
function standing(): BufferGeometry {
  const [helmet, visor] = head();
  return figure([
    part(limb(0.085, 0.6), -0.11, 0.42, 0, SUIT),
    part(limb(0.085, 0.6), 0.11, 0.42, 0, SUIT),
    part(new BoxGeometry(0.15, 0.08, 0.26), -0.11, 0.04, 0.04, DARK),
    part(new BoxGeometry(0.15, 0.08, 0.26), 0.11, 0.04, 0.04, DARK),
    part(limb(0.19, 0.3).scale(1, 1, 0.75), 0, 1.13, 0, SUIT),
    part(limb(0.06, 0.38), -0.27, 1.1, 0.12, SUIT, 0.55),
    part(limb(0.06, 0.38), 0.27, 1.1, 0.12, SUIT, 0.55),
    part(helmet as BufferGeometry, 0, 1.6, 0, HELMET),
    part(visor as BufferGeometry, 0, 1.62, 0.14, DARK),
  ]);
}

/** Mecánico arrodillado junto a la rueda (mira a +Z): una rodilla en el piso, inclinado, brazos a la altura del eje. */
function kneeling(): BufferGeometry {
  const [helmet, visor] = head();
  return figure([
    // Pierna de adelante: muslo horizontal y canilla vertical.
    part(limb(0.085, 0.3), -0.12, 0.48, 0.18, SUIT, Math.PI / 2),
    part(limb(0.08, 0.3), -0.12, 0.24, 0.36, SUIT),
    part(new BoxGeometry(0.15, 0.08, 0.26), -0.12, 0.04, 0.42, DARK),
    // Pierna de atrás: muslo vertical, rodilla en el piso y canilla hacia atrás.
    part(limb(0.085, 0.28), 0.12, 0.3, -0.02, SUIT, 0.2),
    part(limb(0.08, 0.3), 0.12, 0.09, -0.26, SUIT, Math.PI / 2),
    part(limb(0.19, 0.28).scale(1, 1, 0.75), 0, 0.88, 0.06, SUIT, 0.35),
    part(limb(0.06, 0.36), -0.25, 0.8, 0.3, SUIT, 1.1),
    part(limb(0.06, 0.36), 0.25, 0.8, 0.3, SUIT, 1.1),
    part(helmet as BufferGeometry, 0, 1.32, 0.24, HELMET),
    part(visor as BufferGeometry, 0, 1.33, 0.38, DARK),
  ]);
}

export class PitCrew {
  /** De pie y arrodillados (las dos van a la escena). */
  readonly meshes: readonly [InstancedMesh, InstancedMesh];
  private readonly material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.65 });
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly unit = new Vector3(1, 1, 1);
  private readonly up = new Vector3(0, 1, 0);
  private readonly color = new Color();
  private readonly point = { x: 0, z: 0 };
  private readonly tangent = { x: 0, z: 0 };

  constructor(private readonly track: Track) {
    const capacity = track.pitLane.boxes.length * CREW_SIZE;
    this.meshes = [new InstancedMesh(standing(), this.material, capacity), new InstancedMesh(kneeling(), this.material, capacity)];
    this.meshes.forEach((mesh, k) => {
      mesh.name = k === 0 ? 'equipos-de-boxes' : 'equipos-de-boxes-ruedas';
      mesh.count = 0;
      mesh.frustumCulled = false;
      // Para que el material compile con colores por instancia desde el principio.
      for (let i = 0; i < capacity; i++) mesh.setColorAt(i, this.color.set('#ffffff'));
    });
  }

  /** Ubica a los equipos de las paradas en curso (los demás no se dibujan). */
  update(stops: readonly CrewStop[]): void {
    const pit = this.track.pitLane;
    const g = this.track.geometry;
    const counts = [0, 0];
    for (const stop of stops) {
      if (stop.toBox > SHOW_BEFORE || stop.toBox < -HIDE_AFTER) continue;
      const s = pit.boxes[stop.box] ?? pit.boxes[0] ?? 0;
      g.pointAt(s, pit.sign * pit.box, this.point, this.tangent);
      // Ejes del box: adelante = tangente; costado = derecha de la pista (−tz, tx).
      const fx = this.tangent.x;
      const fz = this.tangent.z;
      this.color.set(stop.color);
      for (const [ahead, side, kneels] of SPOTS) {
        const x = this.point.x + fx * ahead - fz * side;
        const z = this.point.z + fz * ahead + fx * side;
        // Mira al auto (al centro del box).
        const yaw = Math.atan2(this.point.x - x, this.point.z - z);
        const pose = kneels && stop.working ? 1 : 0;
        const mesh = this.meshes[pose];
        const n = counts[pose] ?? 0;
        this.position.set(x, 0, z);
        this.rotation.setFromAxisAngle(this.up, yaw);
        this.matrix.compose(this.position, this.rotation, this.unit);
        mesh.setMatrixAt(n, this.matrix);
        mesh.setColorAt(n, this.color);
        counts[pose] = n + 1;
      }
    }
    this.meshes.forEach((mesh, k) => {
      mesh.count = counts[k] ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }

  dispose(): void {
    for (const mesh of this.meshes) {
      mesh.geometry.dispose();
      mesh.dispose();
    }
    this.material.dispose();
  }
}
