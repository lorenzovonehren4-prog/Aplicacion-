/**
 * Dueño del guardado del jugador: lo carga, lo sanea, lo expone de sólo lectura
 * y lo escribe agrupando cambios. Ver PLAN.md §4.6.
 */

import type { DeepReadonly } from '../utils/types';
import { migrateSave } from './migrations';
import { sanitizeSave } from './sanitize';
import { createDefaultSave, SAVE_KEY, type SaveData } from './schema';
import type { QualityLevel } from '../render/quality';
import type { KeyValueStorage, StorageKind } from './storage';

export type SaveListener = (data: DeepReadonly<SaveData>) => void;

export interface SaveManagerOptions {
  storage: KeyValueStorage;
  /** Calidad gráfica para un guardado nuevo (detectada según el equipo). */
  initialQuality: QualityLevel;
  now?: () => number;
  /** Espera antes de escribir, para agrupar cambios seguidos (sliders, etc.). */
  debounceMs?: number;
}

export type LoadOutcome = 'new' | 'loaded' | 'repaired';

export class SaveManager {
  private current: SaveData;
  private readonly listeners = new Set<SaveListener>();
  private readonly now: () => number;
  private readonly debounceMs: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;
  /** Cadena de escrituras: nunca hay dos a la vez y el orden se respeta. */
  private writing: Promise<void> = Promise.resolve();
  private lastWriteFailed = false;

  private constructor(
    private readonly storage: KeyValueStorage,
    data: SaveData,
    readonly outcome: LoadOutcome,
    options: SaveManagerOptions,
  ) {
    this.current = data;
    this.now = options.now ?? Date.now;
    this.debounceMs = options.debounceMs ?? 400;
  }

  /**
   * Carga el guardado. Si no existe, crea uno nuevo; si está dañado, rescata lo
   * que se pueda y lo repara. Nunca falla por datos malos.
   */
  static async load(options: SaveManagerOptions): Promise<SaveManager> {
    const now = (options.now ?? Date.now)();
    const defaults = createDefaultSave(now, options.initialQuality);

    let raw: unknown;
    try {
      raw = await options.storage.get(SAVE_KEY);
    } catch (error) {
      console.warn('[Guardado] No se pudo leer el guardado; se empieza de cero.', error);
      raw = undefined;
    }

    if (raw === undefined || raw === null) {
      const manager = new SaveManager(options.storage, defaults, 'new', options);
      manager.markDirty();
      return manager;
    }

    let outcome: LoadOutcome = 'loaded';
    let data: SaveData;
    try {
      const migrated = migrateSave(raw);
      if (migrated.fromFuture) {
        console.warn(`[Guardado] El guardado es de una versión más nueva (v${migrated.fromVersion}).`);
      }
      data = sanitizeSave(migrated.data, defaults);
      // Si el saneo o la migración cambiaron algo, el guardado venía dañado, incompleto
      // o de otra versión: se marca para reescribirlo ya corregido.
      if (JSON.stringify(data) !== JSON.stringify(raw)) outcome = 'repaired';
    } catch (error) {
      console.warn('[Guardado] Guardado ilegible; se reparó con valores por defecto.', error);
      data = defaults;
      outcome = 'repaired';
    }

    const manager = new SaveManager(options.storage, data, outcome, options);
    if (outcome === 'repaired') manager.markDirty();
    return manager;
  }

  /** Datos actuales (sólo lectura: los cambios pasan por `update`). */
  get data(): DeepReadonly<SaveData> {
    return this.current;
  }

  get storageKind(): StorageKind {
    return this.storage.kind;
  }

  /** ¿El progreso sobrevive a cerrar la pestaña? */
  get isPersistent(): boolean {
    return this.storage.kind !== 'memory';
  }

  get hasPendingWrite(): boolean {
    return this.dirty;
  }

  get lastWriteOk(): boolean {
    return !this.lastWriteFailed;
  }

  /**
   * Modifica el guardado. El resultado se vuelve a sanear (un error de
   * programación no puede dejar datos inválidos), se avisa a los listeners y se
   * programa la escritura. Si nada cambió, no pasa nada.
   */
  update(mutator: (draft: SaveData) => void): void {
    const draft = structuredClone(this.current);
    mutator(draft);
    const next = sanitizeSave(draft, this.current);
    if (JSON.stringify(next) === JSON.stringify(this.current)) return;
    next.updatedAt = Math.max(this.now(), next.createdAt);
    this.current = next;
    this.markDirty();
    for (const listener of [...this.listeners]) {
      try {
        listener(this.current);
      } catch (error) {
        console.error('[Guardado] Error en un listener de cambios:', error);
      }
    }
  }

  /** Escucha cambios. Devuelve la función para dejar de escuchar. */
  onChange(listener: SaveListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Escribe ya lo pendiente (al ocultar la pestaña, al salir de una carrera...). */
  flush(): Promise<void> {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.dirty) return this.writing;
    this.dirty = false;
    const snapshot = structuredClone(this.current);
    this.writing = this.writing.then(async () => {
      try {
        await this.storage.set(SAVE_KEY, snapshot);
        this.lastWriteFailed = false;
      } catch (error) {
        this.lastWriteFailed = true;
        // Se reintenta en el próximo cambio o flush.
        this.dirty = true;
        console.warn('[Guardado] No se pudo escribir el guardado.', error);
      }
    });
    return this.writing;
  }

  /** Cancela la escritura programada (al destruir el juego tras un flush). */
  dispose(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.listeners.clear();
  }

  private markDirty(): void {
    this.dirty = true;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.debounceMs);
  }
}
