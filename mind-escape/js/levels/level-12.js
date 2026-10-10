/**
 * levels/level-12.js — "Las 8 Pelotas"   ★ PUZZLE ESTRELLA
 *
 * Tipo:        Física simulada + Lógica
 * Mecánica:    Balanza de dos brazos. Ocho pelotas: siete de 10 g y una de 11 g.
 *              Máximo dos pesadas.
 * Interacción: Arrastrar pelotas a cada platillo (o pulsarlas para rotarlas
 *              entre reserva → izquierda → derecha), botón PESAR, y señalar
 *              cuál es la pesada.
 * Solución:    3 vs 3. Si equilibran, la pesada está entre las dos restantes →
 *              1 vs 1. Si no, se toman las 3 del lado pesado → 1 vs 1, y si
 *              equilibran es la tercera.
 *
 * Decisiones que sostienen el puzzle:
 *
 *   · **El límite de dos pesadas se cumple de verdad.** Gastadas las dos, el
 *     botón PESAR se apaga. Sin ese tope no hay puzzle: se pesarían las ocho de
 *     una en una.
 *
 *   · **Fallar reinicia el experimento.** Igual que en el nivel 7: acusar a
 *     ciegas después de gastar las pesadas no es deducir. El contador vuelve a
 *     cero y las pelotas a la reserva.
 *
 *   · **Dos formas de mover una pelota.** Arrastrarla (ratón y dedo, con Pointer
 *     Events) y pulsarla para rotarla de zona. Lo segundo hace el nivel
 *     jugable con teclado, que con sólo arrastre sería imposible.
 */

import { LevelBase } from './level-base.js';
import { el, svgEl } from '../utils/dom.js';
import { createRng, randInt } from '../utils/math.js';

const SEED = 'mind-escape/level-12';
const BALL_COUNT = 8;
const MAX_WEIGHINGS = 2;
const NORMAL_WEIGHT = 10;
const HEAVY_WEIGHT = 11;

/** Zonas por las que rota una pelota al pulsarla. */
const ZONES = ['pool', 'left', 'right'];

/** Pelota que pesa de más. La usan los meta-puzzles de los niveles 27 y 30. */
export const ANSWER_BALL = randInt(createRng(SEED), 1, BALL_COUNT);

const STYLES = `
.lv12 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--sp-4);
  touch-action: none;
}

/* --- Balanza --- */

.lv12__scale { display: grid; place-items: center; }
.lv12__scale svg { width: min(420px, 92%); height: auto; overflow: visible; }

.lv12__beam {
  stroke: hsl(190 60% 62%);
  stroke-width: 3;
  stroke-linecap: round;
  transition: transform 0.7s cubic-bezier(0.34, 1.4, 0.64, 1);
  transform-origin: 100px 30px;
}

.lv12__post { stroke: var(--text-faint); stroke-width: 3; stroke-linecap: round; }
.lv12__pivot { fill: var(--accent); }

/* --- Platillos y reserva --- */

.lv12__zones {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.lv12__zone {
  flex: 1 1 140px;
  min-width: 130px;
  min-height: 92px;
  padding: var(--sp-3);
  border-radius: var(--r-md);
  border: 1px dashed var(--glass-border);
  background: rgba(0, 0, 0, 0.2);
  transition: border-color var(--t-base) var(--ease), background var(--t-base) var(--ease);
}

.lv12__zone--active { border-color: var(--accent-line); background: var(--accent-soft); }

.lv12__zone-name {
  display: block;
  font-size: 0.6rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-faint);
  margin-bottom: var(--sp-2);
  text-align: center;
}

.lv12__balls { display: flex; flex-wrap: wrap; gap: var(--sp-2); justify-content: center; }

.lv12__ball {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--glass-border);
  background: radial-gradient(circle at 35% 30%, rgba(255,255,255,0.16), rgba(255,255,255,0.03));
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  cursor: grab;
  transition: transform var(--t-fast) var(--ease),
              border-color var(--t-base) var(--ease),
              box-shadow var(--t-base) var(--ease);
}

.lv12__ball:hover:not(:disabled) { border-color: var(--accent-line); transform: scale(1.08); }
.lv12__ball:disabled { opacity: 0.45; cursor: default; }

.lv12__ball--dragging { opacity: 0.3; }

.lv12__ghost {
  position: fixed;
  z-index: 200;
  pointer-events: none;
  border-color: var(--accent-line);
  box-shadow: var(--shadow-glow);
  transform: scale(1.12);
}

/* --- Controles --- */

.lv12__controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-4);
  flex-wrap: wrap;
}

.lv12__counter {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--text-dim);
}

.lv12__counter b { color: var(--accent); }
.lv12__counter--spent b { color: var(--error); }

.lv12__accuse {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.lv12__accuse-label {
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-faint);
  width: 100%;
  text-align: center;
}

.lv12__pick {
  min-width: 44px;
  min-height: 44px;
  padding: 0 var(--sp-2);
  border-radius: var(--r-sm);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--text-dim);
  transition: border-color var(--t-base) var(--ease), color var(--t-base) var(--ease);
}

.lv12__pick:hover:not(:disabled) { border-color: var(--error); color: var(--text); }

.lv12__ball--guilty {
  border-color: rgba(34,197,94,0.6);
  background: var(--success-soft);
  color: var(--success);
}

@media (max-width: 520px) {
  /* En columna cada zona ocupa el ancho entero, así que las pelotas pueden
     mantener su tamaño en vez de encogerse por debajo del mínimo táctil. */
  .lv12__zones { flex-direction: column; }
  .lv12__zone { min-width: 0; flex-basis: auto; min-height: 76px; }
}
`;

export class Level12 extends LevelBase {
  constructor(levelId, container, context) {
    super(levelId, container, context);

    this.heavyBall = ANSWER_BALL;

    /** Zona actual de cada pelota (1..8). */
    this.placement = new Map(
      Array.from({ length: BALL_COUNT }, (_, i) => [i + 1, 'pool']),
    );
    this.weighings = 0;
  }

  weightOf(id) {
    return id === this.heavyBall ? HEAVY_WEIGHT : NORMAL_WEIGHT;
  }

  init() {
    this.beam = svgEl('g', { class: 'lv12__beam' }, [
      svgEl('line', { x1: 30, y1: 30, x2: 170, y2: 30 }),
      svgEl('line', { x1: 30, y1: 30, x2: 30, y2: 52 }),
      svgEl('line', { x1: 170, y1: 30, x2: 170, y2: 52 }),
      svgEl('path', { d: 'M10 52 H50 L44 70 H16 Z', fill: 'rgba(0,212,255,0.08)' }),
      svgEl('path', { d: 'M150 52 H190 L184 70 H156 Z', fill: 'rgba(0,212,255,0.08)' }),
    ]);

    const scale = el('div.lv12__scale', {}, [
      svgEl('svg', {
        viewBox: '0 0 200 110',
        role: 'img',
        'aria-label': 'Balanza de dos brazos, equilibrada',
      }, [
        svgEl('line', { x1: 100, y1: 30, x2: 100, y2: 96, class: 'lv12__post' }),
        svgEl('line', { x1: 78, y1: 96, x2: 122, y2: 96, class: 'lv12__post' }),
        this.beam,
        svgEl('circle', { cx: 100, cy: 30, r: 4.5, class: 'lv12__pivot' }),
      ]),
    ]);
    this.scaleSvg = scale.querySelector('svg');

    this.zones = {
      left: this.buildZone('left', 'Platillo izquierdo'),
      pool: this.buildZone('pool', 'Reserva'),
      right: this.buildZone('right', 'Platillo derecho'),
    };

    this.ballNodes = new Map();
    for (let id = 1; id <= BALL_COUNT; id += 1) {
      this.ballNodes.set(id, this.buildBall(id));
    }

    this.weighButton = el('button.btn.btn--primary', { type: 'button', text: 'Pesar' });
    this.listen(this.weighButton, 'click', () => this.weigh());

    this.counter = el('span.lv12__counter', {}, [
      'Pesadas ', el('b', { text: `0 / ${MAX_WEIGHINGS}` }),
    ]);

    this.accuseButtons = Array.from({ length: BALL_COUNT }, (_, i) => {
      const id = i + 1;
      const button = el('button.lv12__pick', { type: 'button', text: String(id),
        'aria-label': `Acusar a la pelota ${id}` });
      this.listen(button, 'click', () => this.accuse(id));
      return button;
    });

    this.mount(
      el('style', { text: STYLES }),
      el('div.lv12', {}, [
        scale,
        el('div.lv12__zones', {}, [this.zones.left.root, this.zones.pool.root, this.zones.right.root]),
        el('div.lv12__controls', {}, [this.counter, this.weighButton]),
        el('div.lv12__accuse', {}, [
          el('span.lv12__accuse-label', { text: '¿Cuál es la pesada?' }),
          ...this.accuseButtons,
        ]),
      ]),
    );

    this.render();
  }

  buildZone(key, name) {
    const balls = el('div.lv12__balls');
    const root = el('div.lv12__zone', { dataset: { zone: key } }, [
      el('span.lv12__zone-name', { text: name }),
      balls,
    ]);
    return { root, balls };
  }

  buildBall(id) {
    const node = el('button.lv12__ball', {
      type: 'button',
      text: String(id),
      dataset: { id: String(id) },
      'aria-label': `Pelota ${id}, en la reserva`,
    });

    // Pulsar rota de zona: es lo que hace el nivel jugable sin ratón.
    this.listen(node, 'click', () => {
      if (this.dragMoved) return;
      const current = this.placement.get(id);
      const next = ZONES[(ZONES.indexOf(current) + 1) % ZONES.length];
      this.placement.set(id, next);
      this.render();
    });

    this.listen(node, 'pointerdown', (event) => this.startDrag(event, id, node));
    return node;
  }

  /* ------------------------------ Arrastre ------------------------------ */

  startDrag(event, id, node) {
    if (this.solved || (event.button !== undefined && event.button !== 0)) return;
    event.preventDefault();

    const rect = node.getBoundingClientRect();
    const ghost = node.cloneNode(true);
    ghost.classList.add('lv12__ghost');
    Object.assign(ghost.style, {
      left: `${rect.left}px`, top: `${rect.top}px`,
      width: `${rect.width}px`, height: `${rect.height}px`,
    });
    document.body.append(ghost);

    node.classList.add('lv12__ball--dragging');
    node.setPointerCapture?.(event.pointerId);

    this.dragMoved = false;
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    const onMove = (moveEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return;
      this.dragMoved = true;
      ghost.style.left = `${moveEvent.clientX - offsetX}px`;
      ghost.style.top = `${moveEvent.clientY - offsetY}px`;
      this.highlightZoneAt(moveEvent.clientX, moveEvent.clientY);
    };

    const onUp = (upEvent) => {
      if (upEvent.pointerId !== event.pointerId) return;
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerup', onUp);
      node.removeEventListener('pointercancel', onUp);
      node.releasePointerCapture?.(event.pointerId);
      node.classList.remove('lv12__ball--dragging');
      ghost.remove();
      this.clearZoneHighlight();

      if (this.dragMoved) {
        const zone = this.zoneAt(upEvent.clientX, upEvent.clientY);
        if (zone) this.placement.set(id, zone);
        this.render();
        // El click sintético que sigue al pointerup no debe rotar la zona.
        setTimeout(() => { this.dragMoved = false; }, 0);
      }
    };

    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerup', onUp);
    node.addEventListener('pointercancel', onUp);
  }

  zoneAt(x, y) {
    for (const [key, zone] of Object.entries(this.zones)) {
      const rect = zone.root.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return key;
    }
    return null;
  }

  highlightZoneAt(x, y) {
    const active = this.zoneAt(x, y);
    for (const [key, zone] of Object.entries(this.zones)) {
      zone.root.classList.toggle('lv12__zone--active', key === active);
    }
  }

  clearZoneHighlight() {
    for (const zone of Object.values(this.zones)) zone.root.classList.remove('lv12__zone--active');
  }

  /* ------------------------------ Pesada -------------------------------- */

  idsIn(zone) {
    return [...this.placement.entries()]
      .filter(([, z]) => z === zone)
      .map(([id]) => id)
      .sort((a, b) => a - b);
  }

  weigh() {
    if (this.weighings >= MAX_WEIGHINGS || this.solved) return;

    const left = this.idsIn('left');
    const right = this.idsIn('right');

    if (!left.length || !right.length) {
      this.feedback('Pon al menos una pelota en cada platillo.', 'error');
      return;
    }
    if (left.length !== right.length) {
      this.feedback('Los platillos deben llevar el mismo número de pelotas.', 'error');
      return;
    }

    this.weighings += 1;

    const sum = (ids) => ids.reduce((total, id) => total + this.weightOf(id), 0);
    const diff = sum(left) - sum(right);

    // En SVG el eje Y crece hacia abajo, así que una rotación positiva sube el
    // brazo izquierdo. El platillo que pesa más tiene que BAJAR: signo negativo
    // cuando pesa la izquierda.
    const tilt = diff === 0 ? 0 : (diff > 0 ? -8 : 8);

    this.beam.style.transform = `rotate(${tilt}deg)`;
    this.scaleSvg.setAttribute('aria-label', diff === 0
      ? 'Balanza equilibrada'
      : `Balanza inclinada hacia la ${diff > 0 ? 'izquierda' : 'derecha'}`);

    this.feedback(
      diff === 0
        ? 'Los dos platillos pesan lo mismo.'
        : `Pesa más el platillo ${diff > 0 ? 'izquierdo' : 'derecho'}.`,
      'info',
    );

    this.render();
  }

  accuse(id) {
    if (this.solved) return;
    if (this.attempt(id)) return;

    this.feedback('No era ésa. El experimento vuelve a empezar.', 'error');
    setTimeout(() => this.resetExperiment(), 900);
  }

  resetExperiment() {
    if (this._destroyed) return;
    for (const id of this.placement.keys()) this.placement.set(id, 'pool');
    this.weighings = 0;
    this.beam.style.transform = 'rotate(0deg)';
    this.render();
    this.setPrompt(this.getPrompt());
  }

  render() {
    for (const zone of Object.values(this.zones)) zone.balls.replaceChildren();

    for (const [id, zone] of this.placement) {
      const node = this.ballNodes.get(id);
      const zoneName = zone === 'left' ? 'el platillo izquierdo'
        : zone === 'right' ? 'el platillo derecho' : 'la reserva';
      node.setAttribute('aria-label', `Pelota ${id}, en ${zoneName}`);
      this.zones[zone].balls.append(node);
    }

    const spent = this.weighings >= MAX_WEIGHINGS;
    this.weighButton.disabled = spent || this.solved;
    this.counter.classList.toggle('lv12__counter--spent', spent);
    this.counter.querySelector('b').textContent = `${this.weighings} / ${MAX_WEIGHINGS}`;
  }

  validate(solution) {
    return Number(solution) === this.heavyBall;
  }

  onSolved() {
    this.solved = true;
    this.weighButton.disabled = true;
    for (const button of this.accuseButtons) button.disabled = true;
    for (const [id, node] of this.ballNodes) {
      node.disabled = true;
      if (id === this.heavyBall) node.classList.add('lv12__ball--guilty');
    }
  }

  getPrompt() {
    return 'Ocho pelotas: siete pesan igual y una pesa un poco más. Sólo puedes usar la balanza dos veces.';
  }

  getHints() {
    return [
      'No necesitas pesarlas todas a la vez.',
      'Divide en grupos de tres: pesa 3 contra 3 y deja dos fuera.',
      'Primera pesada 3 vs 3. Si equilibran, la pesada es una de las dos que dejaste fuera: pésalas 1 vs 1. Si no, coge las tres del lado que bajó y pesa 1 vs 1: si equilibran, es la tercera.',
    ];
  }

  getState() {
    return { heavyBall: this.heavyBall, weighings: this.weighings };
  }

  getType() {
    return 'fisica-logica';
  }
}

export default Level12;
