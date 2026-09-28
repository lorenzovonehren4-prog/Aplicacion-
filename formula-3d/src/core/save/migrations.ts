/**
 * Migraciones del guardado entre versiones. La migración con clave `n` lleva un
 * guardado de la versión `n` a la `n+1`. Se aplican en cadena hasta llegar a
 * `SAVE_VERSION`. Hoy el esquema está en su versión 1, así que no hay ninguna:
 * la primera se agregará cuando un campo cambie de significado o de nombre.
 */

import { isRecord } from './sanitize';
import { SAVE_VERSION } from './schema';

export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

export interface MigrationResult {
  data: Record<string, unknown>;
  /** Versión con la que venía el guardado. */
  fromVersion: number;
  /** El guardado es de una versión más nueva del juego (se usa igual, saneado). */
  fromFuture: boolean;
}

/** Lleva datos crudos a la versión `target` aplicando las migraciones en orden. */
export function migrateSave(
  raw: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  target: number = SAVE_VERSION,
): MigrationResult {
  let data: Record<string, unknown> = isRecord(raw) ? { ...raw } : {};
  const rawVersion = data.version;
  const fromVersion =
    typeof rawVersion === 'number' && Number.isInteger(rawVersion) && rawVersion >= 1 ? rawVersion : 1;

  if (fromVersion > target) {
    return { data, fromVersion, fromFuture: true };
  }

  for (let version = fromVersion; version < target; version++) {
    const migration = migrations[version];
    if (!migration) {
      throw new Error(`Falta la migración del guardado de la versión ${version} a la ${version + 1}.`);
    }
    data = { ...migration(data), version: version + 1 };
  }
  return { data, fromVersion, fromFuture: false };
}
