/**
 * levels/level-11.js — "Binario"
 *
 * Tipo:        Código + Matemática
 * Mecánica:    Cinco grupos de cinco bits. Cada grupo es un número en binario;
 *              cada número es una letra (A=1, B=2 … Z=26).
 * Interacción: Escribir la palabra resultante.
 * Solución:    MENTE
 *
 * El abecedario numerado se muestra siempre. Contar hasta la vigésima letra con
 * los dedos no es el puzzle —el puzzle es darse cuenta de que hay que hacerlo—,
 * y castigar al jugador con aritmética tediosa iría contra el principio de que
 * debe sentirse listo, no exhausto.
 *
 * Se usa el alfabeto latino de 26 letras, sin Ñ: así A=1…Z=26 coincide con la
 * convención que espera cualquiera que haya visto este cifrado antes.
 */

import { LevelBase } from './level-base.js';
import { el } from '../utils/dom.js';
import { textEquals } from '../systems/validation.js';

const WORD = 'MENTE';
const BITS = 5;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** 'M' → '01101' */
const toBinary = (letter) =>
  (ALPHABET.indexOf(letter) + 1).toString(2).padStart(BITS, '0');

const GROUPS = [...WORD].map(toBinary);

const STYLES = `
.lv11 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--sp-6);
}

.lv11__groups {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--sp-4);
}

.lv11__group {
  display: flex;
  gap: 3px;
  padding: var(--sp-3);
  border-radius: var(--r-md);
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.28);
  animation: rise-in 0.4s var(--ease) both;
}

.lv11__bit {
  display: grid;
  place-items: center;
  width: clamp(20px, 5vw, 28px);
  aspect-ratio: 1;
  border-radius: 5px;
  font-family: var(--font-mono);
  font-size: clamp(0.72rem, 2.2vw, 0.92rem);
  font-weight: 600;
}

/* El 1 se destaca y el 0 se apaga: el patrón se lee de un vistazo. */
.lv11__bit--one { color: var(--accent); background: var(--accent-soft); }
.lv11__bit--zero { color: var(--text-faint); background: rgba(255, 255, 255, 0.02); }

.lv11__alphabet {
  display: grid;
  grid-template-columns: repeat(13, 1fr);
  gap: 4px;
  width: min(520px, 100%);
  margin: 0 auto;
  padding: var(--sp-4);
  border-radius: var(--r-md);
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.2);
}

.lv11__letter {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  font-family: var(--font-mono);
  line-height: 1.1;
}

.lv11__letter b { font-size: 0.8rem; font-weight: 600; color: var(--text); }
.lv11__letter span { font-size: 0.6rem; color: var(--text-faint); }

.lv11__caption {
  text-align: center;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-faint);
  margin-bottom: var(--sp-2);
}
`;

export class Level11 extends LevelBase {
  init() {
    const groups = el('div.lv11__groups', {
      role: 'img',
      'aria-label': `Cinco grupos binarios: ${GROUPS.join(', ')}`,
    }, GROUPS.map((bits, index) => el('div.lv11__group', {
      'aria-hidden': 'true',
      style: { animationDelay: `${index * 0.08}s` },
    }, [...bits].map((bit) => el('span', {
      class: `lv11__bit lv11__bit--${bit === '1' ? 'one' : 'zero'}`,
      text: bit,
    })))));

    const alphabet = el('div', {}, [
      el('p.lv11__caption', { text: 'Referencia' }),
      el('div.lv11__alphabet', { 'aria-hidden': 'true' },
        [...ALPHABET].map((letter, i) => el('div.lv11__letter', {}, [
          el('b', { text: letter }),
          el('span', { text: String(i + 1) }),
        ]))),
    ]);

    this.mount(el('style', { text: STYLES }), el('div.lv11', {}, [groups, alphabet]));
  }

  validate(solution) {
    return textEquals(solution, WORD);
  }

  getInputMode() {
    return 'text';
  }

  getInputConfig() {
    return {
      label: 'La palabra',
      placeholder: '·····',
      maxLength: 12,
      submitLabel: 'Enviar',
    };
  }

  getPrompt() {
    return 'Cinco grupos de cinco bits. Cada grupo esconde una letra.';
  }

  getHints() {
    return [
      'Cada grupo es un número escrito en binario.',
      'Pasa cada grupo a decimal y busca ese número en el abecedario: 1 = A, 2 = B…',
      'El primer grupo, 01101, es 13. La decimotercera letra es la M.',
    ];
  }

  getState() {
    return { word: WORD };
  }

  getType() {
    return 'codigo-matematica';
  }
}

export default Level11;
