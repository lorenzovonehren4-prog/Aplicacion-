/**
 * levels/level-24.js — "Laberinto Lógico"
 *
 * Tipo:        Lógica + Navegación
 * Mecánica:    Un mapa abstracto de nodos. No hay personaje: sólo una posición
 *              que se mueve con los botones direccionales.
 * Interacción: ← ↑ ↓ →
 * Solución:    Arriba, Arriba, Derecha, Abajo, Derecha.
 *
 * Salirse del camino no mata ni castiga: devuelve al principio y deja el rastro
 * del intento marcado, así que cada error enseña por dónde no era. Los nodos
 * correctos brillan un poco más que el resto —muy poco—, que es lo que la
 * pista #2 del documento invita a mirar.
 */

import { LevelBase } from './level-base.js';
import { el, svgEl } from '../utils/dom.js';

const ROWS = 4;
const COLS = 4;

const START = [3, 0];
const GOAL = [2, 2];

/** El camino bueno, en orden. */
const PATH = [[3, 0], [2, 0], [1, 0], [1, 1], [2, 1], [2, 2]];
const PATH_KEYS = new Set(PATH.map(([r, c]) => `${r},${c}`));

const DIRECTIONS = {
  arriba: [-1, 0],
  abajo: [1, 0],
  izquierda: [0, -1],
  derecha: [0, 1],
};

const STYLES = `
.lv24 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: var(--sp-5);
}

.lv24__map {
  position: relative;
  width: min(320px, 76vw);
  aspect-ratio: 1;
}

.lv24__edges { position: absolute; inset: 0; }
.lv24__edge { stroke: rgba(255,255,255,0.07); stroke-width: 2; }
.lv24__trail { stroke: var(--accent); stroke-width: 5; stroke-linecap: round; opacity: 0.85; }
.lv24__ghost { stroke: rgba(239,68,68,0.35); stroke-width: 4; stroke-linecap: round; }

.lv24__node {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.5);
  transition: all var(--t-base) var(--ease);
}

/* El brillo de los nodos buenos es deliberadamente tenue: hay que buscarlo. */
.lv24__node--lit { border-color: rgba(0, 212, 255, 0.28); background: rgba(0, 212, 255, 0.05); }

.lv24__node--goal {
  border-color: var(--mystery);
  background: var(--mystery-soft);
  box-shadow: 0 0 14px rgba(124, 58, 237, 0.4);
}

.lv24__node--here {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 0 18px rgba(0, 212, 255, 0.55);
  transform: translate(-50%, -50%) scale(1.15);
}

.lv24__pad {
  display: grid;
  grid-template-columns: repeat(3, 52px);
  grid-template-rows: repeat(2, 52px);
  gap: var(--sp-2);
  justify-content: center;
}

.lv24__key {
  display: grid;
  place-items: center;
  border-radius: var(--r-sm);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text);
  transition: border-color var(--t-fast) var(--ease), background var(--t-fast) var(--ease);
}

.lv24__key:hover:not(:disabled) { border-color: var(--accent-line); background: var(--glass-bg-hover); }

.lv24__key--up { grid-column: 2; grid-row: 1; }
.lv24__key--left { grid-column: 1; grid-row: 2; }
.lv24__key--down { grid-column: 2; grid-row: 2; }
.lv24__key--right { grid-column: 3; grid-row: 2; }

.lv24__steps {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-faint);
}
`;

export class Level24 extends LevelBase {
  constructor(levelId, container, context) {
    super(levelId, container, context);
    this.position = [...START];
    this.trail = [[...START]];
    this.ghost = [];
    this.resets = 0;
  }

  init() {
    this.edges = svgEl('svg.lv24__edges', { viewBox: '0 0 100 100', 'aria-hidden': 'true' });
    const map = el('div.lv24__map', { role: 'img', 'aria-label': 'Mapa de nodos' }, [this.edges]);

    this.nodes = new Map();
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const node = el('div.lv24__node', {
          style: { left: `${pct(c, COLS)}%`, top: `${pct(r, ROWS)}%` },
        });
        if (PATH_KEYS.has(`${r},${c}`)) node.classList.add('lv24__node--lit');
        if (r === GOAL[0] && c === GOAL[1]) node.classList.add('lv24__node--goal');
        this.nodes.set(`${r},${c}`, node);
        map.append(node);
      }
    }

    this.steps = el('p.lv24__steps');

    const pad = el('div.lv24__pad', { role: 'group', 'aria-label': 'Controles de dirección' }, [
      this.buildKey('arriba', 'up', '↑'),
      this.buildKey('izquierda', 'left', '←'),
      this.buildKey('abajo', 'down', '↓'),
      this.buildKey('derecha', 'right', '→'),
    ]);

    // Las flechas del teclado hacen lo mismo que los botones.
    this.listen(document, 'keydown', (event) => {
      const map2 = {
        ArrowUp: 'arriba', ArrowDown: 'abajo',
        ArrowLeft: 'izquierda', ArrowRight: 'derecha',
      };
      const dir = map2[event.key];
      if (!dir) return;
      event.preventDefault();
      this.move(dir);
    });

    this.mount(el('style', { text: STYLES }), el('div.lv24', {}, [map, pad, this.steps]));
    this.render();
  }

  buildKey(direction, modifier, glyph) {
    const button = el('button', {
      class: `lv24__key lv24__key--${modifier}`,
      type: 'button',
      text: glyph,
      'aria-label': `Mover hacia ${direction}`,
    });
    this.listen(button, 'click', () => this.move(direction));
    return button;
  }

  move(direction) {
    if (this.solved) return;

    const [dr, dc] = DIRECTIONS[direction];
    const next = [this.position[0] + dr, this.position[1] + dc];

    if (next[0] < 0 || next[0] >= ROWS || next[1] < 0 || next[1] >= COLS) {
      this.feedback('Por ahí no hay nada.', 'error');
      return;
    }

    // El paso vale sólo si avanza por el camino correcto, en orden.
    const expected = PATH[this.trail.length];
    const onTrack = expected && expected[0] === next[0] && expected[1] === next[1];

    if (!onTrack) {
      this.ghost = [...this.trail, next];
      this.position = [...START];
      this.trail = [[...START]];
      this.resets += 1;
      this.feedback('Ese nodo era una trampa. Vuelves al principio.', 'error');
      this.render();
      return;
    }

    this.position = next;
    this.trail.push(next);
    this.feedback('');
    this.render();

    if (next[0] === GOAL[0] && next[1] === GOAL[1]) this.attempt(this.trail.length - 1);
  }

  render() {
    for (const [key, node] of this.nodes) {
      node.classList.toggle('lv24__node--here', key === `${this.position[0]},${this.position[1]}`);
    }

    this.edges.replaceChildren();

    // Rejilla de aristas: comunica qué movimientos son posibles.
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (c < COLS - 1) this.edges.append(line(r, c, r, c + 1, 'lv24__edge'));
        if (r < ROWS - 1) this.edges.append(line(r, c, r + 1, c, 'lv24__edge'));
      }
    }

    // Rastro del intento fallido, y encima el recorrido actual.
    for (let i = 1; i < this.ghost.length; i += 1) {
      this.edges.append(line(...this.ghost[i - 1], ...this.ghost[i], 'lv24__ghost'));
    }
    for (let i = 1; i < this.trail.length; i += 1) {
      this.edges.append(line(...this.trail[i - 1], ...this.trail[i], 'lv24__trail'));
    }

    this.steps.textContent = this.resets
      ? `Pasos dados: ${this.trail.length - 1} · Vueltas al principio: ${this.resets}`
      : `Pasos dados: ${this.trail.length - 1}`;
  }

  validate(solution) {
    return Number(solution) === PATH.length - 1
      && this.position[0] === GOAL[0] && this.position[1] === GOAL[1];
  }

  onSolved() {
    this.solved = true;
    this.ghost = [];
    this.render();
  }

  getPrompt() {
    return 'Llega al nodo morado. Un paso en falso te devuelve al principio.';
  }

  getHints() {
    return [
      'Algunos caminos son trampas: no todos los nodos llevan a alguna parte.',
      'Sigue los nodos que brillan, aunque brillen muy poco.',
      'Arriba, arriba, derecha, abajo, derecha.',
    ];
  }

  getState() {
    return { position: this.position, steps: this.trail.length - 1 };
  }

  getType() {
    return 'logica-navegacion';
  }
}

/** Centro de un nodo en porcentaje del mapa. */
const pct = (index, total) => ((index + 0.5) / total) * 100;

function line(r1, c1, r2, c2, className) {
  return svgEl('line', {
    x1: pct(c1, COLS), y1: pct(r1, ROWS),
    x2: pct(c2, COLS), y2: pct(r2, ROWS),
    class: className,
  });
}

export default Level24;
