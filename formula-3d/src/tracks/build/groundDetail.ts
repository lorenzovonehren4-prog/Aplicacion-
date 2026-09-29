/**
 * Detalles del suelo que "asientan" el circuito (sin ellos todo parece
 * apoyado sobre una lámina):
 * - Sombra de contacto al pie de muros y barreras: una franja que oscurece el
 *   suelo pegado al muro y se desvanece hacia la pista (la luz del cielo no
 *   llega a ese rincón). Es la oclusión ambiental que un motor grande
 *   calcularía en pantalla, acá horneada: casi no cuesta.
 * - Pasto gastado junto al asfalto: tierra y pasto pisado en los primeros
 *   metros fuera de la pista (donde los autos se abren), que se funde con el
 *   pasto sano. Sólo donde el costado es pasto (no en grava ni escapatorias).
 *
 * Son cintas transparentes con la opacidad en los vértices (color RGBA).
 */

import { Float32BufferAttribute, MeshBasicMaterial, MeshLambertMaterial, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addMesh, type BuildContext } from './context';
import { buildRibbon, fullLap, spansWhere, type ProfilePoint } from './ribbon';

/** Ancho (m) de la sombra de contacto al pie del muro. */
const CONTACT_WIDTH = 1.8;
const CONTACT_ALPHA = 0.5;
/** Ancho (m) del pasto gastado junto al asfalto. */
const WEAR_WIDTH = 2.4;
const WEAR_ALPHA = 0.55;
const WEAR_COLOR: readonly [number, number, number] = [0.42, 0.36, 0.22];
/** Alturas: la sombra sobre grava, escapatoria y pasto; lo gastado, sólo sobre el pasto. */
const Y_CONTACT = 0.012;
const Y_WEAR = -0.035;

/**
 * Agrega a la cinta un color RGBA: `rgb` fijo y la opacidad según la columna
 * del perfil (U normalizada: 0 en el primer punto, 1 en el último).
 */
function paint(geometry: BufferGeometry, rgb: readonly [number, number, number], alphaAt: (u: number) => number): BufferGeometry {
  const uv = geometry.getAttribute('uv');
  const colors = new Float32Array(uv.count * 4);
  for (let i = 0; i < uv.count; i++) {
    colors[i * 4] = rgb[0];
    colors[i * 4 + 1] = rgb[1];
    colors[i * 4 + 2] = rgb[2];
    colors[i * 4 + 3] = alphaAt(uv.getX(i));
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 4));
  return geometry;
}

export function buildContactShadows(ctx: BuildContext): void {
  const g = ctx.track.geometry;
  const t = ctx.track.trackside;
  const pieces: BufferGeometry[] = [];
  for (const side of ['left', 'right'] as const) {
    const walls = side === 'left' ? t.wallLeft : t.wallRight;
    const sign = side === 'left' ? -1 : 1;
    const ribbon = buildRibbon(g, {
      ...fullLap(g),
      step: 3,
      profile: (i): ProfilePoint[] => {
        const wall = (walls[i] ?? 10) - 0.02;
        const inner = Math.max(g.halfWidth + 0.3, wall - CONTACT_WIDTH);
        // De izquierda a derecha (d creciente) para que la cara mire arriba.
        return sign < 0
          ? [
              [-wall, Y_CONTACT],
              [-inner, Y_CONTACT],
            ]
          : [
              [inner, Y_CONTACT],
              [wall, Y_CONTACT],
            ];
      },
      vLength: 10,
    });
    // Oscuro pegado al muro y transparente hacia la pista (curva suave).
    pieces.push(paint(ribbon, [0, 0, 0], (u) => CONTACT_ALPHA * Math.pow(sign < 0 ? 1 - u : u, 1.6)));
  }
  const merged = mergeGeometries(pieces);
  for (const piece of pieces) piece.dispose();
  if (!merged) return;
  const material = new MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  addMesh(ctx, merged, material, { name: 'sombra-contacto', receive: false }).renderOrder = 1;
}

export function buildEdgeWear(ctx: BuildContext): void {
  const g = ctx.track.geometry;
  const t = ctx.track.trackside;
  const hw = g.halfWidth;
  const pieces: BufferGeometry[] = [];
  for (const side of ['left', 'right'] as const) {
    const runoff = side === 'left' ? t.runoffLeft : t.runoffRight;
    const kerbs = side === 'left' ? t.kerbLeft : t.kerbRight;
    const walls = side === 'left' ? t.wallLeft : t.wallRight;
    const sign = side === 'left' ? -1 : 1;
    for (const [from, to] of spansWhere(g, (i) => runoff[i] === 0)) {
      const ribbon = buildRibbon(g, {
        from,
        to,
        step: 2,
        profile: (i): ProfilePoint[] => {
          const inner = hw + 0.2 + (kerbs[i] ?? 0) * 0.9;
          const outer = Math.min(inner + WEAR_WIDTH, (walls[i] ?? inner + 5) - 0.3);
          return sign < 0
            ? [
                [-Math.max(outer, inner + 0.1), Y_WEAR],
                [-inner, Y_WEAR],
              ]
            : [
                [inner, Y_WEAR],
                [Math.max(outer, inner + 0.1), Y_WEAR],
              ];
        },
        vLength: 6,
      });
      pieces.push(paint(ribbon, WEAR_COLOR, (u) => WEAR_ALPHA * Math.pow(sign < 0 ? u : 1 - u, 1.4)));
    }
  }
  const merged = mergeGeometries(pieces);
  for (const piece of pieces) piece.dispose();
  if (!merged) return;
  const material = new MeshLambertMaterial({ vertexColors: true, transparent: true, depthWrite: false });
  addMesh(ctx, merged, material, { name: 'pasto-gastado' });
}
