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
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type MeshPhysicalMaterialParameters,
  PlaneGeometry,
  Shape,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
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
  createRimTexture,
  createSponsorSheet,
  createTireTexture,
  createWordmarkTexture,
  SPONSORS,
  TIRE_SIDEWALL_POINTS,
} from './carTextures';
import type { Finish, WingShape } from '../progression/items';
import type { LiveryConfig, RimsLook } from './livery';
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
  // Morro ancho y bajo, apoyado sobre el plano principal del alerón (como los autos actuales).
  { z: -2.96, halfWidth: 0.075, bottom: 0.095, top: 0.16, topRound: 2.2, bottomRound: 2.6 },
  { z: -2.72, halfWidth: 0.1, bottom: 0.105, top: 0.22, topRound: 2.3, bottomRound: 2.8 },
  { z: -2.4, halfWidth: 0.12, bottom: 0.12, top: 0.3, topRound: 2.4, bottomRound: 3 },
  { z: -2.05, halfWidth: 0.14, bottom: 0.14, top: 0.385, topRound: 2.4, bottomRound: 3.2 },
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
  | 'sponsor'
  | 'endplate'
  | 'tire'
  | 'cover'
  | 'helmet'
  | 'visor';

/** Parámetros de la pintura según el acabado elegido en el garaje. */
const FINISHES: Readonly<Record<Finish, Partial<MeshPhysicalMaterialParameters>>> = {
  gloss: { roughness: 0.32, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.09, iridescence: 0, envMapIntensity: 1 },
  matte: { roughness: 0.78, metalness: 0.05, clearcoat: 0, clearcoatRoughness: 0.5, iridescence: 0, envMapIntensity: 1 },
  satin: { roughness: 0.48, metalness: 0.75, clearcoat: 0.25, clearcoatRoughness: 0.4, iridescence: 0, envMapIntensity: 1.2 },
  metallic: { roughness: 0.26, metalness: 0.62, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 0, envMapIntensity: 1.2 },
  carbon: { roughness: 0.34, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 0, envMapIntensity: 1 },
  // Cromo: casi espejo, con más reflejo del entorno para que no se vea negro en lugares oscuros.
  chrome: { roughness: 0.1, metalness: 0.9, clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 0, envMapIntensity: 2.2 },
  pearl: {
    roughness: 0.24,
    metalness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    iridescence: 1,
    iridescenceIOR: 1.55,
    iridescenceThicknessRange: [180, 640],
    envMapIntensity: 1.2,
  },
};

/** Materiales pintados (los que cambian con el acabado). */
const PAINTED: readonly MaterialKey[] = ['livery', 'primary', 'secondary', 'endplate', 'helmet'];

/** Llantas de fábrica (tapa lisa) si la livery no dice otra cosa. */
function rimsOf(livery: LiveryConfig): RimsLook {
  return livery.rims ?? { spokes: 10, color: '#50545c', accent: livery.tireStripe, cover: true };
}

function createMaterials(own: Disposer): Record<MaterialKey, Material> {
  const carbonMap = own.own(createCarbonTexture(4));
  carbonMap.repeat.set(22, 22);

  const paint = { roughness: 0.32, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.09 };
  const decal = { transparent: true, polygonOffset: true, polygonOffsetFactor: -2, ...paint };

  const materials: Record<MaterialKey, Material> = {
    livery: new MeshPhysicalMaterial({ ...paint }),
    primary: new MeshPhysicalMaterial({ ...paint }),
    secondary: new MeshPhysicalMaterial({ ...paint }),
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
    number: new MeshPhysicalMaterial({ ...decal }),
    wordmark: new MeshPhysicalMaterial({ ...decal }),
    sponsor: new MeshPhysicalMaterial({ ...decal }),
    endplate: new MeshPhysicalMaterial({ ...paint }),
    tire: new MeshStandardMaterial({ roughness: 0.82, metalness: 0 }),
    cover: new MeshStandardMaterial({ roughness: 0.3, metalness: 0.85 }),
    helmet: new MeshPhysicalMaterial({ ...paint }),
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

/**
 * Aplica una livery a los materiales: texturas nuevas (las anteriores se
 * liberan con `own`), colores y el acabado de la pintura.
 */
function paintMaterials(materials: Record<MaterialKey, Material>, livery: LiveryConfig, anisotropy: number, own: Disposer): void {
  const tex = <T extends Texture>(t: T): T => own.own(t);
  const physical = (key: MaterialKey): MeshPhysicalMaterial => materials[key] as MeshPhysicalMaterial;
  const standard = (key: MaterialKey): MeshStandardMaterial => materials[key] as MeshStandardMaterial;
  physical('livery').map = tex(createLiveryTexture(livery, anisotropy));
  physical('primary').color.set(livery.primary);
  physical('secondary').color.set(livery.secondary);
  physical('number').map = tex(createNumberTexture(livery, anisotropy));
  physical('wordmark').map = tex(createWordmarkTexture(TEAM_WORDMARK, livery.accent, anisotropy, { outline: livery.secondary }));
  physical('sponsor').map = tex(createSponsorSheet(livery.accent, livery.secondary, anisotropy));
  physical('endplate').map = tex(
    createWordmarkTexture(TEAM_WORDMARK, livery.accent, anisotropy, { background: livery.secondary, stripe: livery.primary, scale: 0.62 }),
  );
  standard('tire').map = tex(createTireTexture(livery.tireStripe, TIRE_BRAND, anisotropy));
  const rims = rimsOf(livery);
  const cover = standard('cover');
  cover.map = tex(createRimTexture(rims, anisotropy));
  cover.roughness = rims.cover ? 0.3 : rims.color === '#e9eef3' ? 0.08 : 0.28;
  cover.metalness = rims.cover ? 0.85 : 0.8;
  physical('helmet').map = tex(createHelmetTexture(livery, anisotropy));
  // El acabado afecta la pintura del auto (el casco conserva su laca).
  const finish = FINISHES[livery.finish ?? 'gloss'];
  for (const key of PAINTED) {
    if (key === 'helmet') continue;
    physical(key).setValues(finish);
  }
  for (const material of Object.values(materials)) material.needsUpdate = true;
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
function extrudeAcrossX(shape: Shape, xFrom: number, xTo: number, curveSegments = 6): BufferGeometry {
  const geometry = new ExtrudeGeometry(shape, { depth: xTo - xFrom, bevelEnabled: false, curveSegments });
  // Local X → Z del auto, local Z (extrusión) → −X del auto.
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(xTo, 0, 0);
  return geometry;
}

/** Elemento de alerón: perfil de `chord` con borde de ataque en (zLE, yLE) y ángulo `angle` (cola arriba). */
function wingElement(
  chord: number,
  zLE: number,
  yLE: number,
  angleDeg: number,
  xFrom: number,
  xTo: number,
  points = 14,
): BufferGeometry {
  const geometry = extrudeAcrossX(airfoilShape(chord, 0.12, -0.06, 0.4, points), xFrom, xTo);
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

/** Escala las UV de una pieza (para ajustar la densidad de una textura que se repite). */
function scaleUv(geometry: BufferGeometry, u: number, v: number): void {
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v);
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

/** Invierte la U de una pieza con UV planares (para la copia espejada de una placa con logo). */
function flipPlanarU(geometry: BufferGeometry): BufferGeometry {
  const uv = geometry.getAttribute('uv');
  if (!uv) return geometry;
  for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
  uv.needsUpdate = true;
  return geometry;
}

/** Contorno de un perfil de alerón (cuerda 1): borde de fuga por arriba → ataque → fuga por abajo. */
function airfoilLoop(points: number): Vector2[] {
  const shape = airfoilShape(1, 0.12, -0.06, 0.4, points);
  const loop = shape.getPoints(1);
  // `getPoints` repite el primer punto al cerrar: el borde de fuga queda abierto (aristas vivas).
  const first = loop[0];
  const last = loop[loop.length - 1];
  if (first && last && first.distanceTo(last) < 1e-6) loop.pop();
  return loop;
}

/** Estación de un elemento de alerón: en `x`, borde de ataque en (z, y), cuerda y ángulo (cola arriba, °). */
interface WingStation {
  x: number;
  z: number;
  y: number;
  chord: number;
  angle: number;
}

/**
 * Elemento de alerón continuo que puede subir, girar y cambiar de cuerda a lo
 * largo de la envergadura (las puntas de un alerón delantero actual se
 * enroscan hacia arriba). Tapas opcionales en los extremos. UV: u a lo largo
 * de la envergadura, v alrededor del perfil (escaladas al tamaño real para el carbono).
 */
function sweptWing(stations: readonly WingStation[], points: number, caps: { start: boolean; end: boolean }): BufferGeometry {
  const loop = airfoilLoop(points);
  const ring = loop.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const first = stations[0];
  const last = stations[stations.length - 1];
  const span = Math.abs((last?.x ?? 0) - (first?.x ?? 0)) || 1;
  const place = (station: WingStation, p: Vector2): [number, number, number] => {
    const a = (station.angle * Math.PI) / 180;
    const cz = p.x * station.chord;
    const cy = p.y * station.chord;
    return [station.x, station.y + cy * Math.cos(a) + cz * Math.sin(a), station.z + cz * Math.cos(a) - cy * Math.sin(a)];
  };
  // Densidad del tejido de carbono (≈ 0,47 unidades de UV por metro, ver el halo).
  const uScale = span * 0.47;
  stations.forEach((station) => {
    loop.forEach((p, j) => {
      positions.push(...place(station, p));
      uvs.push((Math.abs(station.x - (first?.x ?? 0)) / span) * uScale, (j / (ring - 1)) * station.chord * 2 * 0.47);
    });
  });
  for (let i = 0; i < stations.length - 1; i++) {
    for (let j = 0; j < ring - 1; j++) {
      const a = i * ring + j;
      const b = a + ring;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  /** Tapa plana del extremo; `facesPlusX` según hacia dónde mira (el contorno va antihorario en (z, y)). */
  const capAt = (station: WingStation | undefined, facesPlusX: boolean): void => {
    if (!station) return;
    const base = positions.length / 3;
    const center = place(station, new Vector2(0.4, -0.03));
    positions.push(...center);
    uvs.push(0, 0);
    loop.forEach((p) => {
      positions.push(...place(station, p));
      uvs.push(0, 0);
    });
    for (let j = 0; j < ring - 1; j++) {
      if (facesPlusX) indices.push(base, base + 2 + j, base + 1 + j);
      else indices.push(base, base + 1 + j, base + 2 + j);
    }
  };
  // El sentido de la tapa depende de hacia qué lado avanza la envergadura.
  const increasing = (last?.x ?? 0) >= (first?.x ?? 0);
  if (caps.start) capAt(first, !increasing);
  if (caps.end) capAt(last, increasing);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Lleva las UV (0–1) de una calcomanía a la fila `row` de la hoja de patrocinadores. */
function sponsorRow(geometry: BufferGeometry, row: number): BufferGeometry {
  const uv = geometry.getAttribute('uv');
  const rows = SPONSORS.length;
  for (let i = 0; i < uv.count; i++) uv.setY(i, (rows - 1 - row + uv.getY(i)) / rows);
  uv.needsUpdate = true;
  return geometry;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
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

function buildWheel(
  width: number,
  side: 1 | -1,
  materials: Record<MaterialKey, Material>,
  own: Disposer,
  seg: (full: number, min: number) => number,
): WheelRig {
  const steer = new Group();
  const mount = new Group();
  // Las ruedas se modelan con el lado exterior hacia +X; las izquierdas se giran 180°.
  if (side < 0) mount.rotation.y = Math.PI;
  const spin = new Group();
  steer.add(mount);
  mount.add(spin);

  const { rimRadius: rim } = CAR_DIMENSIONS;
  const tire = own.own(new LatheGeometry(tireProfile(width), seg(72, 16)));
  tire.rotateZ(-Math.PI / 2);
  const cover = own.own(new CircleGeometry(rim - 0.004, seg(48, 12)));
  cover.rotateY(Math.PI / 2);
  cover.translate(width / 2 - 0.02, 0, 0);
  const barrel = own.own(new CylinderGeometry(rim - 0.002, rim - 0.002, width - 0.03, seg(40, 10), 1, true));
  barrel.rotateZ(Math.PI / 2);
  const inner = own.own(new CircleGeometry(rim, seg(32, 10)));
  inner.rotateY(-Math.PI / 2);
  inner.translate(-width / 2 + 0.03, 0, 0);

  spin.add(new Mesh(tire, materials.tire), new Mesh(cover, materials.cover), new Mesh(inner, materials.dark));
  const barrelMesh = new Mesh(barrel, materials.metal);
  spin.add(barrelMesh);

  // Toma de freno: no gira con la rueda.
  const duct = own.own(new CylinderGeometry(0.15, 0.17, width * 0.45, seg(24, 8)));
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
  /**
   * Nivel de detalle de la geometría (0–1): 1 = el auto del jugador y del
   * garaje; los rivales usan versiones más livianas (ver `RivalFleet`).
   */
  detail?: number;
}

export class CarModel {
  readonly root = new Group();
  readonly wheels: Readonly<Record<'fl' | 'fr' | 'rl' | 'rr', WheelRig>>;
  /** Piloto (casco): se oculta en la cámara cockpit. */
  readonly driver = new Group();
  /** Pivote del flap del DRS (lo copian los rivales instanciados). */
  readonly drsPivot = new Group();
  private readonly lightMaterial: MeshStandardMaterial;
  private readonly own = new Disposer();
  private readonly detail: number;
  private readonly anisotropy: number;
  private readonly materials: Record<MaterialKey, Material>;
  /** Texturas de la livery actual (se cambian enteras al pintar en el garaje). */
  private liveryOwn = new Disposer();
  /** Alerón trasero aparte: su forma cambia en el garaje. */
  private readonly rearWing = new Group();
  private rearWingOwn = new Disposer();
  private wingShape: WingShape;

  constructor(options: CarModelOptions) {
    this.anisotropy = options.anisotropy ?? 4;
    this.detail = clamp(options.detail ?? 1, 0.05, 1);
    const materials = createMaterials(this.own);
    this.materials = materials;
    paintMaterials(materials, options.livery, this.anisotropy, this.liveryOwn);
    this.own.add(() => this.liveryOwn.dispose());
    this.own.add(() => this.rearWingOwn.dispose());
    this.lightMaterial = materials.light as MeshStandardMaterial;
    this.root.name = 'monoplaza';

    const batch = new PartBatch();
    this.buildBody(batch);
    this.buildFloor(batch);
    this.buildFrontWing(batch);
    this.wingShape = options.livery.wing ?? 'standard';
    this.buildRearWing(this.wingShape);
    this.root.add(this.rearWing);
    // Luz trasera de lluvia.
    batch.add('light', box(0.09, 0.05, 0.02, 0, 0.265, 2.395));
    this.buildHalo(batch);
    this.buildSuspension(batch);
    this.buildDetails(batch);
    for (const mesh of batch.build(materials, this.own)) this.root.add(mesh);

    this.buildDrsFlap(materials);
    this.buildDriver(materials);
    this.wheels = this.buildWheels(materials);

    this.applyShadowFlags(this.root);
  }

  /**
   * Cambia la decoración en vivo (garaje): texturas, colores, acabado,
   * llantas, casco y, si cambió, la forma del alerón trasero.
   */
  setLivery(livery: LiveryConfig): void {
    const previous = this.liveryOwn;
    this.liveryOwn = new Disposer();
    paintMaterials(this.materials, livery, this.anisotropy, this.liveryOwn);
    previous.dispose();
    const shape = livery.wing ?? 'standard';
    if (shape !== this.wingShape) {
      this.wingShape = shape;
      this.buildRearWing(shape);
    }
  }

  private applyShadowFlags(root: Group): void {
    root.traverse((object) => {
      if (object instanceof Mesh) {
        const decal =
          object.material === this.materials.number || object.material === this.materials.wordmark || object.material === this.materials.sponsor;
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

  /** Segmentos de una pieza curva según el nivel de detalle (nunca menos de `min`). */
  private readonly seg = (full: number, min: number): number => Math.max(min, Math.round(full * this.detail));

  /** Puntos del perfil de los alerones según el detalle. */
  private get foil(): number {
    return this.seg(14, 5);
  }

  private buildBody(batch: PartBatch): void {
    const body = new LoftSurface(BODY_SECTIONS);
    batch.add('livery', body.build({ segmentsAlong: this.seg(90, 14), segmentsAround: this.seg(48, 10) }));

    const spine = new LoftSurface(SPINE_SECTIONS);
    batch.add('livery', spine.build({ segmentsAlong: this.seg(40, 8), segmentsAround: this.seg(36, 8) }));
    // Boca de la toma de aire.
    batch.add('dark', spine.buildCap(SPINE_SECTIONS[0]?.z ?? 0, -1, 0.62).translate(0, 0.02, -0.002));

    for (const sections of [SIDEPOD_SECTIONS, mirrorSections(SIDEPOD_SECTIONS)]) {
      const pod = new LoftSurface(sections);
      batch.add('livery', pod.build({ segmentsAlong: this.seg(40, 8), segmentsAround: this.seg(36, 8), capStart: false }));
      // Boca del radiador: tapa oscura un poco hacia adentro.
      batch.add('dark', pod.buildCap((sections[0]?.z ?? 0) + 0.02, -1, 0.93));
    }

    // Abertura del cockpit: carbono sin laca (es lo que el piloto ve delante del volante;
    // laqueado, desde el ojo del piloto reflejaba el cielo como si fuera cromo).
    const opening = body.buildPatch({ zFrom: -0.56, zTo: 0.03, tFrom: 0.395, tTo: 0.605, offset: 0.003 });
    scaleUv(opening, 0.28, 0.22);
    batch.add('carbonMatte', opening);

    // Números: sobre el morro y a los lados de la cubierta del motor.
    batch.add(
      'number',
      body.buildPatch({ zFrom: -2.3, zTo: -1.95, tFrom: 0.4, tTo: 0.6, swapUV: true, segmentsAlong: 16 }),
      spine.buildPatch({ zFrom: 0.52, zTo: 0.86, tFrom: 0.17, tTo: 0.37, flipU: true }),
      spine.buildPatch({ zFrom: 0.52, zTo: 0.86, tFrom: 0.63, tTo: 0.83, flipV: true }),
    );

    // Patrocinadores: costados del morro (detrás de la rueda delantera) y de la cubierta del motor.
    // Lado derecho con U invertida y lado izquierdo con V invertida (como el logo de los pontones).
    batch.add(
      'sponsor',
      sponsorRow(body.buildPatch({ zFrom: -1.38, zTo: -0.84, tFrom: 0.27, tTo: 0.37, flipU: true }), 0),
      sponsorRow(body.buildPatch({ zFrom: -1.38, zTo: -0.84, tFrom: 0.63, tTo: 0.73, flipV: true }), 0),
      sponsorRow(body.buildPatch({ zFrom: 0.98, zTo: 1.42, tFrom: 0.27, tTo: 0.36, flipU: true }), 1),
      sponsorRow(body.buildPatch({ zFrom: 0.98, zTo: 1.42, tFrom: 0.64, tTo: 0.73, flipV: true }), 1),
    );

    // Logo del equipo en los pontones.
    const rightPod = new LoftSurface(SIDEPOD_SECTIONS);
    const leftPod = new LoftSurface(mirrorSections(SIDEPOD_SECTIONS));
    batch.add(
      'wordmark',
      rightPod.buildPatch({ zFrom: -0.34, zTo: 0.5, tFrom: 0.18, tTo: 0.34, flipU: true, segmentsAlong: 20 }),
      leftPod.buildPatch({ zFrom: -0.34, zTo: 0.5, tFrom: 0.66, tTo: 0.82, flipV: true, segmentsAlong: 20 }),
    );
    // Y un patrocinador chico en la parte oscura, debajo del logo.
    batch.add(
      'sponsor',
      sponsorRow(rightPod.buildPatch({ zFrom: -0.12, zTo: 0.3, tFrom: 0.095, tTo: 0.16, flipU: true }), 3),
      sponsorRow(leftPod.buildPatch({ zFrom: -0.12, zTo: 0.3, tFrom: 0.84, tTo: 0.905, flipV: true }), 3),
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
    // Cuatro elementos de carbono (el de arriba, del color del equipo). Hacia las
    // puntas suben, giran y se enroscan hasta la placa lateral, como en un alerón actual.
    const foil = this.foil;
    const along = this.detail < 0.5 ? [0, 0.36, 0.66, 0.84, 0.95] : [0, 0.18, 0.36, 0.52, 0.66, 0.76, 0.84, 0.9, 0.95];
    const rollUp = (x: number): number => smoothstep(0.5, 0.95, x);
    // Plano principal, de lado a lado: algo más alto bajo el morro (sección neutra).
    const main = along.map((x) => ({
      x,
      z: -3.0 + 0.02 * rollUp(x),
      y: 0.06 + 0.015 * (1 - smoothstep(0.12, 0.34, x)) + 0.012 * rollUp(x),
      chord: 0.32 - 0.03 * rollUp(x),
      angle: 2 + 5 * rollUp(x),
    }));
    batch.addMirrored('carbon', sweptWing(main, foil, { start: false, end: true }));
    // Flaps: nacen al costado del morro.
    const flapX = [0.12, ...along.filter((x) => x > 0.2)];
    const flaps: Array<{ chord: number; z: number; y: number; rise: number; angle: number; turn: number; material: MaterialKey }> = [
      { chord: 0.2, z: -2.74, y: 0.105, rise: 0.05, angle: 12, turn: 10, material: 'carbon' },
      { chord: 0.17, z: -2.6, y: 0.155, rise: 0.08, angle: 24, turn: 14, material: 'carbon' },
      { chord: 0.14, z: -2.48, y: 0.235, rise: 0.11, angle: 34, turn: 18, material: 'primary' },
    ];
    for (const flap of flaps) {
      const stations = flapX.map((x) => ({
        x,
        z: flap.z + 0.025 * rollUp(x),
        y: flap.y + flap.rise * rollUp(x),
        chord: flap.chord,
        angle: flap.angle + flap.turn * rollUp(x),
      }));
      batch.addMirrored(flap.material, sweptWing(stations, foil, { start: true, end: true }));
    }
    // Placa lateral baja y curva (cubre las puntas enroscadas), de carbono.
    const endplate: Array<[number, number]> = [
      [-3.03, 0.03],
      [-2.36, 0.03],
      [-2.29, 0.1],
      [-2.31, 0.46],
      [-2.42, 0.49],
      [-2.62, 0.38],
      [-2.86, 0.19],
      [-3.03, 0.11],
    ];
    const plateGeometry = plate(endplate, 0.955, 0.012);
    scaleUv(plateGeometry, 0.35, 0.25);
    batch.addMirrored('carbon', plateGeometry);
    // Patrocinador en la cara externa de cada placa (la copia izquierda invierte U para leerse bien).
    const decal = sponsorRow(new PlaneGeometry(0.4, 0.1), 2);
    decal.rotateY(Math.PI / 2);
    decal.translate(0.9625, 0.16, -2.7);
    batch.add('sponsor', decal, flipPlanarU(mirrorX(decal)));
  }

  /** Alerón trasero según la forma elegida (se reconstruye al cambiarla en el garaje). */
  private buildRearWing(shape: WingShape): void {
    this.rearWingOwn.dispose();
    this.rearWingOwn = new Disposer();
    this.rearWing.clear();
    const batch = new PartBatch();
    const foil = this.foil;
    // Placas laterales con el logo del equipo (más altas en "alta carga", en punta en "hoja").
    const endplate: Array<[number, number]> =
      shape === 'tall'
        ? [[2.26, 0.62], [2.33, 0.56], [2.7, 0.6], [2.8, 0.72], [2.78, 1.14], [2.44, 1.16], [2.3, 1.02]]
        : shape === 'blade'
          ? [[2.22, 0.6], [2.33, 0.56], [2.72, 0.62], [2.84, 1.08], [2.5, 1.0], [2.3, 0.92]]
          : [[2.26, 0.62], [2.33, 0.56], [2.7, 0.6], [2.78, 0.7], [2.76, 1.02], [2.44, 1.03], [2.3, 0.94]];
    // Vista desde afuera, en la placa derecha el auto avanza hacia la derecha de la imagen:
    // ésa invierte U; la izquierda (reflejada) ya se lee bien desde su lado.
    const rightPlate = plate(endplate, 0.49, 0.012);
    const leftPlate = mirrorX(rightPlate);
    batch.add('endplate', flipPlanarU(rightPlate), leftPlate);
    // Viga inferior (beam wing), igual en todas.
    batch.add('carbon', wingElement(0.14, 2.4, 0.36, 8, -0.4, 0.4, foil), wingElement(0.12, 2.5, 0.42, 18, -0.4, 0.4, foil));
    const pylon = (): void => {
      batch.add('carbon', plate([[2.12, 0.3], [2.3, 0.3], [2.52, 0.86], [2.4, 0.86]], 0, 0.02));
    };
    switch (shape) {
      case 'standard':
        batch.add('secondary', wingElement(0.26, 2.36, 0.84, 10, -0.485, 0.485, foil));
        pylon();
        break;
      case 'tall':
        batch.add('secondary', wingElement(0.3, 2.34, 0.82, 17, -0.485, 0.485, foil), wingElement(0.16, 2.3, 1.06, 24, -0.485, 0.485, foil));
        pylon();
        break;
      case 'spoon':
        // Plano en cuchara: el centro más bajo y con menos ángulo que las puntas.
        batch.add(
          'secondary',
          wingElement(0.28, 2.36, 0.8, 5, -0.2, 0.2, foil),
          wingElement(0.26, 2.36, 0.83, 8, 0.2, 0.34, foil),
          wingElement(0.26, 2.36, 0.83, 8, -0.34, -0.2, foil),
          wingElement(0.24, 2.36, 0.86, 11, 0.34, 0.485, foil),
          wingElement(0.24, 2.36, 0.86, 11, -0.485, -0.34, foil),
        );
        pylon();
        break;
      case 'twin':
        batch.add('secondary', wingElement(0.24, 2.36, 0.86, 10, -0.485, 0.485, foil), wingElement(0.2, 2.4, 0.62, 12, -0.485, 0.485, foil));
        pylon();
        break;
      case 'swan': {
        batch.add('secondary', wingElement(0.26, 2.36, 0.84, 10, -0.485, 0.485, foil));
        // Cuello de cisne: dos soportes que suben por detrás y toman el plano desde arriba.
        for (const x of [-0.13, 0.13]) {
          const neck = new CatmullRomCurve3([
            new Vector3(x, 0.3, 2.16),
            new Vector3(x, 0.72, 2.3),
            new Vector3(x, 1.0, 2.46),
            new Vector3(x, 1.02, 2.62),
            new Vector3(x, 0.9, 2.62),
          ]);
          batch.add('carbon', new TubeGeometry(neck, this.seg(24, 6), 0.018, this.seg(8, 4), false));
        }
        break;
      }
      case 'blade':
        batch.add('secondary', wingElement(0.2, 2.4, 0.86, 6, -0.485, 0.485, foil));
        pylon();
        break;
    }
    for (const mesh of batch.build(this.materials, this.rearWingOwn)) this.rearWing.add(mesh);
    this.applyShadowFlags(this.rearWing);
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
    const geometry = this.own.own(wingElement(chord, zLE, yLE, angle, -0.485, 0.485, this.foil));
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
    // Fibra de carbono laqueada, como el halo real: las UV del tubo (0–1 a lo largo y
    // alrededor) se escalan a su tamaño para que el tejido tenga celdas de ~6 mm.
    const hoop = new TubeGeometry(new CatmullRomCurve3(path), this.seg(64, 10), 0.022, this.seg(10, 4), false);
    scaleUv(hoop, 1.05, 0.07);
    batch.add('carbon', hoop);
    const strut = new CatmullRomCurve3([
      new Vector3(0, 0.84, -0.44),
      new Vector3(0, 0.78, -0.52),
      new Vector3(0, 0.68, -0.6),
      new Vector3(0, 0.6, -0.66),
    ]);
    const pillar = new TubeGeometry(strut, this.seg(16, 3), 0.02, this.seg(10, 4), false);
    scaleUv(pillar, 0.2, 0.06);
    batch.add('carbon', pillar);
  }

  private buildSuspension(batch: PartBatch): void {
    const { frontAxleZ: fz, rearAxleZ: rz } = CAR_DIMENSIONS;
    const arms = (z: number, chassisX: number, uprightX: number, upperY: number, lowerY: number): void => {
      for (const dz of [-0.22, 0.22]) {
        // Brazos anchos y planos (perfil aerodinámico), como en los autos actuales.
        batch.addMirrored('carbon', rod(new Vector3(chassisX, upperY - 0.02, z + dz), new Vector3(uprightX, upperY + 0.07, z), 0.068, 0.016));
        batch.addMirrored('carbon', rod(new Vector3(chassisX, lowerY, z + dz), new Vector3(uprightX, lowerY + 0.02, z), 0.068, 0.016));
      }
      // Pushrod / pullrod.
      batch.addMirrored('carbon', rod(new Vector3(uprightX - 0.04, lowerY + 0.03, z + 0.02), new Vector3(chassisX + 0.04, upperY + 0.08, z + 0.1), 0.04, 0.026));
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
    batch.addMirrored('primary', housing.build({ segmentsAlong: this.seg(10, 3), segmentsAround: this.seg(24, 6) }));
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
    const shell = this.own.own(new SphereGeometry(0.125, this.seg(40, 8), this.seg(28, 6)));
    shell.scale(0.95, 0.95, 1.08);
    const helmet = new Mesh(shell, materials.helmet);
    // Visera: franja de la esfera mirando hacia adelante.
    const visorGeometry = this.own.own(
      // phi = 1,5π mira hacia −Z (adelante): la visera cubre ±60° alrededor.
      new SphereGeometry(0.1265, this.seg(40, 6), this.seg(12, 3), Math.PI * 1.17, Math.PI * 0.66, Math.PI * 0.36, Math.PI * 0.18),
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
      fl: place(buildWheel(d.frontTireWidth, -1, materials, this.own, this.seg), -d.frontTrackHalf, d.frontAxleZ),
      fr: place(buildWheel(d.frontTireWidth, 1, materials, this.own, this.seg), d.frontTrackHalf, d.frontAxleZ),
      rl: place(buildWheel(d.rearTireWidth, -1, materials, this.own, this.seg), -d.rearTrackHalf, d.rearAxleZ),
      rr: place(buildWheel(d.rearTireWidth, 1, materials, this.own, this.seg), d.rearTrackHalf, d.rearAxleZ),
    };
  }
}
