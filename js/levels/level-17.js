/**
 * levels/level-17.js — "Criptografía"
 *
 * Tipo:        Código
 * Mecánica:    Un mensaje cifrado y una rueda de César que desplaza el alfabeto
 *              en vivo.
 * Interacción: Girar la rueda hasta que el texto tenga sentido y escribir el
 *              mensaje descifrado.
 * Solución:    "MB TBMJEB" con desplazamiento 1 → "LA SALIDA"
 *
 * La rueda es lo que convierte esto en descifrar y no en adivinar. Sin ella el
 * nivel sería un campo de texto y una corazonada; con ella el jugador ve el
 * mensaje emerger cuando acierta el desplazamiento, que es exactamente la
 * sensación que persigue el documento maestro.
 */

import { LevelBase } from './level-base.js';
import { el } from '../utils/dom.js';
import { textEquals } from '../systems/validation.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PLAIN = 'LA SALIDA';
const SHIFT = 1;

/** Aplica un desplazamiento de César, dejando intactos espacios y signos. */
function shiftText(text, amount) {
  return [...text].map((char) => {
    const index = ALPHABET.indexOf(char);
    if (index === -1) return char;
    return ALPHABET[(index + amount + ALPHABET.length * 2) % ALPHABET.length];
  }).join('');
}

const CIPHER = shiftText(PLAIN, SHIFT);

const STYLES = `
.lv17 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: var(--sp-6);
}

.lv17__cipher {
  font-family: var(--font-mono);
  font-size: clamp(1.3rem, 5.5vw, 2rem);
  font-weight: 600;
  letter-spacing: 0.28em;
  color: var(--text-faint);
  text-align: center;
  margin-right: -0.28em;
}

.lv17__arrow { color: var(--mystery); font-size: 1.2rem; }

/* El texto descifrado en vivo: el corazón del nivel. */
.lv17__plain {
  font-family: var(--font-mono);
  font-size: clamp(1.3rem, 5.5vw, 2rem);
  font-weight: 600;
  letter-spacing: 0.28em;
  color: var(--accent);
  text-align: center;
  margin-right: -0.28em;
  min-height: 1.3em;
  transition: color var(--t-base) var(--ease);
}

.lv17__dial {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-pill);
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.28);
}

.lv17__step {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid var(--glass-border);
  font-size: 1.1rem;
  color: var(--text);
  transition: border-color var(--t-fast) var(--ease), background var(--t-fast) var(--ease);
}

.lv17__step:hover { border-color: var(--accent-line); background: var(--glass-bg-hover); }

.lv17__amount {
  min-width: 130px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: var(--text-dim);
}

.lv17__amount b { color: var(--accent); font-size: 1.1rem; }

/* Tira del alfabeto: muestra la correspondencia que aplica la rueda. */
.lv17__strip {
  display: grid;
  grid-template-columns: repeat(26, 1fr);
  gap: 2px;
  width: min(560px, 100%);
}

.lv17__pair {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: var(--font-mono);
  line-height: 1.2;
}

.lv17__pair span { font-size: clamp(0.5rem, 1.7vw, 0.68rem); color: var(--text-faint); }
.lv17__pair b { font-size: clamp(0.55rem, 1.9vw, 0.75rem); color: var(--accent); font-weight: 600; }
`;

export class Level17 extends LevelBase {
  constructor(levelId, container, context) {
    super(levelId, container, context);
    this.shift = 0;
  }

  init() {
    this.plainNode = el('p.lv17__plain', { role: 'status', 'aria-live': 'polite' });
    this.amountNode = el('span.lv17__amount', {}, ['Desplazamiento ', el('b', { text: '0' })]);
    this.stripNode = el('div.lv17__strip', { 'aria-hidden': 'true' });

    const back = el('button.lv17__step', { type: 'button', text: '−',
      'aria-label': 'Reducir el desplazamiento' });
    const forward = el('button.lv17__step', { type: 'button', text: '+',
      'aria-label': 'Aumentar el desplazamiento' });

    this.listen(back, 'click', () => this.setShift(this.shift - 1));
    this.listen(forward, 'click', () => this.setShift(this.shift + 1));

    this.mount(el('style', { text: STYLES }), el('div.lv17', {}, [
      el('p.lv17__cipher', { text: CIPHER, 'aria-label': `Mensaje cifrado: ${CIPHER}` }),
      el('span.lv17__arrow', { text: '↓', 'aria-hidden': 'true' }),
      this.plainNode,
      el('div.lv17__dial', {}, [back, this.amountNode, forward]),
      this.stripNode,
    ]));

    this.render();
  }

  setShift(value) {
    // La rueda da la vuelta: 25 → 0 y 0 → 25, como un disco de verdad.
    this.shift = ((value % ALPHABET.length) + ALPHABET.length) % ALPHABET.length;
    this.render();
  }

  render() {
    // Descifrar es desplazar hacia atrás.
    const decoded = shiftText(CIPHER, -this.shift);
    this.plainNode.textContent = decoded;
    this.amountNode.querySelector('b').textContent = String(this.shift);

    this.stripNode.replaceChildren(...[...ALPHABET].map((letter) => el('div.lv17__pair', {}, [
      el('span', { text: letter }),
      el('b', { text: shiftText(letter, -this.shift) }),
    ])));
  }

  validate(solution) {
    return textEquals(solution, PLAIN);
  }

  onSolved() {
    this.solved = true;
    this.setShift(SHIFT);
    this.plainNode.style.color = 'var(--success)';
  }

  getInputMode() {
    return 'text';
  }

  getInputConfig() {
    return {
      label: 'El mensaje descifrado',
      placeholder: '·· ······',
      maxLength: 24,
      submitLabel: 'Enviar',
    };
  }

  getPrompt() {
    return 'Alguien dejó un mensaje cifrado. Gira la rueda hasta que se entienda.';
  }

  getHints() {
    return [
      'Cada letra está una posición por delante de la que debería ser.',
      'Prueba a desplazar el alfabeto una sola posición hacia atrás: M → L, B → A…',
      'Es un cifrado César con desplazamiento 1. El mensaje es «LA SALIDA».',
    ];
  }

  getState() {
    return { shift: this.shift, cipher: CIPHER };
  }

  setState(state) {
    if (Number.isFinite(state?.shift)) this.shift = state.shift;
  }

  getType() {
    return 'codigo';
  }
}

export default Level17;
