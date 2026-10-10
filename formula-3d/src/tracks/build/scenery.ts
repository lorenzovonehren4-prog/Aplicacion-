/**
 * Escenario alrededor del circuito: lago con ondas, árboles instanciados
 * (tres especies, en `trees.ts`), tribunas con público, pórtico de largada con semáforo,
 * edificio de boxes, carteles de distancia de frenada y la silueta de la
 * ciudad a lo lejos.
 */

import {
  BoxGeometry,
  CanvasTexture,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
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
  type Texture,
} from 'three';
import { TEAMS } from '../../data/teams';
import { PIT_LIGHT, type PitLane } from '../PitLane';
import type { TrackGeometry } from '../TrackGeometry';
import { DISTANT_LAYER, addChunkedInstances, addChunkedLodInstances, addMerged, addMesh, mergeAll, type BuildContext, type InstanceItem } from './context';
import { buildRibbon, mirrorLeftSideUV, type ProfilePoint } from './ribbon';
import { createDistanceBoards, createLeafAtlas, createSpectator, createWaterNormals, createWindows } from './textures';
import { createTreeDepthMaterial, createTreeMaterial, treeSpecies } from './trees';

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

/** Tamaño de las celdas en que se agrupan árboles y público (m). */
const TREE_CELL = 200;
/**
 * Distancia (m, desde el centro de cada celda de árboles) a la que se pasa al
 * detalle medio. Con celdas de 200 m, todo árbol a menos de ~240 m de la
 * cámara se dibuja con el detalle completo.
 */
const TREE_LOD_DISTANCES = [0, 380] as const;
/**
 * Desde esta distancia (m, de la cámara a cada árbol) va el bulto lejano. Los
 * lejanos son la mayoría de los que se ven y cada uno es casi nada: en celdas
 * de 200 m costaban ~120 llamadas de dibujo por cuadro (casi todo preparar
 * cada llamada). Van aparte, en celdas grandes de `TREE_FAR_CELL`.
 */
const TREE_FAR_START = 700;
const TREE_FAR_CELL = 800;
const CROWD_CELL = 120;

export interface KeepOut {
  /** ¿Se puede poner algo en (x, z)? */
  (x: number, z: number): boolean;
}

export function buildTrees(ctx: BuildContext, allowed: KeepOut): void {
  const g = ctx.track.geometry;
  // Tres niveles de detalle por distancia (siempre la calidad más alta de cerca).
  const near = treeSpecies('near');
  const mid = treeSpecies('mid');
  const far = treeSpecies('far');
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

  const placements: InstanceItem[][] = [[], [], []];
  const projection = { index: -1, s: 0, d: 0 };
  const rng = ctx.rng;
  const white = new Color('#ffffff');
  for (let x = minX - reach; x < maxX + reach; x += cell) {
    for (let z = minZ - reach; z < maxZ + reach; z += cell) {
      const px = x + rng.range(0, cell);
      const pz = z + rng.range(0, cell);
      // Búsqueda completa: partir del árbol anterior puede dar un tramo de la
      // pista que no es el más cercano (trazados reales con tramos vecinos).
      g.project(px, pz, projection);
      const off = Math.abs(projection.d);
      // Más denso cerca de la pista, raleando hacia afuera.
      if (off > reach || rng.next() > 1 - off / (reach * 1.6)) continue;
      if (!allowed(px, pz)) continue;
      const kind = rng.next() < 0.5 ? 0 : rng.next() < 0.7 ? 1 : 2;
      const tint = new Color().setHSL(rng.range(-0.02, 0.03), rng.range(-0.05, 0.1), 1).multiplyScalar(rng.range(0.85, 1.12));
      const scale = rng.range(0.75, 1.25);
      placements[kind]?.push({
        x: px,
        y: -0.05,
        z: pz,
        yaw: rng.range(0, Math.PI * 2),
        sx: scale,
        sy: scale * rng.range(0.9, 1.1),
        sz: scale,
        color: white.clone().lerp(tint, 0.9),
      });
    }
  }

  // El viento avanza con el reloj del circuito.
  const time = { value: 0 };
  ctx.tickers.push((seconds) => (time.value = seconds));
  const atlas = ctx.own.own(createLeafAtlas(ctx.anisotropy));
  // Cerca y a media distancia, por celdas con nivel de detalle; lejos, en celdas grandes.
  // Cada material dibuja sólo los árboles de su lado de `TREE_FAR_START` (ver `createTreeMaterial`).
  const material = ctx.own.own(createTreeMaterial(time, atlas, 'near', TREE_FAR_START));
  const farMaterial = ctx.own.own(createTreeMaterial(time, atlas, 'far', TREE_FAR_START));
  const depthMaterial = ctx.detailShadows ? ctx.own.own(createTreeDepthMaterial(atlas)) : undefined;
  for (const geometry of [...near, ...mid, ...far]) ctx.own.own(geometry);
  for (let kind = 0; kind < 3; kind++) {
    const list = placements[kind] ?? [];
    const levels = [near[kind], mid[kind]];
    const distant = far[kind];
    if (list.length === 0 || !distant || levels.some((level) => !level)) continue;
    addChunkedLodInstances(
      ctx,
      levels.map((geometry, i) => ({ geometry: geometry as BufferGeometry, distance: TREE_LOD_DISTANCES[i] ?? 0 })),
      material,
      list,
      {
        cell: TREE_CELL,
        name: `arboles-${kind}`,
        cast: ctx.detailShadows,
        receive: false,
        until: TREE_FAR_START,
        ...(depthMaterial ? { depthMaterial } : {}),
      },
    );
    // A cientos de metros las sombras de los árboles ya no caen en el mapa de sombras (sigue al auto).
    addChunkedInstances(ctx, distant, farMaterial, list, {
      cell: TREE_FAR_CELL,
      name: `arboles-lejos-${kind}`,
      cast: false,
      receive: false,
      layer: DISTANT_LAYER,
    });
  }
}

// ─── Tribunas ────────────────────────────────────────────────────────────

// Asientos de colores oscuros y saturados: el público resalta encima.
const SEAT_COLORS: ReadonlyArray<readonly [number, number, number]> = [
  [0.1, 0.2, 0.45],
  [0.45, 0.07, 0.1],
  [0.2, 0.21, 0.24],
];
const CONCRETE: readonly [number, number, number] = [0.36, 0.37, 0.38];
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

  const standMerged = mergeAll(steps);
  const roofMerged = mergeAll(roofs);
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
    // El público se mueve: cada uno salta y se balancea con su propio ritmo (según dónde está).
    const time = { value: 0 };
    ctx.tickers.push((seconds) => (time.value = seconds));
    material.onBeforeCompile = (shader) => {
      shader.uniforms.crowdTime = time;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float crowdTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          #ifdef USE_INSTANCING
            vec3 seat = instanceMatrix[3].xyz;
            float phase = fract(sin(dot(seat.xz, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831;
            float rate = 2.2 + fract(phase * 3.7) * 2.5;
            // Algunos saltan, otros sólo se balancean.
            float jump = max(0.0, sin(crowdTime * rate + phase)) * step(0.55, fract(phase * 1.9));
            transformed.y += jump * 0.14;
            transformed.x += sin(crowdTime * 1.3 + phase) * 0.04 * position.y;
          #endif`,
        );
    };
    material.customProgramCacheKey = () => 'publico-animado';
    const items: InstanceItem[] = crowd.map((p) => {
      const scale = ctx.rng.range(0.9, 1.1);
      return { x: p.x, y: p.y, z: p.z, yaw: p.yaw, sx: scale, sy: scale, sz: scale, color: new Color(ctx.rng.pick(SHIRTS)) };
    });
    addChunkedInstances(ctx, person, material, items, { cell: CROWD_CELL, name: 'publico', cast: false, receive: true });
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

/** Fila de garajes abiertos: uno por box, centrado detrás de su lugar de parada. */
interface GarageRow {
  /** Tramo de la fila (s) y centro de cada garaje (s). */
  start: number;
  end: number;
  doors: number[];
  /** Medio ancho de cada puerta (m). */
  half: number;
}

function garageRow(pit: PitLane, g: TrackGeometry, from: number): GarageRow {
  const first = pit.boxes[0] ?? from;
  const last = pit.boxes[pit.boxes.length - 1] ?? from;
  const spacing = pit.boxes.length > 1 ? g.wrapS((pit.boxes[1] ?? first) - first) : 14;
  return {
    start: g.wrapS(first - spacing / 2),
    end: g.wrapS(last + spacing / 2),
    doors: [...pit.boxes],
    half: Math.min(4.8, spacing / 2 - 1.2),
  };
}

const rgb = (hex: string): readonly [number, number, number] => {
  const c = new Color(hex);
  return [c.r, c.g, c.b];
};

/** Geometría lista para fusionar: sin índices, sin UV y con color por vértice. */
function paintedPart(geometry: BufferGeometry, color?: readonly [number, number, number]): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  flat.deleteAttribute('uv');
  if (color || !flat.getAttribute('color')) {
    const [r, gr, b] = color ?? [1, 1, 1];
    const count = flat.getAttribute('position').count;
    const values = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) values.set([r, gr, b], i * 3);
    flat.setAttribute('color', new Float32BufferAttribute(values, 3));
  }
  if (!flat.getAttribute('normal')) flat.computeVertexNormals();
  return flat;
}

/**
 * Garajes abiertos de los equipos, uno detrás de cada box: puerta con el
 * cartel del color del equipo, piso, techo con luces, paredes, la franja
 * del equipo al fondo y pilas de gomas. Delante de cada uno, el pórtico del
 * semáforo de salida (las luces las prende el equipo de boxes).
 * Todo en dos mallas: piezas pintadas por vértice y las luces del techo.
 */
function buildGarages(ctx: BuildContext, facade: number, height: number, row: GarageRow, sign: 1 | -1): void {
  const track = ctx.track;
  const g = track.geometry;
  const pit = track.pitLane;
  const depth = 7;
  const door = 4.6;
  const parts: BufferGeometry[] = [];
  const lights: BufferGeometry[] = [];
  const grey = rgb('#c4c8ce');
  const pillar = rgb('#a9aeb6');
  const floor = rgb('#7d838c');
  const ceiling = rgb('#26282d');
  const back = rgb('#33363d');
  const trim = rgb('#eef0f2');
  const steel = rgb('#4a4e56');
  const rubber = rgb('#151619');
  const point = { x: 0, z: 0 };
  const tangent = { x: 0, z: 0 };
  /** Pared vertical a distancia `d` del centro, mirando a la pista (colores abajo y arriba). */
  const wall = (d: number, points: ReadonlyArray<readonly [number, readonly [number, number, number]]>): ProfilePoint[] =>
    sign > 0 ? points.map(([y, c]) => [d, y, c] as const) : [...points].reverse().map(([y, c]) => [-d, y, c] as const);
  /** Plano horizontal entre `d0` y `d1` a la altura `y`, mirando hacia arriba o hacia abajo. */
  const level = (d0: number, d1: number, y: number, c: readonly [number, number, number], up: boolean): ProfilePoint[] => {
    const a = sign * d0;
    const b = sign * d1;
    const [left, right] = a < b ? [a, b] : [b, a];
    return up
      ? [
          [left, y, c],
          [right, y, c],
        ]
      : [
          [right, y, c],
          [left, y, c],
        ];
  };
  const ribbon = (a: number, b: number, profile: ProfilePoint[], into = parts): void => {
    if (g.wrapS(b - a) < 0.05) return;
    into.push(paintedPart(buildRibbon(g, { from: a, to: b, step: 2, profile: () => profile, vLength: 10 })));
  };
  /** Pared de costado (cruza la calle) en `s`, con la cara hacia +s (`toward` 1) o −s (−1). */
  const crossWall = (s: number, d0: number, d1: number, y0: number, y1: number, toward: 1 | -1, c: readonly [number, number, number]): void => {
    const corners = [
      [d0, y0],
      [d1, y0],
      [d1, y1],
      [d0, y1],
    ].map(([d, y]) => {
      g.pointAt(s, sign * (d ?? 0), point, tangent);
      return new Vector3(point.x, y, point.z);
    });
    g.pointAt(s, sign * d0, point, tangent);
    const [A, B, C, D] = corners as [Vector3, Vector3, Vector3, Vector3];
    const normal = new Vector3().subVectors(B, A).cross(new Vector3().subVectors(C, A));
    const forward = normal.x * tangent.x + normal.z * tangent.z > 0 ? 1 : -1;
    const order = forward === toward ? [A, B, C, A, C, D] : [A, C, B, A, D, C];
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(order.flatMap((v) => [v.x, v.y, v.z]), 3));
    parts.push(paintedPart(geometry, c));
  };
  /** Una pieza (caja, cilindro) en (s, d) a la altura `y`, girada con la pista. */
  const placed = (geometry: BufferGeometry, s: number, d: number, y: number, c: readonly [number, number, number], yaw = 0): void => {
    g.pointAt(s, sign * d, point, tangent);
    geometry.rotateY(Math.atan2(tangent.x, tangent.z) + yaw);
    geometry.translate(point.x, y, point.z);
    parts.push(paintedPart(geometry, c));
  };

  // Frente: la franja de arriba a lo largo de toda la fila y los pilares entre puertas.
  ribbon(row.start, row.end, wall(facade, [
    [door, grey],
    [height, grey],
  ]));
  const edges = [row.start, ...row.doors.flatMap((s) => [g.wrapS(s - row.half), g.wrapS(s + row.half)]), row.end];
  for (let k = 0; k + 1 < edges.length; k += 2) {
    ribbon(edges[k] ?? 0, edges[k + 1] ?? 0, wall(facade, [
      [-0.05, pillar],
      [door, pillar],
    ]));
  }

  row.doors.forEach((center, index) => {
    const team = rgb(TEAMS[index]?.primary ?? '#6d6f75');
    const a = g.wrapS(center - row.half);
    const b = g.wrapS(center + row.half);
    // Cartel del equipo sobre la puerta, con un filete claro abajo.
    ribbon(a, b, wall(facade - 0.06, [
      [door, trim],
      [door + 0.14, trim],
      [door + 0.14, team],
      [door + 1.15, team],
    ]));
    // Adentro: piso, techo, fondo (franja del equipo abajo) y paredes de los costados.
    ribbon(a, b, level(facade, facade + depth, 0.015, floor, true));
    ribbon(a, b, level(facade, facade + depth, door, ceiling, false));
    ribbon(a, b, wall(facade + depth, [
      [0, team],
      [1.3, team],
      [1.3, back],
      [door, back],
    ]));
    crossWall(a, facade, facade + depth, 0, door, 1, back);
    crossWall(b, facade, facade + depth, 0, door, -1, back);
    // Luces del techo: dos tiras a lo ancho.
    for (const d of [facade + 1.8, facade + 4.8]) ribbon(g.wrapS(a + 0.8), g.wrapS(b - 0.8), level(d, d + 0.35, door - 0.03, [1, 1, 1], false), lights);
    // Pilas de gomas en los rincones del fondo.
    for (const s of [g.wrapS(a + 0.75), g.wrapS(b - 0.75)]) placed(new CylinderGeometry(0.36, 0.36, 1.25, 12), s, facade + depth - 0.75, 0.625, rubber);
    // Pórtico del semáforo: poste del lado del garaje y brazo sobre el auto; la caja de las luces.
    const s = g.wrapS(center + PIT_LIGHT.ahead);
    const post = pit.box + PIT_LIGHT.post;
    const tip = pit.box + PIT_LIGHT.out - 0.45;
    placed(new BoxGeometry(0.16, PIT_LIGHT.height + 0.12, 0.16), s, post, (PIT_LIGHT.height + 0.12) / 2, steel);
    placed(new BoxGeometry(post - tip, 0.12, 0.12), s, (post + tip) / 2, PIT_LIGHT.height + 0.06, steel);
    placed(new BoxGeometry(0.76, 0.3, 0.12), s, pit.box + PIT_LIGHT.out, PIT_LIGHT.height - 0.16, ceiling);
  });

  const merged = mergeAll(parts);
  for (const part of parts) part.dispose();
  if (merged) addMesh(ctx, merged, new MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }), { cast: true, name: 'boxes-garajes' });
  const glow = mergeAll(lights);
  for (const part of lights) part.dispose();
  if (glow) addMesh(ctx, glow, new MeshBasicMaterial({ color: '#f4f7ff' }), { name: 'boxes-garajes-luces' });
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
  const row = garageRow(track.pitLane, g, from);
  // Fachada con garajes cerrados (la textura) a los dos lados de la fila de garajes abiertos.
  const pieces: BufferGeometry[] = [];
  for (const [a, b] of [
    [from, row.start],
    [row.end, to],
  ] as const) {
    if (g.wrapS(b - a) < 1) continue;
    const piece = buildRibbon(g, {
      from: a,
      to: b,
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
    if (sign < 0) mirrorLeftSideUV(piece);
    pieces.push(piece);
  }
  const facade = mergeAll(pieces);
  for (const piece of pieces) piece.dispose();
  const texture = ctx.own.own(garageTexture(ctx.anisotropy));
  // En el mundo la fachada va a lo largo de V: se rota la textura.
  texture.rotation = Math.PI / 2;
  texture.center.set(0.5, 0.5);
  if (facade) addMesh(ctx, facade, new MeshStandardMaterial({ map: texture, roughness: 0.6 }), { cast: true, name: 'boxes-fachada' });
  buildGarages(ctx, inner, height, row, sign);
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
  const mergedBoards = mergeAll(boards);
  const mergedPosts = mergeAll(posts);
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

// ─── Edificios junto a la pista (circuitos urbanos) ─────────────────────

/** Edificio colocado (para que los árboles no caigan adentro). */
export interface Footprint {
  x: number;
  z: number;
  radius: number;
}

/**
 * Manzanas a ambos lados de un circuito urbano: bloques con ventanas detrás
 * de los muros (con una vereda de por medio), alineados con la calle, de
 * alturas variadas. Ninguno pisa la pista ni otro tramo del trazado, ni las
 * tribunas o los boxes (`zones`).
 */
export function buildCityBlocks(ctx: BuildContext, zones: readonly StandZone[]): Footprint[] {
  const track = ctx.track;
  if (track.def.scenery.street !== 'city') return [];
  const g = track.geometry;
  const t = track.trackside;
  const [minHeight, maxHeight] = track.def.scenery.buildingHeight ?? [14, 48];
  const rng = ctx.rng;
  const items: InstanceItem[] = [];
  const footprints: Footprint[] = [];
  const projection = { index: -1, s: 0, d: 0 };
  const point = { x: 0, z: 0 };
  const tangent = { x: 0, z: 0 };
  const tones = ['#d9d3c7', '#c9cdd3', '#e3dccf', '#b9c2cc', '#d6c9b5', '#a9b4bf'].map((hex) => new Color(hex));
  /** ¿El punto está lejos de cualquier tramo de pista (más allá de su muro)? */
  const clear = (x: number, z: number): boolean => {
    g.project(x, z, projection);
    const wall = (projection.d < 0 ? t.wallLeft : t.wallRight)[projection.index] ?? g.halfWidth + 3;
    return Math.abs(projection.d) > wall + 3;
  };
  for (const side of ['left', 'right'] as const) {
    const sign = side === 'left' ? -1 : 1;
    const walls = side === 'left' ? t.wallLeft : t.wallRight;
    const gaps = side === 'left' ? t.gapLeft : t.gapRight;
    for (let s = rng.range(0, 10); s < g.length; ) {
      const width = rng.range(16, 30);
      const center = s + width / 2;
      s += width + rng.range(1.5, 5);
      const i = g.indexAt(center);
      if (gaps[i] === 1) continue;
      if (zones.some((zone) => zone.side === side && track.inRange(center, zone.from - 15, zone.to + 15))) continue;
      const depth = rng.range(14, 26);
      const offset = (walls[i] ?? g.halfWidth + 3) + rng.range(5, 10) + depth / 2;
      g.pointAt(center, offset * sign, point, tangent);
      // Esquinas (y el centro) fuera de la pista: en las curvas cerradas o junto a otro tramo, no va.
      const ax = tangent.x * (width / 2);
      const az = tangent.z * (width / 2);
      const bx = -tangent.z * (depth / 2);
      const bz = tangent.x * (depth / 2);
      const corners: Array<[number, number]> = [
        [point.x, point.z],
        [point.x + ax + bx, point.z + az + bz],
        [point.x + ax - bx, point.z + az - bz],
        [point.x - ax + bx, point.z - az + bz],
        [point.x - ax - bx, point.z - az - bz],
      ];
      if (!corners.every(([x, z]) => clear(x, z))) continue;
      // Algunas torres más altas entre edificios bajos.
      const tall = rng.next() < 0.18;
      const height = tall ? rng.range(maxHeight * 0.8, maxHeight * 1.6) : rng.range(minHeight, maxHeight);
      items.push({
        x: point.x,
        y: -0.05,
        z: point.z,
        // El +X local a lo largo de la calle.
        yaw: Math.atan2(-tangent.z, tangent.x),
        sx: width,
        sy: height,
        sz: depth,
        color: (tones[Math.floor(rng.next() * tones.length)] ?? new Color('#d0d0d0')).clone(),
      });
      footprints.push({ x: point.x, z: point.z, radius: Math.hypot(width, depth) / 2 });
    }
  }
  if (items.length === 0) return footprints;
  const box = ctx.own.own(new BoxGeometry(1, 1, 1));
  box.translate(0, 0.5, 0);
  const texture = ctx.own.own(createWindows(ctx.anisotropy));
  const material = ctx.own.own(
    new MeshStandardMaterial({ map: texture, roughness: 0.55, metalness: 0.25, emissive: '#2a2418', emissiveIntensity: 0.35 }),
  );
  addChunkedInstances(ctx, box, material, items, { cell: 220, name: 'edificios', cast: ctx.detailShadows, receive: true });
  return footprints;
}

// ─── Puentes sobre la pista ─────────────────────────────────────────────

/** Altura libre bajo el puente del peraltado (m). */
const BANKING_CLEARANCE = 7.2;
/** Ancho de la calzada del óvalo, peralte (rad) y ángulo con la pista (rad). */
const BANKING_WIDTH = 16;
const BANKING_TILT = 0.2;
const BANKING_SKEW = 0.35;

/**
 * Tramo del viejo óvalo peraltado cruzando por encima de la pista: calzada de
 * hormigón inclinada, borde con baranda, pilares fuera de los muros y el
 * nombre pintado en el costado. Devuelve las zonas ocupadas (para los árboles).
 */
export function buildBridges(ctx: BuildContext): StandZone[] {
  const bridges = ctx.track.def.scenery.bridges ?? [];
  if (bridges.length === 0) return [];
  const track = ctx.track;
  const g = track.geometry;
  const zones: StandZone[] = [];
  const concrete = ctx.own.own(new MeshStandardMaterial({ color: '#b9b4aa', roughness: 0.92, metalness: 0 }));
  const deckDark = ctx.own.own(new MeshStandardMaterial({ color: '#6f6b64', roughness: 0.95, metalness: 0 }));
  const rail = ctx.own.own(new MeshStandardMaterial({ color: '#dfe2e6', roughness: 0.5, metalness: 0.6 }));
  const point = { x: 0, z: 0 };
  const tangent = { x: 0, z: 0 };
  for (const bridge of bridges) {
    const s = g.designToS(bridge.at);
    g.pointAt(s, 0, point, tangent);
    const index = g.indexAt(s);
    const wall = Math.max(track.trackside.wallLeft[index] ?? 12, track.trackside.wallRight[index] ?? 12);
    const span = (wall + 14) * 2;
    const group = new Object3D();
    group.position.set(point.x, 0, point.z);
    group.rotation.y = Math.atan2(-tangent.x, -tangent.z) + BANKING_SKEW;

    // Calzada: losa peraltada (sube hacia afuera del óvalo) sobre una viga.
    const deck = new Object3D();
    deck.position.y = BANKING_CLEARANCE;
    deck.rotation.x = BANKING_TILT;
    const slab = new Mesh(ctx.own.own(new BoxGeometry(span, 0.5, BANKING_WIDTH)), concrete);
    slab.position.y = 0.9;
    const beam = new Mesh(ctx.own.own(new BoxGeometry(span, 1.2, BANKING_WIDTH * 0.8)), deckDark);
    for (const mesh of [slab, beam]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      deck.add(mesh);
    }
    // Barandas en los dos bordes de la calzada.
    const railGeometry = ctx.own.own(new BoxGeometry(span, 0.12, 0.12));
    for (const z of [-BANKING_WIDTH / 2 + 0.2, BANKING_WIDTH / 2 - 0.2]) {
      for (const y of [1.6, 2.1]) {
        const bar = new Mesh(railGeometry, rail);
        bar.position.set(0, y, z);
        deck.add(bar);
      }
    }
    // Nombre pintado en el frente que ven los autos que llegan.
    const label = ctx.own.own(bannerTexture(bridge.name.toUpperCase(), track.def.name, ctx.anisotropy));
    const sign = new Mesh(ctx.own.own(new PlaneGeometry(26, 26 / 8)), ctx.own.own(new MeshStandardMaterial({ map: label, roughness: 0.8 })));
    sign.position.set(0, 0.2, BANKING_WIDTH * 0.4 + 0.02);
    deck.add(sign);
    group.add(deck);

    // Pilares: dos filas a cada lado, fuera de los muros.
    const pillarGeometry = ctx.own.own(new BoxGeometry(1.6, BANKING_CLEARANCE + 1, 1.6));
    pillarGeometry.translate(0, (BANKING_CLEARANCE + 1) / 2, 0);
    for (const x of [-(wall + 4), wall + 4, -(wall + 12), wall + 12]) {
      for (const z of [-BANKING_WIDTH * 0.3, BANKING_WIDTH * 0.3]) {
        const pillar = new Mesh(pillarGeometry, concrete);
        pillar.position.set(x, 0, z);
        pillar.castShadow = true;
        group.add(pillar);
      }
    }
    addMerged(ctx, group, 'puente');
    // Sin árboles bajo el puente ni junto a los pilares.
    const reach = BANKING_WIDTH / 2 + span * Math.sin(BANKING_SKEW) * 0.5 + 6;
    for (const side of ['left', 'right'] as const) {
      zones.push({ side, from: g.wrapS(s - reach), to: g.wrapS(s + reach), outer: span / 2 + 4 });
    }
  }
  return zones;
}
