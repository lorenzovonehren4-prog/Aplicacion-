/**
 * Superficies a nivel del suelo: pasto con variación de tono, asfalto, pintura
 * blanca (bordes, línea de meta, casilleros de la parrilla), pianos elevados,
 * camas de grava, escapatorias asfaltadas y calle de boxes.
 */

import {
  Color,
  Float32BufferAttribute,
  MeshStandardMaterial,
  PlaneGeometry,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addMesh, type BuildContext } from './context';
import { buildRibbon, fullLap, spansWhere, type ProfilePoint } from './ribbon';
import { createAsphalt, createChecker, createGravel, createGrass, createKerb } from './textures';

/** Alturas (m) para que cada capa quede por encima de la anterior sin parpadeos. */
const Y = { ground: -0.06, gravel: -0.01, runoff: 0.002, asphalt: 0, paint: 0.006 };

export function buildGround(ctx: BuildContext): void {
  const g = ctx.track.geometry;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < g.count; i++) {
    minX = Math.min(minX, g.x[i] ?? 0);
    maxX = Math.max(maxX, g.x[i] ?? 0);
    minZ = Math.min(minZ, g.z[i] ?? 0);
    maxZ = Math.max(maxZ, g.z[i] ?? 0);
  }
  const size = Math.max(maxX - minX, maxZ - minZ) + 9000;
  const segments = 120;
  const plane = new PlaneGeometry(size, size, segments, segments);
  plane.rotateX(-Math.PI / 2);
  plane.translate((minX + maxX) / 2, Y.ground, (minZ + maxZ) / 2);

  // Parches de tono (rompen la repetición de la textura a gran escala).
  const colors: number[] = [];
  const position = plane.getAttribute('position');
  const color = new Color();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const n =
      Math.sin(x * 0.011 + Math.sin(z * 0.007) * 2) * 0.5 +
      Math.sin(z * 0.013 + Math.cos(x * 0.005) * 2) * 0.35 +
      ctx.rng.range(-0.15, 0.15);
    color.setHSL(0.26 + n * 0.015, 0.42 + n * 0.08, 0.5 + n * 0.08);
    colors.push(color.r * 1.35, color.g * 1.35, color.b * 1.35);
  }
  plane.setAttribute('color', new Float32BufferAttribute(colors, 3));

  const grass = ctx.own.own(createGrass(ctx.anisotropy));
  grass.repeat.set(size / 5, size / 5);
  addMesh(ctx, plane, new MeshStandardMaterial({ map: grass, vertexColors: true, roughness: 0.95 }), { name: 'suelo' });
}

export function buildAsphalt(ctx: BuildContext): void {
  const g = ctx.track.geometry;
  const hw = g.halfWidth;
  const { map, bump } = createAsphalt(ctx.anisotropy);
  ctx.own.own(map);
  ctx.own.own(bump);
  const ribbon = buildRibbon(g, {
    ...fullLap(g),
    step: 2,
    profile: () => [
      [-hw - 0.3, Y.asphalt],
      [hw + 0.3, Y.asphalt],
    ],
    vLength: 7,
    u: 'meters',
    uLength: 7,
  });
  addMesh(
    ctx,
    ribbon,
    new MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 0.6, roughness: 0.88, metalness: 0 }),
    { name: 'asfalto' },
  );
}

/** Pintura blanca: bordes de pista, línea de meta y casilleros de la parrilla. */
export function buildPaint(ctx: BuildContext): void {
  const track = ctx.track;
  const g = track.geometry;
  const hw = g.halfWidth;
  const pieces: BufferGeometry[] = [];
  const strip = (from: number, to: number, d0: number, d1: number): void => {
    // Una vuelta entera no se puede expresar con from/to envueltos (quedarían iguales).
    const whole = to - from >= g.length;
    const range = whole ? fullLap(g) : { from: g.wrapS(from), to: g.wrapS(to) };
    pieces.push(
      buildRibbon(g, {
        ...range,
        step: whole ? 3 : Math.min(3, Math.max(0.1, g.wrapS(to - from))),
        profile: () => [
          [d0, Y.paint],
          [d1, Y.paint],
        ],
        vLength: 1,
      }),
    );
  };
  // Líneas blancas de borde, continuas en toda la vuelta.
  strip(0, g.length, -hw + 0.12, -hw + 0.36);
  strip(0, g.length, hw - 0.36, hw - 0.12);
  // Parrilla: barra delante de cada auto y dos laterales cortas.
  for (let p = 0; p < 20; p++) {
    const slot = track.gridSlot(p);
    const front = slot.s + 3.5;
    strip(front, front + 0.2, slot.d - 1.25, slot.d + 1.25);
    strip(front - 1.4, front, slot.d - 1.25, slot.d - 1.05);
    strip(front - 1.4, front, slot.d + 1.05, slot.d + 1.25);
  }
  const white = new MeshStandardMaterial({
    color: '#f2f2ee',
    roughness: 0.7,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const merged = mergeGeometries(pieces);
  for (const piece of pieces) piece.dispose();
  if (merged) addMesh(ctx, merged, white, { name: 'pintura' });

  // Línea de meta a cuadros.
  const checker = ctx.own.own(createChecker(ctx.anisotropy));
  const line = buildRibbon(g, {
    from: track.startS - 0.6,
    to: track.startS + 0.6,
    step: 1.2,
    profile: () => [
      [-hw + 0.12, Y.paint],
      [hw - 0.12, Y.paint],
    ],
    vLength: 1.2,
    u: 'meters',
    uLength: 4.8,
  });
  addMesh(
    ctx,
    line,
    new MeshStandardMaterial({ map: checker, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    { name: 'meta' },
  );
}

export function buildKerbs(ctx: BuildContext): void {
  const g = ctx.track.geometry;
  const hw = g.halfWidth;
  const pieces: BufferGeometry[] = [];
  for (const kerb of ctx.track.trackside.kerbs) {
    const length = g.wrapS(kerb.to - kerb.from);
    const taper = (s: number): number => {
      const fromStart = g.wrapS(s - kerb.from);
      const toEnd = length - fromStart;
      return Math.min(1, Math.max(0.15, Math.min(fromStart, toEnd) / 3));
    };
    pieces.push(
      buildRibbon(g, {
        from: kerb.from,
        to: kerb.to,
        step: 1,
        profile: (_, s): ProfilePoint[] => {
          const w = kerb.width * taper(s);
          const height = 0.05 * taper(s);
          return kerb.side === 'right'
            ? [
                [hw - 0.05, Y.paint],
                [hw + w * 0.45, height],
                [hw + w, 0.012],
              ]
            : [
                [-hw - w, 0.012],
                [-hw - w * 0.45, height],
                [-hw + 0.05, Y.paint],
              ];
        },
        vLength: 2,
      }),
    );
  }
  const merged = mergeGeometries(pieces);
  for (const piece of pieces) piece.dispose();
  if (!merged) return;
  const texture = ctx.own.own(createKerb(ctx.anisotropy));
  addMesh(
    ctx,
    merged,
    new MeshStandardMaterial({ map: texture, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    { name: 'pianos' },
  );
}

/** Camas de grava y escapatorias asfaltadas (el resto es pasto: el suelo). */
export function buildRunoff(ctx: BuildContext): void {
  const g = ctx.track.geometry;
  const t = ctx.track.trackside;
  const hw = g.halfWidth;
  const kinds: Array<{ kind: number; y: number }> = [
    { kind: 1, y: Y.gravel },
    { kind: 2, y: Y.runoff },
  ];
  for (const { kind, y } of kinds) {
    const pieces: BufferGeometry[] = [];
    for (const side of ['left', 'right'] as const) {
      const runoff = side === 'left' ? t.runoffLeft : t.runoffRight;
      const walls = side === 'left' ? t.wallLeft : t.wallRight;
      const kerbs = side === 'left' ? t.kerbLeft : t.kerbRight;
      for (const [from, to] of spansWhere(g, (i) => runoff[i] === kind)) {
        pieces.push(
          buildRibbon(g, {
            from,
            to,
            step: 2,
            profile: (i): ProfilePoint[] => {
              const inner = hw + 0.25 + (kerbs[i] ?? 0) * 0.9;
              const outer = (walls[i] ?? inner + 5) - 0.2;
              return side === 'right'
                ? [
                    [inner, y],
                    [outer, y],
                  ]
                : [
                    [-outer, y],
                    [-inner, y],
                  ];
            },
            vLength: kind === 1 ? 4 : 7,
            u: 'meters',
            uLength: kind === 1 ? 4 : 7,
          }),
        );
      }
    }
    const merged = mergeGeometries(pieces);
    for (const piece of pieces) piece.dispose();
    if (!merged) continue;
    if (kind === 1) {
      const gravel = ctx.own.own(createGravel(ctx.anisotropy));
      addMesh(ctx, merged, new MeshStandardMaterial({ map: gravel, roughness: 1 }), { name: 'grava' });
    } else {
      const { map } = createAsphalt(ctx.anisotropy);
      ctx.own.own(map);
      addMesh(ctx, merged, new MeshStandardMaterial({ map, color: '#9aa0a8', roughness: 0.9 }), { name: 'escapatoria' });
    }
  }
}

/** Calle de boxes, detrás del muro de boxes. */
export function buildPitLane(ctx: BuildContext): { inner: number; outer: number } {
  const track = ctx.track;
  const g = track.geometry;
  const pits = track.pits;
  const walls = pits.side === 'left' ? track.trackside.wallLeft : track.trackside.wallRight;
  const sign = pits.side === 'left' ? -1 : 1;
  const inner = (walls[g.indexAt((pits.from + pits.to) / 2)] ?? 11) + 0.6;
  const outer = inner + 13;
  const { map } = createAsphalt(ctx.anisotropy);
  ctx.own.own(map);
  const lane = buildRibbon(g, {
    from: pits.from,
    to: pits.to,
    step: 3,
    profile: (): ProfilePoint[] =>
      sign > 0
        ? [
            [inner, Y.runoff],
            [outer, Y.runoff],
          ]
        : [
            [-outer, Y.runoff],
            [-inner, Y.runoff],
          ],
    vLength: 7,
    u: 'meters',
    uLength: 7,
  });
  addMesh(ctx, lane, new MeshStandardMaterial({ map, color: '#cfd3d8', roughness: 0.85 }), { name: 'boxes' });
  return { inner, outer };
}
