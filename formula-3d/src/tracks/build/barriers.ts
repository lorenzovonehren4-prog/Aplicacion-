/**
 * Muros de contención: hormigón con publicidad ficticia, barreras de
 * neumáticos de verdad (pilas instanciadas) frente a las camas de grava,
 * alambrado sobre los muros y postes. Siguen exactamente la distancia de muro
 * que usa la física (`Trackside`).
 */

import {
  BoxGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  LatheGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector2,
  Vector3,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addChunkedInstances, addMesh, type BuildContext, type InstanceItem } from './context';
import { buildRibbon, mirrorLeftSideUV, fullLap, spansWhere, type ProfilePoint } from './ribbon';
import { createFence, createWall } from './textures';

const WALL_HEIGHT = 1.05;
const WALL_THICKNESS = 0.4;
const FENCE_HEIGHT = 3.2;
const POST_SPACING = 4;
/** Cuánto se inclina el alambrado hacia la pista en toda su altura (m). */
const FENCE_LEAN = 0.6;
/** Neumáticos de las barreras: radio, alto de cada uno y cuántos por pila. */
const TYRE_RADIUS = 0.31;
const TYRE_HEIGHT = 0.3;
const TYRES_PER_STACK = 3;

/**
 * Pila de neumáticos (instanciada): una sola pieza torneada con las cinturas
 * entre goma y goma, y sólo la mitad que mira a la pista (la de atrás no se
 * ve): ~90 triángulos. Negra, con la goma de arriba blanca para que el color
 * de cada pila (rojo o blanco) pinte la cinta.
 */
function tyreStack(): BufferGeometry {
  const profile: Vector2[] = [new Vector2(0.001, 0)];
  for (let k = 0; k < TYRES_PER_STACK; k++) {
    const y = k * TYRE_HEIGHT;
    profile.push(new Vector2(TYRE_RADIUS * 0.9, y + 0.005), new Vector2(TYRE_RADIUS, y + TYRE_HEIGHT * 0.5));
  }
  const top = TYRES_PER_STACK * TYRE_HEIGHT;
  profile.push(new Vector2(TYRE_RADIUS * 0.9, top), new Vector2(TYRE_RADIUS * 0.45, top), new Vector2(0.001, top - 0.06));
  // Media vuelta: la cara +X mira a la pista (se orienta con el giro de cada pila).
  const lathe = new LatheGeometry(profile, 5, 0, Math.PI).toNonIndexed();
  const position = lathe.getAttribute('position');
  const colors: number[] = [];
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    const r = Math.hypot(position.getX(i), position.getZ(i));
    const band = y > top - TYRE_HEIGHT - 0.01 && r > TYRE_RADIUS * 0.6 ? 0.95 : 0.075;
    const hole = y > top - 0.07 && r < TYRE_RADIUS * 0.5 ? 0.4 : 1;
    colors.push(band * hole, band * hole, band * hole);
  }
  lathe.setAttribute('color', new Float32BufferAttribute(colors, 3));
  lathe.deleteAttribute('uv');
  lathe.computeVertexNormals();
  return lathe;
}

export function buildWalls(ctx: BuildContext): void {
  const g = ctx.track.geometry;
  const t = ctx.track.trackside;
  const faces = { concrete: [] as BufferGeometry[] };
  const caps: BufferGeometry[] = [];
  // Pilas de neumáticos frente a la grava: posición y lado de cada una.
  const stacks: Array<{ x: number; z: number; yaw: number; red: boolean }> = [];
  const point = { x: 0, z: 0 };
  const tangent = { x: 0, z: 0 };

  for (const side of ['left', 'right'] as const) {
    const walls = side === 'left' ? t.wallLeft : t.wallRight;
    const runoff = side === 'left' ? t.runoffLeft : t.runoffRight;
    const sign = side === 'left' ? -1 : 1;
    // Cara interior (mira a la pista): hormigón donde no hay grava; frente a la grava, neumáticos.
    for (const [from, to] of spansWhere(g, (i) => runoff[i] === 1, 1)) {
      const length = g.wrapS(to - from);
      const spacing = TYRE_RADIUS * 2.02;
      for (let along = spacing / 2, k = 0; along < length; along += spacing, k++) {
        const s = from + along;
        // Centrada sobre la línea del muro (la cara de adelante queda donde choca la física).
        g.pointAt(s, ((walls[g.indexAt(s)] ?? 10) + TYRE_RADIUS * 0.95) * sign, point, tangent);
        // Hacia la pista = −(derecha) · lado; derecha = (−tz, tx). El +X local apunta ahí.
        const toTrackX = tangent.z * sign;
        const toTrackZ = -tangent.x * sign;
        stacks.push({ x: point.x, z: point.z, yaw: Math.atan2(-toTrackZ, toTrackX), red: Math.floor(k / 3) % 2 === 0 });
      }
    }
    for (const tyres of [false]) {
      for (const [from, to] of spansWhere(g, (i) => (runoff[i] === 1) === tyres, 1)) {
        const face = buildRibbon(g, {
          from,
          to,
          step: 2,
          profile: (i): ProfilePoint[] => {
            const d = (walls[i] ?? 10) * sign;
            // Derecha: de abajo hacia arriba; izquierda: de arriba hacia abajo (mira a la pista).
            return side === 'right'
              ? [
                  [d, -0.05],
                  [d, WALL_HEIGHT],
                ]
              : [
                  [d, WALL_HEIGHT],
                  [d, -0.05],
                ];
          },
          vLength: tyres ? 8 : 64,
        });
        // Del lado izquierdo, sin esto los carteles quedarían espejados.
        if (side === 'left') mirrorLeftSideUV(face);
        faces.concrete.push(face);
      }
    }
    // Tapa superior.
    caps.push(
      buildRibbon(g, {
        ...fullLap(g),
        step: 2,
        profile: (i): ProfilePoint[] => {
          const inner = (walls[i] ?? 10) * sign;
          const outer = inner + WALL_THICKNESS * sign;
          return sign > 0
            ? [
                [inner, WALL_HEIGHT],
                [outer, WALL_HEIGHT],
              ]
            : [
                [outer, WALL_HEIGHT],
                [inner, WALL_HEIGHT],
              ];
        },
        vLength: 8,
      }),
    );
  }

  const concrete = mergeGeometries(faces.concrete);
  const top = mergeGeometries(caps);
  for (const piece of [...faces.concrete, ...caps]) piece.dispose();
  if (concrete) {
    const texture = ctx.own.own(createWall(ctx.anisotropy));
    addMesh(ctx, concrete, new MeshStandardMaterial({ map: texture, roughness: 0.8 }), { cast: true, name: 'muros' });
  }
  if (stacks.length > 0) {
    // Por celdas (como los árboles): sólo se dibujan las barreras a la vista.
    const geometry = ctx.own.own(tyreStack());
    const material = ctx.own.own(new MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 }));
    const red = new Color('#d6202a');
    const white = new Color('#f2f2ee');
    const items: InstanceItem[] = stacks.map((stack) => ({ x: stack.x, y: -0.02, z: stack.z, yaw: stack.yaw, sx: 1, sy: 1, sz: 1, color: stack.red ? red : white }));
    addChunkedInstances(ctx, geometry, material, items, { cell: 160, name: 'neumáticos', cast: true, receive: true });
  }
  if (top) addMesh(ctx, top, new MeshStandardMaterial({ color: '#8d8e8b', roughness: 0.85 }), { name: 'muros-tapa' });
}

/** Alambrado sobre los muros y postes cada 4 m. */
export function buildFences(ctx: BuildContext): void {
  const g = ctx.track.geometry;
  const t = ctx.track.trackside;
  const pieces: BufferGeometry[] = [];
  for (const side of ['left', 'right'] as const) {
    const walls = side === 'left' ? t.wallLeft : t.wallRight;
    const sign = side === 'left' ? -1 : 1;
    pieces.push(
      buildRibbon(g, {
        ...fullLap(g),
        step: 2,
        profile: (i): ProfilePoint[] => {
          const d = ((walls[i] ?? 10) + WALL_THICKNESS * 0.5) * sign;
          // Inclinado hacia la pista, como los alambrados de contención reales.
          return [
            [d, WALL_HEIGHT],
            [d - FENCE_LEAN * sign, WALL_HEIGHT + FENCE_HEIGHT],
          ];
        },
        vLength: 0.3,
        u: 'meters',
        uLength: 0.3,
      }),
    );
  }
  const fence = mergeGeometries(pieces);
  for (const piece of pieces) piece.dispose();
  if (fence) {
    const texture = ctx.own.own(createFence(ctx.anisotropy));
    addMesh(
      ctx,
      fence,
      new MeshStandardMaterial({
        map: texture,
        alphaTest: 0.35,
        side: DoubleSide,
        roughness: 0.4,
        metalness: 0.6,
        alphaToCoverage: true,
      }),
      { name: 'alambrado', receive: false },
    );
  }

  // Postes: una sola malla instanciada para toda la vuelta.
  const count = Math.floor(g.length / POST_SPACING) * 2;
  const postGeometry = ctx.own.own(new BoxGeometry(0.08, FENCE_HEIGHT + 0.2, 0.08));
  postGeometry.translate(0, (FENCE_HEIGHT + 0.2) / 2, 0);
  const posts = new InstancedMesh(postGeometry, ctx.own.own(new MeshStandardMaterial({ color: '#50555c', metalness: 0.7, roughness: 0.4 })), count);
  const matrix = new Matrix4();
  const q = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const direction = new Vector3();
  const point = { x: 0, z: 0 };
  const tangent = { x: 0, z: 0 };
  let n = 0;
  for (let s = 0; s < g.length - POST_SPACING / 2 && n < count - 1; s += POST_SPACING) {
    const i = g.indexAt(s);
    for (const sign of [-1, 1]) {
      const wall = (sign < 0 ? t.wallLeft : t.wallRight)[i] ?? 10;
      g.pointAt(s, (wall + WALL_THICKNESS * 0.5) * sign, point, tangent);
      // Misma inclinación que el alambrado: hacia la pista (−derecha × lado).
      direction.set(tangent.z * sign * FENCE_LEAN, FENCE_HEIGHT, -tangent.x * sign * FENCE_LEAN).normalize();
      q.setFromUnitVectors(up, direction);
      matrix.compose(new Vector3(point.x, WALL_HEIGHT - 0.1, point.z), q, new Vector3(1, 1, 1));
      posts.setMatrixAt(n++, matrix);
    }
  }
  posts.count = n;
  posts.instanceMatrix.needsUpdate = true;
  posts.castShadow = ctx.detailShadows;
  posts.receiveShadow = false;
  posts.frustumCulled = false;
  ctx.root.add(posts);
}
