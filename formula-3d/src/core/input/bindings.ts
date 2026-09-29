/**
 * Teclas del manejo, reasignables en Ajustes → Controles. Cada acción usa
 * una tecla física (`KeyboardEvent.code`, igual en cualquier distribución).
 * La navegación de los menús (flechas / WASD, Enter, Esc, Q / E) queda fija
 * para que nunca se pueda quedar sin forma de volver.
 */

export const DRIVE_ACTIONS = ['throttle', 'brake', 'left', 'right', 'drs', 'camera', 'reset', 'pause'] as const;
export type DriveAction = (typeof DRIVE_ACTIONS)[number];

export type KeyBindings = Record<DriveAction, string>;

export const DRIVE_ACTION_LABELS: Readonly<Record<DriveAction, string>> = {
  throttle: 'Acelerar',
  brake: 'Frenar',
  left: 'Doblar a la izquierda',
  right: 'Doblar a la derecha',
  drs: 'DRS',
  camera: 'Cambiar cámara',
  reset: 'Volver a la pista',
  pause: 'Pausa',
};

export function createDefaultBindings(): KeyBindings {
  return {
    throttle: 'ArrowUp',
    brake: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    drs: 'KeyD',
    camera: 'KeyC',
    reset: 'KeyR',
    pause: 'KeyP',
  };
}

/** Teclas que no se pueden asignar (Esc siempre pausa y vuelve; las modificadoras no sirven solas). */
const RESERVED = /^(Escape|Tab|Meta(Left|Right)|OSLeft|OSRight|ContextMenu|F\d{1,2})$/;

export function isBindableKey(code: string): boolean {
  return /^[A-Za-z0-9]+$/.test(code) && !RESERVED.test(code);
}

const NAMED: Readonly<Record<string, string>> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Space: 'ESPACIO',
  Enter: 'ENTER',
  NumpadEnter: 'ENTER',
  Backspace: '⌫',
  ShiftLeft: 'SHIFT',
  ShiftRight: 'SHIFT D',
  ControlLeft: 'CTRL',
  ControlRight: 'CTRL D',
  AltLeft: 'ALT',
  AltRight: 'ALT GR',
  CapsLock: 'MAYÚS',
  Comma: ',',
  Period: '.',
  Slash: '-',
  Semicolon: 'Ñ',
  Quote: '´',
  BracketLeft: '`',
  BracketRight: '+',
  Backslash: 'Ç',
  Minus: "'",
  Equal: '¡',
  IntlBackslash: '<',
  Backquote: 'º',
};

/** Nombre corto de una tecla física para la interfaz ("KeyD" → "D", "ArrowUp" → "↑"). */
export function keyLabel(code: string): string {
  const named = NAMED[code];
  if (named) return named;
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `NUM ${code.slice(6)}`;
  return code.toUpperCase();
}
