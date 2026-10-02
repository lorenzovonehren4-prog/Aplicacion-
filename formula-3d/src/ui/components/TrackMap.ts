/**
 * Mapa grande de un circuito (SVG) para la selección de carrera, al estilo de
 * los mapas oficiales: contorno oscuro con cada sector de un color (S1
 * magenta, S2 amarillo, S3 azul), las curvas numeradas, las zonas de DRS
 * punteadas por fuera, la línea de meta y una flecha con el sentido de marcha.
 * El trazado se dibuja animado y después un destello (el "auto") recorre la
 * vuelta sin parar.
 */

import { Track } from '../../tracks/Track';
import type { Corner } from '../../tracks/TrackAnalysis';
import { TrackGeometry } from '../../tracks/TrackGeometry';
import type { TrackDefinition } from '../../tracks/TrackDefinition';
import { prefersReducedMotion } from '../dom';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SIZE = 1000;
const PAD = 70;

/**
 * Curvas "oficiales" a partir de las detectadas: las `count` más cerradas, en
 * el orden de la vuelta. Así no llevan número los quiebres de recta (radios
 * grandes) y la cuenta coincide con la del circuito (`turns`): en Monza son
 * justo las once de verdad, con la Curva Grande incluida.
 */
export function numberedCorners(corners: readonly Corner[], count: number): Corner[] {
  const keep = new Set([...corners].sort((a, b) => a.radius - b.radius).slice(0, count));
  return corners.filter((corner) => keep.has(corner));
}

interface Outline {
  path: string;
  /** Los tres sectores (meta → S1 → S2 → meta). */
  sectors: string[];
  /** Zonas de DRS, corridas hacia afuera del trazado. */
  drs: string[];
  /** Curvas numeradas: posición del rótulo (afuera del trazado). */
  turns: Array<{ x: number; y: number; n: number }>;
  start: [number, number, number, number];
  /** Flecha del sentido de marcha sobre la recta principal. */
  arrow: string;
  /** Marcas de fin de sector 1 y 2 (x1, y1, x2, y2). */
  sectorTicks: Array<[number, number, number, number]>;
  /** Rótulos S1, S2 y S3 en la mitad de cada sector, del lado de afuera. */
  sectorLabels: Array<[number, number]>;
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
  // Centro del dibujo: rótulos y zonas de DRS van del lado opuesto (afuera del trazado).
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < g.count; i++) {
    cx += px(g.x[i] ?? 0) / g.count;
    cz += pz(g.z[i] ?? 0) / g.count;
  }
  /** Punto del trazado y su normal hacia afuera (en el lienzo). */
  const outward = (s: number): [number, number, number, number] => {
    g.pointAt(s, 0, point, tangent);
    const x = px(point.x);
    const z = pz(point.z);
    let ux = -tangent.z;
    let uz = tangent.x;
    if (ux * (x - cx) + uz * (z - cz) < 0) {
      ux = -ux;
      uz = -uz;
    }
    return [x, z, ux, uz];
  };
  const segment = (from: number, to: number, offset = 0): string => {
    const length = g.wrapS(to - from) || g.length;
    const parts: string[] = [];
    for (let d = 0; d <= length + 0.01; d = d >= length ? length + 1 : Math.min(length, d + 16)) {
      const [x, z, ux, uz] = outward(from + d);
      parts.push(`${parts.length === 0 ? 'M' : 'L'}${(x + ux * offset).toFixed(1)} ${(z + uz * offset).toFixed(1)}`);
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
  const across = (s: number, distance: number): [number, number, number, number] => {
    const [x, z, ux, uz] = outward(s);
    return [x, z, x + ux * distance, z + uz * distance];
  };
  const bounds = [startS, g.designToS(def.sectors[0]), g.designToS(def.sectors[1])];
  const sectorTicks = bounds.slice(1).map((s) => {
    const [x, z, ox, oz] = across(s, 24);
    return [x - (ox - x), z - (oz - z), ox, oz] as [number, number, number, number];
  });
  const sectorLabels = bounds.map((from, i) => {
    const to = bounds[i + 1] ?? startS;
    const [, , lx, lz] = across(from + (g.wrapS(to - from) || g.length) / 2, 54);
    return [lx, lz] as [number, number];
  });
  // Curvas numeradas (las del análisis del circuito, sin quiebres de recta).
  const track = Track.load(def);
  const turns = numberedCorners(track.analysis.corners, def.turns).map((corner, i) => {
    const [, , x, y] = across(corner.apex, 46);
    return { x, y, n: i + 1 };
  });
  const result: Outline = {
    path: `${segment(0, g.length)}Z`,
    sectors: bounds.map((from, i) => segment(from, bounds[i + 1] ?? startS)),
    drs: def.drsZones.map((zone) => segment(g.designToS(zone.start), g.designToS(zone.end), 24)),
    turns,
    start,
    arrow,
    sectorTicks,
    sectorLabels,
  };
  cache.set(def.id, result);
  return result;
}

/** Contorno del circuito (trazado SVG en un lienzo de 1000 × 1000) para miniaturas. */
export function trackOutlinePath(def: TrackDefinition): string {
  return outline(def).path;
}

/** Miniatura del circuito: el contorno en un SVG que se escala con su caja. */
export function createTrackThumb(def: TrackDefinition, className: string): SVGSVGElement {
  const svg = el('svg', { viewBox: `0 0 ${SIZE} ${SIZE}`, class: className, 'aria-hidden': 'true' });
  svg.append(el('path', { d: outline(def).path, class: `${className}-glow` }), el('path', { d: outline(def).path, class: `${className}-line` }));
  return svg;
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  return element;
}

export class TrackMap {
  readonly element: SVGSVGElement;
  private current = '';
  private comet: Animation[] = [];

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
    const sectors = o.sectors.map((d, i) => el('path', { d, class: `tmap__line tmap__line--s${i + 1}` }));
    const drs = o.drs.map((d) => el('path', { d, class: 'tmap__drs' }));
    const turns = o.turns.map(({ x, y, n }) => {
      const group = el('g', { class: 'tmap__turn' });
      group.append(el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: '23' }));
      const label = el('text', { x: x.toFixed(1), y: (y + 1).toFixed(1) });
      label.textContent = String(n);
      group.append(label);
      return group;
    });
    const [x1, y1, x2, y2] = o.start;
    const start = el('line', { x1: String(x1), y1: String(y1), x2: String(x2), y2: String(y2), class: 'tmap__start' });
    const arrow = el('path', { d: o.arrow, class: 'tmap__arrow' });
    const ticks = o.sectorTicks.map(([ax, ay, bx, by]) =>
      el('line', { x1: ax.toFixed(1), y1: ay.toFixed(1), x2: bx.toFixed(1), y2: by.toFixed(1), class: 'tmap__tick' }),
    );
    const labels = o.sectorLabels.map(([lx, ly], i) => {
      const label = el('text', { x: lx.toFixed(1), y: ly.toFixed(1), class: `tmap__sector tmap__sector--s${i + 1}` });
      label.textContent = `S${i + 1}`;
      return label;
    });
    const tail = el('path', { d: o.path, class: 'tmap__comet-tail' });
    const head = el('path', { d: o.path, class: 'tmap__comet' });
    this.element.replaceChildren(glow, base, ...sectors, ...drs, ...ticks, start, arrow, ...labels, ...turns, tail, head);
    for (const animation of this.comet) animation.cancel();
    this.comet = [];
    const total = base.getTotalLength?.() ?? 0;
    if (total > 0 && !prefersReducedMotion()) {
      // El destello: un tramo corto brillante y una estela más larga y tenue
      // que avanzan juntos por el trazado (una vuelta cada ~7 s).
      const lap = { duration: 7000, iterations: Infinity, delay: 900 };
      head.style.strokeDasharray = `26 ${total}`;
      tail.style.strokeDasharray = `150 ${total}`;
      this.comet.push(
        // La cabeza ocupa los últimos 26 de los 150 de la estela (va adelante).
        head.animate([{ strokeDashoffset: '-124' }, { strokeDashoffset: `${-124 - total}` }], lap),
        tail.animate([{ strokeDashoffset: '0' }, { strokeDashoffset: `${-total}` }], lap),
      );
    } else {
      head.remove();
      tail.remove();
    }
    if (prefersReducedMotion()) return;
    // Se "dibuja" el trazado: cada sector avanza después del anterior, desde la línea de meta.
    let delay = 0;
    for (const sector of sectors) {
      const length = sector.getTotalLength?.() ?? 0;
      if (length <= 0) continue;
      const duration = 900 * (length / Math.max(1, total));
      sector.style.strokeDasharray = `${length}`;
      sector.style.strokeDashoffset = `${length}`;
      sector.animate([{ strokeDashoffset: `${length}` }, { strokeDashoffset: '0' }], { duration, delay, easing: 'linear', fill: 'forwards' });
      delay += duration;
    }
    for (const [i, part] of [...drs, ...ticks, start, arrow, ...labels, ...turns].entries()) {
      part.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 600 + i * 60, fill: 'backwards' });
    }
  }
}
