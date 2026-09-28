/**
 * Promesa que se cumple cuando una animación de GSAP termina o se interrumpe
 * (así ningún `await` queda colgado si la animación se corta). Si ya terminó
 * —por ejemplo, porque se adelantó con `progress(1)`— se cumple al instante.
 */
export function finished(animation: gsap.core.Animation): Promise<void> {
  if (animation.totalProgress() >= 1) return Promise.resolve();
  return new Promise((resolve) => {
    animation.eventCallback('onComplete', () => resolve());
    animation.eventCallback('onInterrupt', () => resolve());
  });
}
