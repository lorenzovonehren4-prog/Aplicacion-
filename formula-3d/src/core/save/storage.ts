/**
 * Almacenamiento clave-valor asíncrono con tres implementaciones y elección
 * automática de la mejor disponible: IndexedDB → localStorage → memoria.
 */

export type StorageKind = 'indexeddb' | 'localstorage' | 'memory';

export interface KeyValueStorage {
  readonly kind: StorageKind;
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

const DB_NAME = 'apice-gp';
const STORE_NAME = 'kv';
const LOCAL_PREFIX = 'apice-gp:';
const OPEN_TIMEOUT_MS = 3000;

// ─── Memoria ─────────────────────────────────────────────────────────────

/** Último recurso: vive mientras la pestaña esté abierta. */
export class MemoryStorage implements KeyValueStorage {
  readonly kind = 'memory';
  private readonly map = new Map<string, unknown>();

  get(key: string): Promise<unknown> {
    return Promise.resolve(this.map.has(key) ? structuredClone(this.map.get(key)) : undefined);
  }

  set(key: string, value: unknown): Promise<void> {
    this.map.set(key, structuredClone(value));
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.map.delete(key);
    return Promise.resolve();
  }
}

// ─── localStorage ────────────────────────────────────────────────────────

/** Respaldo síncrono en JSON (≈ 5 MB por origen). */
export class LocalStorageStorage implements KeyValueStorage {
  readonly kind = 'localstorage';

  constructor(
    private readonly storage: Storage,
    private readonly prefix: string = LOCAL_PREFIX,
  ) {}

  get(key: string): Promise<unknown> {
    try {
      const raw = this.storage.getItem(this.prefix + key);
      return Promise.resolve(raw === null ? undefined : (JSON.parse(raw) as unknown));
    } catch (error) {
      return Promise.reject(toError(error));
    }
  }

  set(key: string, value: unknown): Promise<void> {
    try {
      this.storage.setItem(this.prefix + key, JSON.stringify(value));
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(toError(error));
    }
  }

  delete(key: string): Promise<void> {
    try {
      this.storage.removeItem(this.prefix + key);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(toError(error));
    }
  }
}

// ─── IndexedDB ───────────────────────────────────────────────────────────

/** Almacenamiento principal: asíncrono, sin límite práctico y con clonado estructurado. */
export class IndexedDbStorage implements KeyValueStorage {
  readonly kind = 'indexeddb';

  private constructor(private readonly db: IDBDatabase) {
    // Si otra pestaña actualiza la base, se cierra esta conexión en vez de bloquearla.
    db.onversionchange = () => db.close();
  }

  static open(factory: IDBFactory, name: string = DB_NAME, timeoutMs: number = OPEN_TIMEOUT_MS): Promise<IndexedDbStorage> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        settled = true;
        reject(new Error('IndexedDB no respondió a tiempo.'));
      }, timeoutMs);

      let request: IDBOpenDBRequest;
      try {
        request = factory.open(name, 1);
      } catch (error) {
        clearTimeout(timer);
        reject(toError(error));
        return;
      }
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => {
        clearTimeout(timer);
        if (settled) {
          // Llegó tarde: ya se eligió otro almacenamiento.
          request.result.close();
          return;
        }
        settled = true;
        resolve(new IndexedDbStorage(request.result));
      };
      request.onerror = () => {
        clearTimeout(timer);
        if (settled) return;
        settled = true;
        reject(request.error ?? new Error('No se pudo abrir IndexedDB.'));
      };
      request.onblocked = () => {
        clearTimeout(timer);
        if (settled) return;
        settled = true;
        reject(new Error('IndexedDB está bloqueada por otra pestaña.'));
      };
    });
  }

  get(key: string): Promise<unknown> {
    return this.transact('readonly', (store) => store.get(key));
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.transact('readwrite', (store) => store.put(value, key));
  }

  async delete(key: string): Promise<void> {
    await this.transact('readwrite', (store) => store.delete(key));
  }

  /** Ejecuta una operación y espera a que la transacción termine (datos en disco). */
  private transact(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let transaction: IDBTransaction;
      try {
        transaction = this.db.transaction(STORE_NAME, mode);
      } catch (error) {
        reject(toError(error));
        return;
      }
      const request = operation(transaction.objectStore(STORE_NAME));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error ?? new Error('Error en la transacción de IndexedDB.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Transacción de IndexedDB abortada.'));
    });
  }
}

// ─── Elección automática ─────────────────────────────────────────────────

export interface StorageEnvironment {
  indexedDB?: IDBFactory | undefined;
  localStorage?: Storage | undefined;
}

/** Lee las APIs del navegador sin romper si el acceso está prohibido (SecurityError). */
export function browserStorageEnvironment(): StorageEnvironment {
  const env: StorageEnvironment = {};
  try {
    env.indexedDB = globalThis.indexedDB;
  } catch {
    env.indexedDB = undefined;
  }
  try {
    env.localStorage = globalThis.localStorage;
  } catch {
    env.localStorage = undefined;
  }
  return env;
}

/** Comprueba que localStorage acepte escrituras (en algunos modos privados falla). */
function localStorageWorks(storage: Storage): boolean {
  const probe = `${LOCAL_PREFIX}__probe__`;
  try {
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/** Devuelve el mejor almacenamiento disponible. Nunca falla: en el peor caso, memoria. */
export async function createBestStorage(env: StorageEnvironment = browserStorageEnvironment()): Promise<KeyValueStorage> {
  if (env.indexedDB) {
    try {
      return await IndexedDbStorage.open(env.indexedDB);
    } catch (error) {
      console.warn('[Guardado] IndexedDB no disponible, se usa localStorage.', error);
    }
  }
  if (env.localStorage && localStorageWorks(env.localStorage)) {
    return new LocalStorageStorage(env.localStorage);
  }
  console.warn('[Guardado] Sin almacenamiento persistente: el progreso se perderá al cerrar.');
  return new MemoryStorage();
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}
