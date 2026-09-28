import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { migrateSave } from '../src/core/save/migrations';
import { sanitizeSave } from '../src/core/save/sanitize';
import { SaveManager } from '../src/core/save/SaveManager';
import { createDefaultSave, SAVE_KEY, SAVE_VERSION, type SaveData } from '../src/core/save/schema';
import {
  createBestStorage,
  IndexedDbStorage,
  LocalStorageStorage,
  MemoryStorage,
  type KeyValueStorage,
} from '../src/core/save/storage';

const NOW = 1_700_000_000_000;

/** localStorage en memoria con la API de `Storage`. */
class FakeLocalStorage implements Storage {
  private map = new Map<string, string>();
  constructor(private readonly failWrites = false) {}
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    if (this.failWrites) throw new DOMException('Quota', 'QuotaExceededError');
    this.map.set(key, value);
  }
}

function defaults(): SaveData {
  return createDefaultSave(NOW, 'high');
}

describe('sanitizeSave', () => {
  it('convierte basura en un guardado válido por defecto', () => {
    for (const garbage of [undefined, null, 42, 'hola', [], { profile: 'x', settings: [] }]) {
      const data = sanitizeSave(garbage, defaults());
      expect(data.version).toBe(SAVE_VERSION);
      expect(data.profile.name).toBe('PILOTO');
      expect(data.progression).toEqual({ level: 1, xp: 0 });
      expect(data.settings.graphics.quality).toBe('high');
    }
  });

  it('corrige cada campo inválido sin tocar los válidos', () => {
    const raw = {
      version: 1,
      createdAt: NOW,
      updatedAt: NOW + 10,
      profile: { name: '  Ana\u0007   María  ', avatarId: '<script>', titleId: 'rookie', tutorialDone: 'sí', experience: 'lots' },
      progression: { level: 250, xp: -5 },
      settings: {
        graphics: { quality: 'epic', shadows: 'low', postprocessing: false, fpsTarget: 45, resolutionScale: 3, showFps: true },
        audio: { master: 2, engine: Number.NaN, ui: 0.3 },
      },
    };
    const data = sanitizeSave(raw, defaults());
    expect(data.profile.name).toBe('Ana María');
    expect(data.profile.avatarId).toBe('initials');
    expect(data.profile.tutorialDone).toBe(false);
    expect(data.profile.experience).toBe('lots');
    expect(data.progression).toEqual({ level: 100, xp: 0 });
    expect(data.settings.graphics).toEqual({
      quality: 'high',
      shadows: 'low',
      postprocessing: false,
      fpsTarget: 60,
      resolutionScale: 1,
      showFps: true,
    });
    expect(data.settings.audio).toEqual({ master: 1, engine: 0.8, effects: 0.8, ui: 0.3 });
    expect(data.updatedAt).toBe(NOW + 10);
  });

  it('controles, juego y récords (Fase 2)', () => {
    const data = sanitizeSave(
      {
        settings: {
          controls: { steeringSensitivity: 9, steeringDeadzone: -1, vibration: 'no' },
          game: { defaultCamera: 'helicóptero', units: 'mph' },
          assists: { level: 'experto', custom: { braking: 'low', traction: 'total', abs: 'sí', line: 'corners', lineType: 'dynamic' } },
        },
        records: { australia: { bestLap: 81.5 }, 'MAL CLAVE!': { bestLap: 80 }, monza: { bestLap: -3 } },
      },
      defaults(),
    );
    expect(data.settings.controls).toEqual({ steeringSensitivity: 1.5, steeringDeadzone: 0, vibration: true });
    // Ayudas: lo inválido vuelve al valor por defecto campo por campo.
    expect(data.settings.assists).toEqual({
      level: 'beginner',
      custom: { braking: 'low', traction: 'medium', abs: true, line: 'corners', lineType: 'dynamic' },
    });
    expect(data.settings.game).toEqual({ defaultCamera: 'cockpit', units: 'mph' });
    expect(data.records).toEqual({ australia: { bestLap: 81.5 }, monza: { bestLap: null } });
  });

  it('recorta el nombre y acota la XP al nivel', () => {
    const data = sanitizeSave({ profile: { name: 'X'.repeat(40) }, progression: { level: 1, xp: 99_999 } }, defaults());
    expect(data.profile.name).toHaveLength(16);
    expect(data.progression.xp).toBe(599);
  });
});

describe('migrateSave', () => {
  it('aplica las migraciones en cadena hasta la versión objetivo', () => {
    const migrations = {
      1: (d: Record<string, unknown>) => ({ ...d, a: 1 }),
      2: (d: Record<string, unknown>) => ({ ...d, b: (d.a as number) + 1 }),
    };
    const result = migrateSave({ version: 1 }, migrations, 3);
    expect(result.data).toEqual({ version: 3, a: 1, b: 2 });
    expect(result.fromVersion).toBe(1);
  });

  it('falla claro si falta una migración', () => {
    expect(() => migrateSave({ version: 1 }, {}, 2)).toThrow(/Falta la migración/);
  });

  it('marca los guardados de una versión más nueva', () => {
    expect(migrateSave({ version: 9 }, {}, 1).fromFuture).toBe(true);
  });
});

describe('almacenamientos', () => {
  async function roundTrip(storage: KeyValueStorage): Promise<void> {
    expect(await storage.get('nada')).toBeUndefined();
    await storage.set('k', { a: [1, 2, 3], b: 'ñ' });
    expect(await storage.get('k')).toEqual({ a: [1, 2, 3], b: 'ñ' });
    await storage.delete('k');
    expect(await storage.get('k')).toBeUndefined();
  }

  it('memoria', async () => {
    await roundTrip(new MemoryStorage());
  });

  it('localStorage', async () => {
    await roundTrip(new LocalStorageStorage(new FakeLocalStorage()));
  });

  it('IndexedDB', async () => {
    await roundTrip(await IndexedDbStorage.open(new IDBFactory(), 'prueba-roundtrip'));
  });

  it('elige IndexedDB, luego localStorage y por último memoria', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect((await createBestStorage({ indexedDB: new IDBFactory(), localStorage: new FakeLocalStorage() })).kind).toBe(
      'indexeddb',
    );
    const brokenIdb = { open: () => { throw new DOMException('bloqueado', 'SecurityError'); } } as unknown as IDBFactory;
    expect((await createBestStorage({ indexedDB: brokenIdb, localStorage: new FakeLocalStorage() })).kind).toBe(
      'localstorage',
    );
    expect((await createBestStorage({ indexedDB: brokenIdb, localStorage: new FakeLocalStorage(true) })).kind).toBe(
      'memory',
    );
    expect((await createBestStorage({})).kind).toBe('memory');
    vi.restoreAllMocks();
  });
});

describe('SaveManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function load(storage: KeyValueStorage) {
    return SaveManager.load({ storage, initialQuality: 'medium', now: () => NOW, debounceMs: 400 });
  }

  it('crea un guardado nuevo con la calidad detectada y lo escribe', async () => {
    const storage = new MemoryStorage();
    const save = await load(storage);
    expect(save.outcome).toBe('new');
    expect(save.data.settings.graphics.quality).toBe('medium');
    expect(save.data.settings.graphics.shadows).toBe('low');
    await vi.advanceTimersByTimeAsync(400);
    expect(await storage.get(SAVE_KEY)).toMatchObject({ version: SAVE_VERSION });
  });

  it('carga un guardado válido tal cual', async () => {
    const storage = new MemoryStorage();
    const stored = createDefaultSave(NOW - 1000, 'ultra');
    stored.profile.name = 'Lucía';
    await storage.set(SAVE_KEY, stored);
    const save = await load(storage);
    expect(save.outcome).toBe('loaded');
    expect(save.data.profile.name).toBe('Lucía');
    expect(save.hasPendingWrite).toBe(false);
  });

  it('repara un guardado dañado y lo reescribe', async () => {
    const storage = new MemoryStorage();
    await storage.set(SAVE_KEY, { version: 1, profile: { name: 7 }, settings: { audio: { master: 'alto' } } });
    const save = await load(storage);
    expect(save.outcome).toBe('repaired');
    expect(save.data.settings.audio.master).toBe(0.8);
    await save.flush();
    expect(await storage.get(SAVE_KEY)).toEqual(save.data);
  });

  it('agrupa varios cambios seguidos en una sola escritura', async () => {
    const storage = new MemoryStorage();
    const setSpy = vi.spyOn(storage, 'set');
    const save = await load(storage);
    await save.flush();
    setSpy.mockClear();
    for (let i = 1; i <= 10; i++) save.update((d) => (d.settings.audio.ui = i / 10));
    expect(setSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(400);
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(((await storage.get(SAVE_KEY)) as SaveData).settings.audio.ui).toBe(1);
  });

  it('sanea lo que escribe el código y no avisa si nada cambió', async () => {
    const save = await load(new MemoryStorage());
    const listener = vi.fn();
    save.onChange(listener);
    save.update((d) => (d.settings.audio.master = 5));
    expect(save.data.settings.audio.master).toBe(1);
    expect(listener).toHaveBeenCalledTimes(1);
    save.update((d) => (d.settings.audio.master = 1));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('si una escritura falla, la reintenta en el próximo flush', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const storage = new MemoryStorage();
    const save = await load(storage);
    const setSpy = vi.spyOn(storage, 'set').mockRejectedValueOnce(new Error('disco lleno'));
    await save.flush();
    expect(save.lastWriteOk).toBe(false);
    expect(save.hasPendingWrite).toBe(true);
    await save.flush();
    expect(save.lastWriteOk).toBe(true);
    expect(setSpy).toHaveBeenCalledTimes(2);
  });

  it('funciona de punta a punta sobre IndexedDB', async () => {
    vi.useRealTimers();
    const storage = await IndexedDbStorage.open(new IDBFactory(), 'prueba-e2e');
    const first = await SaveManager.load({ storage, initialQuality: 'high' });
    first.update((d) => (d.profile.name = 'Renata'));
    await first.flush();
    const second = await SaveManager.load({ storage, initialQuality: 'low' });
    expect(second.outcome).toBe('loaded');
    expect(second.data.profile.name).toBe('Renata');
    expect(second.data.settings.graphics.quality).toBe('high');
  });
});
