/**
 * Vista previa de un ítem del catálogo, dibujada en SVG (sin imágenes): la
 * pintura sobre la silueta del monoplaza, el material como una esfera, las
 * llantas, el alerón visto desde atrás, el casco de perfil, el avatar, la
 * celebración y el título como una placa. La usan las cartas de recompensa, el
 * pase de temporada y la tarjeta del piloto.
 */

import type { AvatarGlyph, Item } from '../../progression/items';
import { h } from '../dom';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SIZE = 120;

/** Ids únicos para gradientes y recortes (varias vistas previas conviven en la página). */
let uid = 0;
function nextId(prefix: string): string {
  uid++;
  return `${prefix}${uid}`;
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, ...children: SVGElement[]): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
  element.append(...children);
  return element;
}

function svg(className: string, ...children: SVGElement[]): SVGSVGElement {
  return el('svg', { viewBox: `0 0 ${SIZE} ${SIZE}`, class: `ipreview ${className}`, 'aria-hidden': 'true' }, ...children);
}

function linear(id: string, stops: ReadonlyArray<readonly [number, string]>, vertical = false): SVGLinearGradientElement {
  return el(
    'linearGradient',
    vertical ? { id, x1: 0, y1: 0, x2: 0, y2: 1 } : { id, x1: 0, y1: 0, x2: 1, y2: 1 },
    ...stops.map(([offset, color]) => el('stop', { offset, 'stop-color': color })),
  );
}

/** Generador determinista (misma vista previa siempre para el mismo ítem). */
function seeded(text: string): () => number {
  let seed = 2166136261;
  for (let i = 0; i < text.length; i++) seed = Math.imul(seed ^ text.charCodeAt(i), 16777619);
  return () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507);
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
    seed ^= seed >>> 16;
    return (seed >>> 0) / 4294967296;
  };
}

// ─── Pintura: silueta lateral del monoplaza ──────────────────────────────

const CAR_BODY = 'M6 75 Q18 70 40 67 L50 63 Q56 60 60 56 L64 50 Q70 47 75 51 L96 61 L105 63 L105 77 L20 79 Q9 79 6 75 Z';

function paintPattern(item: Extract<Item, { kind: 'paint' }>, defs: SVGDefsElement): SVGElement[] {
  const [primary, secondary, accent] = item.colors;
  const base = el('rect', { x: 0, y: 40, width: SIZE, height: 45, fill: primary });
  switch (item.pattern) {
    case 'solid':
      return [base, el('rect', { x: 0, y: 72, width: SIZE, height: 3, fill: secondary }), el('rect', { x: 0, y: 75, width: SIZE, height: 5, fill: accent })];
    case 'stripes':
      return [base, el('rect', { x: 0, y: 60, width: SIZE, height: 4, fill: secondary }), el('rect', { x: 0, y: 67, width: SIZE, height: 4, fill: secondary }), el('rect', { x: 0, y: 76, width: SIZE, height: 4, fill: accent })];
    case 'split':
      return [base, el('rect', { x: 0, y: 66, width: SIZE, height: 20, fill: secondary }), el('rect', { x: 0, y: 65, width: SIZE, height: 2, fill: accent })];
    case 'chevron': {
      const parts: SVGElement[] = [base];
      for (let x = -10; x < SIZE; x += 16) {
        parts.push(el('path', { d: `M${x} 48 L${x + 8} 64 L${x} 80 L${x + 6} 80 L${x + 14} 64 L${x + 6} 48 Z`, fill: secondary }));
      }
      parts.push(el('rect', { x: 0, y: 76, width: SIZE, height: 4, fill: accent }));
      return parts;
    }
    case 'gradient': {
      const id = nextId('pg');
      defs.append(linear(id, [[0, primary], [0.55, secondary], [1, accent]]));
      return [el('rect', { x: 0, y: 40, width: SIZE, height: 45, fill: `url(#${id})` })];
    }
    case 'geometric':
      return [
        base,
        el('path', { d: 'M20 85 L46 52 L60 85 Z', fill: secondary }),
        el('path', { d: 'M70 40 L100 40 L84 70 Z', fill: accent }),
        el('path', { d: 'M88 85 L104 58 L120 85 Z', fill: secondary }),
      ];
  }
}

function paintPreview(item: Extract<Item, { kind: 'paint' }>): SVGSVGElement {
  const defs = el('defs', {});
  const clip = nextId('pc');
  defs.append(el('clipPath', { id: clip }, el('path', { d: CAR_BODY })));
  const shine = nextId('ps');
  defs.append(linear(shine, [[0, 'rgba(255,255,255,0.35)'], [0.45, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0.25)']], true));
  const wheel = (cx: number, cy: number, r: number): SVGElement[] => [
    el('circle', { cx, cy, r, fill: '#15171b' }),
    el('circle', { cx, cy, r: r * 0.55, fill: '#3a3f47' }),
    el('circle', { cx, cy, r: r * 0.2, fill: item.colors[2] }),
  ];
  return svg(
    'ipreview--paint',
    defs,
    el('ellipse', { cx: 58, cy: 90, rx: 52, ry: 4, fill: 'rgba(0,0,0,0.35)' }),
    // Alerón trasero y delantero.
    el('rect', { x: 100, y: 46, width: 14, height: 5, rx: 1, fill: item.colors[1] }),
    el('rect', { x: 106, y: 46, width: 3, height: 22, fill: '#1c1f25' }),
    el('rect', { x: 2, y: 79, width: 22, height: 3, rx: 1, fill: item.colors[1] }),
    el('g', { 'clip-path': `url(#${clip})` }, ...paintPattern(item, defs), el('rect', { x: 0, y: 40, width: SIZE, height: 45, fill: `url(#${shine})` })),
    el('circle', { cx: 60, cy: 57, r: 4.2, fill: '#f4f4f4' }),
    el('path', { d: 'M52 58 Q60 46 70 52', stroke: '#1c1f25', 'stroke-width': 2, fill: 'none' }),
    ...wheel(26, 78, 10),
    ...wheel(89, 77, 12),
  );
}

// ─── Material: esfera ─────────────────────────────────────────────────────

function materialPreview(item: Extract<Item, { kind: 'material' }>): SVGSVGElement {
  const defs = el('defs', {});
  const fill = nextId('mf');
  const highlight = nextId('mh');
  const extras: SVGElement[] = [];
  let highlightOpacity = 0.7;
  switch (item.finish) {
    case 'gloss':
      defs.append(linear(fill, [[0, '#ff4d5e'], [1, '#6e0712']]));
      break;
    case 'matte':
      defs.append(linear(fill, [[0, '#9a2432'], [1, '#4a0f17']]));
      highlightOpacity = 0.12;
      break;
    case 'satin':
      defs.append(linear(fill, [[0, '#b8c0cc'], [0.5, '#6b7482'], [1, '#353b45']]));
      highlightOpacity = 0.22;
      break;
    case 'metallic':
      defs.append(linear(fill, [[0, '#dfe6f0'], [0.35, '#6b7a90'], [0.6, '#b7c3d4'], [1, '#2a3342']]));
      break;
    case 'chrome':
      defs.append(linear(fill, [[0, '#ffffff'], [0.45, '#9fb7cf'], [0.5, '#2b3440'], [0.62, '#c8d6e5'], [1, '#1b222c']], true));
      highlightOpacity = 0.9;
      break;
    case 'pearl':
      defs.append(linear(fill, [[0, '#ffd1f0'], [0.3, '#bfe8ff'], [0.6, '#fff4c2'], [1, '#c9b6ff']]));
      break;
    case 'carbon': {
      const weave = nextId('mw');
      defs.append(
        el(
          'pattern',
          { id: weave, width: 8, height: 8, patternUnits: 'userSpaceOnUse' },
          el('rect', { width: 8, height: 8, fill: '#16181c' }),
          el('rect', { width: 4, height: 4, fill: '#2c3038' }),
          el('rect', { x: 4, y: 4, width: 4, height: 4, fill: '#2c3038' }),
        ),
      );
      defs.append(linear(fill, [[0, '#000'], [1, '#000']]));
      extras.push(el('circle', { cx: 60, cy: 60, r: 44, fill: `url(#${weave})` }));
      highlightOpacity = 0.35;
      break;
    }
  }
  defs.append(
    el(
      'radialGradient',
      { id: highlight, cx: 0.35, cy: 0.3, r: 0.45 },
      el('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': highlightOpacity }),
      el('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 }),
    ),
  );
  return svg(
    'ipreview--material',
    defs,
    el('ellipse', { cx: 60, cy: 108, rx: 34, ry: 5, fill: 'rgba(0,0,0,0.35)' }),
    el('circle', { cx: 60, cy: 60, r: 44, fill: `url(#${fill})` }),
    ...extras,
    el('circle', { cx: 60, cy: 60, r: 44, fill: `url(#${highlight})` }),
  );
}

// ─── Llantas ──────────────────────────────────────────────────────────────

function rimsPreview(item: Extract<Item, { kind: 'rims' }>): SVGSVGElement {
  const spokes: SVGElement[] = [];
  if (item.cover) {
    // Tapa aerodinámica: disco liso con los rayos insinuados y el aro de color.
    const defs = el('defs', {});
    const disc = nextId('rd');
    defs.append(
      el('radialGradient', { id: disc, cx: 0.4, cy: 0.35, r: 0.7 }, el('stop', { offset: 0, 'stop-color': '#5a5f68' }), el('stop', { offset: 1, 'stop-color': '#1b1c20' })),
    );
    return svg(
      'ipreview--rims',
      defs,
      el('circle', { cx: 60, cy: 60, r: 54, fill: '#15171b' }),
      el('circle', { cx: 60, cy: 60, r: 38, fill: `url(#${disc})` }),
      el('circle', { cx: 60, cy: 60, r: 33, fill: 'none', stroke: item.accent, 'stroke-width': 3 }),
      el('circle', { cx: 60, cy: 60, r: 9, fill: '#0d0e10' }),
      el('circle', { cx: 60, cy: 60, r: 5, fill: item.accent }),
    );
  }
  const width = Math.max(3, 26 / item.spokes + 1.5);
  for (let i = 0; i < item.spokes; i++) {
    const angle = (i * 360) / item.spokes;
    spokes.push(el('rect', { x: 60 - width / 2, y: 26, width, height: 30, rx: width / 2, fill: item.color, transform: `rotate(${angle} 60 60)` }));
  }
  return svg(
    'ipreview--rims',
    el('circle', { cx: 60, cy: 60, r: 54, fill: '#15171b' }),
    el('circle', { cx: 60, cy: 60, r: 47, fill: 'none', stroke: '#2a2d33', 'stroke-width': 2 }),
    el('circle', { cx: 60, cy: 60, r: 38, fill: '#23262c' }),
    el('circle', { cx: 60, cy: 60, r: 37, fill: 'none', stroke: item.accent, 'stroke-width': 3 }),
    ...spokes,
    el('circle', { cx: 60, cy: 60, r: 9, fill: item.accent }),
    el('circle', { cx: 60, cy: 60, r: 4, fill: item.color }),
  );
}

// ─── Alerón (visto desde atrás) ───────────────────────────────────────────

function wingPreview(item: Extract<Item, { kind: 'wing' }>): SVGSVGElement {
  const carbon = '#1f232a';
  const edge = '#ff2a3c';
  const plates = (d = 'rect'): SVGElement[] =>
    d === 'pointed'
      ? [el('path', { d: 'M12 34 L22 24 L22 86 L12 80 Z', fill: carbon }), el('path', { d: 'M108 34 L98 24 L98 86 L108 80 Z', fill: carbon })]
      : [el('rect', { x: 12, y: 26, width: 9, height: 58, rx: 2, fill: carbon }), el('rect', { x: 99, y: 26, width: 9, height: 58, rx: 2, fill: carbon })];
  const plane = (y: number, height: number): SVGElement[] => [
    el('rect', { x: 20, y, width: 80, height, fill: carbon }),
    el('rect', { x: 20, y, width: 80, height: 2, fill: edge }),
  ];
  const pylon = el('rect', { x: 56, y: 66, width: 8, height: 44, fill: carbon });
  let parts: SVGElement[];
  switch (item.shape) {
    case 'standard':
      parts = [pylon, ...plates(), ...plane(56, 10), ...plane(42, 7)];
      break;
    case 'tall':
      parts = [
        pylon,
        el('rect', { x: 12, y: 14, width: 9, height: 70, rx: 2, fill: carbon }),
        el('rect', { x: 99, y: 14, width: 9, height: 70, rx: 2, fill: carbon }),
        ...plane(54, 12),
        ...plane(38, 10),
        ...plane(24, 7),
      ];
      break;
    case 'spoon':
      parts = [pylon, ...plates(), el('path', { d: 'M20 46 Q60 70 100 46 L100 56 Q60 80 20 56 Z', fill: carbon }), el('path', { d: 'M20 46 Q60 70 100 46', stroke: edge, 'stroke-width': 2, fill: 'none' })];
      break;
    case 'twin':
      parts = [pylon, ...plates(), ...plane(34, 8), ...plane(62, 9)];
      break;
    case 'swan':
      parts = [
        el('path', { d: 'M48 110 L48 70 Q48 44 56 44 L56 50 Q54 52 54 70 L54 110 Z', fill: carbon }),
        el('path', { d: 'M72 110 L72 70 Q72 44 64 44 L64 50 Q66 52 66 70 L66 110 Z', fill: carbon }),
        ...plates(),
        ...plane(50, 10),
        ...plane(36, 7),
      ];
      break;
    case 'blade':
      parts = [pylon, ...plates('pointed'), ...plane(56, 5), ...plane(46, 4)];
      break;
  }
  return svg('ipreview--wing', ...parts);
}

// ─── Casco de perfil ──────────────────────────────────────────────────────

const HELMET = 'M24 80 Q20 40 58 30 Q96 26 100 64 L100 84 Q100 92 90 92 L38 92 Q26 92 24 80 Z';

function helmetPreview(item: Extract<Item, { kind: 'helmet' }>): SVGSVGElement {
  const [base, second, third] = item.colors;
  const defs = el('defs', {});
  const clip = nextId('hc');
  defs.append(el('clipPath', { id: clip }, el('path', { d: HELMET })));
  const shine = nextId('hs');
  defs.append(linear(shine, [[0, 'rgba(255,255,255,0.4)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0.3)']], true));
  const design: SVGElement[] = [el('rect', { x: 0, y: 0, width: SIZE, height: SIZE, fill: base })];
  switch (item.design) {
    case 'team':
      design.push(
        el('rect', { x: 0, y: 0, width: SIZE, height: 42, fill: second }),
        el('path', { d: 'M0 42 Q30 50 60 42 T120 42 L120 50 Q90 58 60 50 T0 50 Z', fill: third }),
        el('rect', { x: 0, y: 80, width: SIZE, height: 40, fill: second }),
      );
      break;
    case 'stripe':
      design.push(el('rect', { x: 0, y: 44, width: SIZE, height: 8, fill: second }));
      break;
    case 'flame':
      design.push(
        el('path', { d: 'M20 94 Q30 70 26 56 Q40 70 44 60 Q46 44 58 38 Q54 56 64 62 Q70 50 80 48 Q74 64 84 72 Q90 66 100 70 L100 94 Z', fill: second }),
        el('path', { d: 'M24 94 Q34 80 32 70 Q44 80 50 70 Q54 60 62 56 Q60 70 70 74 Q78 68 84 70 Q84 82 100 84 L100 94 Z', fill: third }),
      );
      break;
    case 'split':
      design.push(el('rect', { x: 62, y: 0, width: 60, height: SIZE, fill: second }), el('rect', { x: 60, y: 0, width: 3, height: SIZE, fill: third }));
      break;
    case 'stars': {
      const random = seeded(item.id);
      for (let i = 0; i < 16; i++) {
        const x = 24 + random() * 76;
        const y = 30 + random() * 60;
        const r = 0.8 + random() * 1.8;
        design.push(el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: r.toFixed(1), fill: i % 4 === 0 ? third : second }));
      }
      break;
    }
    case 'circuit': {
      const paths = ['M26 70 L44 70 L52 62 L72 62', 'M30 82 L60 82 L68 74 L96 74', 'M40 44 L40 54 L62 54 L70 46 L88 46', 'M80 86 L80 80 L96 80'];
      for (const d of paths) design.push(el('path', { d, stroke: second, 'stroke-width': 2, fill: 'none' }));
      for (const [cx, cy] of [[72, 62], [96, 74], [88, 46], [26, 70], [80, 86]] as const) design.push(el('circle', { cx, cy, r: 2.6, fill: third }));
      break;
    }
    case 'gold':
      design.push(el('rect', { x: 0, y: 40, width: SIZE, height: 10, fill: second }), el('rect', { x: 0, y: 51, width: SIZE, height: 2, fill: third }));
      break;
  }
  return svg(
    'ipreview--helmet',
    defs,
    el('g', { 'clip-path': `url(#${clip})` }, ...design, el('rect', { x: 0, y: 0, width: SIZE, height: SIZE, fill: `url(#${shine})` })),
    el('path', { d: 'M60 52 L100 50 Q102 64 97 70 L62 70 Q55 62 60 52 Z', fill: '#101218' }),
    el('path', { d: 'M64 55 L96 53', stroke: 'rgba(120,180,255,0.55)', 'stroke-width': 2 }),
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────

const GLYPHS: Readonly<Record<Exclude<AvatarGlyph, 'initials' | 'checker'>, string>> = {
  visor: 'M32 66 Q32 32 60 30 Q88 32 88 66 L88 84 Q88 92 80 92 L40 92 Q32 92 32 84 Z',
  bolt: 'M68 18 L36 66 L56 66 L48 102 L86 48 L64 48 L76 18 Z',
  crown: 'M28 82 L24 40 L44 58 L60 30 L76 58 L96 40 L92 82 Z M28 86 L92 86 L92 96 L28 96 Z',
  wing: 'M18 72 Q48 38 102 34 Q86 46 92 48 Q72 54 78 58 Q58 64 64 68 Q40 78 18 72 Z',
  comet: 'M64 56 L18 100 L72 64 Z M74 32 A16 16 0 1 1 73.9 32 Z',
  flame: 'M60 18 Q86 46 78 70 Q90 62 88 48 Q102 72 88 92 Q76 104 60 104 Q40 104 32 88 Q24 68 44 50 Q44 64 52 66 Q44 40 60 18 Z',
};

/** Avatar del piloto: el glifo del ítem, o la inicial del nombre. */
export function avatarPreview(item: Extract<Item, { kind: 'avatar' }>, name: string): SVGSVGElement {
  const [background, foreground] = item.colors;
  const defs = el('defs', {});
  const clip = nextId('ac');
  defs.append(el('clipPath', { id: clip }, el('circle', { cx: 60, cy: 60, r: 56 })));
  const content: SVGElement[] = [el('circle', { cx: 60, cy: 60, r: 56, fill: background })];
  if (item.glyph === 'initials') {
    const initial = el('text', { x: 60, y: 62, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: foreground, class: 'ipreview__initial' });
    initial.textContent = name.trim().charAt(0).toUpperCase() || 'P';
    content.push(initial);
  } else if (item.glyph === 'checker') {
    const squares: SVGElement[] = [];
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        if ((row + col) % 2 === 0) squares.push(el('rect', { x: 4 + col * 19, y: 4 + row * 19, width: 19, height: 19, fill: foreground }));
      }
    }
    content.push(el('g', { 'clip-path': `url(#${clip})`, transform: 'rotate(-12 60 60)' }, ...squares));
  } else {
    content.push(el('path', { d: GLYPHS[item.glyph], fill: foreground }));
    if (item.glyph === 'visor') content.push(el('rect', { x: 38, y: 52, width: 44, height: 16, rx: 7, fill: background }));
  }
  content.push(el('circle', { cx: 60, cy: 60, r: 55, fill: 'none', stroke: 'rgba(255,255,255,0.18)', 'stroke-width': 2 }));
  return svg('ipreview--avatar', defs, ...content);
}

// ─── Celebración ──────────────────────────────────────────────────────────

function celebrationPreview(item: Extract<Item, { kind: 'celebration' }>): SVGSVGElement {
  const random = seeded(item.id);
  const colors = ['#ff2a3c', '#f5c542', '#3d8bff', '#39ff88', '#ffffff', '#a65cff'];
  const pick = (): string => colors[Math.floor(random() * colors.length)] ?? '#ffffff';
  const parts: SVGElement[] = [];
  switch (item.style) {
    case 'streamers':
      // Serpentinas: curvas onduladas que caen.
      for (let i = 0; i < 7; i++) {
        const x = 14 + i * 15 + (random() - 0.5) * 6;
        const phase = random() * 6;
        let d = `M${x.toFixed(1)} 6`;
        for (let y = 14; y <= 114; y += 8) d += ` L${(x + Math.sin(y * 0.09 + phase) * 6).toFixed(1)} ${y}`;
        parts.push(el('path', { d, fill: 'none', stroke: i % 3 === 1 ? '#ffffff' : '#f5c542', 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: (0.6 + random() * 0.4).toFixed(2) }));
      }
      break;
    case 'confetti':
      for (let i = 0; i < 34; i++) {
        const x = 8 + random() * 104;
        const y = 8 + random() * 104;
        parts.push(el('rect', { x: x.toFixed(1), y: y.toFixed(1), width: 4, height: 9, rx: 1, fill: pick(), transform: `rotate(${Math.round(random() * 180)} ${x.toFixed(1)} ${y.toFixed(1)})` }));
      }
      break;
    case 'champagne':
      parts.push(
        el('g', { transform: 'rotate(35 60 70)' }, el('path', { d: 'M52 104 L52 62 Q52 52 57 46 L57 30 L63 30 L63 46 Q68 52 68 62 L68 104 Q68 108 64 108 L56 108 Q52 108 52 104 Z', fill: '#1f5c3a' }), el('rect', { x: 52, y: 72, width: 16, height: 16, fill: '#f5c542' }), el('rect', { x: 56, y: 24, width: 8, height: 8, fill: '#d4a93c' })),
      );
      for (let i = 0; i < 26; i++) {
        const t = random();
        const x = 70 + t * 44 + (random() - 0.5) * 10;
        const y = 36 - t * 26 + (random() - 0.5) * 14 + t * t * 30;
        parts.push(el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: (1 + random() * 2.2).toFixed(1), fill: i % 3 === 0 ? '#ffffff' : '#fff3c4' }));
      }
      break;
    case 'fireworks':
      for (const [cx, cy, r] of [[40, 42, 26], [84, 36, 20], [72, 82, 22]] as const) {
        const color = pick();
        for (let i = 0; i < 14; i++) {
          const angle = (i / 14) * Math.PI * 2;
          const x1 = cx + Math.cos(angle) * r * 0.35;
          const y1 = cy + Math.sin(angle) * r * 0.35;
          const x2 = cx + Math.cos(angle) * r;
          const y2 = cy + Math.sin(angle) * r;
          parts.push(el('line', { x1: x1.toFixed(1), y1: y1.toFixed(1), x2: x2.toFixed(1), y2: y2.toFixed(1), stroke: color, 'stroke-width': 2, 'stroke-linecap': 'round' }));
        }
        parts.push(el('circle', { cx, cy, r: 3, fill: '#ffffff' }));
      }
      break;
  }
  return svg('ipreview--celebration', ...parts);
}

/** Vista previa de cualquier ítem (el título es una placa de texto). */
export function itemPreview(item: Item, playerName = ''): Element {
  switch (item.kind) {
    case 'paint':
      return paintPreview(item);
    case 'material':
      return materialPreview(item);
    case 'rims':
      return rimsPreview(item);
    case 'wing':
      return wingPreview(item);
    case 'helmet':
      return helmetPreview(item);
    case 'avatar':
      return avatarPreview(item, playerName);
    case 'celebration':
      return celebrationPreview(item);
    case 'title':
      return h('div', { class: 'ipreview ipreview--title' }, h('span', { class: 'ipreview__title-text', text: item.text }));
  }
}
