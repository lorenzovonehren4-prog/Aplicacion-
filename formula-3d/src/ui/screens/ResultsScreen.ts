/**
 * Resultados de una sesión (la XP ya está sumada al guardado; esta pantalla
 * la cuenta con ceremonia):
 * 1. Posición, tiempos y las líneas de XP una por una (con sus multiplicadores).
 * 2. La barra de nivel se llena con chispas en la punta; al cruzar un nivel,
 *    destello, sonido y "¡NIVEL N!".
 * 3. La barra del pase de temporada; cada nivel del pase completado da vuelta
 *    su carta de recompensa (el brillo y el sonido dependen de la rareza).
 * ENTER o ESC durante la animación la adelantan al final.
 */

import gsap from 'gsap';
import type { Game } from '../../core/Game';
import type { UiAction } from '../../core/input/actions';
import type { RaceSelectMode, ResultsParams } from '../../core/screens/params';
import { formatInteger, formatLapTime } from '../../core/utils/format';
import { getItem, RARITY_INFO, type Item } from '../../progression/items';
import { levelProgress, MAX_LEVEL, xpToNextLevel } from '../../progression/levels';
import { passProgress, SEASON, xpUntilTier } from '../../progression/seasonPass';
import { SparkField } from '../anim/SparkField';
import { finished } from '../anim/finished';
import { ControlHints } from '../components/ControlHints';
import { createMenuButton } from '../components/MenuButton';
import { createRewardCard } from '../components/RewardCard';
import { h, prefersReducedMotion } from '../dom';
import type { IconName } from '../icons';
import { BaseScreen } from './BaseScreen';

const GOLD = '#f5c542';
const RED = '#ff2a3c';
/** Duración de la barra por nivel completo (s) y mínima de cada tramo. */
const BAR_SECONDS_PER_LEVEL = 1.1;
const BAR_MIN_SECONDS = 0.35;

interface Action {
  label: string;
  icon: IconName;
  run: () => void;
}

/** Tramos de una barra que se llena cruzando niveles: de `from` a `to` (0–1) en cada uno. */
interface BarSegment {
  from: number;
  to: number;
  /** Al completarse, ¿se cruzó un nivel? */
  levelUp: boolean;
}

function segments(startFraction: number, levels: number, endFraction: number): BarSegment[] {
  if (levels === 0) return [{ from: startFraction, to: endFraction, levelUp: false }];
  const list: BarSegment[] = [{ from: startFraction, to: 1, levelUp: true }];
  for (let i = 1; i < levels; i++) list.push({ from: 0, to: 1, levelUp: true });
  if (endFraction > 0) list.push({ from: 0, to: endFraction, levelUp: false });
  return list;
}

export class ResultsScreen extends BaseScreen<ResultsParams> {
  readonly id = 'results';
  private params!: ResultsParams;
  private readonly main = h('div', { class: 'res__main' });
  private readonly side = h('div', { class: 'res__side' });
  private sparks: SparkField | null = null;
  private hints: ControlHints | null = null;
  private timeline: gsap.core.Timeline | null = null;
  /** Adelantando la animación: sin sonidos ni chispas en los eventos saltados. */
  private skipping = false;
  private readonly lineRows: HTMLElement[] = [];
  private readonly multiplierRows: HTMLElement[] = [];
  private readonly totalValue = h('span', { class: 'res__total-value', text: '0' });
  private readonly totalRow = h('div', { class: 'res__total' }, h('span', { class: 'res__total-label', text: 'XP GANADA' }), this.totalValue);
  private readonly levelNumber = h('span', { class: 'res__level-number' });
  private readonly levelBar = h('div', { class: 'res__bar' }, h('i'));
  private readonly levelText = h('span', { class: 'res__bar-text' });
  private readonly levelBadge = h('div', { class: 'res__badge' }, h('small', { text: 'NIVEL' }), this.levelNumber);
  private readonly passTier = h('span', { class: 'res__pass-tier' });
  private readonly passBar = h('div', { class: 'res__bar res__bar--pass' }, h('i'));
  private readonly passText = h('span', { class: 'res__bar-text' });
  private readonly rewardRow = h('div', { class: 'res__rewards' });
  private readonly rewardTitle = h('h3', { class: 'res__section' });
  private readonly banner = h('div', { class: 'res__banner' });
  private readonly actions = h('div', { class: 'res__actions' });
  private rewardCards: HTMLElement[] = [];

  constructor(game: Game) {
    super(game, 'screen--results');
  }

  enter(params: ResultsParams): void {
    this.params = params;
    this.hints = new ControlHints(
      [
        { keys: [{ keyboard: '←→', gamepad: '✚' }], label: 'Elegir' },
        { keys: [{ keyboard: 'ENTER', gamepad: 'A' }], label: 'Aceptar / adelantar' },
        { keys: [{ keyboard: 'ESC', gamepad: 'B' }], label: 'Menú' },
      ],
      this.game.input.lastDevice,
    );
    this.own.add(this.game.events.on('input:device', ({ device }) => this.hints?.setDevice(device)));
    this.buildMain();
    this.buildSide();
    this.root.append(
      h('div', { class: 'res__backdrop' }),
      h('div', { class: 'res__stripes' }),
      this.main,
      this.side,
      this.banner,
      h('footer', { class: 'res__footer' }, this.hints.element),
    );
    this.sparks = new SparkField(this.root);
    this.own.add(() => this.sparks?.dispose());
  }

  reveal(): void {
    this.timeline = this.buildTimeline();
    this.own.tween(this.timeline);
    if (prefersReducedMotion()) this.skip();
  }

  async hide(): Promise<void> {
    this.skip();
    const tl = gsap.timeline();
    tl.to([this.main, this.side], { opacity: 0, duration: 0.25, ease: 'power2.in' }, 0);
    if (prefersReducedMotion()) tl.progress(1);
    await finished(tl);
  }

  override onAction(action: UiAction): void {
    // Mientras se cuenta la XP, aceptar o volver la adelantan al final.
    if (this.timeline && this.timeline.progress() < 1 && (action === 'confirm' || action === 'back')) {
      this.skip();
      return;
    }
    super.onAction(action);
  }

  protected onBack(): void {
    this.game.playUi('back');
    void this.game.screens.goTo('menu', undefined);
  }

  // ─── Contenido ─────────────────────────────────────────────────────────

  private buildMain(): void {
    const p = this.params;
    const place =
      p.position !== null
        ? h(
            'div',
            { class: `res__place${p.position <= 3 ? ' is-podium' : ''}` },
            h('span', { class: 'res__place-value', text: `P${p.position}` }),
            h('span', { class: 'res__place-of', text: `de ${p.starters}` }),
          )
        : null;
    const stats = h(
      'div',
      { class: 'res__stats' },
      ...(p.totalTime !== null ? [this.stat('TIEMPO TOTAL', formatLapTime(p.totalTime))] : []),
      this.stat('MEJOR VUELTA', p.bestLap === null ? '—' : formatLapTime(p.bestLap), p.personalBest ? 'RÉCORD' : null),
    );
    for (const line of p.award.lines) {
      const value = h('span', { class: 'res__line-xp', text: '+0' });
      value.dataset.xp = String(line.xp);
      this.lineRows.push(
        h('div', { class: 'res__line' }, h('span', { class: 'res__line-label', text: line.label }), h('span', { class: 'res__line-detail', text: line.detail }), value),
      );
    }
    if (p.award.lines.length === 0) {
      this.lineRows.push(h('div', { class: 'res__line is-empty' }, h('span', { class: 'res__line-label', text: 'Sin vueltas válidas: esta vez no hay XP.' })));
    }
    for (const multiplier of p.award.multipliers) {
      this.multiplierRows.push(
        h(
          'div',
          { class: `res__line res__line--mult${multiplier.value > 1 ? ' is-bonus' : multiplier.value < 1 ? ' is-malus' : ''}` },
          h('span', { class: 'res__line-label', text: multiplier.label }),
          h('span', { class: 'res__line-detail' }),
          h('span', { class: 'res__line-xp', text: `×${multiplier.value.toFixed(2)}` }),
        ),
      );
    }
    this.buildActions();
    this.main.append(
      h(
        'header',
        { class: 'res__header' },
        h('div', { class: 'res__heading' }, h('span', { class: 'res__kicker', text: `${p.modeLabel} · ${p.trackName}` }), h('h2', { class: 'res__title', text: 'Resultados' })),
        ...(place ? [place] : []),
      ),
      stats,
      h('h3', { class: 'res__section', text: 'Experiencia' }),
      h('div', { class: 'res__lines' }, ...this.lineRows, ...this.multiplierRows),
      this.totalRow,
      this.actions,
    );
  }

  private stat(label: string, value: string, badge: string | null = null): HTMLElement {
    return h(
      'div',
      { class: 'res__stat' },
      h('span', { class: 'res__stat-label', text: label }),
      h('span', { class: 'res__stat-value', text: value }, ...(badge ? [h('b', { class: 'res__stat-badge', text: badge })] : [])),
    );
  }

  private buildActions(): void {
    const p = this.params;
    const race = p.race;
    const selectMode: RaceSelectMode = race.mode === 'race' ? 'quickRace' : race.mode;
    const list: Action[] = [];
    // Carrera con rivales: primero, el podio.
    if (p.podium.length >= 3) list.push({ label: 'Ver el podio', icon: 'trophy', run: () => void this.game.screens.goTo('podium', p) });
    if (race.championshipRound !== undefined) {
      list.push({ label: 'Ver campeonato', icon: 'trophy', run: () => void this.game.screens.goTo('championship', undefined) });
    } else {
      list.push({
        label: race.mode === 'race' ? 'Repetir carrera' : 'Volver a la pista',
        icon: 'reset',
        run: () => void this.game.screens.goTo('race', race),
      });
      list.push({
        label: race.mode === 'race' ? 'Otra carrera' : 'Otro circuito',
        icon: 'flag',
        run: () => void this.game.screens.goTo('raceSelect', { mode: selectMode }),
      });
    }
    list.push({ label: 'Pase de temporada', icon: 'pass', run: () => void this.game.screens.goTo('pass', undefined) });
    list.push({ label: 'Menú principal', icon: 'exit', run: () => void this.game.screens.goTo('menu', undefined) });
    for (const action of list) {
      const button = createMenuButton({ label: action.label, icon: action.icon });
      this.nav.add(button, {
        onConfirm: () => {
          this.game.playUi('confirm');
          action.run();
        },
      });
      this.actions.append(button);
    }
    const first = this.actions.firstElementChild;
    if (first instanceof HTMLElement) this.nav.focus(first);
  }

  private buildSide(): void {
    const p = this.params;
    const before = levelProgress(p.before.level, p.before.xp);
    this.levelNumber.textContent = String(p.before.level);
    this.setBar(this.levelBar, before.fraction);
    this.levelText.textContent = this.levelLabel(p.before.level, p.before.xp);
    const pass = passProgress(p.before.passXp);
    this.passTier.textContent = this.tierLabel(pass.tier);
    this.setBar(this.passBar, pass.fraction);
    this.passText.textContent = this.passLabel(p.before.passXp);

    const items = p.rewards.flatMap((id) => getItem(id) ?? []);
    if (items.length > 0) {
      this.rewardTitle.textContent = items.length === 1 ? 'Recompensa desbloqueada' : `${items.length} recompensas desbloqueadas`;
      this.rewardCards = items.map((item) => createRewardCard(item, { faceDown: true, playerName: this.game.save.data.profile.name }));
      this.rewardRow.append(...this.rewardCards);
    } else {
      this.rewardTitle.textContent = 'Próxima recompensa';
      this.rewardRow.append(this.nextRewardPreview());
    }
    this.side.append(
      h(
        'section',
        { class: 'res__block res__block--level' },
        this.levelBadge,
        h('div', { class: 'res__block-body' }, h('h3', { class: 'res__section', text: 'Nivel de piloto' }), this.levelBar, this.levelText),
      ),
      h(
        'section',
        { class: 'res__block res__block--pass' },
        h('div', { class: 'res__pass-head' }, h('h3', { class: 'res__section', text: SEASON.name }), this.passTier),
        this.passBar,
        this.passText,
      ),
      h('section', { class: 'res__block res__block--rewards' }, this.rewardTitle, this.rewardRow),
    );
  }

  /** Sin recompensas nuevas: la del próximo nivel del pase, boca arriba y atenuada. */
  private nextRewardPreview(): HTMLElement {
    const after = passProgress(this.params.after.passXp);
    if (after.complete) return h('p', { class: 'res__next-text', text: '¡Completaste el pase de temporada! Todas las recompensas son tuyas.' });
    const item = getItem(SEASON.rewards[after.tier] ?? '');
    if (!item) return h('span');
    const card = createRewardCard(item, { playerName: this.game.save.data.profile.name });
    card.classList.add('is-next');
    const missing = xpUntilTier(this.params.after.passXp, after.tier + 1);
    return h(
      'div',
      { class: 'res__next' },
      card,
      h(
        'p',
        { class: 'res__next-text' },
        h('b', { text: `Nivel ${after.tier + 1} del pase` }),
        h('span', { text: `Faltan ${formatInteger(missing)} XP` }),
        h('span', { class: 'res__next-rarity', text: RARITY_INFO[item.rarity].label, style: { color: RARITY_INFO[item.rarity].color } }),
      ),
    );
  }

  // ─── Animación ─────────────────────────────────────────────────────────

  private buildTimeline(): gsap.core.Timeline {
    const p = this.params;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from(this.main, { x: -60, opacity: 0, duration: 0.5 }, 0);
    tl.from(this.side, { x: 60, opacity: 0, duration: 0.5 }, 0.05);
    const place = this.main.querySelector('.res__place');
    if (place) tl.from(place, { scale: 1.8, opacity: 0, duration: 0.5, ease: 'back.out(2)' }, 0.25);
    tl.from(this.main.querySelectorAll('.res__stat'), { y: 12, opacity: 0, stagger: 0.08, duration: 0.35 }, 0.35);

    // Líneas de XP, una por una, contando.
    let at = 0.7;
    for (const row of this.lineRows) {
      tl.from(row, { x: -24, opacity: 0, duration: 0.3 }, at);
      const value = row.querySelector<HTMLElement>('.res__line-xp');
      const target = Number(value?.dataset.xp ?? 0);
      if (value && target > 0) {
        const counter = { v: 0 };
        tl.to(
          counter,
          {
            v: target,
            duration: 0.4,
            ease: 'power2.out',
            onUpdate: () => {
              value.textContent = `+${formatInteger(counter.v)}`;
              this.sound('tick');
            },
          },
          at + 0.1,
        );
      }
      at += 0.28;
    }
    for (const row of this.multiplierRows) {
      tl.from(row, { x: -24, opacity: 0, duration: 0.3 }, at);
      at += 0.22;
    }

    // Total.
    tl.from(this.totalRow, { y: 16, opacity: 0, duration: 0.35 }, at);
    const total = { v: 0 };
    tl.to(
      total,
      {
        v: p.award.total,
        duration: 0.9,
        ease: 'power2.out',
        onUpdate: () => {
          this.totalValue.textContent = formatInteger(total.v);
          this.sound('tick');
        },
      },
      at + 0.15,
    );
    at += 1.1;
    if (p.award.total > 0) tl.call(() => this.burstAt(this.totalValue, GOLD, 26), undefined, at - 0.1);

    // Barra de nivel.
    at = this.animateLevel(tl, at);
    // Barra del pase y cartas.
    at = this.animatePass(tl, at + 0.2);
    // El contenedor (no cada botón: los botones ya tienen su propio `transform` con transición CSS).
    tl.from(this.actions, { y: 16, opacity: 0, duration: 0.35, ease: 'back.out(1.6)' }, Math.min(at, 2.2));
    return tl;
  }

  private animateLevel(tl: gsap.core.Timeline, start: number): number {
    const p = this.params;
    const before = levelProgress(p.before.level, p.before.xp);
    const after = levelProgress(p.after.level, p.after.xp);
    const levels = p.after.level - p.before.level;
    let at = start;
    let level = p.before.level;
    for (const segment of segments(before.fraction, levels, after.isMax ? 0 : after.fraction)) {
      const duration = Math.max(BAR_MIN_SECONDS, (segment.to - segment.from) * BAR_SECONDS_PER_LEVEL);
      const shownLevel = level;
      const needed = xpToNextLevel(shownLevel);
      tl.fromTo(
        this.levelBar,
        { '--p': segment.from },
        {
          '--p': segment.to,
          duration,
          ease: 'power1.inOut',
          immediateRender: false,
          onUpdate: () => {
            const fraction = Number(gsap.getProperty(this.levelBar, '--p'));
            this.levelText.textContent = this.levelLabel(shownLevel, Math.round(fraction * needed));
            this.trail(this.levelBar, fraction, RED);
          },
        },
        at,
      );
      at += duration;
      if (segment.levelUp) {
        level++;
        const reached = level;
        tl.call(() => this.onLevelUp(reached), undefined, at);
        at += 0.7;
      }
    }
    tl.call(() => {
      this.levelText.textContent = this.levelLabel(p.after.level, p.after.xp);
    }, undefined, at);
    return at;
  }

  private animatePass(tl: gsap.core.Timeline, start: number): number {
    const p = this.params;
    const before = passProgress(p.before.passXp);
    const after = passProgress(p.after.passXp);
    const tiers = after.tier - before.tier;
    let at = start;
    let tier = before.tier;
    let cardIndex = 0;
    for (const segment of segments(before.fraction, tiers, after.complete ? 0 : after.fraction)) {
      const duration = Math.max(BAR_MIN_SECONDS, (segment.to - segment.from) * BAR_SECONDS_PER_LEVEL);
      const baseXp = tier * SEASON.xpPerTier;
      tl.fromTo(
        this.passBar,
        { '--p': segment.from },
        {
          '--p': segment.to,
          duration,
          ease: 'power1.inOut',
          immediateRender: false,
          onUpdate: () => {
            const fraction = Number(gsap.getProperty(this.passBar, '--p'));
            this.passText.textContent = this.passLabel(baseXp + fraction * SEASON.xpPerTier);
            this.trail(this.passBar, fraction, GOLD);
          },
        },
        at,
      );
      at += duration;
      if (segment.levelUp) {
        tier++;
        const reached = tier;
        tl.call(() => {
          this.passTier.textContent = this.tierLabel(reached);
          this.passTier.classList.remove('is-bump');
          void this.passTier.offsetWidth;
          this.passTier.classList.add('is-bump');
        }, undefined, at);
        const card = this.rewardCards[cardIndex++];
        if (card) at = this.revealCard(tl, card, at);
      }
    }
    tl.call(() => {
      this.passText.textContent = this.passLabel(p.after.passXp);
    }, undefined, at);
    // Sin recompensa nueva, la próxima aparece al final.
    if (this.rewardCards.length === 0) tl.from(this.rewardRow, { y: 20, opacity: 0, duration: 0.4 }, at);
    return at;
  }

  /** La carta aparece boca abajo, se da vuelta y estalla en el color de su rareza. */
  private revealCard(tl: gsap.core.Timeline, card: HTMLElement, at: number): number {
    const inner = card.querySelector('.rcard__inner');
    const item = this.cardItem(card);
    tl.fromTo(card, { y: 30, scale: 0.7, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.7)', immediateRender: false }, at);
    tl.call(() => this.sound('flip'), undefined, at + 0.35);
    if (inner) tl.fromTo(inner, { rotationY: 0 }, { rotationY: 180, duration: 0.55, ease: 'power2.inOut', immediateRender: false }, at + 0.35);
    tl.call(
      () => {
        card.classList.add('is-open', 'is-revealed');
        const big = item?.rarity === 'epic' || item?.rarity === 'legendary';
        this.sound(big ? 'rewardBig' : 'reward');
        this.burstAt(card, item ? RARITY_INFO[item.rarity].color : GOLD, big ? 60 : 30);
      },
      undefined,
      at + 0.75,
    );
    return at + 1.05;
  }

  private cardItem(card: HTMLElement): Item | undefined {
    const index = this.rewardCards.indexOf(card);
    return getItem(this.params.rewards[index] ?? '');
  }

  private onLevelUp(level: number): void {
    this.levelNumber.textContent = String(level);
    this.setBar(this.levelBar, 0);
    this.levelBadge.classList.remove('is-bump');
    void this.levelBadge.offsetWidth;
    this.levelBadge.classList.add('is-bump');
    if (this.skipping) return;
    this.sound('levelUp');
    this.burstAt(this.levelBadge, RED, 70);
    this.burstAt(this.levelBadge, GOLD, 30);
    this.banner.replaceChildren(h('small', { text: '¡SUBISTE DE NIVEL!' }), h('span', { text: level >= MAX_LEVEL ? 'NIVEL MÁXIMO' : `NIVEL ${level}` }));
    this.own.tween(
      gsap.fromTo(
        this.banner,
        { opacity: 0, scale: 0.6 },
        { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)', yoyo: true, repeat: 1, repeatDelay: 0.6 },
      ),
    );
  }

  /** Adelanta todo al final (sin sonidos ni chispas de los pasos saltados). */
  private skip(): void {
    const tl = this.timeline;
    if (!tl || tl.progress() >= 1) return;
    this.skipping = true;
    tl.progress(1);
    this.skipping = false;
    this.sparks?.clear();
    gsap.set(this.banner, { opacity: 0 });
    // El estado final, por si algún paso quedó a mitad.
    const p = this.params;
    this.levelNumber.textContent = String(p.after.level);
    this.setBar(this.levelBar, levelProgress(p.after.level, p.after.xp).fraction);
    this.levelText.textContent = this.levelLabel(p.after.level, p.after.xp);
    const pass = passProgress(p.after.passXp);
    this.passTier.textContent = this.tierLabel(pass.tier);
    this.setBar(this.passBar, pass.fraction);
    this.passText.textContent = this.passLabel(p.after.passXp);
    for (const card of this.rewardCards) {
      card.classList.add('is-open', 'is-revealed');
      const inner = card.querySelector('.rcard__inner');
      if (inner) gsap.set(inner, { rotationY: 180 });
      gsap.set(card, { opacity: 1, y: 0, scale: 1 });
    }
    this.totalValue.textContent = formatInteger(p.award.total);
    if (this.rewardCards.length > 0) this.sound(this.rewardCards.some((card) => card.classList.contains('rcard--legendary') || card.classList.contains('rcard--epic')) ? 'rewardBig' : 'reward');
  }

  // ─── Utilidades ────────────────────────────────────────────────────────

  private setBar(bar: HTMLElement, fraction: number): void {
    gsap.set(bar, { '--p': fraction });
  }

  /** Chispas en la punta de una barra que se llena. */
  private trail(bar: HTMLElement, fraction: number, color: string): void {
    if (this.skipping || !this.sparks || prefersReducedMotion()) return;
    const point = this.sparks.pointOf(bar, fraction, 0.5);
    this.sparks.emit(point.x, point.y, 2, { color, speed: 140, angle: Math.PI, spread: 1.6, gravity: 160, life: 0.5, size: 2 });
  }

  private burstAt(element: Element, color: string, count: number): void {
    if (this.skipping || !this.sparks || prefersReducedMotion()) return;
    const point = this.sparks.pointOf(element);
    this.sparks.emit(point.x, point.y, count, { color, speed: 320, gravity: 380, life: 0.9, size: 2.6 });
  }

  private sound(name: Parameters<Game['playUi']>[0]): void {
    if (!this.skipping) this.game.playUi(name);
  }

  private levelLabel(level: number, xp: number): string {
    if (level >= MAX_LEVEL) return 'NIVEL MÁXIMO';
    return `${formatInteger(xp)} / ${formatInteger(xpToNextLevel(level))} XP`;
  }

  private tierLabel(tier: number): string {
    return tier >= SEASON.tiers ? 'COMPLETO' : `NIVEL ${tier}`;
  }

  private passLabel(passXp: number): string {
    const pass = passProgress(passXp);
    return pass.complete ? `${SEASON.tiers} / ${SEASON.tiers} niveles` : `${formatInteger(pass.xp)} / ${formatInteger(SEASON.xpPerTier)} XP`;
  }
}
