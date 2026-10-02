/**
 * Menú principal, como la presentación de un equipo: el monoplaza sobre el
 * podio iluminado del estudio, un panel a la izquierda con los datos del
 * acceso enfocado (descripción y valores: campeonato en curso, récords,
 * nivel…) y la tarjeta del piloto, el botón "Continuar" arriba a la derecha
 * (sigue el campeonato en curso o va a una carrera rápida) y una fila de
 * tarjetas grandes abajo con todos los accesos.
 *
 * Los accesos a pantallas que llegan en fases futuras se muestran bloqueados
 * con la fase correspondiente; se habilitan solos cuando su pantalla existe.
 */

import gsap from 'gsap';
import { LEVEL_INFO } from '../../assists/presets';
import type { Game } from '../../core/Game';
import { CHAMPIONSHIPS, getChampionship } from '../../data/championships';
import { GAME_VERSION, MAIN_MENU, type MenuItem, type MenuItemId } from '../../data/game';
import type { StudioScene } from '../../garage/StudioScene';
import { DIFFICULTY_INFO } from '../../race/ai/difficulty';
import { isFinished, nextRound } from '../../race/championship';
import { getTrack, TRACKS } from '../../tracks/registry';
import { h, prefersReducedMotion, svg } from '../dom';
import { ControlHints } from '../components/ControlHints';
import { ICONS } from '../icons';
import { createLogo } from '../components/Logo';
import { denyFeedback } from '../components/MenuButton';
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

/** Cuánto se corre el auto a la derecha para dejar lugar al panel, según el ancho. */
function frameShiftFor(width: number): number {
  if (width < 720) return 0;
  if (width < 1100) return 0.1;
  return 0.13;
}

const QUALITY_LABEL: Readonly<Record<string, string>> = { low: 'Baja', medium: 'Media', high: 'Alta', ultra: 'Ultra' };

export class MainMenuScreen extends BaseScreen {
  readonly id = 'menu';
  private studio: StudioScene | null = null;
  private readonly tiles = new Map<MenuItemId, HTMLButtonElement>();
  private readonly head = h('header', { class: 'menu__head' });
  private readonly tileRow = h('nav', { class: 'menu__tiles', attrs: { 'aria-label': 'Menú principal' } });
  private readonly infoIcon = h('span', { class: 'menu__info-icon' });
  private readonly infoTitle = h('h2', { class: 'menu__info-title' });
  private readonly infoText = h('p', { class: 'menu__info-text' });
  private readonly infoRows = h('div', { class: 'menu__info-rows' });
  private readonly infoNote = h('p', { class: 'menu__info-note' });
  private readonly info = h(
    'aside',
    { class: 'menu__info' },
    h('div', { class: 'menu__info-head' }, this.infoIcon, this.infoTitle),
    this.infoText,
    this.infoRows,
    this.infoNote,
  );
  private readonly foot = h('footer', { class: 'menu__foot' });
  private continueButton: HTMLButtonElement | null = null;
  private card: PlayerCard | null = null;
  private hints: ControlHints | null = null;
  private lastFocused: MenuItemId = 'quickRace';

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
    this.head.append(
      createLogo('menu__logo'),
      h('div', { class: 'menu__heading' }, h('h1', { class: 'menu__title', text: 'Menú principal' }), h('p', { class: 'menu__subtitle', text: `Temporada 2026 · ${TRACKS.length} circuitos · ${CHAMPIONSHIPS.length} campeonatos` })),
    );
    this.info.append(this.card.element);

    for (const group of MAIN_MENU) for (const item of group.items) this.tileRow.append(this.createTile(item));

    this.continueButton = this.createContinue();

    this.hints = new ControlHints(
      [
        { keys: [{ keyboard: '←→', gamepad: '✚' }], label: 'Navegar' },
        { keys: [{ keyboard: '↑', gamepad: '✚' }], label: 'Continuar' },
        { keys: [{ keyboard: 'ENTER', gamepad: 'A' }], label: 'Elegir' },
      ],
      this.game.input.lastDevice,
    );
    this.own.add(this.game.events.on('input:device', ({ device }) => this.hints?.setDevice(device)));

    const storageNote = this.game.save.isPersistent
      ? h('span', { class: 'menu__save is-ok', text: 'Progreso guardado en este navegador' })
      : h('span', { class: 'menu__save is-warn', text: 'Tu navegador bloquea el guardado: el progreso se perderá al cerrar' });
    this.foot.append(this.hints.element, h('div', { class: 'menu__meta' }, storageNote, h('span', { class: 'menu__version', text: `v${GAME_VERSION}` })));

    this.root.append(h('div', { class: 'menu__scrim' }), this.head, this.continueButton, this.info, this.tileRow, this.foot);

    // Paralaje de la cámara con el ratón y encuadre según el ancho.
    this.own.listen(window, 'pointermove', (event) => {
      this.studio?.setPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
    });
    this.own.listen(window, 'resize', () => this.studio?.setFrameShift(frameShiftFor(uiWidth())));

    const first = this.tiles.get(this.lastFocused) ?? this.tiles.values().next().value;
    if (first) this.nav.focus(first);
  }

  reveal(): void {
    const quick = prefersReducedMotion();
    const tiles = [...this.tiles.values()];
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from(this.head, { y: -24, opacity: 0, duration: 0.6 }, 0.05);
    if (this.continueButton) tl.from(this.continueButton, { x: 60, opacity: 0, duration: 0.7, clearProps: 'transform' }, 0.15);
    tl.from(this.info, { x: -50, opacity: 0, duration: 0.7 }, 0.15);
    if (this.card) for (const tween of this.card.animateIn(0.5)) tl.add(tween, 0);
    // Al terminar se borra el estilo en línea: la tarjeta enfocada se eleva con el CSS.
    tl.from(tiles, { y: 40, opacity: 0, duration: 0.55, stagger: 0.045, clearProps: 'transform,opacity' }, 0.25);
    tl.from(this.foot, { opacity: 0, duration: 0.5 }, 0.6);
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
      gsap.to([this.head, this.info, this.tileRow, this.foot, this.continueButton], {
        opacity: 0,
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
      gsap.to([this.head, this.info, this.tileRow, this.foot, this.continueButton], {
        opacity: 1,
        duration: 0.45,
        ease: 'power3.out',
        overwrite: 'auto',
      }),
    );
    this.studio?.setFrameShift(frameShiftFor(uiWidth()));
  }

  /** En el menú raíz, "volver" regresa a la primera tarjeta. */
  protected onBack(): void {
    const first = this.tiles.values().next().value;
    if (first && this.nav.focused !== first) this.nav.focus(first, false);
  }

  /** Tarjeta grande de un acceso (fila de abajo). */
  private createTile(item: MenuItem): HTMLButtonElement {
    const open = OPENERS[item.id];
    const tile = h(
      'button',
      { class: `mtile${open ? '' : ' is-locked'}`, attrs: { type: 'button', 'aria-label': item.label } },
      h('span', { class: 'mtile__check', attrs: { 'aria-hidden': 'true' } }),
      svg(ICONS[item.icon], 'icon mtile__icon'),
      h('span', { class: 'mtile__label', text: item.label }),
    );
    this.tiles.set(item.id, tile);
    this.nav.add(tile, {
      onFocus: () => {
        this.lastFocused = item.id;
        this.showInfo(item, open !== undefined);
      },
      onConfirm: () => this.select(tile, open),
    });
    return tile;
  }

  /**
   * Botón principal de arriba a la derecha: sigue el campeonato en curso o,
   * si no hay, va a una carrera rápida en el último circuito elegido.
   */
  private createContinue(): HTMLButtonElement {
    const state = this.game.save.data.championship;
    const race = this.game.settings.race;
    let title = 'Carrera rápida';
    let detail: string;
    let open: (game: Game) => Promise<boolean>;
    if (state && !isFinished(state)) {
      const round = nextRound(state);
      const track = getTrack(state.rounds[round]?.trackId ?? '');
      title = 'Continuar campeonato';
      detail = `${state.cup ? getChampionship(state.cup).name : 'Temporada'} · Ronda ${round + 1}: ${track.short}`;
      open = (game) => game.screens.goTo('championship', undefined);
    } else {
      const track = TRACKS.find((t) => t.id === race.trackId) ?? TRACKS[0];
      detail = `${track?.short ?? ''} · ${race.laps} vueltas · ${DIFFICULTY_INFO[race.difficulty].label}`;
      open = (game) => game.screens.goTo('raceSelect', { mode: 'quickRace' });
    }
    const button = h(
      'button',
      { class: 'menu__continue', attrs: { type: 'button' } },
      svg(ICONS.chevronRight, 'icon menu__continue-arrow'),
      h('span', { class: 'menu__continue-text' }, h('b', { class: 'menu__continue-title', text: title }), h('span', { class: 'menu__continue-detail', text: detail })),
      h('span', { class: 'menu__continue-chevrons', attrs: { 'aria-hidden': 'true' } }),
    );
    this.nav.add(button, {
      onFocus: () => {
        this.infoIcon.replaceChildren(svg(ICONS.flag, 'icon'));
        this.infoTitle.textContent = title;
        this.infoText.textContent = 'Sigue donde quedaste.';
        this.infoRows.replaceChildren(this.row('Siguiente', detail));
        this.infoNote.textContent = '';
      },
      onConfirm: () => {
        this.game.playUi('confirm');
        void open(this.game);
      },
    });
    return button;
  }

  private select(tile: HTMLButtonElement, open: ((game: Game) => Promise<boolean>) | undefined): void {
    if (!open) {
      this.game.playUi('locked');
      denyFeedback(tile);
      gsap.fromTo(this.infoNote, { opacity: 0.4 }, { opacity: 1, duration: 0.4, ease: 'power2.out' });
      return;
    }
    this.game.playUi('confirm');
    void open(this.game);
  }

  private row(label: string, value: string): HTMLElement {
    return h('div', { class: 'menu__info-row' }, h('span', { text: label }), h('b', { text: value }));
  }

  /** Datos del acceso enfocado, como la ficha de un equipo: descripción y valores. */
  private showInfo(item: MenuItem, available: boolean): void {
    const data = this.game.save.data;
    const settings = this.game.settings;
    const stats = data.stats;
    const records = Object.values(data.records);
    const rows: Array<[string, string]> = [];
    switch (item.id) {
      case 'practice':
        rows.push(['Circuitos', String(TRACKS.length)], ['Récords propios', String(records.filter((r) => r.bestLap).length)], ['Ayudas', LEVEL_INFO[settings.assists.level].name]);
        break;
      case 'quickRace': {
        const track = TRACKS.find((t) => t.id === settings.race.trackId) ?? TRACKS[0];
        rows.push(['Último circuito', track?.short ?? '—'], ['Autos en pista', String(settings.race.rivals + 1)], ['Dificultad', DIFFICULTY_INFO[settings.race.difficulty].label], ['Vueltas', String(settings.race.laps)]);
        break;
      }
      case 'timeTrial':
        rows.push(['Circuitos', String(TRACKS.length)], ['Fantasmas guardados', String(records.filter((r) => r.ghost).length)]);
        break;
      case 'championship': {
        const state = data.championship;
        const running = state && !isFinished(state);
        rows.push(
          ['En curso', running && state ? `${state.cup ? getChampionship(state.cup).name : 'Temporada'} · ${state.rounds.filter((r) => r.results).length}/${state.rounds.length}` : 'Ninguno'],
          ['Campeonatos', CHAMPIONSHIPS.map((cup) => cup.tag).join(' · ')],
          ['Títulos ganados', String(stats.championships)],
        );
        break;
      }
      case 'garage':
        rows.push(['Número', `#${data.garage.number}`], ['Ítems desbloqueados', String(data.progression.unlocked.length)]);
        break;
      case 'pass':
        rows.push(['Nivel del pase', String(Math.min(50, Math.floor(data.progression.pass.xp / 1000) + 1))], ['Nivel de piloto', String(data.progression.level)]);
        break;
      case 'profile':
        rows.push(['Carreras', String(stats.races)], ['Victorias', String(stats.wins)], ['Podios', String(stats.podiums)]);
        break;
      case 'manual':
        rows.push(['Nivel de ayudas', LEVEL_INFO[settings.assists.level].name]);
        break;
      case 'settings':
        rows.push(['Calidad gráfica', QUALITY_LABEL[settings.graphics.quality] ?? '—'], ['Ayudas', LEVEL_INFO[settings.assists.level].name]);
        break;
    }
    this.infoIcon.replaceChildren(svg(ICONS[item.icon], 'icon'));
    this.infoTitle.textContent = item.label;
    this.infoText.textContent = item.description;
    this.infoRows.replaceChildren(...rows.map(([label, value]) => this.row(label, value)));
    this.infoNote.textContent = available ? '' : `Llega en la Fase ${item.phase} del desarrollo.`;
    gsap.fromTo(this.info.querySelectorAll('.menu__info-head, .menu__info-text, .menu__info-rows'), { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out', overwrite: true, stagger: 0.04 });
  }
}
