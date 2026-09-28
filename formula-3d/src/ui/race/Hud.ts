/**
 * HUD de carrera, estilo transmisión:
 * - arriba a la izquierda, la torre de tiempos: vuelta, tiempo en curso con
 *   delta en vivo, última y mejor vuelta, y los tres sectores coloreados,
 * - arriba a la derecha, el minimapa con las zonas de DRS y el auto,
 * - abajo a la derecha, el tablero: LEDs de cambio, marcha, velocidad,
 *   pedales, DRS y luces de control de tracción y ABS,
 * - al centro, avisos (vuelta anulada, mejor vuelta, sentido contrario).
 *
 * Sólo toca el DOM cuando un valor cambia.
 */

import gsap from 'gsap';
import type { SpeedUnit } from '../../core/save/schema';
import { Disposer } from '../../core/utils/Disposer';
import { formatDelta, formatLapTime } from '../../core/utils/format';
import type { Track } from '../../tracks/Track';
import type { SectorResult } from '../../race/session/LapTimer';
import { h, prefersReducedMotion } from '../dom';

const LED_COUNT = 15;
const SVG_NS = 'http://www.w3.org/2000/svg';

export interface HudState {
  speed: number;
  gear: number;
  /** 0–1 de los LEDs de cambio. */
  shift: number;
  limiter: boolean;
  throttle: number;
  brake: number;
  drs: 'off' | 'available' | 'open';
  tcActive: boolean;
  absActive: boolean;
  lap: number;
  lapTime: number | null;
  lapValid: boolean;
  delta: number | null;
  lastLap: number | null;
  bestLap: number | null;
  personalBest: number | null;
  /** Posición del auto (mundo) para el minimapa. */
  x: number;
  z: number;
  wrongWay: boolean;
}

type MessageTone = 'info' | 'good' | 'bad' | 'best';

/** Escribe texto en un elemento sólo si cambió. */
function setText(element: HTMLElement, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}

function toggle(element: Element, className: string, on: boolean): void {
  if (element.classList.contains(className) !== on) element.classList.toggle(className, on);
}

class Minimap {
  readonly element: HTMLDivElement;
  private readonly car: SVGCircleElement;
  private readonly scale: number;
  private readonly offsetX: number;
  private readonly offsetZ: number;

  constructor(track: Track) {
    const g = track.geometry;
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < g.count; i++) {
      minX = Math.min(minX, g.x[i] ?? 0);
      maxX = Math.max(maxX, g.x[i] ?? 0);
      minZ = Math.min(minZ, g.z[i] ?? 0);
      maxZ = Math.max(maxZ, g.z[i] ?? 0);
    }
    const size = 200;
    const pad = 12;
    this.scale = (size - pad * 2) / Math.max(maxX - minX, maxZ - minZ);
    this.offsetX = pad + ((size - pad * 2) - (maxX - minX) * this.scale) / 2 - minX * this.scale;
    this.offsetZ = pad + ((size - pad * 2) - (maxZ - minZ) * this.scale) / 2 - minZ * this.scale;

    const path = (from: number, to: number): string => {
      const parts: string[] = [];
      const length = g.wrapS(to - from) || g.length;
      for (let d = 0; d <= length; d += 12) {
        const i = g.indexAt(from + d);
        parts.push(`${parts.length === 0 ? 'M' : 'L'}${this.px(g.x[i] ?? 0).toFixed(1)} ${this.pz(g.z[i] ?? 0).toFixed(1)}`);
      }
      return parts.join('');
    };

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.classList.add('minimap__svg');
    const make = (d: string, className: string): SVGPathElement => {
      const element = document.createElementNS(SVG_NS, 'path');
      element.setAttribute('d', d);
      element.setAttribute('class', className);
      svg.append(element);
      return element;
    };
    const full = `${path(0, g.length)}Z`;
    make(full, 'minimap__outline');
    make(full, 'minimap__track');
    for (const zone of track.drsZones) make(path(zone.start, zone.end), 'minimap__drs');

    // Línea de meta.
    const p = { x: 0, z: 0 };
    const t = { x: 0, z: 0 };
    g.pointAt(track.startS, 0, p, t);
    const line = document.createElementNS(SVG_NS, 'line');
    const nx = -t.z * 7;
    const nz = t.x * 7;
    line.setAttribute('x1', String(this.px(p.x) - nx));
    line.setAttribute('y1', String(this.pz(p.z) - nz));
    line.setAttribute('x2', String(this.px(p.x) + nx));
    line.setAttribute('y2', String(this.pz(p.z) + nz));
    line.setAttribute('class', 'minimap__start');
    svg.append(line);

    this.car = document.createElementNS(SVG_NS, 'circle');
    this.car.setAttribute('r', '5');
    this.car.setAttribute('class', 'minimap__car');
    svg.append(this.car);

    this.element = h('div', { class: 'hud__minimap minimap' });
    this.element.append(svg);
  }

  setCar(x: number, z: number): void {
    this.car.setAttribute('cx', this.px(x).toFixed(1));
    this.car.setAttribute('cy', this.pz(z).toFixed(1));
  }

  private px(x: number): number {
    return x * this.scale + this.offsetX;
  }

  private pz(z: number): number {
    return z * this.scale + this.offsetZ;
  }
}

export class Hud {
  readonly root: HTMLDivElement;
  private readonly own = new Disposer();
  private readonly minimap: Minimap;

  // Torre de tiempos.
  private readonly lapLabel = h('span', { class: 'timing__lap' });
  private readonly lapTime = h('span', { class: 'timing__time' });
  private readonly delta = h('span', { class: 'timing__delta' });
  private readonly invalid = h('span', { class: 'timing__invalid', text: 'ANULADA' });
  private readonly lastValue = h('span', { class: 'timing__value' });
  private readonly bestValue = h('span', { class: 'timing__value' });
  private readonly pbValue = h('span', { class: 'timing__value' });
  private readonly sectors: HTMLSpanElement[] = [0, 1, 2].map(() => h('span', { class: 'timing__sector' }));

  // Tablero.
  private readonly leds: HTMLSpanElement[] = [];
  private readonly ledBar = h('div', { class: 'dash__leds' });
  private readonly gear = h('span', { class: 'dash__gear' });
  private readonly speed = h('span', { class: 'dash__speed' });
  private readonly unitLabel = h('span', { class: 'dash__unit' });
  private readonly throttleBar = h('span', { class: 'dash__pedal-fill dash__pedal-fill--throttle' });
  private readonly brakeBar = h('span', { class: 'dash__pedal-fill dash__pedal-fill--brake' });
  private readonly drs = h('span', { class: 'dash__drs', text: 'DRS' });
  private readonly tc = h('span', { class: 'dash__aid', text: 'TC' });
  private readonly abs = h('span', { class: 'dash__aid', text: 'ABS' });

  // Avisos.
  private readonly messages = h('div', { class: 'hud__messages' });
  private readonly wrongWay = h('div', { class: 'hud__wrongway', text: 'SENTIDO CONTRARIO' });
  private readonly cameraLabel = h('div', { class: 'hud__camera' });

  private lastGear = Number.NaN;
  private units: SpeedUnit;

  constructor(track: Track, units: SpeedUnit) {
    this.units = units;
    this.minimap = new Minimap(track);

    for (let i = 0; i < LED_COUNT; i++) {
      const led = h('span', { class: `dash__led dash__led--${i < 5 ? 'green' : i < 10 ? 'red' : 'blue'}` });
      this.leds.push(led);
      this.ledBar.append(led);
    }

    const row = (label: string, value: HTMLElement): HTMLDivElement =>
      h('div', { class: 'timing__row' }, h('span', { class: 'timing__label', text: label }), value);

    const timing = h(
      'div',
      { class: 'hud__timing timing' },
      h('div', { class: 'timing__head' }, this.lapLabel, this.invalid),
      h('div', { class: 'timing__main' }, this.lapTime, this.delta),
      h('div', { class: 'timing__sectors' }, ...this.sectors),
      row('ÚLTIMA', this.lastValue),
      row('MEJOR', this.bestValue),
      row('RÉCORD', this.pbValue),
    );

    const dash = h(
      'div',
      { class: 'hud__dash dash' },
      this.ledBar,
      h(
        'div',
        { class: 'dash__body' },
        h(
          'div',
          { class: 'dash__pedals' },
          h('span', { class: 'dash__pedal' }, this.throttleBar),
          h('span', { class: 'dash__pedal' }, this.brakeBar),
        ),
        this.gear,
        h('div', { class: 'dash__speedo' }, this.speed, this.unitLabel),
      ),
      h('div', { class: 'dash__flags' }, this.drs, this.tc, this.abs),
    );

    this.root = h('div', { class: 'hud' }, timing, this.minimap.element, dash, this.messages, this.wrongWay, this.cameraLabel);
    setText(this.unitLabel, units === 'kmh' ? 'KM/H' : 'MPH');
  }

  setUnits(units: SpeedUnit): void {
    this.units = units;
    setText(this.unitLabel, units === 'kmh' ? 'KM/H' : 'MPH');
  }

  update(state: HudState): void {
    // Tablero.
    const speed = this.units === 'kmh' ? state.speed * 3.6 : state.speed * 2.23694;
    setText(this.speed, String(Math.round(speed)));
    if (state.gear !== this.lastGear) {
      setText(this.gear, state.gear < 0 ? 'R' : state.gear === 0 ? 'N' : String(state.gear));
      if (!Number.isNaN(this.lastGear) && !prefersReducedMotion()) {
        this.own.tween(gsap.fromTo(this.gear, { scale: 1.25 }, { scale: 1, duration: 0.25, ease: 'back.out(3)', overwrite: true }));
      }
      this.lastGear = state.gear;
    }
    const lit = Math.round(Math.max(0, Math.min(1, state.shift)) * LED_COUNT);
    this.leds.forEach((led, i) => toggle(led, 'is-on', i < lit));
    toggle(this.ledBar, 'is-limiter', state.limiter);
    this.throttleBar.style.transform = `scaleY(${state.throttle.toFixed(2)})`;
    this.brakeBar.style.transform = `scaleY(${state.brake.toFixed(2)})`;
    toggle(this.drs, 'is-available', state.drs === 'available');
    toggle(this.drs, 'is-open', state.drs === 'open');
    toggle(this.tc, 'is-active', state.tcActive);
    toggle(this.abs, 'is-active', state.absActive);

    // Tiempos.
    setText(this.lapLabel, state.lap === 0 ? 'VUELTA DE SALIDA' : `VUELTA ${state.lap}`);
    setText(this.lapTime, state.lapTime === null ? '–:––.–––' : formatLapTime(state.lapTime));
    toggle(this.invalid, 'is-visible', state.lap > 0 && !state.lapValid);
    if (state.delta === null) {
      setText(this.delta, '');
      toggle(this.delta, 'is-visible', false);
    } else {
      setText(this.delta, formatDelta(state.delta, 2));
      toggle(this.delta, 'is-visible', true);
      toggle(this.delta, 'is-slower', state.delta > 0);
    }
    setText(this.lastValue, state.lastLap === null ? '–:––.–––' : formatLapTime(state.lastLap));
    setText(this.bestValue, state.bestLap === null ? '–:––.–––' : formatLapTime(state.bestLap));
    setText(this.pbValue, state.personalBest === null ? '–:––.–––' : formatLapTime(state.personalBest));

    this.minimap.setCar(state.x, state.z);
    toggle(this.wrongWay, 'is-visible', state.wrongWay);
  }

  /** Colorea un sector (violeta = mejor de la sesión, amarillo = más lento). */
  setSector(index: number, result: SectorResult | null): void {
    const sector = this.sectors[index];
    if (!sector) return;
    sector.classList.remove('is-best', 'is-slower', 'is-done');
    if (result) sector.classList.add('is-done', result === 'best' ? 'is-best' : 'is-slower');
  }

  clearSectors(): void {
    for (let i = 0; i < this.sectors.length; i++) this.setSector(i, null);
  }

  /** Aviso central que se desvanece solo. */
  message(title: string, detail: string, tone: MessageTone = 'info'): void {
    const element = h(
      'div',
      { class: `hud__message hud__message--${tone}` },
      h('span', { class: 'hud__message-title', text: title }),
      detail ? h('span', { class: 'hud__message-detail', text: detail }) : null,
    );
    this.messages.append(element);
    // Máximo tres avisos a la vez.
    while (this.messages.children.length > 3) this.messages.firstElementChild?.remove();
    const quick = prefersReducedMotion();
    const tl = gsap.timeline({ onComplete: () => element.remove() });
    tl.fromTo(element, { y: 16, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: quick ? 0.01 : 0.35, ease: 'back.out(2)' });
    tl.to(element, { opacity: 0, y: -10, duration: quick ? 0.01 : 0.4, ease: 'power2.in' }, '+=2.4');
    this.own.tween(tl);
  }

  /** Nombre de la cámara al cambiarla. */
  showCamera(label: string): void {
    setText(this.cameraLabel, label);
    this.own.tween(
      gsap.fromTo(
        this.cameraLabel,
        { opacity: 1 },
        { opacity: 0, duration: 0.5, delay: 1.2, ease: 'power2.in', overwrite: true },
      ),
    );
  }

  /** Entrada animada del HUD. */
  reveal(): void {
    const quick = prefersReducedMotion();
    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: quick ? 0.01 : 0.6 } });
    tl.from(this.root.querySelector('.hud__timing'), { x: -60, opacity: 0 }, 0);
    tl.from(this.minimap.element, { x: 60, opacity: 0 }, 0.08);
    tl.from(this.root.querySelector('.hud__dash'), { y: 60, opacity: 0 }, 0.12);
    this.own.tween(tl);
  }

  setVisible(visible: boolean): void {
    toggle(this.root, 'is-hidden', !visible);
  }

  dispose(): void {
    this.own.dispose();
    this.root.remove();
  }
}
