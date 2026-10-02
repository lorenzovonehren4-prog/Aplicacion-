/**
 * Menú principal: el monoplaza en el estudio con la cámara girando despacio,
 * botones que entran escalonados, tarjeta del piloto con XP que cuenta,
 * descripción del elemento enfocado y ayudas de controles según el dispositivo.
 *
 * Los accesos a pantallas que llegan en fases futuras se muestran bloqueados
 * con la fase correspondiente; se habilitan solos cuando su pantalla existe.
 */

import gsap from 'gsap';
import type { Game } from '../../core/Game';
import { GAME_VERSION, MAIN_MENU, type MenuItem, type MenuItemId } from '../../data/game';
import type { StudioScene } from '../../garage/StudioScene';
import { h, prefersReducedMotion } from '../dom';
import { ControlHints } from '../components/ControlHints';
import { createLogo } from '../components/Logo';
import { createMenuButton, denyFeedback } from '../components/MenuButton';
import { PlayerCard } from '../components/PlayerCard';
import { BaseScreen } from './BaseScreen';
import { uiWidth } from '../scale';

/**
 * Cómo se abre cada acceso del menú. Sólo figuran los que ya existen: el resto
 * se muestra bloqueado con su fase. Cada fase agrega aquí los suyos.
 */
const OPENERS: Partial<Record<MenuItemId, (game: Game) => Promise<boolean>>> = {
  practice: (game) => game.screens.goTo('raceSelect', { mode: 'practice' }),
  quickRace: (game) => game.screens.goTo('raceSelect', { mode: 'quickRace' }),
  timeTrial: (game) => game.screens.goTo('raceSelect', { mode: 'timeTrial' }),
  championship: (game) => game.screens.goTo('championship', undefined),
  pass: (game) => game.screens.goTo('pass', undefined),
  garage: (game) => game.screens.goTo('garage', undefined),
  profile: (game) => game.screens.goTo('profile', undefined),
  manual: (game) => game.screens.push('assistsManual', undefined),
  settings: (game) => game.screens.push('settings', undefined),
};

/** Cuánto se corre el auto a la derecha para dejar lugar al menú, según el ancho. */
function frameShiftFor(width: number): number {
  if (width < 720) return 0;
  if (width < 1100) return 0.08;
  return 0.12;
}

export class MainMenuScreen extends BaseScreen {
  readonly id = 'menu';
  private studio: StudioScene | null = null;
  private readonly buttons = new Map<MenuItemId, HTMLButtonElement>();
  private readonly top = h('header', { class: 'menu__top' });
  private readonly navHost = h('nav', { class: 'menu__nav', attrs: { 'aria-label': 'Menú principal' } });
  private readonly bottom = h('footer', { class: 'menu__bottom' });
  private readonly detailTitle = h('h3', { class: 'menu__detail-title' });
  private readonly detailText = h('p', { class: 'menu__detail-text' });
  private readonly detailNote = h('p', { class: 'menu__detail-note' });
  private readonly detail = h('div', { class: 'menu__detail' }, this.detailTitle, this.detailText, this.detailNote);
  private card: PlayerCard | null = null;
  private hints: ControlHints | null = null;
  private lastFocused: MenuItemId = 'practice';

  constructor(game: Game) {
    super(game, 'screen--menu');
  }

  async enter(): Promise<void> {
    // Si el 3D falla (GPU sin memoria, driver roto), el menú sigue funcionando sin auto.
    try {
      this.studio = await this.game.getStudio();
    } catch (error) {
      console.error('[Menú] Sin estudio 3D:', error);
      this.studio = null;
    }
    this.game.render.setView(this.studio);
    this.studio?.setFrameShift(frameShiftFor(uiWidth()));
    this.studio?.playIntro();

    const { profile, progression } = this.game.save.data;
    this.card = new PlayerCard(profile, progression);
    this.top.append(createLogo('menu__logo'), this.card.element);

    for (const group of MAIN_MENU) {
      const list = h('div', { class: 'menu__group' }, h('span', { class: 'menu__group-title', text: group.title }));
      for (const item of group.items) list.append(this.createButton(item));
      this.navHost.append(list);
    }

    this.hints = new ControlHints(
      [
        { keys: [{ keyboard: '↑↓', gamepad: '✚' }], label: 'Navegar' },
        { keys: [{ keyboard: 'ENTER', gamepad: 'A' }], label: 'Elegir' },
      ],
      this.game.input.lastDevice,
    );
    this.own.add(this.game.events.on('input:device', ({ device }) => this.hints?.setDevice(device)));

    const storageNote = this.game.save.isPersistent
      ? h('span', { class: 'menu__save is-ok', text: 'Progreso guardado en este navegador' })
      : h('span', { class: 'menu__save is-warn', text: 'Tu navegador bloquea el guardado: el progreso se perderá al cerrar' });
    this.bottom.append(
      h('div', { class: 'menu__bottom-left' }, this.detail, this.hints.element),
      h(
        'div',
        { class: 'menu__meta' },
        storageNote,
        h('span', { class: 'menu__version', text: `v${GAME_VERSION}` }),
      ),
    );

    this.root.append(
      h('div', { class: 'menu__scrim' }),
      h('div', { class: 'menu__tagline', attrs: { 'aria-hidden': 'true' }, text: 'La temporada comienza' }),
      this.top,
      this.navHost,
      this.bottom,
    );

    // Paralaje de la cámara con el ratón y encuadre según el ancho.
    this.own.listen(window, 'pointermove', (event) => {
      this.studio?.setPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
    });
    this.own.listen(window, 'resize', () => this.studio?.setFrameShift(frameShiftFor(uiWidth())));

    const first = this.buttons.get(this.lastFocused);
    if (first) this.nav.focus(first);
  }

  reveal(): void {
    const quick = prefersReducedMotion();
    const buttons = [...this.buttons.values()];
    const titles = [...this.navHost.querySelectorAll('.menu__group-title')];
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from(this.top.querySelector('.menu__logo'), { y: -30, opacity: 0, duration: 0.7 }, 0.1);
    if (this.card) {
      tl.from(this.card.element, { x: 60, opacity: 0, duration: 0.8 }, 0.2);
      for (const tween of this.card.animateIn(0.5)) tl.add(tween, 0);
    }
    tl.from(titles, { x: -30, opacity: 0, duration: 0.5, stagger: 0.12 }, 0.2);
    tl.from(buttons, { x: -90, opacity: 0, duration: 0.75, stagger: 0.055, ease: 'back.out(1.5)' }, 0.25);
    tl.from(this.bottom, { y: 24, opacity: 0, duration: 0.6 }, 0.6);
    if (quick) tl.progress(1);
    this.own.tween(tl);
  }

  update(dt: number): void {
    this.studio?.update(dt);
  }

  onCovered(): void {
    this.nav.setEnabled(false);
    // `overwrite: 'auto'` corta la animación de entrada si todavía estaba en curso.
    this.own.tween(
      gsap.to([this.top, this.navHost, this.bottom], {
        opacity: 0,
        x: -24,
        duration: 0.3,
        ease: 'power2.in',
        overwrite: 'auto',
      }),
    );
    // El auto vuelve al centro mientras hay un panel encima.
    this.studio?.setFrameShift(-0.12);
  }

  onUncovered(): void {
    this.nav.setEnabled(true);
    this.own.tween(
      gsap.to([this.top, this.navHost, this.bottom], {
        opacity: 1,
        x: 0,
        duration: 0.45,
        ease: 'power3.out',
        overwrite: 'auto',
      }),
    );
    this.studio?.setFrameShift(frameShiftFor(uiWidth()));
  }

  /** En el menú raíz, "volver" regresa al primer acceso. */
  protected onBack(): void {
    const first = this.buttons.get('practice');
    if (first && this.nav.focused !== first) {
      this.nav.focus(first, false);
    }
  }

  private createButton(item: MenuItem): HTMLButtonElement {
    const open = OPENERS[item.id];
    const button = createMenuButton({
      label: item.label,
      icon: item.icon,
      locked: !open,
      ...(open ? {} : { tag: `FASE ${item.phase}` }),
    });
    this.buttons.set(item.id, button);
    this.nav.add(button, {
      onFocus: () => {
        this.lastFocused = item.id;
        this.showDetail(item, open !== undefined);
      },
      onConfirm: () => this.select(button, open),
    });
    return button;
  }

  private select(button: HTMLButtonElement, open: ((game: Game) => Promise<boolean>) | undefined): void {
    if (!open) {
      this.game.playUi('locked');
      denyFeedback(button);
      gsap.fromTo(this.detailNote, { opacity: 0.4 }, { opacity: 1, duration: 0.4, ease: 'power2.out' });
      return;
    }
    this.game.playUi('confirm');
    void open(this.game);
  }

  private showDetail(item: MenuItem, available: boolean): void {
    this.detailTitle.textContent = item.label;
    this.detailText.textContent = item.description;
    this.detailNote.textContent = available ? '' : `Llega en la Fase ${item.phase} del desarrollo.`;
    gsap.fromTo(this.detail, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out', overwrite: true });
  }
}
