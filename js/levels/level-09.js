/**
 * levels/level-09.js — "Orden"
 *
 * Tipo:        Lógica + Ordenamiento
 * Mecánica:    Cuatro elementos y cuatro restricciones.
 * Interacción: Arrastrar para ordenar (o mover con las flechas del teclado).
 *
 * Restricciones del documento maestro:
 *   · A está antes que B      · C está después de A
 *   · D no puede ser primero  · B no puede ser último
 *
 * NOTA: esas reglas admiten cuatro órdenes válidos (ABCD, ABDC, ACBD, ADBC),
 * no uno solo. El documento ya lo contempla —"A → C → B → D (o variante
 * válida)"— así que se valida contra las restricciones, no contra una
 * secuencia concreta. Es lo correcto además de lo fiel: castigar a quien
 * encuentra otra ordenación que cumple todo sería mentirle.
 */

import { LevelBase } from './level-base.js';
import { el } from '../utils/dom.js';
import { createSortable } from './shared/sortable.js';

/**
 * Orden inicial. NO es alfabético a propósito: A → B → C → D ya cumple las
 * cuatro reglas, así que arrancar así regalaría el nivel —bastaría con pulsar
 * "comprobar" sin mover nada—. Este reparto incumple dos reglas de salida
 * (A no está antes que B, y D está primero) y obliga a reordenar de verdad.
 */
const INITIAL_ORDER = ['D', 'B', 'A', 'C'];

const ITEMS = INITIAL_ORDER.map((id) => ({ id, label: id }));

const RULES = [
  { text: 'A está antes que B.', test: (p) => p.A < p.B },
  { text: 'C está después de A.', test: (p) => p.C > p.A },
  { text: 'D no puede estar primero.', test: (p) => p.D !== 0 },
  { text: 'B no puede estar último.', test: (p) => p.B !== 3 },
];

const STYLES = `
.lv09 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--sp-5);
}

.lv09__rules {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  width: min(360px, 100%);
  margin: 0 auto;
  padding: var(--sp-4) var(--sp-5);
  border-radius: var(--r-md);
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.22);
  list-style: none;
}

.lv09__rule {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  font-size: 0.9rem;
  color: var(--text-dim);
  transition: color var(--t-base) var(--ease);
}

/* Marca viva por regla: el jugador ve cuáles ya cumple mientras arrastra.
   Sin esto, ordenar cuatro fichas a ciegas es prueba y error, no deducción. */
.lv09__mark {
  flex: none;
  width: 16px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--text-faint);
  transition: color var(--t-base) var(--ease);
}

.lv09__rule--met { color: var(--text); }
.lv09__rule--met .lv09__mark { color: var(--success); }

.lv09__actions { display: flex; justify-content: center; }
`;

export class Level09 extends LevelBase {
  init() {
    this.ruleNodes = RULES.map((rule) => el('li.lv09__rule', {}, [
      el('span.lv09__mark', { text: '·', 'aria-hidden': 'true' }),
      el('span', { text: rule.text }),
    ]));

    const rules = el('ul.lv09__rules', {}, this.ruleNodes);

    this.sortable = createSortable({
      items: ITEMS,
      onChange: () => this.paintRules(),
    });

    this.submitButton = el('button.btn.btn--primary', {
      type: 'button',
      text: 'Comprobar orden',
    });
    this.listen(this.submitButton, 'click', () => this.attempt(this.sortable.getOrder()));

    this.mount(
      el('style', { text: STYLES }),
      el('div.lv09', {}, [
        rules,
        this.sortable.element,
        el('div.lv09__actions', {}, [this.submitButton]),
      ]),
    );

    this.paintRules();
  }

  /** Refleja en la lista de reglas cuáles cumple el orden actual. */
  paintRules() {
    const positions = toPositions(this.sortable.getOrder());
    RULES.forEach((rule, index) => {
      const met = rule.test(positions);
      const node = this.ruleNodes[index];
      node.classList.toggle('lv09__rule--met', met);
      node.querySelector('.lv09__mark').textContent = met ? '✓' : '·';
    });
  }

  validate(solution) {
    const positions = toPositions(solution);
    return RULES.every((rule) => rule.test(positions));
  }

  onSolved() {
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
    return 'Ordena las cuatro fichas para que se cumplan las cuatro reglas a la vez.';
  }

  getHints() {
    return [
      'Dibuja las restricciones antes de mover nada.',
      'A tiene que ir antes que B y antes que C, así que A sólo puede ocupar un sitio.',
      'A → C → B → D cumple las cuatro (y no es el único orden válido).',
    ];
  }

  getState() {
    return { order: this.sortable ? this.sortable.getOrder() : null };
  }

  getType() {
    return 'logica-ordenamiento';
  }
}

/** ['A','C','B','D'] → { A:0, C:1, B:2, D:3 } */
function toPositions(order) {
  const positions = {};
  (Array.isArray(order) ? order : []).forEach((id, index) => { positions[id] = index; });
  return positions;
}

export default Level09;
