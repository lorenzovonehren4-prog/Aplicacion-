/**
 * Árboles del parque: tres especies (eucalipto, árbol de copa redonda y
 * ciprés) armadas con "bultos" de follaje deformados con ruido, para que la
 * silueta sea irregular y orgánica.
 *
 * El aspecto sale de cómo se ilumina, no de la cantidad de triángulos:
 * - Normales "de copa": cada vértice del follaje apunta desde el centro de su
 *   bulto y de la copa entera, así la luz la envuelve suave (sin facetas).
 * - Oclusión horneada en el color: más oscuro abajo y hacia adentro.
 * - Variación de tono suave por vértice (nada de triángulos de colores).
 * - Viento: el follaje se mece un poco (más arriba, más), con una fase
 *   distinta para cada árbol según dónde está.
 *
 * Unos 150–250 triángulos por árbol (hay miles alrededor de la pista).
 */

import {
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  MeshStandardMaterial,
  Vector3,
  type BufferGeometry,
  type IUniform,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Ruido suave y determinista (suma de senos) para deformar el follaje. */
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
  /** 0 = 20 caras, 1 = 80 caras. */
  detail: number;
  /** Estiramiento vertical. */
  squash?: number;
}

/**
 * Follaje: los bultos se deforman con ruido y reciben normales, color con
 * oclusión y el atributo de viento (`sway`).
 */
function foliage(lumps: readonly Lump[], base: Color, seed: number): BufferGeometry {
  // Centro y tamaño de la copa entera (para las normales y la oclusión).
  let cy = 0;
  let minY = Infinity;
  let maxY = -Infinity;
  const canopy = new Vector3();
  for (const lump of lumps) {
    canopy.x += lump.center[0] / lumps.length;
    canopy.z += lump.center[2] / lumps.length;
    cy += lump.center[1] / lumps.length;
    const reach = lump.radius * (lump.squash ?? 1) * 1.3;
    minY = Math.min(minY, lump.center[1] - reach);
    maxY = Math.max(maxY, lump.center[1] + reach);
  }
  canopy.y = cy;
  const height = Math.max(1, maxY - minY);

  const parts = lumps.map((lump, index) => {
    const geometry = new IcosahedronGeometry(lump.radius, lump.detail);
    const position = geometry.getAttribute('position');
    const normals: number[] = [];
    const colors: number[] = [];
    const sway: number[] = [];
    const center = new Vector3(...lump.center);
    const p = new Vector3();
    const fromLump = new Vector3();
    const fromCanopy = new Vector3();
    const color = new Color();
    for (let i = 0; i < position.count; i++) {
      p.set(position.getX(i), position.getY(i), position.getZ(i));
      // Deformación: los vértices repetidos entre triángulos se mueven igual (el ruido depende de la posición).
      const bump = 1 + 0.28 * noise3(p.x, p.y, p.z, seed + index * 1.7);
      p.multiplyScalar(bump);
      p.y *= lump.squash ?? 1;
      p.add(center);
      position.setXYZ(i, p.x, p.y, p.z);
      // Normal: mitad desde el centro del bulto, mitad desde el centro de la copa.
      fromLump.copy(p).sub(center);
      fromCanopy.copy(p).sub(canopy);
      if (fromLump.lengthSq() > 1e-8) fromLump.normalize();
      if (fromCanopy.lengthSq() > 1e-8) fromCanopy.normalize();
      fromLump.add(fromCanopy);
      // Nunca un vector nulo: una normal NaN ennegrece la imagen entera (el bloom la desparrama).
      if (fromLump.lengthSq() < 1e-8) fromLump.set(0, 1, 0);
      fromLump.normalize();
      normals.push(fromLump.x, fromLump.y, fromLump.z);
      // Oclusión: más oscuro abajo y adentro; un poco de variación de tono.
      const up = Math.min(1, Math.max(0, (p.y - minY) / height));
      const outward = Math.min(1, p.distanceTo(canopy) / (height * 0.6));
      const ao = 0.42 + 0.58 * Math.pow(up, 0.8) * (0.7 + 0.3 * outward);
      const tone = 1 + 0.12 * noise3(p.x * 0.7, p.y * 0.7, p.z * 0.7, seed * 2.3);
      color.copy(base).offsetHSL(0.012 * noise3(p.z, p.x, p.y, seed), 0, 0);
      colors.push(color.r * ao * tone, color.g * ao * tone, color.b * ao * tone);
      sway.push(Math.max(0, p.y) / 12);
    }
    geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geometry.setAttribute('sway', new Float32BufferAttribute(sway, 1));
    geometry.deleteAttribute('uv');
    return geometry;
  });
  const merged = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  if (!merged) throw new Error('No se pudo armar el follaje.');
  return merged;
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
  for (let i = 0; i < position.count; i++) {
    const shade = 0.6 + 0.4 * Math.min(1, position.getY(i) / 6);
    colors.push(color.r * shade, color.g * shade, color.b * shade);
    sway.push(Math.max(0, position.getY(i) - 3) / 24);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setAttribute('sway', new Float32BufferAttribute(sway, 1));
  geometry.deleteAttribute('uv');
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
 * - `near`: todos los bultos del follaje subdivididos (80 caras): la copa no
 *   se ve facetada ni de cerca.
 * - `mid`: sólo el bulto principal subdividido.
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
  const first = def.lumps[0];
  let lumps: Lump[];
  if (level === 'far' && first) lumps = [{ ...first, radius: first.radius * 1.35, detail: 0 }];
  else if (level === 'near') lumps = def.lumps.map((l) => ({ ...l, detail: Math.max(l.detail, 1) }));
  else lumps = def.lumps;
  const woods = level === 'far' ? def.wood.slice(0, 1) : def.wood;
  return merge([...woods.map((make) => make()), foliage(lumps, new Color(def.color), def.seed)]);
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
        { center: [0, 10.6, 0], radius: 3, detail: 1, squash: 0.8 },
        { center: [2.4, 9.3, 0.9], radius: 2.2, detail: 0, squash: 0.8 },
        { center: [-2, 11.4, -0.7], radius: 2.1, detail: 0, squash: 0.85 },
        { center: [0.6, 12.4, -1.4], radius: 1.7, detail: 0 },
      ],
      color: '#6c8452',
      seed: 11,
    },
    // Copa redonda: tronco corto y oscuro, copa densa.
    {
      wood: [() => wood(0.24, 0.36, 4.4, darkBark)],
      lumps: [
        { center: [0, 6.3, 0], radius: 3.6, detail: 1, squash: 0.85 },
        { center: [1.8, 7.5, 0.6], radius: 2.3, detail: 0 },
        { center: [-1.5, 7.2, -0.9], radius: 2.1, detail: 0 },
      ],
      color: '#3e6630',
      seed: 23,
    },
    // Ciprés: columna alargada de dos bultos estirados.
    {
      wood: [() => wood(0.16, 0.24, 2.2, darkBark)],
      lumps: [
        { center: [0, 5, 0], radius: 1.9, detail: 1, squash: 2.1 },
        { center: [0, 9.2, 0], radius: 1.3, detail: 0, squash: 2 },
      ],
      color: '#2b4a27',
      seed: 31,
    },
  ];
  return species.map((def) => buildSpecies(def, level));
}

/**
 * Material del follaje y los troncos (colores por vértice y por árbol) con
 * viento en el sombreador de vértices.
 * @param time uniforme con los segundos (lo avanza el circuito)
 */
export function createTreeMaterial(time: IUniform<number>): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.windTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float sway;\nuniform float windTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec2 treeAt = (modelMatrix * instanceMatrix[3]).xz;
        #else
          vec2 treeAt = vec2(0.0);
        #endif
        float phase = dot(treeAt, vec2(0.071, 0.053));
        float gust = 0.6 + 0.4 * sin(windTime * 0.37 + phase * 0.2);
        transformed.x += sway * gust * (0.35 * sin(windTime * 1.3 + phase) + 0.12 * sin(windTime * 3.1 + phase * 1.7 + position.y));
        transformed.z += sway * gust * 0.22 * sin(windTime * 1.1 + phase * 1.3);`,
      );
  };
  material.customProgramCacheKey = () => 'arboles-viento';
  return material;
}
