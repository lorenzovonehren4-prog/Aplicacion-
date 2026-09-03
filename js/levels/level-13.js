/**
 * levels/level-13.js — "Conexiones"
 *
 * Tipo:        Espacial + Lógica
 * Mecánica:    Cuadrícula 5×5 con tres pares de puntos de color. Hay que unir
 *              cada par con un camino que no se cruce con los demás Y que entre
 *              todos cubran la cuadrícula entera.
 * Interacción: Arrastrar desde un punto (o pulsar celda a celda).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NOTA DE DISEÑO — la regla de cubrir toda la cuadrícula
 *
 * El documento sólo pide "conectar puntos del mismo color sin que se crucen".
 * Con esa única regla el nivel se resuelve solo: sobra tanto espacio que
 * cualquier rodeo vale y no hay nada que deducir.
 *
 * Se añade la regla del Flow clásico: no pueden quedar celdas vacías. Eso es lo
 * que convierte el nivel en un puzzle — los caminos cortos evidentes (los dos
 * pares de puntos adyacentes piden a gritos una línea de dos celdas) dejan
 * huecos y obligan a replantear el recorrido entero. La regla se anuncia en el
 * enunciado: nunca es una trampa.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * La solución de referencia (existe, y cubre las 25 celdas):
 *   rojo   (0,0)↓(4,0)→(4,1)↑(0,1)          10 celdas
 *   azul   (0,2)→(0,4)↓(1,4)←(1,2)↓(2,2)→(2,4)   9 celdas
 *   verde  (3,2)→(3,4)↓(4,4)←(4,2)           6 celdas
 */

import { LevelBase } from './level-base.js';
import { el, svgEl } from '../utils/dom.js';

const SIZE = 5;
const CELL = 100; // unidades del viewBox por celda

const COLORS = [
  { id: 'rojo', label: 'Rojo', hex: '#ef4444', ends: [[0, 0], [0, 1]] },
  { id: 'azul', label: 'Azul', hex: '#38bdf8', ends: [[0, 2], [2, 4]] },
  { id: 'verde', label: 'Verde', hex: '#22c55e', ends: [[3, 2], [4, 2]] },
];

const key = (r, c) => `${r},${c}`;
const areAdjacent = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;

const STYLES = `
.lv13 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--sp-4);
}

.lv13__board {
  position: relative;
  width: min(400px, 84vw);
  aspect-ratio: 1;
  margin: 0 auto;
  touch-action: none;
}

.lv13__grid {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(${SIZE}, 1fr);
  grid-template-rows: repeat(${SIZE}, 1fr);
  z-index: 2;
}

.lv13__cell {
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: transparent;
  cursor: pointer;
}

.lv13__cell:focus-visible { outline-offset: -3px; }

/* Los trazos se dibujan en un SVG por encima de la rejilla: una polilínea por
   color se ve mucho mejor que pintar cada celda por separado. */
.lv13__paint {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.lv13__line {
  fill: none;
  stroke-width: 30;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.85;
}

.lv13__endpoint { stroke: rgba(0, 0, 0, 0.35); stroke-width: 3; }

.lv13__legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-4);
  flex-wrap: wrap;
}

.lv13__chip {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: 0.78rem;
  color: var(--text-dim);
}

.lv13__dot { width: 12px; height: 12px; border-radius: 50%; flex: none; }

.lv13__chip--done { color: var(--success); }

.lv13__status {
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-faint);
}

.lv13__status b { color: var(--accent); }

.lv13__actions { display: flex; justify-content: center; gap: var(--sp-3); }
`;

export class Level13 extends LevelBase {
  constructor(levelId, container, context) {
    super(levelId, container, context);

    /** color.id → array de celdas [r,c] */
    this.paths = new Map(COLORS.map((color) => [color.id, []]));
    this.drawing = null;

    this.endpointOf = new Map();
    for (const color of COLORS) {
      for (const [r, c] of color.ends) this.endpointOf.set(key(r, c), color.id);
    }
  }

  init() {
    this.lines = new Map();
    const paint = svgEl('svg.lv13__paint', { viewBox: `0 0 ${SIZE * CELL} ${SIZE * CELL}` });

    for (const color of COLORS) {
      const line = svgEl('polyline', { class: 'lv13__line', stroke: color.hex, points: '' });
      this.lines.set(color.id, line);
      paint.append(line);
    }
    // Los puntos se dibujan encima de las líneas para que sigan viéndose.
    for (const color of COLORS) {
      for (const [r, c] of color.ends) {
        paint.append(svgEl('circle', {
          cx: c * CELL + CELL / 2,
          cy: r * CELL + CELL / 2,
          r: 26,
          fill: color.hex,
          class: 'lv13__endpoint',
        }));
      }
    }

    const grid = el('div.lv13__grid', { role: 'grid' });
    this.cells = new Map();

    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        const endpointColor = this.endpointOf.get(key(r, c));
        const cell = el('button.lv13__cell', {
          type: 'button',
          role: 'gridcell',
          dataset: { r: String(r), c: String(c) },
          'aria-label': endpointColor
            ? `Fila ${r + 1}, columna ${c + 1}. Punto ${endpointColor}.`
            : `Fila ${r + 1}, columna ${c + 1}. Vacía.`,
        });
        this.listen(cell, 'click', () => this.onCellTap(r, c));
        this.cells.set(key(r, c), cell);
        grid.append(cell);
      }
    }

    const board = el('div.lv13__board', {}, [paint, grid]);
    this.listen(board, 'pointerdown', (event) => this.onPointerDown(event));
    this.listen(board, 'pointermove', (event) => this.onPointerMove(event));
    this.listen(window, 'pointerup', () => this.endPointer());
    this.listen(window, 'pointercancel', () => this.endPointer());

    this.legend = COLORS.map((color) => el('span.lv13__chip', {
      dataset: { color: color.id },
    }, [
      el('span.lv13__dot', { style: { background: color.hex } }),
      el('span', { text: color.label }),
    ]));

    this.status = el('p.lv13__status', {}, ['Celdas cubiertas ', el('b', { text: `0 / ${SIZE * SIZE}` })]);

    const clearButton = el('button.btn.btn--ghost', { type: 'button', text: 'Borrar todo' });
    this.listen(clearButton, 'click', () => {
      for (const id of this.paths.keys()) this.paths.set(id, []);
      this.render();
    });

    this.mount(el('style', { text: STYLES }), el('div.lv13', {}, [
      el('div.lv13__legend', {}, this.legend),
      board,
      this.status,
      el('div.lv13__actions', {}, [clearButton]),
    ]));

    this.render();
  }

  /* ----------------------------- Interacción ---------------------------- */

  /** Color que ocupa una celda, si alguno. */
  ownerOf(r, c) {
    for (const [id, path] of this.paths) {
      if (path.some(([pr, pc]) => pr === r && pc === c)) return id;
    }
    return null;
  }

  /**
   * `pointerdown` NO toca el estado: sólo arma un posible arrastre. Si tocara
   * el estado, pulsar el punto de cierre reiniciaría el camino que se acaba de
   * trazar en lugar de cerrarlo — el toque se resuelve entero en `click`.
   */
  onPointerDown(event) {
    const cell = event.target.closest('.lv13__cell');
    if (!cell || this.solved) return;
    this.dragMoved = false;
    this.drawing = null;
    this.pendingStart = { r: Number(cell.dataset.r), c: Number(cell.dataset.c) };
  }

  onPointerMove(event) {
    if (!this.pendingStart) return;

    const node = document.elementFromPoint(event.clientX, event.clientY);
    const cell = node?.closest?.('.lv13__cell');
    if (!cell) return;

    const r = Number(cell.dataset.r);
    const c = Number(cell.dataset.c);

    // El arrastre empieza de verdad al salir de la celda inicial.
    if (!this.drawing) {
      if (r === this.pendingStart.r && c === this.pendingStart.c) return;
      this.drawing = this.beginAt(this.pendingStart.r, this.pendingStart.c);
      if (!this.drawing) { this.pendingStart = null; return; }
      this.activeColor = this.drawing;
    }

    if (this.extend(this.drawing, r, c)) this.dragMoved = true;
  }

  endPointer() {
    this.pendingStart = null;
    this.drawing = null;
  }

  /** Toque simple: prolonga el camino activo o empieza uno nuevo. */
  onCellTap(r, c) {
    if (this.solved) return;

    // Tras arrastrar llega un `click` sobre la última celda: ya está procesado.
    if (this.dragMoved) { this.dragMoved = false; return; }

    // Prolongar tiene prioridad sobre reiniciar: así pulsar el punto de cierre
    // termina el camino en vez de borrarlo.
    if (this.activeColor && this.extend(this.activeColor, r, c)) return;

    const started = this.beginAt(r, c);
    if (started) this.activeColor = started;
  }

  /**
   * Empieza (o retoma) un camino en la celda dada.
   * @returns {string|null} el color con el que se está dibujando
   */
  beginAt(r, c) {
    const endpointColor = this.endpointOf.get(key(r, c));

    if (endpointColor) {
      // Pulsar un punto siempre reinicia su camino desde ahí: es la vía para
      // deshacer sin tener que borrar toda la cuadrícula.
      this.paths.set(endpointColor, [[r, c]]);
      this.activeColor = endpointColor;
      this.render();
      return endpointColor;
    }

    // Pulsar una celda ya trazada recorta el camino hasta ella.
    const owner = this.ownerOf(r, c);
    if (owner) {
      const path = this.paths.get(owner);
      const index = path.findIndex(([pr, pc]) => pr === r && pc === c);
      this.paths.set(owner, path.slice(0, index + 1));
      this.activeColor = owner;
      this.render();
      return owner;
    }

    return null;
  }

  /**
   * Prolonga el camino del color activo hasta la celda dada.
   * @returns {boolean} si el camino cambió
   */
  extend(colorId, r, c) {
    const path = this.paths.get(colorId);
    if (!path.length) return false;

    const last = path[path.length - 1];
    if (last[0] === r && last[1] === c) return false;

    // Volver sobre el penúltimo paso deshace: retroceder es parte del dibujo.
    if (path.length > 1) {
      const previous = path[path.length - 2];
      if (previous[0] === r && previous[1] === c) {
        path.pop();
        this.render();
        return true;
      }
    }

    if (!areAdjacent(last, [r, c])) return false;

    // No se puede pisar otro color ni el punto de otro color.
    const owner = this.ownerOf(r, c);
    if (owner && owner !== colorId) return false;
    if (owner === colorId) return false;

    const endpointColor = this.endpointOf.get(key(r, c));
    if (endpointColor && endpointColor !== colorId) return false;

    path.push([r, c]);

    // Al tocar su segundo punto, el camino queda cerrado.
    if (endpointColor === colorId) this.activeColor = null;

    this.render();
    this.checkComplete();
    return true;
  }

  /** ¿Une el camino los dos puntos de su color? */
  isConnected(colorId) {
    const color = COLORS.find((item) => item.id === colorId);
    const path = this.paths.get(colorId);
    if (path.length < 2) return false;

    const first = path[0];
    const last = path[path.length - 1];
    const [a, b] = color.ends;
    const same = (p, q) => p[0] === q[0] && p[1] === q[1];

    return (same(first, a) && same(last, b)) || (same(first, b) && same(last, a));
  }

  coveredCount() {
    return [...this.paths.values()].reduce((total, path) => total + path.length, 0);
  }

  checkComplete() {
    const allConnected = COLORS.every((color) => this.isConnected(color.id));
    if (allConnected && this.coveredCount() === SIZE * SIZE) {
      this.attempt(this.snapshot());
    } else if (allConnected) {
      this.feedback('Los tres pares están unidos, pero quedan celdas vacías.', 'error');
    }
  }

  snapshot() {
    return Object.fromEntries([...this.paths].map(([id, path]) => [id, path.map(([r, c]) => key(r, c))]));
  }

  render() {
    for (const color of COLORS) {
      const path = this.paths.get(color.id);
      const points = path.map(([r, c]) => `${c * CELL + CELL / 2},${r * CELL + CELL / 2}`).join(' ');
      this.lines.get(color.id).setAttribute('points', points);
    }

    this.legend.forEach((chip, index) => {
      chip.classList.toggle('lv13__chip--done', this.isConnected(COLORS[index].id));
    });

    const covered = this.coveredCount();
    this.status.querySelector('b').textContent = `${covered} / ${SIZE * SIZE}`;
  }

  validate(solution) {
    if (!solution || typeof solution !== 'object') return false;

    const seen = new Set();
    for (const color of COLORS) {
      const cells = solution[color.id];
      if (!Array.isArray(cells) || cells.length < 2) return false;
      for (const cell of cells) {
        if (seen.has(cell)) return false; // dos colores en la misma celda
        seen.add(cell);
      }
      if (!this.isConnected(color.id)) return false;
    }

    return seen.size === SIZE * SIZE;
  }

  onSolved() {
    this.solved = true;
    for (const cell of this.cells.values()) cell.disabled = true;
  }

  getPrompt() {
    return 'Une cada par del mismo color sin que los caminos se crucen. No pueden quedar celdas vacías.';
  }

  getHints() {
    return [
      'Los caminos no pueden tocarse, y entre los tres tienen que llenar la cuadrícula.',
      'Los dos puntos rojos están pegados, pero el camino corto entre ellos deja media cuadrícula vacía: el rojo tiene que dar la vuelta por el borde izquierdo.',
      'Rojo: baja por la primera columna, cruza abajo y sube por la segunda. Azul: recorre en zigzag las tres columnas de la derecha en las filas 1 a 3. Verde: hace lo mismo en las dos filas de abajo.',
    ];
  }

  getState() {
    return this.snapshot();
  }

  getType() {
    return 'espacial-logica';
  }
}

export default Level13;
