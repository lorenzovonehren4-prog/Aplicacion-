/**
 * Menú de pausa sobre la pista: la escena queda desenfocada detrás, con el
 * resumen de la sesión y las opciones Continuar, Reiniciar sesión, Ajustes y
 * Salir al menú (esta última pide confirmación).
 */

import gsap from 'gsap';
import type { UiAction } from '../../core/input/actions';
import { Disposer } from '../../core/utils/Disposer';
import { formatLapTime } from '../../core/utils/format';
import { h, prefersReducedMotion } from '../dom';
import { finished } from '../anim/finished';
import { createMenuButton } from '../components/MenuButton';
import { FocusNavigator } from '../nav/FocusNavigator';
import type { IconName } from '../icons';

export type PauseChoice = 'resume' | 'restart' | 'settings' | 'exit';

export interface PauseSummary {
  trackName: string;
  /** Vueltas completadas. */
  laps: number;
  /** Vueltas de la carrera (null en práctica). */
  totalLaps: number | null;
  bestLap: number | null;
}

export interface PauseMenuOptions {
  onChoice(choice: PauseChoice): void;
  onMove(): void;
}

const ITEMS: ReadonlyArray<{ id: PauseChoice; label: string; icon: IconName }> = [
  { id: 'resume', label: 'Continuar', icon: 'play' },
  { id: 'restart', label: 'Reiniciar sesión', icon: 'reset' },
  { id: 'settings', label: 'Ajustes', icon: 'gear' },
  { id: 'exit', label: 'Salir al menú', icon: 'exit' },
];

export class PauseMenu {
  readonly root: HTMLDivElement;
  private readonly own = new Disposer();
  private readonly nav: FocusNavigator;
  private readonly panel: HTMLDivElement;
  private readonly summary = h('div', { class: 'pause__summary' });
  private readonly buttons = new Map<PauseChoice, HTMLButtonElement>();
  private confirmingExit = false;
  private visible = false;

  constructor(private readonly options: PauseMenuOptions) {
    this.nav = new FocusNavigator({ onMove: () => options.onMove() });
    this.own.add(() => this.nav.dispose());
    const list = h('div', { class: 'pause__list' });
    for (const item of ITEMS) {
      const button = createMenuButton({ label: item.label, icon: item.icon });
      this.buttons.set(item.id, button);
      this.nav.add(button, { onConfirm: () => this.choose(item.id) });
      list.append(button);
    }
    this.panel = h(
      'div',
      { class: 'pause__panel', attrs: { role: 'dialog', 'aria-label': 'Pausa' } },
      h('h2', { class: 'pause__title', text: 'PAUSA' }),
      this.summary,
      list,
    );
    this.root = h('div', { class: 'pause' }, h('div', { class: 'pause__backdrop' }), this.panel);
  }

  get isVisible(): boolean {
    return this.visible;
  }

  show(summary: PauseSummary): void {
    this.visible = true;
    this.confirmingExit = false;
    this.setExitLabel('Salir al menú');
    this.summary.replaceChildren(
      h('span', { class: 'pause__track', text: summary.trackName }),
      h('span', {
        class: 'pause__stat',
        text:
          summary.totalLaps === null
            ? `${summary.laps} ${summary.laps === 1 ? 'vuelta' : 'vueltas'}`
            : `Vuelta ${Math.min(summary.laps + 1, summary.totalLaps)} de ${summary.totalLaps}`,
      }),
      h('span', { class: 'pause__stat', text: `Mejor ${summary.bestLap === null ? '–:––.–––' : formatLapTime(summary.bestLap)}` }),
    );
    this.root.classList.add('is-visible');
    this.nav.setEnabled(true);
    const first = this.buttons.get('resume');
    if (first) this.nav.focus(first);
    const quick = prefersReducedMotion();
    const tl = gsap.timeline();
    tl.fromTo(this.root.querySelector('.pause__backdrop'), { opacity: 0 }, { opacity: 1, duration: quick ? 0.01 : 0.3 }, 0);
    tl.fromTo(this.panel, { x: -60, opacity: 0 }, { x: 0, opacity: 1, duration: quick ? 0.01 : 0.45, ease: 'power3.out' }, 0);
    tl.from(this.panel.querySelectorAll('.mbtn'), { x: -40, opacity: 0, stagger: 0.05, duration: quick ? 0.01 : 0.4, ease: 'back.out(1.5)' }, 0.08);
    this.own.tween(tl);
  }

  async hide(): Promise<void> {
    if (!this.visible) return;
    this.visible = false;
    this.nav.setEnabled(false);
    const tl = gsap.timeline();
    tl.to(this.panel, { x: -40, opacity: 0, duration: 0.25, ease: 'power2.in' }, 0);
    tl.to(this.root.querySelector('.pause__backdrop'), { opacity: 0, duration: 0.25 }, 0);
    if (prefersReducedMotion()) tl.progress(1);
    this.own.tween(tl);
    await finished(tl);
    if (!this.visible) this.root.classList.remove('is-visible');
  }

  /** Habilita o no la navegación (con Ajustes encima, por ejemplo). */
  setEnabled(enabled: boolean): void {
    this.nav.setEnabled(enabled);
  }

  onAction(action: UiAction): void {
    if (!this.visible) return;
    if (action === 'back') {
      if (this.confirmingExit) {
        this.confirmingExit = false;
        this.setExitLabel('Salir al menú');
        return;
      }
      this.options.onChoice('resume');
      return;
    }
    this.nav.handle(action);
  }

  dispose(): void {
    this.own.dispose();
    this.root.remove();
  }

  private choose(choice: PauseChoice): void {
    if (choice === 'exit' && !this.confirmingExit) {
      // Primer toque: pide confirmación (se pierde la sesión).
      this.confirmingExit = true;
      this.setExitLabel('¿Salir? Pulsa de nuevo');
      this.options.onMove();
      return;
    }
    this.options.onChoice(choice);
  }

  private setExitLabel(text: string): void {
    const label = this.buttons.get('exit')?.querySelector('.mbtn__label');
    if (label) label.textContent = text;
  }
}
