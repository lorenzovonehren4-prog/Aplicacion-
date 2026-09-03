/**
 * levels/level-22.js — "Las Monedas"
 *
 * Tipo:        Interacción + Observación
 * Mecánica:    Doce monedas en círculo. Una tiene el borde algo más grueso.
 * Interacción: Poner monedas en la lupa para compararlas de cerca, y señalar
 *              la distinta.
 * Solución:    La moneda 7 (posición fijada por la pista #3 del documento).
 *
 * La lupa es la clave del nivel. A tamaño de moneda la diferencia de grosor es
 * indistinguible —y buscar a ojo sería una lotería—, pero puestas dos al lado
 * la otra y ampliadas, salta. El puzzle no es tener buena vista: es darse
 * cuenta de que hay que comparar por parejas.
 */

import { LevelBase } from './level-base.js';
import { el, svgEl } from '../utils/dom.js';

const COUNT = 12;

/** Moneda distinta. La usan los meta-puzzles de los niveles 27 y 30. */
export const ANSWER_COIN = 7;

const NORMAL_RIM = 2.4;
const ODD_RIM = 3.4;

const STYLES = `
.lv22 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--sp-5);
}

.lv22__ring {
  position: relative;
  width: min(320px, 74vw);
  aspect-ratio: 1;
  margin: 0 auto;
}

.lv22__coin {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 22%;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 1px solid transparent;
  background: transparent;
  padding: 0;
  transition: transform var(--t-fast) var(--ease), border-color var(--t-base) var(--ease);
}

.lv22__coin:hover:not(:disabled) { transform: translate(-50%, -50%) scale(1.12); }
.lv22__coin--picked { border-color: var(--accent); }
.lv22__coin svg { width: 100%; height: 100%; }

.lv22__face { fill: rgba(255,255,255,0.05); }
.lv22__rim { fill: none; stroke: hsl(45 70% 68%); }
.lv22__index {
  fill: var(--text-faint);
  font-family: var(--font-mono);
  font-size: 22px;
  text-anchor: middle;
  dominant-baseline: central;
}

/* --- Lupa --- */

.lv22__lens {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-5);
  min-height: 150px;
  padding: var(--sp-4);
  border-radius: var(--r-lg);
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.3);
}

.lv22__slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  width: clamp(96px, 26vw, 128px);
}

.lv22__slot svg { width: 100%; height: auto; }

.lv22__slot-label {
  font-size: 0.66rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.lv22__empty {
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 1px dashed var(--glass-border);
  color: var(--text-faint);
  font-size: 0.72rem;
  text-align: center;
  padding: var(--sp-3);
}

.lv22__accuse {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.lv22__accuse-label {
  width: 100%;
  text-align: center;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.lv22__pick {
  min-width: 36px;
  min-height: 36px;
  border-radius: var(--r-sm);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  font-family: var(--font-mono);
  font-size: 0.82rem;
  color: var(--text-dim);
  transition: border-color var(--t-base) var(--ease), color var(--t-base) var(--ease);
}

.lv22__pick:hover:not(:disabled) { border-color: var(--error); color: var(--text); }

.lv22__coin--guilty { border-color: var(--success); }
`;

export class Level22 extends LevelBase {
  constructor(levelId, container, context) {
    super(levelId, container, context);
    this.lens = [];
  }

  rimOf(id) {
    return id === ANSWER_COIN ? ODD_RIM : NORMAL_RIM;
  }

  init() {
    const ring = el('div.lv22__ring', { role: 'group', 'aria-label': 'Doce monedas en círculo' });
    this.coinNodes = new Map();

    for (let id = 1; id <= COUNT; id += 1) {
      // Se empieza arriba y se gira en sentido horario, como las horas de un reloj.
      const angle = ((id - 1) / COUNT) * Math.PI * 2 - Math.PI / 2;
      const node = el('button.lv22__coin', {
        type: 'button',
        'aria-label': `Moneda ${id}. Púlsala para verla en la lupa.`,
        style: {
          left: `${50 + Math.cos(angle) * 39}%`,
          top: `${50 + Math.sin(angle) * 39}%`,
        },
      }, [buildCoin(id, this.rimOf(id), true)]);

      this.listen(node, 'click', () => this.toLens(id));
      this.coinNodes.set(id, node);
      ring.append(node);
    }

    this.lensNode = el('div.lv22__lens');

    this.accuseButtons = Array.from({ length: COUNT }, (_, i) => {
      const id = i + 1;
      const button = el('button.lv22__pick', {
        type: 'button', text: String(id), 'aria-label': `Señalar la moneda ${id}`,
      });
      this.listen(button, 'click', () => this.accuse(id));
      return button;
    });

    this.mount(el('style', { text: STYLES }), el('div.lv22', {}, [
      ring,
      this.lensNode,
      el('div.lv22__accuse', {}, [
        el('span.lv22__accuse-label', { text: '¿Cuál es la distinta?' }),
        ...this.accuseButtons,
      ]),
    ]));

    this.renderLens();
  }

  /** Mete una moneda en la lupa; la tercera desplaza a la más antigua. */
  toLens(id) {
    if (this.solved) return;
    if (this.lens.includes(id)) this.lens = this.lens.filter((x) => x !== id);
    else this.lens = [...this.lens, id].slice(-2);
    this.renderLens();
  }

  renderLens() {
    this.lensNode.replaceChildren(...[0, 1].map((slot) => {
      const id = this.lens[slot];
      return el('div.lv22__slot', {}, [
        id
          ? svgEl('svg', { viewBox: '0 0 100 100', role: 'img',
              'aria-label': `Moneda ${id} ampliada` }, buildCoinParts(id, this.rimOf(id), false))
          : el('div.lv22__empty', { text: 'Pulsa una moneda' }),
        el('span.lv22__slot-label', { text: id ? `Moneda ${id}` : `Hueco ${slot + 1}` }),
      ]);
    }));

    for (const [id, node] of this.coinNodes) {
      node.classList.toggle('lv22__coin--picked', this.lens.includes(id));
    }
  }

  accuse(id) {
    if (this.solved) return;
    if (this.attempt(id)) return;
    this.feedback('Ésa es igual que las demás. Sigue comparando.', 'error');
  }

  validate(solution) {
    return Number(solution) === ANSWER_COIN;
  }

  onSolved() {
    this.solved = true;
    this.lens = [ANSWER_COIN];
    this.renderLens();
    for (const button of this.accuseButtons) button.disabled = true;
    for (const [id, node] of this.coinNodes) {
      node.disabled = true;
      if (id === ANSWER_COIN) node.classList.add('lv22__coin--guilty');
    }
  }

  getPrompt() {
    return 'Once monedas idénticas y una que no lo es. Ponlas en la lupa de dos en dos.';
  }

  getHints() {
    return [
      'No todas las monedas son idénticas, pero a ese tamaño no lo vas a ver.',
      'Mira los bordes: compáralas por parejas en la lupa, no de un vistazo.',
      'La moneda de la posición 7 tiene el borde más grueso.',
    ];
  }

  getState() {
    return { odd: ANSWER_COIN };
  }

  getType() {
    return 'interaccion-observacion';
  }
}

function buildCoin(id, rim, small) {
  return svgEl('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' },
    buildCoinParts(id, rim, small));
}

function buildCoinParts(id, rim, small) {
  return [
    svgEl('circle', { cx: 50, cy: 50, r: 44, class: 'lv22__face' }),
    svgEl('circle', { cx: 50, cy: 50, r: 40, class: 'lv22__rim', 'stroke-width': rim }),
    svgEl('text', { x: 50, y: 52, class: 'lv22__index',
      'font-size': small ? 26 : 20, text: String(id) }),
  ];
}

export default Level22;
