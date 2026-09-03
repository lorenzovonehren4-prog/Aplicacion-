/**
 * levels/level-26.js — "Memoria"
 *
 * Tipo:        Memoria
 * Mecánica:    Una secuencia de colores se enciende y se apaga. Hay que
 *              reproducirla.
 * Interacción: Pulsar los colores en el mismo orden.
 * Solución:    Primero, último, primero, último y el del medio.
 *
 * Se puede volver a ver la secuencia tantas veces como se quiera, pero cada
 * repetición borra lo que llevabas introducido. Sin esa condición el nivel se
 * resuelve mirando y pulsando de uno en uno, y deja de ser un nivel de memoria;
 * con ella, sigue sin castigar a nadie —siempre puedes volver a mirar— pero
 * obliga a retener los cinco pasos.
 *
 * Es el único nivel con límite de tiempo (90 s en los metadatos). Agotarlo no
 * hace fallar: sólo topa la puntuación en dos estrellas.
 */

import { LevelBase } from './level-base.js';
import { el } from '../utils/dom.js';
import { sequenceEquals } from '../systems/validation.js';
import * as audio from '../core/audio.js';

const PALETTE = [
  { id: 0, label: 'Rojo', hex: '#ef4444' },
  { id: 1, label: 'Azul', hex: '#38bdf8' },
  { id: 2, label: 'Verde', hex: '#22c55e' },
  { id: 3, label: 'Púrpura', hex: '#a855f7' },
  { id: 4, label: 'Amarillo', hex: '#fbbf24' },
];

/** Primero, último, primero, último, el del medio. */
const SEQUENCE = [0, 4, 0, 4, 2];

const FLASH_MS = 520;
const GAP_MS = 220;

const STYLES = `
.lv26 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: var(--sp-5);
}

.lv26__pads {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.lv26__pad {
  width: clamp(52px, 14vw, 74px);
  aspect-ratio: 1;
  border-radius: var(--r-md);
  border: 2px solid rgba(255, 255, 255, 0.1);
  opacity: 0.34;
  transition: opacity 120ms linear, transform var(--t-fast) var(--ease),
              box-shadow 120ms linear;
}

.lv26__pad:hover:not(:disabled) { opacity: 0.55; }
.lv26__pad:active:not(:disabled) { transform: scale(0.95); }

/* Encendido: el mismo aspecto lo use la secuencia o el jugador. */
.lv26__pad--lit { opacity: 1; box-shadow: 0 0 26px currentColor; }

.lv26__pad:disabled { cursor: default; }

.lv26__slots { display: flex; gap: var(--sp-2); }

.lv26__slot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px dashed var(--glass-border);
  transition: border-color var(--t-base) var(--ease), background var(--t-base) var(--ease);
}

.lv26__slot--filled { border-style: solid; border-color: transparent; }

.lv26__controls { display: flex; gap: var(--sp-3); flex-wrap: wrap; justify-content: center; }

.lv26__state {
  font-size: 0.78rem;
  color: var(--text-faint);
  text-align: center;
  min-height: 1.4em;
}
`;

export class Level26 extends LevelBase {
  constructor(levelId, container, context) {
    super(levelId, container, context);
    this.input = [];
    this.playing = false;
    this.timeouts = [];
  }

  init() {
    this.pads = PALETTE.map((color) => {
      const pad = el('button.lv26__pad', {
        type: 'button',
        'aria-label': color.label,
        style: { background: color.hex, color: color.hex },
      });
      this.listen(pad, 'click', () => this.press(color.id));
      return pad;
    });

    this.slots = SEQUENCE.map((_, i) => el('div.lv26__slot', {
      'aria-label': `Paso ${i + 1}`,
    }));

    this.stateLine = el('p.lv26__state', { role: 'status', 'aria-live': 'polite' });

    this.playButton = el('button.btn.btn--primary', { type: 'button', text: 'Ver la secuencia' });
    this.listen(this.playButton, 'click', () => this.playSequence());

    this.clearButton = el('button.btn.btn--ghost', { type: 'button', text: 'Borrar' });
    this.listen(this.clearButton, 'click', () => { this.input = []; this.render(); });

    this.mount(el('style', { text: STYLES }), el('div.lv26', {}, [
      el('div.lv26__slots', { role: 'group', 'aria-label': 'Tu secuencia' }, this.slots),
      el('div.lv26__pads', { role: 'group', 'aria-label': 'Colores' }, this.pads),
      this.stateLine,
      el('div.lv26__controls', {}, [this.playButton, this.clearButton]),
    ]));

    this.disposer.add(() => this.clearTimers());
    this.render();

    // Se muestra sola nada más entrar: el nivel empieza cuando empieza.
    this.after(600, () => this.playSequence());
  }

  after(ms, fn) {
    const id = setTimeout(() => {
      this.timeouts = this.timeouts.filter((t) => t !== id);
      if (!this._destroyed) fn();
    }, ms);
    this.timeouts.push(id);
    return id;
  }

  clearTimers() {
    for (const id of this.timeouts) clearTimeout(id);
    this.timeouts = [];
  }

  playSequence() {
    if (this.playing || this.solved) return;

    this.playing = true;
    this.input = [];
    this.render();
    this.stateLine.textContent = 'Mira…';

    SEQUENCE.forEach((colorId, step) => {
      const start = step * (FLASH_MS + GAP_MS);
      this.after(start, () => {
        this.pads[colorId].classList.add('lv26__pad--lit');
        audio.play('click');
      });
      this.after(start + FLASH_MS, () => this.pads[colorId].classList.remove('lv26__pad--lit'));
    });

    this.after(SEQUENCE.length * (FLASH_MS + GAP_MS) + 150, () => {
      this.playing = false;
      this.stateLine.textContent = 'Ahora tú.';
      this.render();
    });
  }

  press(colorId) {
    if (this.playing || this.solved) return;
    if (this.input.length >= SEQUENCE.length) return;

    this.input.push(colorId);

    const pad = this.pads[colorId];
    pad.classList.add('lv26__pad--lit');
    this.after(220, () => pad.classList.remove('lv26__pad--lit'));

    this.render();

    if (this.input.length === SEQUENCE.length) {
      const correct = this.attempt([...this.input]);
      if (!correct) {
        this.stateLine.textContent = 'Esa no era. Vuelve a verla si quieres.';
        this.after(700, () => { this.input = []; this.render(); });
      }
    }
  }

  render() {
    this.slots.forEach((slot, i) => {
      const colorId = this.input[i];
      const filled = colorId !== undefined;
      slot.classList.toggle('lv26__slot--filled', filled);
      slot.style.background = filled ? PALETTE[colorId].hex : '';
      slot.setAttribute('aria-label',
        filled ? `Paso ${i + 1}: ${PALETTE[colorId].label}` : `Paso ${i + 1}: vacío`);
    });

    for (const pad of this.pads) pad.disabled = this.playing || Boolean(this.solved);
    this.playButton.disabled = this.playing || Boolean(this.solved);
    this.clearButton.disabled = this.playing || Boolean(this.solved) || this.input.length === 0;
  }

  validate(solution) {
    return sequenceEquals(solution, SEQUENCE);
  }

  onSolved() {
    this.solved = true;
    this.clearTimers();
    this.stateLine.textContent = 'Exacto.';
    this.render();
  }

  onTimeExpired() {
    this.stateLine.textContent = 'Se acabó el tiempo, pero puedes seguir intentándolo.';
  }

  destroy() {
    this.clearTimers();
    super.destroy();
  }

  getPrompt() {
    return 'Cinco colores en un orden. Míralos y repítelos.';
  }

  getHints() {
    return [
      'Concéntrate en el patrón, no en los colores sueltos.',
      'Hay una repetición: dos colores se alternan y luego aparece uno nuevo.',
      'Es el primero, el último, el primero, el último y el del medio.',
    ];
  }

  getState() {
    return { length: SEQUENCE.length };
  }

  getType() {
    return 'memoria';
  }
}

export default Level26;
