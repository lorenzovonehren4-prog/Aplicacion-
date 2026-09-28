/**
 * Filas de la pantalla de Ajustes: selector (◀ valor ▶), slider, interruptor y
 * acción. Todas se manejan con ←/→ y Enter (teclado o gamepad) y con el ratón.
 * Cada fila vuelve a leer su valor con `refresh()` (un cambio puede afectar a
 * otras filas: elegir la calidad cambia sombras y postprocesado).
 */

import type { UiSound } from '../../audio/UiSounds';
import type { Disposer } from '../../core/utils/Disposer';
import { formatPercent } from '../../core/utils/format';
import { h, svg } from '../dom';
import { ICONS, type IconName } from '../icons';
import type { FocusNavigator } from '../nav/FocusNavigator';

export interface RowContext {
  nav: FocusNavigator;
  own: Disposer;
  /** Muestra la ayuda de la fila enfocada. */
  showHelp(title: string, text: string): void;
  play(sound: UiSound): void;
}

export interface SettingRow {
  readonly element: HTMLElement;
  /** Vuelve a mostrar el valor guardado (las acciones no tienen valor). */
  refresh?(): void;
}

interface RowBase {
  label: string;
  help: string;
}

function rowShell(label: string, control: HTMLElement, extraClass = ''): HTMLDivElement {
  return h(
    'div',
    { class: `srow ${extraClass}`.trim(), attrs: { role: 'group', 'aria-label': label } },
    h('span', { class: 'srow__label', text: label }),
    h('div', { class: 'srow__control' }, control),
  );
}

// ─── Selector ────────────────────────────────────────────────────────────

export interface SelectorOptions<T> extends RowBase {
  options: ReadonlyArray<{ value: T; label: string }>;
  get(): T;
  set(value: T): void;
}

export function selectorRow<T>(ctx: RowContext, options: SelectorOptions<T>): SettingRow {
  const value = h('span', { class: 'selector__value' });
  const dots = h('span', { class: 'selector__dots' }, ...options.options.map(() => h('i')));
  const prev = h('button', { class: 'selector__arrow', attrs: { type: 'button', 'aria-label': 'Anterior' } }, svg(ICONS.chevronLeft));
  const next = h('button', { class: 'selector__arrow', attrs: { type: 'button', 'aria-label': 'Siguiente' } }, svg(ICONS.chevronRight));
  const control = h('div', { class: 'selector' }, prev, value, next, dots);
  const element = rowShell(options.label, control);

  const indexOf = (): number => Math.max(0, options.options.findIndex((o) => o.value === options.get()));
  const refresh = (): void => {
    const index = indexOf();
    value.textContent = options.options[index]?.label ?? '';
    [...dots.children].forEach((dot, i) => dot.classList.toggle('is-on', i === index));
  };
  const step = (delta: number): void => {
    const count = options.options.length;
    const index = (indexOf() + delta + count) % count;
    const option = options.options[index];
    if (!option) return;
    options.set(option.value);
    ctx.play('tick');
    refresh();
  };

  ctx.own.listen(prev, 'click', (event) => {
    event.stopPropagation();
    ctx.nav.focus(element);
    step(-1);
  });
  ctx.own.listen(next, 'click', (event) => {
    event.stopPropagation();
    ctx.nav.focus(element);
    step(1);
  });
  ctx.nav.add(element, {
    onLeft: () => step(-1),
    onRight: () => step(1),
    onConfirm: () => step(1),
    onFocus: () => ctx.showHelp(options.label, options.help),
  });
  refresh();
  return { element, refresh };
}

// ─── Slider ──────────────────────────────────────────────────────────────

export interface SliderOptions extends RowBase {
  min: number;
  max: number;
  step: number;
  get(): number;
  set(value: number): void;
  format?: (value: number) => string;
}

export function sliderRow(ctx: RowContext, options: SliderOptions): SettingRow {
  const fill = h('span', { class: 'slider__fill' });
  const knob = h('span', { class: 'slider__knob' });
  const track = h('span', { class: 'slider__track' }, fill, knob);
  const value = h('span', { class: 'slider__value' });
  const control = h('div', { class: 'slider' }, track, value);
  const element = rowShell(options.label, control);
  const format = options.format ?? formatPercent;
  const span = options.max - options.min;

  const refresh = (): void => {
    const v = options.get();
    control.style.setProperty('--v', String((v - options.min) / span));
    value.textContent = format(v);
    element.setAttribute('aria-valuenow', String(v));
  };
  const apply = (raw: number): void => {
    const stepped = Math.round((raw - options.min) / options.step) * options.step + options.min;
    const clamped = Math.min(options.max, Math.max(options.min, Number(stepped.toFixed(4))));
    if (clamped === options.get()) return;
    options.set(clamped);
    ctx.play('tick');
    refresh();
  };

  // Arrastre con el ratón sobre la barra.
  let dragging = false;
  const fromPointer = (event: PointerEvent): void => {
    const rect = track.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    apply(options.min + t * span);
  };
  ctx.own.listen(track, 'pointerdown', (event) => {
    dragging = true;
    track.setPointerCapture(event.pointerId);
    ctx.nav.focus(element);
    fromPointer(event);
  });
  ctx.own.listen(track, 'pointermove', (event) => {
    if (dragging) fromPointer(event);
  });
  ctx.own.listen(track, 'pointerup', () => {
    dragging = false;
  });
  ctx.own.listen(track, 'click', (event) => event.stopPropagation());

  ctx.nav.add(element, {
    onLeft: () => apply(options.get() - options.step),
    onRight: () => apply(options.get() + options.step),
    onFocus: () => ctx.showHelp(options.label, options.help),
  });
  element.setAttribute('aria-valuemin', String(options.min));
  element.setAttribute('aria-valuemax', String(options.max));
  refresh();
  return { element, refresh };
}

// ─── Interruptor ─────────────────────────────────────────────────────────

export interface ToggleOptions extends RowBase {
  get(): boolean;
  set(value: boolean): void;
}

export function toggleRow(ctx: RowContext, options: ToggleOptions): SettingRow {
  const text = h('span', { class: 'toggle__text' });
  const control = h('div', { class: 'toggle' }, h('span', { class: 'toggle__pill' }), text);
  const element = rowShell(options.label, control);

  const refresh = (): void => {
    const on = options.get();
    control.classList.toggle('is-on', on);
    text.textContent = on ? 'SÍ' : 'NO';
    element.setAttribute('aria-checked', String(on));
  };
  const setTo = (on: boolean): void => {
    if (on === options.get()) return;
    options.set(on);
    ctx.play('tick');
    refresh();
  };

  ctx.nav.add(element, {
    onLeft: () => setTo(false),
    onRight: () => setTo(true),
    onConfirm: () => setTo(!options.get()),
    onFocus: () => ctx.showHelp(options.label, options.help),
  });
  element.setAttribute('role', 'switch');
  refresh();
  return { element, refresh };
}

// ─── Acción ──────────────────────────────────────────────────────────────

export interface ActionOptions extends RowBase {
  icon: IconName;
  run(): void;
}

export function actionRow(ctx: RowContext, options: ActionOptions): SettingRow {
  const element = h(
    'div',
    { class: 'srow srow--action', attrs: { role: 'button' } },
    svg(ICONS[options.icon]),
    h('span', { class: 'srow__label', text: options.label }),
  );
  ctx.nav.add(element, {
    onConfirm: () => {
      options.run();
      ctx.play('confirm');
    },
    onFocus: () => ctx.showHelp(options.label, options.help),
  });
  return { element };
}
