/**
 * levels/level-21.js — "Secuencia Compleja"
 *
 * Tipo:        Patrón multivariable
 * Mecánica:    Cuatro tarjetas con tres propiedades cada una —color, número y
 *              forma—. Cada propiedad sigue su propia regla, a la vez.
 * Interacción: Elegir la quinta tarjeta entre cuatro opciones.
 * Solución:    Roja, 9, círculo.
 *
 * Los tres señuelos fallan cada uno en una sola propiedad. Así el nivel no se
 * resuelve por intuición: hay que haber deducido las tres reglas, porque
 * cualquiera que se te escape te deja un señuelo que parece correcto.
 */

import { LevelBase } from './level-base.js';
import { el, svgEl } from '../utils/dom.js';

const COLORS = ['#ef4444', '#38bdf8', '#22c55e', '#fbbf24'];
const SHAPES = ['circulo', 'cuadrado', 'triangulo', 'rombo'];
const COLOR_NAMES = ['rojo', 'azul', 'verde', 'amarillo'];

/** La secuencia visible: color cicla, número +2, forma cicla. */
const SEQUENCE = [0, 1, 2, 3].map((i) => ({
  color: i % 4,
  number: 1 + i * 2,
  shape: i % 4,
}));

/** La quinta tarjeta: vuelve a rojo y a círculo, y el número sigue subiendo. */
const ANSWER = { color: 0, number: 9, shape: 0 };

const OPTIONS = [
  { ...ANSWER, color: 1 },   // falla el color
  { ...ANSWER },             // correcta
  { ...ANSWER, number: 11 }, // falla el número
  { ...ANSWER, shape: 1 },   // falla la forma
];

const CORRECT_INDEX = 1;

const STYLES = `
.lv21 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--sp-6);
}

.lv21__row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.lv21__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  width: clamp(74px, 17vw, 96px);
  aspect-ratio: 3 / 4;
  border-radius: var(--r-md);
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.3);
  animation: rise-in 0.4s var(--ease) both;
}

.lv21__card svg { width: 42%; height: auto; }

.lv21__num {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
}

.lv21__unknown {
  border-style: dashed;
  border-color: var(--accent-line);
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 1.8rem;
  font-weight: 600;
}

.lv21__caption {
  text-align: center;
  font-size: 0.66rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-faint);
  margin-bottom: var(--sp-3);
}

.lv21__option {
  cursor: pointer;
  transition: transform var(--t-base) var(--ease),
              border-color var(--t-base) var(--ease),
              box-shadow var(--t-base) var(--ease),
              opacity var(--t-base) var(--ease);
}

.lv21__option:hover:not(:disabled) {
  transform: translateY(-5px);
  border-color: var(--accent-line);
  box-shadow: var(--shadow-glow);
}

.lv21__option--wrong { animation: error-shake 0.4s var(--ease); border-color: rgba(239,68,68,0.5); }
.lv21__option--found { border-color: rgba(34,197,94,0.6); background: var(--success-soft); }
.lv21__option--dimmed { opacity: 0.2; }
`;

export class Level21 extends LevelBase {
  init() {
    const sequence = el('div.lv21__row', {}, [
      ...SEQUENCE.map((card, i) => buildCard(card, { delay: i * 0.08 })),
      el('div.lv21__card.lv21__unknown', { text: '?', 'aria-label': 'La tarjeta que falta' }),
    ]);

    this.options = OPTIONS.map((card, index) => {
      const node = buildCard(card, { option: true, index });
      this.listen(node, 'click', () => this.onPick(index, node));
      return node;
    });

    this.mount(el('style', { text: STYLES }), el('div.lv21', {}, [
      el('div', {}, [
        el('p.lv21__caption', { text: 'La secuencia' }),
        sequence,
      ]),
      el('div', {}, [
        el('p.lv21__caption', { text: '¿Cuál continúa?' }),
        el('div.lv21__row', { role: 'group', 'aria-label': 'Opciones' }, this.options),
      ]),
    ]));
  }

  onPick(index, node) {
    if (this.attempt(index)) return;
    node.classList.add('lv21__option--wrong');
    setTimeout(() => node.classList.remove('lv21__option--wrong'), 420);
  }

  validate(solution) {
    return Number(solution) === CORRECT_INDEX;
  }

  onSolved() {
    this.solved = true;
    this.options.forEach((node, index) => {
      node.disabled = true;
      node.classList.add(index === CORRECT_INDEX ? 'lv21__option--found' : 'lv21__option--dimmed');
    });
  }

  getPrompt() {
    return 'Color, número y forma: cada uno sigue su propia regla, todas a la vez.';
  }

  getHints() {
    return [
      'No busques una regla: busca tres, una por propiedad.',
      'El color cicla rojo → azul → verde → amarillo → rojo. La forma cicla igual.',
      'El número sube de dos en dos: 1, 3, 5, 7 y 9. La respuesta es roja, 9 y círculo.',
    ];
  }

  getState() {
    return { correctIndex: CORRECT_INDEX };
  }

  getType() {
    return 'patron-multivariable';
  }
}

function buildCard({ color, number, shape }, { option = false, index = 0, delay = 0 } = {}) {
  const label = `${COLOR_NAMES[color]}, ${number}, ${SHAPES[shape]}`;
  const tag = option ? 'button.lv21__card.lv21__option' : 'div.lv21__card';

  return el(tag, {
    type: option ? 'button' : null,
    'aria-label': option ? `Opción ${index + 1}: ${label}` : label,
    style: { animationDelay: `${delay}s` },
  }, [
    buildShape(shape, COLORS[color]),
    el('span.lv21__num', { text: String(number), 'aria-hidden': 'true' }),
  ]);
}

function buildShape(shape, color) {
  const draw = {
    circulo: (fill) => svgEl('circle', { cx: 20, cy: 20, r: 15, fill }),
    cuadrado: (fill) => svgEl('rect', { x: 6, y: 6, width: 28, height: 28, rx: 3, fill }),
    triangulo: (fill) => svgEl('path', { d: 'M20 5 L36 33 H4 Z', fill }),
    rombo: (fill) => svgEl('path', { d: 'M20 4 L36 20 L20 36 L4 20 Z', fill }),
  };

  return svgEl('svg', { viewBox: '0 0 40 40', 'aria-hidden': 'true' }, [
    draw[SHAPES[shape]](color),
  ]);
}

export default Level21;
