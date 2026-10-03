/**
 * Fin de carrera: franja a cuadros, posición final, tiempo total que cuenta
 * hacia arriba, mejor vuelta y la tabla de vueltas con sus sectores (fila por
 * fila). Con rivales, a la izquierda la clasificación completa, que se va
 * completando a medida que los demás reciben la bandera. Muestra la XP ganada
 * y "Continuar" lleva a la pantalla de resultados (XP, niveles y recompensas).
 */

import gsap from 'gsap';
import type { UiAction } from '../../core/input/actions';
import { Disposer } from '../../core/utils/Disposer';
import { formatGap, formatInteger, formatLapTime } from '../../core/utils/format';
import type { RaceResult, StandingRow } from '../../race/Session';
import { h, prefersReducedMotion } from '../dom';
import { finished } from '../anim/finished';
import { createMenuButton } from '../components/MenuButton';
import { FocusNavigator } from '../nav/FocusNavigator';

export interface FinishPanelOptions {
  /** "Continuar": a la pantalla de resultados. */
  onContinue(): void;
  /** "Ver repetición" (sólo en carrera). */
  onReplay?: () => void;
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
  private readonly xp = h('span', { class: 'finish__xp-value' });
  private readonly place = h('span', { class: 'finish__place-value' });
  private readonly placeBox = h('div', { class: 'finish__place' }, h('span', { class: 'finish__label', text: 'POSICIÓN' }), this.place);
  private readonly classification = h('div', { class: 'finish__classification', attrs: { role: 'table', 'aria-label': 'Clasificación' } });
  private readonly standingsPanel = h(
    'div',
    { class: 'finish__standings' },
    h('h3', { class: 'finish__standings-title', text: 'CLASIFICACIÓN' }),
    this.classification,
  );
  private classificationKey = '';
  private readonly panel: HTMLDivElement;
  private readonly buttons: HTMLButtonElement[] = [];
  private visible = false;
  /** Animación de entrada (se corta si el panel se cierra antes de que termine). */
  private showTimeline: gsap.core.Timeline | null = null;

  constructor(options: FinishPanelOptions) {
    this.nav = new FocusNavigator({ onMove: () => options.onMove() });
    this.own.add(() => this.nav.dispose());
    const next = createMenuButton({ label: 'Continuar', icon: 'play' });
    this.buttons.push(next);
    this.nav.add(next, { onConfirm: () => options.onContinue() });
    const onReplay = options.onReplay;
    const replay = onReplay ? createMenuButton({ label: 'Ver repetición', icon: 'camera' }) : null;
    if (replay && onReplay) {
      this.buttons.push(replay);
      this.nav.add(replay, { onConfirm: () => onReplay() });
    }

    this.panel = h(
      'div',
      { class: 'finish__panel', attrs: { role: 'dialog', 'aria-label': 'Carrera terminada' } },
      h('div', { class: 'finish__flag' }),
      h('h2', { class: 'finish__title', text: 'CARRERA TERMINADA' }),
      h(
        'div',
        { class: 'finish__summary' },
        this.placeBox,
        h('div', { class: 'finish__total' }, h('span', { class: 'finish__label', text: 'TIEMPO TOTAL' }), this.total),
        h('div', { class: 'finish__best' }, h('span', { class: 'finish__label', text: 'MEJOR VUELTA' }), this.best),
      ),
      this.table,
      this.note,
      h('div', { class: 'finish__actions' }, h('div', { class: 'finish__xp' }, h('span', { class: 'finish__label', text: 'XP GANADA' }), this.xp), h('div', { class: 'finish__buttons' }, next, replay)),
    );
    this.root = h('div', { class: 'finish' }, h('div', { class: 'finish__backdrop' }), this.standingsPanel, this.panel);
  }

  get isVisible(): boolean {
    return this.visible;
  }

  /**
   * @param standings clasificación (vacía si corrió solo)
   */
  show(result: RaceResult, personalBest: boolean, standings: readonly StandingRow[], xp: number): void {
    this.visible = true;
    this.xp.textContent = `+${formatInteger(xp)}`;
    const withRivals = standings.length > 1;
    this.root.classList.toggle('has-standings', withRivals);
    this.placeBox.hidden = !withRivals;
    this.place.textContent = `P${result.position}`;
    this.place.classList.toggle('is-podium', result.position <= 3);
    this.classificationKey = '';
    this.updateStandings(standings);
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
    const notes: string[] = [];
    if (result.penalty > 0) notes.push(`El tiempo total incluye +${result.penalty} s de sanción.`);
    if (personalBest) notes.push('¡Nuevo récord personal en este circuito!');
    else if (result.laps.some((lap) => !lap.valid)) notes.push('Las vueltas tachadas no cuentan para el récord (salidas de pista o volver a pista).');
    this.note.textContent = notes.join(' ');

    this.root.classList.add('is-visible');
    this.nav.setEnabled(true);
    const first = this.buttons[0];
    if (first) this.nav.focus(first);

    const quick = prefersReducedMotion();
    const counter = { value: 0 };
    const totalTime = result.totalTime + result.penalty;
    this.total.textContent = formatLapTime(quick ? totalTime : 0);
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
          value: totalTime,
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
    if (withRivals) {
      tl.fromTo(this.standingsPanel, { x: -60, opacity: 0 }, { x: 0, opacity: 1, duration: quick ? 0.01 : 0.6 }, 0.1);
      tl.from(this.classification.children, { x: -24, opacity: 0, stagger: quick ? 0 : 0.035, duration: quick ? 0.01 : 0.35 }, 0.3);
    }
    tl.from(this.buttons, { x: 40, opacity: 0, stagger: quick ? 0 : 0.08, duration: quick ? 0.01 : 0.45, ease: 'back.out(1.6)' }, 0.8);
    this.showTimeline = this.own.tween(tl);
  }

  /**
   * Reescribe la clasificación (los rivales siguen corriendo hasta recibir la
   * bandera). Sólo toca el DOM si algo cambió.
   */
  updateStandings(standings: readonly StandingRow[]): void {
    const cells = standings.map((row) => ({ row, result: resultText(row, standings[0]) }));
    const key = cells.map(({ row, result }) => `${row.index}:${result}:${row.fastestLap}:${row.penalty}`).join('|');
    if (key === this.classificationKey) return;
    this.classificationKey = key;
    const header = h(
      'div',
      { class: 'finish__crow finish__crow--head', attrs: { role: 'row' } },
      ...['POS', '', 'PILOTO', 'TIEMPO', 'MEJOR'].map((text) => h('span', { text, attrs: { role: 'columnheader' } })),
    );
    const rows = cells.map(({ row, result }) => {
      const color = h('span', { class: 'finish__cteam' });
      color.style.background = row.teamColor;
      return h(
        'div',
        {
          class: `finish__crow${row.isPlayer ? ' is-player' : ''}${row.finished ? '' : ' is-running'}`,
          attrs: { role: 'row' },
        },
        h('span', { class: 'finish__cpos', text: String(row.position) }),
        color,
        h(
          'span',
          { class: 'finish__cname' },
          h('span', { class: 'finish__cnumber', text: String(row.number) }),
          h('span', { text: row.name }),
          h('span', { class: 'finish__cteam-name', text: row.teamName }),
          row.penalty > 0 ? h('span', { class: 'finish__cpenalty', text: `+${row.penalty} s` }) : null,
        ),
        h('span', { class: 'finish__ctime', text: result }),
        h('span', {
          class: `finish__cbest${row.fastestLap ? ' is-fastest' : ''}`,
          text: row.bestLap === null ? '—' : formatLapTime(row.bestLap),
        }),
      );
    });
    this.classification.replaceChildren(header, ...rows);
  }

  /** @param instant sin animación (al pasar a la repetición: un corte, como en la TV) */
  async hide(instant = false): Promise<void> {
    if (!this.visible) return;
    this.visible = false;
    this.nav.setEnabled(false);
    // Si todavía estaba entrando, la entrada termina ya (si no, peleaba con la salida y el panel quedaba a medias).
    this.showTimeline?.progress(1).kill();
    this.showTimeline = null;
    const tl = gsap.timeline();
    tl.to(this.panel, { x: 60, opacity: 0, duration: 0.3, ease: 'power2.in' }, 0);
    tl.to(this.standingsPanel, { x: -60, opacity: 0, duration: 0.3, ease: 'power2.in' }, 0);
    tl.to(this.root.querySelector('.finish__backdrop'), { opacity: 0, duration: 0.3 }, 0);
    if (instant || prefersReducedMotion()) tl.progress(1);
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

/**
 * Tiempo del ganador, diferencia con él (o en vueltas) o "EN PISTA" si
 * todavía no terminó. Los tiempos llevan sumadas las sanciones.
 */
function resultText(row: StandingRow, winner: StandingRow | undefined): string {
  if (!row.finished) return 'EN PISTA';
  const total = (r: StandingRow): number | null => (r.finishTime === null ? null : r.finishTime + r.penalty);
  const mine = total(row);
  const best = winner ? total(winner) : null;
  if (row.position === 1 || !winner || best === null || mine === null) return mine === null ? '' : formatLapTime(mine);
  const laps = winner.laps - row.laps;
  if (laps > 0) return `+${laps} ${laps === 1 ? 'VUELTA' : 'VUELTAS'}`;
  return formatGap(mine - best);
}
