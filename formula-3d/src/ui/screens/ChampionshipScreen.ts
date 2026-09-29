/**
 * Campeonato: la temporada completa en una pantalla.
 * - Sin temporada en curso: opciones (vueltas, dificultad, rivales, ayudas,
 *   clima) y el calendario, para empezar una.
 * - En curso: calendario con cada resultado, tabla de pilotos y la próxima
 *   carrera. Se puede abandonar (con confirmación).
 * - Terminada: el campeón, la tabla final y la opción de empezar otra.
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
  type ChampionshipState,
  type DifficultyLevel,
  type RaceLaps,
  type Weather,
} from '../../core/save/schema';
import { DRIVERS, PLAYER_TEAM_ID, TEAMS, pickRivals, teamOf } from '../../data/teams';
import { DIFFICULTY_INFO, difficultyValue } from '../../race/ai/difficulty';
import { createChampionship, isFinished, nextRound, PLAYER_ID, POINTS, standings } from '../../race/championship';
import { getTrack, TRACKS } from '../../tracks/registry';
import { WEATHER_INFO } from '../../tracks/weather';
import { finished } from '../anim/finished';
import { ControlHints } from '../components/ControlHints';
import { createMenuButton } from '../components/MenuButton';
import { selectorRow, sliderRow, type RowContext, type SettingRow } from '../components/SettingRows';
import { h, prefersReducedMotion } from '../dom';
import { BaseScreen } from './BaseScreen';

const driversById = new Map(DRIVERS.map((driver) => [driver.id, driver]));
const playerTeam = TEAMS.find((team) => team.id === PLAYER_TEAM_ID);

export class ChampionshipScreen extends BaseScreen {
  readonly id = 'championship';
  private rows: SettingRow[] = [];
  private readonly panel = h('div', { class: 'champ__panel' });
  private readonly side = h('div', { class: 'champ__side' });
  private readonly helpTitle = h('h3', { class: 'rsel__help-title' });
  private readonly helpText = h('p', { class: 'rsel__help-text' });
  private hints: ControlHints | null = null;
  private confirmAbandon = false;

  constructor(game: Game) {
    super(game, 'screen--rsel screen--champ');
  }

  enter(): void {
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
    this.root.append(h('div', { class: 'rsel__backdrop' }), this.panel, this.side, h('footer', { class: 'rsel__footer' }, this.hints.element, back));
    this.render();
  }

  reveal(): void {
    const quick = prefersReducedMotion();
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from(this.panel, { x: -60, opacity: 0, duration: quick ? 0.01 : 0.5 }, 0);
    tl.from(this.side, { x: 60, opacity: 0, duration: quick ? 0.01 : 0.5 }, 0.05);
    const rows = this.side.querySelectorAll('.ctable__row');
    if (rows.length > 0) tl.from(rows, { x: 24, opacity: 0, stagger: quick ? 0 : 0.03, duration: quick ? 0.01 : 0.3 }, 0.2);
    this.own.tween(tl);
  }

  async hide(): Promise<void> {
    const tl = gsap.timeline();
    tl.to([this.panel, this.side], { opacity: 0, duration: 0.25, ease: 'power2.in' }, 0);
    if (prefersReducedMotion()) tl.progress(1);
    await finished(tl);
  }

  protected onBack(): void {
    this.game.playUi('back');
    void this.game.screens.goTo('menu', undefined);
  }

  // ─── Contenido ─────────────────────────────────────────────────────────

  private render(): void {
    this.nav.clear();
    this.confirmAbandon = false;
    const state = this.game.save.data.championship;
    if (state && !isFinished(state)) this.renderSeason(state);
    else this.renderSetup(state);
  }

  /** Nueva temporada (y, si la hay, la tabla final de la anterior). */
  private renderSetup(previous: ChampionshipState | null): void {
    const ctx: RowContext = {
      nav: this.nav,
      own: this.own,
      showHelp: (title, text) => this.showHelp(title, text),
      play: (sound) => this.game.playUi(sound),
    };
    this.rows = this.setupRows(ctx);
    const start = createMenuButton({ label: 'Empezar temporada', icon: 'trophy' });
    start.classList.add('rsel__start');
    this.nav.add(start, {
      onFocus: () => this.showHelp('Empezar temporada', `${TRACKS.length} carreras con los mismos rivales. Puntos del 1.º al 10.º: ${POINTS.join('-')}.`),
      onConfirm: () => this.startSeason(),
    });
    const calendar = h(
      'ol',
      { class: 'champ__calendar' },
      ...TRACKS.map((track, i) =>
        h('li', { class: 'champ__round' }, h('span', { class: 'champ__round-n', text: `R${i + 1}` }), h('span', { class: 'champ__round-name', text: track.grandPrix }), h('span', { class: 'champ__round-code', text: track.countryCode })),
      ),
    );
    this.panel.replaceChildren(
      h('header', { class: 'rsel__header' }, h('span', { class: 'rsel__kicker', text: previous ? 'Temporada terminada' : 'Nueva temporada' }), h('h2', { class: 'rsel__title', text: 'Campeonato' })),
      h('h3', { class: 'rsel__section', text: 'Calendario' }),
      calendar,
      h('h3', { class: 'rsel__section', text: 'Opciones' }),
      h('div', { class: 'rsel__rows' }, ...this.rows.map((row) => row.element)),
      start,
    );
    this.refreshRows();
    if (previous) {
      const table = standings(previous);
      const champion = table[0];
      this.side.replaceChildren(
        h(
          'div',
          { class: 'champ__champion' },
          h('span', { class: 'champ__champion-label', text: 'CAMPEÓN' }),
          h('span', { class: 'champ__champion-name', text: champion ? this.nameOf(champion.id) : '' }),
          h('span', { class: 'champ__champion-points', text: champion ? `${champion.points} puntos · ${champion.wins} ${champion.wins === 1 ? 'victoria' : 'victorias'}` : '' }),
        ),
        this.table(previous),
        this.help(),
      );
    } else {
      this.side.replaceChildren(
        h(
          'div',
          { class: 'champ__intro' },
          h('h3', { class: 'champ__intro-title', text: 'La temporada' }),
          h('p', {
            text: `Corres todo el calendario contra los mismos rivales. Cada carrera reparte ${POINTS.join('-')} puntos del 1.º al 10.º; gana el título quien sume más. Puedes dejarla y seguir otro día: queda guardada.`,
          }),
        ),
        this.help(),
      );
    }
    this.nav.focus(start);
  }

  /** Temporada en curso: calendario, tabla y próxima carrera. */
  private renderSeason(state: ChampionshipState): void {
    const next = nextRound(state);
    const calendar = h('ol', { class: 'champ__calendar' });
    state.rounds.forEach((round, i) => {
      const track = getTrack(round.trackId);
      const winner = round.results?.[0];
      const mine = round.results?.find((result) => result.id === PLAYER_ID);
      const status = round.results
        ? `1.º ${this.codeOf(winner?.id ?? '')} · tú P${mine?.position ?? '—'}`
        : i === next
          ? 'PRÓXIMA'
          : '';
      calendar.append(
        h(
          'li',
          { class: `champ__round${i === next ? ' is-next' : ''}${round.results ? ' is-done' : ''}` },
          h('span', { class: 'champ__round-n', text: `R${i + 1}` }),
          h('span', { class: 'champ__round-name', text: track.grandPrix }),
          h('span', { class: 'champ__round-status', text: status }),
        ),
      );
    });
    const nextTrack = getTrack(state.rounds[next]?.trackId ?? '');
    const race = createMenuButton({ label: `Ronda ${next + 1}: ${nextTrack.name}`, icon: 'flag' });
    race.classList.add('rsel__start');
    this.nav.add(race, {
      onFocus: () =>
        this.showHelp(
          nextTrack.grandPrix,
          `${state.laps} vueltas · ${difficultyLabel(state.difficulty)} · ${state.rivals.length + 1} autos · ${WEATHER_INFO[state.weather].label}.`,
        ),
      onConfirm: () => this.startRound(state, next),
    });
    const abandon = createMenuButton({ label: 'Abandonar campeonato', icon: 'exit' });
    this.nav.add(abandon, {
      onFocus: () => this.showHelp('Abandonar campeonato', 'Se pierde la temporada en curso (los récords de vuelta se conservan).'),
      onConfirm: () => {
        if (!this.confirmAbandon) {
          this.confirmAbandon = true;
          abandon.querySelector('.mbtn__label')?.replaceChildren('Pulsa otra vez para confirmar');
          this.game.playUi('locked');
          return;
        }
        this.game.save.update((data) => (data.championship = null));
        this.game.playUi('back');
        this.render();
      },
    });
    const done = state.rounds.filter((round) => round.results).length;
    this.panel.replaceChildren(
      h(
        'header',
        { class: 'rsel__header' },
        h('span', { class: 'rsel__kicker', text: `Temporada en curso · ${done} de ${state.rounds.length} carreras` }),
        h('h2', { class: 'rsel__title', text: 'Campeonato' }),
      ),
      h('h3', { class: 'rsel__section', text: 'Calendario' }),
      calendar,
      race,
      abandon,
    );
    this.side.replaceChildren(this.table(state), this.help());
    this.nav.focus(race);
  }

  /** Tabla de pilotos. */
  private table(state: ChampionshipState): HTMLElement {
    const rows = standings(state).map((row) => {
      const color = h('span', { class: 'ctable__team' });
      color.style.background = this.colorOf(row.id);
      return h(
        'div',
        { class: `ctable__row${row.id === PLAYER_ID ? ' is-player' : ''}` },
        h('span', { class: 'ctable__pos', text: String(row.position) }),
        color,
        h('span', { class: 'ctable__name' }, h('span', { text: this.nameOf(row.id) }), h('span', { class: 'ctable__teamname', text: this.teamNameOf(row.id) })),
        h('span', { class: 'ctable__wins', text: row.wins > 0 ? `${row.wins} V` : '' }),
        h('span', { class: 'ctable__points', text: String(row.points) }),
      );
    });
    const table = h(
      'div',
      { class: 'ctable' },
      h('h3', { class: 'rsel__section', text: 'Pilotos' }),
      h('div', { class: 'ctable__row ctable__row--head' }, h('span', { text: 'POS' }), h('span'), h('span', { text: 'PILOTO' }), h('span'), h('span', { text: 'PTS' })),
      ...rows,
    );
    // Con muchos autos la tabla se desplaza: la fila del jugador queda a la vista.
    const player = rows.find((row) => row.classList.contains('is-player'));
    requestAnimationFrame(() => {
      if (!player || !table.isConnected) return;
      const bottom = player.offsetTop + player.offsetHeight;
      if (bottom > table.clientHeight) table.scrollTop = bottom - table.clientHeight / 2;
    });
    return table;
  }

  private setupRows(ctx: RowContext): SettingRow[] {
    const race = (): Game['settings']['race'] => this.game.settings.race;
    return [
      selectorRow<RaceLaps>(ctx, {
        label: 'Vueltas por carrera',
        help: 'Largo de cada carrera de la temporada.',
        options: RACE_LAPS.map((value) => ({ value, label: String(value) })),
        get: () => race().laps,
        set: (value) => this.game.updateSettings((s) => (s.race.laps = value)),
      }),
      selectorRow<DifficultyLevel>(ctx, {
        label: 'Dificultad',
        help: 'Fija para toda la temporada.',
        options: DIFFICULTY_LEVELS.map((value) => ({ value, label: DIFFICULTY_INFO[value].label })),
        get: () => race().difficulty,
        set: (value) => this.game.updateSettings((s) => (s.race.difficulty = value)),
      }),
      sliderRow(ctx, {
        label: 'Personalizada',
        help: 'Se usa con la dificultad Personalizada (0–100).',
        min: 0,
        max: 100,
        step: 5,
        format: (value) => String(Math.round(value)),
        get: () => race().customDifficulty,
        set: (value) => this.game.updateSettings((s) => (s.race.customDifficulty = value)),
      }),
      sliderRow(ctx, {
        label: 'Autos en pista',
        help: 'Autos en pista contando el tuyo (de 10 a 20); los mismos pilotos toda la temporada.',
        min: RIVALS_MIN,
        max: RIVALS_MAX,
        step: 1,
        format: (value) => String(Math.round(value) + 1),
        get: () => race().rivals,
        set: (value) => this.game.updateSettings((s) => (s.race.rivals = value)),
      }),
      selectorRow<AssistLevel>(ctx, {
        label: 'Nivel de ayudas',
        help: 'Se puede cambiar entre carreras desde Ajustes → Ayudas.',
        options: ASSIST_LEVELS.map((value) => ({ value, label: LEVEL_INFO[value].name })),
        get: () => this.game.settings.assists.level,
        set: (value) => this.game.updateSettings((s) => (s.assists.level = value)),
      }),
      selectorRow<Weather>(ctx, {
        label: 'Clima',
        help: 'El mismo para todas las carreras de la temporada.',
        options: WEATHERS.map((value) => ({ value, label: WEATHER_INFO[value].label })),
        get: () => race().weather,
        set: (value) => this.game.updateSettings((s) => (s.race.weather = value)),
      }),
    ];
  }

  private refreshRows(): void {
    for (const row of this.rows) row.refresh?.();
    this.rows[2]?.element.classList.toggle('is-muted', this.game.settings.race.difficulty !== 'custom');
  }

  /** Ayuda de la opción enfocada (abajo, del lado derecho). */
  private help(): HTMLElement {
    return h('aside', { class: 'rsel__help champ__help' }, this.helpTitle, this.helpText);
  }

  private showHelp(title: string, text: string): void {
    this.helpTitle.textContent = title;
    this.helpText.textContent = text;
  }

  private startSeason(): void {
    const race = this.game.settings.race;
    const state = createChampionship(
      {
        laps: race.laps,
        difficulty: difficultyValue(race),
        weather: race.weather,
        rivals: pickRivals(race.rivals).map((driver) => driver.id),
        calendar: TRACKS.map((track) => track.id),
      },
      Date.now(),
    );
    this.game.save.update((data) => (data.championship = state));
    this.game.playUi('confirm');
    this.startRound(state, 0);
  }

  private startRound(state: ChampionshipState, round: number): void {
    const entry = state.rounds[round];
    if (!entry) return;
    this.game.playUi('confirm');
    void this.game.screens.goTo('race', {
      trackId: entry.trackId,
      mode: 'race',
      laps: state.laps,
      rivals: state.rivals.length,
      difficulty: state.difficulty,
      weather: state.weather,
      championshipRound: round,
    });
  }

  private nameOf(id: string): string {
    if (id === PLAYER_ID) return this.game.save.data.profile.name;
    return driversById.get(id)?.name ?? id;
  }

  private codeOf(id: string): string {
    if (id === PLAYER_ID) return 'TÚ';
    return driversById.get(id)?.code ?? '—';
  }

  private teamNameOf(id: string): string {
    const driver = driversById.get(id);
    return driver ? teamOf(driver).name : (playerTeam?.name ?? '');
  }

  private colorOf(id: string): string {
    const driver = driversById.get(id);
    return driver ? teamOf(driver).primary : (playerTeam?.primary ?? '#ffffff');
  }
}

/** Nombre del nivel de dificultad más cercano a un valor 0–100. */
function difficultyLabel(value: number): string {
  let best: DifficultyLevel = 'amateur';
  for (const level of DIFFICULTY_LEVELS) {
    if (level === 'custom') continue;
    if (Math.abs(DIFFICULTY_INFO[level].value - value) < Math.abs(DIFFICULTY_INFO[best].value - value)) best = level;
  }
  return Math.abs(DIFFICULTY_INFO[best].value - value) < 3 ? DIFFICULTY_INFO[best].label : `Dificultad ${Math.round(value)}`;
}
