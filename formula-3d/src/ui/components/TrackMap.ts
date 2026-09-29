/**
 * Mapa grande de un circuito (SVG) para la selección de carrera: el trazado
 * se dibuja animado, con las zonas de DRS en verde, la línea de meta y una
 * flecha con el sentido de marcha.
 */

import { TrackGeometry } from '../../tracks/TrackGeometry';
import type { TrackDefinition } from '../../tracks/TrackDefinition';
import { prefersReducedMotion } from '../dom';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SIZE = 1000;
const PAD = 70;

interface Outline {
  path: string;
  drs: string[];
  start: [number, number, number, number];
  /** Flecha del sentido de marcha sobre la recta principal. */
  arrow: string;
}

const cache = new Map<string, Outline>();

function outline(def: TrackDefinition): Outline {
  const cached = cache.get(def.id);
  if (cached) return cached;
  const g = TrackGeometry.build(def, 4);
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
  const scale = (SIZE - PAD * 2) / Math.max(maxX - minX, maxZ - minZ);
  const ox = PAD + (SIZE - PAD * 2 - (maxX - minX) * scale) / 2;
  const oz = PAD + (SIZE - PAD * 2 - (maxZ - minZ) * scale) / 2;
  const px = (x: number): number => ox + (x - minX) * scale;
  const pz = (z: number): number => oz + (z - minZ) * scale;
  const point = { x: 0, z: 0 };
  const tangent = { x: 0, z: 0 };
  const segment = (from: number, to: number): string => {
    const length = g.wrapS(to - from) || g.length;
    const parts: string[] = [];
    for (let d = 0; d <= length; d += 16) {
      g.pointAt(from + d, 0, point);
      parts.push(`${parts.length === 0 ? 'M' : 'L'}${px(point.x).toFixed(1)} ${pz(point.z).toFixed(1)}`);
    }
    return parts.join('');
  };
  const startS = g.designToS(def.startLine);
  g.pointAt(startS, 0, point, tangent);
  const nx = -tangent.z * 26;
  const nz = tangent.x * 26;
  const start: [number, number, number, number] = [px(point.x) - nx, pz(point.z) - nz, px(point.x) + nx, pz(point.z) + nz];
  // Flecha 60 m después de la línea, del lado de afuera.
  g.pointAt(startS + 60, 0, point, tangent);
  const ax = px(point.x);
  const az = pz(point.z);
  const fx = tangent.x;
  const fz = tangent.z;
  const arrow = `M${(ax - fx * 18 - fz * 12).toFixed(1)} ${(az - fz * 18 + fx * 12).toFixed(1)}L${ax.toFixed(1)} ${az.toFixed(1)}L${(ax - fx * 18 + fz * 12).toFixed(1)} ${(az - fz * 18 - fx * 12).toFixed(1)}`;
  const result: Outline = {
    path: `${segment(0, g.length)}Z`,
    drs: def.drsZones.map((zone) => segment(g.designToS(zone.start), g.designToS(zone.end))),
    start,
    arrow,
  };
  cache.set(def.id, result);
  return result;
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  return element;
}

export class TrackMap {
  readonly element: SVGSVGElement;
  private current = '';

  constructor() {
    this.element = el('svg', { viewBox: `0 0 ${SIZE} ${SIZE}`, class: 'tmap', 'aria-hidden': 'true' });
  }

  /** Muestra un circuito (con el trazado dibujándose si cambió). */
  show(def: TrackDefinition): void {
    if (this.current === def.id) return;
    this.current = def.id;
    const o = outline(def);
    const glow = el('path', { d: o.path, class: 'tmap__glow' });
    const base = el('path', { d: o.path, class: 'tmap__base' });
    const line = el('path', { d: o.path, class: 'tmap__line' });
    const drs = o.drs.map((d) => el('path', { d, class: 'tmap__drs' }));
    const [x1, y1, x2, y2] = o.start;
    const start = el('line', { x1: String(x1), y1: String(y1), x2: String(x2), y2: String(y2), class: 'tmap__start' });
    const arrow = el('path', { d: o.arrow, class: 'tmap__arrow' });
    this.element.replaceChildren(glow, base, line, ...drs, start, arrow);
    if (prefersReducedMotion()) return;
    // Se "dibuja" el trazado: el trazo avanza desde la línea de meta.
    const length = line.getTotalLength?.() ?? 0;
    if (length <= 0) return;
    line.style.strokeDasharray = `${length}`;
    line.style.strokeDashoffset = `${length}`;
    line.animate([{ strokeDashoffset: `${length}` }, { strokeDashoffset: '0' }], { duration: 900, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' });
    for (const [i, part] of [...drs, start, arrow].entries()) {
      part.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 600 + i * 60, fill: 'backwards' });
    }
  }
}
