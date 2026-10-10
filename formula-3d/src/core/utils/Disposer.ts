/**
 * Junta todo lo que hay que liberar al cerrar una pantalla o un sistema:
 * listeners del DOM, tweens de GSAP, geometrías, materiales, texturas...
 * `dispose()` lo libera en orden inverso al de registro.
 */

export type Cleanup = () => void;

interface Killable {
  kill(): unknown;
}

interface DisposableResource {
  dispose(): void;
}

export class Disposer {
  private cleanups: Cleanup[] = [];
  private disposed = false;

  get isDisposed(): boolean {
    return this.disposed;
  }

  /** Registra una función de limpieza. Si ya se liberó todo, se ejecuta al instante. */
  add(cleanup: Cleanup): void {
    if (this.disposed) {
      cleanup();
      return;
    }
    this.cleanups.push(cleanup);
  }

  /** Agrega un listener y lo quita automáticamente al liberar. */
  listen<K extends keyof WindowEventMap>(
    target: Window,
    type: K,
    handler: (event: WindowEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void;
  listen<K extends keyof DocumentEventMap>(
    target: Document,
    type: K,
    handler: (event: DocumentEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void;
  listen<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    type: K,
    handler: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void;
  listen(target: EventTarget, type: string, handler: (event: Event) => void, options?: AddEventListenerOptions): void {
    target.addEventListener(type, handler, options);
    this.add(() => target.removeEventListener(type, handler, options));
  }

  /** Registra un tween o timeline de GSAP para cortarlo al liberar. */
  tween<T extends Killable>(tween: T): T {
    this.add(() => {
      tween.kill();
    });
    return tween;
  }

  /** Registra un recurso con `dispose()` (geometría, material, textura, render target...). */
  own<T extends DisposableResource>(resource: T): T {
    this.add(() => resource.dispose());
    return resource;
  }

  /** Ejecuta un `setTimeout` que se cancela si se libera antes. */
  timeout(callback: () => void, ms: number): void {
    const id = setTimeout(callback, ms);
    this.add(() => clearTimeout(id));
  }

  /** Libera todo en orden inverso. Un error en una limpieza no impide las demás. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const pending = this.cleanups;
    this.cleanups = [];
    for (let i = pending.length - 1; i >= 0; i--) {
      try {
        pending[i]?.();
      } catch (error) {
        console.error('[Disposer] Error al liberar un recurso:', error);
      }
    }
  }
}
