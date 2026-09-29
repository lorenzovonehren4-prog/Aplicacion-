/**
 * Aviso de logro desbloqueado: entra desde arriba a la derecha, brilla en el
 * color del logro (bronce, plata u oro) y se va solo. Si llegan varios juntos
 * se muestran uno detrás de otro.
 */

import gsap from 'gsap';
import type { Achievement } from '../../progression/career';
import { h, prefersReducedMotion } from '../dom';
import { achievementBadge } from './AchievementBadge';

const SHOW_SECONDS = 3.6;

export class AchievementToasts {
  private readonly queue: Achievement[] = [];
  private busy = false;
  private readonly root: HTMLDivElement;

  constructor(
    host: HTMLElement,
    private readonly onShow: (achievement: Achievement) => void,
  ) {
    this.root = h('div', { class: 'toasts', attrs: { 'aria-live': 'polite' } });
    host.append(this.root);
  }

  show(achievement: Achievement): void {
    this.queue.push(achievement);
    if (!this.busy) this.next();
  }

  dispose(): void {
    this.queue.length = 0;
    gsap.killTweensOf(this.root.children);
    this.root.remove();
  }

  private next(): void {
    const achievement = this.queue.shift();
    if (!achievement) {
      this.busy = false;
      return;
    }
    this.busy = true;
    this.onShow(achievement);
    const toast = h(
      'div',
      { class: `toast toast--${achievement.tier}`, attrs: { role: 'status' } },
      achievementBadge(achievement.tier),
      h(
        'div',
        { class: 'toast__text' },
        h('span', { class: 'toast__kicker', text: 'LOGRO DESBLOQUEADO' }),
        h('span', { class: 'toast__name', text: achievement.name }),
        h('span', { class: 'toast__desc', text: achievement.description }),
      ),
    );
    this.root.append(toast);
    const quick = prefersReducedMotion();
    const tl = gsap.timeline({
      onComplete: () => {
        toast.remove();
        this.next();
      },
    });
    tl.fromTo(toast, { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: quick ? 0.01 : 0.45, ease: 'back.out(1.6)' });
    tl.to(toast, { x: 40, opacity: 0, duration: quick ? 0.01 : 0.35, ease: 'power2.in' }, `+=${SHOW_SECONDS}`);
  }
}
