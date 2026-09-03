/**
 * systems/hints.js — Sistema de pistas progresivas (§6.3).
 *
 * Cada nivel expone exactamente 3 pistas. Se revelan en orden: la #2 está
 * bloqueada hasta usar la #1. El coste no es una moneda ni una penalización
 * dura, sólo un tope de estrellas — el jugador nunca es castigado por pedir
 * ayuda, simplemente renuncia a la puntuación perfecta.
 */

import * as audio from '../core/audio.js';

export const HINTS_PER_LEVEL = 3;

/** Estrellas máximas alcanzables tras revelar N pistas. */
export const MAX_STARS_AFTER_HINTS = [3, 2, 1, 1];

export class HintSystem {
  /**
   * @param {string[]} hints Las 3 pistas del nivel, de vaga a casi-solución.
   * @param {{ onChange?: (system: HintSystem) => void }} [options]
   */
  constructor(hints = [], { onChange = null } = {}) {
    this.hints = normalizeHints(hints);
    this.revealed = 0;
    this.onChange = onChange;
  }

  get total() { return this.hints.length; }

  get used() { return this.revealed; }

  get remaining() { return this.total - this.revealed; }

  /** Estrellas máximas que el jugador aún puede conseguir. */
  get maxStars() {
    return MAX_STARS_AFTER_HINTS[Math.min(this.revealed, MAX_STARS_AFTER_HINTS.length - 1)];
  }

  /** ¿Se puede revelar la pista de índice `index` (0-based)? */
  canReveal(index) {
    return index >= 0 && index < this.total && index === this.revealed;
  }

  isRevealed(index) { return index < this.revealed; }

  /**
   * Revela la siguiente pista.
   * @returns {string|null} el texto revelado, o null si no procede.
   */
  reveal(index) {
    if (!this.canReveal(index)) return null;
    this.revealed = index + 1;
    audio.play('hint');
    this._emit();
    return this.hints[index];
  }

  /** Texto de una pista sólo si ya fue revelada. */
  getText(index) {
    return this.isRevealed(index) ? this.hints[index] : null;
  }

  /** Restaura el número de pistas usadas (al volver a un nivel a medias). */
  restore(count) {
    this.revealed = Math.max(0, Math.min(Number(count) || 0, this.total));
    this._emit();
    return this;
  }

  reset() {
    this.revealed = 0;
    this._emit();
    return this;
  }

  _emit() {
    if (this.onChange) {
      try { this.onChange(this); } catch (err) { console.error('[hints] onChange:', err); }
    }
  }
}

/**
 * Garantiza 3 pistas siempre. Si un nivel devuelve menos, se rellena con un
 * marcador visible en desarrollo en lugar de romper la UI en producción.
 */
function normalizeHints(hints) {
  const list = Array.isArray(hints) ? hints.filter((h) => typeof h === 'string' && h.trim()) : [];
  while (list.length < HINTS_PER_LEVEL) {
    list.push('(Pista pendiente de escribir para este nivel.)');
  }
  return list.slice(0, HINTS_PER_LEVEL);
}
