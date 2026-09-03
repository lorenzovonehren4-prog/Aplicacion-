/**
 * levels/level-16.js — "Cables"
 *
 * Tipo:        Interacción + Lógica
 * Mecánica:    Cuatro cables de color a la izquierda, cuatro conectores
 *              numerados a la derecha y cuatro reglas que determinan un único
 *              emparejamiento.
 * Interacción: Pulsar un cable y después un conector para unirlos. Pulsar una
 *              unión la deshace.
 * Solución:    Azul→1, Amarillo→2, Rojo→3, Verde→4
 *
 * Las cuatro reglas encadenan la deducción sin dejar ambigüedad:
 *   1. El azul va al 1              → azul = 1
 *   2. El rojo va a un impar        → rojo ∈ {1,3}; el 1 está cogido → rojo = 3
 *   3. El verde sólo puede ir al 2 o al 4
 *   4. El amarillo no va al 4       → amarillo = 2, y por descarte verde = 4
 */

import { LevelBase } from './level-base.js';
import { el, svgEl } from '../utils/dom.js';
import { mappingEquals } from '../systems/validation.js';

const CABLES = [
  { id: 'rojo', label: 'Rojo', hex: '#ef4444' },
  { id: 'azul', label: 'Azul', hex: '#38bdf8' },
  { id: 'verde', label: 'Verde', hex: '#22c55e' },
  { id: 'amarillo', label: 'Amarillo', hex: '#fbbf24' },
];

const PORTS = [1, 2, 3, 4];

const RULES = [
  'El azul va al 1.',
  'El rojo va a un conector impar.',
  'El verde sólo puede ir al 2 o al 4.',
  'El amarillo no va al 4.',
];

const SOLUTION = { azul: 1, amarillo: 2, rojo: 3, verde: 4 };

const STYLES = `
.lv16 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--sp-5);
}

.lv16__rules {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  width: min(400px, 100%);
  margin: 0 auto;
  padding: var(--sp-4) var(--sp-5);
  border-radius: var(--r-md);
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.22);
  list-style: none;
}

.lv16__rule {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  font-size: 0.9rem;
  color: var(--text-dim);
  transition: color var(--t-base) var(--ease);
}

.lv16__mark {
  flex: none;
  width: 16px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--text-faint);
}

.lv16__rule--met { color: var(--text); }
.lv16__rule--met .lv16__mark { color: var(--success); }
.lv16__rule--broken { color: var(--error); }
.lv16__rule--broken .lv16__mark { color: var(--error); }

/* --- Panel --- */

.lv16__panel {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 90px 1fr;
  align-items: center;
  gap: 0;
  width: min(440px, 100%);
  margin: 0 auto;
}

.lv16__column { display: flex; flex-direction: column; gap: var(--sp-3); }

.lv16__wires {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.lv16__wire { fill: none; stroke-width: 4; stroke-linecap: round; opacity: 0.9; }

.lv16__cable,
.lv16__port {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-height: 52px;
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-sm);
  border: 1px solid var(--glass-border);
  background: var(--bg-panel);
  transition: border-color var(--t-base) var(--ease), background var(--t-base) var(--ease);
}

.lv16__cable:hover:not(:disabled),
.lv16__port:hover:not(:disabled) { border-color: var(--accent-line); }

.lv16__cable--selected { border-color: var(--accent); box-shadow: var(--shadow-glow); }
.lv16__cable--linked, .lv16__port--linked { opacity: 0.75; }

.lv16__plug { width: 16px; height: 16px; border-radius: 50%; flex: none; }

.lv16__cable-name, .lv16__port-name {
  font-size: 0.82rem;
  letter-spacing: 0.08em;
}

.lv16__port { justify-content: flex-end; }

.lv16__port-number {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid var(--glass-border);
  font-family: var(--font-mono);
  font-size: 0.82rem;
  color: var(--accent);
  flex: none;
}

.lv16__actions { display: flex; justify-content: center; gap: var(--sp-3); }
`;

export class Level16 extends LevelBase {
  constructor(levelId, container, context) {
    super(levelId, container, context);
    /** cable.id → número de conector */
    this.links = new Map();
    this.selected = null;
  }

  init() {
    this.ruleNodes = RULES.map((text) => el('li.lv16__rule', {}, [
      el('span.lv16__mark', { text: '·', 'aria-hidden': 'true' }),
      el('span', { text }),
    ]));

    this.wires = svgEl('svg.lv16__wires', { preserveAspectRatio: 'none' });

    this.cableNodes = new Map();
    const left = el('div.lv16__column', {}, CABLES.map((cable) => {
      const node = el('button.lv16__cable', {
        type: 'button',
        'aria-label': `Cable ${cable.label}, sin conectar`,
      }, [
        el('span.lv16__plug', { style: { background: cable.hex } }),
        el('span.lv16__cable-name', { text: cable.label }),
      ]);
      this.listen(node, 'click', () => this.onCable(cable.id));
      this.cableNodes.set(cable.id, node);
      return node;
    }));

    this.portNodes = new Map();
    const right = el('div.lv16__column', {}, PORTS.map((port) => {
      const node = el('button.lv16__port', {
        type: 'button',
        'aria-label': `Conector ${port}, libre`,
      }, [
        el('span.lv16__port-name', { text: `Conector ${port}` }),
        el('span.lv16__port-number', { text: String(port) }),
      ]);
      this.listen(node, 'click', () => this.onPort(port));
      this.portNodes.set(port, node);
      return node;
    }));

    this.panel = el('div.lv16__panel', {}, [this.wires, left, el('div'), right]);

    const clear = el('button.btn.btn--ghost', { type: 'button', text: 'Desconectar todo' });
    this.listen(clear, 'click', () => { this.links.clear(); this.selected = null; this.render(); });

    this.mount(el('style', { text: STYLES }), el('div.lv16', {}, [
      el('ul.lv16__rules', {}, this.ruleNodes),
      this.panel,
      el('div.lv16__actions', {}, [clear]),
    ]));

    // Los cables se dibujan sobre coordenadas reales, así que hay que
    // recalcularlos cuando cambia el tamaño de la ventana.
    const onResize = () => this.drawWires();
    window.addEventListener('resize', onResize, { passive: true });
    this.disposer.add(() => window.removeEventListener('resize', onResize));

    this.render();
    requestAnimationFrame(() => this.drawWires());
  }

  onCable(cableId) {
    if (this.solved) return;
    if (this.links.has(cableId)) { this.links.delete(cableId); this.selected = null; }
    else this.selected = this.selected === cableId ? null : cableId;
    this.render();
  }

  onPort(port) {
    if (this.solved) return;

    const occupant = [...this.links].find(([, p]) => p === port);
    if (occupant) { this.links.delete(occupant[0]); this.selected = null; this.render(); return; }

    if (!this.selected) { this.feedback('Elige antes un cable.', 'error'); return; }

    this.links.set(this.selected, port);
    this.selected = null;
    this.render();

    if (this.links.size === CABLES.length) this.attempt(Object.fromEntries(this.links));
  }

  /** Estado de cada regla con el cableado actual: cumplida, rota o pendiente. */
  ruleStates() {
    const at = (id) => this.links.get(id) ?? null;
    const check = (value, ok) => (value === null ? null : ok);

    return [
      check(at('azul'), at('azul') === 1),
      check(at('rojo'), at('rojo') % 2 === 1),
      check(at('verde'), at('verde') === 2 || at('verde') === 4),
      check(at('amarillo'), at('amarillo') !== 4),
    ];
  }

  render() {
    for (const cable of CABLES) {
      const node = this.cableNodes.get(cable.id);
      const port = this.links.get(cable.id);
      node.classList.toggle('lv16__cable--selected', this.selected === cable.id);
      node.classList.toggle('lv16__cable--linked', port !== undefined);
      node.setAttribute('aria-label', port
        ? `Cable ${cable.label}, conectado al ${port}. Púlsalo para desconectar.`
        : `Cable ${cable.label}, sin conectar`);
    }

    for (const port of PORTS) {
      const node = this.portNodes.get(port);
      const taken = [...this.links.values()].includes(port);
      node.classList.toggle('lv16__port--linked', taken);
      node.setAttribute('aria-label', taken ? `Conector ${port}, ocupado` : `Conector ${port}, libre`);
    }

    this.ruleStates().forEach((state, index) => {
      const node = this.ruleNodes[index];
      node.classList.toggle('lv16__rule--met', state === true);
      node.classList.toggle('lv16__rule--broken', state === false);
      node.querySelector('.lv16__mark').textContent =
        state === true ? '✓' : state === false ? '✕' : '·';
    });

    this.drawWires();
  }

  drawWires() {
    if (!this.panel) return;
    const box = this.panel.getBoundingClientRect();
    if (!box.width) return;

    this.wires.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    this.wires.replaceChildren();

    for (const [cableId, port] of this.links) {
      const from = this.cableNodes.get(cableId).getBoundingClientRect();
      const to = this.portNodes.get(port).getBoundingClientRect();
      const color = CABLES.find((cable) => cable.id === cableId).hex;

      const x1 = from.right - box.left;
      const y1 = from.top + from.height / 2 - box.top;
      const x2 = to.left - box.left;
      const y2 = to.top + to.height / 2 - box.top;
      const mid = (x1 + x2) / 2;

      // Curva en S: un cable recto se confundiría con los bordes del panel.
      this.wires.append(svgEl('path', {
        d: `M${x1} ${y1} C${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`,
        stroke: color,
        class: 'lv16__wire',
      }));
    }
  }

  validate(solution) {
    return mappingEquals(solution, SOLUTION);
  }

  onSolved() {
    this.solved = true;
    for (const node of this.cableNodes.values()) node.disabled = true;
    for (const node of this.portNodes.values()) node.disabled = true;
  }

  getPrompt() {
    return 'Cuatro cables, cuatro conectores y cuatro reglas. Sólo hay una forma de cablearlo.';
  }

  getHints() {
    return [
      'Lee todas las reglas antes de conectar nada.',
      'Empieza por la única regla que fija un conector exacto, y mira qué le deja al rojo.',
      'Azul→1, Amarillo→2, Rojo→3, Verde→4.',
    ];
  }

  getState() {
    return { links: Object.fromEntries(this.links) };
  }

  getType() {
    return 'interaccion-logica';
  }
}

export default Level16;
