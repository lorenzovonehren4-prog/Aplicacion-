/**
 * Carta de recompensa: el dorso con el logo y, del otro lado, la vista previa
 * del ítem, su tipo, nombre y rareza (el borde y el brillo toman el color de
 * la rareza). Se da vuelta con `rotationY` sobre `.rcard__inner`.
 */

import { KIND_INFO, RARITY_INFO, type Item } from '../../progression/items';
import { h, svg } from '../dom';
import { ICONS } from '../icons';
import { itemPreview } from './ItemPreview';

export interface RewardCardOptions {
  /** Empieza boca abajo (para darla vuelta con una animación). */
  faceDown?: boolean;
  /** Nombre del piloto (para el avatar de iniciales). */
  playerName?: string;
}

export function createRewardCard(item: Item, options: RewardCardOptions = {}): HTMLDivElement {
  const rarity = RARITY_INFO[item.rarity];
  const card = h(
    'div',
    { class: `rcard rcard--${item.rarity}${options.faceDown ? '' : ' is-open'}`, style: { '--rarity': rarity.color } },
    h(
      'div',
      { class: 'rcard__inner' },
      h('div', { class: 'rcard__face rcard__back' }, svg(ICONS.logoMark, 'rcard__logo')),
      h(
        'div',
        { class: 'rcard__face rcard__front' },
        h('span', { class: 'rcard__rarity', text: rarity.label }),
        h('div', { class: 'rcard__art' }, itemPreview(item, options.playerName)),
        h('span', { class: 'rcard__kind', text: KIND_INFO[item.kind].label }),
        h('span', { class: 'rcard__name', text: item.name }),
      ),
    ),
    h('span', { class: 'rcard__shine' }),
  );
  card.setAttribute('aria-label', `${KIND_INFO[item.kind].label}: ${item.name} (${rarity.label})`);
  return card;
}
