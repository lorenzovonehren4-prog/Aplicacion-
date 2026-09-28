/**
 * Emisor de eventos tipado. El mapa `Events` define el nombre de cada evento y
 * la forma de su carga útil, así que emitir o escuchar con datos equivocados es
 * un error de compilación.
 */

export type Listener<T> = (payload: T) => void;

export class EventBus<Events extends object> {
  private readonly listeners = new Map<keyof Events, Set<Listener<never>>>();

  /** Escucha un evento. Devuelve la función para dejar de escucharlo. */
  on<K extends keyof Events>(type: K, listener: Listener<Events[K]>): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
    return () => this.off(type, listener);
  }

  /** Escucha un evento una sola vez. */
  once<K extends keyof Events>(type: K, listener: Listener<Events[K]>): () => void {
    const off = this.on(type, (payload) => {
      off();
      listener(payload);
    });
    return off;
  }

  off<K extends keyof Events>(type: K, listener: Listener<Events[K]>): void {
    const set = this.listeners.get(type);
    if (!set) return;
    set.delete(listener);
    if (set.size === 0) this.listeners.delete(type);
  }

  /**
   * Emite un evento. Cada listener corre aislado: si uno falla, el error se
   * informa y los demás igual reciben el evento.
   */
  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    const set = this.listeners.get(type);
    if (!set) return;
    // Copia: un listener puede desuscribirse (o suscribir otro) mientras se emite.
    for (const listener of [...set]) {
      try {
        (listener as Listener<Events[K]>)(payload);
      } catch (error) {
        console.error(`[EventBus] Error en un listener de "${String(type)}":`, error);
      }
    }
  }

  /** Cantidad de listeners de un evento (útil para detectar fugas en pruebas). */
  listenerCount(type: keyof Events): number {
    return this.listeners.get(type)?.size ?? 0;
  }

  clear(): void {
    this.listeners.clear();
  }
}
