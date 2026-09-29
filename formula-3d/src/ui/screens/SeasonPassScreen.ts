/**
 * Pase de temporada: los 50 niveles en una tira que se desplaza, con la
 * recompensa de cada uno (boca arriba; las bloqueadas, atenuadas y con
 * candado) y un riel que se llena hasta tu XP. Abajo, el detalle del nivel
 * elegido. Los títulos y avatares desbloqueados se equipan acá mismo (ENTER);
 * el resto se usa en el Garaje.
 */

import gsap from 'gsap';
import type { Game } from '../../core/Game';
import { formatInteger } from '../../core/utils/format';
import { getItem, KIND_INFO, RARITY_INFO, type Item } from '../../progression/items';
import { passProgress, SEASON, xpUntilTier } from '../../progression/seasonPass';
import { finished } from '../anim/finished';
import { ControlHints } from '../components/ControlHints';
import { PlayerCard } from '../components/PlayerCard';
import { createRewardCard } from '../components/RewardCard';
import { h, prefersReducedMotion, svg } from '../dom';
import { ICONS } from '../icons';
import { BaseScreen } from './BaseScreen';

export class SeasonPassScreen extends BaseScreen {
  readonly id = 'pass';
  private readonly strip = h('div', { class: 'pass__strip' });
  private readonly track = h('div', { class: 'pass__track' }, this.strip);
  private readonly detail = h('section', { class: 'pass__detail' });
  private readonly cardSlot = h('div', { class: 'pass__card-slot' });
  private readonly tierButtons: HTMLButtonElement[] = [];
  private hints: ControlHints | null = null;
  private selected = 0;
  private scrollTween: gsap.core.Tween | null = null;

  constructor(game: Game) {
    super(game, 'screen--pass');
  }

  enter(): void {
    this.hints = new ControlHints(
      [
        { keys: [{ keyboard: '←→', gamepad: '✚' }], label: 'Recorrer' },
        { keys: [{ keyboard: 'ENTER', gamepad: 'A' }], label: 'Usar título / avatar' },
        { keys: [{ keyboard: 'ESC', gamepad: 'B' }], label: 'Volver' },
      ],
      this.game.input.lastDevice,
    );
    this.own.add(this.game.events.on('input:device', ({ device }) => this.hints?.setDevice(device)));
    const back = h('button', { class: 'rsel__back', attrs: { type: 'button' }, text: 'Volver' });
    this.own.listen(back, 'click', () => this.onBack());
    const progress = passProgress(this.passXp);
    this.root.append(
      h('div', { class: 'pass__backdrop fx-backdrop' }),
      this.header(progress.tier),
      this.track,
      this.detail,
      h('footer', { class: 'pass__footer' }, this.hints.element, back),
    );
    this.buildStrip();
    // Arranca en el próximo nivel a desbloquear (o en el último, con el pase completo).
    const start = Math.min(SEASON.tiers - 1, progress.tier);
    const button = this.tierButtons[start];
    if (button) this.nav.focus(button);
    this.select(start, false);
    this.own.listen(window, 'resize', () => this.scrollTo(this.selected, false));
  }

  reveal(): void {
    const quick = prefersReducedMotion();
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from(this.root.querySelector('.pass__header'), { y: -30, opacity: 0, duration: quick ? 0.01 : 0.5 }, 0);
    tl.from(this.track, { opacity: 0, duration: quick ? 0.01 : 0.4 }, 0.1);
    const visible = this.tierButtons.slice(Math.max(0, this.selected - 4), this.selected + 6);
    tl.from(visible, { y: 40, opacity: 0, stagger: quick ? 0 : 0.04, duration: quick ? 0.01 : 0.45, ease: 'back.out(1.6)' }, 0.15);
    tl.from(this.detail, { y: 30, opacity: 0, duration: quick ? 0.01 : 0.45 }, 0.3);
    this.own.tween(tl);
    // Tras el primer cuadro con tamaños reales, centra el nivel elegido.
    requestAnimationFrame(() => this.scrollTo(this.selected, false));
  }

  async hide(): Promise<void> {
    const tl = gsap.timeline();
    tl.to(this.root.children, { opacity: 0, duration: 0.25, ease: 'power2.in' }, 0);
    if (prefersReducedMotion()) tl.progress(1);
    await finished(tl);
  }

  protected onBack(): void {
    this.game.playUi('back');
    void this.game.screens.goTo('menu', undefined);
  }

  private get passXp(): number {
    return this.game.save.data.progression.pass.xp;
  }

  private header(tier: number): HTMLElement {
    const progress = passProgress(this.passXp);
    const bar = h('div', { class: 'res__bar res__bar--pass' }, h('i'));
    gsap.set(bar, { '--p': progress.fraction });
    const { profile, progression } = this.game.save.data;
    const card = new PlayerCard(profile, progression);
    for (const tween of card.animateIn(0.3)) this.own.tween(tween);
    return h(
      'header',
      { class: 'pass__header' },
      h(
        'div',
        { class: 'pass__heading' },
        h('span', { class: 'rsel__kicker', text: 'Pase de temporada' }),
        h('h2', { class: 'rsel__title', text: SEASON.name }),
        h('p', { class: 'pass__lead', text: `${SEASON.tiers} niveles de ${formatInteger(SEASON.xpPerTier)} XP. Todo se gana corriendo: cada carrera, práctica o contrarreloj suma.` }),
      ),
      h(
        'div',
        { class: 'pass__progress' },
        h(
          'div',
          { class: 'pass__progress-head' },
          h('span', { class: 'pass__progress-label', text: 'Tu avance' }),
          h('span', { class: 'pass__progress-tier', text: progress.complete ? 'COMPLETO' : `NIVEL ${tier} / ${SEASON.tiers}` }),
        ),
        bar,
        h(
          'span',
          { class: 'res__bar-text' },
          progress.complete ? 'Todas las recompensas desbloqueadas' : `${formatInteger(progress.xp)} / ${formatInteger(SEASON.xpPerTier)} XP para el nivel ${tier + 1}`,
        ),
      ),
      h('div', { class: 'pass__player' }, card.element),
    );
  }

  private buildStrip(): void {
    const progress = passProgress(this.passXp);
    const unlocked = this.game.save.data.progression.unlocked;
    SEASON.rewards.forEach((id, index) => {
      const item = getItem(id);
      if (!item) return;
      const tier = index + 1;
      const owned = unlocked.includes(id);
      // Riel: lleno hasta el nivel alcanzado; el que está en curso, a medias.
      const fill = tier <= progress.tier ? 1 : tier === progress.tier + 1 ? progress.fraction : 0;
      const rail = h('span', { class: 'ptier__rail' }, h('i'));
      rail.style.setProperty('--p', String(fill));
      const card = createRewardCard(item, { playerName: this.game.save.data.profile.name });
      const button = h(
        'button',
        {
          class: `ptier ptier--${item.rarity}${owned ? ' is-unlocked' : ' is-locked'}${tier === progress.tier + 1 ? ' is-current' : ''}${tier % 10 === 0 ? ' is-milestone' : ''}`,
          attrs: { type: 'button', 'aria-label': `Nivel ${tier}: ${item.name}` },
          style: { '--rarity': RARITY_INFO[item.rarity].color },
        },
        h('span', { class: 'ptier__num', text: String(tier) }),
        h('span', { class: 'ptier__card' }, card, h('span', { class: 'ptier__lock' }, svg(ICONS.lock))),
        rail,
      );
      this.nav.add(button, {
        onFocus: () => this.select(index, true),
        onConfirm: () => this.equip(item),
      });
      this.tierButtons.push(button);
      this.strip.append(button);
    });
  }

  private select(index: number, animate: boolean): void {
    this.selected = index;
    const item = getItem(SEASON.rewards[index] ?? '');
    if (!item) return;
    this.renderDetail(item, index + 1);
    this.scrollTo(index, animate);
  }

  /** Centra el nivel elegido en la tira. */
  private scrollTo(index: number, animate: boolean): void {
    const button = this.tierButtons[index];
    if (!button) return;
    const target = Math.max(0, button.offsetLeft + button.offsetWidth / 2 - this.track.clientWidth / 2);
    this.scrollTween?.kill();
    if (!animate || prefersReducedMotion()) {
      this.track.scrollLeft = target;
      return;
    }
    this.scrollTween = this.own.tween(gsap.to(this.track, { scrollLeft: target, duration: 0.45, ease: 'power3.out' }));
  }

  private renderDetail(item: Item, tier: number): void {
    const data = this.game.save.data;
    const owned = data.progression.unlocked.includes(item.id);
    const equipable = item.kind === 'title' || item.kind === 'avatar';
    const inUse = (item.kind === 'title' && data.profile.titleId === item.id) || (item.kind === 'avatar' && data.profile.avatarId === item.id);
    const rarity = RARITY_INFO[item.rarity];
    let status: string;
    let statusClass: string;
    if (!owned) {
      status = `Se desbloquea en el nivel ${tier} del pase · faltan ${formatInteger(xpUntilTier(this.passXp, tier))} XP`;
      statusClass = ' is-locked';
    } else if (inUse) {
      status = 'En uso';
      statusClass = ' is-used';
    } else if (equipable) {
      status = `Desbloqueado · ENTER para usar este ${item.kind === 'title' ? 'título' : 'avatar'}`;
      statusClass = ' is-ready';
    } else {
      status = 'Desbloqueado';
      statusClass = ' is-ready';
    }
    const card = createRewardCard(item, { playerName: data.profile.name });
    card.classList.add('is-revealed');
    this.cardSlot.replaceChildren(card);
    this.detail.replaceChildren(
      this.cardSlot,
      h(
        'div',
        { class: 'pass__info' },
        h('span', { class: 'pass__info-tier', text: `NIVEL ${tier}` }),
        h('h3', { class: 'pass__info-name', text: item.name }),
        h(
          'div',
          { class: 'pass__info-tags' },
          h('span', { class: 'pass__tag', text: rarity.label, style: { color: rarity.color, 'border-color': rarity.color } }),
          h('span', { class: 'pass__tag', text: KIND_INFO[item.kind].label }),
        ),
        h('p', { class: 'pass__info-text', text: item.description }),
        h('p', { class: 'pass__info-use', text: KIND_INFO[item.kind].use }),
        h('span', { class: `pass__status${statusClass}`, text: status }),
      ),
    );
  }

  /** Equipa un título o avatar desbloqueado (y refresca la tarjeta del piloto). */
  private equip(item: Item): void {
    const data = this.game.save.data;
    const owned = data.progression.unlocked.includes(item.id);
    if (!owned || (item.kind !== 'title' && item.kind !== 'avatar')) {
      this.game.playUi('locked');
      return;
    }
    this.game.save.update((draft) => {
      if (item.kind === 'title') draft.profile.titleId = item.id;
      else draft.profile.avatarId = item.id;
    });
    this.game.playUi('confirm');
    const { profile, progression } = this.game.save.data;
    const card = new PlayerCard(profile, progression);
    for (const tween of card.animateIn(0)) this.own.tween(tween).progress(1);
    const slot = this.root.querySelector('.pass__player');
    slot?.replaceChildren(card.element);
    if (!prefersReducedMotion()) this.own.tween(gsap.from(card.element, { scale: 1.08, duration: 0.4, ease: 'back.out(2)' }));
    this.renderDetail(item, this.selected + 1);
  }
}
