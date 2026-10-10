/**
 * Récords en línea: lee los registros de todos los jugadores de la base
 * compartida del link (en vivo) y sube los de este jugador cuando mejoran.
 *
 * - Sin base (el juego fuera de claude.ai, sin iniciar sesión): `offline`,
 *   el juego sigue igual y las pantallas muestran por qué no hay tablas.
 * - Quien sólo puede leer (cuentas de fuera de la organización del dueño):
 *   la primera escritura rechazada lo deja en `readonly` y no se reintenta.
 * - Las escrituras van de a una y sólo cuando algo cambió: primero cada
 *   fantasma nuevo (su propio documento) y después el registro que lo
 *   anuncia, así nadie ve un fantasma que todavía no está.
 * - En la pista no se sube nada (se espera a volver a los menús).
 * - El dueño del link puede ocultar a un jugador (`mod/banned`): no aparece
 *   en las tablas de nadie y su juego deja de subir.
 */

import type { SaveManager } from '../core/save/SaveManager';
import type { StoredGhost } from '../race/session/Ghost';
import type { TrackDefinition } from '../tracks/TrackDefinition';
import {
  bodyFromSave,
  fastestGhost,
  medalStandings,
  mergeBody,
  parseEntry,
  plausibleTime,
  sameBody,
  trackStandings,
  type EntryBody,
  type MedalRow,
  type PlayerEntry,
  type TrackRow,
} from './leaderboard';
import { connectPlatform, type Platform } from './platform';

export type OnlineStatus = 'connecting' | 'offline' | 'readonly' | 'online';

/** Espera antes de subir (agrupa varios cambios seguidos del guardado). */
const SYNC_DELAY_MS = 1500;
/** Reintento tras un corte pasajero de la base. */
const RETRY_DELAY_MS = 15_000;
/** Base64 de un fantasma: el mismo límite que el guardado (hasta ~10 min de vuelta). */
const GHOST_TEXT_MAX = 400_000;

function isBase64(value: unknown): value is string {
  return typeof value === 'string' && value.length <= GHOST_TEXT_MAX && /^[A-Za-z0-9+/]*={0,2}$/.test(value);
}

export class OnlineRecords {
  private state: OnlineStatus = 'connecting';
  private platform: Platform | null = null;
  private uid: string | null = null;
  private owner = false;
  private readonly entries = new Map<string, PlayerEntry>();
  private hidden = new Set<string>();
  /** Llegó la primera lista de registros (antes no se sube nada: podría pisar uno mejor). */
  private loaded = false;
  private active = true;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private syncing = false;
  private syncAgain = false;
  private readonly listeners = new Set<() => void>();
  private readonly unsubscribers: Array<() => void> = [];
  private stopped = false;

  constructor(
    private readonly save: SaveManager,
    private readonly tracks: readonly TrackDefinition[],
    private readonly connect: () => Promise<Platform | null> = connectPlatform,
    private readonly now: () => number = () => Date.now(),
  ) {}

  get status(): OnlineStatus {
    return this.state;
  }

  /** ¿Es el dueño del link? (puede ocultar jugadores) */
  get isOwner(): boolean {
    return this.owner;
  }

  /** Id de este jugador en la base (null sin identidad). */
  get myId(): string | null {
    return this.uid;
  }

  /** Avisa cada vez que cambian las tablas o el estado. Devuelve la baja. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Se conecta (si el juego está en claude.ai) y empieza a escuchar. */
  async start(): Promise<void> {
    const platform = await this.connect();
    if (this.stopped) return;
    if (!platform) {
      this.setStatus('offline');
      return;
    }
    this.platform = platform;
    this.uid = (await platform.user?.id().catch(() => null)) ?? null;
    this.owner = (await platform.user?.isOwner().catch(() => false)) ?? false;
    if (this.stopped) return;
    this.setStatus(this.uid ? 'online' : 'readonly');
    this.unsubscribers.push(
      platform.db.collection('laps').onSnapshot(
        (snap) => {
          this.entries.clear();
          for (const doc of snap.docs) {
            const entry = doc.exists ? parseEntry(doc.id, doc.data(), this.tracks) : null;
            if (entry) this.entries.set(doc.id, entry);
          }
          this.loaded = true;
          this.notify();
          this.scheduleSync();
        },
        (error) => this.fail(error.code),
      ),
      platform.db.doc('mod/banned').onSnapshot(
        (snap) => {
          const ids = snap.exists ? snap.data()?.ids : undefined;
          this.hidden = new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string').slice(0, 500) : []);
          this.notify();
        },
        () => undefined,
      ),
    );
    this.unsubscribers.push(this.save.onChange(() => this.scheduleSync()));
  }

  /** En la pista se pausa la subida; al volver a los menús se retoma. */
  setActive(active: boolean): void {
    if (active === this.active) return;
    this.active = active;
    if (active) this.scheduleSync();
  }

  /** Tabla de un circuito (sin los ocultos), del más rápido al más lento. */
  trackRows(trackId: string): TrackRow[] {
    return trackStandings(this.entries.values(), trackId, this.hidden);
  }

  /** Ranking de medallas de todos los jugadores. */
  medalRows(): MedalRow[] {
    return medalStandings(this.entries.values(), this.tracks, this.hidden);
  }

  /** El fantasma más rápido del circuito (quién y en cuánto), o null. */
  recordGhost(trackId: string): { entry: PlayerEntry; time: number } | null {
    return fastestGhost(this.entries.values(), trackId, this.hidden);
  }

  /** Jugadores ocultos por el dueño (para poder mostrarlos de nuevo). */
  hiddenEntries(): PlayerEntry[] {
    return [...this.hidden].flatMap((id) => this.entries.get(id) ?? []);
  }

  /** Baja el fantasma de un jugador en un circuito (validado), o null si no está o no sirve. */
  async fetchGhost(playerId: string, trackId: string): Promise<StoredGhost | null> {
    const db = this.platform?.db;
    const def = this.tracks.find((t) => t.id === trackId);
    if (!db || !def) return null;
    try {
      const snap = await db.doc(`ghosts/${playerId}/tracks/${trackId}`).get();
      const data = snap.exists ? snap.data() : undefined;
      if (!data || !plausibleTime(def, data.time) || !isBase64(data.poses) || !isBase64(data.trace)) return null;
      return { time: data.time, poses: data.poses, trace: data.trace };
    } catch {
      return null;
    }
  }

  /** Dueño: oculta (o vuelve a mostrar) a un jugador en las tablas de todos. */
  async setHidden(playerId: string, hide: boolean): Promise<boolean> {
    const db = this.platform?.db;
    if (!db || !this.owner) return false;
    const next = new Set(this.hidden);
    if (hide) next.add(playerId);
    else next.delete(playerId);
    try {
      await db.doc('mod/banned').set({ ids: [...next] });
      this.hidden = next;
      this.notify();
      return true;
    } catch {
      return false;
    }
  }

  dispose(): void {
    this.stopped = true;
    if (this.syncTimer) clearTimeout(this.syncTimer);
    for (const off of this.unsubscribers.splice(0)) off();
    this.listeners.clear();
  }

  // ─── Subida ─────────────────────────────────────────────────────────────

  private scheduleSync(delay = SYNC_DELAY_MS): void {
    if (this.state !== 'online' || this.stopped) return;
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      this.syncTimer = null;
      void this.sync();
    }, delay);
  }

  /** Sube lo que mejoró: fantasmas nuevos y después el registro. Una escritura a la vez. */
  private async sync(): Promise<void> {
    if (this.syncing) {
      this.syncAgain = true;
      return;
    }
    const db = this.platform?.db;
    const uid = this.uid;
    if (!db || !uid || !this.loaded || !this.active || this.state !== 'online' || this.hidden.has(uid)) return;
    this.syncing = true;
    try {
      const remote = this.entries.get(uid) ?? null;
      const data = this.save.data;
      const body: EntryBody = mergeBody(bodyFromSave(data, this.tracks, this.now()), remote);
      if (Object.keys(body.t).length === 0) return;
      // Fantasmas: uno por documento, sólo si el local es más rápido que el subido.
      for (const def of this.tracks) {
        const ghost = data.records[def.id]?.ghost;
        if (!ghost || !plausibleTime(def, ghost.time)) continue;
        const uploaded = body.g[def.id];
        if (uploaded !== undefined && uploaded <= ghost.time) continue;
        await db.doc(`ghosts/${uid}/tracks/${def.id}`).set({ v: 1, time: ghost.time, poses: ghost.poses, trace: ghost.trace, at: this.now() });
        body.g[def.id] = ghost.time;
      }
      if (!sameBody(body, remote)) {
        await db.doc(`laps/${uid}`).set({ ...body });
        // Se ve enseguida en las tablas propias (la base lo confirma en el próximo aviso).
        const mine = parseEntry(uid, body, this.tracks);
        if (mine) this.entries.set(uid, mine);
        this.notify();
      }
    } catch (error) {
      this.fail((error as { code?: string } | null)?.code ?? 'unavailable');
    } finally {
      this.syncing = false;
      if (this.syncAgain) {
        this.syncAgain = false;
        this.scheduleSync();
      }
    }
  }

  /** Un error de la base: según el código, sólo lectura, sin conexión o reintentar más tarde. */
  private fail(code: string): void {
    if (code === 'invalid_argument' || code === 'quota_exceeded' || code === 'not_granted') {
      if (this.state === 'online') this.setStatus('readonly');
    } else if (code === 'revoked' || code === 'capability_disabled' || code === 'capability_removed') {
      this.setStatus('offline');
    } else {
      this.scheduleSync(RETRY_DELAY_MS);
    }
  }

  private setStatus(status: OnlineStatus): void {
    if (status === this.state) return;
    this.state = status;
    this.notify();
  }

  private notify(): void {
    for (const listener of [...this.listeners]) listener();
  }
}
