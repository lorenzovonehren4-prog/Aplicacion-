import type { Profile, Progression } from '../../core/save/schema';
import { formatInteger } from '../../core/utils/format';
import type { DeepReadonly } from '../../core/utils/types';
import { PLAYER_TITLES } from '../../data/game';
import { levelProgress } from '../../progression/levels';
import { countUp } from '../anim/countUp';
import { h } from '../dom';
import gsap from 'gsap';

/** Tarjeta del piloto: avatar, nombre, título, nivel y barra de XP. */
export class PlayerCard {
  readonly element: HTMLDivElement;
  private readonly bar: HTMLElement;
  private readonly xpText: HTMLElement;
  private readonly levelText: HTMLElement;
  private readonly progress;

  constructor(profile: DeepReadonly<Profile>, progression: DeepReadonly<Progression>) {
    this.progress = levelProgress(progression.level, progression.xp);
    const initial = profile.name.trim().charAt(0).toUpperCase() || 'P';
    this.bar = h('i');
    this.xpText = h('span', { text: this.formatXp(0) });
    this.levelText = h('b', { text: '0' });
    this.element = h(
      'div',
      { class: 'pcard' },
      h('div', { class: 'pcard__avatar', attrs: { 'aria-hidden': 'true' } }, h('span', { text: initial })),
      h(
        'div',
        { class: 'pcard__info' },
        h('div', { class: 'pcard__name', text: profile.name }),
        h('div', { class: 'pcard__title', text: PLAYER_TITLES[profile.titleId] ?? PLAYER_TITLES.rookie ?? '' }),
        h('div', { class: 'pcard__bar' }, this.bar),
        h('div', { class: 'pcard__xp' }, this.xpText),
      ),
      h('div', { class: 'pcard__level' }, h('small', { text: 'NIVEL' }), this.levelText),
    );
  }

  /** Anima nivel, XP y barra desde cero. Devuelve los tweens para poder cortarlos. */
  animateIn(delay: number): gsap.core.Animation[] {
    const { level, xp, fraction } = this.progress;
    return [
      countUp(this.levelText, level, { from: 0, duration: 0.8, delay }),
      countUp(this.xpText, xp, { duration: 1.4, delay: delay + 0.1, format: (v) => this.formatXp(v) }),
      gsap.fromTo(
        this.bar,
        { '--p': 0 },
        { '--p': fraction, duration: 1.4, delay: delay + 0.1, ease: 'power3.out' },
      ),
    ];
  }

  private formatXp(value: number): string {
    if (this.progress.isMax) return 'NIVEL MÁXIMO';
    return `${formatInteger(value)} / ${formatInteger(this.progress.needed)} XP`;
  }
}
