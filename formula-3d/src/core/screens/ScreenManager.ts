import type { UiAction } from '../input/actions';
import { canGoTo, canPush, SCREEN_FLOW, type FlowTable, type ScreenId } from './flow';
import type { Screen } from './Screen';

/** Transición que tapa y destapa la pantalla durante un `goTo`. */
export interface TransitionPlayer {
  cover(): Promise<void>;
  reveal(): Promise<void>;
}

/**
 * Tiempo máximo que se espera a una animación (transición, salida de una
 * pantalla). Es una red de seguridad: si una animación falla y nunca avisa que
 * terminó, el juego sigue en vez de quedar trabado.
 */
export const ANIMATION_TIMEOUT_MS = 4000;

function settleWithin(promise: Promise<void> | undefined, ms: number): Promise<void> {
  if (!promise) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    promise.then(
      () => {
        clearTimeout(timer);
        resolve();
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/** Transición instantánea (pruebas y arranque). */
export const INSTANT_TRANSITION: TransitionPlayer = {
  cover: () => Promise.resolve(),
  reveal: () => Promise.resolve(),
};

export interface ScreenChange {
  from: ScreenId | null;
  to: ScreenId;
  kind: 'goTo' | 'push' | 'pop';
  stack: readonly ScreenId[];
}

export interface ScreenManagerOptions {
  /** Contenedor donde se montan las raíces de las pantallas. */
  host: HTMLElement;
  transition?: TransitionPlayer;
  flow?: FlowTable;
  /**
   * Pantalla de rescate: si una pantalla falla al entrar y la pila queda vacía,
   * se entra a ésta (sin parámetros) para que el juego nunca quede en negro.
   */
  fallback?: ScreenId;
  /** Tope de espera para animaciones (por defecto `ANIMATION_TIMEOUT_MS`). */
  animationTimeoutMs?: number;
  onChange?(change: ScreenChange): void;
  onError?(error: unknown): void;
}

type Request =
  | { kind: 'goTo'; id: ScreenId; params: unknown; resolve: (ok: boolean) => void }
  | { kind: 'push'; id: ScreenId; params: unknown; resolve: (ok: boolean) => void }
  | { kind: 'pop'; resolve: (ok: boolean) => void };

/**
 * Máquina de estados de pantallas basada en una pila.
 *
 * - Valida cada cambio contra la tabla de flujo (`flow.ts`).
 * - Nunca corre dos cambios a la vez: si llega uno mientras otro está en curso,
 *   queda pendiente y sólo el último pendiente se ejecuta (los anteriores se
 *   resuelven con `false`).
 * - Las promesas se resuelven con `true` si el cambio se hizo y `false` si no
 *   (transición inválida, pantalla no registrada, error al entrar o reemplazada
 *   por otra petición). Nunca se rechazan: los errores van a `onError`.
 */
export class ScreenManager<Params extends object> {
  private readonly factories = new Map<ScreenId, () => Screen<unknown>>();
  private readonly stack: Screen<unknown>[] = [];
  private readonly transition: TransitionPlayer;
  private readonly flow: FlowTable;
  private readonly animationTimeout: number;
  private busy = false;
  private pending: Request | null = null;

  constructor(private readonly options: ScreenManagerOptions) {
    this.transition = options.transition ?? INSTANT_TRANSITION;
    this.flow = options.flow ?? SCREEN_FLOW;
    this.animationTimeout = options.animationTimeoutMs ?? ANIMATION_TIMEOUT_MS;
  }

  /** Registra la fábrica de una pantalla. */
  register<K extends keyof Params & ScreenId>(id: K, factory: () => Screen<Params[K]>): void {
    this.factories.set(id, factory);
  }

  /** ¿Existe (está implementada) esta pantalla? */
  has(id: ScreenId): boolean {
    return this.factories.has(id);
  }

  get top(): Screen<unknown> | undefined {
    return this.stack[this.stack.length - 1];
  }

  get currentId(): ScreenId | null {
    return this.top?.id ?? null;
  }

  /** Identificadores de la pila, de abajo hacia arriba. */
  get stackIds(): readonly ScreenId[] {
    return this.stack.map((screen) => screen.id);
  }

  get isBusy(): boolean {
    return this.busy;
  }

  /** Reemplaza toda la pila por la pantalla `id` (con transición de barrido). */
  goTo<K extends keyof Params & ScreenId>(id: K, params: Params[K]): Promise<boolean> {
    return this.request((resolve) => ({ kind: 'goTo', id, params, resolve }));
  }

  /** Apila la pantalla `id` sobre la actual, que sigue viva debajo. */
  push<K extends keyof Params & ScreenId>(id: K, params: Params[K]): Promise<boolean> {
    return this.request((resolve) => ({ kind: 'push', id, params, resolve }));
  }

  /** Cierra la pantalla de arriba y vuelve a la anterior. */
  pop(): Promise<boolean> {
    return this.request((resolve) => ({ kind: 'pop', resolve }));
  }

  /** ¿Se podría hacer `goTo(id)` ahora mismo? (sirve para habilitar botones) */
  canGoTo(id: ScreenId): boolean {
    return this.has(id) && canGoTo(this.flow, this.currentId, id);
  }

  /** ¿Se podría hacer `push(id)` ahora mismo? */
  canPush(id: ScreenId): boolean {
    return this.has(id) && canPush(this.flow, this.currentId, id);
  }

  /** Actualiza todas las pantallas de la pila (la de abajo puede seguir animando su 3D). */
  update(dt: number): void {
    for (const screen of this.stack) screen.update?.(dt);
  }

  /** Entrega una acción de UI a la pantalla de arriba (se ignora durante un cambio). */
  dispatch(action: UiAction): void {
    if (this.busy) return;
    this.top?.onAction?.(action);
  }

  /** Cierra todas las pantallas sin transición (al apagar el juego). */
  async destroy(): Promise<void> {
    this.pending?.resolve(false);
    this.pending = null;
    while (this.stack.length > 0) {
      const screen = this.stack.pop();
      if (screen) await this.safeExit(screen);
    }
  }

  // ─── Cola de peticiones ────────────────────────────────────────────────

  private request(build: (resolve: (ok: boolean) => void) => Request): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const request = build(resolve);
      if (this.busy) {
        // Sólo cuenta el último pedido: el anterior pendiente se descarta.
        this.pending?.resolve(false);
        this.pending = request;
        return;
      }
      void this.run(request);
    });
  }

  private async run(request: Request): Promise<void> {
    this.busy = true;
    let ok = false;
    try {
      ok = await this.execute(request);
    } catch (error) {
      this.options.onError?.(error);
    } finally {
      this.busy = false;
      request.resolve(ok);
      const next = this.pending;
      this.pending = null;
      if (next) void this.run(next);
    }
  }

  private execute(request: Request): Promise<boolean> {
    switch (request.kind) {
      case 'goTo':
        return this.executeGoTo(request.id, request.params);
      case 'push':
        return this.executePush(request.id, request.params);
      case 'pop':
        return this.executePop();
    }
  }

  // ─── Operaciones ───────────────────────────────────────────────────────

  private async executeGoTo(id: ScreenId, params: unknown): Promise<boolean> {
    const from = this.currentId;
    if (!canGoTo(this.flow, from, id)) {
      this.reportInvalid('goTo', from, id);
      return false;
    }
    const factory = this.factories.get(id);
    if (!factory) {
      this.reportMissing(id);
      return false;
    }

    // La primera pantalla aparece sin barrido: tiene su propia entrada desde negro.
    const transition = from === null ? INSTANT_TRANSITION : this.transition;
    await settleWithin(transition.cover(), this.animationTimeout);
    try {
      // Salen todas las pantallas de la pila, de arriba hacia abajo.
      while (this.stack.length > 0) {
        const old = this.stack.pop();
        if (old) await this.safeExit(old);
      }

      try {
        await this.enterFresh(id, factory, params);
      } catch (error) {
        this.options.onError?.(error);
        await this.enterFallback(id);
        return false;
      }
      this.options.onChange?.({ from, to: id, kind: 'goTo', stack: this.stackIds });
      this.top?.reveal?.();
      return true;
    } finally {
      // Pase lo que pase, la pantalla no queda tapada.
      await settleWithin(transition.reveal(), this.animationTimeout);
    }
  }

  /** Crea una pantalla, la monta y la deja arriba de la pila. */
  private async enterFresh(id: ScreenId, factory: () => Screen<unknown>, params: unknown): Promise<void> {
    const next = factory();
    this.options.host.appendChild(next.root);
    try {
      await next.enter(params);
    } catch (error) {
      await this.safeExit(next);
      throw new Error(`La pantalla "${id}" falló al entrar.`, { cause: error });
    }
    this.stack.push(next);
  }

  /** Tras un fallo con la pila vacía, entra a la pantalla de rescate. */
  private async enterFallback(failedId: ScreenId): Promise<void> {
    const fallbackId = this.options.fallback;
    if (!fallbackId || fallbackId === failedId || this.stack.length > 0) return;
    const factory = this.factories.get(fallbackId);
    if (!factory) return;
    try {
      await this.enterFresh(fallbackId, factory, undefined);
      this.options.onChange?.({ from: null, to: fallbackId, kind: 'goTo', stack: this.stackIds });
      this.top?.reveal?.();
    } catch (error) {
      this.options.onError?.(error);
    }
  }

  private async executePush(id: ScreenId, params: unknown): Promise<boolean> {
    const below = this.top;
    const from = this.currentId;
    if (!canPush(this.flow, from, id)) {
      this.reportInvalid('push', from, id);
      return false;
    }
    const factory = this.factories.get(id);
    if (!factory || !below) {
      this.reportMissing(id);
      return false;
    }

    await this.enterFresh(id, factory, params);
    below.onCovered?.();
    this.options.onChange?.({ from, to: id, kind: 'push', stack: this.stackIds });
    this.top?.reveal?.();
    return true;
  }

  private async executePop(): Promise<boolean> {
    if (this.stack.length < 2) return false;
    const leaving = this.stack.pop();
    const below = this.top;
    if (!leaving || !below) return false;

    try {
      await settleWithin(leaving.hide?.(), this.animationTimeout);
    } finally {
      await this.safeExit(leaving);
    }
    below.onUncovered?.();
    this.options.onChange?.({ from: leaving.id, to: below.id, kind: 'pop', stack: this.stackIds });
    return true;
  }

  /** Sale de una pantalla y quita su raíz del DOM, aunque `exit` falle. */
  private async safeExit(screen: Screen<unknown>): Promise<void> {
    try {
      await screen.exit();
    } catch (error) {
      this.options.onError?.(error);
    } finally {
      screen.root.remove();
    }
  }

  private reportInvalid(kind: 'goTo' | 'push', from: ScreenId | null, to: ScreenId): void {
    this.options.onError?.(new Error(`Transición no permitida (${kind}): ${from ?? '∅'} → ${to}`));
  }

  private reportMissing(id: ScreenId): void {
    this.options.onError?.(new Error(`La pantalla "${id}" no está registrada.`));
  }
}
