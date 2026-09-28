/**
 * Muros de contención: hormigón con publicidad ficticia (barreras de
 * neumáticos frente a las camas de grava), alambrado sobre los muros y postes.
 * Siguen exactamente la distancia de muro que usa la física (`Trackside`).
 */

import {
  BoxGeometry,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addMesh, type BuildContext } from './context';
import { buildRibbon, mirrorLeftSideUV, fullLap, spansWhere, type ProfilePoint } from './ribbon';
import { createFence, createTyreWall, createWall } from './textures';

const WALL_HEIGHT = 1.05;
const WALL_THICKNESS = 0.4;
const FENCE_HEIGHT = 3.2;
const POST_SPACING = 4;
/** Cuánto se inclina el alambrado hacia la pista en toda su altura (m). */
const FENCE_LEAN = 0.6;

export function buildWalls(ctx: BuildContext): void {
  const g = ctx.track.geometry;
  const t = ctx.track.trackside;
  const faces = { concrete: [] as BufferGeometry[], tyres: [] as BufferGeometry[] };
  const caps: BufferGeometry[] = [];

  for (const side of ['left', 'right'] as const) {
    const walls = side === 'left' ? t.wallLeft : t.wallRight;
    const runoff = side === 'left' ? t.runoffLeft : t.runoffRight;
    const sign = side === 'left' ? -1 : 1;
    // Cara interior (mira a la pista): se divide según haya grava (neumáticos) o no.
    for (const tyres of [false, true]) {
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
        (tyres ? faces.tyres : faces.concrete).push(face);
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
  const tyres = mergeGeometries(faces.tyres);
  const top = mergeGeometries(caps);
  for (const piece of [...faces.concrete, ...faces.tyres, ...caps]) piece.dispose();
  if (concrete) {
    const texture = ctx.own.own(createWall(ctx.anisotropy));
    addMesh(ctx, concrete, new MeshStandardMaterial({ map: texture, roughness: 0.8 }), { cast: true, name: 'muros' });
  }
  if (tyres) {
    const texture = ctx.own.own(createTyreWall(ctx.anisotropy));
    addMesh(ctx, tyres, new MeshStandardMaterial({ map: texture, roughness: 0.9 }), { cast: true, name: 'neumáticos' });
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
