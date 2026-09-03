/**
 * levels/level-06.js — "Las Cajas"
 *
 * Tipo:        Lógica
 * Mecánica:    Tres cajas con una afirmación cada una. Sólo una afirmación es
 *              verdadera.
 * Interacción: Clic en la caja que contiene la solución.
 * Solución:    Caja B (como pide el documento maestro).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NOTA DE DISEÑO — las afirmaciones NO son las del documento
 *
 * El documento propone:
 *     A: "La solución es B"   ·   B: "La solución no es A"   ·   C: "La solución es C"
 *
 * Ese conjunto no tiene solución bajo la regla "sólo una afirmación es
 * verdadera":
 *     sol = A → 0 afirmaciones verdaderas
 *     sol = B → 2 (A y B)
 *     sol = C → 2 (B y C)
 *
 * El propio documento reconoce la duda ("resolver por contradicción"). Se
 * sustituyen por un conjunto que sí funciona, conserva la respuesta pedida
 * (caja B) y hace que las tres pistas originales sigan siendo correctas:
 *
 *     A: "La solución es C"   ·   B: "La solución no es C"   ·   C: "La solución no es B"
 *
 *     sol = A → A falsa, B verdadera, C verdadera  → 2 ✗
 *     sol = B → A falsa, B verdadera, C falsa      → 1 ✓
 *     sol = C → A verdadera, B falsa, C verdadera  → 2 ✗
 *
 * Solución única, y el razonamiento por contradicción de las pistas encaja:
 * suponer verdadera la de A o la de C obliga a que haya dos verdaderas.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { LevelBase } from './level-base.js';
import { el } from '../utils/dom.js';

const BOXES = [
  { id: 'A', statement: 'La solución es C.' },
  { id: 'B', statement: 'La solución no es C.' },
  { id: 'C', statement: 'La solución no es B.' },
];

const SOLUTION = 'B';

const STYLES = `
.lv06 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--sp-5);
}

.lv06__premise {
  text-align: center;
  font-size: 0.86rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--mystery);
}

.lv06__boxes {
  display: flex;
  align-items: stretch;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--sp-4);
}

.lv06__box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-4);
  width: clamp(150px, 28vw, 210px);
  padding: var(--sp-5) var(--sp-4);
  border-radius: var(--r-lg);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  transition: transform var(--t-base) var(--ease),
              border-color var(--t-base) var(--ease),
              box-shadow var(--t-base) var(--ease),
              opacity var(--t-base) var(--ease);
}

.lv06__box:hover:not(:disabled) {
  transform: translateY(-4px);
  border-color: var(--accent-line);
  box-shadow: var(--shadow-glow);
}

.lv06__letter {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 1px solid var(--glass-border);
  font-family: var(--font-mono);
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--accent);
}

.lv06__statement {
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--text);
  text-align: center;
  font-style: italic;
}

.lv06__box--wrong { animation: error-shake 0.4s var(--ease); border-color: rgba(239,68,68,0.5); }

.lv06__box--found { border-color: rgba(34,197,94,0.55); background: var(--success-soft); }
.lv06__box--found .lv06__letter { color: var(--success); border-color: rgba(34,197,94,0.5); }

.lv06__box--dimmed { opacity: 0.25; }

@media (max-width: 560px) {
  .lv06__box { width: 100%; flex-direction: row; text-align: left; }
  .lv06__statement { text-align: left; }
}
`;

export class Level06 extends LevelBase {
  init() {
    this.boxes = new Map();

    const row = el('div.lv06__boxes', {}, BOXES.map((box) => {
      const node = el('button.lv06__box', {
        type: 'button',
        'aria-label': `Caja ${box.id}. Afirma: ${box.statement}`,
      }, [
        el('span.lv06__letter', { text: box.id, 'aria-hidden': 'true' }),
        el('p.lv06__statement', { text: `«${box.statement}»`, 'aria-hidden': 'true' }),
      ]);

      this.listen(node, 'click', () => this.onPick(box.id, node));
      this.boxes.set(box.id, node);
      return node;
    }));

    this.mount(
      el('style', { text: STYLES }),
      el('div.lv06', {}, [
        el('p.lv06__premise', { text: 'Sólo una de las tres afirmaciones es verdadera' }),
        row,
      ]),
    );
  }

  onPick(id, node) {
    if (this.attempt(id)) return;
    node.classList.add('lv06__box--wrong');
    setTimeout(() => node.classList.remove('lv06__box--wrong'), 420);
  }

  validate(solution) {
    return String(solution).toUpperCase() === SOLUTION;
  }

  onSolved() {
    for (const [id, node] of this.boxes) {
      node.disabled = true;
      node.classList.add(id === SOLUTION ? 'lv06__box--found' : 'lv06__box--dimmed');
    }
  }

  getPrompt() {
    return '¿En qué caja está la solución?';
  }

  getHints() {
    return [
      'Si la afirmación de A fuese la verdadera, ¿qué pasaría con la de C?',
      'Asume que cada afirmación es la verdadera, una por una, y cuenta cuántas quedan verdaderas.',
      'Sólo suponiendo verdadera la de B no aparece una segunda verdad: la solución es B.',
    ];
  }

  getState() {
    return { solution: SOLUTION };
  }

  getType() {
    return 'logica';
  }
}

export default Level06;
