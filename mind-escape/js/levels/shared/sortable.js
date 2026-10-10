/**
 * levels/shared/sortable.js — Lista reordenable por arrastre.
 *
 * La usan los niveles 9 ("Orden") y 19 ("Pesos"). Requisitos que marcaron el
 * diseño:
 *   - Ratón y dedo con el mismo código: Pointer Events, no mouse+touch por
 *     separado.
 *   - Accesible de verdad: cada ficha es un botón y se mueve con las flechas
 *     del teclado. Un puzzle de ordenar que sólo funcione con ratón deja fuera
 *     a demasiada gente.
 *   - Sin dependencias ni librerías de drag & drop.
 *
 * Durante el arrastre se mueve un clon flotante bajo el dedo y la ficha real se
 * reubica en el DOM; así el resto de fichas se recolocan solas con la
 * transición de CSS y no hay que calcular desplazamientos a mano.
 */

import { el } from '../../utils/dom.js';

const STYLES = `
.sortable {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  width: min(360px, 100%);
  margin: 0 auto;
  touch-action: none;
}

.sortable__item {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  min-height: 62px;
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-md);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  color: var(--text);
  cursor: grab;
  text-align: left;
  transition: border-color var(--t-base) var(--ease),
              background var(--t-base) var(--ease),
              box-shadow var(--t-base) var(--ease);
}

.sortable__item:hover { background: var(--glass-bg-hover); border-color: var(--accent-line); }

.sortable__position {
  display: grid;
  place-items: center;
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid var(--glass-border);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-faint);
}

.sortable__label {
  font-family: var(--font-mono);
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.sortable__note { font-size: 0.8rem; color: var(--text-dim); margin-left: auto; }

.sortable__grip {
  margin-left: auto;
  color: var(--text-faint);
  font-size: 1rem;
  letter-spacing: 0.1em;
  line-height: 1;
}

/* Hueco que deja la ficha mientras viaja. */
.sortable__item--source {
  opacity: 0.25;
  border-style: dashed;
}

/* Clon que sigue al dedo. */
.sortable__ghost {
  position: fixed;
  z-index: 200;
  margin: 0;
  pointer-events: none;
  cursor: grabbing;
  border-color: var(--accent-line);
  box-shadow: var(--shadow-soft), var(--shadow-glow);
  transform: scale(1.03);
}

.sortable__item--keyboard {
  border-color: var(--accent-line);
  box-shadow: var(--shadow-glow);
}

@media (prefers-reduced-motion: reduce) {
  .sortable__item { transition: none; }
}
`;

/**
 * @param {{
 *   items: Array<{ id:string, label:string, note?:string }>,
 *   onChange?: (order:string[]) => void
 * }} options
 * @returns {{ element:HTMLElement, getOrder:()=>string[], destroy:()=>void }}
 */
export function createSortable({ items, onChange = null }) {
  const list = el('div.sortable', {
    role: 'listbox',
    'aria-label': 'Lista ordenable. Usa las flechas arriba y abajo para mover cada elemento.',
  });

  const root = el('div', {}, [el('style', { text: STYLES }), list]);

  for (const item of items) list.append(buildItem(item));
  renumber();

  /* ---------------------------------------------------------------- */

  function buildItem({ id, label, note }) {
    const node = el('button.sortable__item', {
      type: 'button',
      role: 'option',
      'aria-selected': 'false',
      dataset: { id },
    }, [
      el('span.sortable__position', { 'aria-hidden': 'true' }),
      el('span.sortable__label', { text: label }),
      note ? el('span.sortable__note', { text: note }) : null,
      el('span.sortable__grip', { 'aria-hidden': 'true', text: '⣿' }),
    ]);

    node.addEventListener('pointerdown', (event) => startDrag(event, node));
    node.addEventListener('keydown', (event) => onItemKeydown(event, node));
    return node;
  }

  /** Renumera las posiciones y actualiza las etiquetas accesibles. */
  function renumber() {
    const nodes = [...list.children];
    nodes.forEach((node, index) => {
      node.querySelector('.sortable__position').textContent = String(index + 1);
      const label = node.querySelector('.sortable__label').textContent;
      node.setAttribute('aria-label', `${label}, posición ${index + 1} de ${nodes.length}`);
    });
  }

  const getOrder = () => [...list.children].map((node) => node.dataset.id);

  function commit() {
    renumber();
    onChange?.(getOrder());
  }

  /* --------------------------- Arrastre --------------------------- */

  let drag = null;

  function startDrag(event, node) {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();

    const rect = node.getBoundingClientRect();
    const ghost = node.cloneNode(true);
    ghost.classList.add('sortable__ghost');
    Object.assign(ghost.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });

    drag = {
      node,
      ghost,
      pointerId: event.pointerId,
      offsetY: event.clientY - rect.top,
      offsetX: event.clientX - rect.left,
      height: rect.height,
      moved: false,
    };

    node.classList.add('sortable__item--source');
    document.body.append(ghost);
    node.setPointerCapture?.(event.pointerId);

    node.addEventListener('pointermove', onDragMove);
    node.addEventListener('pointerup', endDrag);
    node.addEventListener('pointercancel', endDrag);
  }

  function onDragMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.moved = true;

    drag.ghost.style.left = `${event.clientX - drag.offsetX}px`;
    drag.ghost.style.top = `${event.clientY - drag.offsetY}px`;

    // Índice destino a partir de los puntos medios de las demás fichas: es
    // exacto aunque las alturas no sean idénticas.
    const others = [...list.children].filter((child) => child !== drag.node);
    let target = others.length;
    for (let i = 0; i < others.length; i += 1) {
      const rect = others[i].getBoundingClientRect();
      if (event.clientY < rect.top + rect.height / 2) { target = i; break; }
    }

    // Si la referencia ya es la siguiente ficha, la posición no ha cambiado
    // (con `null` significa "ya es la última"): no tocar el DOM.
    const reference = others[target] ?? null;
    if (reference !== drag.node.nextElementSibling) {
      list.insertBefore(drag.node, reference);
      renumber();
    }
  }

  function endDrag(event) {
    if (!drag || (event && event.pointerId !== drag.pointerId)) return;

    const { node, ghost } = drag;
    node.removeEventListener('pointermove', onDragMove);
    node.removeEventListener('pointerup', endDrag);
    node.removeEventListener('pointercancel', endDrag);
    node.releasePointerCapture?.(drag.pointerId);
    node.classList.remove('sortable__item--source');
    ghost.remove();

    const moved = drag.moved;
    drag = null;
    if (moved) commit();
  }

  /* -------------------------- Teclado ----------------------------- */

  function onItemKeydown(event, node) {
    const step = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (!step) return;

    event.preventDefault();
    const nodes = [...list.children];
    const index = nodes.indexOf(node);
    const target = index + step;
    if (target < 0 || target >= nodes.length) return;

    if (step < 0) list.insertBefore(node, nodes[target]);
    else list.insertBefore(node, nodes[target].nextElementSibling);

    node.classList.add('sortable__item--keyboard');
    setTimeout(() => node.classList.remove('sortable__item--keyboard'), 400);
    node.focus();
    commit();
  }

  return {
    element: root,
    getOrder,
    destroy() {
      if (drag) endDrag(null);
    },
  };
}

export default createSortable;
