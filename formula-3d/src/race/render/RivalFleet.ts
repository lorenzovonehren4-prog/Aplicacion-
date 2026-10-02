/**
 * Autos rivales, dibujados en lote (PLAN.md §5.5, rendimiento).
 *
 * Con 19 rivales, el monoplaza del jugador (≈ 40 000 triángulos y 36 mallas
 * con materiales físicos) sería inviable. Los rivales usan el MISMO modelo
 * procedural, generado con menos detalle y convertido en mallas instanciadas:
 *
 * - Cerca (hasta `lod.nearDistance` y los `lod.maxNear` más próximos): carrocería,
 *   flap del DRS, números, neumáticos y tapas de llanta — 5 llamadas de
 *   dibujo para todos juntos, con ruedas que giran y doblan.
 * - Lejos: una versión muy liviana con todo fusionado — 1 llamada de dibujo.
 *
 * Los colores de cada equipo van por instancia: la carrocería lleva una
 * textura "máscara" (rojo = color principal, verde = secundario, azul =
 * acento) dibujada con el mismo diseño que la livery del jugador, y el shader
 * mezcla los tres colores del equipo según esa máscara.
 */

import type {
  Mesh} from 'three';
import {
  BufferAttribute,
  CanvasTexture,
  Color,
  Euler,
  Float32BufferAttribute,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  NoColorSpace,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Material,
  type Object3D,
  type Texture,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Disposer } from '../../core/utils/Disposer';
import { clamp, damp } from '../../core/utils/math';
import { CAR_DIMENSIONS, CarModel } from '../../garage/CarModel';
import {
  createLiveryTexture,
  createSponsorSheet,
  createTireTexture,
  createWheelCoverTexture,
  TIRE_PROFILE_POINTS,
} from '../../garage/carTextures';
import type { LiveryConfig } from '../../garage/livery';
import type { Vehicle } from '../physics/Vehicle';
import type { CarShadows } from './CarShadow';

/**
 * Nivel de detalle (según la calidad gráfica): distancia (m) hasta la que un
 * rival se dibuja con el modelo cercano, cuántos a la vez y su detalle.
 */
export interface RivalLod {
  nearDistance: number;
  maxNear: number;
  nearDetail: number;
}
const DEFAULT_LOD: RivalLod = { nearDistance: 90, maxNear: 8, nearDetail: 0.36 };
/** Detalle de la geometría lejana (1 = auto del jugador). */
const FAR_DETAIL = 0.1;
/** Como en `CarRig`: el origen del modelo está 0,2 m delante del CG. */
const MODEL_OFFSET = 0.2;
const PITCH_PER_ACCEL = 0.0011;
const ROLL_PER_ACCEL = 0.0013;
/** Parpadeo de un auto "fantasma" (recién vuelto a la pista), en Hz. */
const GHOST_BLINK = 7;
/** Atlas de números: columnas × filas de celdas de `NUMBER_CELL` píxeles. */
const NUMBER_COLUMNS = 5;
const NUMBER_ROWS = 4;
const NUMBER_CELL = 192;
/** Atlas de logos de equipo: celdas de 512 × 128 (la proporción del logo del modelo). */
const WORD_COLUMNS = 2;
const WORD_ROWS = 10;
const WORD_CELL_W = 512;
const WORD_CELL_H = 128;

/** Livery "máscara": cada canal marca dónde va cada color del equipo. */
const MASK_LIVERY: LiveryConfig = { primary: '#ff0000', secondary: '#00ff00', accent: '#0000ff', number: 0, tireStripe: '#ff2a3c' };

type Zone = 'mask' | 'primary' | 'secondary' | 'accent' | 'none';

/** Cómo se pinta cada pieza del modelo en los rivales. */
const PART_STYLE: Readonly<Record<string, { zone: Zone; base?: string; roughness: number; metalness: number }>> = {
  livery: { zone: 'mask', roughness: 0.32, metalness: 0.2 },
  primary: { zone: 'primary', roughness: 0.32, metalness: 0.2 },
  secondary: { zone: 'secondary', roughness: 0.32, metalness: 0.2 },
  endplate: { zone: 'secondary', roughness: 0.32, metalness: 0.2 },
  helmet: { zone: 'accent', roughness: 0.3, metalness: 0.2 },
  carbon: { zone: 'none', base: '#1d1e22', roughness: 0.45, metalness: 0.25 },
  carbonMatte: { zone: 'none', base: '#141518', roughness: 0.7, metalness: 0.2 },
  gloss: { zone: 'none', base: '#0b0c0f', roughness: 0.25, metalness: 0.4 },
  dark: { zone: 'none', base: '#060607', roughness: 0.95, metalness: 0 },
  metal: { zone: 'none', base: '#3b3f46', roughness: 0.32, metalness: 0.9 },
  mirror: { zone: 'none', base: '#aab3bd', roughness: 0.1, metalness: 1 },
  light: { zone: 'none', base: '#ff1a2e', roughness: 0.5, metalness: 0 },
  visor: { zone: 'none', base: '#07080a', roughness: 0.05, metalness: 0.6 },
  tire: { zone: 'none', base: '#17181b', roughness: 0.85, metalness: 0 },
  cover: { zone: 'none', base: '#2c2f35', roughness: 0.3, metalness: 0.8 },
};

/** Lo que necesita la flota de cada rival. */
export interface RivalCar {
  readonly vehicle: Vehicle;
  readonly livery: LiveryConfig;
  /** Logo del equipo que va en el auto (texto corto, ficticio). */
  readonly wordmark: string;
  /** Segundos como fantasma (parpadea). */
  readonly ghost: number;
}

interface RivalState {
  car: RivalCar;
  previous: { x: number; z: number; heading: number };
  pitch: number;
  roll: number;
  primary: Color;
  secondary: Color;
  accent: Color;
  numberCell: number;
}

interface WheelSlot {
  position: Vector3;
  front: boolean;
  side: 1 | -1;
}

// ─── Shaders: colores de equipo por instancia ───────────────────────────

const TEAM_VERTEX_PARS = /* glsl */ `
  attribute vec4 aZone;
  attribute vec3 aBase;
  attribute vec2 aSurface;
  attribute vec3 iPrimary;
  attribute vec3 iSecondary;
  attribute vec3 iAccent;
  varying vec4 vZone;
  varying vec3 vBase;
  varying vec2 vSurface;
  varying vec3 vPrimary;
  varying vec3 vSecondary;
  varying vec3 vAccent;
`;

const TEAM_VERTEX_MAIN = /* glsl */ `
  vZone = aZone;
  vBase = aBase;
  vSurface = aSurface;
  vPrimary = iPrimary;
  vSecondary = iSecondary;
  vAccent = iAccent;
`;

const TEAM_FRAGMENT_PARS = /* glsl */ `
  varying vec4 vZone;
  varying vec3 vBase;
  varying vec2 vSurface;
  varying vec3 vPrimary;
  varying vec3 vSecondary;
  varying vec3 vAccent;
`;

/** Material de carrocería con colores por instancia (máscara en `map`). */
function teamMaterial(mask: Texture): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ map: mask, roughness: 0.4, metalness: 0.2 });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${TEAM_VERTEX_PARS}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${TEAM_VERTEX_MAIN}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${TEAM_FRAGMENT_PARS}`)
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        vec3 maskColor = texture2D( map, vMapUv ).rgb;
        vec3 weights = mix( vZone.rgb, maskColor, vZone.a );
        diffuseColor.rgb = vBase + vPrimary * weights.r + vSecondary * weights.g + vAccent * weights.b;
        `,
      )
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vSurface.x;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vSurface.y;');
  };
  material.customProgramCacheKey = () => 'rival-team';
  return material;
}

/**
 * Calcomanías por instancia (números y logos): la celda del atlas sale de
 * `iCell`; el blanco del atlas se pinta del acento del equipo y el borde, del secundario.
 */
function decalMaterial(atlas: Texture, columns: number, rows: number, key: string): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    map: atlas,
    transparent: true,
    roughness: 0.32,
    metalness: 0.2,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>\nattribute vec2 iCell;\nattribute vec3 iSecondary;\nattribute vec3 iAccent;\nvarying vec3 vSecondary;\nvarying vec3 vAccent;`,
      )
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>\nvMapUv = ( vMapUv + iCell ) / vec2( ${columns}.0, ${rows}.0 );\nvSecondary = iSecondary;\nvAccent = iAccent;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vSecondary;\nvarying vec3 vAccent;`)
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        vec4 decalTexel = texture2D( map, vMapUv );
        diffuseColor.rgb = mix( vSecondary, vAccent, decalTexel.r );
        diffuseColor.a *= decalTexel.a;
        `,
      );
  };
  material.customProgramCacheKey = () => key;
  return material;
}

/** Atlas con los números de los rivales: blanco con borde negro (el shader los colorea). */
function createNumberAtlas(numbers: readonly number[], anisotropy: number): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = NUMBER_COLUMNS * NUMBER_CELL;
  canvas.height = NUMBER_ROWS * NUMBER_CELL;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el atlas de números.');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  numbers.slice(0, NUMBER_COLUMNS * NUMBER_ROWS).forEach((number, i) => {
    const cx = (i % NUMBER_COLUMNS) * NUMBER_CELL + NUMBER_CELL / 2;
    const cy = Math.floor(i / NUMBER_COLUMNS) * NUMBER_CELL + NUMBER_CELL / 2 + 6;
    const text = String(number);
    ctx.font = `900 ${text.length > 1 ? 112 : 142}px "Orbitron", "Titillium Web", system-ui, sans-serif`;
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(text, cx, cy);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, cx, cy);
  });
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = NoColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

/** Atlas con los logos de equipo de los rivales (uno por auto, en el orden de la flota). */
function createWordmarkAtlas(words: readonly string[], anisotropy: number): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = WORD_COLUMNS * WORD_CELL_W;
  canvas.height = WORD_ROWS * WORD_CELL_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el atlas de logos.');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  words.slice(0, WORD_COLUMNS * WORD_ROWS).forEach((word, i) => {
    const cx = (i % WORD_COLUMNS) * WORD_CELL_W + WORD_CELL_W / 2;
    const cy = Math.floor(i / WORD_COLUMNS) * WORD_CELL_H + WORD_CELL_H / 2 + 4;
    // Igual que el logo del auto del jugador: cursiva gruesa con borde.
    ctx.font = `italic 900 ${word.length > 7 ? 74 : 92}px "Titillium Web", "Segoe UI", system-ui, sans-serif`;
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(word, cx, cy, WORD_CELL_W - 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(word, cx, cy, WORD_CELL_W - 24);
  });
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = NoColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

/** Geometría de una pieza en coordenadas del auto, sólo con posición, normal y UV (sin índice). */
function bake(mesh: Mesh): BufferGeometry {
  const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  for (const name of Object.keys(geometry.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv') geometry.deleteAttribute(name);
  }
  if (!geometry.getAttribute('uv')) {
    geometry.setAttribute('uv', new Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 2), 2));
  }
  geometry.applyMatrix4(mesh.matrixWorld);
  geometry.clearGroups();
  return geometry;
}

/** Agrega los atributos de pintura (zona, color base y superficie) a una pieza. */
function paint(geometry: BufferGeometry, key: string): BufferGeometry {
  const style = PART_STYLE[key] ?? { zone: 'none', base: '#202226', roughness: 0.5, metalness: 0.3 };
  const count = geometry.getAttribute('position').count;
  const zone = new Float32Array(count * 4);
  const base = new Float32Array(count * 3);
  const surface = new Float32Array(count * 2);
  const zoneValue: [number, number, number, number] =
    style.zone === 'mask'
      ? [0, 0, 0, 1]
      : style.zone === 'primary'
        ? [1, 0, 0, 0]
        : style.zone === 'secondary'
          ? [0, 1, 0, 0]
          : style.zone === 'accent'
            ? [0, 0, 1, 0]
            : [0, 0, 0, 0];
  const color = new Color(style.base ?? '#000000');
  for (let i = 0; i < count; i++) {
    zone.set(zoneValue, i * 4);
    base[i * 3] = style.base ? color.r : 0;
    base[i * 3 + 1] = style.base ? color.g : 0;
    base[i * 3 + 2] = style.base ? color.b : 0;
    surface[i * 2] = style.roughness;
    surface[i * 2 + 1] = style.metalness;
  }
  geometry.setAttribute('aZone', new BufferAttribute(zone, 4));
  geometry.setAttribute('aBase', new BufferAttribute(base, 3));
  geometry.setAttribute('aSurface', new BufferAttribute(surface, 2));
  return geometry;
}

/** Nombre de la pieza según su material en el modelo ("carroceria:livery" → "livery"). */
function partKey(mesh: Mesh, materials: Map<Material, string>): string {
  const byName = mesh.name.startsWith('carroceria:') ? mesh.name.slice('carroceria:'.length) : '';
  return byName || materials.get(mesh.material as Material) || 'carbon';
}

/** Recorre un subárbol juntando sus mallas. */
function meshesOf(root: Object3D): Mesh[] {
  const list: Mesh[] = [];
  root.traverse((object) => {
    if ((object as Partial<Mesh>).isMesh === true) list.push(object as Mesh);
  });
  return list;
}

interface Template {
  body: BufferGeometry;
  numbers: BufferGeometry | null;
  wordmarks: BufferGeometry | null;
  sponsors: BufferGeometry | null;
  flap: BufferGeometry | null;
  flapPivot: Vector3;
  tire: BufferGeometry | null;
  cover: BufferGeometry | null;
}

/**
 * Arma la geometría de un nivel de detalle a partir del modelo procedural.
 * @param separate si ruedas, flap y números van aparte (nivel cercano) o fusionados a la carrocería
 */
function buildTemplate(detail: number, separate: boolean): Template {
  const model = new CarModel({ livery: MASK_LIVERY, detail, anisotropy: 1 });
  try {
    model.root.updateMatrixWorld(true);
    // Material → nombre de la pieza (para las mallas que no son de la carrocería).
    const materials = new Map<Material, string>();
    for (const mesh of meshesOf(model.root)) {
      if (mesh.name.startsWith('carroceria:')) materials.set(mesh.material as Material, mesh.name.slice('carroceria:'.length));
    }
    const wheelMeshes = new Set<Mesh>();
    for (const rig of Object.values(model.wheels)) for (const mesh of meshesOf(rig.steer)) wheelMeshes.add(mesh);
    const flapMeshes = new Set(meshesOf(model.drsPivot));
    const helmet = meshesOf(model.driver);
    const helmetKeys = new Map<Mesh, string>(helmet.map((mesh, i) => [mesh, i === 0 ? 'helmet' : 'visor']));

    const body: BufferGeometry[] = [];
    const numbers: BufferGeometry[] = [];
    const wordmarks: BufferGeometry[] = [];
    const sponsors: BufferGeometry[] = [];
    for (const mesh of meshesOf(model.root)) {
      const key = helmetKeys.get(mesh) ?? partKey(mesh, materials);
      if (key === 'wordmark') {
        // Los logos sólo se ven de cerca.
        if (separate) wordmarks.push(bake(mesh));
        continue;
      }
      if (key === 'sponsor') {
        if (separate) sponsors.push(bake(mesh));
        continue;
      }
      if (separate && (wheelMeshes.has(mesh) || flapMeshes.has(mesh))) continue;
      if (key === 'number') {
        if (separate) numbers.push(bake(mesh));
        continue;
      }
      // Lejos, las ruedas se funden con la carrocería: los neumáticos van de color goma.
      const wheelKey = wheelMeshes.has(mesh) ? (mesh.geometry.type === 'LatheGeometry' ? 'tire' : 'cover') : key;
      body.push(paint(bake(mesh), wheelKey));
    }
    const merged = mergeGeometries(body, false);
    for (const g of body) g.dispose();
    if (!merged) throw new Error('No se pudo armar el modelo de los rivales.');

    const template: Template = {
      body: merged,
      numbers: separate ? mergeGeometries(numbers, false) : null,
      wordmarks: separate && wordmarks.length > 0 ? mergeGeometries(wordmarks, false) : null,
      sponsors: separate && sponsors.length > 0 ? mergeGeometries(sponsors, false) : null,
      flap: null,
      flapPivot: model.drsPivot.position.clone(),
      tire: null,
      cover: null,
    };
    for (const g of numbers) g.dispose();
    for (const g of wordmarks) g.dispose();
    for (const g of sponsors) g.dispose();

    if (separate) {
      // Flap en coordenadas de su pivote.
      const flapParts = [...flapMeshes].map((mesh) => {
        const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
        geometry.applyMatrix4(mesh.matrix);
        return paint(geometry, 'secondary');
      });
      template.flap = mergeGeometries(flapParts, false);
      for (const g of flapParts) g.dispose();

      // Rueda trasera derecha en coordenadas de su eje de giro: neumático aparte y tapa aparte.
      const spin = model.wheels.rr.spin;
      const tireParts: BufferGeometry[] = [];
      for (const mesh of meshesOf(spin)) {
        const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
        geometry.applyMatrix4(mesh.matrix);
        for (const name of Object.keys(geometry.attributes)) {
          if (name !== 'position' && name !== 'normal' && name !== 'uv') geometry.deleteAttribute(name);
        }
        const key = materials.get(mesh.material as Material) ?? '';
        if (mesh.geometry.type === 'CircleGeometry' && key !== 'dark') {
          template.cover = geometry;
          continue;
        }
        if (mesh.geometry.type !== 'LatheGeometry') {
          // Llanta y fondo: a un punto oscuro de la banda de rodadura de la textura del neumático.
          const uv = geometry.getAttribute('uv');
          const tread = 4 / (TIRE_PROFILE_POINTS - 1);
          for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5, tread);
        }
        tireParts.push(geometry);
      }
      template.tire = mergeGeometries(tireParts, false);
      for (const g of tireParts) g.dispose();
    }
    return template;
  } finally {
    model.dispose();
  }
}

/** Posiciones de las cuatro ruedas (ejes del modelo). */
function wheelSlots(): WheelSlot[] {
  const d = CAR_DIMENSIONS;
  return [
    { position: new Vector3(-d.frontTrackHalf, d.wheelRadius, d.frontAxleZ), front: true, side: -1 },
    { position: new Vector3(d.frontTrackHalf, d.wheelRadius, d.frontAxleZ), front: true, side: 1 },
    { position: new Vector3(-d.rearTrackHalf, d.wheelRadius, d.rearAxleZ), front: false, side: -1 },
    { position: new Vector3(d.rearTrackHalf, d.wheelRadius, d.rearAxleZ), front: false, side: 1 },
  ];
}

export class RivalFleet {
  readonly root = new Group();
  private readonly own = new Disposer();
  private readonly states: RivalState[];
  private readonly nearBody: InstancedMesh;
  private readonly nearFlap: InstancedMesh | null;
  private readonly nearNumbers: InstancedMesh | null;
  private readonly nearWordmarks: InstancedMesh | null;
  private readonly nearSponsors: InstancedMesh | null;
  private readonly tires: InstancedMesh | null;
  private readonly covers: InstancedMesh | null;
  private readonly farBody: InstancedMesh;
  private readonly flapPivot: Vector3;
  private readonly wheels = wheelSlots();
  private readonly order: number[];
  private readonly distances: Float32Array;
  private time = 0;
  // Temporales (sin crear objetos por cuadro).
  private readonly carMatrix = new Matrix4();
  private readonly partMatrix = new Matrix4();
  private readonly localMatrix = new Matrix4();
  private readonly quaternion = new Quaternion();
  private readonly position = new Vector3();
  private readonly scale = new Vector3(1, 1, 1);
  private readonly rotation = new Euler();

  /** Sombras de contacto (una por auto dibujado), si se pidieron. */
  private readonly shadows: InstancedMesh | null;

  /**
   * @param shadows sombras de contacto compartidas con el auto del jugador
   */
  constructor(
    cars: readonly RivalCar[],
    anisotropy: number,
    private readonly lod: RivalLod = DEFAULT_LOD,
    shadows: CarShadows | null = null,
  ) {
    this.root.name = 'rivales';
    this.shadows = shadows ? shadows.createInstanced(cars.length) : null;
    if (this.shadows) this.root.add(this.shadows);
    const count = Math.max(1, cars.length);
    this.states = cars.map((car, i) => ({
      car,
      previous: { x: car.vehicle.x, z: car.vehicle.z, heading: car.vehicle.heading },
      pitch: 0,
      roll: 0,
      primary: new Color(car.livery.primary),
      secondary: new Color(car.livery.secondary),
      accent: new Color(car.livery.accent),
      numberCell: i,
    }));
    this.order = cars.map((_, i) => i);
    this.distances = new Float32Array(cars.length);

    const mask = this.own.own(createLiveryTexture(MASK_LIVERY, anisotropy));
    mask.colorSpace = NoColorSpace;
    mask.needsUpdate = true;
    const bodyMaterial = this.own.own(teamMaterial(mask));

    // ─── Nivel cercano ───
    const near = buildTemplate(lod.nearDetail, true);
    this.flapPivot = near.flap ? near.flapPivot : new Vector3();
    this.nearBody = this.instanced(near.body, bodyMaterial, count, true, 'rivales-cerca');
    this.nearFlap = near.flap ? this.instanced(near.flap, bodyMaterial, count, true, 'rivales-flap') : null;
    const atlas = this.own.own(createNumberAtlas(cars.map((car) => car.livery.number), anisotropy));
    this.nearNumbers = near.numbers ? this.instanced(near.numbers, this.own.own(decalMaterial(atlas, NUMBER_COLUMNS, NUMBER_ROWS, 'rival-number')), count, false, 'rivales-numeros') : null;
    const words = this.own.own(createWordmarkAtlas(cars.map((car) => car.wordmark), anisotropy));
    this.nearWordmarks = near.wordmarks ? this.instanced(near.wordmarks, this.own.own(decalMaterial(words, WORD_COLUMNS, WORD_ROWS, 'rival-wordmark')), count, false, 'rivales-logos') : null;
    // Patrocinadores: la misma hoja para todos, pintada con el acento y el secundario de cada equipo.
    const sponsorSheet = this.own.own(createSponsorSheet('#ffffff', '#000000', anisotropy, false));
    this.nearSponsors = near.sponsors
      ? this.instanced(near.sponsors, this.own.own(decalMaterial(sponsorSheet, 1, 1, 'rival-sponsor')), count, false, 'rivales-patrocinadores')
      : null;
    const tireTexture = this.own.own(createTireTexture(MASK_LIVERY.tireStripe, 'VELTRA', anisotropy));
    const tireMaterial = this.own.own(new MeshStandardMaterial({ map: tireTexture, roughness: 0.82, metalness: 0 }));
    this.tires = near.tire ? this.instanced(near.tire, tireMaterial, count * 4, true, 'rivales-neumaticos') : null;
    const coverTexture = this.own.own(createWheelCoverTexture('#d7dce2', anisotropy));
    const coverMaterial = this.own.own(new MeshStandardMaterial({ map: coverTexture, roughness: 0.3, metalness: 0.85 }));
    this.covers = near.cover ? this.instanced(near.cover, coverMaterial, count * 4, false, 'rivales-tapas') : null;

    // ─── Nivel lejano: todo en una malla ───
    const far = buildTemplate(FAR_DETAIL, false);
    this.farBody = this.instanced(far.body, bodyMaterial, count, false, 'rivales-lejos');
    this.farBody.castShadow = false;

    // Colores por instancia de la carrocería (se reescriben al cambiar de nivel).
    for (const mesh of [this.nearBody, this.nearFlap, this.farBody, this.nearNumbers, this.nearWordmarks, this.nearSponsors]) {
      if (!mesh) continue;
      const geometry = mesh.geometry;
      geometry.setAttribute('iPrimary', new InstancedBufferAttribute(new Float32Array(count * 3), 3));
      geometry.setAttribute('iSecondary', new InstancedBufferAttribute(new Float32Array(count * 3), 3));
      geometry.setAttribute('iAccent', new InstancedBufferAttribute(new Float32Array(count * 3), 3));
    }
    this.nearNumbers?.geometry.setAttribute('iCell', new InstancedBufferAttribute(new Float32Array(count * 2), 2));
    this.nearWordmarks?.geometry.setAttribute('iCell', new InstancedBufferAttribute(new Float32Array(count * 2), 2));
    // Una sola celda (la hoja entera): la celda queda en (0, 0).
    this.nearSponsors?.geometry.setAttribute('iCell', new InstancedBufferAttribute(new Float32Array(count * 2), 2));
    this.update(0, 1, new Vector3());
  }

  /** Antes de cada paso fijo: guarda la pose para interpolar. */
  beforeStep(): void {
    for (const state of this.states) {
      const v = state.car.vehicle;
      state.previous.x = v.x;
      state.previous.z = v.z;
      state.previous.heading = v.heading;
    }
  }

  /** Sin interpolación (tras reiniciar la carrera). */
  snap(): void {
    this.beforeStep();
    for (const state of this.states) {
      state.pitch = 0;
      state.roll = 0;
    }
  }

  /**
   * Dibuja la pose interpolada de cada rival y elige su nivel de detalle.
   * @param camera posición de la cámara (el nivel cercano se da a los más próximos)
   */
  update(dt: number, alpha: number, camera: Vector3): void {
    this.time += dt;
    const t = clamp(alpha, 0, 1);
    // Distancias a la cámara y orden por cercanía.
    this.states.forEach((state, i) => {
      const v = state.car.vehicle;
      this.distances[i] = Math.hypot(v.x - camera.x, v.z - camera.z);
    });
    this.order.sort((a, b) => (this.distances[a] ?? 0) - (this.distances[b] ?? 0));

    let nearCount = 0;
    let farCount = 0;
    let shadowCount = 0;
    for (const index of this.order) {
      const state = this.states[index];
      if (!state) continue;
      const car = state.car;
      const v = car.vehicle;
      // Fantasma: parpadea.
      if (car.ghost > 0 && Math.floor(this.time * GHOST_BLINK) % 2 === 0) continue;

      // Pose interpolada + inclinación por fuerzas G.
      const x = state.previous.x + (v.x - state.previous.x) * t;
      const z = state.previous.z + (v.z - state.previous.z) * t;
      let delta = v.heading - state.previous.heading;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      const heading = state.previous.heading + delta * t;
      if (dt > 0) {
        state.pitch = damp(state.pitch, clamp(-v.telemetry.ax * PITCH_PER_ACCEL, -0.035, 0.035), 8, dt);
        state.roll = damp(state.roll, clamp(v.telemetry.ay * ROLL_PER_ACCEL, -0.04, 0.04), 8, dt);
      }
      this.composeCar(x - Math.sin(heading) * MODEL_OFFSET, z - Math.cos(heading) * MODEL_OFFSET, state.pitch, heading, state.roll);
      this.shadows?.setMatrixAt(shadowCount++, this.carMatrix);

      const near = nearCount < this.lod.maxNear && (this.distances[index] ?? Infinity) < this.lod.nearDistance;
      if (near) {
        const slot = nearCount++;
        this.nearBody.setMatrixAt(slot, this.carMatrix);
        this.writeColors(this.nearBody, slot, state);
        if (this.nearFlap) {
          this.localMatrix.makeRotationX(0.38 * clamp(v.drs, 0, 1));
          this.localMatrix.setPosition(this.flapPivot);
          this.partMatrix.multiplyMatrices(this.carMatrix, this.localMatrix);
          this.nearFlap.setMatrixAt(slot, this.partMatrix);
          this.writeColors(this.nearFlap, slot, state);
        }
        if (this.nearNumbers) {
          this.nearNumbers.setMatrixAt(slot, this.carMatrix);
          this.writeColors(this.nearNumbers, slot, state);
          const cell = this.nearNumbers.geometry.getAttribute('iCell') as InstancedBufferAttribute;
          cell.setXY(slot, state.numberCell % NUMBER_COLUMNS, NUMBER_ROWS - 1 - Math.floor(state.numberCell / NUMBER_COLUMNS));
        }
        if (this.nearWordmarks) {
          this.nearWordmarks.setMatrixAt(slot, this.carMatrix);
          this.writeColors(this.nearWordmarks, slot, state);
          const cell = this.nearWordmarks.geometry.getAttribute('iCell') as InstancedBufferAttribute;
          cell.setXY(slot, index % WORD_COLUMNS, WORD_ROWS - 1 - Math.floor(index / WORD_COLUMNS));
        }
        if (this.nearSponsors) {
          this.nearSponsors.setMatrixAt(slot, this.carMatrix);
          this.writeColors(this.nearSponsors, slot, state);
        }
        this.writeWheels(slot, v);
      } else {
        const slot = farCount++;
        this.farBody.setMatrixAt(slot, this.carMatrix);
        this.writeColors(this.farBody, slot, state);
      }
    }

    for (const mesh of [this.nearBody, this.nearFlap, this.nearNumbers, this.nearWordmarks, this.nearSponsors]) this.flushInstances(mesh, nearCount);
    this.flushInstances(this.tires, nearCount * 4);
    this.flushInstances(this.covers, nearCount * 4);
    this.flushInstances(this.farBody, farCount);
    this.flushInstances(this.shadows, shadowCount);
  }

  dispose(): void {
    this.root.removeFromParent();
    // Libera sólo sus matrices: la malla y el material de la sombra son compartidos.
    this.shadows?.dispose();
    this.own.dispose();
  }

  private instanced(geometry: BufferGeometry, material: Material, count: number, cast: boolean, name: string): InstancedMesh {
    this.own.own(geometry);
    geometry.computeBoundingSphere();
    const mesh = new InstancedMesh(geometry, material, count);
    mesh.name = name;
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    // Los autos se mueven por toda la pista: el recorte por cámara de la malla entera no sirve.
    mesh.frustumCulled = false;
    mesh.count = 0;
    this.root.add(mesh);
    return mesh;
  }

  private composeCar(x: number, z: number, pitch: number, heading: number, roll: number): void {
    // Rotación YXZ (rumbo, cabeceo, rolido), como `CarRig`.
    this.rotation.set(pitch, heading, roll, 'YXZ');
    this.quaternion.setFromEuler(this.rotation);
    this.position.set(x, 0.001, z);
    this.scale.set(1, 1, 1);
    this.carMatrix.compose(this.position, this.quaternion, this.scale);
  }

  private writeColors(mesh: InstancedMesh, slot: number, state: RivalState): void {
    const geometry = mesh.geometry;
    const primary = geometry.getAttribute('iPrimary') as InstancedBufferAttribute | undefined;
    const secondary = geometry.getAttribute('iSecondary') as InstancedBufferAttribute | undefined;
    const accent = geometry.getAttribute('iAccent') as InstancedBufferAttribute | undefined;
    primary?.setXYZ(slot, state.primary.r, state.primary.g, state.primary.b);
    secondary?.setXYZ(slot, state.secondary.r, state.secondary.g, state.secondary.b);
    accent?.setXYZ(slot, state.accent.r, state.accent.g, state.accent.b);
  }

  /** Ruedas del auto en `slot`: posición, dirección (delanteras) y giro de rodado. */
  private writeWheels(slot: number, v: Vehicle): void {
    const tires = this.tires;
    const covers = this.covers;
    if (!tires) return;
    const d = CAR_DIMENSIONS;
    const frontScale = d.frontTireWidth / d.rearTireWidth;
    this.wheels.forEach((wheel, i) => {
      const spin = -(wheel.front ? v.wheelSpinFront : v.wheelSpinRear) * wheel.side;
      const steer = wheel.front ? v.steerAngle : 0;
      // Local: posición del eje → dirección → (lado izquierdo girado 180°) → rodado → ancho.
      this.quaternion.setFromAxisAngle(AXIS_Y, steer + (wheel.side < 0 ? Math.PI : 0));
      this.quaternion.multiply(SPIN.setFromAxisAngle(AXIS_X, spin));
      this.scale.set(wheel.front ? frontScale : 1, 1, 1);
      this.localMatrix.compose(wheel.position, this.quaternion, this.scale);
      this.partMatrix.multiplyMatrices(this.carMatrix, this.localMatrix);
      tires.setMatrixAt(slot * 4 + i, this.partMatrix);
      covers?.setMatrixAt(slot * 4 + i, this.partMatrix);
    });
  }

  private flushInstances(mesh: InstancedMesh | null, count: number): void {
    if (!mesh) return;
    mesh.count = count;
    mesh.visible = count > 0;
    mesh.instanceMatrix.needsUpdate = true;
    for (const name of ['iPrimary', 'iSecondary', 'iAccent', 'iCell']) {
      const attribute = mesh.geometry.getAttribute(name) as InstancedBufferAttribute | undefined;
      if (attribute) attribute.needsUpdate = true;
    }
  }
}

const AXIS_X = new Vector3(1, 0, 0);
const AXIS_Y = new Vector3(0, 1, 0);
const SPIN = new Quaternion();
