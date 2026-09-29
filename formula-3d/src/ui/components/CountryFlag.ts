/**
 * Banderas de los países de los circuitos, dibujadas en SVG (sin imágenes).
 * Si un país no tiene dibujo, se muestra su código en una etiqueta.
 */

import { h } from '../dom';

/** Estrella de `points` puntas centrada en (cx, cy). */
function star(cx: number, cy: number, outer: number, inner: number, points: number): string {
  const coords: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    coords.push(`${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`);
  }
  return `<polygon points="${coords.join(' ')}" fill="#fff"/>`;
}

/** Cruces de la Union Jack en el cantón (0–30 × 0–15). */
const UNION_JACK = `
  <path d="M0 0L30 15M30 0L0 15" stroke="#fff" stroke-width="3"/>
  <path d="M0 0L30 15M30 0L0 15" stroke="#e4002b" stroke-width="1"/>
  <path d="M15 0V15M0 7.5H30" stroke="#fff" stroke-width="5"/>
  <path d="M15 0V15M0 7.5H30" stroke="#e4002b" stroke-width="3"/>`;

const FLAGS: Readonly<Record<string, string>> = {
  IT: `<svg viewBox="0 0 3 2"><rect width="1" height="2" fill="#009246"/><rect x="1" width="1" height="2" fill="#f1f2f1"/><rect x="2" width="1" height="2" fill="#ce2b37"/></svg>`,
  AU: `<svg viewBox="0 0 60 30"><rect width="60" height="30" fill="#012169"/><svg width="30" height="15" viewBox="0 0 30 15">${UNION_JACK}</svg>${star(15, 22.5, 4.2, 1.8, 7)}${star(45, 24.5, 2, 0.9, 7)}${star(38, 13.5, 2, 0.9, 7)}${star(45, 5, 2, 0.9, 7)}${star(51, 11, 2, 0.9, 7)}${star(48, 16, 1.1, 0.5, 5)}</svg>`,
};

/** Bandera del país (`code` ISO de dos letras). */
export function createCountryFlag(code: string, className = 'flag'): HTMLElement {
  const svg = FLAGS[code];
  const element = h('span', { class: className, attrs: { role: 'img', 'aria-label': `Bandera (${code})` } });
  if (svg) element.innerHTML = svg;
  else element.append(h('span', { class: `${className}-code`, text: code }));
  return element;
}
