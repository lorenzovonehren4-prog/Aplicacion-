/**
 * Pantalla de carga del circuito: nombre del Gran Premio y del circuito,
 * trazado dibujándose, datos de la pista, barra de progreso con la etapa real
 * de la construcción y consejos que rotan.
 */

import gsap from 'gsap';
import { Disposer } from '../../core/utils/Disposer';
import { formatLapTime } from '../../core/utils/format';
import { LOADING_TIPS } from '../../data/tips';
import type { Track } from '../../tracks/Track';
import { h, prefersReducedMotion } from '../dom';
import { finished } from '../anim/finished';

const SVG_NS = 'http://www.w3.org/2000/svg';
const TIP_INTERVAL = 5200;

export class LoadingOverlay {
  readonly root: HTMLDivElement;
  private readonly own = new Disposer();
  private readonly fill = h('span', { class: 'loading__fill' });
  private readonly stageText = h('span', { text: 'Preparando…' });
  private readonly stage = h('span', { class: 'loading__stage' }, h('i', { class: 'loading__spinner', attrs: { 'aria-hidden': 'true' } }), this.stageText);
  private readonly percent = h('span', { class: 'loading__percent', text: '0 %' });
  private readonly tip = h('p', { class: 'loading__tip-text' });
  private readonly outline: SVGPathElement;
  private tipIndex: number;
  private progress = { value: 0 };

  constructor(track: Track) {
    const def = track.def;
    this.tipIndex = Math.floor(Math.random() * LOADING_TIPS.length);

    // Trazado a partir de la geometría real, escalado a la caja.
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
    const size = 400;
    const scale = (size - 40) / Math.max(maxX - minX, maxZ - minZ);
    const ox = 20 + (size - 40 - (maxX - minX) * scale) / 2;
    const oz = 20 + (size - 40 - (maxZ - minZ) * scale) / 2;
    const parts: string[] = [];
    for (let s = 0; s < g.length; s += 10) {
      const i = g.indexAt(track.startS + s);
      parts.push(`${parts.length ? 'L' : 'M'}${(ox + ((g.x[i] ?? 0) - minX) * scale).toFixed(1)} ${(oz + ((g.z[i] ?? 0) - minZ) * scale).toFixed(1)}`);
    }
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.classList.add('loading__map');
    const base = document.createElementNS(SVG_NS, 'path');
    base.setAttribute('d', `${parts.join('')}Z`);
    base.setAttribute('class', 'loading__map-base');
    this.outline = document.createElementNS(SVG_NS, 'path');
    this.outline.setAttribute('d', `${parts.join('')}Z`);
    this.outline.setAttribute('class', 'loading__map-line');
    this.outline.setAttribute('pathLength', '1');
    svg.append(base, this.outline);

    const stat = (label: string, value: string): HTMLDivElement =>
      h('div', { class: 'loading__stat' }, h('span', { class: 'loading__stat-value', text: value }), h('span', { class: 'loading__stat-label', text: label }));

    this.root = h(
      'div',
      { class: 'loading', attrs: { role: 'status', 'aria-live': 'polite' } },
      h('div', { class: 'loading__glow' }),
      h(
        'div',
        { class: 'loading__content' },
        h(
          'div',
          { class: 'loading__info' },
          h('span', { class: 'loading__kicker', text: `${def.country.toUpperCase()} · ${def.city}` }),
          h('h1', { class: 'loading__title', text: def.grandPrix }),
          h('h2', { class: 'loading__track', text: def.name }),
          h(
            'div',
            { class: 'loading__stats' },
            stat('Longitud', `${def.lengthKm.toFixed(3)} km`),
            stat('Curvas', String(def.turns)),
            stat(`Récord · ${def.lapRecord.year}`, formatLapTime(def.lapRecord.seconds)),
            stat('Zonas DRS', String(def.drsZones.length)),
          ),
        ),
        svg,
      ),
      h(
        'div',
        { class: 'loading__bottom' },
        h('div', { class: 'loading__tip' }, h('span', { class: 'loading__tip-label', text: 'CONSEJO' }), this.tip),
        h('div', { class: 'loading__progress' }, h('div', { class: 'loading__bar' }, this.fill), h('div', { class: 'loading__meta' }, this.stage, this.percent)),
      ),
    );
    this.showTip(false);
    const timer = setInterval(() => this.showTip(true), TIP_INTERVAL);
    this.own.add(() => clearInterval(timer));
  }

  /**
   * Progreso real (0–1) y etapa en curso. La barra avanza con una transición
   * CSS (no se traba con el hilo principal ocupado); el trazado y el número
   * siguen con GSAP.
   */
  setProgress(value: number, stage: string): void {
    this.stageText.textContent = stage;
    this.fill.style.transform = `scaleX(${value.toFixed(3)})`;
    this.own.tween(
      gsap.to(this.progress, {
        value,
        duration: prefersReducedMotion() ? 0.01 : 0.35,
        ease: 'power2.out',
        overwrite: true,
        onUpdate: () => {
          const v = this.progress.value;
          this.outline.style.strokeDashoffset = String(1 - v);
          this.percent.textContent = `${Math.round(v * 100)} %`;
        },
      }),
    );
  }

  reveal(): void {
    const quick = prefersReducedMotion();
    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: quick ? 0.01 : 0.7 } });
    tl.from(this.root.querySelectorAll('.loading__kicker, .loading__title, .loading__track'), { x: -40, opacity: 0, stagger: 0.08 }, 0);
    tl.from(this.root.querySelectorAll('.loading__stat'), { y: 20, opacity: 0, stagger: 0.06 }, 0.25);
    tl.from(this.root.querySelector('.loading__map'), { scale: 0.9, opacity: 0, duration: quick ? 0.01 : 1 }, 0.1);
    tl.from(this.root.querySelector('.loading__bottom'), { y: 30, opacity: 0 }, 0.3);
    this.own.tween(tl);
  }

  /** Desvanece la pantalla de carga y la quita. */
  async hide(): Promise<void> {
    const tl = gsap.timeline();
    tl.to(this.root.querySelector('.loading__content'), { y: -20, opacity: 0, duration: 0.35, ease: 'power2.in' }, 0);
    tl.to(this.root, { opacity: 0, duration: 0.6, ease: 'power2.inOut' }, 0.15);
    if (prefersReducedMotion()) tl.progress(1);
    this.own.tween(tl);
    await finished(tl);
    this.root.remove();
  }

  dispose(): void {
    this.own.dispose();
    this.root.remove();
  }

  private showTip(animate: boolean): void {
    const text = LOADING_TIPS[this.tipIndex % LOADING_TIPS.length] ?? '';
    this.tipIndex++;
    if (!animate || prefersReducedMotion()) {
      this.tip.textContent = text;
      return;
    }
    const tl = gsap.timeline();
    tl.to(this.tip, { opacity: 0, x: -10, duration: 0.25, ease: 'power2.in' });
    tl.call(() => {
      this.tip.textContent = text;
    });
    tl.fromTo(this.tip, { opacity: 0, x: 10 }, { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' });
    this.own.tween(tl);
  }
}
