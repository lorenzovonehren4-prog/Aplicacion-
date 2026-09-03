/**
 * levels/level-20.js — "Cinco Puertas"
 *
 * Tipo:        Lógica pura
 * Mecánica:    Cinco puertas con una afirmación cada una. Sólo una afirmación
 *              es verdadera, y esa puerta es la salida.
 * Interacción: Clic en la puerta elegida.
 * Solución:    Puerta 4
 *
 * A diferencia del nivel 6, aquí las afirmaciones del documento maestro SÍ
 * funcionan tal cual. Comprobado suponiendo cada puerta como salida y contando
 * cuántas afirmaciones quedan verdaderas:
 *
 *   salida = 1 → 2 verdaderas (la 4 y la 5)
 *   salida = 2 → 3 verdaderas (la 1, la 2 y la 4)
 *   salida = 3 → 3 verdaderas (la 2, la 3 y la 4)
 *   salida = 4 → 1 verdadera  (sólo la 2)   ✓
 *   salida = 5 → 2 verdaderas (la 2 y la 4)
 *
 * Solución única. El nivel cierra el bloque central con lógica pura: nada que
 * arrastrar ni que observar, sólo razonar.
 */

import { LevelBase } from './level-base.js';
import { el, svgEl } from '../utils/dom.js';

const DOORS = [
  { id: 1, statement: 'La salida está en la puerta 2.' },
  { id: 2, statement: 'La salida no está en la puerta 1.' },
  { id: 3, statement: 'La salida está aquí.' },
  { id: 4, statement: 'La salida no está aquí.' },
  { id: 5, statement: 'La salida está en la puerta 1.' },
];

const SOLUTION = 4;

/** Puerta que lleva fuera. La usan los meta-puzzles 27 y 30. */
export const ANSWER_DOOR = SOLUTION;

const STYLES = `
.lv20 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--sp-5);
}

.lv20__premise {
  text-align: center;
  font-size: 0.82rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--mystery);
}

.lv20__doors {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.lv20__door {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  width: clamp(140px, 18vw, 178px);
  padding: var(--sp-4) var(--sp-3);
  border-radius: var(--r-md) var(--r-md) var(--r-sm) var(--r-sm);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  transition: transform var(--t-base) var(--ease),
              border-color var(--t-base) var(--ease),
              box-shadow var(--t-base) var(--ease),
              opacity var(--t-base) var(--ease);
}

.lv20__door:hover:not(:disabled) {
  transform: translateY(-5px);
  border-color: var(--accent-line);
  box-shadow: var(--shadow-glow);
}

.lv20__icon { width: 42px; height: 62px; color: hsl(190 60% 62%); flex: none; }

.lv20__number {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--accent);
}

.lv20__statement {
  font-size: 0.84rem;
  line-height: 1.45;
  color: var(--text);
  text-align: center;
  font-style: italic;
}

.lv20__door--wrong { animation: error-shake 0.4s var(--ease); border-color: rgba(239,68,68,0.5); }

.lv20__door--open {
  border-color: rgba(34,197,94,0.55);
  background: var(--success-soft);
}
.lv20__door--open .lv20__icon { color: var(--success); }

.lv20__door--dimmed { opacity: 0.25; }

@media (max-width: 760px) {
  .lv20__door { width: calc(50% - var(--sp-3)); flex-direction: row; text-align: left; }
  .lv20__statement { text-align: left; }
  .lv20__icon { width: 26px; height: 40px; }
}
`;

export class Level20 extends LevelBase {
  init() {
    this.doorNodes = new Map();

    const row = el('div.lv20__doors', {}, DOORS.map((door) => {
      const node = el('button.lv20__door', {
        type: 'button',
        'aria-label': `Puerta ${door.id}. Afirma: ${door.statement}`,
      }, [
        buildDoorIcon(),
        el('span.lv20__number', { text: `Puerta ${door.id}`, 'aria-hidden': 'true' }),
        el('p.lv20__statement', { text: `«${door.statement}»`, 'aria-hidden': 'true' }),
      ]);

      this.listen(node, 'click', () => this.onPick(door.id, node));
      this.doorNodes.set(door.id, node);
      return node;
    }));

    this.mount(el('style', { text: STYLES }), el('div.lv20', {}, [
      el('p.lv20__premise', { text: 'Sólo una de las cinco afirmaciones es verdadera' }),
      row,
    ]));
  }

  onPick(id, node) {
    if (this.attempt(id)) return;
    node.classList.add('lv20__door--wrong');
    setTimeout(() => node.classList.remove('lv20__door--wrong'), 420);
  }

  validate(solution) {
    return Number(solution) === SOLUTION;
  }

  onSolved() {
    this.solved = true;
    for (const [id, node] of this.doorNodes) {
      node.disabled = true;
      node.classList.add(id === SOLUTION ? 'lv20__door--open' : 'lv20__door--dimmed');
    }
  }

  getPrompt() {
    return 'Cinco puertas, cinco afirmaciones y una sola verdad. ¿Cuál lleva fuera?';
  }

  getHints() {
    return [
      'Sólo una dice la verdad: las otras cuatro mienten.',
      'Prueba a suponer que la salida está en cada puerta y cuenta cuántas afirmaciones quedan verdaderas. Casi siempre salen dos o tres.',
      'La puerta 4 es la única que deja una sola verdad: la de la puerta 2.',
    ];
  }

  getState() {
    return { solution: SOLUTION };
  }

  getType() {
    return 'logica-pura';
  }
}

/** Puerta con pomo. Se dibuja en SVG para que escale sin pixelarse. */
function buildDoorIcon() {
  return svgEl('svg', {
    viewBox: '0 0 40 60',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 2,
    'stroke-linejoin': 'round',
    class: 'lv20__icon',
    'aria-hidden': 'true',
  }, [
    svgEl('rect', { x: 5, y: 3, width: 30, height: 54, rx: 3 }),
    svgEl('circle', { cx: 28, cy: 31, r: 2.2, fill: 'currentColor', stroke: 'none' }),
  ]);
}

export default Level20;
