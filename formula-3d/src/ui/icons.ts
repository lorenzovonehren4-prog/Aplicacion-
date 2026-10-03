/**
 * Íconos propios en SVG (trazos con `currentColor`, 24×24). Se crean con
 * `svg()` de `dom.ts`.
 */

const stroke = (paths: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

export const ICONS = {
  /** Bandera a cuadros: carrera rápida. */
  flag: `<svg viewBox="0 0 24 24" fill="none"><path d="M5 21V4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M5 4h14v10H5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path fill="currentColor" d="M5 4h3.5v2.5H5zM12 4h3.5v2.5H12zM8.5 6.5H12V9H8.5zM15.5 6.5H19V9h-3.5zM5 9h3.5v2.5H5zM12 9h3.5v2.5H12zM8.5 11.5H12V14H8.5zM15.5 11.5H19V14h-3.5z"/></svg>`,
  /** Casco: práctica libre. */
  helmet: stroke('<path d="M3.5 15a8.5 8.5 0 0 1 17 0v2.5a1.5 1.5 0 0 1-1.5 1.5H7a3.5 3.5 0 0 1-3.5-3.5z"/><path d="M11 11.5h9.3M11 11.5V15h9.5"/>'),
  play: stroke('<path d="M7 4.5v15l12-7.5z"/>'),
  pause: stroke('<path d="M8 5v14M16 5v14"/>'),
  exit: stroke('<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>'),
  camera: stroke('<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 11l5-3v8l-5-3"/>'),
  stopwatch: stroke('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M9.5 2.5h5M12 2.5v3.5M18.5 6.5l1.5-1.5"/>'),
  trophy: stroke(
    '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5.5H4.5a3 3 0 0 0 3.5 4M16 5.5h3.5a3 3 0 0 1-3.5 4"/><path d="M12 13v3.5M8.5 20h7M9.5 20l.5-3.5h4l.5 3.5"/>',
  ),
  wrench: stroke(
    '<path d="M14.5 6.5a4 4 0 0 0 5 5l-9.5 9.5a2.1 2.1 0 0 1-3-3L16.5 8.5a4 4 0 0 1-2-2z"/><path d="M14.5 6.5 17 4l3 3-2.5 2.5"/>',
  ),
  pass: stroke('<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8-4.3-4.1 5.9-.9z"/>'),
  user: stroke('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  book: stroke('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5M8 7.5h8M8 11h6"/>'),
  gear: stroke(
    '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5"/><circle cx="12" cy="12" r="6.6"/>',
  ),
  lock: stroke('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'),
  chevronRight: stroke('<path d="M9 5l7 7-7 7"/>'),
  chevronLeft: stroke('<path d="M15 5l-7 7 7 7"/>'),
  reset: stroke('<path d="M4 12a8 8 0 1 0 2.5-5.8"/><path d="M4 4v4.5h4.5"/>'),
  /** Rayo: motor (mejoras). */
  bolt: stroke('<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>'),
  /** Alerón visto de costado: aerodinámica. */
  wing: stroke('<path d="M3 9.5c4.5-2.5 13.5-2.5 18 0"/><path d="M5 14h14"/><path d="M8 9v8M16 9v8"/><path d="M5 17h14"/>'),
  /** Disco de freno con su pinza: frenos. */
  disc: stroke('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 5.5v1.5M17.6 9l-1.3.8M17.6 15l-1.3-.8M6.4 9l1.3.8M6.4 15l1.3-.8"/><path d="M16.5 3.5c2.4 1.2 4 3.3 4.5 5.8"/>'),
  /** Dos engranajes: caja de cambios. */
  gears: stroke(
    '<circle cx="9" cy="10" r="3"/><path d="M9 4.5v1.6M9 13.9v1.6M3.5 10h1.6M12.9 10h1.6M5.1 6.1l1.1 1.1M11.8 12.8l1.1 1.1M5.1 13.9l1.1-1.1M11.8 7.2l1.1-1.1"/><circle cx="17" cy="17" r="2.2"/><path d="M17 13v1M17 20v1M13 17h1M20 17h1"/>',
  ),
  /** Chasis visto desde arriba: chasis y suspensión. */
  chassis: stroke('<path d="M9 3h6l1.5 5v8L15 21H9l-1.5-5V8z"/><path d="M4 6h3.5M16.5 6H20M4 18h3.5M16.5 18H20"/><path d="M4 4.5v3M20 4.5v3M4 16.5v3M20 16.5v3"/>'),
  /** Mapa de un circuito: guía de circuitos. */
  circuit: stroke('<path d="M6 19c-2 0-3-1.5-3-3.5S4 12 6 12h3c1.5 0 2-1 2-2s-.5-2-2-2H8c-1.5 0-2-1-2-2s1-2 2.5-2H17c2.5 0 4 1.5 4 4v7c0 3-2 6-5 6z"/><path d="M14 15.5h3"/>'),
  /** Marca del juego: la trazada pasando por el ápice de una curva. */
  logoMark: `<svg viewBox="0 0 64 64" fill="none"><path d="M6 54C18 52 26 14 32 12s14 40 26 42" stroke="#ff2a3c" stroke-width="7" stroke-linecap="round"/><path d="M14 58C24 56 28 30 32 28" stroke="#ffffff" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="12.5" r="4.6" fill="#ffffff"/></svg>`,
} as const;

export type IconName = keyof typeof ICONS;
