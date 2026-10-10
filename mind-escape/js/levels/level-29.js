/**
 * levels/level-29.js — "Los Cuatro Códigos"
 *
 * Tipo:        Combinación
 * Mecánica:    La pantalla se parte en cuatro mini-puzzles independientes. Cada
 *              uno resuelto entrega un dígito.
 * Interacción: Resolver los cuatro; el código se arma solo.
 * Solución:    3 · 2 · 5 · 1  →  3251
 *
 * Cuando los cuatro dígitos están en pantalla, el nivel se da por resuelto sin
 * pedir que se reescriban en un teclado: copiar cuatro números que ya se ven no
 * es un puzzle, es un trámite. El orden es el que fija el documento maestro:
 * arriba-izquierda, arriba-derecha, abajo-izquierda, abajo-derecha.
 */

import { LevelBase } from './level-base.js';
import { el, svgEl } from '../utils/dom.js';

const PUZZLES = [
  {
    kind: 'sequence',
    title: 'Secuencia',
    sequence: '9 · 7 · 5 · ?',
    options: ['2', '3', '4'],
    answer: '3',
    digit: 3,
  },
  {
    kind: 'symbols',
    title: 'Repetida',
    question: '¿En qué posición está la primera de las dos figuras iguales?',
    // Las figuras 2 y 4 son la misma; la primera está en la posición 2.
    symbols: ['triangulo', 'circulo', 'cuadrado', 'circulo', 'rombo', 'triangulo'],
    options: ['1', '2', '3', '4', '5', '6'],
    answer: '2',
    digit: 2,
  },
  {
    kind: 'plain',
    title: 'Impar',
    question: 'De estos tres números, sólo uno es impar.',
    options: ['2', '5', '8'],
    answer: '5',
    digit: 5,
  },
  {
    kind: 'arrows',
    title: 'Giro',
    question: 'La flecha gira un cuarto de vuelta cada paso. ¿Cuál sigue?',
    arrows: [0, 90, 180],
    // Continúa en 270°; es la opción 1.
    arrowOptions: [270, 0, 90, 180],
    options: ['1', '2', '3', '4'],
    answer: '1',
    digit: 1,
  },
];

const CODE = PUZZLES.map((p) => p.digit).join('');

const STYLES = `
.lv29 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--sp-4);
}

.lv29__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-3);
}

.lv29__panel {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-4);
  border-radius: var(--r-md);
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.24);
  transition: border-color var(--t-base) var(--ease), background var(--t-base) var(--ease);
}

.lv29__panel--done { border-color: rgba(34,197,94,0.45); background: var(--success-soft); }

.lv29__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
}

.lv29__title {
  font-size: 0.64rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.lv29__digit {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: var(--r-sm);
  border: 1px dashed var(--glass-border);
  font-family: var(--font-mono);
  font-size: 0.95rem;
  color: var(--text-faint);
}

.lv29__panel--done .lv29__digit {
  border-style: solid;
  border-color: rgba(34,197,94,0.5);
  color: var(--success);
}

.lv29__question { font-size: 0.85rem; line-height: 1.4; color: var(--text-dim); }

.lv29__sequence {
  font-family: var(--font-mono);
  font-size: 1.2rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--text);
}

.lv29__symbols, .lv29__arrows { display: flex; gap: var(--sp-2); flex-wrap: wrap; }
.lv29__symbols svg, .lv29__arrows svg { width: 26px; height: 26px; }

.lv29__options { display: flex; gap: var(--sp-2); flex-wrap: wrap; margin-top: auto; }

.lv29__option {
  min-width: 44px;
  min-height: 44px;
  padding: 0 var(--sp-2);
  border-radius: var(--r-sm);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--text);
  transition: border-color var(--t-fast) var(--ease), background var(--t-fast) var(--ease);
}

.lv29__option:hover:not(:disabled) { border-color: var(--accent-line); background: var(--glass-bg-hover); }
.lv29__option--wrong { animation: error-shake 0.35s var(--ease); border-color: rgba(239,68,68,0.5); }

.lv29__code {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
}

.lv29__code-slot {
  display: grid;
  place-items: center;
  width: 44px;
  height: 54px;
  border-radius: var(--r-sm);
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.3);
  font-family: var(--font-mono);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-faint);
  transition: color var(--t-base) var(--ease), border-color var(--t-base) var(--ease);
}

.lv29__code-slot--on { color: var(--accent); border-color: var(--accent-line); }

@media (max-width: 620px) {
  .lv29__grid { grid-template-columns: 1fr; }
}
`;

export class Level29 extends LevelBase {
  constructor(levelId, container, context) {
    super(levelId, container, context);
    this.solvedPanels = new Array(PUZZLES.length).fill(false);
  }

  init() {
    this.panels = PUZZLES.map((puzzle, index) => this.buildPanel(puzzle, index));

    this.codeSlots = PUZZLES.map(() => el('div.lv29__code-slot', { text: '·' }));

    this.mount(el('style', { text: STYLES }), el('div.lv29', {}, [
      el('div.lv29__grid', {}, this.panels.map((p) => p.root)),
      el('div.lv29__code', { role: 'status', 'aria-live': 'polite' }, this.codeSlots),
    ]));
  }

  buildPanel(puzzle, index) {
    const digitBox = el('span.lv29__digit', { text: '?' });

    // Cada tipo de mini-puzzle pinta su propio cuerpo.
    const bodyByKind = {
      sequence: () => [el('p.lv29__sequence', { text: puzzle.sequence })],
      plain: () => [el('p.lv29__question', { text: puzzle.question })],
      symbols: () => [
        el('p.lv29__question', { text: puzzle.question }),
        el('div.lv29__symbols', { 'aria-hidden': 'true' },
          puzzle.symbols.map((shape) => shapeIcon(shape))),
      ],
      arrows: () => [
        el('p.lv29__question', { text: puzzle.question }),
        el('div.lv29__arrows', { 'aria-hidden': 'true' },
          [...puzzle.arrows.map((deg) => arrowIcon(deg)), el('span', { text: '?' })]),
        el('div.lv29__arrows', { 'aria-hidden': 'true' },
          puzzle.arrowOptions.map((deg) => arrowIcon(deg))),
      ],
    };

    const body = bodyByKind[puzzle.kind]();

    const optionNodes = puzzle.options.map((value) => {
      const button = el('button.lv29__option', {
        type: 'button', text: value,
        'aria-label': `${puzzle.title}: responder ${value}`,
      });
      this.listen(button, 'click', () => this.answer(index, value, button));
      return button;
    });

    const root = el('div.lv29__panel', {}, [
      el('div.lv29__head', {}, [
        el('span.lv29__title', { text: puzzle.title }),
        digitBox,
      ]),
      ...body,
      el('div.lv29__options', {}, optionNodes),
    ]);

    return { root, digitBox, optionNodes };
  }

  answer(index, value, button) {
    if (this.solved || this.solvedPanels[index]) return;

    if (value !== PUZZLES[index].answer) {
      button.classList.add('lv29__option--wrong');
      setTimeout(() => button.classList.remove('lv29__option--wrong'), 380);
      this.feedback('Ese mini-puzzle sigue sin resolverse.', 'error');
      return;
    }

    this.solvedPanels[index] = true;

    const panel = this.panels[index];
    panel.root.classList.add('lv29__panel--done');
    panel.digitBox.textContent = String(PUZZLES[index].digit);
    for (const node of panel.optionNodes) node.disabled = true;

    this.codeSlots[index].textContent = String(PUZZLES[index].digit);
    this.codeSlots[index].classList.add('lv29__code-slot--on');
    this.feedback('');

    if (this.solvedPanels.every(Boolean)) {
      this.attempt(PUZZLES.map((p) => p.digit).join(''));
    }
  }

  validate(solution) {
    return String(solution) === CODE;
  }

  onSolved() {
    this.solved = true;
  }

  getPrompt() {
    return 'Cuatro puzzles pequeños. Cada uno te da un dígito; juntos, el código.';
  }

  getHints() {
    return [
      'Resuélvelos por separado: no tienen nada que ver entre sí.',
      'Cada panel entrega un dígito, y el orden es arriba-izquierda, arriba-derecha, abajo-izquierda, abajo-derecha.',
      `El código es ${CODE}.`,
    ];
  }

  getState() {
    return { code: CODE, solvedPanels: [...this.solvedPanels] };
  }

  getType() {
    return 'combinacion';
  }
}

function shapeIcon(shape) {
  const draw = {
    circulo: () => svgEl('circle', { cx: 20, cy: 20, r: 14, fill: 'hsl(190 70% 65%)' }),
    cuadrado: () => svgEl('rect', { x: 6, y: 6, width: 28, height: 28, rx: 3, fill: 'hsl(190 70% 65%)' }),
    triangulo: () => svgEl('path', { d: 'M20 5 L36 33 H4 Z', fill: 'hsl(190 70% 65%)' }),
    rombo: () => svgEl('path', { d: 'M20 4 L36 20 L20 36 L4 20 Z', fill: 'hsl(190 70% 65%)' }),
  };
  return svgEl('svg', { viewBox: '0 0 40 40' }, [draw[shape]()]);
}

function arrowIcon(degrees) {
  return svgEl('svg', { viewBox: '0 0 40 40' }, [
    svgEl('g', { transform: `rotate(${degrees} 20 20)` }, [
      svgEl('path', {
        d: 'M20 6 V32 M12 14 L20 6 L28 14',
        fill: 'none',
        stroke: 'hsl(190 70% 65%)',
        'stroke-width': 3,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }),
    ]),
  ]);
}

export default Level29;
