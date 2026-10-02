/**
 * Garaje: el monoplaza en el estudio del menú, con la cámara acercándose a lo
 * que se edita. Pestañas (Q / E): Pintura, Material, Llantas, Alerón, Casco,
 * Número y Festejo (cómo se celebra en el podio).
 * - Enfocar un ítem lo muestra en el auto (también los bloqueados, para ver
 *   cómo quedan); ENTER lo equipa si está desbloqueado. Al salir de la
 *   pestaña o del garaje vuelve lo equipado.
 * - Las filas de pintura (patrón y colores) y de número se cambian con ← →;
 *   lo que pide un nivel mayor se saltea y se avisa en la ayuda.
 * Todo se guarda al instante y se ve en el menú y en la carrera.
 */

import gsap from 'gsap';
import type { Game } from '../../core/Game';
import type { UiAction } from '../../core/input/actions';
import type { DeepReadonly } from '../../core/utils/types';
import type { StudioScene, StudioShot } from '../../garage/StudioScene';
import {
  liveryFromSetup,
  ownsItem,
  PALETTE,
  PATTERNS,
  TIRE_COMPOUNDS,
  type GarageSetup,
} from '../../garage/setup';
import { ITEMS, KIND_INFO, RARITY_INFO, type Item, type ItemKind } from '../../progression/items';
import { SEASON } from '../../progression/seasonPass';
import { finished } from '../anim/finished';
import { ControlHints } from '../components/ControlHints';
import { itemPreview } from '../components/ItemPreview';
import { h, prefersReducedMotion, svg } from '../dom';
import { ICONS } from '../icons';
import { BaseScreen } from './BaseScreen';
import { uiWidth } from '../scale';

type GarageTab = 'paint' | 'material' | 'rims' | 'wing' | 'helmet' | 'number' | 'celebration';

const TABS: ReadonlyArray<{ id: GarageTab; label: string; shot: StudioShot }> = [
  { id: 'paint', label: 'Pintura', shot: 'side' },
  { id: 'material', label: 'Material', shot: 'overview' },
  { id: 'rims', label: 'Llantas', shot: 'wheel' },
  { id: 'wing', label: 'Alerón', shot: 'rear' },
  { id: 'helmet', label: 'Casco', shot: 'helmet' },
  { id: 'number', label: 'Número', shot: 'front' },
  { id: 'celebration', label: 'Festejo', shot: 'overview' },
];

/** Qué campo del garaje equipa cada tipo de ítem. */
const SLOT: Partial<Record<ItemKind, 'material' | 'rims' | 'wing' | 'helmet' | 'celebration'>> = {
  material: 'material',
  rims: 'rims',
  wing: 'wing',
  helmet: 'helmet',
  celebration: 'celebration',
};

/** Pintura de fábrica (no es un ítem: son los colores del equipo). */
const FACTORY_PAINT = { pattern: 'solid', colors: ['#c8102e', '#111317', '#f2f2f0'] } as const;

function cloneSetup(setup: DeepReadonly<GarageSetup>): GarageSetup {
  return { ...setup, colors: [setup.colors[0] ?? '', setup.colors[1] ?? '', setup.colors[2] ?? ''] };
}

/** Pase de temporada: nivel del pase en el que se gana un ítem (0 si no está en el pase). */
function passTierOf(item: Item): number {
  return SEASON.rewards.indexOf(item.id) + 1;
}

export class GarageScreen extends BaseScreen {
  readonly id = 'garage';
  private studio: StudioScene | null = null;
  private tab: GarageTab = 'paint';
  private readonly tabButtons = new Map<GarageTab, HTMLButtonElement>();
  private readonly content = h('div', { class: 'garage__content' });
  private readonly infoTitle = h('h3', { class: 'garage__info-title' });
  private readonly infoMeta = h('div', { class: 'garage__info-meta' });
  private readonly infoText = h('p', { class: 'garage__info-text' });
  private readonly infoStatus = h('span', { class: 'garage__status' });
  private readonly info = h('aside', { class: 'garage__info' }, this.infoTitle, this.infoMeta, this.infoText, this.infoStatus);
  private readonly panel = h('div', { class: 'garage__panel' });
  private hints: ControlHints | null = null;
  /** Lo que se ve en el auto ahora (lo equipado o una vista previa). */
  private previewKey = '';
  private readonly refreshers: Array<() => void> = [];

  constructor(game: Game) {
    super(game, 'screen--garage');
  }

  async enter(): Promise<void> {
    this.hints = new ControlHints(
      [
        { keys: [{ keyboard: 'Q', gamepad: 'LB' }, { keyboard: 'E', gamepad: 'RB' }], label: 'Pestaña' },
        { keys: [{ keyboard: '↑↓←→', gamepad: '✚' }], label: 'Elegir' },
        { keys: [{ keyboard: 'ENTER', gamepad: 'A' }], label: 'Equipar' },
        { keys: [{ keyboard: 'ESC', gamepad: 'B' }], label: 'Volver' },
      ],
      this.game.input.lastDevice,
    );
    this.own.add(this.game.events.on('input:device', ({ device }) => this.hints?.setDevice(device)));
    const tabs = h('div', { class: 'tabs', attrs: { role: 'tablist' } });
    for (const tab of TABS) {
      const button = h('button', { class: 'tab', attrs: { type: 'button', role: 'tab' } }, h('span', { text: tab.label }));
      this.own.listen(button, 'click', () => this.selectTab(tab.id, true));
      this.tabButtons.set(tab.id, button);
      tabs.append(button);
    }
    const back = h('button', { class: 'rsel__back', attrs: { type: 'button' }, text: 'Volver' });
    this.own.listen(back, 'click', () => this.onBack());
    this.panel.append(
      h('header', { class: 'rsel__header' }, h('span', { class: 'rsel__kicker', text: 'Garaje' }), h('h2', { class: 'rsel__title', text: 'Tu monoplaza' })),
      tabs,
      this.content,
    );
    this.root.append(this.panel, this.info, h('footer', { class: 'garage__footer' }, this.hints.element, back));

    try {
      this.studio = await this.game.getStudio();
    } catch (error) {
      console.error('[Garaje] Sin estudio 3D:', error);
      this.studio = null;
    }
    this.game.render.setView(this.studio);
    this.studio?.setFrameShift(this.frameShift());
    this.own.listen(window, 'resize', () => this.studio?.setFrameShift(this.frameShift()));
    this.selectTab('paint', false);
  }

  reveal(): void {
    const quick = prefersReducedMotion();
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from(this.panel, { x: -60, opacity: 0, duration: quick ? 0.01 : 0.5 }, 0);
    tl.from(this.info, { y: 30, opacity: 0, duration: quick ? 0.01 : 0.45 }, 0.15);
    this.own.tween(tl);
  }

  async hide(): Promise<void> {
    const tl = gsap.timeline();
    tl.to([this.panel, this.info], { opacity: 0, duration: 0.25, ease: 'power2.in' }, 0);
    if (prefersReducedMotion()) tl.progress(1);
    await finished(tl);
  }

  update(dt: number): void {
    this.studio?.update(dt);
  }

  override onAction(action: UiAction): void {
    if (action === 'tabPrev' || action === 'tabNext') {
      const index = TABS.findIndex((t) => t.id === this.tab);
      const next = TABS[(index + (action === 'tabNext' ? 1 : -1) + TABS.length) % TABS.length];
      if (next) this.selectTab(next.id, true);
      return;
    }
    super.onAction(action);
  }

  protected onBack(): void {
    this.game.playUi('back');
    void this.game.screens.goTo('menu', undefined);
  }

  override exit(): void {
    // El estudio sigue vivo para el menú: vuelve al giro lento con lo equipado.
    this.studio?.setShot(null);
    this.studio?.car.setLivery(liveryFromSetup(this.setup));
    super.exit();
  }

  // ─── Estado ────────────────────────────────────────────────────────────

  private get setup(): DeepReadonly<GarageSetup> {
    return this.game.save.data.garage;
  }

  private get progression(): Game['save']['data']['progression'] {
    return this.game.save.data.progression;
  }

  private frameShift(): number {
    return uiWidth() < 900 ? 0 : 0.16;
  }

  /** Guarda un cambio y lo muestra en el auto. */
  private commit(change: (setup: GarageSetup) => void): void {
    this.game.save.update((data) => {
      const next = cloneSetup(data.garage);
      change(next);
      data.garage = next;
    });
    this.show(this.setup);
    for (const refresh of this.refreshers) refresh();
  }

  /** Pinta el auto con una configuración (sólo si cambió algo). */
  private show(setup: DeepReadonly<GarageSetup>): void {
    const key = JSON.stringify(setup);
    if (key === this.previewKey) return;
    this.previewKey = key;
    this.studio?.car.setLivery(liveryFromSetup(setup));
  }

  // ─── Pestañas ──────────────────────────────────────────────────────────

  private selectTab(tab: GarageTab, withSound: boolean): void {
    if (withSound && tab === this.tab && this.content.childElementCount > 0) return;
    this.tab = tab;
    for (const [id, button] of this.tabButtons) {
      button.classList.toggle('is-active', id === tab);
      button.setAttribute('aria-selected', String(id === tab));
    }
    if (withSound) this.game.playUi('tab');
    this.nav.clear();
    this.refreshers.length = 0;
    this.show(this.setup);
    const def = TABS.find((t) => t.id === tab);
    if (def) this.studio?.setShot(def.shot);
    this.content.replaceChildren(...this.buildTab(tab));
    this.nav.focusFirst();
    if (!prefersReducedMotion()) {
      this.own.tween(gsap.from(this.content.children, { x: -20, opacity: 0, stagger: 0.04, duration: 0.3, ease: 'power2.out' }));
    }
  }

  private buildTab(tab: GarageTab): HTMLElement[] {
    switch (tab) {
      case 'paint':
        return [
          h('h3', { class: 'rsel__section', text: 'Pinturas listas' }),
          this.paintGrid(),
          h('h3', { class: 'rsel__section', text: 'Personalizada' }),
          this.patternRow(),
          ...(['Color principal', 'Color secundario', 'Color de acento'] as const).map((label, index) => this.colorRow(label, index)),
        ];
      case 'material':
        return [this.itemGrid('material')];
      case 'rims':
        return [this.itemGrid('rims'), h('h3', { class: 'rsel__section', text: 'Neumático' }), this.tireRow()];
      case 'wing':
        return [this.itemGrid('wing')];
      case 'helmet':
        return [this.itemGrid('helmet')];
      case 'number':
        return [this.numberRow(), h('p', { class: 'garage__note', text: 'El número va en el morro y a los lados de la cubierta del motor. En carrera aparece en la torre de posiciones.' })];
      case 'celebration':
        return [
          this.itemGrid('celebration'),
          h('p', { class: 'garage__note', text: 'En el podio siempre hay un poco de todo; el festejo equipado es el que se luce (y el que suena más fuerte).' }),
        ];
    }
  }

  // ─── Grillas de ítems ──────────────────────────────────────────────────

  private itemGrid(kind: 'material' | 'rims' | 'wing' | 'helmet' | 'celebration'): HTMLElement {
    const slot = SLOT[kind];
    const items = ITEMS.filter((item) => item.kind === kind);
    // Primero lo que se tiene; después lo bloqueado, por nivel requerido o del pase.
    items.sort((a, b) => Number(ownsItem(b, this.progression)) - Number(ownsItem(a, this.progression)) || this.unlockOrder(a) - this.unlockOrder(b));
    const grid = h('div', { class: 'garage__grid' });
    for (const item of items) {
      const card = this.itemCard(item, () => (slot ? this.setup[slot] === item.id : false));
      this.nav.add(card, {
        onFocus: () => {
          this.describe(item);
          if (slot) this.show({ ...this.setup, [slot]: item.id });
        },
        onConfirm: () => {
          if (!ownsItem(item, this.progression) || !slot) {
            this.game.playUi('locked');
            return;
          }
          this.game.playUi('confirm');
          this.commit((setup) => {
            setup[slot] = item.id;
          });
          this.describe(item);
        },
      });
      grid.append(card);
    }
    return grid;
  }

  private paintGrid(): HTMLElement {
    const grid = h('div', { class: 'garage__grid garage__grid--paint' });
    const factory = h(
      'button',
      { class: 'gcard gcard--common', attrs: { type: 'button' }, style: { '--rarity': RARITY_INFO.common.color } },
      h('span', { class: 'gcard__art' }, this.swatches(FACTORY_PAINT.colors)),
      h('span', { class: 'gcard__name', text: 'De fábrica' }),
      h('span', { class: 'gcard__state' }),
    );
    const isFactory = (): boolean => this.setup.pattern === 'solid' && FACTORY_PAINT.colors.every((c, i) => this.setup.colors[i] === c);
    this.refreshers.push(() => factory.classList.toggle('is-equipped', isFactory()));
    factory.classList.toggle('is-equipped', isFactory());
    this.nav.add(factory, {
      onFocus: () => {
        this.infoTitle.textContent = 'De fábrica';
        this.infoMeta.replaceChildren(h('span', { class: 'garage__tag', text: 'Pintura' }));
        this.infoText.textContent = 'Rojo Ápice, negro y blanco: los colores del equipo.';
        this.setStatus(isFactory() ? 'Equipado' : 'ENTER para pintar', isFactory() ? 'is-used' : 'is-ready');
        this.show({ ...this.setup, pattern: FACTORY_PAINT.pattern, colors: [...FACTORY_PAINT.colors] });
      },
      onConfirm: () => {
        this.game.playUi('confirm');
        this.commit((setup) => {
          setup.pattern = FACTORY_PAINT.pattern;
          setup.colors = [...FACTORY_PAINT.colors];
        });
        this.setStatus('Equipado', 'is-used');
      },
    });
    grid.append(factory);
    for (const item of ITEMS) {
      if (item.kind !== 'paint') continue;
      const matches = (): boolean => this.setup.pattern === item.pattern && item.colors.every((c, i) => this.setup.colors[i] === c);
      const card = this.itemCard(item, matches);
      this.nav.add(card, {
        onFocus: () => {
          this.describe(item);
          this.show({ ...this.setup, pattern: item.pattern, colors: [...item.colors] });
        },
        onConfirm: () => {
          if (!ownsItem(item, this.progression)) {
            this.game.playUi('locked');
            return;
          }
          this.game.playUi('confirm');
          this.commit((setup) => {
            setup.pattern = item.pattern;
            setup.colors = [...item.colors];
          });
          this.describe(item);
        },
      });
      grid.append(card);
    }
    return grid;
  }

  private itemCard(item: Item, equipped: () => boolean): HTMLButtonElement {
    const owned = ownsItem(item, this.progression);
    const rarity = RARITY_INFO[item.rarity];
    const art = item.kind === 'paint' ? this.swatches(item.colors) : itemPreview(item, this.game.save.data.profile.name);
    const card = h(
      'button',
      {
        class: `gcard gcard--${item.rarity}${owned ? '' : ' is-locked'}`,
        attrs: { type: 'button', 'aria-label': `${item.name} (${rarity.label})` },
        style: { '--rarity': rarity.color },
      },
      h('span', { class: 'gcard__art' }, art),
      h('span', { class: 'gcard__name', text: item.name }),
      h('span', { class: 'gcard__state' }, ...(owned ? [] : [svg(ICONS.lock), h('span', { text: this.unlockShort(item) })])),
    );
    const refresh = (): void => {
      card.classList.toggle('is-equipped', equipped());
    };
    refresh();
    this.refreshers.push(refresh);
    return card;
  }

  private swatches(colors: readonly string[]): HTMLElement {
    return h(
      'span',
      { class: 'gcard__swatches' },
      ...colors.map((color) => h('i', { style: { background: color } })),
    );
  }

  // ─── Filas de pintura, neumático y número ──────────────────────────────

  /** Fila con ← →; `options` en orden, lo bloqueado se saltea. */
  private cycleRow<T>(config: {
    label: string;
    help: string;
    options: ReadonlyArray<{ value: T; label: string; level: number; color?: string }>;
    get: () => T;
    /** Aplica el valor a la configuración que se va a guardar. */
    set: (setup: GarageSetup, value: T) => void;
  }): HTMLElement {
    const value = h('span', { class: 'selector__value' });
    const chip = h('i', { class: 'garage__chip' });
    const prev = h('button', { class: 'selector__arrow', attrs: { type: 'button', 'aria-label': 'Anterior' } }, svg(ICONS.chevronLeft));
    const next = h('button', { class: 'selector__arrow', attrs: { type: 'button', 'aria-label': 'Siguiente' } }, svg(ICONS.chevronRight));
    const strip = h(
      'span',
      { class: 'garage__strip' },
      ...config.options.map((option) =>
        h('i', {
          class: option.level > this.progression.level ? 'is-locked' : '',
          style: option.color ? { background: option.color } : {},
        }),
      ),
    );
    const element = h(
      'div',
      { class: 'srow garage__row', attrs: { role: 'group', 'aria-label': config.label } },
      h('span', { class: 'srow__label', text: config.label }),
      h('div', { class: 'selector garage__selector' }, prev, h('span', { class: 'garage__value' }, chip, value), next),
      strip,
    );
    const refresh = (): void => {
      const index = Math.max(0, config.options.findIndex((o) => o.value === config.get()));
      const option = config.options[index];
      value.textContent = option?.label ?? '';
      chip.hidden = option?.color === undefined;
      if (option?.color) chip.style.background = option.color;
      [...strip.children].forEach((dot, i) => dot.classList.toggle('is-on', i === index));
    };
    const locked = config.options.filter((o) => o.level > this.progression.level);
    const helpText = (): string =>
      locked.length === 0
        ? config.help
        : `${config.help} Con más nivel: ${locked
            .slice(0, 4)
            .map((o) => `${o.label} (nivel ${o.level})`)
            .join(', ')}${locked.length > 4 ? '…' : ''}.`;
    const step = (delta: number): void => {
      const count = config.options.length;
      let index = Math.max(0, config.options.findIndex((o) => o.value === config.get()));
      for (let i = 0; i < count; i++) {
        index = (index + delta + count) % count;
        const option = config.options[index];
        if (option && option.level <= this.progression.level) {
          this.game.playUi('tick');
          this.commit((setup) => config.set(setup, option.value));
          return;
        }
      }
      this.game.playUi('locked');
    };
    this.own.listen(prev, 'click', () => step(-1));
    this.own.listen(next, 'click', () => step(1));
    this.nav.add(element, {
      onLeft: () => step(-1),
      onRight: () => step(1),
      onFocus: () => {
        this.infoTitle.textContent = config.label;
        this.infoMeta.replaceChildren();
        this.infoText.textContent = helpText();
        this.setStatus('← → para cambiar', 'is-ready');
        this.show(this.setup);
      },
    });
    this.refreshers.push(refresh);
    refresh();
    return element;
  }

  private patternRow(): HTMLElement {
    return this.cycleRow({
      label: 'Patrón',
      help: 'El dibujo de la carrocería con tus tres colores.',
      options: PATTERNS.map((p) => ({ value: p.id, label: p.label, level: p.level })),
      get: () => this.setup.pattern,
      set: (setup, value) => {
        setup.pattern = value;
      },
    });
  }

  private colorRow(label: string, index: number): HTMLElement {
    return this.cycleRow({
      label,
      help: ['Cubre casi todo el auto.', 'Parte baja, alerones y el dibujo del patrón.', 'Filetes, número y logos.'][index] ?? '',
      options: PALETTE.map((c) => ({ value: c.hex, label: c.name, level: c.level, color: c.hex })),
      get: () => this.setup.colors[index] ?? '',
      set: (setup, value) => {
        setup.colors[index] = value;
      },
    });
  }

  private tireRow(): HTMLElement {
    return this.cycleRow({
      label: 'Franja del neumático',
      help: 'El color del compuesto en el flanco (y del aro de la tapa de fábrica).',
      options: TIRE_COMPOUNDS.map((c) => ({ value: c.hex, label: c.name, level: c.level, color: c.hex })),
      get: () => this.setup.tireStripe,
      set: (setup, value) => {
        setup.tireStripe = value;
      },
    });
  }

  private numberRow(): HTMLElement {
    const options = Array.from({ length: 99 }, (_, i) => ({ value: i + 1, label: String(i + 1), level: 1 }));
    const row = this.cycleRow({
      label: 'Número',
      help: 'Del 1 al 99. Mantén ← → para pasar rápido.',
      options,
      get: () => this.setup.number,
      set: (setup, value) => {
        setup.number = value;
      },
    });
    row.classList.add('garage__row--number');
    return row;
  }

  // ─── Detalle del ítem enfocado ─────────────────────────────────────────

  private describe(item: Item): void {
    const rarity = RARITY_INFO[item.rarity];
    this.infoTitle.textContent = item.name;
    this.infoMeta.replaceChildren(
      h('span', { class: 'garage__tag', text: rarity.label, style: { color: rarity.color, 'border-color': rarity.color } }),
      h('span', { class: 'garage__tag', text: KIND_INFO[item.kind].label }),
    );
    this.infoText.textContent = item.description;
    const slot = SLOT[item.kind];
    const equipped =
      item.kind === 'paint'
        ? this.setup.pattern === item.pattern && item.colors.every((c, i) => this.setup.colors[i] === c)
        : slot !== undefined && this.setup[slot] === item.id;
    if (!ownsItem(item, this.progression)) this.setStatus(this.unlockLong(item), 'is-locked');
    else if (equipped) this.setStatus('Equipado', 'is-used');
    else this.setStatus('ENTER para equipar', 'is-ready');
  }

  private setStatus(text: string, state: 'is-locked' | 'is-used' | 'is-ready'): void {
    this.infoStatus.textContent = text;
    this.infoStatus.className = `garage__status ${state}`;
  }

  /** Orden de desbloqueo: por nivel de piloto o por nivel del pase. */
  private unlockOrder(item: Item): number {
    if (item.level !== undefined) return item.level;
    const tier = passTierOf(item);
    return tier > 0 ? tier + 0.5 : 0;
  }

  private unlockShort(item: Item): string {
    if (item.level !== undefined) return `Nivel ${item.level}`;
    const tier = passTierOf(item);
    return tier > 0 ? `Pase ${tier}` : '';
  }

  private unlockLong(item: Item): string {
    if (item.level !== undefined) return `Se desbloquea en el nivel ${item.level} de piloto (hoy: ${this.progression.level})`;
    const tier = passTierOf(item);
    return tier > 0 ? `Se gana en el nivel ${tier} del pase de temporada` : 'Bloqueado';
  }
}
