/**
 * Migraciones del guardado entre versiones. La migración con clave `n` lleva un
 * guardado de la versión `n` a la `n+1`. Se aplican en cadena hasta llegar a
 * `SAVE_VERSION`.
 *
 * - 1 → 2: los ajustes gráficos vuelven a los del equipo. El ajuste automático
 *   viejo bajaba primero la resolución (hasta 60 %) y lo dejaba guardado: el
 *   juego quedaba borroso para siempre. Sin `graphics`, el saneo usa la calidad
 *   detectada para el equipo, con la resolución entera.
 */

import { isRecord } from './sanitize';
import { SAVE_VERSION } from './schema';

export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: (data) => {
    const settings = isRecord(data.settings) ? { ...data.settings } : {};
    delete settings.graphics;
    return { ...data, settings };
  },
};

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
