/**
 * Guía de circuitos: las 24 pistas del calendario con toda su información.
 * A la izquierda la lista (bandera, nombre, fecha, dificultad y si ya tienes
 * tiempo); a la derecha el circuito elegido con tres pestañas (Q / E):
 * - Ficha técnica: datos calculados con la física del juego, la traza de
 *   velocidad de una vuelta (con frenadas y tramos a fondo) y su dificultad.
 * - Curva por curva: cada curva con su tipo, velocidades, marcha, frenada y
 *   un consejo; ← → las recorre y el mapa resalta la elegida.
 * - Tus tiempos: mejor vuelta, mejores sectores, vuelta ideal, fantasma y
 *   cuántas veces corriste, ganaste o subiste al podio ahí.
 * ENTER (o el botón) lleva a la carrera rápida con ese circuito elegido.
 */

import gsap from 'gsap';
import type { Game } from '../../core/Game';
import type { UiAction } from '../../core/input/actions';
import type { ScreenParams } from '../../core/screens/params';
import { formatDelta, formatLapTime } from '../../core/utils/format';
import { CHAMPIONSHIPS, LEVEL_LABEL, TRACK_DIFFICULTY } from '../../data/championships';
import { CORNER_KIND_LABEL, trackAnalysis, trackInsight, type CornerInfo, type TrackInsight } from '../../tracks/insight';
import { TRACKS } from '../../tracks/registry';
import type { TrackDefinition } from '../../tracks/TrackDefinition';
import { finished } from '../anim/finished';
import { ControlHints } from '../components/ControlHints';
import { createCountryFlag } from '../components/CountryFlag';
import { TrackMap } from '../components/TrackMap';
import { h, prefersReducedMotion, svg } from '../dom';
import { ICONS } from '../icons';
import { BaseScreen } from './BaseScreen';

type CircuitTab = 'sheet' | 'corners' | 'times';

const TABS: ReadonlyArray<{ id: CircuitTab; label: string }> = [
  { id: 'sheet', label: 'Ficha técnica' },
  { id: 'corners', label: 'Curva por curva' },
  { id: 'times', label: 'Tus tiempos' },
];

const KIND_COLOR: Readonly<Record<CornerInfo['kind'], string>> = {
  hairpin: '#ff3b4a',
  slow: '#ff8a3d',
  medium: '#f5c542',
  fast: '#2fd27a',
  flat: '#29d8ff',
};

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Lienzo de la traza de velocidad. */
const TRACE_W = 600;
const TRACE_H = 120;
const TRACE_BINS = 240;

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  return element;
}

function km(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
}

export class CircuitsScreen extends BaseScreen<ScreenParams['circuits']> {
  readonly id = 'circuits';
  private track: TrackDefinition = TRACKS[0] as TrackDefinition;
  private tab: CircuitTab = 'sheet';
  private corner = 0;
  private readonly rows = new Map<string, HTMLButtonElement>();
  private readonly tabButtons = new Map<CircuitTab, HTMLButtonElement>();
  private readonly map = new TrackMap();
  private readonly list = h('div', { class: 'circ__list', attrs: { role: 'listbox', 'aria-label': 'Circuitos' } });
  private readonly side = h('div', { class: 'circ__side' });
  private readonly stage = h('div', { class: 'circ__stage' });
  private readonly head = h('header', { class: 'circ__head' });
  private readonly pane = h('div', { class: 'circ__pane' });
  private readonly mapBox = h('div', { class: 'circ__map' }, this.map.element);
  private hints: ControlHints | null = null;
  /** Los datos del circuito se calculan cuando el foco se queda quieto. */
  private bodyTimer: ReturnType<typeof setTimeout> | null = null;
  private insight: TrackInsight | null = null;

  constructor(game: Game) {
    super(game, 'screen--circ');
  }

  enter(params: ScreenParams['circuits']): void {
    const wanted = params?.trackId ?? this.game.settings.race.trackId;
    this.track = TRACKS.find((t) => t.id === wanted) ?? this.track;
    this.own.add(() => {
      if (this.bodyTimer) clearTimeout(this.bodyTimer);
    });

    const records = this.game.save.data.records;
    for (const def of TRACKS) {
      const info = TRACK_DIFFICULTY[def.id];
      const level = info?.level ?? 'medium';
      const best = records[def.id]?.bestLap ?? null;
      const row = h(
        'button',
        { class: `crow crow--${level}`, attrs: { type: 'button', role: 'option', 'aria-label': def.grandPrix } },
        createCountryFlag(def.countryCode, 'crow__flag'),
        h('span', { class: 'crow__text' }, h('span', { class: 'crow__name', text: def.short }), h('span', { class: 'crow__gp', text: def.grandPrix })),
        h('span', { class: 'crow__date', text: info?.date ?? '' }),
        best === null ? h('span', { class: 'crow__best' }) : h('span', { class: 'crow__best is-set', attrs: { title: 'Tienes tiempo aquí' } }, svg(ICONS.stopwatch)),
        h('span', { class: 'crow__level' }),
      );
      this.rows.set(def.id, row);
      this.list.append(row);
      this.nav.add(row, {
        onFocus: () => this.selectTrack(def),
        onConfirm: () => this.raceHere('quickRace'),
        onLeft: () => this.stepCorner(-1),
        onRight: () => this.stepCorner(1),
      });
    }

    const tabs = h('div', { class: 'tabs circ__tabs', attrs: { role: 'tablist' } });
    for (const tab of TABS) {
      const button = h('button', { class: 'tab', attrs: { type: 'button', role: 'tab' } }, h('span', { text: tab.label }));
      this.own.listen(button, 'click', () => this.selectTab(tab.id, true));
      this.tabButtons.set(tab.id, button);
      tabs.append(button);
    }
    const raceButton = h('button', { class: 'circ__go is-primary', attrs: { type: 'button' } }, svg(ICONS.flag, 'icon'), h('span', { text: 'Correr aquí' }));
    const trialButton = h('button', { class: 'circ__go', attrs: { type: 'button' } }, svg(ICONS.stopwatch, 'icon'), h('span', { text: 'Contrarreloj' }));
    this.own.listen(raceButton, 'click', () => this.raceHere('quickRace'));
    this.own.listen(trialButton, 'click', () => this.raceHere('timeTrial'));

    this.hints = new ControlHints(
      [
        { keys: [{ keyboard: '↑↓', gamepad: '✚' }], label: 'Circuito' },
        { keys: [{ keyboard: 'Q', gamepad: 'LB' }, { keyboard: 'E', gamepad: 'RB' }], label: 'Pestaña' },
        { keys: [{ keyboard: '←→', gamepad: '✚' }], label: 'Curva' },
        { keys: [{ keyboard: 'ENTER', gamepad: 'A' }], label: 'Correr aquí' },
        { keys: [{ keyboard: 'ESC', gamepad: 'B' }], label: 'Volver' },
      ],
      this.game.input.lastDevice,
    );
    this.own.add(this.game.events.on('input:device', ({ device }) => this.hints?.setDevice(device)));
    const back = h('button', { class: 'rsel__back', attrs: { type: 'button' }, text: 'Volver' });
    this.own.listen(back, 'click', () => this.onBack());

    this.side.append(
      h('header', { class: 'rsel__header' }, h('span', { class: 'rsel__kicker', text: `Temporada 2026 · ${TRACKS.length} circuitos` }), h('h2', { class: 'rsel__title', text: 'Circuitos' })),
      this.list,
    );
    this.stage.append(
      this.head,
      tabs,
      h('div', { class: 'circ__body' }, this.pane, this.mapBox),
      h('div', { class: 'circ__actions' }, raceButton, trialButton),
    );
    this.root.append(
      h('div', { class: 'rsel__backdrop fx-backdrop' }),
      this.side,
      this.stage,
      h('footer', { class: 'rsel__footer' }, this.hints.element, back),
    );
    this.selectTab('sheet', false);
    const row = this.rows.get(this.track.id);
    if (row) this.nav.focus(row);
  }

  reveal(): void {
    const quick = prefersReducedMotion();
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from(this.side, { x: -60, opacity: 0, duration: quick ? 0.01 : 0.5 }, 0);
    // Las filas sólo aparecen (sin mover): GSAP absorbería el `translate` de la
    // fila enfocada en su transform y la dejaría corrida.
    tl.from(this.list, { x: -24, duration: quick ? 0.01 : 0.45 }, 0.1);
    tl.from(this.list.children, { opacity: 0, stagger: quick ? 0 : 0.02, duration: quick ? 0.01 : 0.3 }, 0.1);
    tl.from(this.stage, { opacity: 0, x: 40, duration: quick ? 0.01 : 0.6 }, 0.05);
    this.own.tween(tl);
  }

  async hide(): Promise<void> {
    const tl = gsap.timeline();
    tl.to([this.side, this.stage], { opacity: 0, duration: 0.25, ease: 'power2.in' }, 0);
    if (prefersReducedMotion()) tl.progress(1);
    await finished(tl);
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

  // ─── Selección ─────────────────────────────────────────────────────────

  private selectTrack(def: TrackDefinition): void {
    const changed = def !== this.track || this.insight === null;
    this.track = def;
    for (const [id, row] of this.rows) row.classList.toggle('is-selected', id === def.id);
    this.renderHead();
    if (!changed) return;
    this.corner = 0;
    // El análisis cuesta unas decenas de ms: se espera a que el foco se quede quieto.
    this.pane.classList.add('is-loading');
    if (this.bodyTimer) clearTimeout(this.bodyTimer);
    this.bodyTimer = setTimeout(() => {
      this.bodyTimer = null;
      if (this.track !== def) return;
      this.insight = trackInsight(def);
      this.map.show(def);
      this.renderPane(true);
    }, 140);
  }

  private selectTab(tab: CircuitTab, withSound: boolean): void {
    if (withSound && tab === this.tab) return;
    this.tab = tab;
    for (const [id, button] of this.tabButtons) {
      button.classList.toggle('is-active', id === tab);
      button.setAttribute('aria-selected', String(id === tab));
    }
    if (withSound) this.game.playUi('tab');
    this.stage.dataset.tab = tab;
    this.renderPane(true);
  }

  private stepCorner(delta: number): void {
    const corners = this.insight?.corners ?? [];
    if (corners.length === 0) return;
    if (this.tab !== 'corners') {
      // Desde otra pestaña, ← → abre la guía de curvas.
      this.selectTab('corners', true);
      return;
    }
    this.corner = (this.corner + delta + corners.length) % corners.length;
    this.game.playUi('tick');
    this.renderPane(false);
  }

  private raceHere(mode: 'quickRace' | 'timeTrial'): void {
    this.game.playUi('confirm');
    const trackId = this.track.id;
    this.game.updateSettings((s) => (s.race.trackId = trackId));
    void this.game.screens.goTo('raceSelect', { mode });
  }

  // ─── Contenido ─────────────────────────────────────────────────────────

  private renderHead(): void {
    const def = this.track;
    const info = TRACK_DIFFICULTY[def.id];
    const level = info?.level ?? 'medium';
    const cups = CHAMPIONSHIPS.filter((cup) => cup.tracks.includes(def.id) && cup.tracks.length < TRACKS.length).map((cup) => cup.name);
    this.head.replaceChildren(
      createCountryFlag(def.countryCode, 'circ__flag'),
      h(
        'div',
        { class: 'circ__titles' },
        h('span', { class: 'circ__gp', text: def.grandPrix }),
        h('h3', { class: 'circ__name', text: def.name }),
        h('span', { class: 'circ__place', text: `${def.city} · ${def.country}` }),
      ),
      h(
        'div',
        { class: 'circ__badges' },
        h('span', { class: `circ__badge circ__badge--${level}`, text: `${LEVEL_LABEL[level]} · ${(info?.rating ?? 5).toFixed(1)}/10` }),
        h('span', { class: 'circ__badge', text: info?.date ?? '' }),
        ...cups.map((name) => h('span', { class: 'circ__badge is-cup', text: name })),
      ),
    );
  }

  private renderPane(animate: boolean): void {
    const insight = this.insight;
    if (!insight || this.bodyTimer) return;
    this.pane.classList.remove('is-loading');
    this.map.highlight(this.tab === 'corners' ? this.corner + 1 : null);
    switch (this.tab) {
      case 'sheet':
        this.pane.replaceChildren(...this.sheet(insight));
        break;
      case 'corners':
        this.pane.replaceChildren(...this.cornerGuide(insight));
        break;
      case 'times':
        this.pane.replaceChildren(...this.times());
        break;
    }
    if (animate && !prefersReducedMotion()) {
      this.own.tween(gsap.from(this.pane.children, { y: 12, opacity: 0, stagger: 0.05, duration: 0.3, ease: 'power2.out' }));
    }
  }

  private tile(label: string, value: string, sub = '', tone = ''): HTMLElement {
    return h(
      'div',
      { class: `ctile ${tone}`.trim() },
      h('span', { class: 'ctile__label', text: label }),
      h('span', { class: 'ctile__value', text: value }),
      sub ? h('span', { class: 'ctile__sub', text: sub }) : null,
    );
  }

  /** Ficha técnica: ocho datos, la traza de velocidad y la dificultad. */
  private sheet(insight: TrackInsight): HTMLElement[] {
    const def = this.track;
    const info = TRACK_DIFFICULTY[def.id];
    const slow = insight.slowest;
    return [
      h(
        'div',
        { class: 'circ__tiles' },
        this.tile('Longitud', `${def.lengthKm.toFixed(3)} km`, `${insight.kind}`),
        this.tile('Curvas', String(def.turns), `${def.drsZones.length} ${def.drsZones.length === 1 ? 'zona' : 'zonas'} de DRS`),
        this.tile('Vel. máxima', `${insight.topSpeedKmh} km/h`, 'sin DRS'),
        this.tile('A fondo', `${Math.round(insight.fullThrottle * 100)} %`, `${km(insight.longestFlatOut)} seguidos`),
        this.tile('Frenadas', String(insight.brakingZones), `${insight.heavyBraking} ${insight.heavyBraking === 1 ? 'fuerte' : 'fuertes'}`),
        this.tile('Más lenta', slow ? `${slow.minKmh} km/h` : '—', slow ? `curva ${slow.number} · ${slow.gear}.ª` : ''),
        this.tile('Récord', formatLapTime(def.lapRecord.seconds), `${def.lapRecord.driver} · ${def.lapRecord.year}`, 'is-record'),
        this.tile('Promedio', `${insight.recordAverageKmh} km/h`, 'vuelta récord'),
      ),
      this.trace(insight, null),
      h('p', { class: 'circ__reason' }, h('b', { text: 'Por qué es así: ' }), info?.reason ?? ''),
    ];
  }

  /** Guía curva por curva: la elegida en detalle, la traza y todas las curvas. */
  private cornerGuide(insight: TrackInsight): HTMLElement[] {
    const corners = insight.corners;
    const corner = corners[this.corner];
    if (!corner) return [h('p', { class: 'circ__empty', text: 'Este circuito no tiene curvas para mostrar.' })];
    const figure = (label: string, value: string): HTMLElement =>
      h('div', { class: 'cfig' }, h('span', { class: 'cfig__label', text: label }), h('span', { class: 'cfig__value', text: value }));
    const card = h(
      'article',
      { class: 'ccard', style: { '--kind': KIND_COLOR[corner.kind] } },
      h(
        'header',
        { class: 'ccard__head' },
        h('span', { class: 'ccard__number', text: String(corner.number) }),
        h(
          'span',
          { class: 'ccard__titles' },
          h('span', { class: 'ccard__title', text: `Curva ${corner.number} · ${corner.direction === 'left' ? 'izquierda' : 'derecha'}` }),
          h('span', { class: 'ccard__kind', text: `${CORNER_KIND_LABEL[corner.kind]} · radio ${corner.radius} m` }),
        ),
        h('span', { class: `ccard__dir ccard__dir--${corner.direction}` }, svg(ICONS.chevronRight)),
      ),
      h(
        'div',
        { class: 'ccard__figs' },
        figure('Llegada', `${corner.entryKmh} km/h`),
        figure('Mínima', `${corner.minKmh} km/h`),
        figure('Marcha', `${corner.gear}.ª`),
        figure('Frenada', corner.brakingMeters === null ? 'sin frenar' : `${corner.brakingMeters} m`),
      ),
      h('p', { class: 'ccard__tip', text: corner.tip }),
    );
    const chips = h('div', { class: 'circ__chips' });
    corners.forEach((c, i) => {
      const chip = h(
        'button',
        { class: `cchip${i === this.corner ? ' is-active' : ''}`, attrs: { type: 'button', title: `Curva ${c.number}` }, style: { '--kind': KIND_COLOR[c.kind] } },
        h('span', { text: String(c.number) }),
      );
      this.own.listen(chip, 'click', () => {
        this.corner = i;
        this.game.playUi('tick');
        this.renderPane(false);
      });
      chips.append(chip);
    });
    return [card, this.trace(insight, corner.number - 1), chips];
  }

  /** Tus tiempos en el circuito: vuelta, sectores, vuelta ideal y resultados. */
  private times(): HTMLElement[] {
    const def = this.track;
    const data = this.game.save.data;
    const record = data.records[def.id];
    const stats = data.stats.tracks[def.id] ?? { races: 0, wins: 0, podiums: 0 };
    const best = record?.bestLap ?? null;
    const sectors = record?.bestSectors ?? [null, null, null];
    const results = h(
      'div',
      { class: 'circ__tiles circ__tiles--3' },
      this.tile('Carreras', String(stats.races)),
      this.tile('Victorias', String(stats.wins), '', stats.wins > 0 ? 'is-gold' : ''),
      this.tile('Podios', String(stats.podiums)),
    );
    if (best === null) {
      return [
        h(
          'div',
          { class: 'circ__nolap' },
          svg(ICONS.stopwatch, 'icon'),
          h('b', { text: 'Todavía no tienes una vuelta válida aquí.' }),
          h('span', { text: `Corre una práctica, una carrera o una contrarreloj: tu mejor vuelta y tus mejores sectores quedan guardados. El récord es ${formatLapTime(def.lapRecord.seconds)}.` }),
        ),
        results,
      ];
    }
    const gap = best - def.lapRecord.seconds;
    const known = sectors.every((s) => s !== null);
    const ideal = known ? sectors.reduce<number>((sum, s) => sum + (s ?? 0), 0) : null;
    const pace = Math.max(0, Math.min(1, def.lapRecord.seconds / best));
    const sectorTile = (i: number): HTMLElement => {
      const value = sectors[i] ?? null;
      return h(
        'div',
        { class: `csector csector--s${i + 1}` },
        h('span', { class: 'csector__label', text: `S${i + 1}` }),
        h('span', { class: 'csector__value', text: value === null ? '—' : formatLapTime(value) }),
      );
    };
    return [
      h(
        'div',
        { class: 'cbest' },
        h('span', { class: 'cbest__label', text: 'Tu mejor vuelta' }),
        h('span', { class: 'cbest__time', text: formatLapTime(best) }),
        h('span', { class: `cbest__gap${gap <= 0 ? ' is-record' : ''}`, text: gap <= 0 ? '¡Más rápido que el récord!' : `${formatDelta(gap)} al récord` }),
        h('span', { class: 'cbest__bar' }, h('i', { style: { transform: `scaleX(${pace.toFixed(3)})` } })),
        h('span', { class: 'cbest__pace', text: `${Math.round(pace * 100)} % del ritmo del récord · ${Math.round((def.lengthKm * 3600) / best)} km/h de promedio` }),
      ),
      h('div', { class: 'csectors' }, sectorTile(0), sectorTile(1), sectorTile(2)),
      h(
        'p',
        { class: 'circ__ideal' },
        ideal === null
          ? 'Completa vueltas válidas para tener tus tres mejores sectores.'
          : `Vuelta ideal (tus mejores sectores juntos): ${formatLapTime(ideal)}${best - ideal > 0.0005 ? ` · te faltan ${(best - ideal).toFixed(3)} s para lograrla` : ' · ¡ya la hiciste!'}`,
      ),
      record?.ghost
        ? h('p', { class: 'circ__ghost' }, svg(ICONS.helmet, 'icon'), `Fantasma guardado: ${formatLapTime(record.ghost.time)}. En contrarreloj corres contra él.`)
        : h('p', { class: 'circ__ghost is-empty' }, svg(ICONS.helmet, 'icon'), 'Sin fantasma: tu mejor vuelta de contrarreloj queda guardada para correr contra ella.'),
      results,
    ];
  }

  /**
   * Traza de velocidad de una vuelta desde la meta: el área es la velocidad;
   * abajo, una franja verde (a fondo), amarilla (curva) y roja (frenada); las
   * líneas punteadas son los sectores. Con `focus` se marca una curva.
   */
  private trace(insight: TrackInsight, focus: number | null): HTMLElement {
    const { analysis, geometry, startS } = trackAnalysis(this.track);
    const n = analysis.speed.length;
    const length = geometry.length;
    const max = Math.max(1, ...analysis.speed);
    const speedAt = (s: number): { v: number; state: 'flat' | 'corner' | 'brake' } => {
      const i = Math.floor(geometry.wrapS(s) / geometry.ds) % n;
      const v = analysis.speed[i] ?? 0;
      const state = analysis.braking[i] ? 'brake' : v < (analysis.cornerLimit[i] ?? 0) * 0.985 ? 'flat' : 'corner';
      return { v, state };
    };
    const points: string[] = [];
    const stops: string[] = [];
    const colors = { flat: '#2fd27a', corner: '#f5c542', brake: '#ff3b4a' } as const;
    for (let b = 0; b <= TRACE_BINS; b++) {
      const s = startS + (b / TRACE_BINS) * length;
      const { v, state } = speedAt(s);
      const x = (b / TRACE_BINS) * TRACE_W;
      const y = TRACE_H - 8 - (v / max) * (TRACE_H - 22);
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      if (b < TRACE_BINS) stops.push(`${colors[state]} ${((b / TRACE_BINS) * 100).toFixed(2)}% ${(((b + 1) / TRACE_BINS) * 100).toFixed(2)}%`);
    }
    const chart = svgEl('svg', { viewBox: `0 0 ${TRACE_W} ${TRACE_H}`, class: 'ctrace__svg', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
    const area = svgEl('polygon', { points: `0,${TRACE_H} ${points.join(' ')} ${TRACE_W},${TRACE_H}`, class: 'ctrace__area' });
    const line = svgEl('polyline', { points: points.join(' '), class: 'ctrace__line' });
    chart.append(area, line);
    const fraction = (s: number): number => geometry.wrapS(s - startS) / length;
    for (const end of [this.track.sectors[0], this.track.sectors[1]]) {
      const x = (fraction(geometry.designToS(end)) * TRACE_W).toFixed(1);
      chart.append(svgEl('line', { x1: x, y1: '0', x2: x, y2: String(TRACE_H), class: 'ctrace__sector' }));
    }
    const marks = h('div', { class: 'ctrace__marks' });
    // Números de curva en su ápice; los que quedarían pegados al anterior se omiten (salvo la elegida).
    let last = -1;
    insight.numbered.forEach((corner, i) => {
      const at = fraction(corner.apex);
      if (i !== focus && at - last < 0.03) return;
      last = at;
      marks.append(h('span', { class: `ctrace__mark${i === focus ? ' is-active' : ''}`, style: { left: `${(at * 100).toFixed(2)}%` }, text: String(i + 1) }));
    });
    return h(
      'figure',
      { class: 'ctrace' },
      h('figcaption', { class: 'ctrace__caption' }, h('span', { text: 'Velocidad en una vuelta' }), h('span', { class: 'ctrace__max', text: `máx. ${insight.topSpeedKmh} km/h` })),
      h('div', { class: 'ctrace__plot' }, chart, marks),
      h('div', { class: 'ctrace__strip', style: { background: `linear-gradient(90deg, ${stops.join(', ')})` } }),
      h(
        'div',
        { class: 'ctrace__legend' },
        h('span', { class: 'is-flat', text: 'A fondo' }),
        h('span', { class: 'is-corner', text: 'Curva' }),
        h('span', { class: 'is-brake', text: 'Frenada' }),
        h('span', { class: 'is-sector', text: 'Sectores' }),
      ),
    );
  }
}
