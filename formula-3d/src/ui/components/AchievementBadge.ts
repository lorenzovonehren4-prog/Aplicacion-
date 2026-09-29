/**
 * Medalla de un logro (SVG): un escudo facetado con una estrella, en bronce,
 * plata u oro; bloqueada, en gris con candado.
 */

import type { AchievementTier } from '../../progression/career';

const SVG_NS = 'http://www.w3.org/2000/svg';

const METALS: Readonly<Record<AchievementTier, readonly [string, string, string]>> = {
  bronze: ['#f0b27a', '#b0662c', '#5e3214'],
  silver: ['#f4f7fb', '#a9b3c1', '#4c5563'],
  gold: ['#fff1b8', '#f5c542', '#8a6410'],
};

let uid = 0;

function el(tag: string, attrs: Record<string, string | number>, ...children: SVGElement[]): SVGElement {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
  element.append(...children);
  return element;
}

export function achievementBadge(tier: AchievementTier, locked = false): SVGSVGElement {
  uid++;
  const id = `ab${uid}`;
  const [light, mid, dark] = locked ? (['#5b606b', '#3a3e46', '#1d2026'] as const) : METALS[tier];
  const svg = el(
    'svg',
    { viewBox: '0 0 64 64', class: `abadge abadge--${tier}${locked ? ' is-locked' : ''}`, 'aria-hidden': 'true' },
    el(
      'defs',
      {},
      el('linearGradient', { id, x1: 0, y1: 0, x2: 1, y2: 1 }, el('stop', { offset: 0, 'stop-color': light }), el('stop', { offset: 0.55, 'stop-color': mid }), el('stop', { offset: 1, 'stop-color': dark })),
    ),
    // Escudo hexagonal con borde oscuro.
    el('path', { d: 'M32 3 L57 16 L57 44 L32 61 L7 44 L7 16 Z', fill: dark }),
    el('path', { d: 'M32 7 L53 18 L53 42 L32 56 L11 42 L11 18 Z', fill: `url(#${id})` }),
    el('path', { d: 'M32 7 L53 18 L32 30 L11 18 Z', fill: 'rgba(255,255,255,0.22)' }),
    locked
      ? el('path', { d: 'M24 31 h16 v13 h-16 Z M27 31 v-4 a5 5 0 0 1 10 0 v4', fill: 'none', stroke: '#9aa0aa', 'stroke-width': 3, 'stroke-linejoin': 'round' })
      : el('path', { d: 'M32 17 L35.5 26.5 L45.5 27 L37.6 33.2 L40.4 43 L32 37.4 L23.6 43 L26.4 33.2 L18.5 27 L28.5 26.5 Z', fill: dark, opacity: 0.85 }),
  ) as SVGSVGElement;
  return svg;
}
