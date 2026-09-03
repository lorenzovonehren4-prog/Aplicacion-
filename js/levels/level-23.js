/**
 * levels/level-23.js — "El Mensaje Escondido"
 *
 * Tipo:        Código + pensamiento lateral
 * Mecánica:    Una cuadrícula 5×5 de letras que parece aleatoria. Leída en
 *              espiral desde el centro hacia fuera dice algo.
 * Interacción: Pulsar las letras en ese orden para ir revelando el mensaje.
 * Solución:    CADA PUERTA ESCONDE UNA MENTE
 *
 * Una letra equivocada no borra lo escrito: sólo no avanza. Veinticinco
 * pulsaciones con castigo al primer resbalón sería crueldad, no dificultad — y
 * el nivel ya es difícil por lo que pide descubrir, no por lo que pide teclear.
 */

import { LevelBase } from './level-base.js';
import { el } from '../utils/dom.js';

const SIZE = 5;
const MESSAGE = 'CADAPUERTAESCONDEUNAMENTE';
const WORDS = ['CADA', 'PUERTA', 'ESCONDE', 'UNA', 'MENTE'];

/** Posiciones en espiral desde el centro hacia fuera. */
const SPIRAL = buildSpiral(SIZE);

/** "fila,columna" → su lugar en la espiral. */
const SPIRAL_INDEX = new Map(SPIRAL.map(([r, c], i) => [`${r},${c}`, i]));

const STYLES = `
.lv23 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: var(--sp-5);
}

.lv23__grid {
  display: grid;
  grid-template-columns: repeat(${SIZE}, 1fr);
  gap: clamp(3px, 1vw, 8px);
}

.lv23__cell {
  display: grid;
  place-items: center;
  width: clamp(44px, 12vw, 62px);
  aspect-ratio: 1;
  border-radius: var(--r-sm);
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.3);
  font-family: var(--font-mono);
  font-size: clamp(1rem, 3.4vw, 1.3rem);
  font-weight: 600;
  color: var(--text-dim);
  transition: background var(--t-fast) var(--ease),
              color var(--t-fast) var(--ease),
              border-color var(--t-fast) var(--ease);
}

.lv23__cell:hover:not(:disabled) { border-color: var(--accent-line); color: var(--text); }

.lv23__cell--used {
  color: var(--accent);
  border-color: var(--accent-line);
  background: var(--accent-soft);
}

.lv23__cell--wrong { animation: error-shake 0.35s var(--ease); }

.lv23__readout {
  min-height: 2.4em;
  max-width: 22ch;
  font-family: var(--font-mono);
  font-size: clamp(0.95rem, 3.4vw, 1.25rem);
  font-weight: 600;
  letter-spacing: 0.16em;
  color: var(--accent);
  text-align: center;
  line-height: 1.35;
}

.lv23__readout span { color: var(--text-faint); opacity: 0.35; }

.lv23__progress {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-faint);
}
`;

export class Level23 extends LevelBase {
  constructor(levelId, container, context) {
    super(levelId, container, context);
    this.typed = 0;
  }

  init() {
    // La letra i del mensaje va en la posición i de la espiral: leída en el
    // orden correcto, la cuadrícula se lee sola.
    this.letterAt = new Map();
    SPIRAL.forEach(([r, c], i) => this.letterAt.set(`${r},${c}`, MESSAGE[i]));

    const grid = el('div.lv23__grid', {
      role: 'grid',
      'aria-label': 'Cuadrícula de 5 por 5 letras',
    });

    this.cells = new Map();
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        const letter = this.letterAt.get(`${r},${c}`);
        const cell = el('button.lv23__cell', {
          type: 'button',
          role: 'gridcell',
          text: letter,
          'aria-label': `Letra ${letter}, fila ${r + 1}, columna ${c + 1}`,
        });
        this.listen(cell, 'click', () => this.onPick(r, c, cell));
        this.cells.set(`${r},${c}`, cell);
        grid.append(cell);
      }
    }

    this.readout = el('p.lv23__readout', { role: 'status', 'aria-live': 'polite' });
    this.progress = el('p.lv23__progress');

    const reset = el('button.btn.btn--ghost', { type: 'button', text: 'Empezar de nuevo' });
    this.listen(reset, 'click', () => { this.typed = 0; this.render(); });

    this.mount(el('style', { text: STYLES }), el('div.lv23', {}, [
      grid, this.readout, this.progress, reset,
    ]));

    this.render();
  }

  onPick(r, c, cell) {
    if (this.solved) return;

    const expected = SPIRAL[this.typed];
    if (expected && expected[0] === r && expected[1] === c) {
      this.typed += 1;
      this.render();
      if (this.typed === MESSAGE.length) this.attempt(MESSAGE);
      return;
    }

    // No se pierde lo escrito: sólo se avisa de que esa letra no toca.
    cell.classList.add('lv23__cell--wrong');
    setTimeout(() => cell.classList.remove('lv23__cell--wrong'), 380);
  }

  render() {
    for (const [key, cell] of this.cells) {
      cell.classList.toggle('lv23__cell--used', SPIRAL_INDEX.get(key) < this.typed);
    }

    // El texto se pinta con los espacios de las palabras reales, y lo que falta
    // queda como puntos: se ve la forma del mensaje antes de terminarlo.
    this.readout.replaceChildren();
    let position = 0;
    for (const word of WORDS) {
      const done = Math.max(0, Math.min(word.length, this.typed - position));
      if (done > 0) this.readout.append(word.slice(0, done));
      if (done < word.length) {
        this.readout.append(el('span', { text: '·'.repeat(word.length - done) }));
      }
      this.readout.append(' ');
      position += word.length;
    }

    this.progress.textContent = `${this.typed} / ${MESSAGE.length} letras`;
  }

  validate(solution) {
    return String(solution) === MESSAGE;
  }

  onSolved() {
    this.solved = true;
    for (const cell of this.cells.values()) cell.disabled = true;
    this.readout.style.color = 'var(--success)';
  }

  getPrompt() {
    return 'Veinticinco letras que no dicen nada… si las lees como se leen normalmente.';
  }

  getHints() {
    return [
      'No leas de izquierda a derecha.',
      'Piensa en espiral: empieza por el centro y ve girando hacia fuera.',
      'Primera letra: la del centro. Luego la de su derecha, y sigue girando en el sentido de las agujas del reloj.',
    ];
  }

  getState() {
    return { typed: this.typed, message: MESSAGE };
  }

  setState(state) {
    if (Number.isFinite(state?.typed)) this.typed = state.typed;
  }

  getType() {
    return 'codigo-lateral';
  }
}

/**
 * Espiral desde el centro hacia fuera: derecha 1, abajo 1, izquierda 2,
 * arriba 2, derecha 3… Se descartan las posiciones que caen fuera y se para al
 * cubrir toda la cuadrícula.
 */
function buildSpiral(size) {
  const center = Math.floor(size / 2);
  const order = [[center, center]];
  const inside = ([r, c]) => r >= 0 && r < size && c >= 0 && c < size;

  const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  let [r, c] = [center, center];
  let step = 1;
  let dir = 0;
  let guard = 0;

  while (order.length < size * size && (guard += 1) < size * size * 4) {
    // Cada dos giros el tramo se alarga: así la espiral se abre.
    for (let twice = 0; twice < 2 && order.length < size * size; twice += 1) {
      for (let i = 0; i < step; i += 1) {
        r += directions[dir][0];
        c += directions[dir][1];
        if (inside([r, c])) order.push([r, c]);
      }
      dir = (dir + 1) % 4;
    }
    step += 1;
  }

  return order;
}

export default Level23;
