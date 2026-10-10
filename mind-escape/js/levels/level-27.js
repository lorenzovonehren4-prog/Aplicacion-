/**
 * levels/level-27.js — "Meta Puzzle"
 *
 * Tipo:        Meta + Código
 * Mecánica:    Cuatro pistas que no hablan de esta pantalla, sino de niveles
 *              que el jugador ya resolvió. Cada una da un dígito.
 * Interacción: Teclado numérico.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NOTA DE DISEÑO — el código no está escrito en ninguna parte
 *
 * El documento maestro propone como ejemplo el código 7294, sacado de unos
 * niveles concretos. Esos números no encajan con los niveles tal como han
 * quedado implementados, así que en vez de copiar el ejemplo, este nivel
 * IMPORTA la respuesta de cada nivel al que alude:
 *
 *     nivel 5  → qué pieza completaba el espejo
 *     nivel 12 → qué pelota pesaba de más
 *     nivel 20 → qué puerta era la salida
 *     nivel 22 → qué moneda era la distinta
 *
 * Es la única dependencia entre niveles de todo el juego, y es deliberada: un
 * meta-puzzle que no dependa de los demás no es un meta-puzzle. Al importarlas
 * en vez de copiarlas, el código no puede desincronizarse: si alguien cambia la
 * semilla del nivel 12, este nivel cambia con él y sigue siendo cierto.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { LevelBase } from './level-base.js';
import { el } from '../utils/dom.js';
import { createKeypad } from './shared/keypad.js';

import { ANSWER_PIECE } from './level-05.js';
import { ANSWER_BALL } from './level-12.js';
import { ANSWER_DOOR } from './level-20.js';
import { ANSWER_COIN } from './level-22.js';

const CLUES = [
  { level: 5, text: 'El nivel en que un espejo te pedía la mitad que faltaba.', digit: ANSWER_PIECE },
  { level: 12, text: 'El nivel en que sólo tenías dos pesadas.', digit: ANSWER_BALL },
  { level: 20, text: 'El nivel en que cuatro puertas mentían.', digit: ANSWER_DOOR },
  { level: 22, text: 'El nivel en que doce monedas parecían iguales.', digit: ANSWER_COIN },
];

const CODE = CLUES.map((clue) => clue.digit).join('');

const STYLES = `
.lv27 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: var(--sp-6);
}

.lv27__clues {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  width: min(460px, 100%);
  list-style: none;
}

.lv27__clue {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-md);
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.24);
  animation: rise-in 0.4s var(--ease) both;
}

.lv27__slot {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: var(--r-sm);
  border: 1px dashed var(--glass-border);
  font-family: var(--font-mono);
  font-size: 1rem;
  color: var(--text-faint);
}

.lv27__text { font-size: 0.92rem; line-height: 1.45; color: var(--text-dim); }

.lv27__note {
  font-size: 0.75rem;
  color: var(--text-faint);
  text-align: center;
  max-width: 44ch;
}

.lv27__clue--revealed .lv27__slot {
  border-style: solid;
  border-color: rgba(34,197,94,0.5);
  color: var(--success);
}
`;

export class Level27 extends LevelBase {
  init() {
    this.clueNodes = CLUES.map((clue, i) => el('li.lv27__clue', {
      style: { animationDelay: `${i * 0.09}s` },
    }, [
      el('span.lv27__slot', { text: '?', 'aria-hidden': 'true' }),
      el('span.lv27__text', { text: clue.text }),
    ]));

    this.keypad = createKeypad({
      maxLength: CODE.length,
      fixedLength: true,
      autoSubmit: true,
      onSubmit: (value) => {
        const correct = this.attempt(value);
        if (!correct) this.keypad.clear();
      },
    });

    this.mount(el('style', { text: STYLES }), el('div.lv27', {}, [
      el('ul.lv27__clues', {}, this.clueNodes),
      el('p.lv27__note', {
        text: 'Cada pista apunta a un nivel que ya resolviste. Su respuesta es un dígito.',
      }),
      this.keypad.element,
    ]));
  }

  validate(solution) {
    return String(solution) === CODE;
  }

  onSolved() {
    this.solved = true;
    this.keypad.lock();
    this.clueNodes.forEach((node, i) => {
      node.classList.add('lv27__clue--revealed');
      node.querySelector('.lv27__slot').textContent = String(CLUES[i].digit);
    });
  }

  destroy() {
    this.keypad?.destroy();
    super.destroy();
  }

  getPrompt() {
    return 'Este código no está en esta pantalla. Ya lo resolviste, cuatro veces.';
  }

  getHints() {
    return [
      'Has resuelto esto antes, sin saberlo.',
      `Cada pista describe un nivel concreto: el ${CLUES.map((c) => c.level).join(', el ')}. Su respuesta era un número.`,
      `Niveles ${CLUES.map((c) => c.level).join(', ')} → ${CLUES.map((c) => c.digit).join(', ')}.`,
    ];
  }

  getState() {
    return { code: CODE };
  }

  getType() {
    return 'meta-codigo';
  }
}

export { CODE as META_CODE };
export default Level27;
