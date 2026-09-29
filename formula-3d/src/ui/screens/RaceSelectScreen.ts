/**
 * Selección de carrera: circuito (tarjetas + mapa grande con sus datos) y
 * opciones según el modo:
 * - Práctica libre y contrarreloj: clima y nivel de ayudas.
 * - Carrera rápida: vueltas, dificultad, rivales, nivel de ayudas y clima.
 * Lo elegido queda guardado como punto de partida para la próxima vez.
 */

import gsap from 'gsap';
import { LEVEL_INFO } from '../../assists/presets';
import type { Game } from '../../core/Game';
import {
  ASSIST_LEVELS,
  DIFFICULTY_LEVELS,
  RACE_LAPS,
  RIVALS_MAX,
  RIVALS_MIN,
  WEATHERS,
  type AssistLevel,
  type DifficultyLevel,
  type RaceLaps,
  type Weather,
} from '../../core/save/schema';
import type { RaceSelectMode, ScreenParams } from '../../core/screens/params';
import { formatLapTime } from '../../core/utils/format';
import { DIFFICULTY_INFO, difficultyValue } from '../../race/ai/difficulty';
import { TRACKS } from '../../tracks/registry';
import type { TrackDefinition } from '../../tracks/TrackDefinition';
import { WEATHER_INFO } from '../../tracks/weather';
import { finished } from '../anim/finished';
import { ControlHints } from '../components/ControlHints';
import { createMenuButton } from '../components/MenuButton';
import { actionRow, selectorRow, sliderRow, type RowContext, type SettingRow } from '../components/SettingRows';
import { TrackMap } from '../components/TrackMap';
import { h, prefersReducedMotion } from '../dom';
import { BaseScreen } from './BaseScreen';

const MODE_INFO: Readonly<Record<RaceSelectMode, { title: string; kicker: string; start: string }>> = {
  practice: { title: 'Práctica libre', kicker: 'Sin rivales ni límite de vueltas', start: 'Salir a pista' },
  quickRace: { title: 'Carrera rápida', kicker: 'Largada con semáforo contra los bots', start: '¡A la parrilla!' },
  timeTrial: { title: 'Contrarreloj', kicker: 'Tu mejor vuelta queda como fantasma', start: 'Salir a pista' },
};

/** El circuito guardado, o el primero si ya no existe. */
function savedTrack(id: string): TrackDefinition {
  return TRACKS.find((track) => track.id === id) ?? (TRACKS[0] as TrackDefinition);
}

export class RaceSelectScreen extends BaseScreen<ScreenParams['raceSelect']> {
  readonly id = 'raceSelect';
  private mode: RaceSelectMode = 'quickRace';
  private track: TrackDefinition = savedTrack('');
  private rows: SettingRow[] = [];
  private readonly cards = new Map<string, HTMLButtonElement>();
  private readonly map = new TrackMap();
  private readonly panel = h('div', { class: 'rsel__panel' });
  private readonly stage = h('div', { class: 'rsel__stage' });
  private readonly stats = h('div', { class: 'rsel__stats' });
  private readonly trackTitle = h('div', { class: 'rsel__track' });
  private readonly helpTitle = h('h3', { class: 'rsel__help-title' });
  private readonly helpText = h('p', { class: 'rsel__help-text' });
  private startButton: HTMLButtonElement | null = null;
  private hints: ControlHints | null = null;

  constructor(game: Game) {
    super(game, 'screen--rsel');
  }

  enter(params: ScreenParams['raceSelect']): void {
    this.mode = params.mode;
    const race = this.game.settings.race;
    this.track = savedTrack(race.trackId);
    const info = MODE_INFO[this.mode];

    // Tarjetas de circuito.
    const cardsHost = h('div', { class: 'rsel__cards', attrs: { role: 'listbox', 'aria-label': 'Circuito' } });
    for (const def of TRACKS) {
      const card = h(
        'button',
        { class: 'tcard', attrs: { type: 'button', role: 'option' } },
        h('span', { class: 'tcard__code', text: def.countryCode }),
        h('span', { class: 'tcard__text' }, h('span', { class: 'tcard__gp', text: def.grandPrix }), h('span', { class: 'tcard__name', text: def.name })),
        h('span', { class: 'tcard__km', text: `${def.lengthKm.toFixed(3)} km` }),
      );
      this.cards.set(def.id, card);
      cardsHost.append(card);
      this.nav.add(card, {
        onFocus: () => {
          this.selectTrack(def);
          this.showHelp(def.name, `${def.grandPrix} · ${def.city}, ${def.country}. ${def.turns} curvas y ${def.drsZones.length} zonas de DRS.`);
        },
        onConfirm: () => {
          this.game.playUi('confirm');
          if (this.startButton) this.nav.focus(this.startButton, false);
        },
      });
    }

    // Opciones del modo.
    const rowsHost = h('div', { class: 'rsel__rows' });
    const ctx: RowContext = {
      nav: this.nav,
      own: this.own,
      showHelp: (title, text) => this.showHelp(title, text),
      play: (sound) => this.game.playUi(sound),
    };
    this.rows = this.rowsFor(ctx);
    rowsHost.append(...this.rows.map((row) => row.element));
    this.refreshRows();

    this.startButton = createMenuButton({ label: info.start, icon: 'flag' });
    this.startButton.classList.add('rsel__start');
    this.nav.add(this.startButton, {
      onFocus: () => this.showHelp(info.start, 'Empieza con el circuito y las opciones elegidas.'),
      onConfirm: () => this.start(),
    });

    this.hints = new ControlHints(
      [
        { keys: [{ keyboard: '↑↓', gamepad: '✚' }], label: 'Elegir' },
        { keys: [{ keyboard: '←→', gamepad: '✚' }], label: 'Cambiar' },
        { keys: [{ keyboard: 'ENTER', gamepad: 'A' }], label: 'Aceptar' },
        { keys: [{ keyboard: 'ESC', gamepad: 'B' }], label: 'Volver' },
      ],
      this.game.input.lastDevice,
    );
    this.own.add(this.game.events.on('input:device', ({ device }) => this.hints?.setDevice(device)));
    this.own.add(this.game.events.on('settings:changed', () => this.refreshRows()));
    const back = h('button', { class: 'rsel__back', attrs: { type: 'button' }, text: 'Volver' });
    this.own.listen(back, 'click', () => this.onBack());

    this.panel.append(
      h('header', { class: 'rsel__header' }, h('span', { class: 'rsel__kicker', text: info.kicker }), h('h2', { class: 'rsel__title', text: info.title })),
      h('h3', { class: 'rsel__section', text: 'Circuito' }),
      cardsHost,
      h('h3', { class: 'rsel__section', text: 'Opciones' }),
      rowsHost,
      this.startButton,
    );
    this.stage.append(
      this.trackTitle,
      h('div', { class: 'rsel__map' }, this.map.element),
      this.stats,
      h('aside', { class: 'rsel__help' }, this.helpTitle, this.helpText),
    );
    this.root.append(
      h('div', { class: 'rsel__backdrop fx-backdrop' }),
      this.panel,
      this.stage,
      h('footer', { class: 'rsel__footer' }, this.hints.element, back),
    );
    this.selectTrack(this.track);
    const card = this.cards.get(this.track.id);
    if (card) this.nav.focus(card);
  }

  reveal(): void {
    const quick = prefersReducedMotion();
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from(this.panel, { x: -60, opacity: 0, duration: quick ? 0.01 : 0.5 }, 0);
    tl.from(this.panel.querySelectorAll('.tcard, .srow, .rsel__start'), { x: -24, opacity: 0, stagger: quick ? 0 : 0.035, duration: quick ? 0.01 : 0.35 }, 0.1);
    tl.from(this.stage, { opacity: 0, x: 40, duration: quick ? 0.01 : 0.6 }, 0.05);
    this.own.tween(tl);
  }

  async hide(): Promise<void> {
    const tl = gsap.timeline();
    tl.to([this.panel, this.stage], { opacity: 0, duration: 0.25, ease: 'power2.in' }, 0);
    if (prefersReducedMotion()) tl.progress(1);
    await finished(tl);
  }

  protected onBack(): void {
    this.game.playUi('back');
    void this.game.screens.goTo('menu', undefined);
  }

  // ─── Circuito ──────────────────────────────────────────────────────────

  private selectTrack(def: TrackDefinition): void {
    this.track = def;
    for (const [id, card] of this.cards) card.classList.toggle('is-selected', id === def.id);
    this.map.show(def);
    const record = this.game.save.data.records[def.id];
    this.trackTitle.replaceChildren(
      h('span', { class: 'rsel__gp', text: def.grandPrix }),
      h('span', { class: 'rsel__name', text: def.name }),
      h('span', { class: 'rsel__place', text: `${def.city} · ${def.country}` }),
    );
    const stat = (label: string, value: string, tone = ''): HTMLDivElement =>
      h('div', { class: `rsel__stat ${tone}`.trim() }, h('span', { class: 'rsel__stat-label', text: label }), h('span', { class: 'rsel__stat-value', text: value }));
    const items = [
      stat('LONGITUD', `${def.lengthKm.toFixed(3)} km`),
      stat('CURVAS', String(def.turns)),
      stat('ZONAS DRS', String(def.drsZones.length)),
      stat('RÉCORD', formatLapTime(def.lapRecord.seconds)),
      stat('TU MEJOR VUELTA', record?.bestLap ? formatLapTime(record.bestLap) : '—', record?.bestLap ? 'is-mine' : ''),
    ];
    if (this.mode === 'timeTrial') {
      items.push(stat('TU FANTASMA', record?.ghost ? formatLapTime(record.ghost.time) : 'Sin grabar', record?.ghost ? 'is-ghost' : ''));
    }
    this.stats.replaceChildren(...items);
  }

  // ─── Opciones ──────────────────────────────────────────────────────────

  private rowsFor(ctx: RowContext): SettingRow[] {
    const race = (): Game['settings']['race'] => this.game.settings.race;
    const weather = selectorRow<Weather>(ctx, {
      label: 'Clima',
      help: 'Soleado, nublado o atardecer: cambia la luz, el cielo y las sombras (no el agarre).',
      options: WEATHERS.map((value) => ({ value, label: WEATHER_INFO[value].label })),
      get: () => race().weather,
      set: (value) => this.game.updateSettings((s) => (s.race.weather = value)),
    });
    const assists = selectorRow<AssistLevel>(ctx, {
      label: 'Nivel de ayudas',
      help: 'Principiante frena y estabiliza por ti; Avanzado deja casi todo en tus manos. Personalizado usa lo que elegiste en Ajustes → Ayudas.',
      options: ASSIST_LEVELS.map((value) => ({ value, label: LEVEL_INFO[value].name })),
      get: () => this.game.settings.assists.level,
      set: (value) => this.game.updateSettings((s) => (s.assists.level = value)),
    });
    const manual = actionRow(ctx, {
      label: 'Manual de ayudas',
      help: 'Qué hace cada ayuda, con demos animadas.',
      icon: 'book',
      run: () => void this.game.screens.push('assistsManual', undefined),
    });
    if (this.mode !== 'quickRace') return [weather, assists, manual];
    return [
      selectorRow<RaceLaps>(ctx, {
        label: 'Vueltas',
        help: 'Largo de la carrera. El DRS se habilita desde la vuelta 2.',
        options: RACE_LAPS.map((value) => ({ value, label: String(value) })),
        get: () => race().laps,
        set: (value) => this.game.updateSettings((s) => (s.race.laps = value)),
      }),
      selectorRow<DifficultyLevel>(ctx, {
        label: 'Dificultad',
        help: 'Ritmo, frenadas, agresividad y errores de los bots. Personalizada usa el valor de abajo.',
        options: DIFFICULTY_LEVELS.map((value) => ({ value, label: DIFFICULTY_INFO[value].label })),
        get: () => race().difficulty,
        set: (value) => this.game.updateSettings((s) => (s.race.difficulty = value)),
      }),
      sliderRow(ctx, {
        label: 'Personalizada',
        help: '0 es un paseo; 100, rivales al límite en cada curva. Se usa con la dificultad Personalizada.',
        min: 0,
        max: 100,
        step: 5,
        format: (value) => String(Math.round(value)),
        get: () => race().customDifficulty,
        set: (value) => this.game.updateSettings((s) => (s.race.customDifficulty = value)),
      }),
      sliderRow(ctx, {
        label: 'Autos en pista',
        help: 'Cantidad de autos contando el tuyo (de 10 a 20). Menos autos pesan menos en equipos modestos.',
        min: RIVALS_MIN,
        max: RIVALS_MAX,
        step: 1,
        format: (value) => String(Math.round(value) + 1),
        get: () => race().rivals,
        set: (value) => this.game.updateSettings((s) => (s.race.rivals = value)),
      }),
      assists,
      weather,
      manual,
    ];
  }

  private refreshRows(): void {
    for (const row of this.rows) row.refresh?.();
    // "Personalizada" sólo cuenta con la dificultad Personalizada.
    const custom = this.rows[2]?.element;
    if (this.mode === 'quickRace' && custom) custom.classList.toggle('is-muted', this.game.settings.race.difficulty !== 'custom');
  }

  private showHelp(title: string, text: string): void {
    this.helpTitle.textContent = title;
    this.helpText.textContent = text;
  }

  private start(): void {
    this.game.playUi('confirm');
    const trackId = this.track.id;
    this.game.updateSettings((s) => (s.race.trackId = trackId));
    const race = this.game.settings.race;
    const weather = race.weather;
    if (this.mode === 'quickRace') {
      void this.game.screens.goTo('race', {
        trackId,
        mode: 'race',
        laps: race.laps,
        rivals: race.rivals,
        difficulty: difficultyValue(race),
        weather,
      });
    } else {
      void this.game.screens.goTo('race', { trackId, mode: this.mode === 'timeTrial' ? 'timeTrial' : 'practice', weather });
    }
  }
}
