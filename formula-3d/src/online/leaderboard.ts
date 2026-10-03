/**
 * Tablas de récords compartidas: la parte pura (sin red ni DOM).
 *
 * Cada jugador tiene un registro (`laps/<id>`) con su nombre de piloto, su
 * mejor vuelta y el nivel de ayudas de cada circuito, y el tiempo de los
 * fantasmas que subió (cada fantasma va aparte, en
 * `ghosts/<id>/tracks/<circuito>`, porque pesa ~30 KB). Las tablas se arman
 * en cada visor a partir de todos los registros.
 *
 * Los registros de otros jugadores son datos ajenos: se validan al leerlos
 * (nombre corto y sin caracteres de control, tiempos plausibles para cada
 * circuito, niveles de ayudas conocidos) y lo que no cumple se descarta.
 */

import type { AssistLevel, SaveData } from '../core/save/schema';
import { ASSIST_LEVELS, PROFILE_NAME_MAX_LENGTH } from '../core/save/schema';
import type { DeepReadonly } from '../core/utils/types';
import { MEDALS, medalFor, type Medal } from '../progression/medals';
import type { TrackDefinition } from '../tracks/TrackDefinition';

/** Versión del formato del registro (para leer registros viejos si cambia). */
export const ENTRY_VERSION = 1;

/** Lo que se guarda de cada jugador (documento `laps/<id>`). */
export interface EntryBody {
  v: number;
  /** Nombre de piloto (el del juego, no el de la cuenta). */
  name: string;
  /** Última actualización (ms). */
  at: number;
  /** Mejor vuelta por circuito (s). */
  t: Record<string, number>;
  /** Nivel de ayudas de esa vuelta, si se sabe. */
  a: Record<string, AssistLevel>;
  /** Tiempo del fantasma subido por circuito (s). */
  g: Record<string, number>;
}

/** Un registro ya validado. */
export interface PlayerEntry extends EntryBody {
  id: string;
}

export interface TrackRow {
  rank: number;
  entry: PlayerEntry;
  time: number;
  assists: AssistLevel | null;
}

export interface MedalRow {
  rank: number;
  entry: PlayerEntry;
  /** Circuitos con cada medalla (la mejor de cada circuito: una de oro no cuenta como plata). */
  tally: Record<Medal, number>;
  total: number;
}

type TrackRef = Pick<TrackDefinition, 'id' | 'lapRecord'>;

/** Una vuelta posible para el circuito: ni más rápida que el 85 % del récord real ni más de 10 minutos. */
export function plausibleTime(def: TrackRef, value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= def.lapRecord.seconds * 0.85 && value <= 600;
}

/** Nombre de piloto presentable: sin caracteres de control, espacios recortados, hasta el largo del juego. */
export function cleanName(value: unknown): string {
  if (typeof value !== 'string') return '';
  // Fuera: caracteres de control y los invisibles que cambian el sentido del texto.
  const visible = Array.from(value).filter((char) => {
    const code = char.codePointAt(0) ?? 0;
    return !(code < 0x20 || (code >= 0x7f && code <= 0x9f) || (code >= 0x200b && code <= 0x200f) || (code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069));
  });
  return Array.from(visible.join('').trim()).slice(0, PROFILE_NAME_MAX_LENGTH).join('');
}

function isAssistLevel(value: unknown): value is AssistLevel {
  return typeof value === 'string' && (ASSIST_LEVELS as readonly string[]).includes(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/**
 * Valida el registro de un jugador tal como llegó de la base compartida.
 * @returns null si no tiene nombre ni ningún tiempo válido
 */
export function parseEntry(id: string, raw: unknown, tracks: readonly TrackRef[]): PlayerEntry | null {
  const body = asRecord(raw);
  const name = cleanName(body.name);
  if (!name) return null;
  const times = asRecord(body.t);
  const levels = asRecord(body.a);
  const ghosts = asRecord(body.g);
  const entry: PlayerEntry = { id, v: ENTRY_VERSION, name, at: 0, t: {}, a: {}, g: {} };
  const at = body.at;
  if (typeof at === 'number' && Number.isFinite(at) && at > 0) entry.at = at;
  for (const def of tracks) {
    const time = times[def.id];
    if (!plausibleTime(def, time)) continue;
    entry.t[def.id] = time;
    const level = levels[def.id];
    if (isAssistLevel(level)) entry.a[def.id] = level;
    const ghost = ghosts[def.id];
    if (plausibleTime(def, ghost)) entry.g[def.id] = ghost;
  }
  return Object.keys(entry.t).length > 0 ? entry : null;
}

/** El registro de este jugador según su guardado (mejores vueltas, ayudas y fantasmas locales). */
export function bodyFromSave(data: DeepReadonly<SaveData>, tracks: readonly TrackRef[], now: number): EntryBody {
  const body: EntryBody = { v: ENTRY_VERSION, name: cleanName(data.profile.name) || 'PILOTO', at: now, t: {}, a: {}, g: {} };
  for (const def of tracks) {
    const record = data.records[def.id];
    if (!record) continue;
    if (plausibleTime(def, record.bestLap)) {
      body.t[def.id] = record.bestLap;
      if (record.assists) body.a[def.id] = record.assists;
    }
  }
  return body;
}

/**
 * Mezcla lo local con lo que ya hay en la base para este jugador (puede
 * jugar en otro dispositivo): en cada circuito queda la vuelta más rápida
 * con sus ayudas, y el fantasma subido más rápido. El nombre es el local.
 */
export function mergeBody(local: EntryBody, remote: PlayerEntry | null): EntryBody {
  const merged: EntryBody = { ...local, t: { ...local.t }, a: { ...local.a }, g: { ...local.g } };
  if (!remote) return merged;
  for (const [id, time] of Object.entries(remote.t)) {
    const mine = merged.t[id];
    if (mine === undefined || time < mine) {
      merged.t[id] = time;
      const level = remote.a[id];
      if (level) merged.a[id] = level;
      else delete merged.a[id];
    }
  }
  for (const [id, time] of Object.entries(remote.g)) {
    const mine = merged.g[id];
    if (mine === undefined || time < mine) merged.g[id] = time;
  }
  return merged;
}

/** ¿Los dos registros dicen lo mismo? (sin contar la fecha) */
export function sameBody(a: EntryBody, b: EntryBody | null): boolean {
  if (!b) return false;
  // Sólo los campos del registro (uno leído de la base trae además su `id`).
  const strip = (body: EntryBody): string => JSON.stringify(sortKeys({ v: body.v, name: body.name, t: body.t, a: body.a, g: body.g }));
  return strip(a) === strip(b);
}

/** Copia con las claves ordenadas (para comparar sin depender del orden). */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value === null || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) out[key] = sortKeys((value as Record<string, unknown>)[key]);
  return out;
}

/** Ordena por tiempo; a igual tiempo, el que lo hizo antes. */
function byTime(trackId: string) {
  return (x: PlayerEntry, y: PlayerEntry): number => (x.t[trackId] ?? Infinity) - (y.t[trackId] ?? Infinity) || x.at - y.at || (x.id < y.id ? -1 : 1);
}

/** Todos los tiempos de un circuito, del más rápido al más lento (sin los ocultos). */
export function trackStandings(entries: Iterable<PlayerEntry>, trackId: string, hidden: ReadonlySet<string>): TrackRow[] {
  const list = [...entries].filter((entry) => !hidden.has(entry.id) && entry.t[trackId] !== undefined).sort(byTime(trackId));
  return list.map((entry, i) => ({ rank: i + 1, entry, time: entry.t[trackId] ?? 0, assists: entry.a[trackId] ?? null }));
}

/** El fantasma más rápido subido para un circuito (de los no ocultos). */
export function fastestGhost(entries: Iterable<PlayerEntry>, trackId: string, hidden: ReadonlySet<string>): { entry: PlayerEntry; time: number } | null {
  let best: { entry: PlayerEntry; time: number } | null = null;
  for (const entry of entries) {
    const time = entry.g[trackId];
    if (time === undefined || hidden.has(entry.id)) continue;
    if (!best || time < best.time || (time === best.time && entry.at < best.entry.at)) best = { entry, time };
  }
  return best;
}

/**
 * Ranking de medallas: cuántos platinos, oros, platas y bronces tiene cada
 * jugador (la mejor medalla de cada circuito). Ordena por platinos, después
 * oros, platas y bronces; a igualdad, por nombre.
 */
export function medalStandings(entries: Iterable<PlayerEntry>, tracks: readonly TrackRef[], hidden: ReadonlySet<string>): MedalRow[] {
  const rows: Array<Omit<MedalRow, 'rank'>> = [];
  for (const entry of entries) {
    if (hidden.has(entry.id)) continue;
    const tally: Record<Medal, number> = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    for (const def of tracks) {
      const medal = medalFor(def, entry.t[def.id]);
      if (medal) tally[medal]++;
    }
    const total = MEDALS.reduce((sum, medal) => sum + tally[medal], 0);
    if (total > 0) rows.push({ entry, tally, total });
  }
  rows.sort(
    (x, y) =>
      y.tally.platinum - x.tally.platinum ||
      y.tally.gold - x.tally.gold ||
      y.tally.silver - x.tally.silver ||
      y.tally.bronze - x.tally.bronze ||
      x.entry.name.localeCompare(y.entry.name, 'es'),
  );
  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}
