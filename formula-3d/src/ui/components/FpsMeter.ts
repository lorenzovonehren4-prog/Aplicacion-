import type { RenderStats } from '../../core/render/RenderHost';
import { h } from '../dom';

/** Medidor de rendimiento (Ajustes → Mostrar FPS). Se refresca 4 veces por segundo. */
export class FpsMeter {
  private readonly element: HTMLDivElement;
  private elapsed = 0;

  constructor(parent: HTMLElement) {
    this.element = h('div', { class: 'fps', attrs: { hidden: true, 'aria-hidden': 'true' } });
    parent.appendChild(this.element);
  }

  setVisible(visible: boolean): void {
    this.element.hidden = !visible;
  }

  update(dt: number, fps: number, frameMs: number, stats: RenderStats): void {
    if (this.element.hidden) return;
    this.elapsed += dt;
    if (this.elapsed < 0.25) return;
    this.elapsed = 0;
    const triangles = stats.triangles >= 1000 ? `${Math.round(stats.triangles / 1000)} k` : String(stats.triangles);
    this.element.textContent = `${Math.round(fps)} FPS  ${frameMs.toFixed(1)} ms\n${stats.drawCalls} llamadas  ${triangles} tri`;
  }
}
