/**
 * levels/level-03.js — "El Diferente"
 *
 * Tipo:        Observación
 * Mecánica:    Cuadrícula 5×5 de símbolos idénticos. Uno está rotado unos
 *              grados de más.
 * Interacción: Clic en el símbolo diferente.
 * Solución:    El símbolo de la tercera fila (lo dice la pista #3 del
 *              documento maestro, así que la posición no es negociable).
 *
 * Sobre la dificultad: la diferencia es de 7°. Suficiente para que no salte a
 * la vista de inmediato, suficiente para que sea innegable al compararlo con
 * su vecino. Menos de eso sería una lotería, no una observación.
 */

import { LevelBase } from './level-base.js';
import { el, svgEl } from '../utils/dom.js';
import { createRng, randInt } from '../utils/math.js';

const SEED = 'mind-escape/level-03';
const SIZE = 5;
const BASE_ANGLE = 45;
const ODD_ANGLE = 52;
const TARGET_ROW = 2; // 0-based → tercera fila

const STYLES = `
.lv03 {
  flex: 1;
  display: grid;
  place-items: center;
}

.lv03__grid {
  display: grid;
  grid-template-columns: repeat(${SIZE}, 1fr);
  gap: clamp(4px, 1.6vw, 14px);
}

.lv03__cell {
  display: grid;
  place-items: center;
  width: clamp(46px, 12vw, 74px);
  aspect-ratio: 1;
  border-radius: var(--r-sm);
  border: 1px solid transparent;
  background: transparent;
  color: hsl(190 70% 62%);
  transition: background var(--t-fast) var(--ease),
              border-color var(--t-fast) var(--ease);
  animation: pop-in 0.3s var(--ease) both;
}

.lv03__cell:hover,
.lv03__cell:focus-visible {
  background: rgba(255, 255, 255, 0.045);
  border-color: var(--glass-border);
}

.lv03__cell svg { width: 58%; height: 58%; }

.lv03__cell--wrong { animation: error-shake 0.4s var(--ease); color: var(--error); }

.lv03__cell--found {
  color: var(--success);
  border-color: rgba(34, 197, 94, 0.5);
  background: var(--success-soft);
}

.lv03__cell--dimmed { opacity: 0.2; }
`;

export class Level03 extends LevelBase {
  constructor(levelId, container, context) {
    super(levelId, container, context);

    // La columna se sortea con semilla fija: la pista habla de la tercera fila
    // y debe seguir siendo cierta después de recargar.
    const rng = createRng(SEED);
    this.targetIndex = TARGET_ROW * SIZE + randInt(rng, 0, SIZE - 1);
  }

  init() {
    const grid = el('div.lv03__grid', {
      role: 'grid',
      'aria-label': `Cuadrícula de ${SIZE} por ${SIZE} símbolos`,
    });

    this.cells = [];

    for (let index = 0; index < SIZE * SIZE; index += 1) {
      const isTarget = index === this.targetIndex;
      const row = Math.floor(index / SIZE) + 1;
      const col = (index % SIZE) + 1;

      const cell = el('button.lv03__cell', {
        type: 'button',
        role: 'gridcell',
        'aria-label': `Símbolo fila ${row}, columna ${col}`,
        style: { animationDelay: `${index * 0.012}s` },
      }, [buildGlyph(isTarget ? ODD_ANGLE : BASE_ANGLE)]);

      this.listen(cell, 'click', () => this.onPick(index, cell));
      this.cells.push(cell);
      grid.append(cell);
    }

    this.mount(el('style', { text: STYLES }), el('div.lv03', {}, [grid]));
  }

  onPick(index, cell) {
    if (this.attempt(index)) return;
    cell.classList.add('lv03__cell--wrong');
    setTimeout(() => cell.classList.remove('lv03__cell--wrong'), 420);
  }

  validate(solution) {
    return Number(solution) === this.targetIndex;
  }

  onSolved() {
    this.cells.forEach((cell, index) => {
      cell.disabled = true;
      cell.classList.add(index === this.targetIndex ? 'lv03__cell--found' : 'lv03__cell--dimmed');
    });
  }

  getPrompt() {
    return 'Veinticinco símbolos. Uno no está alineado como el resto.';
  }

  getHints() {
    return [
      'Tu vista es tu herramienta.',
      'Compara fila por fila: uno de los símbolos está girado.',
      'La tercera fila esconde algo.',
    ];
  }

  getState() {
    return { targetIndex: this.targetIndex };
  }

  getType() {
    return 'observacion';
  }
}

/**
 * Símbolo del nivel: dos trazos en cruz asimétrica. Su gracia es que al girarlo
 * unos grados no queda "torcido" de forma obvia — hay que compararlo.
 */
function buildGlyph(angle) {
  return svgEl('svg', {
    viewBox: '0 0 40 40',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 3,
    'stroke-linecap': 'round',
    'aria-hidden': 'true',
    focusable: 'false',
  }, [
    svgEl('g', { transform: `rotate(${angle} 20 20)` }, [
      svgEl('path', { d: 'M6 20 H34' }),
      svgEl('path', { d: 'M20 8 V32' }),
    ]),
  ]);
}

export default Level03;
