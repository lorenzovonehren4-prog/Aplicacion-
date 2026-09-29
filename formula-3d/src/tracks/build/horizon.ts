/**
 * Horizonte: dos anillos alrededor del circuito para que el piso no corte
 * contra el cielo.
 * - Una arboleda lejana (más allá de los árboles instanciados): una banda con
 *   el borde de arriba recortado como copas de árboles.
 * - Lomas suaves más lejos, azuladas por la distancia (perspectiva aérea).
 *
 * La forma de cada anillo sigue el contorno del circuito (distancia máxima
 * de la pista en cada dirección, más un margen), así queda siempre detrás de
 * todo lo demás. El color ya viene mezclado con el del aire (la niebla de la
 * escena es muy tenue a esa distancia).
 */

import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, MeshLambertMaterial } from 'three';
import { addMesh, type BuildContext } from './context';

interface RingOptions {
  /** Distancia extra sobre el contorno del circuito (m). */
  margin: number;
  segments: number;
  /** Altura (m) en función del ángulo y de un número al azar por vértice. */
  height: (angle: number, random: number) => number;
  /** Color abajo y arriba de la banda. */
  bottom: Color;
  top: Color;
}

/** Ruido periódico suave (suma de senos con frecuencias enteras: cierra el anillo). */
function ringNoise(angle: number, seed: number): number {
  return (
    Math.sin(angle * 3 + seed) * 0.45 +
    Math.sin(angle * 7 + seed * 2.1) * 0.3 +
    Math.sin(angle * 13 + seed * 0.7) * 0.25
  );
}

function buildRing(ctx: BuildContext, center: [number, number], support: (angle: number) => number, options: RingOptions): BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const n = options.segments;
  for (let k = 0; k <= n; k++) {
    const angle = (k / n) * Math.PI * 2;
    const radius = support(angle) + options.margin;
    const x = center[0] + Math.sin(angle) * radius;
    const z = center[1] - Math.cos(angle) * radius;
    const h = options.height(angle, ctx.rng.next());
    positions.push(x, -3, z, x, h, z);
    colors.push(options.bottom.r, options.bottom.g, options.bottom.b, options.top.r, options.top.g, options.top.b);
    if (k < n) {
      const a = k * 2;
      // Cara hacia adentro (mira al circuito).
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * @param airColor color del aire cerca del horizonte (el de la niebla del clima)
 */
export function buildHorizon(ctx: BuildContext, airColor: string): void {
  const g = ctx.track.geometry;
  let cx = 0;
  let cz = 0;
  let samples = 0;
  for (let i = 0; i < g.count; i += 8) {
    cx += g.x[i] ?? 0;
    cz += g.z[i] ?? 0;
    samples++;
  }
  cx /= samples;
  cz /= samples;
  // Distancia máxima de la pista en cada dirección (función de soporte), suavizada.
  const directions = 180;
  const raw: number[] = [];
  for (let k = 0; k < directions; k++) {
    const angle = (k / directions) * Math.PI * 2;
    const dx = Math.sin(angle);
    const dz = -Math.cos(angle);
    let best = 0;
    for (let i = 0; i < g.count; i += 4) best = Math.max(best, ((g.x[i] ?? 0) - cx) * dx + ((g.z[i] ?? 0) - cz) * dz);
    raw.push(best);
  }
  const smooth = raw.map((_, k) => {
    let sum = 0;
    for (let j = -4; j <= 4; j++) sum += raw[(k + j + directions) % directions] ?? 0;
    return sum / 9;
  });
  const support = (angle: number): number => {
    const f = ((angle / (Math.PI * 2)) * directions) % directions;
    const i = Math.floor(f);
    const t = f - i;
    return (smooth[i] ?? 0) * (1 - t) + (smooth[(i + 1) % directions] ?? 0) * t;
  };

  const air = new Color(airColor);
  const tint = (hex: string, haze: number): Color => new Color(hex).lerp(air, haze);

  // Lomas lejanas: suaves y azuladas.
  const hills = buildRing(ctx, [cx, cz], support, {
    margin: 2100,
    segments: 360,
    height: (angle) => 70 + 45 * ringNoise(angle, 1.3) + 18 * ringNoise(angle * 2, 4.1),
    bottom: tint('#4d6b52', 0.55),
    top: tint('#5d7b68', 0.68),
  });
  // Arboleda: banda con copas recortadas (altura al azar en cada vértice).
  const treeline = buildRing(ctx, [cx, cz], support, {
    margin: 560,
    segments: 1600,
    height: (angle, random) => 24 + 7 * ringNoise(angle, 2.7) + random * 7,
    bottom: tint('#1f3a1d', 0.25),
    top: tint('#3d5f34', 0.38),
  });
  const material = (): MeshLambertMaterial => new MeshLambertMaterial({ vertexColors: true, side: DoubleSide });
  addMesh(ctx, hills, material(), { name: 'lomas', receive: false });
  addMesh(ctx, treeline, material(), { name: 'arboleda-lejana', receive: false });
}
