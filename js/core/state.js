/**
 * core/state.js — Estado global de la partida.
 *
 * Store mínimo con suscripción. Todo el estado persistente vive aquí y se
 * escribe a través de `update()`, que persiste y notifica. Ningún módulo debe
 * mutar el objeto devuelto por `get()`.
 */

import * as storage from './storage.js';

let current = storage.load();
const listeners = new Set();

/** Instantánea del estado. Trátala como inmutable. */
export const get = () => current;

/** Atajo a la configuración (sonido, música). */
export const getSettings = () => current.settings;

/**
 * Datos de un nivel concreto. Devuelve siempre un objeto completo,
 * aunque el nivel nunca se haya jugado.
 */
export function getLevelData(levelId) {
  return current.levelData[String(levelId)] ?? storage.defaultLevelData();
}

/**
 * Aplica una transformación al estado, persiste y notifica.
 *
 * @param {(state: object) => object} mutator Recibe una copia superficial y
 *   devuelve el nuevo estado (o muta la copia recibida y no devuelve nada).
 * @param {{ silent?: boolean, persist?: boolean }} [options]
 */
export function update(mutator, { silent = false, persist = true } = {}) {
  const draft = structuredCloneSafe(current);
  const result = mutator(draft);
  current = result ?? draft;

  if (persist) storage.save(current);
  if (!silent) notify();

  return current;
}

/** Escribe (mezclando) los datos de un nivel. */
export function setLevelData(levelId, patch, options) {
  return update((state) => {
    const key = String(levelId);
    state.levelData[key] = {
      ...storage.defaultLevelData(),
      ...(state.levelData[key] ?? {}),
      ...patch,
    };
  }, options);
}

/** Cambia una preferencia de ajustes. */
export function setSetting(key, value) {
  return update((state) => { state.settings[key] = value; });
}

/** Suma segundos al tiempo total jugado. */
export function addPlayTime(seconds) {
  const amount = Math.max(0, Math.round(seconds || 0));
  if (!amount) return current;
  return update((state) => { state.totalPlayTime += amount; }, { silent: true });
}

/** Reinicia todo el progreso. */
export function reset() {
  current = storage.clearAll();
  notify();
  return current;
}

/**
 * Suscribe un listener a los cambios de estado.
 * @returns {() => void} función para desuscribirse
 */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) {
    try { listener(current); } catch (err) { console.error('[state] listener:', err); }
  }
}

/** structuredClone con respaldo para navegadores antiguos. */
function structuredCloneSafe(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
