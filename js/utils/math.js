/**
 * utils/math.js — Utilidades numéricas y aleatoriedad determinista.
 *
 * Los niveles usan `createRng(seed)` en vez de Math.random para que un mismo
 * nivel se vea igual entre recargas: las pistas hablan de posiciones concretas
 * y no pueden mentir.
 */

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const lerp = (a, b, t) => a + (b - a) * t;

/** Entero pseudoaleatorio en [min, max] usando el rng dado. */
export const randInt = (rng, min, max) => Math.floor(rng() * (max - min + 1)) + min;

/** Elige un elemento del array. */
export const pick = (rng, list) => list[Math.floor(rng() * list.length)];

/**
 * Generador determinista (mulberry32). Devuelve floats en [0, 1).
 * @param {number|string} seed
 */
export function createRng(seed) {
  let state = typeof seed === 'string' ? hashString(seed) : (seed >>> 0);
  return function rng() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash entero de 32 bits a partir de un string (FNV-1a). */
export function hashString(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Copia barajada (Fisher–Yates) con rng determinista. */
export function shuffle(list, rng = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Compara dos arrays elemento a elemento (===). */
export const sameOrder = (a, b) =>
  Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);

/** Segundos → "M:SS" (o "H:MM:SS" si pasa de una hora). */
export function formatTime(totalSeconds) {
  const secs = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Segundos → "MM:SS" con minutos siempre a dos dígitos (cronómetro). */
export function formatClock(totalSeconds) {
  const secs = Math.max(0, Math.floor(totalSeconds || 0));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Entero → string con ceros a la izquierda ("7" → "07"). */
export const pad2 = (n) => String(n).padStart(2, '0');
