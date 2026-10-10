/**
 * levels/level-07.js — "Interruptores"
 *
 * Tipo:        Lógica clásica
 * Mecánica:    Tres interruptores, una bombilla en otra habitación. Sólo se
 *              puede entrar UNA vez.
 * Interacción: Encender y apagar interruptores, esperar, entrar, mirar la
 *              bombilla y tocarla.
 * Solución:    Encender el 1, esperar a que caliente, apagarlo, encender el 2 y
 *              entrar. Encendida → 2. Apagada y caliente → 1. Apagada y fría → 3.
 *
 * Dos decisiones que hacen que el puzzle sea el puzzle:
 *
 *   1. **Una sola visita.** Sin esa restricción basta con encender uno, mirar,
 *      volver, encender otro… y la tercera variable (el calor) sobra.
 *
 *   2. **El calor no se ve: se toca.** La bombilla apagada se dibuja igual esté
 *      caliente o fría. Hay un botón "tocar la bombilla" dentro de la
 *      habitación. Pintar el calor sería regalar la solución a quien mire la
 *      pantalla; obligar a tocarla convierte la deducción en un gesto.
 *
 * Si el jugador falla, el experimento se reinicia entero. Es lo único honesto:
 * con una sola visita gastada, seguir adivinando entre los dos restantes no
 * sería resolver nada.
 */

import { LevelBase } from './level-base.js';
import { el, svgEl } from '../utils/dom.js';
import { createRng, randInt } from '../utils/math.js';

const SEED = 'mind-escape/level-07';

/** Segundos de encendido acumulados para que la bombilla quede caliente. */
const WARM_THRESHOLD = 6;
/** Tope de calor acumulable, en segundos equivalentes. */
const HEAT_CAP = 20;
/** Ritmo al que se enfría, en segundos de calor por segundo real. */
const COOL_RATE = 0.3;

const TICK_MS = 250;

/** Interruptor que controla la bombilla, 1-based. La usan los niveles 27 y 30. */
export const ANSWER_SWITCH = randInt(createRng(SEED), 0, 2) + 1;

const STYLES = `
.lv07 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--sp-5);
}

.lv07__panel {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--sp-4);
}

.lv07__switch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  width: clamp(96px, 24vw, 124px);
  padding: var(--sp-4) var(--sp-3);
  border-radius: var(--r-md);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  transition: border-color var(--t-base) var(--ease), background var(--t-base) var(--ease);
}

.lv07__switch:hover:not(:disabled) { border-color: var(--accent-line); }
.lv07__switch:disabled { opacity: 0.45; }

.lv07__switch-name {
  font-size: 0.66rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-faint);
}

/* Palanca física: sube y baja, no es un toggle de formulario. */
.lv07__lever {
  position: relative;
  width: 40px;
  height: 66px;
  border-radius: 10px;
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.4);
}

.lv07__lever::after {
  content: '';
  position: absolute;
  left: 4px;
  right: 4px;
  height: 26px;
  border-radius: 7px;
  background: var(--text-faint);
  top: 32px;
  transition: top var(--t-base) var(--ease), background var(--t-base) var(--ease);
}

.lv07__switch[aria-pressed='true'] .lv07__lever { border-color: var(--accent-line); }
.lv07__switch[aria-pressed='true'] .lv07__lever::after {
  top: 4px;
  background: var(--accent);
  box-shadow: 0 0 14px rgba(0, 212, 255, 0.6);
}

.lv07__state {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--text-dim);
}

.lv07__door {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
}

.lv07__warning { font-size: 0.78rem; color: var(--text-faint); }

/* --- Habitación --- */

.lv07__room {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-5);
  border-radius: var(--r-lg);
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.35);
  animation: rise-in var(--t-slow) var(--ease) both;
}

.lv07__bulb { width: 96px; height: 96px; color: var(--text-faint); }
.lv07__bulb--on { color: var(--gold); filter: drop-shadow(0 0 22px rgba(251, 191, 36, 0.55)); }

.lv07__reading {
  font-size: 0.95rem;
  color: var(--text);
  text-align: center;
  min-height: 1.5em;
}

.lv07__answers {
  display: flex;
  gap: var(--sp-3);
  flex-wrap: wrap;
  justify-content: center;
}

.lv07__answer { min-height: 46px; padding: var(--sp-2) var(--sp-4); }

@media (max-width: 480px) {
  .lv07__switch { width: 92px; }
  .lv07__bulb { width: 74px; height: 74px; }
}
`;

export class Level07 extends LevelBase {
  constructor(levelId, container, context) {
    super(levelId, container, context);

    this.correctSwitch = ANSWER_SWITCH - 1;

    this.switches = [false, false, false];
    this.heat = 0;          // segundos de calor acumulados en la bombilla
    this.visited = false;
    this.touched = false;
  }

  init() {
    this.switchButtons = [0, 1, 2].map((index) => {
      const button = el('button.lv07__switch', {
        type: 'button',
        'aria-pressed': 'false',
        'aria-label': `Interruptor ${index + 1}, apagado`,
      }, [
        el('span.lv07__switch-name', { text: `Interruptor ${index + 1}`, 'aria-hidden': 'true' }),
        el('span.lv07__lever', { 'aria-hidden': 'true' }),
        el('span.lv07__state', { text: 'OFF', 'aria-hidden': 'true' }),
      ]);

      this.listen(button, 'click', () => this.toggle(index));
      return button;
    });

    this.doorButton = el('button.btn.btn--primary', {
      type: 'button',
      text: 'Entrar en la habitación',
    });
    this.listen(this.doorButton, 'click', () => this.enterRoom());

    this.doorArea = el('div.lv07__door', {}, [
      this.doorButton,
      el('p.lv07__warning', { text: 'Sólo puedes entrar una vez.' }),
    ]);

    this.roomArea = el('div', { hidden: true });

    this.mount(
      el('style', { text: STYLES }),
      el('div.lv07', {}, [
        el('div.lv07__panel', { role: 'group', 'aria-label': 'Interruptores' }, this.switchButtons),
        this.doorArea,
        this.roomArea,
      ]),
    );

    // El calor se simula en tiempo real: es la única forma de que "esperar"
    // signifique algo dentro del puzzle.
    const tick = setInterval(() => this.updateHeat(), TICK_MS);
    this.disposer.add(() => clearInterval(tick));
  }

  toggle(index) {
    if (this.visited) return;

    this.switches[index] = !this.switches[index];
    const on = this.switches[index];

    const button = this.switchButtons[index];
    button.setAttribute('aria-pressed', String(on));
    button.setAttribute('aria-label', `Interruptor ${index + 1}, ${on ? 'encendido' : 'apagado'}`);
    button.querySelector('.lv07__state').textContent = on ? 'ON' : 'OFF';
  }

  updateHeat() {
    const seconds = TICK_MS / 1000;
    if (this.switches[this.correctSwitch]) {
      this.heat = Math.min(HEAT_CAP, this.heat + seconds);
    } else {
      this.heat = Math.max(0, this.heat - seconds * COOL_RATE);
    }
  }

  enterRoom() {
    if (this.visited) return;
    this.visited = true;

    const isOn = this.switches[this.correctSwitch];
    const isWarm = !isOn && this.heat >= WARM_THRESHOLD;

    for (const button of this.switchButtons) button.disabled = true;
    this.doorArea.hidden = true;

    const bulb = buildBulb(isOn);
    const reading = el('p.lv07__reading', {
      role: 'status',
      'aria-live': 'polite',
      text: isOn ? 'La bombilla está encendida.' : 'La bombilla está apagada.',
    });

    const touchButton = el('button.btn', { type: 'button', text: 'Tocar la bombilla' });
    this.listen(touchButton, 'click', () => {
      this.touched = true;
      touchButton.disabled = true;
      reading.textContent = isOn
        ? 'Está encendida y quema.'
        : isWarm
          ? 'Está apagada, pero todavía está caliente.'
          : 'Está apagada y completamente fría.';
    });

    const answers = el('div.lv07__answers', { role: 'group', 'aria-label': 'Tu respuesta' },
      [0, 1, 2].map((index) => {
        const button = el('button.btn.lv07__answer', {
          type: 'button',
          text: `Era el ${index + 1}`,
        });
        this.listen(button, 'click', () => this.answer(index));
        return button;
      }));

    this.roomArea.hidden = false;
    this.roomArea.replaceChildren(el('div.lv07__room', {}, [
      bulb,
      reading,
      touchButton,
      el('p.lv07__warning', { text: '¿Qué interruptor controla esta bombilla?' }),
      answers,
    ]));

    this.setPrompt('Ya estás dentro. Observa —y toca— antes de decidir.');
  }

  answer(index) {
    if (this.attempt(index)) return;
    // Con la visita gastada, seguir probando no sería deducir: se repite el
    // experimento desde cero.
    this.feedback('No era ése. El experimento vuelve a empezar.', 'error');
    setTimeout(() => this.resetExperiment(), 900);
  }

  resetExperiment() {
    if (this._destroyed) return;

    this.switches = [false, false, false];
    this.heat = 0;
    this.visited = false;
    this.touched = false;

    this.switchButtons.forEach((button, index) => {
      button.disabled = false;
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', `Interruptor ${index + 1}, apagado`);
      button.querySelector('.lv07__state').textContent = 'OFF';
    });

    this.roomArea.hidden = true;
    this.roomArea.replaceChildren();
    this.doorArea.hidden = false;
    this.setPrompt(this.getPrompt());
  }

  validate(solution) {
    return Number(solution) === this.correctSwitch;
  }

  onSolved() {
    for (const button of this.roomArea.querySelectorAll('button')) button.disabled = true;
  }

  getPrompt() {
    return 'Tres interruptores, una bombilla en la habitación de al lado. Sólo puedes entrar una vez.';
  }

  getHints() {
    return [
      'No sólo hay dos estados: encendida y apagada no son las únicas pistas.',
      'Las bombillas generan calor, y el calor tarda en irse.',
      'Enciende el 1 y espera. Apágalo, enciende el 2 y entra: encendida = 2, apagada y caliente = 1, apagada y fría = 3.',
    ];
  }

  getState() {
    return { correctSwitch: this.correctSwitch, visited: this.visited };
  }

  getType() {
    return 'logica-clasica';
  }
}

function buildBulb(isOn) {
  return svgEl('svg', {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 1.5,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    class: `lv07__bulb${isOn ? ' lv07__bulb--on' : ''}`,
    role: 'img',
    'aria-label': isOn ? 'Bombilla encendida' : 'Bombilla apagada',
  }, [
    svgEl('path', { d: 'M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z' }),
    svgEl('path', { d: 'M9 20h6' }),
    svgEl('path', { d: 'M10 23h4' }),
  ]);
}

export default Level07;
