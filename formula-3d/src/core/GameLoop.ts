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
const MAX_STEPS_PER_FRAME = 12;
/** dt máximo: al volver de otra pestaña no hay un salto enorme. */
const MAX_DT = 0.1;
/** Tolerancia al limitar FPS (los timestamps de rAF tienen algo de ruido). */
const LIMIT_TOLERANCE_MS = 1.5;
const FPS_WINDOW_MS = 500;
/** Ruido máximo de los tiempos de rAF que se alisa (ms) y cuánto se devuelve por cuadro. */
const SNAP_TOLERANCE_MS = 4;
const SNAP_PAYBACK_MS = 0.1;
/** Lo máximo que el reloj del juego se separa del real al alisar (ms). */
const SNAP_MAX_DEBT_MS = 8;

export class GameLoop {
  private handle: number | null = null;
  private lastTime: number | null = null;
  private lastFrameTime: number | null = null;
  /** Último rAF (dibujado o no) y período medido del monitor (ms). */
  private lastRafTime: number | null = null;
  private refreshMs = 0;
  private accumulator = 0;
  /** Diferencia guardada entre el tiempo real y el ajustado al monitor (ms, ver `snap`). */
  private timeDebt = 0;
  private minFrameMs = 0;
  /**
   * Velocidad del tiempo del juego (1 = normal; menos = cámara lenta). Afecta
   * a la simulación y al `dt` de `update`; el menú y las medidas usan tiempo real.
   */
  timeScale = 1;

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
    this.lastRafTime = null;
    this.timeDebt = 0;
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
    // Período del monitor: promedio suave del tiempo entre rAF (sin los saltos
    // de una pestaña oculta o un cuadro muy lento).
    if (this.lastRafTime !== null) {
      const delta = time - this.lastRafTime;
      if (delta > 2 && delta < 50) this.refreshMs = this.refreshMs === 0 ? delta : this.refreshMs + (delta - this.refreshMs) * 0.05;
    }
    this.lastRafTime = time;
    // Límite de FPS con ritmo parejo: se dibuja uno de cada N cuadros del
    // monitor (N fijo), nunca una mezcla de 2 y 3 que se ve a saltos. Con
    // 60 FPS pedidos: 60 Hz → todos, 120 Hz → 1 de 2, 144 Hz → 1 de 2 (72 FPS).
    if (this.minFrameMs > 0 && this.lastFrameTime !== null) {
      const refresh = this.refreshMs > 0 ? this.refreshMs : this.minFrameMs;
      const every = Math.max(1, Math.floor((this.minFrameMs + LIMIT_TOLERANCE_MS) / refresh));
      const sinceLast = time - this.lastFrameTime;
      // Si el monitor no pasa del objetivo (60 Hz con 60 pedidos) no hay nada que limitar:
      // saltear un cuadro que llegó un poco antes (Firefox da tiempos irregulares) era un tirón.
      if (every > 1 && sinceLast < every * refresh - LIMIT_TOLERANCE_MS) return;
      this.lastFrameTime = time;
    } else {
      this.lastFrameTime = time;
    }

    const realDt = this.lastTime === null ? 0 : Math.min(MAX_DT, Math.max(0, this.snap(time - this.lastTime) / 1000));
    this.lastTime = time;
    const dt = realDt * Math.max(0, this.timeScale);

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
    this.measure(time, realDt);
  }

  /**
   * Tiempo entre cuadros ajustado al monitor: la pantalla muestra los cuadros
   * a intervalos exactos, pero los tiempos de rAF traen ruido (±1–2 ms en
   * algunos navegadores). Si el auto se mueve según el ruido, se ve a
   * saltitos aunque no se pierda ningún cuadro. Cuando la diferencia con un
   * múltiplo del período del monitor es sólo ruido se usa el período, y lo
   * que sobra se guarda y se devuelve de a poco: el reloj del juego nunca se
   * separa del real más de un par de milisegundos.
   * @param deltaMs tiempo medido desde el cuadro anterior (ms)
   */
  private snap(deltaMs: number): number {
    const refresh = this.refreshMs;
    if (refresh <= 0) return deltaMs;
    const ideal = Math.round(deltaMs / refresh) * refresh;
    if (ideal <= 0 || Math.abs(deltaMs - ideal) > Math.min(SNAP_TOLERANCE_MS, refresh * 0.4)) {
      // Un salto de verdad (un cuadro perdido, la pestaña oculta): se usa tal cual.
      const total = deltaMs + this.timeDebt;
      this.timeDebt = 0;
      return total;
    }
    this.timeDebt += deltaMs - ideal;
    // Si lo guardado crece, el período estimado no es el de verdad (cambió el monitor,
    // una racha de cuadros perdidos): se devuelve todo de una vez.
    if (Math.abs(this.timeDebt) > SNAP_MAX_DEBT_MS) {
      const total = ideal + this.timeDebt;
      this.timeDebt = 0;
      return total;
    }
    // Lo acumulado vuelve de a un poco por cuadro (si no, se correría el reloj).
    const payback = Math.max(-SNAP_PAYBACK_MS, Math.min(SNAP_PAYBACK_MS, this.timeDebt));
    this.timeDebt -= payback;
    return ideal + payback;
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
