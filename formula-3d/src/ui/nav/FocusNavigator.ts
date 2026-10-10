/**
 * Navegación de interfaz con teclado, gamepad y ratón sincronizados.
 *
 * - Navegación espacial: con una dirección se elige el elemento más cercano en
 *   esa dirección (sirve para listas, grillas y paneles sin configurar nada).
 * - Si no hay nada en esa dirección, en vertical da la vuelta al otro extremo.
 * - Un elemento puede manejar ←/→ por su cuenta (sliders, selectores).
 * - Mover el ratón por encima mueve el foco; el clic confirma.
 */

import type { UiAction } from '../../core/input/actions';
import { Disposer } from '../../core/utils/Disposer';
import { renderedScale } from '../scale';

export interface NavItemOptions {
  onConfirm?(): void;
  onLeft?(): void;
  onRight?(): void;
  /** Al recibir el foco (para actualizar paneles de descripción). */
  onFocus?(): void;
}

export interface NavigatorCallbacks {
  /** El foco cambió por una acción del usuario (sonido de movimiento). */
  onMove?(element: HTMLElement): void;
}

interface Item {
  element: HTMLElement;
  options: NavItemOptions;
  /** Quita los listeners del elemento. */
  release(): void;
}

export class FocusNavigator {
  private readonly items: Item[] = [];
  private current: Item | null = null;
  private enabled = true;

  constructor(private readonly callbacks: NavigatorCallbacks = {}) {}

  get focused(): HTMLElement | null {
    return this.current?.element ?? null;
  }

  /** Registra un elemento navegable. */
  add(element: HTMLElement, options: NavItemOptions = {}): void {
    const own = new Disposer();
    const item: Item = { element, options, release: () => own.dispose() };
    this.items.push(item);
    element.classList.add('nav-item');
    if (!element.hasAttribute('tabindex') && !(element instanceof HTMLButtonElement)) {
      element.tabIndex = -1;
    }
    // Sólo si el ratón de verdad se mueve encima: al abrir una pantalla el
    // cursor quieto puede quedar sobre un elemento y no debe robarle el foco
    // al que la pantalla eligió (con `pointerenter` pasaba).
    own.listen(element, 'pointermove', (event) => {
      if (event.movementX === 0 && event.movementY === 0) return;
      if (this.enabled && this.current !== item) this.setFocus(item, true);
    });
    own.listen(element, 'click', (event) => {
      if (!this.enabled) return;
      event.preventDefault();
      if (this.current !== item) this.setFocus(item, false);
      item.options.onConfirm?.();
    });
  }

  /** Mueve el foco a un elemento (sin sonido si `silent`). */
  focus(element: HTMLElement, silent = true): void {
    const item = this.items.find((candidate) => candidate.element === element);
    if (item) this.setFocus(item, !silent);
  }

  /** Enfoca el primer elemento registrado. */
  focusFirst(): void {
    const first = this.items[0];
    if (first) this.setFocus(first, false);
  }

  /** Mientras está deshabilitado ignora teclado y ratón (p. ej., con otra pantalla encima). */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** Procesa una acción de UI. Devuelve true si la usó. */
  handle(action: UiAction): boolean {
    if (!this.enabled) return false;
    if (!this.current) {
      this.focusFirst();
      return this.current !== null;
    }
    const { options } = this.current;
    switch (action) {
      case 'confirm':
        options.onConfirm?.();
        return options.onConfirm !== undefined;
      case 'left':
        if (options.onLeft) {
          options.onLeft();
          return true;
        }
        return this.move(-1, 0);
      case 'right':
        if (options.onRight) {
          options.onRight();
          return true;
        }
        return this.move(1, 0);
      case 'up':
        return this.move(0, -1);
      case 'down':
        return this.move(0, 1);
      case 'back':
      case 'tabPrev':
      case 'tabNext':
        return false;
    }
  }

  /** Quita todos los elementos (por ejemplo, al cambiar de pestaña). */
  clear(): void {
    for (const item of this.items) {
      item.release();
      item.element.classList.remove('nav-item', 'is-focused');
    }
    this.items.length = 0;
    this.current = null;
  }

  dispose(): void {
    this.clear();
  }

  private setFocus(item: Item, withFeedback: boolean): void {
    if (this.current === item) return;
    this.current?.element.classList.remove('is-focused');
    this.current = item;
    item.element.classList.add('is-focused');
    item.element.focus({ preventScroll: true });
    revealInScrollParent(item.element);
    item.options.onFocus?.();
    if (withFeedback) this.callbacks.onMove?.(item.element);
  }

  /** Busca el mejor candidato en la dirección (dx, dy) desde el elemento actual. */
  private move(dx: number, dy: number): boolean {
    if (!this.current) return false;
    const from = center(this.current.element.getBoundingClientRect());
    let best: Item | null = null;
    let bestScore = Infinity;
    for (const item of this.items) {
      if (item === this.current || !isVisible(item.element)) continue;
      const to = center(item.element.getBoundingClientRect());
      const along = (to.x - from.x) * dx + (to.y - from.y) * dy;
      if (along <= 1) continue;
      const across = Math.abs((to.x - from.x) * dy) + Math.abs((to.y - from.y) * dx);
      // Se prefieren los alineados: el desvío lateral pesa el doble.
      const score = along + across * 2;
      if (score < bestScore) {
        bestScore = score;
        best = item;
      }
    }
    if (!best && dy !== 0) best = this.wrapVertical(from, dy);
    if (!best) return false;
    this.setFocus(best, true);
    return true;
  }

  /** En vertical, sin candidatos: salta al extremo opuesto de la misma columna. */
  private wrapVertical(from: { x: number; y: number }, dy: number): Item | null {
    let best: Item | null = null;
    let bestY = dy > 0 ? Infinity : -Infinity;
    for (const item of this.items) {
      if (item === this.current || !isVisible(item.element)) continue;
      const rect = item.element.getBoundingClientRect();
      if (from.x < rect.left - 40 || from.x > rect.right + 40) continue;
      const y = center(rect).y;
      if ((dy > 0 && y < bestY) || (dy < 0 && y > bestY)) {
        bestY = y;
        best = item;
      }
    }
    return best;
  }
}

/**
 * Si el elemento está dentro de una lista con scroll vertical, la desplaza lo
 * justo para que se vea entero. (No se usa `scrollIntoView`: también movería
 * contenedores con `overflow: hidden` y correría toda la interfaz.)
 */
function revealInScrollParent(element: HTMLElement): void {
  let parent = element.parentElement;
  while (parent) {
    const overflow = getComputedStyle(parent).overflowY;
    if ((overflow === 'auto' || overflow === 'scroll') && parent.scrollHeight > parent.clientHeight) break;
    parent = parent.parentElement;
  }
  if (!parent) return;
  const box = parent.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  // Las medidas vienen en px de pantalla; `scrollTop`, en px de CSS (la interfaz puede estar achicada).
  const scale = renderedScale(parent);
  const margin = 8 * scale;
  if (rect.top < box.top + margin) parent.scrollTop -= (box.top + margin - rect.top) / scale;
  else if (rect.bottom > box.bottom - margin) parent.scrollTop += (rect.bottom - (box.bottom - margin)) / scale;
}

function center(rect: DOMRect): { x: number; y: number } {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function isVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}
