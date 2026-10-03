/**
 * Torre de posiciones en carrera, estilo transmisión: posición, color del
 * equipo, abreviatura del piloto, sanción (si tiene) e intervalo con el auto de adelante. Con
 * muchos autos muestra los tres primeros y una ventana alrededor del jugador.
 * Las filas se crean una sola vez y sólo se reescribe lo que cambia.
 */

import { formatGap } from '../../core/utils/format';
import type { StandingRow } from '../../race/Session';
import { h } from '../dom';

/** Filas visibles como máximo. */
const MAX_ROWS = 10;
/** Primeros puestos que siempre se muestran si hay que recortar. */
const TOP_ROWS = 3;

interface RowView {
  root: HTMLDivElement;
  position: HTMLSpanElement;
  color: HTMLSpanElement;
  code: HTMLSpanElement;
  /** Sanción de tiempo ("+5s"), si tiene. */
  penalty: HTMLSpanElement;
  gap: HTMLSpanElement;
  key: string;
}

/** Intervalo como texto: "+1.234", "+1 V" o "LÍDER". */
export function intervalText(row: Pick<StandingRow, 'position' | 'interval' | 'finished'>, leaderLabel = 'LÍDER'): string {
  if (row.position === 1) return leaderLabel;
  if (row.interval.laps > 0) return `+${row.interval.laps} V`;
  return row.interval.seconds === null ? '' : formatGap(row.interval.seconds);
}

export class Standings {
  readonly element: HTMLDivElement;
  private readonly rows: RowView[] = [];
  private readonly list = h('div', { class: 'standings__list' });

  constructor() {
    this.element = h('div', { class: 'hud__standings standings', attrs: { 'aria-label': 'Posiciones' } }, this.list);
    for (let i = 0; i < MAX_ROWS; i++) {
      const view: RowView = {
        root: h('div', { class: 'standings__row' }),
        position: h('span', { class: 'standings__pos' }),
        color: h('span', { class: 'standings__team' }),
        code: h('span', { class: 'standings__code' }),
        penalty: h('span', { class: 'standings__penalty' }),
        gap: h('span', { class: 'standings__gap' }),
        key: '',
      };
      view.root.append(view.position, view.color, view.code, view.penalty, view.gap);
      this.rows.push(view);
      this.list.append(view.root);
    }
  }

  setVisible(visible: boolean): void {
    this.element.classList.toggle('is-visible', visible);
  }

  /** Actualiza la torre con la tabla completa (del primero al último). */
  update(table: readonly StandingRow[]): void {
    const shown = pickRows(table);
    this.rows.forEach((view, i) => {
      const row = shown[i];
      if (!row) {
        if (view.key !== '') {
          view.key = '';
          view.root.classList.add('is-empty');
        }
        return;
      }
      const gap = intervalText(row);
      // Salto de posiciones entre la fila anterior y ésta: se marca con un separador.
      const previous = shown[i - 1];
      const gapBefore = previous !== undefined && row.position - previous.position > 1;
      const key = `${row.position}|${row.code}|${gap}|${row.isPlayer}|${row.finished}|${row.fastestLap}|${gapBefore}|${row.penalty}`;
      if (key === view.key) return;
      view.key = key;
      view.root.classList.remove('is-empty');
      view.root.classList.toggle('is-player', row.isPlayer);
      view.root.classList.toggle('is-finished', row.finished);
      view.root.classList.toggle('is-fastest', row.fastestLap);
      view.root.classList.toggle('is-split', gapBefore);
      view.position.textContent = String(row.position);
      view.color.style.background = row.teamColor;
      view.code.textContent = row.code;
      view.penalty.textContent = row.penalty > 0 ? `+${row.penalty}s` : '';
      view.gap.textContent = gap;
    });
  }
}

/** Filas a mostrar: todas si entran; si no, los primeros y una ventana alrededor del jugador. */
function pickRows(table: readonly StandingRow[]): StandingRow[] {
  if (table.length <= MAX_ROWS) return [...table];
  const player = table.findIndex((row) => row.isPlayer);
  const windowSize = MAX_ROWS - TOP_ROWS;
  const top = table.slice(0, TOP_ROWS);
  if (player < MAX_ROWS - 2) return table.slice(0, MAX_ROWS);
  const start = Math.max(TOP_ROWS, Math.min(table.length - windowSize, player - Math.floor(windowSize / 2)));
  return [...top, ...table.slice(start, start + windowSize)];
}
