/**
 * Escala de la interfaz. Las pantallas están pensadas para ~1060×660 o más;
 * en una ventana más chica (el panel de claude.ai, una laptop chica) toda la
 * interfaz se achica en proporción con `zoom` (como una consola: misma
 * distribución, todo más chico), en vez de encimarse o cortarse.
 *
 * - El 3D no se escala: el lienzo siempre usa la ventana entera.
 * - Dentro de `#ui`, el ancho y alto "de diseño" son los de la ventana divididos
 *   por la escala; las reglas por tamaño usan `@container ui (...)` sobre ese
 *   tamaño (no `@media`, que mide la ventana real).
 */

/** Tamaño de referencia: por debajo, la interfaz se achica. */
export const UI_REFERENCE_WIDTH = 1060;
export const UI_REFERENCE_HEIGHT = 660;
/** Nunca más chica que esto (el texto seguiría legible). */
export const UI_MIN_SCALE = 0.6;

/** Escala (0,6–1) para una ventana de `width` × `height` px. */
export function uiScaleFor(width: number, height: number): number {
  if (width <= 0 || height <= 0) return 1;
  const fit = Math.min(width / UI_REFERENCE_WIDTH, height / UI_REFERENCE_HEIGHT);
  return Math.min(1, Math.max(UI_MIN_SCALE, fit));
}

let current = 1;

/** Aplica la escala para el tamaño de la ventana (variable CSS `--ui-zoom`). */
export function applyUiScale(width: number, height: number): void {
  const scale = uiScaleFor(width, height);
  if (Math.abs(scale - current) < 0.001) return;
  current = scale;
  document.documentElement.style.setProperty('--ui-zoom', scale.toFixed(3));
}

/**
 * Ancho de diseño de la interfaz (px de CSS dentro de `#ui`). Se calcula con
 * la ventana actual (en un `resize` puede llegar antes que `applyUiScale`).
 */
export function uiWidth(): number {
  return window.innerWidth / uiScaleFor(window.innerWidth, window.innerHeight);
}

/**
 * Cuánto se achica un elemento al dibujarse (tamaño en pantalla ÷ tamaño de
 * CSS): para pasar medidas de `getBoundingClientRect` a px de CSS del elemento.
 */
export function renderedScale(element: HTMLElement): number {
  const width = element.offsetWidth;
  if (width <= 0) return 1;
  const scale = element.getBoundingClientRect().width / width;
  return scale > 0 ? scale : 1;
}
