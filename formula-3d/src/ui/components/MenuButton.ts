import { h, svg } from '../dom';
import { ICONS, type IconName } from '../icons';

export interface MenuButtonOptions {
  label: string;
  icon: IconName;
  /** Etiqueta pequeña a la derecha (p. ej., "FASE 5" en accesos bloqueados). */
  tag?: string;
  locked?: boolean;
}

/**
 * Botón grande del menú: paralelogramo con relleno que barre al enfocarse,
 * borde con un brillo que lo recorre y un destello que cruza el botón.
 */
export function createMenuButton(options: MenuButtonOptions): HTMLButtonElement {
  const end = h('span', { class: 'mbtn__end' });
  if (options.tag) end.append(h('span', { class: 'mbtn__tag', text: options.tag }));
  end.append(svg(options.locked ? ICONS.lock : ICONS.chevronRight, 'icon mbtn__chev'));

  return h(
    'button',
    {
      class: `mbtn${options.locked ? ' is-locked' : ''}`,
      attrs: { type: 'button', 'aria-disabled': options.locked ? 'true' : false },
    },
    h('span', { class: 'mbtn__bg' }),
    h('span', { class: 'mbtn__fill' }),
    h('span', { class: 'mbtn__shine' }),
    h('span', { class: 'mbtn__border' }),
    h(
      'span',
      { class: 'mbtn__content' },
      svg(ICONS[options.icon], 'icon mbtn__icon'),
      h('span', { class: 'mbtn__label', text: options.label }),
      end,
    ),
  );
}

/** Sacudida breve de "no disponible". */
export function denyFeedback(button: HTMLElement): void {
  button.classList.remove('is-denied');
  // Fuerza un reflow para poder repetir la animación.
  void button.offsetWidth;
  button.classList.add('is-denied');
}
