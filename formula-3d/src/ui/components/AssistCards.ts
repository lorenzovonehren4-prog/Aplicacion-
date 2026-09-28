/**
 * Tarjetas grandes de los niveles de ayudas (Ajustes → Ayudas): ícono,
 * nombre, descripción, valor de cada ayuda y multiplicador de XP. La elegida
 * se ilumina con el acento; al elegir, la tarjeta "late" y un brillo la cruza.
 */

import gsap from 'gsap';
import {
  ASSIST_PRESETS,
  BRAKING_LABELS,
  LEVEL_INFO,
  LINE_LABELS,
  LINE_TYPE_LABELS,
  TRACTION_LABELS,
  customXpMultiplier,
  xpMultiplier,
} from '../../assists/presets';
import { ASSIST_LEVELS, type AssistConfig, type AssistLevel, type AssistSettings } from '../../core/save/schema';
import type { DeepReadonly } from '../../core/utils/types';
import { h, prefersReducedMotion, svg } from '../dom';
import type { RowContext, SettingRow } from './SettingRows';

const stroke = (paths: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

/** Íconos de cada nivel: escudo, tacómetro a media aguja, tacómetro a fondo, controles. */
const LEVEL_ICONS: Readonly<Record<AssistLevel, string>> = {
  beginner: stroke('<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>'),
  intermediate: stroke('<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l-2-5"/><path d="M7 16h.01M17 16h.01"/>'),
  advanced: stroke('<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l5-4"/><path d="M13 5l1-2M18.5 8l1.8-1"/>'),
  custom: stroke('<path d="M5 5v14M12 5v14M19 5v14"/><circle cx="5" cy="9" r="2"/><circle cx="12" cy="15" r="2"/><circle cx="19" cy="8" r="2"/>'),
};

export interface AssistCardsOptions {
  get(): DeepReadonly<AssistSettings>;
  select(level: AssistLevel): void;
}

function formatXp(multiplier: number): string {
  return `XP ×${multiplier.toFixed(2).replace(/0$/, '')}`;
}

export function assistCards(ctx: RowContext, options: AssistCardsOptions): SettingRow {
  const cards = new Map<AssistLevel, { card: HTMLButtonElement; values: HTMLDListElement; xp: HTMLSpanElement }>();
  const element = h('div', { class: 'acards', attrs: { role: 'radiogroup', 'aria-label': 'Nivel de ayudas' } });

  const valuesFor = (level: AssistLevel): DeepReadonly<AssistConfig> =>
    level === 'custom' ? options.get().custom : ASSIST_PRESETS[level];

  const fillValues = (list: HTMLDListElement, config: DeepReadonly<AssistConfig>): void => {
    const pairs: Array<[string, string]> = [
      ['Frenado', BRAKING_LABELS[config.braking]],
      ['Tracción', TRACTION_LABELS[config.traction]],
      ['ABS', config.abs ? 'Activado' : 'Desactivado'],
      ['Línea', LINE_LABELS[config.line]],
      ['Tipo', config.line === 'off' ? '—' : LINE_TYPE_LABELS[config.lineType]],
    ];
    list.replaceChildren(...pairs.flatMap(([term, value]) => [h('dt', { text: term }), h('dd', { text: value })]));
  };

  for (const level of ASSIST_LEVELS) {
    const info = LEVEL_INFO[level];
    const values = h('dl', { class: 'acard__values' });
    const xp = h('span', { class: 'acard__xp' });
    const card = h(
      'button',
      { class: `acard acard--${level}`, attrs: { type: 'button', role: 'radio' } },
      h('span', { class: 'acard__shine' }),
      h('span', { class: 'acard__top' }, svg(LEVEL_ICONS[level], 'icon acard__icon'), xp),
      h('span', { class: 'acard__name', text: info.name }),
      h('span', { class: 'acard__description', text: info.description }),
      values,
    );
    cards.set(level, { card, values, xp });
    element.append(card);
    ctx.nav.add(card, {
      onConfirm: () => {
        if (options.get().level === level) return;
        options.select(level);
        ctx.play('confirm');
        refresh();
        if (!prefersReducedMotion()) {
          ctx.own.tween(gsap.fromTo(card, { scale: 0.96 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' }));
          ctx.own.tween(
            gsap.fromTo(card.querySelector('.acard__shine'), { xPercent: -120 }, { xPercent: 220, duration: 0.7, ease: 'power2.out' }),
          );
        }
      },
      onFocus: () =>
        ctx.showHelp(
          info.name,
          level === 'beginner' ? `${info.description} ¿Nuevo? Empieza aquí.` : info.description,
        ),
    });
  }

  const refresh = (): void => {
    const settings = options.get();
    for (const [level, parts] of cards) {
      const selected = settings.level === level;
      parts.card.classList.toggle('is-selected', selected);
      parts.card.setAttribute('aria-checked', String(selected));
      fillValues(parts.values, valuesFor(level));
      parts.xp.textContent = formatXp(
        level === 'custom' ? customXpMultiplier(settings.custom) : xpMultiplier({ ...settings, level }),
      );
    }
  };
  refresh();
  return { element, refresh };
}
