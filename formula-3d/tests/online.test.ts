import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SaveManager } from '../src/core/save/SaveManager';
import { MemoryStorage } from '../src/core/save/storage';
import {
  bodyFromSave,
  cleanName,
  fastestGhost,
  medalStandings,
  mergeBody,
  parseEntry,
  sameBody,
  trackStandings,
  type PlayerEntry,
} from '../src/online/leaderboard';
import { OnlineRecords } from '../src/online/OnlineRecords';
import type { Db, DbDocSnapshot, Platform } from '../src/online/platform';
import { medalTimes } from '../src/progression/medals';
import { TRACKS } from '../src/tracks/registry';

const monza = TRACKS.find((t) => t.id === 'monza') ?? TRACKS[0]!;
const baku = TRACKS.find((t) => t.id === 'baku') ?? TRACKS[1]!;
const ghostText = 'AAAA';

/** Base en memoria con lo justo del contrato: documentos, colección `laps` en vivo y rechazos a pedido. */
class FakeDb implements Db {
  readonly docs = new Map<string, Record<string, unknown>>();
  readonly writes: string[] = [];
  /** Código con el que rechazar las escrituras (como una cuenta de sólo lectura). */
  reject: string | null = null;
  private readonly collectionListeners = new Map<string, Array<(snap: { docs: DbDocSnapshot[] }) => void>>();
  private readonly docListeners = new Map<string, Array<(snap: DbDocSnapshot) => void>>();

  snapshot(path: string): DbDocSnapshot {
    const data = this.docs.get(path);
    return { id: path.split('/').pop() ?? '', exists: data !== undefined, data: () => data };
  }

  private emit(path: string): void {
    for (const listener of this.docListeners.get(path) ?? []) listener(this.snapshot(path));
    const collection = path.split('/').slice(0, -1).join('/');
    for (const listener of this.collectionListeners.get(collection) ?? []) {
      const docs = [...this.docs.keys()].filter((key) => key.split('/').slice(0, -1).join('/') === collection).map((key) => this.snapshot(key));
      listener({ docs });
    }
  }

  /** Lo que escribe "otro jugador" directo en la base. */
  put(path: string, data: Record<string, unknown>): void {
    this.docs.set(path, data);
    this.emit(path);
  }

  doc(path: string) {
    return {
      get: () => Promise.resolve(this.snapshot(path)),
      set: (data: Record<string, unknown>) => {
        if (this.reject) return Promise.reject(Object.assign(new Error('rechazado'), { code: this.reject }));
        this.writes.push(path);
        this.docs.set(path, JSON.parse(JSON.stringify(data)) as Record<string, unknown>);
        this.emit(path);
        return Promise.resolve();
      },
      delete: () => {
        this.docs.delete(path);
        this.emit(path);
        return Promise.resolve();
      },
      onSnapshot: (next: (snap: DbDocSnapshot) => void) => {
        const list = this.docListeners.get(path) ?? [];
        list.push(next);
        this.docListeners.set(path, list);
        queueMicrotask(() => next(this.snapshot(path)));
        return () => undefined;
      },
    };
  }

  collection(path: string) {
    return {
      onSnapshot: (next: (snap: { docs: DbDocSnapshot[] }) => void) => {
        const list = this.collectionListeners.get(path) ?? [];
        list.push(next);
        this.collectionListeners.set(path, list);
        queueMicrotask(() => {
          const docs = [...this.docs.keys()].filter((key) => key.split('/').slice(0, -1).join('/') === path).map((key) => this.snapshot(key));
          next({ docs });
        });
        return () => undefined;
      },
    };
  }
}

function platformFor(db: FakeDb, id: string | null, owner = false): Platform {
  return { db, user: { id: () => Promise.resolve(id), isOwner: () => Promise.resolve(owner), can: () => Promise.resolve(null) } };
}

async function saveWith(records: Record<string, { bestLap: number; assists?: 'beginner' | 'advanced'; ghost?: { time: number; poses: string; trace: string } }>, name = 'LORENZO') {
  const save = await SaveManager.load({ storage: new MemoryStorage(), initialQuality: 'medium', now: () => 1, debounceMs: 10 });
  save.update((data) => {
    data.profile.name = name;
    for (const [id, record] of Object.entries(records)) data.records[id] = { ...record };
  });
  return save;
}

const entry = (id: string, name: string, t: Record<string, number>, extra: Partial<PlayerEntry> = {}): PlayerEntry => ({ id, v: 1, name, at: 1, t, a: {}, g: {}, ...extra });

describe('tablas de récords (lógica)', () => {
  it('nombres limpios: sin caracteres de control ni invisibles, recortados al largo del juego', () => {
    expect(cleanName('  ANA\u0000‮LUZ  ')).toBe('ANALUZ');
    expect(cleanName('A'.repeat(40))).toHaveLength(16);
    expect(cleanName(42)).toBe('');
  });

  it('los registros ajenos se validan: tiempos imposibles, ayudas desconocidas y pistas que no existen se descartan', () => {
    const parsed = parseEntry(
      'u1',
      { name: 'ANA', at: 5, t: { monza: 90, baku: 10, inventada: 80 }, a: { monza: 'beginner', baku: 'trucho' }, g: { monza: 91, baku: 'x' } },
      TRACKS,
    );
    expect(parsed?.t).toEqual({ monza: 90 });
    expect(parsed?.a).toEqual({ monza: 'beginner' });
    expect(parsed?.g).toEqual({ monza: 91 });
    expect(parseEntry('u2', { name: '', t: { monza: 90 } }, TRACKS)).toBeNull();
    expect(parseEntry('u3', { name: 'SIN TIEMPOS', t: {} }, TRACKS)).toBeNull();
    expect(parseEntry('u4', 'basura', TRACKS)).toBeNull();
  });

  it('se mezcla lo local con lo subido (queda lo más rápido) y se compara sin la fecha ni el id', () => {
    const local = { v: 1, name: 'LORENZO', at: 9, t: { monza: 91 }, a: { monza: 'advanced' as const }, g: {} };
    const remote = entry('me', 'VIEJO', { monza: 89, baku: 120 }, { a: { monza: 'beginner' }, g: { baku: 121 } });
    const merged = mergeBody(local, remote);
    expect(merged.t).toEqual({ monza: 89, baku: 120 });
    expect(merged.a).toEqual({ monza: 'beginner' });
    expect(merged.g).toEqual({ baku: 121 });
    expect(merged.name).toBe('LORENZO');
    const asRemote = (changes: Partial<PlayerEntry>): PlayerEntry => ({ ...merged, id: 'me', ...changes });
    expect(sameBody({ ...merged, at: 1 }, asRemote({ at: 99 }))).toBe(true);
    expect(sameBody(merged, asRemote({ name: 'OTRO' }))).toBe(false);
  });

  it('tabla por circuito, fantasma más rápido y ranking de medallas (sin los ocultos)', () => {
    const times = medalTimes(monza);
    const entries = [
      entry('a', 'ANA', { monza: times.gold }, { g: { monza: times.gold + 1 } }),
      entry('b', 'BETO', { monza: times.platinum, baku: medalTimes(baku).bronze }, { g: { monza: times.platinum } }),
      entry('c', 'CATA', { monza: times.silver }),
    ];
    const rows = trackStandings(entries, 'monza', new Set());
    expect(rows.map((r) => [r.rank, r.entry.name])).toEqual([
      [1, 'BETO'],
      [2, 'ANA'],
      [3, 'CATA'],
    ]);
    expect(trackStandings(entries, 'monza', new Set(['b'])).map((r) => r.entry.name)).toEqual(['ANA', 'CATA']);
    expect(fastestGhost(entries, 'monza', new Set())?.entry.name).toBe('BETO');
    expect(fastestGhost(entries, 'monza', new Set(['b']))?.entry.name).toBe('ANA');
    const medals = medalStandings(entries, TRACKS, new Set());
    expect(medals.map((r) => r.entry.name)).toEqual(['BETO', 'ANA', 'CATA']);
    expect(medals[0]?.tally).toEqual({ platinum: 1, gold: 0, silver: 0, bronze: 1 });
  });

  it('el registro propio sale del guardado con sus ayudas', async () => {
    const save = await saveWith({ monza: { bestLap: 90, assists: 'advanced' } });
    const body = bodyFromSave(save.data, TRACKS, 7);
    expect(body).toMatchObject({ name: 'LORENZO', at: 7, t: { monza: 90 }, a: { monza: 'advanced' } });
  });
});

describe('récords en línea (servicio)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** Deja correr los avisos de la base y la espera antes de subir. */
  async function settle(): Promise<void> {
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(2000);
    }
  }

  it('fuera de claude.ai queda sin conexión y el juego no se entera', async () => {
    const save = await saveWith({ monza: { bestLap: 90 } });
    const online = new OnlineRecords(save, TRACKS, () => Promise.resolve(null));
    await online.start();
    expect(online.status).toBe('offline');
    expect(online.trackRows('monza')).toEqual([]);
  });

  it('sube el fantasma y después el registro; respeta un tiempo mejor ya subido desde otro dispositivo', async () => {
    const db = new FakeDb();
    db.put('laps/me', { name: 'LORENZO', at: 1, t: { baku: 120 }, a: {}, g: {} });
    const save = await saveWith({ monza: { bestLap: 90, assists: 'beginner', ghost: { time: 90.5, poses: ghostText, trace: ghostText } } });
    const online = new OnlineRecords(save, TRACKS, () => Promise.resolve(platformFor(db, 'me')), () => 50);
    await online.start();
    await settle();
    expect(online.status).toBe('online');
    expect(db.writes).toEqual(['ghosts/me/tracks/monza', 'laps/me']);
    expect(db.docs.get('laps/me')).toMatchObject({ name: 'LORENZO', t: { monza: 90, baku: 120 }, a: { monza: 'beginner' }, g: { monza: 90.5 } });
    // Sin cambios no se vuelve a escribir.
    save.update((data) => (data.settings.audio.master = 0.5));
    await settle();
    expect(db.writes).toHaveLength(2);
    // Una vuelta mejor sí.
    save.update((data) => (data.records.monza = { ...data.records.monza, bestLap: 88 }));
    await settle();
    expect(db.docs.get('laps/me')).toMatchObject({ t: { monza: 88 } });
    expect(online.trackRows('monza')[0]?.time).toBe(88);
  });

  it('en la pista no sube; al volver a los menús sí', async () => {
    const db = new FakeDb();
    const save = await saveWith({ monza: { bestLap: 90 } });
    const online = new OnlineRecords(save, TRACKS, () => Promise.resolve(platformFor(db, 'me')));
    online.setActive(false);
    await online.start();
    await settle();
    expect(db.writes).toEqual([]);
    online.setActive(true);
    await settle();
    expect(db.writes).toEqual(['laps/me']);
  });

  it('quien sólo puede leer ve la tabla y no reintenta escribir', async () => {
    const db = new FakeDb();
    db.put('laps/otro', { name: 'ANA', at: 1, t: { monza: 89 }, a: {}, g: {} });
    db.reject = 'invalid_argument';
    const save = await saveWith({ monza: { bestLap: 90 } });
    const online = new OnlineRecords(save, TRACKS, () => Promise.resolve(platformFor(db, 'visita')));
    await online.start();
    await settle();
    expect(online.status).toBe('readonly');
    expect(online.trackRows('monza').map((r) => r.entry.name)).toEqual(['ANA']);
    save.update((data) => (data.records.monza = { bestLap: 85 }));
    await settle();
    expect(db.writes).toEqual([]);
  });

  it('el dueño oculta a un jugador: desaparece de las tablas y su juego deja de subir', async () => {
    const db = new FakeDb();
    db.put('laps/troll', { name: 'TROLL', at: 1, t: { monza: 89 }, a: {}, g: {} });
    const ownerSave = await saveWith({ monza: { bestLap: 95 } }, 'DUEÑO');
    const owner = new OnlineRecords(ownerSave, TRACKS, () => Promise.resolve(platformFor(db, 'dueno', true)));
    await owner.start();
    await settle();
    expect(owner.trackRows('monza').map((r) => r.entry.name)).toEqual(['TROLL', 'DUEÑO']);
    expect(await owner.setHidden('troll', true)).toBe(true);
    await settle();
    expect(owner.trackRows('monza').map((r) => r.entry.name)).toEqual(['DUEÑO']);
    expect(owner.hiddenEntries().map((e) => e.name)).toEqual(['TROLL']);
    // El jugador oculto ya no sube nada.
    const trollSave = await saveWith({ monza: { bestLap: 80 } }, 'TROLL');
    const troll = new OnlineRecords(trollSave, TRACKS, () => Promise.resolve(platformFor(db, 'troll')));
    const before = db.writes.length;
    await troll.start();
    await settle();
    expect(db.writes.length).toBe(before);
    // Y alguien que no es el dueño no puede ocultar.
    expect(await troll.setHidden('dueno', true)).toBe(false);
  });

  it('baja un fantasma ajeno validado (y descarta uno dañado)', async () => {
    const db = new FakeDb();
    db.put('ghosts/a/tracks/monza', { time: 90, poses: ghostText, trace: ghostText });
    db.put('ghosts/b/tracks/monza', { time: 90, poses: '<script>', trace: ghostText });
    const save = await saveWith({});
    const online = new OnlineRecords(save, TRACKS, () => Promise.resolve(platformFor(db, 'me')));
    await online.start();
    expect(await online.fetchGhost('a', 'monza')).toEqual({ time: 90, poses: ghostText, trace: ghostText });
    expect(await online.fetchGhost('b', 'monza')).toBeNull();
    expect(await online.fetchGhost('nadie', 'monza')).toBeNull();
  });
});
