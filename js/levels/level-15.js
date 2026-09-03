/**
 * levels/level-15.js — "Sudoku 4×4"
 *
 * Tipo:        Matemática + Lógica
 * Mecánica:    Sudoku 4×4 (cajas de 2×2). Al completarlo, cuatro casillas en
 *              línea forman el código.
 * Interacción: Pulsar una casilla y elegir un número del 1 al 4; después,
 *              introducir el código en el teclado.
 * Solución:    La diagonal principal → 2 4 1 3
 *
 * Las pistas dadas no incluyen ninguna casilla de la diagonal: si el código
 * asomara desde el principio, resolver el Sudoku dejaría de hacer falta.
 *
 * El enunciado dice "cuatro casillas en línea" sin decir cuáles. Que sea la
 * diagonal es lo que revela la pista #2, tal como pide el documento maestro.
 */

import { LevelBase } from './level-base.js';
import { el } from '../utils/dom.js';
import { createKeypad } from './shared/keypad.js';

const SIZE = 4;
const BOX = 2;

const SOLUTION = [
  [2, 3, 4, 1],
  [1, 4, 3, 2],
  [3, 2, 1, 4],
  [4, 1, 2, 3],
];

/** Casillas dadas. Ninguna cae en la diagonal principal. */
const GIVENS = [
  [0, 1], [0, 2],
  [1, 0], [1, 3],
  [2, 0], [2, 3],
  [3, 1], [3, 2],
];

const CODE = SOLUTION.map((row, i) => row[i]).join('');

const STYLES = `
.lv15 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: var(--sp-5);
}

.lv15__grid {
  display: grid;
  grid-template-columns: repeat(${SIZE}, 1fr);
  gap: 3px;
  padding: 3px;
  border-radius: var(--r-md);
  background: rgba(255, 255, 255, 0.05);
}

.lv15__cell {
  display: grid;
  place-items: center;
  width: clamp(48px, 13vw, 66px);
  aspect-ratio: 1;
  border: 1px solid transparent;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.4);
  font-family: var(--font-mono);
  font-size: clamp(1.15rem, 4vw, 1.5rem);
  font-weight: 600;
  color: var(--accent);
  transition: background var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease);
}

/* Separación de las cajas de 2×2: sin ella el Sudoku no se lee. */
.lv15__cell[data-box-right='true'] { margin-right: 5px; }
.lv15__cell[data-box-bottom='true'] { margin-bottom: 5px; }

.lv15__cell--given { color: var(--text); background: rgba(255, 255, 255, 0.055); cursor: default; }
.lv15__cell--selected { border-color: var(--accent); background: var(--accent-soft); }
.lv15__cell--conflict { color: var(--error); }
.lv15__cell--empty { color: var(--text-faint); }

.lv15__pad { display: flex; gap: var(--sp-2); }

.lv15__num {
  width: 48px;
  height: 48px;
  border-radius: var(--r-sm);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  font-family: var(--font-mono);
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text);
  transition: border-color var(--t-fast) var(--ease), background var(--t-fast) var(--ease);
}

.lv15__num:hover:not(:disabled) { border-color: var(--accent-line); background: var(--glass-bg-hover); }

.lv15__divider {
  width: min(280px, 70%);
  height: 1px;
  border: 0;
  background: linear-gradient(90deg, transparent, var(--glass-border), transparent);
}

.lv15__solved-note {
  font-size: 0.8rem;
  color: var(--success);
  text-align: center;
}
`;

export class Level15 extends LevelBase {
  constructor(levelId, container, context) {
    super(levelId, container, context);

    this.givens = new Set(GIVENS.map(([r, c]) => `${r},${c}`));
    this.grid = SOLUTION.map((row, r) =>
      row.map((value, c) => (this.givens.has(`${r},${c}`) ? value : 0)));
    this.selected = null;
  }

  init() {
    this.cells = [];
    const grid = el('div.lv15__grid', { role: 'grid', 'aria-label': 'Sudoku de 4 por 4' });

    for (let r = 0; r < SIZE; r += 1) {
      this.cells[r] = [];
      for (let c = 0; c < SIZE; c += 1) {
        const isGiven = this.givens.has(`${r},${c}`);
        const cell = el('button.lv15__cell', {
          type: 'button',
          role: 'gridcell',
          disabled: isGiven,
          dataset: {
            r: String(r),
            c: String(c),
            boxRight: String(c % BOX === BOX - 1 && c !== SIZE - 1),
            boxBottom: String(r % BOX === BOX - 1 && r !== SIZE - 1),
          },
        });
        if (isGiven) cell.classList.add('lv15__cell--given');
        this.listen(cell, 'click', () => this.select(r, c));
        this.cells[r][c] = cell;
        grid.append(cell);
      }
    }

    this.numberPad = el('div.lv15__pad', { role: 'group', 'aria-label': 'Números' },
      [1, 2, 3, 4].map((n) => {
        const button = el('button.lv15__num', { type: 'button', text: String(n),
          'aria-label': `Escribir ${n}` });
        this.listen(button, 'click', () => this.write(n));
        return button;
      }).concat([(() => {
        const clear = el('button.lv15__num', { type: 'button', text: '⌫',
          'aria-label': 'Borrar la casilla' });
        this.listen(clear, 'click', () => this.write(0));
        return clear;
      })()]));

    this.keypad = createKeypad({
      maxLength: CODE.length,
      fixedLength: true,
      autoSubmit: true,
      onSubmit: (value) => {
        const correct = this.attempt(value);
        if (!correct) this.keypad.clear();
      },
    });

    this.note = el('p.lv15__solved-note', { hidden: true, text: 'Sudoku resuelto.' });

    // Teclado físico: escribir 1-4 rellena la casilla seleccionada.
    this.listen(document, 'keydown', (event) => {
      if (!this.selected || event.metaKey || event.ctrlKey) return;
      if (/^[1-4]$/.test(event.key)) { event.preventDefault(); this.write(Number(event.key)); }
      else if (event.key === 'Backspace' || event.key === 'Delete') { this.write(0); }
    });

    this.mount(el('style', { text: STYLES }), el('div.lv15', {}, [
      grid,
      this.numberPad,
      this.note,
      el('hr.lv15__divider'),
      this.keypad.element,
    ]));

    this.render();
  }

  select(r, c) {
    if (this.givens.has(`${r},${c}`)) return;
    this.selected = this.selected?.r === r && this.selected?.c === c ? null : { r, c };
    this.render();
  }

  write(value) {
    if (!this.selected) {
      this.feedback('Elige primero una casilla.', 'error');
      return;
    }
    const { r, c } = this.selected;
    this.grid[r][c] = value;
    this.render();
  }

  /** Casillas que repiten número en su fila, columna o caja. */
  conflicts() {
    const bad = new Set();

    const scan = (cellsList) => {
      const seen = new Map();
      for (const [r, c] of cellsList) {
        const value = this.grid[r][c];
        if (!value) continue;
        if (seen.has(value)) { bad.add(`${r},${c}`); bad.add(seen.get(value)); }
        else seen.set(value, `${r},${c}`);
      }
    };

    for (let i = 0; i < SIZE; i += 1) {
      scan(Array.from({ length: SIZE }, (_, j) => [i, j]));  // fila
      scan(Array.from({ length: SIZE }, (_, j) => [j, i]));  // columna
    }
    for (let br = 0; br < SIZE; br += BOX) {
      for (let bc = 0; bc < SIZE; bc += BOX) {
        const box = [];
        for (let r = 0; r < BOX; r += 1) for (let c = 0; c < BOX; c += 1) box.push([br + r, bc + c]);
        scan(box);
      }
    }

    return bad;
  }

  isComplete() {
    return this.grid.every((row, r) => row.every((value, c) => value === SOLUTION[r][c]));
  }

  render() {
    const bad = this.conflicts();

    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        const cell = this.cells[r][c];
        const value = this.grid[r][c];
        const isGiven = this.givens.has(`${r},${c}`);

        cell.textContent = value || '·';
        cell.classList.toggle('lv15__cell--empty', !value);
        cell.classList.toggle('lv15__cell--conflict', bad.has(`${r},${c}`));
        cell.classList.toggle('lv15__cell--selected',
          this.selected?.r === r && this.selected?.c === c);
        cell.setAttribute('aria-label',
          `Fila ${r + 1}, columna ${c + 1}: ${value || 'vacía'}${isGiven ? ', fija' : ''}`);
      }
    }

    this.note.hidden = !this.isComplete();
  }

  validate(solution) {
    return String(solution) === CODE;
  }

  onSolved() {
    this.solved = true;
    this.keypad.lock();
    for (const button of this.numberPad.querySelectorAll('button')) button.disabled = true;
    for (const row of this.cells) for (const cell of row) cell.disabled = true;
  }

  destroy() {
    this.keypad?.destroy();
    super.destroy();
  }

  getPrompt() {
    return 'Cada fila, cada columna y cada caja de 2×2 llevan los números 1 a 4. Cuatro casillas en línea forman el código.';
  }

  getHints() {
    return [
      'Completa el Sudoku primero: sin él no hay código.',
      'La diagonal esconde el código: lee de arriba-izquierda a abajo-derecha.',
      'La diagonal es 2-4-1-3.',
    ];
  }

  getState() {
    return { grid: this.grid.map((row) => [...row]) };
  }

  setState(state) {
    if (Array.isArray(state?.grid)) this.grid = state.grid.map((row) => [...row]);
  }

  getType() {
    return 'matematica-logica';
  }
}

export default Level15;
