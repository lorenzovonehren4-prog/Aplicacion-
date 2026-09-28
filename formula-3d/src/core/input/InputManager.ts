/**
 * Entrada: teclado y gamepad → acciones de UI (`UiAction`), más el estado
 * crudo (teclas mantenidas, gamepad activo) que usa el manejo
 * (`race/input/DrivingInput.ts`). Ver PLAN.md §4.7.
 */

import type { InputDevice, UiAction } from './actions';

/** Teclas físicas (`KeyboardEvent.code`) → acción. Independiente de la distribución del teclado. */
const KEY_ACTIONS: Readonly<Record<string, UiAction>> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Enter: 'confirm',
  NumpadEnter: 'confirm',
  Space: 'confirm',
  Escape: 'back',
  Backspace: 'back',
  KeyQ: 'tabPrev',
  KeyE: 'tabNext',
};

/** Acciones que se repiten al mantener la tecla o el botón. */
const REPEATABLE: ReadonlySet<UiAction> = new Set(['up', 'down', 'left', 'right']);

/** Botones del mapeo estándar de la Gamepad API. */
const PAD_BUTTONS: ReadonlyArray<readonly [number, UiAction]> = [
  [0, 'confirm'], // A / Cruz
  [1, 'back'], // B / Círculo
  [4, 'tabPrev'], // LB / L1
  [5, 'tabNext'], // RB / R1
  [12, 'up'],
  [13, 'down'],
  [14, 'left'],
  [15, 'right'],
];

/** Teclas que no cuentan como "pulsa cualquier tecla" (modificadoras y de función). */
const IGNORED_FOR_ANY = /^(Shift|Control|Alt|Meta|CapsLock|Tab|F\d{1,2}|Dead|Unidentified)$/;

const STICK_THRESHOLD = 0.55;
const REPEAT_DELAY_MS = 380;
const REPEAT_INTERVAL_MS = 95;

export type ActionHandler = (action: UiAction) => void;
/** Tecla física pulsada (sin repeticiones automáticas). */
export type KeyHandler = (code: string) => void;

export interface InputManagerOptions {
  /** Devuelve los gamepads conectados (inyectable para pruebas). */
  getGamepads?: () => ReadonlyArray<Gamepad | null>;
}

interface HeldState {
  nextRepeat: number;
}

export class InputManager {
  private readonly actionHandlers = new Set<ActionHandler>();
  private readonly anyInputHandlers = new Set<() => void>();
  private readonly deviceHandlers = new Set<(device: InputDevice) => void>();
  private readonly padHeld = new Map<UiAction, HeldState>();
  private readonly keyHandlers = new Set<KeyHandler>();
  private readonly keysDown = new Set<string>();
  private pad: Gamepad | null = null;
  private readonly getGamepads: () => ReadonlyArray<Gamepad | null>;
  private device: InputDevice = 'keyboard';
  private padConnected = false;

  constructor(
    private readonly target: Window,
    options: InputManagerOptions = {},
  ) {
    this.getGamepads =
      options.getGamepads ??
      (() => {
        if (typeof navigator === 'undefined' || !('getGamepads' in navigator)) return [];
        // Dentro de un iframe sin permiso de gamepad, el navegador lanza SecurityError.
        try {
          return navigator.getGamepads();
        } catch {
          return [];
        }
      });
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('pointerdown', this.onPointer);
    target.addEventListener('pointermove', this.onPointerMove);
    target.addEventListener('blur', this.onBlur);
  }

  /** ¿Está mantenida esta tecla física? */
  isKeyDown(code: string): boolean {
    return this.keysDown.has(code);
  }

  /** Gamepad activo en este fotograma (null si no hay). */
  get gamepad(): Gamepad | null {
    return this.pad;
  }

  /** Escucha pulsaciones de teclas físicas (para atajos del manejo: cámara, DRS…). */
  onKey(handler: KeyHandler): () => void {
    this.keyHandlers.add(handler);
    return () => this.keyHandlers.delete(handler);
  }

  /** Último dispositivo usado (para mostrar las ayudas de controles correctas). */
  get lastDevice(): InputDevice {
    return this.device;
  }

  get gamepadConnected(): boolean {
    return this.padConnected;
  }

  onAction(handler: ActionHandler): () => void {
    this.actionHandlers.add(handler);
    return () => this.actionHandlers.delete(handler);
  }

  /** Cualquier tecla, clic o botón del gamepad ("pulsa cualquier tecla"). */
  onAnyInput(handler: () => void): () => void {
    this.anyInputHandlers.add(handler);
    return () => this.anyInputHandlers.delete(handler);
  }

  onDeviceChange(handler: (device: InputDevice) => void): () => void {
    this.deviceHandlers.add(handler);
    return () => this.deviceHandlers.delete(handler);
  }

  /** Se llama cada fotograma: lee los gamepads. */
  update(now: number = performance.now()): void {
    const pads = this.getGamepads();
    let pad: Gamepad | null = null;
    for (const candidate of pads) {
      if (candidate?.connected) {
        pad = candidate;
        break;
      }
    }
    this.padConnected = pad !== null;
    this.pad = pad;
    if (!pad) {
      this.padHeld.clear();
      return;
    }

    const pressed = new Set<UiAction>();
    for (const [index, action] of PAD_BUTTONS) {
      if (pad.buttons[index]?.pressed) pressed.add(action);
    }
    const x = pad.axes[0] ?? 0;
    const y = pad.axes[1] ?? 0;
    if (Math.abs(x) > STICK_THRESHOLD && Math.abs(x) >= Math.abs(y)) pressed.add(x < 0 ? 'left' : 'right');
    if (Math.abs(y) > STICK_THRESHOLD && Math.abs(y) > Math.abs(x)) pressed.add(y < 0 ? 'up' : 'down');

    // Liberados.
    for (const action of [...this.padHeld.keys()]) {
      if (!pressed.has(action)) this.padHeld.delete(action);
    }
    // Recién pulsados y repeticiones.
    for (const action of pressed) {
      const held = this.padHeld.get(action);
      if (!held) {
        this.padHeld.set(action, { nextRepeat: now + REPEAT_DELAY_MS });
        this.setDevice('gamepad');
        this.emitAny();
        this.emitAction(action);
      } else if (REPEATABLE.has(action) && now >= held.nextRepeat) {
        held.nextRepeat = now + REPEAT_INTERVAL_MS;
        this.emitAction(action);
      }
    }
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('pointerdown', this.onPointer);
    this.target.removeEventListener('pointermove', this.onPointerMove);
    this.target.removeEventListener('blur', this.onBlur);
    this.keyHandlers.clear();
    this.actionHandlers.clear();
    this.anyInputHandlers.clear();
    this.deviceHandlers.clear();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    // Atajos del navegador o del sistema (Ctrl+R, Alt+Tab...) no son del juego.
    if (isTypingTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
    const action = KEY_ACTIONS[event.code];
    this.setDevice('keyboard');
    this.keysDown.add(event.code);
    if (!event.repeat) {
      if (!IGNORED_FOR_ANY.test(event.key)) this.emitAny();
      for (const handler of [...this.keyHandlers]) handler(event.code);
    }
    if (!action) return;
    // Evita que Enter/Espacio "cliqueen" además el botón enfocado, y el scroll con flechas.
    event.preventDefault();
    if (event.repeat && !REPEATABLE.has(action)) return;
    this.emitAction(action);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keysDown.delete(event.code);
    if (isTypingTarget(event.target)) return;
    if (KEY_ACTIONS[event.code]) event.preventDefault();
  };

  /** Al perder el foco la ventana no llegan los keyup: se sueltan todas las teclas. */
  private readonly onBlur = (): void => {
    this.keysDown.clear();
  };

  private readonly onPointer = (): void => {
    this.setDevice('mouse');
    this.emitAny();
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    // Un roce mínimo del ratón no cambia las ayudas de controles.
    if (Math.abs(event.movementX) + Math.abs(event.movementY) > 4) this.setDevice('mouse');
  };

  private emitAction(action: UiAction): void {
    for (const handler of [...this.actionHandlers]) handler(action);
  }

  private emitAny(): void {
    for (const handler of [...this.anyInputHandlers]) handler();
  }

  private setDevice(device: InputDevice): void {
    if (device === this.device) return;
    this.device = device;
    for (const handler of [...this.deviceHandlers]) handler(device);
  }
}

/** ¿El foco está en un campo de texto? (ahí las teclas son para escribir). */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
}
