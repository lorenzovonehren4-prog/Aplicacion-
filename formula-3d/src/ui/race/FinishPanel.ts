/**
 * Fin de carrera: franja a cuadros, tiempo total que cuenta hacia arriba,
 * mejor vuelta y la tabla de vueltas con sus sectores (fila por fila).
 * Opciones: repetir la carrera o salir al menú. La pantalla de resultados
 * completa con XP y recompensas llega en la Fase 6.
 */

import gsap from 'gsap';
import type { UiAction } from '../../core/input/actions';
import { Disposer } from '../../core/utils/Disposer';
import { formatLapTime } from '../../core/utils/format';
import type { RaceResult } from '../../race/Session';
import { h, prefersReducedMotion } from '../dom';
import { finished } from '../anim/finished';
import { createMenuButton } from '../components/MenuButton';
import { FocusNavigator } from '../nav/FocusNavigator';

export type FinishChoice = 'again' | 'exit';

export interface FinishPanelOptions {
  onChoice(choice: FinishChoice): void;
  onMove(): void;
}

export class FinishPanel {
  readonly root: HTMLDivElement;
  private readonly own = new Disposer();
  private readonly nav: FocusNavigator;
  private readonly total = h('span', { class: 'finish__total-value' });
  private readonly best = h('span', { class: 'finish__best-value' });
  private readonly table = h('div', { class: 'finish__table', attrs: { role: 'table', 'aria-label': 'Vueltas' } });
  private readonly note = h('p', { class: 'finish__note' });
  private readonly panel: HTMLDivElement;
  private readonly buttons: HTMLButtonElement[] = [];
  private visible = false;

  constructor(options: FinishPanelOptions) {
    this.nav = new FocusNavigator({ onMove: () => options.onMove() });
    this.own.add(() => this.nav.dispose());
    const again = createMenuButton({ label: 'Repetir carrera', icon: 'reset' });
    const exit = createMenuButton({ label: 'Salir al menú', icon: 'exit' });
    this.buttons.push(again, exit);
    this.nav.add(again, { onConfirm: () => options.onChoice('again') });
    this.nav.add(exit, { onConfirm: () => options.onChoice('exit') });

    this.panel = h(
      'div',
      { class: 'finish__panel', attrs: { role: 'dialog', 'aria-label': 'Carrera terminada' } },
      h('div', { class: 'finish__flag' }),
      h('h2', { class: 'finish__title', text: 'CARRERA TERMINADA' }),
      h(
        'div',
        { class: 'finish__summary' },
        h('div', { class: 'finish__total' }, h('span', { class: 'finish__label', text: 'TIEMPO TOTAL' }), this.total),
        h('div', { class: 'finish__best' }, h('span', { class: 'finish__label', text: 'MEJOR VUELTA' }), this.best),
      ),
      this.table,
      this.note,
      h('div', { class: 'finish__actions' }, again, exit),
    );
    this.root = h('div', { class: 'finish' }, h('div', { class: 'finish__backdrop' }), this.panel);
  }

  get isVisible(): boolean {
    return this.visible;
  }

  show(result: RaceResult, personalBest: boolean): void {
    this.visible = true;
    const header = h(
      'div',
      { class: 'finish__row finish__row--head', attrs: { role: 'row' } },
      ...['VUELTA', 'TIEMPO', 'S1', 'S2', 'S3'].map((text) => h('span', { text, attrs: { role: 'columnheader' } })),
    );
    const bestTime = result.bestLap?.time ?? null;
    const rows = result.laps.map((lap) =>
      h(
        'div',
        {
          class: `finish__row${lap.time === bestTime ? ' is-best' : ''}${lap.valid ? '' : ' is-invalid'}`,
          attrs: { role: 'row' },
        },
        h('span', { text: String(lap.number) }),
        h('span', { class: 'finish__time', text: formatLapTime(lap.time) }),
        ...lap.sectors.map((sector) => h('span', { text: formatLapTime(sector) })),
      ),
    );
    this.table.replaceChildren(header, ...rows);
    this.best.textContent = bestTime === null ? 'Ninguna válida' : formatLapTime(bestTime);
    this.note.textContent = personalBest
      ? '¡Nuevo récord personal en este circuito!'
      : result.laps.some((lap) => !lap.valid)
        ? 'Las vueltas tachadas se anularon por límites de pista o por volver a pista.'
        : '';

    this.root.classList.add('is-visible');
    this.nav.setEnabled(true);
    const first = this.buttons[0];
    if (first) this.nav.focus(first);

    const quick = prefersReducedMotion();
    const counter = { value: 0 };
    this.total.textContent = formatLapTime(quick ? result.totalTime : 0);
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(this.root.querySelector('.finish__backdrop'), { opacity: 0 }, { opacity: 1, duration: quick ? 0.01 : 0.4 }, 0);
    tl.fromTo(this.panel, { x: 80, opacity: 0 }, { x: 0, opacity: 1, duration: quick ? 0.01 : 0.6 }, 0);
    tl.fromTo(
      this.root.querySelector('.finish__flag'),
      { backgroundPositionX: '0px' },
      { backgroundPositionX: '-64px', duration: 1.2, ease: 'none', repeat: quick ? 0 : 2 },
      0,
    );
    if (!quick) {
      tl.to(
        counter,
        {
          value: result.totalTime,
          duration: 1.3,
          ease: 'power2.out',
          onUpdate: () => {
            this.total.textContent = formatLapTime(counter.value);
          },
        },
        0.3,
      );
    }
    tl.from(this.table.children, { x: 30, opacity: 0, stagger: quick ? 0 : 0.08, duration: quick ? 0.01 : 0.4 }, 0.4);
    tl.from(this.buttons, { x: 40, opacity: 0, stagger: quick ? 0 : 0.08, duration: quick ? 0.01 : 0.45, ease: 'back.out(1.6)' }, 0.8);
    this.own.tween(tl);
  }

  async hide(): Promise<void> {
    if (!this.visible) return;
    this.visible = false;
    this.nav.setEnabled(false);
    const tl = gsap.timeline();
    tl.to(this.panel, { x: 60, opacity: 0, duration: 0.3, ease: 'power2.in' }, 0);
    tl.to(this.root.querySelector('.finish__backdrop'), { opacity: 0, duration: 0.3 }, 0);
    if (prefersReducedMotion()) tl.progress(1);
    this.own.tween(tl);
    await finished(tl);
    if (!this.visible) this.root.classList.remove('is-visible');
  }

  onAction(action: UiAction): void {
    if (this.visible) this.nav.handle(action);
  }

  dispose(): void {
    this.own.dispose();
    this.root.remove();
  }
}
