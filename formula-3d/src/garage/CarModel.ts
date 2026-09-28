/**
 * Monoplaza procedural (sin modelos externos). Se usa en el menú, el garaje, la
 * carrera y el podio.
 *
 * Medidas en metros, inspiradas en un monoplaza moderno: 5,7 m de largo,
 * 1,96 m de ancho, 3,6 m entre ejes, neumáticos de 720 mm con llantas de 18".
 * El morro apunta a −Z, Y hacia arriba, el suelo en y = 0.
 *
 * Las piezas fijas se fusionan por material (≈ 15 draw calls en total para la
 * carrocería); las ruedas, el flap del DRS y el piloto quedan aparte porque se
 * mueven o se ocultan.
 */

import {
  BoxGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Shape,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Material,
  type Texture,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Disposer } from '../core/utils/Disposer';
import { clamp } from '../core/utils/math';
import {
  createCarbonTexture,
  createHelmetTexture,
  createLiveryTexture,
  createNumberTexture,
  createTireTexture,
  createWheelCoverTexture,
  createWordmarkTexture,
  TIRE_SIDEWALL_POINTS,
} from './carTextures';
import type { LiveryConfig } from './livery';
import { LoftSurface, type LoftSection } from './Loft';

/** Nombre ficticio del equipo del jugador y de la marca de neumáticos. */
const TEAM_WORDMARK = 'ÁPICE';
const TIRE_BRAND = 'VELTRA';

// ─── Dimensiones principales ─────────────────────────────────────────────

export const CAR_DIMENSIONS = {
  wheelRadius: 0.36,
  rimRadius: 0.235,
  frontTireWidth: 0.305,
  rearTireWidth: 0.405,
  frontAxleZ: -1.78,
  rearAxleZ: 1.82,
  frontTrackHalf: 0.8,
  rearTrackHalf: 0.78,
} as const;

// ─── Secciones de la carrocería ──────────────────────────────────────────

/** Monocasco + morro + cubierta del motor + caja de cambios. */
const BODY_SECTIONS: LoftSection[] = [
  { z: -2.92, halfWidth: 0.05, bottom: 0.12, top: 0.19, topRound: 2.2, bottomRound: 2.4 },
  { z: -2.7, halfWidth: 0.08, bottom: 0.13, top: 0.25, topRound: 2.2, bottomRound: 2.6 },
  { z: -2.4, halfWidth: 0.11, bottom: 0.14, top: 0.32, topRound: 2.3, bottomRound: 3 },
  { z: -2.05, halfWidth: 0.135, bottom: 0.15, top: 0.39, topRound: 2.4, bottomRound: 3.2 },
  { z: -1.75, halfWidth: 0.16, bottom: 0.15, top: 0.45, topRound: 2.5, bottomRound: 3.5 },
  { z: -1.35, halfWidth: 0.2, bottom: 0.13, top: 0.52, topScale: 0.82 },
  { z: -0.95, halfWidth: 0.25, bottom: 0.1, top: 0.585, topScale: 0.76 },
  { z: -0.6, halfWidth: 0.29, bottom: 0.08, top: 0.63, topScale: 0.72 },
  { z: -0.25, halfWidth: 0.31, bottom: 0.07, top: 0.6, topScale: 0.8 },
  { z: 0.1, halfWidth: 0.31, bottom: 0.07, top: 0.62, topScale: 0.8 },
  { z: 0.45, halfWidth: 0.27, bottom: 0.08, top: 0.7, topScale: 0.6 },
  { z: 0.95, halfWidth: 0.23, bottom: 0.09, top: 0.66, topScale: 0.55 },
  { z: 1.45, halfWidth: 0.17, bottom: 0.11, top: 0.54, topScale: 0.6 },
  { z: 1.85, halfWidth: 0.13, bottom: 0.14, top: 0.44, topRound: 2.6 },
  { z: 2.2, halfWidth: 0.085, bottom: 0.18, top: 0.36, topRound: 2.4 },
  { z: 2.38, halfWidth: 0.05, bottom: 0.22, top: 0.31, topRound: 2.2, bottomRound: 2.2 },
];

/** Toma de aire sobre el piloto y "lomo" de la cubierta del motor. */
const SPINE_SECTIONS: LoftSection[] = [
  { z: 0.02, halfWidth: 0.13, bottom: 0.6, top: 0.93, topRound: 2.6, bottomRound: 3, topScale: 0.78 },
  { z: 0.2, halfWidth: 0.15, bottom: 0.6, top: 0.96, topRound: 2.6, topScale: 0.8 },
  { z: 0.55, halfWidth: 0.15, bottom: 0.58, top: 0.9, topRound: 2.4, topScale: 0.75 },
  { z: 1.0, halfWidth: 0.11, bottom: 0.55, top: 0.76, topRound: 2.3 },
  { z: 1.5, halfWidth: 0.06, bottom: 0.48, top: 0.58, topRound: 2.2 },
  { z: 1.8, halfWidth: 0.03, bottom: 0.45, top: 0.48, topRound: 2 },
];

/** Pontón derecho (el izquierdo es su espejo). */
const SIDEPOD_SECTIONS: LoftSection[] = [
  { z: -0.64, cx: 0.46, halfWidth: 0.17, bottom: 0.13, top: 0.48, topRound: 3, bottomRound: 4 },
  { z: -0.5, cx: 0.48, halfWidth: 0.2, bottom: 0.1, top: 0.53, topRound: 3, bottomRound: 4 },
  { z: -0.1, cx: 0.5, halfWidth: 0.22, bottom: 0.09, top: 0.55, topRound: 2.8, topScale: 0.85 },
  { z: 0.4, cx: 0.47, halfWidth: 0.21, bottom: 0.09, top: 0.5, topRound: 2.6 },
  { z: 0.9, cx: 0.38, halfWidth: 0.16, bottom: 0.09, top: 0.4, topRound: 2.4 },
  { z: 1.3, cx: 0.28, halfWidth: 0.11, bottom: 0.1, top: 0.3, topRound: 2.2 },
  { z: 1.62, cx: 0.2, halfWidth: 0.06, bottom: 0.12, top: 0.22, topRound: 2 },
];

/** Carcasa del espejo derecho: forma de gota achatada. */
const MIRROR_SECTIONS: LoftSection[] = [
  { z: -0.655, cx: 0.47, halfWidth: 0.045, bottom: 0.632, top: 0.656, topRound: 2, bottomRound: 2 },
  { z: -0.635, cx: 0.47, halfWidth: 0.072, bottom: 0.619, top: 0.671, topRound: 2.6, bottomRound: 2.6 },
  { z: -0.6, cx: 0.47, halfWidth: 0.077, bottom: 0.616, top: 0.674, topRound: 3.5, bottomRound: 3.5 },
  { z: -0.582, cx: 0.47, halfWidth: 0.077, bottom: 0.616, top: 0.674, topRound: 4, bottomRound: 4 },
];

function mirrorSections(sections: LoftSection[]): LoftSection[] {
  return sections.map((s) => ({ ...s, cx: -(s.cx ?? 0) }));
}

// ─── Materiales ──────────────────────────────────────────────────────────

type MaterialKey =
  | 'livery'
  | 'primary'
  | 'secondary'
  | 'carbon'
  | 'carbonMatte'
  | 'gloss'
  | 'dark'
  | 'metal'
  | 'mirror'
  | 'light'
  | 'number'
  | 'wordmark'
  | 'endplate'
  | 'tire'
  | 'cover'
  | 'helmet'
  | 'visor';

function createMaterials(livery: LiveryConfig, anisotropy: number, own: Disposer): Record<MaterialKey, Material> {
  const tex = <T extends Texture>(t: T): T => own.own(t);
  const liveryMap = tex(createLiveryTexture(livery, anisotropy));
  const carbonMap = tex(createCarbonTexture(anisotropy));
  carbonMap.repeat.set(22, 22);

  const paint = { roughness: 0.32, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.09 };
  const decal = { transparent: true, polygonOffset: true, polygonOffsetFactor: -2, ...paint };

  const materials: Record<MaterialKey, Material> = {
    livery: new MeshPhysicalMaterial({ ...paint, map: liveryMap }),
    primary: new MeshPhysicalMaterial({ ...paint, color: livery.primary }),
    secondary: new MeshPhysicalMaterial({ ...paint, color: livery.secondary }),
    carbon: new MeshPhysicalMaterial({
      map: carbonMap,
      roughness: 0.42,
      metalness: 0.25,
      clearcoat: 0.5,
      clearcoatRoughness: 0.18,
    }),
    // Fondo plano y difusor: carbono sin laca, casi negro.
    carbonMatte: new MeshStandardMaterial({ map: carbonMap, color: '#6d6f75', roughness: 0.7, metalness: 0.2 }),
    gloss: new MeshPhysicalMaterial({ color: '#0b0c0f', roughness: 0.25, metalness: 0.4, clearcoat: 1 }),
    dark: new MeshStandardMaterial({ color: '#050506', roughness: 0.95, metalness: 0 }),
    metal: new MeshStandardMaterial({ color: '#3b3f46', roughness: 0.32, metalness: 0.95 }),
    mirror: new MeshStandardMaterial({ color: '#dfe6ee', roughness: 0.04, metalness: 1 }),
    light: new MeshStandardMaterial({ color: '#300006', emissive: '#ff1a2e', emissiveIntensity: 4 }),
    number: new MeshPhysicalMaterial({ ...decal, map: tex(createNumberTexture(livery, anisotropy)) }),
    wordmark: new MeshPhysicalMaterial({
      ...decal,
      map: tex(createWordmarkTexture(TEAM_WORDMARK, livery.accent, anisotropy, { outline: livery.secondary })),
    }),
    endplate: new MeshPhysicalMaterial({
      ...paint,
      map: tex(
        createWordmarkTexture(TEAM_WORDMARK, livery.accent, anisotropy, {
          background: livery.secondary,
          stripe: livery.primary,
          scale: 0.62,
        }),
      ),
    }),
    tire: new MeshStandardMaterial({
      map: tex(createTireTexture(livery.tireStripe, TIRE_BRAND, anisotropy)),
      roughness: 0.82,
      metalness: 0,
    }),
    cover: new MeshStandardMaterial({
      map: tex(createWheelCoverTexture(livery.tireStripe, anisotropy)),
      roughness: 0.3,
      metalness: 0.85,
    }),
    helmet: new MeshPhysicalMaterial({ ...paint, map: tex(createHelmetTexture(livery, anisotropy)) }),
    visor: new MeshPhysicalMaterial({
      color: '#07080a',
      roughness: 0.04,
      metalness: 0.6,
      clearcoat: 1,
      iridescence: 0.8,
      iridescenceIOR: 1.6,
    }),
  };
  for (const material of Object.values(materials)) own.own(material);
  return materials;
}

// ─── Utilidades de geometría ─────────────────────────────────────────────

/** Perfil NACA de 4 dígitos con curvatura hacia abajo (alerón que genera carga). */
function airfoilShape(chord: number, thickness = 0.12, camber = -0.06, camberPos = 0.4, points = 14): Shape {
  const upper: Vector2[] = [];
  const lower: Vector2[] = [];
  for (let i = 0; i <= points; i++) {
    const x = (1 - Math.cos((Math.PI * i) / points)) / 2;
    const yt =
      5 * thickness * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4);
    const yc =
      x < camberPos
        ? (camber / camberPos ** 2) * (2 * camberPos * x - x * x)
        : (camber / (1 - camberPos) ** 2) * (1 - 2 * camberPos + 2 * camberPos * x - x * x);
    upper.push(new Vector2(x * chord, (yc + yt) * chord));
    lower.push(new Vector2(x * chord, (yc - yt) * chord));
  }
  const shape = new Shape();
  const first = upper[upper.length - 1] ?? new Vector2();
  shape.moveTo(first.x, first.y);
  for (let i = upper.length - 2; i >= 0; i--) shape.lineTo(upper[i]?.x ?? 0, upper[i]?.y ?? 0);
  for (let i = 1; i < lower.length; i++) shape.lineTo(lower[i]?.x ?? 0, lower[i]?.y ?? 0);
  shape.closePath();
  return shape;
}

/**
 * Extruye un perfil dibujado en el plano (Z del auto, Y) a lo largo del eje X.
 * La pieza ocupa x ∈ [xFrom, xTo].
 */
function extrudeAcrossX(shape: Shape, xFrom: number, xTo: number): BufferGeometry {
  const geometry = new ExtrudeGeometry(shape, { depth: xTo - xFrom, bevelEnabled: false, curveSegments: 6 });
  // Local X → Z del auto, local Z (extrusión) → −X del auto.
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(xTo, 0, 0);
  return geometry;
}

/** Elemento de alerón: perfil de `chord` con borde de ataque en (zLE, yLE) y ángulo `angle` (cola arriba). */
function wingElement(chord: number, zLE: number, yLE: number, angleDeg: number, xFrom: number, xTo: number): BufferGeometry {
  const geometry = extrudeAcrossX(airfoilShape(chord), xFrom, xTo);
  // Rotación alrededor de X: positivo baja la cola, así que se invierte el signo.
  geometry.rotateX(-(angleDeg * Math.PI) / 180);
  geometry.translate(0, yLE, zLE);
  return geometry;
}

/** Placa (endplate, aleta) con contorno en el plano (Z, Y), de `thickness` centrada en `x`. */
function plate(outline: ReadonlyArray<readonly [number, number]>, x: number, thickness: number): BufferGeometry {
  const shape = new Shape(outline.map(([z, y]) => new Vector2(z, y)));
  const geometry = extrudeAcrossX(shape, x - thickness / 2, x + thickness / 2);
  return planarUV(geometry);
}

/** UV planares normalizadas en el plano (Z, Y): para placas con textura. */
function planarUV(geometry: BufferGeometry): BufferGeometry {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const position = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  if (!box || !uv) return geometry;
  const dz = box.max.z - box.min.z || 1;
  const dy = box.max.y - box.min.y || 1;
  for (let i = 0; i < position.count; i++) {
    uv.setXY(i, (position.getZ(i) - box.min.z) / dz, (position.getY(i) - box.min.y) / dy);
  }
  uv.needsUpdate = true;
  return geometry;
}

/** Barra plana (brazo de suspensión, soporte) entre dos puntos, con la cara ancha horizontal. */
function rod(from: Vector3, to: Vector3, width: number, thickness: number): BufferGeometry {
  const dir = new Vector3().subVectors(to, from);
  const length = dir.length();
  dir.normalize();
  const up = new Vector3(0, 1, 0).addScaledVector(dir, -dir.y);
  if (up.lengthSq() < 1e-6) up.set(0, 0, 1);
  up.normalize();
  const side = new Vector3().crossVectors(dir, up);
  const geometry = new BoxGeometry(length, thickness, width);
  geometry.applyMatrix4(new Matrix4().makeBasis(dir, up, side));
  geometry.translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
  return geometry;
}

function box(w: number, h: number, d: number, x: number, y: number, z: number): BufferGeometry {
  return new BoxGeometry(w, h, d).translate(x, y, z);
}

/** Refleja una geometría en X (para piezas izquierda/derecha). */
function mirrorX(geometry: BufferGeometry): BufferGeometry {
  const mirrored = geometry.clone();
  mirrored.scale(-1, 1, 1);
  // Al reflejar se invierte el sentido de los triángulos: se corrige el índice.
  const index = mirrored.getIndex();
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      const b = index.getX(i + 1);
      index.setX(i + 1, index.getX(i + 2));
      index.setX(i + 2, b);
    }
  } else {
    const attributes = Object.values(mirrored.attributes);
    for (const attribute of attributes) {
      for (let i = 0; i < attribute.count; i += 3) {
        for (let c = 0; c < attribute.itemSize; c++) {
          const tmp = attribute.getComponent(i + 1, c);
          attribute.setComponent(i + 1, c, attribute.getComponent(i + 2, c));
          attribute.setComponent(i + 2, c, tmp);
        }
      }
    }
  }
  return mirrored;
}

/**
 * Junta piezas fijas por material y al final las fusiona en una malla por
 * material: pocas draw calls aunque el auto tenga cientos de piezas.
 */
class PartBatch {
  private readonly parts = new Map<MaterialKey, BufferGeometry[]>();

  add(material: MaterialKey, ...geometries: BufferGeometry[]): void {
    const list = this.parts.get(material) ?? [];
    list.push(...geometries);
    this.parts.set(material, list);
  }

  /** Agrega la pieza y su espejo en X. */
  addMirrored(material: MaterialKey, geometry: BufferGeometry): void {
    this.add(material, geometry, mirrorX(geometry));
  }

  build(materials: Record<MaterialKey, Material>, own: Disposer): Mesh[] {
    const meshes: Mesh[] = [];
    for (const [key, geometries] of this.parts) {
      // Todas sin índice y sólo con posición, normal y UV, para poder fusionarlas.
      const prepared = geometries.map((g) => {
        const flat = g.index ? g.toNonIndexed() : g;
        for (const name of Object.keys(flat.attributes)) {
          if (name !== 'position' && name !== 'normal' && name !== 'uv') flat.deleteAttribute(name);
        }
        flat.clearGroups();
        return flat;
      });
      const merged = mergeGeometries(prepared, false);
      for (const g of [...geometries, ...prepared]) g.dispose();
      if (!merged) throw new Error(`No se pudieron fusionar las piezas del material "${key}".`);
      merged.computeBoundingSphere();
      own.own(merged);
      const mesh = new Mesh(merged, materials[key]);
      mesh.name = `carroceria:${key}`;
      meshes.push(mesh);
    }
    this.parts.clear();
    return meshes;
  }
}

// ─── Ruedas ──────────────────────────────────────────────────────────────

export interface WheelRig {
  /** Gira sobre Y con la dirección (sólo las delanteras giran). */
  readonly steer: Group;
  /** Gira sobre su eje X al rodar. */
  readonly spin: Group;
  /** +1 lado derecho, −1 izquierdo (el giro de rodado va invertido). */
  readonly side: 1 | -1;
}

/** Perfil del neumático (radio, posición axial) de adentro hacia afuera. */
function tireProfile(width: number): Vector2[] {
  const { wheelRadius: r, rimRadius: rim } = CAR_DIMENSIONS;
  const h = width / 2;
  const points: Vector2[] = [
    new Vector2(rim + 0.005, -h + 0.012),
    new Vector2(r * 0.84, -h - 0.004),
    new Vector2(r - 0.012, -h + 0.006),
    new Vector2(r - 0.002, -h + 0.03),
    new Vector2(r, -h + 0.07),
    new Vector2(r, 0),
    new Vector2(r, h - 0.07),
    new Vector2(r - 0.002, h - 0.03),
  ];
  // Flanco exterior: del borde de la banda (f = 1) al talón (f = 0), con abombado.
  for (let i = 0; i < TIRE_SIDEWALL_POINTS; i++) {
    const f = 1 - i / (TIRE_SIDEWALL_POINTS - 1);
    const radius = rim + 0.005 + (r - 0.012 - rim - 0.005) * f;
    const bulge = 0.012 * Math.sin(Math.PI * f);
    points.push(new Vector2(radius, h - 0.006 - 0.006 * (1 - f) + bulge));
  }
  return points;
}

function buildWheel(width: number, side: 1 | -1, materials: Record<MaterialKey, Material>, own: Disposer): WheelRig {
  const steer = new Group();
  const mount = new Group();
  // Las ruedas se modelan con el lado exterior hacia +X; las izquierdas se giran 180°.
  if (side < 0) mount.rotation.y = Math.PI;
  const spin = new Group();
  steer.add(mount);
  mount.add(spin);

  const { rimRadius: rim } = CAR_DIMENSIONS;
  const tire = own.own(new LatheGeometry(tireProfile(width), 72));
  tire.rotateZ(-Math.PI / 2);
  const cover = own.own(new CircleGeometry(rim - 0.004, 48));
  cover.rotateY(Math.PI / 2);
  cover.translate(width / 2 - 0.02, 0, 0);
  const barrel = own.own(new CylinderGeometry(rim - 0.002, rim - 0.002, width - 0.03, 40, 1, true));
  barrel.rotateZ(Math.PI / 2);
  const inner = own.own(new CircleGeometry(rim, 32));
  inner.rotateY(-Math.PI / 2);
  inner.translate(-width / 2 + 0.03, 0, 0);

  spin.add(new Mesh(tire, materials.tire), new Mesh(cover, materials.cover), new Mesh(inner, materials.dark));
  const barrelMesh = new Mesh(barrel, materials.metal);
  spin.add(barrelMesh);

  // Toma de freno: no gira con la rueda.
  const duct = own.own(new CylinderGeometry(0.15, 0.17, width * 0.45, 24));
  duct.rotateZ(Math.PI / 2);
  duct.translate(-width * 0.2, 0, 0);
  mount.add(new Mesh(duct, materials.carbon));

  return { steer, spin, side };
}

// ─── Modelo ──────────────────────────────────────────────────────────────

export interface CarModelOptions {
  livery: LiveryConfig;
  /** Filtrado anisotrópico de las texturas (según la GPU). */
  anisotropy?: number;
}

export class CarModel {
  readonly root = new Group();
  readonly wheels: Readonly<Record<'fl' | 'fr' | 'rl' | 'rr', WheelRig>>;
  /** Piloto (casco): se oculta en la cámara cockpit. */
  readonly driver = new Group();
  private readonly drsPivot = new Group();
  private readonly lightMaterial: MeshStandardMaterial;
  private readonly own = new Disposer();

  constructor(options: CarModelOptions) {
    const anisotropy = options.anisotropy ?? 4;
    const materials = createMaterials(options.livery, anisotropy, this.own);
    this.lightMaterial = materials.light as MeshStandardMaterial;
    this.root.name = 'monoplaza';

    const batch = new PartBatch();
    this.buildBody(batch);
    this.buildFloor(batch);
    this.buildFrontWing(batch);
    this.buildRearWing(batch);
    this.buildHalo(batch);
    this.buildSuspension(batch);
    this.buildDetails(batch);
    for (const mesh of batch.build(materials, this.own)) this.root.add(mesh);

    this.buildDrsFlap(materials);
    this.buildDriver(materials);
    this.wheels = this.buildWheels(materials);

    this.root.traverse((object) => {
      if (object instanceof Mesh) {
        const decal = object.material === materials.number || object.material === materials.wordmark;
        object.castShadow = !decal;
        object.receiveShadow = true;
      }
    });
  }

  /** Ángulo de dirección de las ruedas delanteras (rad, positivo = izquierda). */
  setSteer(angle: number): void {
    this.wheels.fl.steer.rotation.y = angle;
    this.wheels.fr.steer.rotation.y = angle;
  }

  /** Apertura del DRS (0 cerrado – 1 abierto). */
  setDrs(open: number): void {
    this.drsPivot.rotation.x = 0.38 * clamp(open, 0, 1);
  }

  /** Intensidad de la luz trasera (0–1). */
  setRearLight(intensity: number): void {
    this.lightMaterial.emissiveIntensity = 0.3 + 5.5 * clamp(intensity, 0, 1);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.own.dispose();
  }

  // ─── Construcción ──────────────────────────────────────────────────────

  private buildBody(batch: PartBatch): void {
    const body = new LoftSurface(BODY_SECTIONS);
    batch.add('livery', body.build({ segmentsAlong: 90, segmentsAround: 48 }));

    const spine = new LoftSurface(SPINE_SECTIONS);
    batch.add('livery', spine.build({ segmentsAlong: 40, segmentsAround: 36 }));
    // Boca de la toma de aire.
    batch.add('dark', spine.buildCap(SPINE_SECTIONS[0]?.z ?? 0, -1, 0.62).translate(0, 0.02, -0.002));

    for (const sections of [SIDEPOD_SECTIONS, mirrorSections(SIDEPOD_SECTIONS)]) {
      const pod = new LoftSurface(sections);
      batch.add('livery', pod.build({ segmentsAlong: 40, segmentsAround: 36, capStart: false }));
      // Boca del radiador: tapa oscura un poco hacia adentro.
      batch.add('dark', pod.buildCap((sections[0]?.z ?? 0) + 0.02, -1, 0.93));
    }

    // Abertura del cockpit.
    batch.add('dark', body.buildPatch({ zFrom: -0.56, zTo: 0.03, tFrom: 0.395, tTo: 0.605, offset: 0.003 }));

    // Números: sobre el morro y a los lados de la cubierta del motor.
    batch.add(
      'number',
      body.buildPatch({ zFrom: -2.3, zTo: -1.95, tFrom: 0.4, tTo: 0.6, swapUV: true, segmentsAlong: 16 }),
      spine.buildPatch({ zFrom: 0.52, zTo: 0.86, tFrom: 0.17, tTo: 0.37, flipU: true }),
      spine.buildPatch({ zFrom: 0.52, zTo: 0.86, tFrom: 0.63, tTo: 0.83, flipV: true }),
    );

    // Logo del equipo en los pontones.
    const rightPod = new LoftSurface(SIDEPOD_SECTIONS);
    const leftPod = new LoftSurface(mirrorSections(SIDEPOD_SECTIONS));
    batch.add(
      'wordmark',
      rightPod.buildPatch({ zFrom: -0.34, zTo: 0.5, tFrom: 0.18, tTo: 0.34, flipU: true, segmentsAlong: 20 }),
      leftPod.buildPatch({ zFrom: -0.34, zTo: 0.5, tFrom: 0.66, tTo: 0.82, flipV: true, segmentsAlong: 20 }),
    );
  }

  private buildFloor(batch: PartBatch): void {
    const half: Array<[number, number]> = [
      [0.26, -1.35],
      [0.34, -1.1],
      [0.55, -0.75],
      [0.74, -0.45],
      [0.78, -0.2],
      [0.78, 0.9],
      [0.72, 1.3],
      [0.58, 1.48],
      [0.5, 1.55],
      [0.5, 2.05],
    ];
    const outline = [...half, ...[...half].reverse().map(([x, z]): [number, number] => [-x, z])];
    const shape = new Shape(outline.map(([x, z]) => new Vector2(x, z)));
    const floor = new ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false });
    // Local Y → Z del auto; la extrusión baja desde y = 0.06.
    floor.rotateX(Math.PI / 2);
    floor.translate(0, 0.06, 0);
    batch.add('carbonMatte', floor);

    // Borde levantado del fondo plano y difusor con aletas.
    batch.addMirrored('dark', box(0.012, 0.07, 1.1, 0.775, 0.085, 0.35));
    batch.add('carbonMatte', rod(new Vector3(0, 0.06, 1.45), new Vector3(0, 0.27, 2.12), 0.96, 0.012));
    for (const x of [0.16, 0.36]) {
      batch.addMirrored('carbonMatte', plate([[1.5, 0.06], [2.12, 0.06], [2.12, 0.27], [1.5, 0.07]], x, 0.01));
    }
  }

  private buildFrontWing(batch: PartBatch): void {
    // Plano principal de lado a lado; flaps a cada lado del morro.
    batch.add('carbon', wingElement(0.3, -2.98, 0.07, 4, -0.95, 0.95));
    const flaps: Array<[number, number, number, number, MaterialKey]> = [
      [0.2, -2.72, 0.11, 14, 'carbon'],
      [0.17, -2.57, 0.16, 24, 'primary'],
      [0.14, -2.45, 0.21, 34, 'primary'],
    ];
    for (const [chord, z, y, angle, material] of flaps) {
      batch.addMirrored(material, wingElement(chord, z, y, angle, 0.15, 0.95));
    }
    // Placas laterales y soportes del morro.
    const endplate: Array<[number, number]> = [
      [-3.0, 0.03],
      [-2.4, 0.03],
      [-2.34, 0.1],
      [-2.36, 0.3],
      [-2.55, 0.31],
      [-2.95, 0.14],
    ];
    batch.addMirrored('primary', plate(endplate, 0.95, 0.012));
    batch.addMirrored('carbon', plate([[-2.9, 0.09], [-2.66, 0.09], [-2.66, 0.14], [-2.9, 0.13]], 0.055, 0.012));
  }

  private buildRearWing(batch: PartBatch): void {
    batch.add('secondary', wingElement(0.26, 2.36, 0.84, 10, -0.485, 0.485));
    // Viga inferior (beam wing).
    batch.add('carbon', wingElement(0.14, 2.4, 0.36, 8, -0.4, 0.4), wingElement(0.12, 2.5, 0.42, 18, -0.4, 0.4));
    // Placas laterales con el logo del equipo.
    const endplate: Array<[number, number]> = [
      [2.26, 0.62],
      [2.33, 0.56],
      [2.7, 0.6],
      [2.78, 0.7],
      [2.76, 1.02],
      [2.44, 1.03],
      [2.3, 0.94],
    ];
    batch.addMirrored('endplate', plate(endplate, 0.49, 0.012));
    // Soporte central "cuello de cisne".
    batch.add('carbon', plate([[2.12, 0.3], [2.3, 0.3], [2.52, 0.86], [2.4, 0.86]], 0, 0.02));
    // Luz trasera.
    batch.add('light', box(0.09, 0.05, 0.02, 0, 0.265, 2.395));
  }

  private buildDrsFlap(materials: Record<MaterialKey, Material>): void {
    const chord = 0.2;
    const angle = 30;
    const zLE = 2.47;
    const yLE = 0.93;
    const rad = (angle * Math.PI) / 180;
    // Pivote en el borde de fuga: al abrir, el borde de ataque sube.
    const teZ = zLE + Math.cos(rad) * chord;
    const teY = yLE + Math.sin(rad) * chord;
    const geometry = this.own.own(wingElement(chord, zLE, yLE, angle, -0.485, 0.485));
    geometry.translate(0, -teY, -teZ);
    const flap = new Mesh(geometry, materials.secondary);
    this.drsPivot.position.set(0, teY, teZ);
    this.drsPivot.add(flap);
    this.root.add(this.drsPivot);
  }

  private buildHalo(batch: PartBatch): void {
    const right: Array<[number, number, number]> = [
      [0.26, 0.6, 0.12],
      [0.265, 0.74, 0.05],
      [0.25, 0.81, -0.1],
      [0.2, 0.835, -0.28],
      [0.1, 0.84, -0.4],
    ];
    const path = [
      ...right.map(([x, y, z]) => new Vector3(x, y, z)),
      new Vector3(0, 0.84, -0.44),
      ...[...right].reverse().map(([x, y, z]) => new Vector3(-x, y, z)),
    ];
    batch.add('gloss', new TubeGeometry(new CatmullRomCurve3(path), 64, 0.022, 10, false));
    const strut = new CatmullRomCurve3([
      new Vector3(0, 0.84, -0.44),
      new Vector3(0, 0.78, -0.52),
      new Vector3(0, 0.68, -0.6),
      new Vector3(0, 0.6, -0.66),
    ]);
    batch.add('gloss', new TubeGeometry(strut, 16, 0.02, 10, false));
  }

  private buildSuspension(batch: PartBatch): void {
    const { frontAxleZ: fz, rearAxleZ: rz } = CAR_DIMENSIONS;
    const arms = (z: number, chassisX: number, uprightX: number, upperY: number, lowerY: number): void => {
      for (const dz of [-0.22, 0.22]) {
        batch.addMirrored('carbon', rod(new Vector3(chassisX, upperY - 0.02, z + dz), new Vector3(uprightX, upperY + 0.07, z), 0.045, 0.014));
        batch.addMirrored('carbon', rod(new Vector3(chassisX, lowerY, z + dz), new Vector3(uprightX, lowerY + 0.02, z), 0.045, 0.014));
      }
      // Pushrod / pullrod.
      batch.addMirrored('carbon', rod(new Vector3(uprightX - 0.04, lowerY + 0.03, z + 0.02), new Vector3(chassisX + 0.04, upperY + 0.08, z + 0.1), 0.03, 0.02));
      // Mangueta dentro de la llanta.
      batch.addMirrored('metal', box(0.05, 0.3, 0.08, uprightX + 0.02, 0.36, z));
    };
    arms(fz, 0.14, 0.64, 0.4, 0.22);
    arms(rz, 0.11, 0.6, 0.38, 0.2);
  }

  private buildDetails(batch: PartBatch): void {
    // Espejos: brazo, carcasa y vidrio mirando hacia atrás.
    batch.addMirrored('carbon', rod(new Vector3(0.27, 0.57, -0.52), new Vector3(0.43, 0.635, -0.6), 0.02, 0.012));
    const housing = new LoftSurface(MIRROR_SECTIONS);
    batch.addMirrored('primary', housing.build({ segmentsAlong: 10, segmentsAround: 24 }));
    const glass = new PlaneGeometry(0.13, 0.042);
    glass.translate(0.47, 0.645, -0.579);
    batch.addMirrored('mirror', glass);

    // Aleta de tiburón sobre la cubierta del motor.
    batch.add(
      'primary',
      plate([[0.9, 0.84], [1.5, 0.69], [1.8, 0.56], [1.74, 0.5], [1.0, 0.7]], 0, 0.006),
    );
    // T-cam sobre la toma de aire.
    batch.add('gloss', box(0.12, 0.028, 0.05, 0, 0.985, 0.22));
    batch.addMirrored('gloss', box(0.012, 0.05, 0.04, 0.06, 0.97, 0.22));
  }

  private buildDriver(materials: Record<MaterialKey, Material>): void {
    const shell = this.own.own(new SphereGeometry(0.125, 40, 28));
    shell.scale(0.95, 0.95, 1.08);
    const helmet = new Mesh(shell, materials.helmet);
    // Visera: franja de la esfera mirando hacia adelante.
    const visorGeometry = this.own.own(
      // phi = 1,5π mira hacia −Z (adelante): la visera cubre ±60° alrededor.
      new SphereGeometry(0.1265, 40, 12, Math.PI * 1.17, Math.PI * 0.66, Math.PI * 0.36, Math.PI * 0.18),
    );
    visorGeometry.scale(0.95, 0.95, 1.08);
    const visor = new Mesh(visorGeometry, materials.visor);
    this.driver.add(helmet, visor);
    this.driver.position.set(0, 0.735, -0.14);
    this.driver.rotation.x = 0.08;
    this.root.add(this.driver);
  }

  private buildWheels(materials: Record<MaterialKey, Material>): Record<'fl' | 'fr' | 'rl' | 'rr', WheelRig> {
    const d = CAR_DIMENSIONS;
    const place = (rig: WheelRig, x: number, z: number): WheelRig => {
      rig.steer.position.set(x, d.wheelRadius, z);
      this.root.add(rig.steer);
      return rig;
    };
    return {
      fl: place(buildWheel(d.frontTireWidth, -1, materials, this.own), -d.frontTrackHalf, d.frontAxleZ),
      fr: place(buildWheel(d.frontTireWidth, 1, materials, this.own), d.frontTrackHalf, d.frontAxleZ),
      rl: place(buildWheel(d.rearTireWidth, -1, materials, this.own), -d.rearTrackHalf, d.rearAxleZ),
      rr: place(buildWheel(d.rearTireWidth, 1, materials, this.own), d.rearTrackHalf, d.rearAxleZ),
    };
  }
}
