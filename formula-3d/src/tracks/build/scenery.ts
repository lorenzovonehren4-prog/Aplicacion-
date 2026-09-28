/**
 * Escenario alrededor del circuito: lago con ondas, árboles instanciados
 * (tres especies), tribunas con público, pórtico de largada con semáforo,
 * edificio de boxes, carteles de distancia de frenada y la silueta de la
 * ciudad a lo lejos.
 */

import {
  BoxGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  RepeatWrapping,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Texture,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addMesh, type BuildContext } from './context';
import { buildRibbon, mirrorLeftSideUV, type ProfilePoint } from './ribbon';
import { createDistanceBoards, createSpectator, createWaterNormals, createWindows } from './textures';

// ─── Lago ────────────────────────────────────────────────────────────────

export interface LakeInfo {
  /** Polígono del lago en el mundo (para no poner árboles adentro). */
  polygon: Array<[number, number]>;
  normals: Texture;
}

export function buildLake(ctx: BuildContext): LakeInfo | null {
  const outline = ctx.track.def.scenery.lake;
  if (!outline || outline.length < 3) return null;
  const scale = ctx.track.geometry.designScale;
  const curve = new CatmullRomCurve3(
    outline.map(([x, z]) => new Vector3(x * scale, 0, z * scale)),
    true,
    'centripetal',
  );
  const polygon: Array<[number, number]> = curve.getSpacedPoints(160).slice(0, -1).map((p) => [p.x, p.z]);

  // Orilla: el mismo contorno agrandado unos metros.
  let cx = 0;
  let cz = 0;
  for (const [x, z] of polygon) {
    cx += x;
    cz += z;
  }
  cx /= polygon.length;
  cz /= polygon.length;
  const grown = (margin: number): Shape =>
    new Shape(
      polygon.map(([x, z]) => {
        const dx = x - cx;
        const dz = z - cz;
        const len = Math.hypot(dx, dz) || 1;
        // Shape en (x, −z): al rotar −90° en X queda en el plano del suelo.
        return new Vector2(x + (dx / len) * margin, -(z + (dz / len) * margin));
      }),
    );

  const shore = new ShapeGeometry(grown(9), 4);
  shore.rotateX(-Math.PI / 2);
  shore.translate(0, -0.03, 0);
  // polygonOffset: a la distancia la precisión de profundidad no alcanza para
  // separar capas casi coplanares (suelo, orilla, agua) y parpadearían.
  addMesh(
    ctx,
    shore,
    new MeshStandardMaterial({ color: '#6b6448', roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    { name: 'orilla' },
  );

  const water = new ShapeGeometry(grown(0), 4);
  water.rotateX(-Math.PI / 2);
  water.translate(0, -0.01, 0);
  // UV en metros para las ondas.
  const position = water.getAttribute('position');
  const uv: number[] = [];
  for (let i = 0; i < position.count; i++) uv.push(position.getX(i) / 14, position.getZ(i) / 14);
  water.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  const normals = ctx.own.own(createWaterNormals(ctx.anisotropy));
  addMesh(
    ctx,
    water,
    new MeshPhysicalMaterial({
      color: '#1b4656',
      roughness: 0.06,
      metalness: 0,
      normalMap: normals,
      normalScale: new Vector2(0.35, 0.35),
      clearcoat: 0.6,
      envMapIntensity: 1.1,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    }),
    { name: 'lago', receive: false },
  );
  return { polygon, normals };
}

export function insidePolygon(x: number, z: number, polygon: ReadonlyArray<readonly [number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (!a || !b) continue;
    if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

// ─── Árboles ─────────────────────────────────────────────────────────────

function colorize(geometry: BufferGeometry, color: Color, variation: number, seed: number): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  const colors: number[] = [];
  const count = flat.getAttribute('position').count;
  let s = seed;
  for (let i = 0; i < count; i++) {
    // Variación por triángulo (facetado natural).
    if (i % 3 === 0) s = (s * 16807) % 2147483647;
    const k = 1 + ((s / 2147483647) - 0.5) * variation;
    colors.push(color.r * k, color.g * k, color.b * k);
  }
  flat.setAttribute('color', new Float32BufferAttribute(colors, 3));
  flat.deleteAttribute('uv');
  if (flat !== geometry) geometry.dispose();
  return flat;
}

/** Tres especies: eucalipto alto y ralo, árbol de copa redonda y ciprés. */
function treeSpecies(): BufferGeometry[] {
  const trunkColor = new Color('#8f8574');
  const darkTrunk = new Color('#5b4636');

  const eucalyptus: BufferGeometry[] = [colorize(new CylinderGeometry(0.22, 0.4, 9, 6).translate(0, 4.5, 0), trunkColor, 0.2, 3)];
  const blobs: Array<[number, number, number, number]> = [
    [0, 10.5, 0, 3.4],
    [2.2, 9, 0.8, 2.6],
    [-1.8, 8.6, -1.2, 2.4],
    [0.6, 12.4, -0.6, 2.2],
  ];
  blobs.forEach(([x, y, z, r], i) =>
    eucalyptus.push(colorize(new IcosahedronGeometry(r, 1).translate(x, y, z), new Color('#5d7a3e'), 0.35, 11 + i)),
  );

  const round: BufferGeometry[] = [colorize(new CylinderGeometry(0.25, 0.35, 4, 6).translate(0, 2, 0), darkTrunk, 0.2, 5)];
  round.push(colorize(new IcosahedronGeometry(3.6, 1).scale(1, 0.85, 1).translate(0, 6.2, 0), new Color('#3f6b2c'), 0.35, 21));
  round.push(colorize(new IcosahedronGeometry(2.4, 1).translate(1.6, 7.4, 0.5), new Color('#4a7a33'), 0.3, 23));

  const cypress: BufferGeometry[] = [colorize(new CylinderGeometry(0.18, 0.25, 2, 5).translate(0, 1, 0), darkTrunk, 0.2, 7)];
  cypress.push(colorize(new ConeGeometry(1.8, 11, 7, 2).translate(0, 7, 0), new Color('#2e5227'), 0.3, 31));

  return [eucalyptus, round, cypress].map((parts) => {
    const merged = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    if (!merged) throw new Error('No se pudo armar la geometría de un árbol.');
    merged.computeVertexNormals();
    return merged;
  });
}

export interface KeepOut {
  /** ¿Se puede poner algo en (x, z)? */
  (x: number, z: number): boolean;
}

export function buildTrees(ctx: BuildContext, allowed: KeepOut): void {
  const g = ctx.track.geometry;
  const species = treeSpecies();
  const perHectare = ctx.track.def.scenery.treeDensity * 0.55 * ctx.density;
  const cell = Math.sqrt(10000 / Math.max(0.5, perHectare));
  const reach = 420;

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < g.count; i += 10) {
    minX = Math.min(minX, g.x[i] ?? 0);
    maxX = Math.max(maxX, g.x[i] ?? 0);
    minZ = Math.min(minZ, g.z[i] ?? 0);
    maxZ = Math.max(maxZ, g.z[i] ?? 0);
  }

  const placements: Array<Array<{ x: number; z: number; scale: number; rot: number; tint: Color }>> = [[], [], []];
  const projection = { index: -1, s: 0, d: 0 };
  const rng = ctx.rng;
  for (let x = minX - reach; x < maxX + reach; x += cell) {
    for (let z = minZ - reach; z < maxZ + reach; z += cell) {
      const px = x + rng.range(0, cell);
      const pz = z + rng.range(0, cell);
      g.project(px, pz, projection, projection.index);
      const off = Math.abs(projection.d);
      // Más denso cerca de la pista, raleando hacia afuera.
      if (off > reach || rng.next() > 1 - off / (reach * 1.6)) continue;
      if (!allowed(px, pz)) continue;
      const kind = rng.next() < 0.5 ? 0 : rng.next() < 0.7 ? 1 : 2;
      const tint = new Color().setHSL(rng.range(-0.02, 0.03), rng.range(-0.05, 0.1), 1).multiplyScalar(rng.range(0.85, 1.12));
      placements[kind]?.push({ x: px, z: pz, scale: rng.range(0.75, 1.25), rot: rng.range(0, Math.PI * 2), tint });
    }
  }

  const material = ctx.own.own(new MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: false }));
  const matrix = new Matrix4();
  const q = new Quaternion();
  const up = new Vector3(0, 1, 0);
  species.forEach((geometry, kind) => {
    ctx.own.own(geometry);
    const list = placements[kind] ?? [];
    if (list.length === 0) return;
    const mesh = new InstancedMesh(geometry, material, list.length);
    list.forEach((tree, i) => {
      q.setFromAxisAngle(up, tree.rot);
      matrix.compose(new Vector3(tree.x, -0.05, tree.z), q, new Vector3(tree.scale, tree.scale * (0.9 + (i % 5) * 0.05), tree.scale));
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, new Color('#ffffff').lerp(tree.tint, 0.9));
    });
    mesh.castShadow = ctx.detailShadows;
    mesh.receiveShadow = false;
    mesh.name = `arboles-${kind}`;
    mesh.computeBoundingSphere();
    ctx.root.add(mesh);
  });
}

// ─── Tribunas ────────────────────────────────────────────────────────────

const SEAT_COLORS: ReadonlyArray<readonly [number, number, number]> = [
  [0.12, 0.26, 0.55],
  [0.55, 0.08, 0.12],
  [0.85, 0.85, 0.82],
];
const CONCRETE: readonly [number, number, number] = [0.62, 0.62, 0.6];
const SHIRTS = ['#d6202a', '#f2f2ee', '#1f4e9c', '#ffd21f', '#1b7f4b', '#111317', '#ff7a1a', '#7fc2ff', '#e86fb0', '#6d6f75'];

export interface StandZone {
  side: 'left' | 'right';
  from: number;
  to: number;
  /** Distancia máxima desde el centro de la pista que ocupa la construcción (m). */
  outer: number;
}

export function buildGrandstands(ctx: BuildContext): StandZone[] {
  const track = ctx.track;
  const g = track.geometry;
  const zones: StandZone[] = [];
  const steps: BufferGeometry[] = [];
  const roofs: BufferGeometry[] = [];
  const crowd: Array<{ x: number; y: number; z: number; yaw: number }> = [];
  const point = { x: 0, z: 0 };
  const tangent = { x: 0, z: 0 };
  const rowDepth = 0.85;
  const rowRise = 0.42;

  track.def.scenery.grandstands.forEach((stand, standIndex) => {
    const center = g.designToS(stand.at);
    const from = g.wrapS(center - stand.length / 2);
    const to = g.wrapS(center + stand.length / 2);
    const sign = stand.side === 'left' ? -1 : 1;
    const walls = sign < 0 ? track.trackside.wallLeft : track.trackside.wallRight;
    let maxWall = 0;
    for (let s = 0; s <= stand.length; s += 2) maxWall = Math.max(maxWall, walls[g.indexAt(from + s)] ?? 10);
    const inner = maxWall + 3.5;
    const outer = inner + stand.rows * rowDepth;
    const top = 0.6 + stand.rows * rowRise;
    zones.push({ side: stand.side, from, to, outer });
    const seat = SEAT_COLORS[standIndex % SEAT_COLORS.length] ?? SEAT_COLORS[0];

    // Perfil escalonado (de afuera hacia la pista en d creciente).
    const profile: ProfilePoint[] = [];
    for (let r = 0; r < stand.rows; r++) {
      const d0 = inner + r * rowDepth;
      const y = 0.6 + r * rowRise;
      profile.push([d0, y - rowRise, CONCRETE], [d0, y, CONCRETE], [d0, y, seat], [d0 + rowDepth, y, seat]);
    }
    profile.push([outer, top, CONCRETE], [outer, -0.05, CONCRETE]);
    const oriented: ProfilePoint[] = sign > 0 ? profile : profile.map(([d, y, c]): ProfilePoint => [-d, y, c]).reverse();
    steps.push(buildRibbon(g, { from, to, step: 3, profile: () => oriented, vLength: 10 }));

    roofs.push(
      buildRibbon(g, {
        from,
        to,
        step: 3,
        profile: (): ProfilePoint[] => {
          const a: ProfilePoint = [(inner - 1.5) * sign, top + 2.6];
          const b: ProfilePoint = [(outer + 1) * sign, top + 3.6];
          return sign > 0 ? [a, b] : [b, a];
        },
        vLength: 10,
      }),
    );

    // Público: uno cada ~0,6 m por fila, con asientos vacíos al azar.
    const spacing = 0.62 / Math.max(0.35, ctx.density);
    for (let s = 1; s < stand.length - 1; s += spacing) {
      for (let r = 0; r < stand.rows; r++) {
        if (ctx.rng.next() < 0.14) continue;
        const d = (inner + r * rowDepth + rowDepth * 0.45) * sign;
        g.pointAt(from + s + ctx.rng.range(-0.15, 0.15), d, point, tangent);
        // Mirando a la pista.
        const yaw = Math.atan2(-tangent.z * sign, tangent.x * sign) + Math.PI / 2;
        crowd.push({ x: point.x, y: 0.6 + r * rowRise + 0.02, z: point.z, yaw });
      }
    }
  });

  const standMerged = mergeGeometries(steps);
  const roofMerged = mergeGeometries(roofs);
  for (const piece of [...steps, ...roofs]) piece.dispose();
  if (standMerged) {
    addMesh(ctx, standMerged, new MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }), {
      cast: ctx.detailShadows,
      name: 'tribunas',
    });
  }
  if (roofMerged) {
    addMesh(ctx, roofMerged, new MeshStandardMaterial({ color: '#d9dcdf', roughness: 0.5, metalness: 0.3, side: DoubleSide }), {
      cast: true,
      name: 'techos',
    });
  }

  if (crowd.length > 0) {
    const person = ctx.own.own(new PlaneGeometry(0.5, 0.95));
    person.translate(0, 0.47, 0);
    const texture = ctx.own.own(createSpectator(ctx.anisotropy));
    const material = ctx.own.own(new MeshStandardMaterial({ map: texture, alphaTest: 0.5, roughness: 0.9, side: DoubleSide }));
    const mesh = new InstancedMesh(person, material, crowd.length);
    const matrix = new Matrix4();
    const q = new Quaternion();
    const up = new Vector3(0, 1, 0);
    const color = new Color();
    crowd.forEach((p, i) => {
      q.setFromAxisAngle(up, p.yaw);
      const scale = ctx.rng.range(0.9, 1.1);
      matrix.compose(new Vector3(p.x, p.y, p.z), q, new Vector3(scale, scale, scale));
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, color.set(ctx.rng.pick(SHIRTS)));
    });
    mesh.receiveShadow = true;
    mesh.name = 'publico';
    mesh.computeBoundingSphere();
    ctx.root.add(mesh);
  }
  return zones;
}

// ─── Pórtico de largada ──────────────────────────────────────────────────

export interface StartGantry {
  /** 5 columnas × 2 luces rojas (las enciende el semáforo de la Fase 3). */
  lights: MeshStandardMaterial[];
}

function bannerTexture(title: string, subtitle: string, anisotropy: number): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el cartel del pórtico.');
  const gradient = ctx.createLinearGradient(0, 0, 1024, 0);
  gradient.addColorStop(0, '#111317');
  gradient.addColorStop(0.5, '#1b1e25');
  gradient.addColorStop(1, '#111317');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 128);
  ctx.fillStyle = '#c8102e';
  ctx.fillRect(0, 108, 1024, 20);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic 900 64px "Titillium Web", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 512, 50, 960);
  ctx.font = '700 26px "Titillium Web", system-ui, sans-serif';
  ctx.fillStyle = '#b3b7c2';
  ctx.fillText(subtitle, 512, 96);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

export function buildGantry(ctx: BuildContext): StartGantry {
  const track = ctx.track;
  const g = track.geometry;
  const hw = g.halfWidth;
  const point = { x: 0, z: 0 };
  const tangent = { x: 0, z: 0 };
  g.pointAt(track.startS, 0, point, tangent);
  const group = new Object3D();
  group.position.set(point.x, 0, point.z);
  group.rotation.y = Math.atan2(-tangent.x, -tangent.z);

  const metal = ctx.own.own(new MeshStandardMaterial({ color: '#2b2e34', metalness: 0.8, roughness: 0.35 }));
  const span = hw * 2 + 6;
  const pillar = ctx.own.own(new BoxGeometry(0.9, 9, 0.9));
  pillar.translate(0, 4.5, 0);
  for (const x of [-span / 2, span / 2]) {
    const mesh = new Mesh(pillar, metal);
    mesh.position.x = x;
    mesh.castShadow = true;
    group.add(mesh);
  }
  const beam = new Mesh(ctx.own.own(new BoxGeometry(span, 1.9, 0.8)), metal);
  beam.position.y = 8.2;
  beam.castShadow = true;
  group.add(beam);

  // Cartel frente a los pilotos (mira a −Z local = hacia los autos que llegan).
  const def = track.def;
  const banner = ctx.own.own(bannerTexture(def.grandPrix.toUpperCase(), `${def.name} · ${def.city}`, ctx.anisotropy));
  const bannerMesh = new Mesh(
    ctx.own.own(new PlaneGeometry(span - 0.4, (span - 0.4) / 8)),
    ctx.own.own(new MeshStandardMaterial({ map: banner, roughness: 0.6 })),
  );
  bannerMesh.position.set(0, 8.2, 0.41);
  group.add(bannerMesh);

  // Semáforo: 5 columnas de 2 luces sobre el pórtico, mirando a la parrilla (+Z local).
  const lights: MeshStandardMaterial[] = [];
  const housing = ctx.own.own(new BoxGeometry(0.62, 1.5, 0.35));
  const lamp = ctx.own.own(new SphereGeometry(0.2, 16, 12));
  for (let c = 0; c < 5; c++) {
    const x = (c - 2) * 0.9;
    const box = new Mesh(housing, metal);
    box.position.set(x, 6.4, 0.45);
    group.add(box);
    const material = ctx.own.own(new MeshStandardMaterial({ color: '#2a0508', emissive: '#ff1426', emissiveIntensity: 0, roughness: 0.3 }));
    lights.push(material);
    for (const y of [6.72, 6.1]) {
      const bulb = new Mesh(lamp, material);
      bulb.position.set(x, y, 0.65);
      group.add(bulb);
    }
  }
  group.updateMatrixWorld(true);
  ctx.root.add(group);
  return { lights };
}

// ─── Boxes ───────────────────────────────────────────────────────────────

function garageTexture(anisotropy: number): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear la fachada de boxes.');
  ctx.fillStyle = '#d7d9dc';
  ctx.fillRect(0, 0, 2048, 128);
  const teams = ['#c8102e', '#0f3d91', '#1b7f4b', '#f4c20d', '#4b1f8f', '#ff7a1a', '#111317', '#0b8fb3', '#e86fb0', '#6d6f75'];
  for (let i = 0; i < 20; i++) {
    const x = i * 102.4;
    const color = teams[Math.floor(i / 2)] ?? '#333';
    ctx.fillStyle = '#23252a';
    ctx.fillRect(x + 8, 34, 86, 94);
    ctx.fillStyle = color;
    ctx.fillRect(x + 8, 8, 86, 20);
    for (let k = 0; k < 8; k++) {
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x + 8, 40 + k * 11, 86, 2);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = anisotropy;
  // La cinta usa V en metros desde el inicio de la pista: la fachada se repite.
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
}

export function buildPitBuilding(ctx: BuildContext, lane: { inner: number; outer: number }): StandZone {
  const track = ctx.track;
  const g = track.geometry;
  const sign = track.pits.side === 'left' ? -1 : 1;
  const from = g.wrapS(track.pits.from + 30);
  const to = g.wrapS(track.pits.to - 30);
  const inner = lane.outer + 0.5;
  const outer = inner + 16;
  const height = 8;
  const facade = buildRibbon(g, {
    from,
    to,
    step: 6,
    profile: (): ProfilePoint[] =>
      sign > 0
        ? [
            [inner, -0.05],
            [inner, height],
          ]
        : [
            [-inner, height],
            [-inner, -0.05],
          ],
    vLength: g.wrapS(to - from),
  });
  if (sign < 0) mirrorLeftSideUV(facade);
  const texture = ctx.own.own(garageTexture(ctx.anisotropy));
  // En el mundo la fachada va a lo largo de V: se rota la textura.
  texture.rotation = Math.PI / 2;
  texture.center.set(0.5, 0.5);
  addMesh(ctx, facade, new MeshStandardMaterial({ map: texture, roughness: 0.6 }), { cast: true, name: 'boxes-fachada' });
  const roof = buildRibbon(g, {
    from,
    to,
    step: 6,
    profile: (): ProfilePoint[] =>
      sign > 0
        ? [
            [inner - 2, height],
            [outer, height],
          ]
        : [
            [-outer, height],
            [-inner + 2, height],
          ],
    vLength: 20,
  });
  addMesh(ctx, roof, new MeshStandardMaterial({ color: '#b9bec4', roughness: 0.5, metalness: 0.4, side: DoubleSide }), {
    cast: true,
    name: 'boxes-techo',
  });
  return { side: track.pits.side, from: g.wrapS(from - 40), to: g.wrapS(to + 40), outer: outer + 4 };
}

// ─── Carteles de frenada ─────────────────────────────────────────────────

export function buildDistanceBoards(ctx: BuildContext): void {
  const track = ctx.track;
  const g = track.geometry;
  const hw = g.halfWidth;
  const boards: BufferGeometry[] = [];
  const posts: BufferGeometry[] = [];
  const point = { x: 0, z: 0 };
  const tangent = { x: 0, z: 0 };
  for (const corner of track.analysis.corners) {
    if (corner.brakingPoint === null || corner.entrySpeed - corner.safeSpeed < 18) continue;
    const sign = corner.direction === 'right' ? -1 : 1;
    [150, 100, 50].forEach((distance, k) => {
      const s = g.wrapS(corner.start - distance);
      const kerb = (sign < 0 ? track.trackside.kerbLeft : track.trackside.kerbRight)[g.indexAt(s)] ?? 0;
      g.pointAt(s, (hw + kerb + 3.2) * sign, point, tangent);
      const yaw = Math.atan2(-tangent.x, -tangent.z);
      const board = new PlaneGeometry(1.5, 1.5);
      // UV del atlas: tres carteles lado a lado.
      const uv = board.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) uv.setX(i, (k + uv.getX(i)) / 3);
      // El cartel mira hacia los autos que llegan (+Z local = hacia atrás en la pista).
      board.rotateY(yaw);
      board.translate(point.x, 2.1, point.z);
      boards.push(board);
      const post = new BoxGeometry(0.1, 1.5, 0.1);
      post.translate(point.x, 0.75, point.z);
      posts.push(post);
    });
  }
  const mergedBoards = mergeGeometries(boards);
  const mergedPosts = mergeGeometries(posts);
  for (const piece of [...boards, ...posts]) piece.dispose();
  if (mergedBoards) {
    const texture = ctx.own.own(createDistanceBoards(ctx.anisotropy));
    addMesh(ctx, mergedBoards, new MeshStandardMaterial({ map: texture, roughness: 0.6, side: DoubleSide }), {
      cast: true,
      name: 'carteles',
    });
  }
  if (mergedPosts) addMesh(ctx, mergedPosts, new MeshStandardMaterial({ color: '#50555c', roughness: 0.5 }), { name: 'postes' });
}

// ─── Ciudad a lo lejos ───────────────────────────────────────────────────

export function buildSkyline(ctx: BuildContext): void {
  const skyline = ctx.track.def.scenery.skyline;
  if (!skyline) return;
  const g = ctx.track.geometry;
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < g.count; i += 20) {
    cx += g.x[i] ?? 0;
    cz += g.z[i] ?? 0;
  }
  const samples = Math.ceil(g.count / 20);
  cx /= samples;
  cz /= samples;
  const bearing = (skyline.bearing * Math.PI) / 180;
  const distance = skyline.distance * g.designScale;
  const centerX = cx + Math.sin(bearing) * distance;
  const centerZ = cz - Math.cos(bearing) * distance;

  const box = ctx.own.own(new BoxGeometry(1, 1, 1));
  box.translate(0, 0.5, 0);
  const texture = ctx.own.own(createWindows(ctx.anisotropy));
  const material = ctx.own.own(
    new MeshStandardMaterial({ map: texture, color: '#c4cfdc', roughness: 0.35, metalness: 0.5, emissive: '#1a2230', emissiveIntensity: 0.4 }),
  );
  const mesh = new InstancedMesh(box, material, skyline.buildings);
  const matrix = new Matrix4();
  const q = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const rng = ctx.rng;
  for (let i = 0; i < skyline.buildings; i++) {
    // Más altos en el centro (distrito financiero).
    const spread = rng.range(-1, 1);
    const along = spread * 900;
    const depth = rng.range(-350, 350);
    const x = centerX + Math.cos(bearing) * along + Math.sin(bearing) * depth;
    const z = centerZ + Math.sin(bearing) * along - Math.cos(bearing) * depth;
    const height = rng.range(35, 90) + (1 - Math.abs(spread)) ** 2 * rng.range(60, 220);
    const width = rng.range(22, 55);
    q.setFromAxisAngle(up, bearing + rng.range(-0.15, 0.15));
    matrix.compose(new Vector3(x, 0, z), q, new Vector3(width, height, rng.range(22, 50)));
    mesh.setMatrixAt(i, matrix);
  }
  mesh.name = 'ciudad';
  mesh.computeBoundingSphere();
  ctx.root.add(mesh);
}
