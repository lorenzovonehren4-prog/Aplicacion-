/**
 * levels/level-28.js — "La Pantalla Miente"
 *
 * Tipo:        Pensamiento lateral
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NOTA DE DISEÑO — este engaño no venía en el documento
 *
 * Es el único nivel que el documento maestro deja sin resolver: enumera sitios
 * donde podría esconderse la verdad —el título, el número del nivel, los
 * colores, el texto de error— pero no elige ninguno ni define la mecánica. Sí
 * fija las tres pistas, y la tercera es inequívoca: "El número 28 es más
 * importante de lo que parece".
 *
 * El engaño elegido, entonces:
 *
 *   · La pantalla ordena, con toda claridad, pulsar el círculo rojo.
 *   · No hay ningún círculo rojo. Los treinta son idénticos.
 *   · Al fallar, el mensaje de error insiste en el rojo: la pantalla no se
 *     corrige, miente con más fuerza. Es lo que hace que el jugador acabe
 *     desconfiando del enunciado en vez de de sí mismo.
 *   · La respuesta es el círculo número 28 — el número del nivel, que está
 *     escrito en la cabecera desde el principio.
 *
 * Se descartó esconder la respuesta en el título o en los colores de la
 * interfaz: dependería de detalles de estilo que un rediseño rompería sin
 * avisar. El número del nivel, en cambio, es un dato del propio juego, sale en
 * la cabecera y en el selector, y la pista #3 lo señala sin ambigüedad.
 *
 * Los círculos NO están numerados: contarlos es el trabajo. Se colocan en seis
 * columnas para que contar sea llevadero (fila 5, cuarta posición) y no un
 * castigo.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { LevelBase } from './level-base.js';
import { el } from '../utils/dom.js';

const TOTAL = 30;
const COLS = 6;
const ANSWER = 28;

/** Mentiras que la pantalla suelta al fallar, en orden. */
const LIES = [
  'Ese no es el círculo rojo.',
  'He dicho el ROJO.',
  'Sigue sin ser el rojo. Míralo bien.',
  '¿De verdad no ves cuál es el rojo?',
];

const STYLES = `
.lv28 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: var(--sp-5);
}

.lv28__order {
  padding: var(--sp-3) var(--sp-5);
  border-radius: var(--r-md);
  border: 1px solid rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.06);
  font-size: 1rem;
  letter-spacing: 0.04em;
  color: #ffd9d9;
  text-align: center;
}

.lv28__grid {
  display: grid;
  grid-template-columns: repeat(${COLS}, 1fr);
  gap: clamp(8px, 2.4vw, 16px);
}

/* Los treinta son exactamente iguales. No hay ninguno rojo. */
.lv28__circle {
  width: clamp(30px, 8vw, 42px);
  aspect-ratio: 1;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: radial-gradient(circle at 35% 30%, rgba(0,212,255,0.22), rgba(0,212,255,0.06));
  transition: transform var(--t-fast) var(--ease), box-shadow var(--t-base) var(--ease);
}

.lv28__circle:hover:not(:disabled) { transform: scale(1.12); box-shadow: var(--shadow-glow); }
.lv28__circle--wrong { animation: error-shake 0.4s var(--ease); }

.lv28__circle--found {
  background: radial-gradient(circle at 35% 30%, rgba(34,197,94,0.5), rgba(34,197,94,0.16));
  border-color: var(--success);
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
}

.lv28__circle--dimmed { opacity: 0.18; }

.lv28__tries { font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-faint); }
`;

export class Level28 extends LevelBase {
  constructor(levelId, container, context) {
    super(levelId, container, context);
    this.tries = 0;
  }

  init() {
    this.circles = Array.from({ length: TOTAL }, (_, i) => {
      const number = i + 1;
      const circle = el('button.lv28__circle', {
        type: 'button',
        // Ni el aria-label numera los círculos: eso sería resolverlo para quien
        // navegue con lector de pantalla y no para quien mire.
        'aria-label': 'Círculo',
      });
      this.listen(circle, 'click', () => this.onPick(number, circle));
      return circle;
    });

    this.triesLabel = el('p.lv28__tries');

    this.mount(el('style', { text: STYLES }), el('div.lv28', {}, [
      el('p.lv28__order', { text: 'Pulsa el círculo rojo.' }),
      el('div.lv28__grid', { role: 'group', 'aria-label': 'Treinta círculos' }, this.circles),
      this.triesLabel,
    ]));

    this.render();
  }

  onPick(number, circle) {
    if (this.solved) return;
    if (this.attempt(number)) return;

    this.tries += 1;
    circle.classList.add('lv28__circle--wrong');
    setTimeout(() => circle.classList.remove('lv28__circle--wrong'), 420);

    // La pantalla no se corrige nunca: insiste.
    this.feedback(LIES[Math.min(this.tries - 1, LIES.length - 1)], 'error');
    this.render();
  }

  render() {
    this.triesLabel.textContent = this.tries
      ? `Círculos rojos encontrados: 0 · Intentos: ${this.tries}`
      : '';
  }

  validate(solution) {
    return Number(solution) === ANSWER;
  }

  onSolved() {
    this.solved = true;
    this.circles.forEach((circle, i) => {
      circle.disabled = true;
      circle.classList.add(i + 1 === ANSWER ? 'lv28__circle--found' : 'lv28__circle--dimmed');
    });
    this.setPrompt('No había ningún círculo rojo. Nunca lo hubo.');
    this.triesLabel.textContent = '';
  }

  getPrompt() {
    return 'Haz lo que dice la pantalla.';
  }

  getHints() {
    return [
      'No confíes en lo que lees.',
      'Mira a tu alrededor: la respuesta lleva escrita en la pantalla desde que entraste, pero no dentro del puzzle.',
      'El número 28 es más importante de lo que parece: cuenta los círculos y pulsa el vigésimo octavo.',
    ];
  }

  getState() {
    return { answer: ANSWER, tries: this.tries };
  }

  getType() {
    return 'pensamiento-lateral';
  }
}

export default Level28;
