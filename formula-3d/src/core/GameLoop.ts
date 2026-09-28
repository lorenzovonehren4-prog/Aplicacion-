/**
 * Bucle principal. Ver PLAN.md §4.3.
 *
 * - `fixedUpdate(step)`: simulación a paso fijo (120 Hz). Determinista e igual a
 *   cualquier FPS. Máximo 8 pasos por fotograma para no entrar en espiral si el
 *   equipo no da abasto.
 * - `update(dt, alpha)`: lógica por fotograma; `alpha` (0–1) es cuánto se avanzó
 *   hacia el próximo paso fijo, para interpolar lo que se dibuja.
 * - `render()`: dibujo.
 */

import type { FpsTarget } from './render/quality';

export interface LoopCallbacks {
  fixedUpdate?(step: number): void;
  update(dt: number, alpha: number): void;
  render(): void;
}

export interface LoopScheduler {
  request(callback: (time: number) => void): number;
  cancel(handle: number): void;
}

const browserScheduler: LoopScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
};

export const FIXED_STEP = 1 / 120;
const MAX_STEPS_PER_FRAME = 8;
/** dt máximo: al volver de otra pestaña no hay un salto enorme. */
const MAX_DT = 0.1;
/** Tolerancia al limitar FPS (los timestamps de rAF tienen algo de ruido). */
const LIMIT_TOLERANCE_MS = 1.5;
const FPS_WINDOW_MS = 500;

export class GameLoop {
  private handle: number | null = null;
  private lastTime: number | null = null;
  private lastFrameTime: number | null = null;
  private accumulator = 0;
  private minFrameMs = 0;

  private framesInWindow = 0;
  private windowStart: number | null = null;
  private frameMsSum = 0;
  private measuredFps = 0;
  private measuredFrameMs = 0;

  constructor(
    private readonly callbacks: LoopCallbacks,
    private readonly scheduler: LoopScheduler = browserScheduler,
  ) {}

  get running(): boolean {
    return this.handle !== null;
  }

  /** FPS medidos en la última ventana de medio segundo. */
  get fps(): number {
    return this.measuredFps;
  }

  /** Tiempo medio entre fotogramas dibujados (ms). */
  get frameMs(): number {
    return this.measuredFrameMs;
  }

  /** Limita los fotogramas dibujados (0 = sin límite: lo que dé el monitor). */
  setFpsTarget(target: FpsTarget): void {
    this.minFrameMs = target > 0 ? 1000 / target : 0;
  }

  start(): void {
    if (this.handle !== null) return;
    this.lastTime = null;
    this.lastFrameTime = null;
    this.handle = this.scheduler.request(this.onFrame);
  }

  stop(): void {
    if (this.handle !== null) this.scheduler.cancel(this.handle);
    this.handle = null;
  }

  private readonly onFrame = (time: number): void => {
    this.handle = this.scheduler.request(this.onFrame);
    this.frame(time);
  };

  /** Procesa un fotograma con el timestamp de rAF (ms). Público para las pruebas. */
  frame(time: number): void {
    // Límite de FPS: si todavía no toca dibujar, se espera al próximo rAF.
    if (this.minFrameMs > 0 && this.lastFrameTime !== null) {
      const sinceLast = time - this.lastFrameTime;
      if (sinceLast < this.minFrameMs - LIMIT_TOLERANCE_MS) return;
      // Se conserva lo que se pasó del intervalo para no derivar hacia menos FPS de los pedidos.
      const overshoot = Math.min(Math.max(0, sinceLast - this.minFrameMs), this.minFrameMs * 0.5);
      this.lastFrameTime = time - overshoot;
    } else {
      this.lastFrameTime = time;
    }

    const dt = this.lastTime === null ? 0 : Math.min(MAX_DT, Math.max(0, (time - this.lastTime) / 1000));
    this.lastTime = time;

    if (this.callbacks.fixedUpdate) {
      this.accumulator += dt;
      let steps = 0;
      while (this.accumulator >= FIXED_STEP && steps < MAX_STEPS_PER_FRAME) {
        this.callbacks.fixedUpdate(FIXED_STEP);
        this.accumulator -= FIXED_STEP;
        steps++;
      }
      // Si se tocó el máximo, se descarta el atraso (la simulación va más lenta, no a saltos).
      if (steps === MAX_STEPS_PER_FRAME) this.accumulator = Math.min(this.accumulator, FIXED_STEP);
    }

    const alpha = this.callbacks.fixedUpdate ? this.accumulator / FIXED_STEP : 1;
    this.callbacks.update(dt, alpha);
    this.callbacks.render();
    this.measure(time, dt);
  }

  private measure(time: number, dt: number): void {
    if (this.windowStart === null) {
      this.windowStart = time;
      return;
    }
    this.framesInWindow++;
    this.frameMsSum += dt * 1000;
    const elapsed = time - this.windowStart;
    if (elapsed >= FPS_WINDOW_MS) {
      this.measuredFps = (this.framesInWindow * 1000) / elapsed;
      this.measuredFrameMs = this.frameMsSum / this.framesInWindow;
      this.framesInWindow = 0;
      this.frameMsSum = 0;
      this.windowStart = time;
    }
  }
}
