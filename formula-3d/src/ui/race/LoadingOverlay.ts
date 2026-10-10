/**
 * Pantalla de carga del circuito: nombre del Gran Premio y del circuito,
 * trazado dibujándose, datos de la pista, tu mejor vuelta con la medalla que
 * sigue, las curvas clave (la más lenta y la rápida que pide frenar), barra de
 * progreso con la etapa real de la construcción y consejos que rotan.
 */

import gsap from 'gsap';
import { Disposer } from '../../core/utils/Disposer';
import { formatLapTime } from '../../core/utils/format';
import { LOADING_TIPS } from '../../data/tips';
import { MEDAL_INFO, medalFor, nextMedal } from '../../progression/medals';
import { CORNER_KIND_LABEL, trackInsight, type CornerInfo } from '../../tracks/insight';
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

  /** @param bestLap tu mejor vuelta en este circuito (null si no tienes) */
  constructor(track: Track, bestLap: number | null = null) {
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
          this.personal(track, bestLap),
          this.keys,
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
    // Las curvas clave se calculan después del primer cuadro (no demoran la aparición).
    const keysTimer = setTimeout(() => this.fillKeys(track), 0);
    this.own.add(() => clearTimeout(keysTimer));
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

  /** Tu mejor vuelta aquí, su medalla y la que sigue. */
  private personal(track: Track, bestLap: number | null): HTMLElement {
    const def = track.def;
    const medal = medalFor(def, bestLap);
    const next = nextMedal(def, bestLap);
    const text =
      bestLap === null
        ? `Todavía no tienes vuelta aquí. ${next ? `Bronce: ${formatLapTime(next.time)}.` : ''}`
        : `Tu mejor vuelta: ${formatLapTime(bestLap)}${medal ? ` (${MEDAL_INFO[medal].label.toLowerCase()})` : ''}. ${next ? `${MEDAL_INFO[next.medal].label}: ${formatLapTime(next.time)}.` : '¡Tienes platino!'}`;
    return h('p', { class: 'loading__personal', style: { '--medal': medal ? MEDAL_INFO[medal].color : '#8a95a8' }, text });
  }

  private readonly keys = h('div', { class: 'loading__keys' });

  /** Curvas clave del circuito (de la guía curva por curva). */
  private fillKeys(track: Track): void {
    let insight: ReturnType<typeof trackInsight>;
    try {
      insight = trackInsight(track.def);
    } catch {
      return;
    }
    const { slowest, fastest } = insight;
    const corner = (label: string, info: CornerInfo | null): HTMLElement | null =>
      info
        ? h(
            'div',
            { class: 'loading__key' },
            h('span', { class: 'loading__key-label', text: label }),
            h('b', { text: `Curva ${info.number} · ${CORNER_KIND_LABEL[info.kind]}` }),
            h('span', { text: `${Math.round(info.minKmh)} km/h en ${info.gear}ª${info.brakingMeters ? ` · frena ${Math.round(info.brakingMeters)} m` : ''}` }),
          )
        : null;
    this.keys.replaceChildren(...[corner('CURVA MÁS LENTA', slowest), corner('LA MÁS RÁPIDA CON FRENADA', fastest)].filter((el): el is HTMLElement => el !== null));
    if (!prefersReducedMotion()) this.own.tween(gsap.from(this.keys.children, { opacity: 0, y: 12, duration: 0.5, stagger: 0.1, ease: 'power3.out' }));
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
