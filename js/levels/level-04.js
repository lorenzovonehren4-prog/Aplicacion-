/**
 * levels/level-04.js — "Colores"
 *
 * Tipo:        Lógica + Secuencia
 * Mecánica:    Cuatro botones de color y tres reglas escritas que determinan
 *              un único orden posible.
 * Interacción: Pulsar los colores en el orden correcto.
 * Solución:    Azul → Verde → Rojo → Amarillo.
 *
 * Las tres reglas se eligieron para que la deducción sea forzosa, no adivinable:
 *   1. Amarillo es el último            → amarillo = 4.ª
 *   2. Verde va justo después del azul  → quedan (Azul,Verde,Rojo) o (Rojo,Azul,Verde)
 *   3. Rojo no es el primero            → sólo sobrevive Azul, Verde, Rojo
 */

import { LevelBase } from './level-base.js';
import { el } from '../utils/dom.js';
import { sequenceEquals } from '../systems/validation.js';

const COLORS = [
  { id: 'rojo', label: 'Rojo', hex: '#ef4444' },
  { id: 'azul', label: 'Azul', hex: '#3b82f6' },
  { id: 'verde', label: 'Verde', hex: '#22c55e' },
  { id: 'amarillo', label: 'Amarillo', hex: '#fbbf24' },
];

const RULES = [
  'El amarillo es el último.',
  'El verde va justo después del azul.',
  'El rojo no es el primero.',
];

const SOLUTION = ['azul', 'verde', 'rojo', 'amarillo'];

const STYLES = `
.lv04 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--sp-6);
}

.lv04__rules {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  width: min(420px, 100%);
  margin: 0 auto;
  padding: var(--sp-4) var(--sp-5);
  border-radius: var(--r-md);
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.22);
  list-style: none;
}

.lv04__rule {
  display: flex;
  gap: var(--sp-3);
  font-size: 0.92rem;
  color: var(--text-dim);
  line-height: 1.5;
}

.lv04__rule::before {
  content: '·';
  color: var(--mystery);
  font-weight: 700;
}

/* Ranuras que se van rellenando: el jugador ve su propia deducción tomar forma. */
.lv04__slots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
}

.lv04__slot {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 1px dashed var(--glass-border);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-faint);
  transition: border-color var(--t-base) var(--ease), background var(--t-base) var(--ease);
}

.lv04__slot--filled { border-style: solid; border-color: transparent; }

.lv04__buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--sp-4);
}

.lv04__color {
  width: 74px;
  height: 74px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.14);
  transition: transform var(--t-fast) var(--ease),
              box-shadow var(--t-base) var(--ease),
              opacity var(--t-base) var(--ease);
}

.lv04__color:hover:not(:disabled) { transform: scale(1.08); }
.lv04__color:active:not(:disabled) { transform: scale(0.98); }

.lv04__color--used { opacity: 0.22; pointer-events: none; }

.lv04__reset { align-self: center; }

@media (max-width: 480px) {
  .lv04__color { width: 60px; height: 60px; }
  .lv04__slot { width: 42px; height: 42px; }
}
`;

export class Level04 extends LevelBase {
  constructor(levelId, container, context) {
    super(levelId, container, context);
    this.picked = [];
  }

  init() {
    const rules = el('ul.lv04__rules', {}, RULES.map((rule) => el('li.lv04__rule', { text: rule })));

    this.slots = COLORS.map((_, index) => el('div.lv04__slot', {
      text: String(index + 1),
      'aria-label': `Posición ${index + 1}: vacía`,
    }));

    const slotRow = el('div.lv04__slots', { role: 'group', 'aria-label': 'Orden elegido' }, this.slots);

    this.buttons = new Map();
    const buttonRow = el('div.lv04__buttons', {}, COLORS.map((color) => {
      const button = el('button.lv04__color', {
        type: 'button',
        'aria-label': color.label,
        style: { background: color.hex, boxShadow: `0 0 24px ${color.hex}44` },
      });
      this.listen(button, 'click', () => this.pick(color));
      this.buttons.set(color.id, button);
      return button;
    }));

    this.resetButton = el('button.btn.btn--ghost.lv04__reset', {
      type: 'button',
      text: 'Empezar de nuevo',
      hidden: true,
    });
    this.listen(this.resetButton, 'click', () => this.reset());

    this.mount(
      el('style', { text: STYLES }),
      el('div.lv04', {}, [rules, slotRow, buttonRow, this.resetButton]),
    );
  }

  pick(color) {
    if (this.picked.length >= COLORS.length) return;

    this.picked.push(color.id);
    const slot = this.slots[this.picked.length - 1];
    slot.classList.add('lv04__slot--filled');
    slot.textContent = '';
    slot.style.background = color.hex;
    slot.setAttribute('aria-label', `Posición ${this.picked.length}: ${color.label}`);

    this.buttons.get(color.id).classList.add('lv04__color--used');
    this.resetButton.hidden = false;

    if (this.picked.length === COLORS.length) {
      // Se valida sola al completar los cuatro: no hace falta un botón "enviar"
      // para una respuesta que ya está entera en pantalla.
      const correct = this.attempt([...this.picked]);
      if (!correct) setTimeout(() => this.reset(), 700);
    }
  }

  reset() {
    this.picked = [];
    this.resetButton.hidden = true;

    this.slots.forEach((slot, index) => {
      slot.classList.remove('lv04__slot--filled');
      slot.style.background = '';
      slot.textContent = String(index + 1);
      slot.setAttribute('aria-label', `Posición ${index + 1}: vacía`);
    });

    for (const button of this.buttons.values()) button.classList.remove('lv04__color--used');
  }

  validate(solution) {
    return sequenceEquals(solution, SOLUTION);
  }

  onSolved() {
    this.resetButton.hidden = true;
    for (const button of this.buttons.values()) button.disabled = true;
  }

  getPrompt() {
    return 'Las tres reglas sólo permiten un orden. Pulsa los colores en él.';
  }

  getHints() {
    return [
      'Lee todas las reglas antes de tocar nada.',
      'Empieza por la regla que fija una posición exacta: el amarillo es el último.',
      'Azul → Verde → Rojo → Amarillo.',
    ];
  }

  getState() {
    return { picked: [...this.picked] };
  }

  setState(state) {
    if (Array.isArray(state?.picked)) this.picked = [...state.picked];
  }

  getType() {
    return 'logica-secuencia';
  }
}

export default Level04;
