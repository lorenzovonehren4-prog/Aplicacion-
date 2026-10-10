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

/** Franjas horizontales iguales (de arriba hacia abajo). */
function bands(colors: readonly string[], w = 3, h = 2): string {
  const step = h / colors.length;
  const rects = colors.map((c, i) => `<rect y="${(i * step).toFixed(3)}" width="${w}" height="${step.toFixed(3)}" fill="${c}"/>`).join('');
  return `<svg viewBox="0 0 ${w} ${h}">${rects}</svg>`;
}

/** Franjas verticales iguales (de izquierda a derecha). */
function columns(colors: readonly string[], w = 3, h = 2): string {
  const step = w / colors.length;
  const rects = colors.map((c, i) => `<rect x="${(i * step).toFixed(3)}" width="${step.toFixed(3)}" height="${h}" fill="${c}"/>`).join('');
  return `<svg viewBox="0 0 ${w} ${h}">${rects}</svg>`;
}

/** Banda dentada a la izquierda (Baréin, Catar): `teeth` puntas sobre fondo `color`. */
function serrated(color: string, teeth: number, depth: number): string {
  const h = 30;
  const step = h / teeth;
  let path = 'M0 0H20';
  for (let i = 0; i < teeth; i++) path += `L${20 + depth} ${(i + 0.5) * step}L20 ${(i + 1) * step}`;
  path += 'H0Z';
  return `<svg viewBox="0 0 75 30"><rect width="75" height="30" fill="${color}"/><path d="${path}" fill="#fff"/></svg>`;
}

/** Hoja de arce simplificada, centrada en (0, 0) y de alto ~2. */
const MAPLE =
  'M0-1L.17-.68L.38-.78L.32-.3L.62-.55L.68-.38L.95-.43L.86-.12L1-.05L.62.25L.7.42L.1.36L.1.75H-.1L-.1.36L-.7.42L-.62.25L-1-.05L-.86-.12L-.95-.43L-.68-.38L-.62-.55L-.32-.3L-.38-.78L-.17-.68Z';

const FLAGS: Readonly<Record<string, string>> = {
  AT: bands(['#ed2939', '#ffffff', '#ed2939']),
  HU: bands(['#ce2939', '#ffffff', '#477050']),
  NL: bands(['#ae1c28', '#ffffff', '#21468b']),
  MC: bands(['#ce1126', '#ffffff'], 5, 4),
  BE: columns(['#1a1a1a', '#fdda24', '#ef3340'], 15, 13),
  ES: `<svg viewBox="0 0 3 2"><rect width="3" height="2" fill="#aa151b"/><rect y="0.5" width="3" height="1" fill="#f1bf00"/><rect x="0.62" y="0.72" width="0.32" height="0.56" rx="0.06" fill="#aa151b" opacity="0.85"/></svg>`,
  JP: `<svg viewBox="0 0 3 2"><rect width="3" height="2" fill="#ffffff"/><circle cx="1.5" cy="1" r="0.6" fill="#bc002d"/></svg>`,
  CN: `<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#de2910"/>${star(5, 5, 3, 1.15, 5).replace('#fff', '#ffde00')}${star(10, 2, 1, 0.38, 5).replace('#fff', '#ffde00')}${star(12, 4, 1, 0.38, 5).replace('#fff', '#ffde00')}${star(12, 7, 1, 0.38, 5).replace('#fff', '#ffde00')}${star(10, 9, 1, 0.38, 5).replace('#fff', '#ffde00')}</svg>`,
  BH: serrated('#ce1126', 5, 12),
  QA: serrated('#8a1538', 9, 9),
  SA: `<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#006c35"/><path d="M8 7.5c2-1.2 3 .6 5-.4s3 .8 5-.2 2.5.6 4 .2" stroke="#fff" stroke-width="1.1" fill="none" stroke-linecap="round"/><path d="M8 13.2H21.5l1.2-.8" stroke="#fff" stroke-width="0.8" fill="none"/></svg>`,
  US: `<svg viewBox="0 0 38 20">${Array.from({ length: 13 }, (_, i) => `<rect y="${(i * 20) / 13}" width="38" height="${20 / 13}" fill="${i % 2 === 0 ? '#b22234' : '#ffffff'}"/>`).join('')}<rect width="15.2" height="${(20 * 7) / 13}" fill="#3c3b6e"/>${Array.from({ length: 20 }, (_, i) => `<circle cx="${1.6 + (i % 5) * 3}" cy="${1.4 + Math.floor(i / 5) * 2.6}" r="0.55" fill="#fff"/>`).join('')}</svg>`,
  CA: `<svg viewBox="0 0 40 20"><rect width="40" height="20" fill="#ffffff"/><rect width="10" height="20" fill="#d52b1e"/><rect x="30" width="10" height="20" fill="#d52b1e"/><path d="${MAPLE}" transform="translate(20 10) scale(5.2)" fill="#d52b1e"/></svg>`,
  GB: `<svg viewBox="0 0 60 30"><rect width="60" height="30" fill="#012169"/><svg width="60" height="30" viewBox="0 0 30 15" preserveAspectRatio="none">${UNION_JACK}</svg></svg>`,
  AZ: `<svg viewBox="0 0 30 15"><rect width="30" height="5" fill="#0092bc"/><rect y="5" width="30" height="5" fill="#e4002b"/><rect y="10" width="30" height="5" fill="#00af66"/><circle cx="14.2" cy="7.5" r="2.2" fill="#fff"/><circle cx="14.8" cy="7.5" r="1.8" fill="#e4002b"/>${star(16.9, 7.5, 0.95, 0.42, 8)}</svg>`,
  SG: `<svg viewBox="0 0 30 20"><rect width="30" height="10" fill="#ef3340"/><rect y="10" width="30" height="10" fill="#ffffff"/><circle cx="6" cy="5" r="3.2" fill="#fff"/><circle cx="7.3" cy="5" r="3.1" fill="#ef3340"/>${[[9.5, 2.6], [11.3, 3.9], [10.6, 6], [8.4, 6], [7.7, 3.9]].map(([x, y]) => star(x ?? 0, y ?? 0, 0.75, 0.3, 5)).join('')}</svg>`,
  MX: `<svg viewBox="0 0 28 16">${columns(['#006847', '#ffffff', '#ce1126'], 28, 16).replace(/^<svg[^>]*>|<\/svg>$/g, '')}<circle cx="14" cy="8" r="2.6" fill="#8c5a2b"/><path d="M11.8 9.6q2.2 1.6 4.4 0" stroke="#3f7f3a" stroke-width="0.7" fill="none"/></svg>`,
  BR: `<svg viewBox="0 0 30 21"><rect width="30" height="21" fill="#009c3b"/><path d="M15 2L27.5 10.5L15 19L2.5 10.5Z" fill="#ffdf00"/><circle cx="15" cy="10.5" r="5" fill="#002776"/><path d="M10.2 9.6q4.8-1.8 9.6 1.6" stroke="#fff" stroke-width="0.9" fill="none"/></svg>`,
  AE: `<svg viewBox="0 0 30 15"><rect width="30" height="5" fill="#00732f"/><rect y="5" width="30" height="5" fill="#ffffff"/><rect y="10" width="30" height="5" fill="#000000"/><rect width="7.5" height="15" fill="#ff0000"/></svg>`,
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
