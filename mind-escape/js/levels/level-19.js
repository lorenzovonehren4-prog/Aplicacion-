/**
 * levels/level-19.js — "Pesos"
 *
 * Tipo:        Lógica + Matemática
 * Mecánica:    Cinco objetos y cuatro relaciones de peso entre ellos.
 * Interacción: Arrastrar para ordenarlos de más pesado a más ligero (o mover
 *              con las flechas del teclado).
 *
 * Relaciones del documento maestro: A > B, B > C, C = D, y E menor que B pero
 * mayor que C. De ahí sale A > B > E > C = D.
 *
 * C y D pesan lo mismo, así que las dos últimas posiciones son intercambiables:
 * se aceptan A-B-E-C-D y A-B-E-D-C. Exigir un orden concreto entre dos objetos
 * que el propio enunciado declara iguales sería incoherente.
 */

import { LevelBase } from './level-base.js';
import { el } from '../utils/dom.js';
import { createSortable } from './shared/sortable.js';

/** Orden de partida: incumple tres de las cuatro relaciones. */
const INITIAL_ORDER = ['C', 'E', 'D', 'A', 'B'];

const ITEMS = INITIAL_ORDER.map((id) => ({ id, label: id }));

const RULES = [
  { text: 'A pesa más que B.', test: (p) => p.A < p.B },
  { text: 'B pesa más que C.', test: (p) => p.B < p.C },
  { text: 'C y D pesan lo mismo.', test: (p) => Math.abs(p.C - p.D) === 1 },
  { text: 'E pesa menos que B, pero más que C.', test: (p) => p.E > p.B && p.E < p.C },
];

const STYLES = `
.lv19 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--sp-5);
}

.lv19__rules {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  width: min(380px, 100%);
  margin: 0 auto;
  padding: var(--sp-4) var(--sp-5);
  border-radius: var(--r-md);
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.22);
  list-style: none;
}

.lv19__rule {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  font-size: 0.9rem;
  color: var(--text-dim);
  transition: color var(--t-base) var(--ease);
}

.lv19__mark {
  flex: none;
  width: 16px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--text-faint);
  transition: color var(--t-base) var(--ease);
}

.lv19__rule--met { color: var(--text); }
.lv19__rule--met .lv19__mark { color: var(--success); }

.lv19__scaleline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: min(360px, 100%);
  margin: 0 auto;
  font-size: 0.62rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.lv19__actions { display: flex; justify-content: center; }
`;

export class Level19 extends LevelBase {
  init() {
    this.ruleNodes = RULES.map((rule) => el('li.lv19__rule', {}, [
      el('span.lv19__mark', { text: '·', 'aria-hidden': 'true' }),
      el('span', { text: rule.text }),
    ]));

    this.sortable = createSortable({
      items: ITEMS,
      onChange: () => this.paintRules(),
    });

    this.submitButton = el('button.btn.btn--primary', { type: 'button', text: 'Comprobar orden' });
    this.listen(this.submitButton, 'click', () => this.attempt(this.sortable.getOrder()));

    this.mount(el('style', { text: STYLES }), el('div.lv19', {}, [
      el('ul.lv19__rules', {}, this.ruleNodes),
      el('div.lv19__scaleline', {}, [
        el('span', { text: '↑ Más pesado' }),
        el('span', { text: 'Más ligero ↓' }),
      ]),
      this.sortable.element,
      el('div.lv19__actions', {}, [this.submitButton]),
    ]));

    this.paintRules();
  }

  paintRules() {
    const positions = toPositions(this.sortable.getOrder());
    RULES.forEach((rule, index) => {
      const met = rule.test(positions);
      this.ruleNodes[index].classList.toggle('lv19__rule--met', met);
      this.ruleNodes[index].querySelector('.lv19__mark').textContent = met ? '✓' : '·';
    });
  }

  validate(solution) {
    const positions = toPositions(solution);
    if (Object.keys(positions).length !== ITEMS.length) return false;
    return RULES.every((rule) => rule.test(positions));
  }

  onSolved() {
    this.solved = true;
    this.submitButton.disabled = true;
    for (const item of this.sortable.element.querySelectorAll('.sortable__item')) {
      item.disabled = true;
    }
  }

  destroy() {
    this.sortable?.destroy();
    super.destroy();
  }

  getPrompt() {
    return 'Ordena los cinco objetos del más pesado al más ligero.';
  }

  getHints() {
    return [
      'Empieza por las igualdades: dos de ellos pesan lo mismo y van juntos.',
      'C y D son inseparables, y E se cuela entre B y C.',
      'A > B > E > C = D.',
    ];
  }

  getState() {
    return { order: this.sortable ? this.sortable.getOrder() : null };
  }

  getType() {
    return 'logica-matematica';
  }
}

/** ['A','B','E','C','D'] → { A:0, B:1, E:2, C:3, D:4 } */
function toPositions(order) {
  const positions = {};
  (Array.isArray(order) ? order : []).forEach((id, index) => { positions[id] = index; });
  return positions;
}

export default Level19;
