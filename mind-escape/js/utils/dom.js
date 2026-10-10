/**
 * utils/dom.js — Helpers mínimos de DOM.
 *
 * Sin dependencias. La idea es escribir vistas declarativas sin plantillas de
 * strings, para no perder los listeners ni exponernos a inyección de HTML.
 */

/**
 * Parsea un selector de etiqueta: 'h1#titulo.grande.serif'
 * @returns {{ name: string, id: string|null, classes: string[] }}
 */
function parseTag(selector) {
  const raw = String(selector || 'div');
  const match = raw.match(/^([a-zA-Z][\w-]*)?(#[\w-]+)?((?:\.[\w-]+)*)$/);

  if (!match) return { name: raw, id: null, classes: [] };

  return {
    name: match[1] || 'div',
    id: match[2] ? match[2].slice(1) : null,
    classes: match[3] ? match[3].split('.').filter(Boolean) : [],
  };
}

/**
 * Crea un elemento.
 *
 * @param {string} tag Etiqueta con id y clases opcionales: 'div#main.card.card--lg'
 * @param {Object} [props] Atributos y props. Casos especiales:
 *   - class / className: string
 *   - dataset: objeto de data-*
 *   - style: objeto de estilos
 *   - on: objeto { evento: handler } o { evento: [handler, options] }
 *   - html: innerHTML (sólo para SVG/markup propio, nunca para datos externos)
 *   - text: textContent
 * @param {(Node|string|null|undefined|Array)} [children]
 * @returns {HTMLElement}
 */
export function el(tag, props = {}, children = []) {
  const { name, id, classes } = parseTag(tag);
  const node = document.createElement(name);
  if (id) node.id = id;
  if (classes.length) node.classList.add(...classes);

  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === null || value === undefined || value === false) continue;

    switch (key) {
      case 'class':
      case 'className':
        node.classList.add(...String(value).split(/\s+/).filter(Boolean));
        break;
      case 'dataset':
        Object.assign(node.dataset, value);
        break;
      case 'style':
        Object.assign(node.style, value);
        break;
      case 'on':
        for (const [evt, handler] of Object.entries(value)) {
          const [fn, options] = Array.isArray(handler) ? handler : [handler, undefined];
          node.addEventListener(evt, fn, options);
        }
        break;
      case 'html':
        node.innerHTML = value;
        break;
      case 'text':
        node.textContent = value;
        break;
      default:
        if (key in node && typeof node[key] !== 'object' && !key.startsWith('aria')) {
          node[key] = value;
        } else {
          node.setAttribute(key, value === true ? '' : String(value));
        }
    }
  }

  append(node, children);
  return node;
}

/** Igual que `el` pero en el namespace SVG. */
export function svgEl(tag, props = {}, children = []) {
  const { name, id, classes } = parseTag(tag);
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  if (id) node.id = id;
  if (classes.length) node.classList.add(...classes);

  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'on') {
      for (const [evt, handler] of Object.entries(value)) node.addEventListener(evt, handler);
    } else if (key === 'text') {
      node.textContent = value;
    } else if (key === 'dataset') {
      Object.assign(node.dataset, value);
    } else {
      node.setAttribute(key, value === true ? '' : String(value));
    }
  }

  append(node, children);
  return node;
}

/** Añade hijos (nodos, strings o arrays anidados) a un elemento. */
export function append(parent, children) {
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(parent, child);
    else parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

/** Vacía un elemento sin dejar nodos huérfanos. */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/**
 * Registra un listener y devuelve la función para quitarlo.
 * Útil para que `destroy()` de cada nivel no olvide nada.
 */
export function on(target, event, handler, options) {
  target.addEventListener(event, handler, options);
  return () => target.removeEventListener(event, handler, options);
}

/**
 * Acumulador de limpiezas. Cada nivel/pantalla crea uno y le va empujando
 * los `off` que devuelve `on()`; al destruirse llama a `run()`.
 */
export function createDisposer() {
  const disposals = [];
  return {
    add(...fns) { disposals.push(...fns.filter(Boolean)); },
    run() {
      while (disposals.length) {
        const fn = disposals.pop();
        try { fn(); } catch (err) { console.error('[disposer]', err); }
      }
    },
  };
}

/** Icono SVG inline por nombre. Devuelve un <svg> nuevo en cada llamada. */
export function icon(name, { size = 16, className = '' } = {}) {
  const paths = ICONS[name];
  if (!paths) return el('span');
  const node = svgEl('svg', {
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 1.8,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    focusable: 'false',
    class: className,
  });
  for (const d of paths) node.append(svgEl('path', { d }));
  return node;
}

const ICONS = {
  arrowLeft: ['M19 12H5', 'M12 19l-7-7 7-7'],
  arrowRight: ['M5 12h14', 'M12 5l7 7-7 7'],
  lock: ['M7 11V7a5 5 0 0 1 10 0v4', 'M5 11h14v10H5z'],
  chevronDown: ['M6 9l6 6 6-6'],
  bulb: ['M9 18h6', 'M10 22h4', 'M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z'],
  check: ['M20 6L9 17l-5-5'],
  grid: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  gear: [
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 13.6H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10.4 3V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 17 4.6l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  ],
};

/** Estrella maciza (path cerrado, se rellena con currentColor). */
export function starIcon({ size = 16, className = '' } = {}) {
  return svgEl('svg', {
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    fill: 'currentColor',
    'aria-hidden': 'true',
    focusable: 'false',
    class: className,
  }, [
    svgEl('path', {
      d: 'M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9L12 2.6z',
    }),
  ]);
}

/** Anuncia un texto en la región viva (lectores de pantalla). */
export function announce(message) {
  const region = document.getElementById('live-region');
  if (!region) return;
  region.textContent = '';
  // Reasignar en el siguiente frame fuerza el anuncio aunque el texto repita.
  requestAnimationFrame(() => { region.textContent = message; });
}

/**
 * Reproduce una animación CSS de un solo uso sobre un elemento.
 * Quita la clase al terminar para poder repetirla.
 */
export function playAnimation(node, className, fallbackMs = 600) {
  if (!node) return;
  node.classList.remove(className);
  // Fuerza reflow para reiniciar la animación.
  void node.offsetWidth;
  node.classList.add(className);
  const cleanup = () => node.classList.remove(className);
  node.addEventListener('animationend', cleanup, { once: true });
  setTimeout(cleanup, fallbackMs);
}
