/**
 * levels/level-02.js — "Secuencia"
 *
 * Tipo:        Matemática
 * Mecánica:    Secuencia visible 2 → 4 → 8 → 16 → ?
 * Interacción: Teclado numérico en pantalla.
 * Solución:    32 (cada término duplica al anterior).
 */

import { LevelBase } from './level-base.js';
import { el } from '../utils/dom.js';
import { createKeypad } from './shared/keypad.js';

const SEQUENCE = [2, 4, 8, 16];
const ANSWER = 32;

const STYLES = `
.lv02 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--sp-7);
}

.lv02__sequence {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--sp-3) var(--sp-4);
}

.lv02__term {
  display: grid;
  place-items: center;
  min-width: 68px;
  min-height: 68px;
  padding: 0 var(--sp-3);
  border-radius: var(--r-md);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  font-family: var(--font-mono);
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--text);
  animation: rise-in 0.45s var(--ease) both;
}

.lv02__term--unknown {
  border-color: var(--accent-line);
  border-style: dashed;
  color: var(--accent);
  background: var(--accent-soft);
}

.lv02__term--solved {
  border-style: solid;
  border-color: rgba(34, 197, 94, 0.5);
  background: var(--success-soft);
  color: var(--success);
}

.lv02__arrow {
  color: var(--text-faint);
  font-size: 1.1rem;
  animation: fade-in 0.45s var(--ease) both;
}

@media (max-width: 480px) {
  .lv02__term { min-width: 54px; min-height: 54px; font-size: 1.25rem; }
  .lv02 { gap: var(--sp-5); }
}
`;

export class Level02 extends LevelBase {
  init() {
    const sequence = el('div.lv02__sequence', {
      role: 'img',
      'aria-label': `Secuencia: ${SEQUENCE.join(', ')}, y un término desconocido.`,
    });

    // Los términos entran escalonados: la secuencia se "lee" sola al aparecer.
    SEQUENCE.forEach((term, index) => {
      sequence.append(el('span.lv02__term', {
        text: String(term),
        'aria-hidden': 'true',
        style: { animationDelay: `${index * 0.09}s` },
      }));
      sequence.append(el('span.lv02__arrow', {
        text: '→',
        'aria-hidden': 'true',
        style: { animationDelay: `${index * 0.09 + 0.05}s` },
      }));
    });

    this.unknown = el('span.lv02__term.lv02__term--unknown', {
      text: '?',
      'aria-hidden': 'true',
      style: { animationDelay: `${SEQUENCE.length * 0.09}s` },
    });
    sequence.append(this.unknown);

    this.keypad = createKeypad({
      maxLength: 3,
      fixedLength: false,
      onSubmit: (value) => {
        const correct = this.attempt(value);
        if (!correct) this.keypad.clear();
      },
    });

    this.mount(
      el('style', { text: STYLES }),
      el('div.lv02', {}, [sequence, this.keypad.element]),
    );
  }

  validate(solution) {
    return Number(solution) === ANSWER;
  }

  onSolved() {
    this.unknown.textContent = String(ANSWER);
    this.unknown.classList.add('lv02__term--solved');
    this.keypad.lock();
  }

  destroy() {
    this.keypad?.destroy();
    super.destroy();
  }

  getPrompt() {
    return '¿Qué número continúa la secuencia?';
  }

  getHints() {
    return [
      'Cada número está relacionado con el anterior.',
      'No sumes: multiplica.',
      '2 × 2 = 4, 4 × 2 = 8, 8 × 2 = 16… y 16 × 2 es la respuesta.',
    ];
  }

  getState() {
    return { answer: ANSWER };
  }

  getType() {
    return 'matematica';
  }
}

export default Level02;
