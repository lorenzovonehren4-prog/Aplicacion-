/**
 * Creación de elementos del DOM tipada y compacta, sin frameworks:
 *
 *   h('button', { class: 'mbtn', on: { click: () => … } }, h('span', { text: 'Hola' }))
 */

export type Child = Node | string | number | null | undefined | false;

export interface ElementProps {
  class?: string;
  text?: string;
  attrs?: Record<string, string | number | boolean>;
  dataset?: Record<string, string>;
  style?: Record<string, string>;
  on?: { [K in keyof HTMLElementEventMap]?: (event: HTMLElementEventMap[K]) => void };
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElementProps = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (props.class) element.className = props.class;
  if (props.text !== undefined) element.textContent = props.text;
  if (props.attrs) {
    for (const [name, value] of Object.entries(props.attrs)) {
      if (value === false) continue;
      element.setAttribute(name, value === true ? '' : String(value));
    }
  }
  if (props.dataset) Object.assign(element.dataset, props.dataset);
  if (props.style) {
    for (const [name, value] of Object.entries(props.style)) element.style.setProperty(name, value);
  }
  if (props.on) {
    for (const [type, handler] of Object.entries(props.on)) {
      element.addEventListener(type, handler as EventListener);
    }
  }
  append(element, ...children);
  return element;
}

export function append(parent: Element, ...children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.append(child instanceof Node ? child : String(child));
  }
}

/**
 * Crea un SVG a partir de marcado propio (íconos del juego, nunca texto del
 * usuario). Devuelve el elemento raíz.
 */
export function svg(markup: string, className = 'icon'): SVGSVGElement {
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  const element = template.content.firstElementChild;
  if (!(element instanceof SVGSVGElement)) throw new Error('Marcado SVG inválido.');
  element.setAttribute('class', className);
  element.setAttribute('aria-hidden', 'true');
  element.setAttribute('focusable', 'false');
  return element;
}

/** ¿El usuario pidió reducir el movimiento? */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
