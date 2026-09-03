/**
 * levels/level-14.js — "Mueve una Pieza"
 *
 * Tipo:        Espacial + Interacción
 * Mecánica:    Una figura de siete piezas y, al lado, el plano de la figura
 *              objetivo. Sobra una pieza en un sitio y falta en otro.
 * Interacción: Arrastrar una pieza a una celda vacía (o pulsarla y pulsar el
 *              destino).
 * Solución:    Mover la pieza de arriba a la derecha al hueco de abajo.
 *
 * El plano objetivo se muestra aparte y no superpuesto: superponerlo señalaría
 * el hueco con el dedo y no quedaría nada que resolver. Separados, el jugador
 * tiene que comparar — que es justo lo que pide la pista #2 del documento,
 * "mira los huecos, no las piezas".
 */

import { LevelBase } from './level-base.js';
import { el } from '../utils/dom.js';
import { setEquals } from '../systems/validation.js';

const ROWS = 4;
const COLS = 3;

const cellKey = (r, c) => `${r},${c}`;

/** Figura de partida: la pieza sobrante está arriba a la derecha. */
const START = [[0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 1], [3, 1]];

/** Figura objetivo: esa pieza debería estar abajo a la derecha. */
const TARGET = [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1], [3, 1], [3, 2]];

const STYLES = `
.lv14 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--sp-5);
}

.lv14__row {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: clamp(var(--sp-5), 8vw, var(--sp-8));
  flex-wrap: wrap;
}

.lv14__panel { display: flex; flex-direction: column; align-items: center; gap: var(--sp-3); }

.lv14__caption {
  font-size: 0.64rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.lv14__grid {
  display: grid;
  grid-template-columns: repeat(${COLS}, 1fr);
  gap: 6px;
  touch-action: none;
}

.lv14__cell {
  width: clamp(44px, 12vw, 62px);
  aspect-ratio: 1;
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.07);
  background: transparent;
  transition: border-color var(--t-base) var(--ease), background var(--t-base) var(--ease);
}

.lv14__cell--drop { border-color: var(--accent-line); background: var(--accent-soft); }

/* Pieza: cuadrado sólido. Se distingue del hueco de un vistazo. */
.lv14__piece {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  border: 1px solid rgba(0, 212, 255, 0.35);
  background: linear-gradient(150deg, rgba(0,212,255,0.22), rgba(124,58,237,0.16));
  cursor: grab;
  transition: transform var(--t-fast) var(--ease), box-shadow var(--t-base) var(--ease);
}

.lv14__piece:hover:not(:disabled) { transform: scale(1.06); box-shadow: var(--shadow-glow); }
.lv14__piece--selected { box-shadow: 0 0 0 2px var(--accent); }
.lv14__piece--dragging { opacity: 0.25; }

.lv14__ghost {
  position: fixed;
  z-index: 200;
  pointer-events: none;
  border-radius: 8px;
  box-shadow: var(--shadow-glow);
  transform: scale(1.1);
}

/* El plano objetivo es sólo referencia: ni se toca ni invita a tocarlo. */
.lv14__blueprint .lv14__cell { width: clamp(26px, 7vw, 36px); }

.lv14__blueprint .lv14__piece {
  border-style: dashed;
  border-color: rgba(124, 58, 237, 0.5);
  background: rgba(124, 58, 237, 0.12);
  cursor: default;
}

.lv14__moves {
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--text-faint);
}
`;

export class Level14 extends LevelBase {
  constructor(levelId, container, context) {
    super(levelId, container, context);
    this.occupied = new Set(START.map(([r, c]) => cellKey(r, c)));
    this.moves = 0;
    this.selected = null;
  }

  init() {
    this.board = this.buildGrid();
    this.movesLabel = el('p.lv14__moves', { text: 'Movimientos: 0' });

    this.mount(el('style', { text: STYLES }), el('div.lv14', {}, [
      el('div.lv14__row', {}, [
        el('div.lv14__panel', {}, [
          el('span.lv14__caption', { text: 'Tu figura' }),
          this.board.root,
        ]),
        el('div.lv14__panel.lv14__blueprint', {}, [
          el('span.lv14__caption', { text: 'Objetivo' }),
          this.buildBlueprint(),
        ]),
      ]),
      this.movesLabel,
    ]));

    this.render();
  }

  buildGrid() {
    const root = el('div.lv14__grid', { role: 'grid', 'aria-label': 'Tu figura' });
    const cells = new Map();

    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const cell = el('div.lv14__cell', {
          role: 'gridcell',
          dataset: { r: String(r), c: String(c) },
        });
        this.listen(cell, 'click', () => this.onCellClick(r, c));
        cells.set(cellKey(r, c), cell);
        root.append(cell);
      }
    }

    return { root, cells };
  }

  buildBlueprint() {
    const target = new Set(TARGET.map(([r, c]) => cellKey(r, c)));
    const root = el('div.lv14__grid', { role: 'img', 'aria-label': 'Plano de la figura objetivo' });

    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const cell = el('div.lv14__cell');
        if (target.has(cellKey(r, c))) cell.append(el('div.lv14__piece'));
        root.append(cell);
      }
    }
    return root;
  }

  /* ------------------------------------------------------------------ */

  onCellClick(r, c) {
    if (this.solved || this.dragMoved) return;
    const target = cellKey(r, c);

    if (this.occupied.has(target)) {
      // Pulsar una pieza la selecciona (o la deselecciona).
      this.selected = this.selected === target ? null : target;
      this.render();
      return;
    }

    if (this.selected) this.movePiece(this.selected, target);
  }

  movePiece(from, to) {
    if (!this.occupied.has(from) || this.occupied.has(to)) return;

    this.occupied.delete(from);
    this.occupied.add(to);
    this.selected = null;
    this.moves += 1;
    this.render();

    // Se valida sola: la figura terminada es la respuesta, no hace falta pulsar
    // ningún botón para decir "ya está".
    this.attempt([...this.occupied]);
  }

  startDrag(event, from, piece) {
    if (this.solved || (event.button !== undefined && event.button !== 0)) return;
    event.preventDefault();

    const rect = piece.getBoundingClientRect();
    const ghost = piece.cloneNode(true);
    ghost.classList.add('lv14__ghost');
    Object.assign(ghost.style, {
      left: `${rect.left}px`, top: `${rect.top}px`,
      width: `${rect.width}px`, height: `${rect.height}px`,
    });
    document.body.append(ghost);
    piece.classList.add('lv14__piece--dragging');
    piece.setPointerCapture?.(event.pointerId);

    this.dragMoved = false;
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    const onMove = (moveEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return;
      this.dragMoved = true;
      ghost.style.left = `${moveEvent.clientX - offsetX}px`;
      ghost.style.top = `${moveEvent.clientY - offsetY}px`;

      const key = this.cellAt(moveEvent.clientX, moveEvent.clientY);
      for (const [k, cell] of this.board.cells) {
        cell.classList.toggle('lv14__cell--drop', k === key && !this.occupied.has(k));
      }
    };

    const onUp = (upEvent) => {
      if (upEvent.pointerId !== event.pointerId) return;
      piece.removeEventListener('pointermove', onMove);
      piece.removeEventListener('pointerup', onUp);
      piece.removeEventListener('pointercancel', onUp);
      piece.releasePointerCapture?.(event.pointerId);
      piece.classList.remove('lv14__piece--dragging');
      ghost.remove();
      for (const cell of this.board.cells.values()) cell.classList.remove('lv14__cell--drop');

      if (this.dragMoved) {
        const key = this.cellAt(upEvent.clientX, upEvent.clientY);
        if (key && !this.occupied.has(key)) this.movePiece(from, key);
        else this.render();
        setTimeout(() => { this.dragMoved = false; }, 0);
      }
    };

    piece.addEventListener('pointermove', onMove);
    piece.addEventListener('pointerup', onUp);
    piece.addEventListener('pointercancel', onUp);
  }

  cellAt(x, y) {
    for (const [key, cell] of this.board.cells) {
      const rect = cell.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return key;
    }
    return null;
  }

  render() {
    for (const [key, cell] of this.board.cells) {
      cell.replaceChildren();

      if (!this.occupied.has(key)) {
        cell.setAttribute('aria-label', 'Celda vacía');
        continue;
      }

      const piece = el('button.lv14__piece', {
        type: 'button',
        'aria-label': this.selected === key ? 'Pieza seleccionada' : 'Pieza',
        'aria-pressed': String(this.selected === key),
        disabled: Boolean(this.solved),
      });
      if (this.selected === key) piece.classList.add('lv14__piece--selected');

      this.listen(piece, 'pointerdown', (event) => this.startDrag(event, key, piece));
      cell.append(piece);
    }

    this.movesLabel.textContent = `Movimientos: ${this.moves}`;
  }

  validate(solution) {
    return setEquals(solution, TARGET.map(([r, c]) => cellKey(r, c)));
  }

  onSolved() {
    this.solved = true;
    this.selected = null;
    this.render();
  }

  getPrompt() {
    return 'Con un solo movimiento, tu figura puede quedar igual que el plano.';
  }

  getHints() {
    return [
      'Sólo necesitas mover una pieza.',
      'Mira los huecos, no las piezas: ¿dónde le falta algo al plano y dónde te sobra a ti?',
      'La pieza de arriba a la derecha va abajo a la derecha, junto a la última.',
    ];
  }

  getState() {
    return { occupied: [...this.occupied], moves: this.moves };
  }

  setState(state) {
    if (Array.isArray(state?.occupied)) this.occupied = new Set(state.occupied);
  }

  getType() {
    return 'espacial';
  }
}

export default Level14;
