import type { InputDevice } from '../../core/input/actions';
import { h } from '../dom';

/** Tecla o botón a mostrar en la ayuda de controles. */
export interface HintKey {
  /** Texto de la tecla del teclado ("ENTER", "ESC", "↑↓"…). */
  keyboard: string;
  /** Botón del gamepad: letra (A/B/X/Y), "LB", "RB" o "✚" para la cruceta. */
  gamepad: string;
}

export interface Hint {
  keys: HintKey[];
  label: string;
}

/**
 * Pie de ayudas de controles. Muestra teclas o botones según el último
 * dispositivo usado (el ratón cuenta como teclado).
 */
export class ControlHints {
  readonly element: HTMLDivElement;
  private device: InputDevice = 'keyboard';

  constructor(
    private readonly hints: Hint[],
    device: InputDevice,
  ) {
    this.element = h('div', { class: 'hints' });
    this.setDevice(device);
  }

  setDevice(device: InputDevice): void {
    const next: InputDevice = device === 'gamepad' ? 'gamepad' : 'keyboard';
    if (next === this.device && this.element.childElementCount > 0) return;
    this.device = next;
    this.element.replaceChildren(
      ...this.hints.map((hint) =>
        h('span', { class: 'hint' }, ...hint.keys.map((key) => this.renderKey(key)), h('span', { text: hint.label })),
      ),
    );
  }

  private renderKey(key: HintKey): HTMLElement {
    if (this.device === 'gamepad') {
      const face = /^[ABXY]$/.test(key.gamepad) ? ` key--${key.gamepad.toLowerCase()}` : '';
      const round = key.gamepad.length === 1 ? ' key--pad' : '';
      return h('kbd', { class: `key${round}${face}`, text: key.gamepad });
    }
    return h('kbd', { class: 'key', text: key.keyboard });
  }
}
