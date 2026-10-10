import gsap from 'gsap';

/**
 * Número que cuenta hacia arriba (XP, estadísticas, tiempos). Devuelve el tween
 * para poder cortarlo al salir de la pantalla.
 */
export function countUp(
  element: HTMLElement,
  to: number,
  options: { from?: number; duration?: number; delay?: number; format?: (value: number) => string } = {},
): gsap.core.Tween {
  const format = options.format ?? ((value: number) => String(Math.round(value)));
  const state = { value: options.from ?? 0 };
  element.textContent = format(state.value);
  return gsap.to(state, {
    value: to,
    duration: options.duration ?? 1.2,
    delay: options.delay ?? 0,
    ease: 'power3.out',
    onUpdate: () => {
      element.textContent = format(state.value);
    },
  });
}
