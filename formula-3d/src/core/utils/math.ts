/**
 * Utilidades matemáticas puras y sin asignaciones de memoria (se usan en el
 * bucle caliente). La Fase 2 suma las que necesita la física.
 */

/** Limita `value` al rango [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Interpolación lineal entre `a` y `b`. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Suavizado exponencial independiente de los FPS: acerca `current` a `target`
 * con una "velocidad" `lambda` (1/s). Con el mismo lambda, el resultado es igual
 * a 30 o a 144 FPS.
 */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}
