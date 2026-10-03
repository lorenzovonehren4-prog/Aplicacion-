/**
 * Árboles del parque: tres especies (eucalipto, árbol de copa redonda y
 * ciprés). La copa es un manojo de "tarjetas" con una textura de hojas
 * recortada (alpha test), sobre un núcleo oscuro que la hace ver llena: de
 * cerca se ven hojas de verdad, no bloques.
 *
 * El aspecto sale de cómo se ilumina:
 * - Normales "de copa": cada vértice apunta desde el centro de su bulto y de
 *   la copa entera, así la luz envuelve la copa suave (y las tarjetas vistas
 *   de atrás no se oscurecen: el sombreador ignora de qué lado se las mira).
 * - Oclusión horneada en el color: más oscuro abajo y hacia adentro.
 * - Viento: la copa se mece un poco (más arriba, más), con una fase distinta
 *   para cada árbol según dónde está.
 * - De lejos las hojas no se "desgastan": el recorte compensa lo que el
 *   mipmap promedia (ver `createTreeMaterial`).
 *
 * Todo el árbol (tronco, núcleo y hojas) usa un solo material: los troncos y
 * el núcleo leen un rincón opaco y blanco del atlas.
 */

import {
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  IcosahedronGeometry,
  MeshDepthMaterial,
  MeshStandardMaterial,
  Quaternion,
  RGBADepthPacking,
  Vector3,
  type IUniform,
  type Texture,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Random } from '../../core/utils/random';
import { LEAF_ATLAS_CARD_UV, LEAF_ATLAS_SIZE, LEAF_ATLAS_SOLID_UV } from './textures';

/** Ruido suave y determinista (suma de senos) para deformar el núcleo. */
function noise3(x: number, y: number, z: number, seed: number): number {
  return (
    Math.sin(x * 1.31 + seed) * Math.cos(y * 1.17 - seed * 0.7) * 0.5 +
    Math.sin(z * 1.53 + y * 0.61 + seed * 1.9) * 0.3 +
    Math.sin((x + z) * 2.9 + seed * 3.1) * 0.2
  );
}

interface Lump {
  center: [number, number, number];
  radius: number;
  /** Estiramiento vertical. */
  squash?: number;
}

/** Centro y alto de la copa entera (para normales y oclusión). */
interface Canopy {
  center: Vector3;
  minY: number;
  height: number;
}

function canopyOf(lumps: readonly Lump[]): Canopy {
  const center = new Vector3();
  let minY = Infinity;
  let maxY = -Infinity;
  for (const lump of lumps) {
    center.x += lump.center[0] / lumps.length;
    center.y += lump.center[1] / lumps.length;
    center.z += lump.center[2] / lumps.length;
    const reach = lump.radius * (lump.squash ?? 1) * 1.3;
    minY = Math.min(minY, lump.center[1] - reach);
    maxY = Math.max(maxY, lump.center[1] + reach);
  }
  return { center, minY, height: Math.max(1, maxY - minY) };
}

/** Normal de copa: mitad desde el centro del bulto, mitad desde el centro de la copa. */
function canopyNormal(p: Vector3, lumpCenter: Vector3, canopy: Canopy, out: Vector3): Vector3 {
  const a = p.clone().sub(lumpCenter);
  const b = p.clone().sub(canopy.center);
  if (a.lengthSq() > 1e-8) a.normalize();
  if (b.lengthSq() > 1e-8) b.normalize();
  out.copy(a).add(b);
  // Nunca un vector nulo: una normal NaN ennegrece la imagen entera (el bloom la desparrama).
  if (out.lengthSq() < 1e-8) out.set(0, 1, 0);
  return out.normalize();
}

/** Oclusión horneada (0,42–1): más oscuro abajo y hacia adentro de la copa. */
function canopyShade(p: Vector3, canopy: Canopy): number {
  const up = Math.min(1, Math.max(0, (p.y - canopy.minY) / canopy.height));
  const outward = Math.min(1, p.distanceTo(canopy.center) / (canopy.height * 0.6));
  return 0.42 + 0.58 * Math.pow(up, 0.8) * (0.7 + 0.3 * outward);
}

/** Atributos por vértice que comparten todas las partes del árbol. */
class Builder {
  readonly positions: number[] = [];
  readonly normals: number[] = [];
  readonly colors: number[] = [];
  readonly sway: number[] = [];
  readonly uvs: number[] = [];

  vertex(p: Vector3, n: Vector3, color: Color, u: number, v: number): void {
    this.positions.push(p.x, p.y, p.z);
    this.normals.push(n.x, n.y, n.z);
    this.colors.push(color.r, color.g, color.b);
    this.sway.push(Math.max(0, p.y) / 12);
    this.uvs.push(u, v);
  }

  geometry(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(this.colors, 3));
    geometry.setAttribute('sway', new Float32BufferAttribute(this.sway, 1));
    geometry.setAttribute('uv', new Float32BufferAttribute(this.uvs, 2));
    return geometry;
  }
}

/**
 * Núcleo de la copa: los bultos achicados y oscuros (con el rincón opaco del
 * atlas). Tapa los huecos entre tarjetas y da cuerpo a la sombra.
 */
function core(lumps: readonly Lump[], base: Color, seed: number, scale: number, out: Builder): void {
  const canopy = canopyOf(lumps);
  const p = new Vector3();
  const n = new Vector3();
  const color = new Color();
  const [su, sv] = LEAF_ATLAS_SOLID_UV;
  lumps.forEach((lump, index) => {
    const ico = new IcosahedronGeometry(lump.radius * scale, 0);
    const position = ico.getAttribute('position');
    const center = new Vector3(...lump.center);
    for (let i = 0; i < position.count; i++) {
      p.set(position.getX(i), position.getY(i), position.getZ(i));
      p.multiplyScalar(1 + 0.22 * noise3(p.x, p.y, p.z, seed + index * 1.7));
      p.y *= lump.squash ?? 1;
      p.add(center);
      canopyNormal(p, center, canopy, n);
      const shade = canopyShade(p, canopy) * 0.62;
      color.copy(base).multiplyScalar(shade);
      out.vertex(p, n, color, su, sv);
    }
    ico.dispose();
  });
}

/**
 * Tarjetas de hojas repartidas en el volumen de cada bulto (más hacia la
 * superficie), con orientación al azar y la textura del manojo.
 * @param density tarjetas por m² de "sección" del bulto
 * @param size tamaño de cada tarjeta respecto del radio del bulto
 */
function leafCards(lumps: readonly Lump[], base: Color, seed: number, density: number, size: number, out: Builder): void {
  const canopy = canopyOf(lumps);
  const rng = new Random(seed * 7919);
  const [uvMin, uvMax] = LEAF_ATLAS_CARD_UV;
  const q = new Quaternion();
  const axis = new Vector3();
  const center = new Vector3();
  const middle = new Vector3();
  const n = new Vector3();
  const color = new Color();
  const corners = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
  for (const lump of lumps) {
    const squash = lump.squash ?? 1;
    center.set(...lump.center);
    const count = Math.max(3, Math.round(density * lump.radius * lump.radius * Math.sqrt(squash)));
    for (let c = 0; c < count; c++) {
      // Punto en el bulto, más cerca de la superficie que del centro.
      axis.set(rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1));
      if (axis.lengthSq() < 1e-4) axis.set(0, 1, 0);
      axis.normalize();
      const reach = lump.radius * Math.sqrt(rng.range(0.25, 1));
      middle.copy(axis).multiplyScalar(reach);
      middle.y *= squash;
      middle.add(center);
      // Orientación al azar y tamaño con algo de variación.
      axis.set(rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1));
      if (axis.lengthSq() < 1e-4) axis.set(1, 0, 0);
      q.setFromAxisAngle(axis.normalize(), rng.range(0, Math.PI * 2));
      const half = (lump.radius * size * rng.range(0.8, 1.15)) / 2;
      corners[0]!.set(-half, -half, 0);
      corners[1]!.set(half, -half, 0);
      corners[2]!.set(half, half, 0);
      corners[3]!.set(-half, half, 0);
      for (const corner of corners) corner.applyQuaternion(q).add(middle);
      // Variación de tono por tarjeta (unas hojas más claras, otras más oscuras).
      const tone = rng.range(0.86, 1.12);
      // Espejar la textura en la mitad de las tarjetas: menos repetición.
      const flip = rng.next() < 0.5;
      const u0 = flip ? uvMax : uvMin;
      const u1 = flip ? uvMin : uvMax;
      const uv: Array<[number, number]> = [
        [u0, uvMin],
        [u1, uvMin],
        [u1, uvMax],
        [u0, uvMax],
      ];
      for (const index of [0, 1, 2, 0, 2, 3]) {
        const corner = corners[index]!;
        canopyNormal(corner, center, canopy, n);
        color.copy(base).multiplyScalar(canopyShade(corner, canopy) * tone);
        const [u, v] = uv[index]!;
        out.vertex(corner, n, color, u, v);
      }
    }
  }
}

/** Tronco (y ramas): cilindro con color que oscurece hacia la base. */
function wood(radiusTop: number, radiusBottom: number, length: number, color: Color, tilt = 0, yaw = 0, base: [number, number, number] = [0, 0, 0]): BufferGeometry {
  const geometry = new CylinderGeometry(radiusTop, radiusBottom, length, 6, 1, true).toNonIndexed();
  geometry.translate(0, length / 2, 0);
  geometry.rotateZ(tilt);
  geometry.rotateY(yaw);
  geometry.translate(...base);
  const position = geometry.getAttribute('position');
  const colors: number[] = [];
  const sway: number[] = [];
  const uvs: number[] = [];
  const [su, sv] = LEAF_ATLAS_SOLID_UV;
  for (let i = 0; i < position.count; i++) {
    const shade = 0.6 + 0.4 * Math.min(1, position.getY(i) / 6);
    colors.push(color.r * shade, color.g * shade, color.b * shade);
    sway.push(Math.max(0, position.getY(i) - 3) / 24);
    uvs.push(su, sv);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setAttribute('sway', new Float32BufferAttribute(sway, 1));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  return geometry;
}

function merge(parts: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  if (!merged) throw new Error('No se pudo armar un árbol.');
  merged.computeBoundingSphere();
  return merged;
}

/**
 * Nivel de detalle de un árbol según la distancia a la cámara:
 * - `near`: todas las tarjetas de hojas sobre el núcleo.
 * - `mid`: la mitad de las tarjetas, más grandes (de lejos se ve igual).
 * - `far`: un único bulto que cubre la copa y el tronco principal (a cientos
 *   de metros se ve igual y cuesta una décima parte).
 */
export type TreeDetail = 'near' | 'mid' | 'far';

interface SpeciesDef {
  /** Partes de madera: la primera es el tronco (la única que queda en `far`). */
  wood: Array<() => BufferGeometry>;
  lumps: Lump[];
  color: string;
  seed: number;
}

function buildSpecies(def: SpeciesDef, level: TreeDetail): BufferGeometry {
  const base = new Color(def.color);
  const crown = new Builder();
  if (level === 'far') {
    const first = def.lumps[0];
    if (first) core([{ ...first, radius: first.radius * 1.35 }], base, def.seed, 1, crown);
    // Sin tarjetas: el bulto de lejos lleva el color pleno de la copa.
    const colors = crown.colors;
    for (let i = 0; i < colors.length; i++) colors[i] = (colors[i] ?? 0) / 0.62;
  } else {
    core(def.lumps, base, def.seed, 0.72, crown);
    if (level === 'near') leafCards(def.lumps, base, def.seed, 2.5, 1.05, crown);
    else leafCards(def.lumps, base, def.seed, 1.1, 1.4, crown);
  }
  const woods = level === 'far' ? def.wood.slice(0, 1) : def.wood;
  return merge([...woods.map((make) => make()), crown.geometry()]);
}

/** Eucalipto, árbol de copa redonda y ciprés (en ese orden), con el detalle pedido. */
export function treeSpecies(level: TreeDetail = 'mid'): BufferGeometry[] {
  const bark = new Color('#a39a88');
  const darkBark = new Color('#5b4636');
  const species: SpeciesDef[] = [
    // Eucalipto: tronco claro alto con dos ramas y una copa rala en varios bultos.
    {
      wood: [
        () => wood(0.2, 0.38, 8.5, bark),
        () => wood(0.08, 0.16, 3.6, bark, 0.55, 0.4, [0, 6.2, 0]),
        () => wood(0.07, 0.14, 3.2, bark, -0.6, -0.8, [0, 7, 0]),
      ],
      lumps: [
        { center: [0, 10.6, 0], radius: 3, squash: 0.8 },
        { center: [2.4, 9.3, 0.9], radius: 2.2, squash: 0.8 },
        { center: [-2, 11.4, -0.7], radius: 2.1, squash: 0.85 },
        { center: [0.6, 12.4, -1.4], radius: 1.7 },
      ],
      color: '#6c8452',
      seed: 11,
    },
    // Copa redonda: tronco corto y oscuro, copa densa.
    {
      wood: [() => wood(0.24, 0.36, 4.4, darkBark)],
      lumps: [
        { center: [0, 6.3, 0], radius: 3.6, squash: 0.85 },
        { center: [1.8, 7.5, 0.6], radius: 2.3 },
        { center: [-1.5, 7.2, -0.9], radius: 2.1 },
      ],
      color: '#3e6630',
      seed: 23,
    },
    // Ciprés: columna alargada de dos bultos estirados.
    {
      wood: [() => wood(0.16, 0.24, 2.2, darkBark)],
      lumps: [
        { center: [0, 5, 0], radius: 1.9, squash: 2.1 },
        { center: [0, 9.2, 0], radius: 1.3, squash: 2 },
      ],
      color: '#2b4a27',
      seed: 31,
    },
  ];
  return species.map((def) => buildSpecies(def, level));
}

/** Umbral del recorte de las hojas. */
const LEAF_ALPHA_TEST = 0.5;

/**
 * Material de todo el árbol: atlas de hojas recortado, colores por vértice y
 * por árbol, viento en el sombreador de vértices.
 * - Las normales de copa valen para los dos lados de cada tarjeta.
 * - De lejos el mipmap promedia las hojas con el fondo transparente y el
 *   recorte las "comería": se compensa la opacidad según el nivel de mipmap.
 * - Reparto por distancia, árbol por árbol: el material `near` dibuja sólo
 *   los árboles a menos de `farStart` metros de la cámara, y el `far` sólo
 *   los que están más lejos (el resto se achica a un punto y no se dibuja).
 *   Así los lejanos van en pocas mallas grandes sin huecos ni árboles
 *   repetidos en el borde.
 * @param time uniforme con los segundos (lo avanza el circuito)
 * @param range qué árboles dibuja este material (ver arriba)
 * @param farStart distancia (m) a la cámara desde la que un árbol es lejano
 */
export function createTreeMaterial(time: IUniform<number>, atlas: Texture, range: 'near' | 'far', farStart: number): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    vertexColors: true,
    map: atlas,
    alphaTest: LEAF_ALPHA_TEST,
    side: DoubleSide,
    roughness: 1,
    metalness: 0,
    // Las hojas casi no reflejan el cielo (si no, se ven blanquecinas en ángulo rasante).
    envMapIntensity: 0.35,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.windTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float sway;\nuniform float windTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 treeWorld = (modelMatrix * instanceMatrix[3]).xyz;
        #else
          vec3 treeWorld = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #endif
        vec2 treeAt = treeWorld.xz;
        float phase = dot(treeAt, vec2(0.071, 0.053));
        float gust = 0.6 + 0.4 * sin(windTime * 0.37 + phase * 0.2);
        transformed.x += sway * gust * (0.35 * sin(windTime * 1.3 + phase) + 0.12 * sin(windTime * 3.1 + phase * 1.7 + position.y));
        transformed.z += sway * gust * 0.22 * sin(windTime * 1.1 + phase * 1.3);
        // Reparto cerca / lejos: el árbol que no le toca se achica a un punto (triángulos vacíos).
        float treeDistance = distance(treeWorld, cameraPosition);
        #ifdef TREE_FAR
          if (treeDistance <= ${farStart.toFixed(1)}) transformed = vec3(0.0);
        #else
          if (treeDistance > ${farStart.toFixed(1)}) transformed = vec3(0.0);
        #endif`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        #ifdef USE_MAP
          // Nivel de mipmap aproximado: de lejos se sube la opacidad (si no, el recorte vacía la copa).
          vec2 leafTexel = vMapUv * ${LEAF_ATLAS_SIZE.toFixed(1)};
          float leafMip = max(0.0, 0.5 * log2(max(dot(dFdx(leafTexel), dFdx(leafTexel)), dot(dFdy(leafTexel), dFdy(leafTexel)))));
          diffuseColor.a *= 1.0 + leafMip * 0.3;
        #endif`,
      )
      .replace(
        '#include <normal_fragment_begin>',
        `#include <normal_fragment_begin>
        // Normales de copa: valen igual de los dos lados de cada tarjeta.
        normal = normalize( vNormal );
        nonPerturbedNormal = normal;`,
      );
  };
  if (range === 'far') material.defines = { TREE_FAR: '' };
  material.customProgramCacheKey = () => `arboles-hojas-${range}`;
  return material;
}

/** Material de profundidad para las sombras: con el recorte de las hojas (si no, cada tarjeta proyecta un cuadrado). */
export function createTreeDepthMaterial(atlas: Texture): MeshDepthMaterial {
  return new MeshDepthMaterial({ depthPacking: RGBADepthPacking, map: atlas, alphaTest: LEAF_ALPHA_TEST });
}
