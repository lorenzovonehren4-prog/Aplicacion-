import { h, svg } from '../dom';
import { ICONS } from '../icons';

/** Logo del juego: marca (la trazada por el ápice) + "ÁPICE" + insignia "GP". */
export function createLogo(className = ''): HTMLDivElement {
  return h(
    'div',
    { class: `logo ${className}`.trim(), attrs: { role: 'img', 'aria-label': 'Ápice GP' } },
    svg(ICONS.logoMark, 'logo__mark'),
    h(
      'div',
      { class: 'logo__word' },
      h('span', { class: 'logo__name', text: 'ÁPICE' }),
      h('span', { class: 'logo__gp' }, h('span', { text: 'GP' })),
    ),
  );
}
