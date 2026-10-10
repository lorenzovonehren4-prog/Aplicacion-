/**
 * levels/shared/keypad.js — Teclado numérico en pantalla.
 *
 * Widget reutilizable: los niveles 2, 8, 11, 15, 27, 29 y 30 piden "introducir
 * un código" y todos merecen el mismo teclado, no siete variantes.
 *
 * Vive en `levels/shared/` y no en `utils/` a propósito: es vocabulario de
 * puzzles, no infraestructura. El núcleo del juego lo ignora por completo.
 */

import { el, icon } from '../../utils/dom.js';

const STYLES = `
.keypad {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-4);
  width: min(300px, 100%);
  margin: 0 auto;
}

.keypad__display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  min-height: 62px;
  width: 100%;
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-md);
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.32);
  font-family: var(--font-mono);
  font-size: 1.9rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

/* Celdas fijas cuando el código tiene longitud conocida. */
.keypad__slot {
  display: grid;
  place-items: center;
  min-width: 1.1em;
  padding-bottom: 0.12em;
  border-bottom: 2px solid var(--glass-border);
  transition: border-color var(--t-base) var(--ease), color var(--t-base) var(--ease);
}

.keypad__slot--filled { border-color: var(--accent-line); }

.keypad__slot--empty { color: var(--text-faint); }

.keypad__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-2);
  width: 100%;
}

.keypad__key {
  display: grid;
  place-items: center;
  min-height: 54px;
  border-radius: var(--r-md);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  font-family: var(--font-mono);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
  transition: background var(--t-fast) var(--ease),
              border-color var(--t-fast) var(--ease),
              transform var(--t-fast) var(--ease);
}

.keypad__key:hover:not(:disabled) {
  background: var(--glass-bg-hover);
  border-color: var(--accent-line);
}

.keypad__key:active:not(:disabled) { transform: scale(0.96); }

.keypad__key:disabled { opacity: 0.35; }

.keypad__key--action { font-size: 1rem; color: var(--text-dim); }

.keypad__key--submit {
  border-color: var(--accent-line);
  background: linear-gradient(180deg, var(--accent-soft), rgba(0, 212, 255, 0.04));
  color: #d6f7ff;
}

.keypad--locked { opacity: 0.55; pointer-events: none; }
`;

/**
 * @param {{
 *   maxLength?: number,
 *   fixedLength?: boolean,   Pinta una celda por dígito (código de longitud conocida)
 *   autoSubmit?: boolean,    Envía solo al completar maxLength
 *   onSubmit: (value:string) => void,
 *   onChange?: (value:string) => void,
 *   placeholderChar?: string
 * }} options
 * @returns {{ element: HTMLElement, getValue: () => string, clear: () => void, lock: () => void }}
 */
export function createKeypad({
  maxLength = 4,
  fixedLength = true,
  autoSubmit = false,
  onSubmit,
  onChange = null,
  placeholderChar = '·',
} = {}) {
  let value = '';

  const display = el('div.keypad__display', {
    role: 'status',
    'aria-live': 'polite',
    'aria-label': 'Código introducido',
  });

  const root = el('div.keypad', {}, [el('style', { text: STYLES }), display]);

  const submitKey = el('button.keypad__key.keypad__key--submit', {
    type: 'button',
    'aria-label': 'Enviar código',
  }, [icon('check', { size: 18 })]);

  const deleteKey = el('button.keypad__key.keypad__key--action', {
    type: 'button',
    'aria-label': 'Borrar último dígito',
    text: '⌫',
  });

  const grid = el('div.keypad__grid');

  const digitKeys = [];
  for (const digit of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) {
    digitKeys.push(makeDigitKey(digit));
  }

  grid.append(...digitKeys.slice(0, 9), deleteKey, makeDigitKey('0'), submitKey);
  root.append(grid);

  function makeDigitKey(digit) {
    const key = el('button.keypad__key', {
      type: 'button',
      text: digit,
      'aria-label': `Dígito ${digit}`,
    });
    key.addEventListener('click', () => push(digit));
    return key;
  }

  function push(digit) {
    if (value.length >= maxLength) return;
    value += digit;
    paint();
    onChange?.(value);
    if (autoSubmit && value.length === maxLength) submit();
  }

  function remove() {
    if (!value) return;
    value = value.slice(0, -1);
    paint();
    onChange?.(value);
  }

  function submit() {
    if (!value) return;
    onSubmit(value);
  }

  deleteKey.addEventListener('click', remove);
  submitKey.addEventListener('click', submit);

  // Teclado físico: escribir con los dedos siempre debe funcionar.
  const onKeydown = (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (/^[0-9]$/.test(event.key)) { event.preventDefault(); push(event.key); }
    else if (event.key === 'Backspace') { event.preventDefault(); remove(); }
    else if (event.key === 'Enter') { event.preventDefault(); submit(); }
  };
  document.addEventListener('keydown', onKeydown);

  function paint() {
    display.replaceChildren();

    if (fixedLength) {
      for (let i = 0; i < maxLength; i += 1) {
        const filled = i < value.length;
        display.append(el('span', {
          class: `keypad__slot${filled ? ' keypad__slot--filled' : ' keypad__slot--empty'}`,
          text: filled ? value[i] : placeholderChar,
        }));
      }
    } else {
      display.append(el('span', {
        class: value ? 'keypad__slot keypad__slot--filled' : 'keypad__slot keypad__slot--empty',
        text: value || placeholderChar,
      }));
    }

    display.setAttribute('aria-label', value ? `Código: ${value.split('').join(' ')}` : 'Sin dígitos');
    submitKey.disabled = value.length === 0;
    for (const key of digitKeys) key.disabled = value.length >= maxLength;
  }

  paint();

  return {
    element: root,
    getValue: () => value,
    clear() { value = ''; paint(); },
    lock() { root.classList.add('keypad--locked'); },
    /** Retira el listener global de teclado. El nivel debe llamarlo en destroy(). */
    destroy() { document.removeEventListener('keydown', onKeydown); },
  };
}

export default createKeypad;
