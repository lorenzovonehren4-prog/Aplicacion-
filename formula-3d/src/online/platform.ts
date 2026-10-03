/**
 * Acceso a la base de datos compartida y a la identidad del visor que da
 * claude.ai cuando el juego se abre como artifact publicado. Fuera de ahí
 * (desarrollo local, otra página) no existe y el juego sigue sin récords en
 * línea.
 *
 * Sólo se declaran las partes que usa el juego (los tipos completos son los
 * del contrato del runtime, `db.d.ts` y `user.d.ts`).
 */

/** Código de error de la base ('invalid_argument', 'quota_exceeded', 'unavailable', 'revoked'…; ver `db.d.ts`). */
export type DbErrorCode = string;

export interface DbDocSnapshot {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

export interface DbQuerySnapshot {
  docs: DbDocSnapshot[];
}

export interface DbDocRef {
  get(): Promise<DbDocSnapshot>;
  set(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
  onSnapshot(next: (snap: DbDocSnapshot) => void, error?: (e: { code: DbErrorCode; message: string }) => void): () => void;
}

export interface DbCollectionRef {
  onSnapshot(next: (snap: DbQuerySnapshot) => void, error?: (e: { code: DbErrorCode; message: string }) => void): () => void;
}

export interface Db {
  doc(path: string): DbDocRef;
  collection(path: string): DbCollectionRef;
}

export interface UserInfo {
  id(): Promise<string | null>;
  isOwner(): Promise<boolean>;
  can(name: string): Promise<boolean | null>;
}

export interface Platform {
  db: Db;
  user: UserInfo | null;
}

interface ClaudeRuntime {
  use(name: string): Promise<unknown>;
}

/**
 * Pide la base y la identidad al visor de claude.ai. null si el juego no
 * está en un artifact, si el visor no da la base (por ejemplo, sin iniciar
 * sesión) o si no contesta.
 */
export async function connectPlatform(): Promise<Platform | null> {
  const claude = (globalThis as { claude?: Partial<ClaudeRuntime> }).claude;
  if (!claude || typeof claude.use !== 'function') return null;
  try {
    const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
    if (!db) return null;
    return { db: db as Db, user: (user as UserInfo | null) ?? null };
  } catch {
    return null;
  }
}
