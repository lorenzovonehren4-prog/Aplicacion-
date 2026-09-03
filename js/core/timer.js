/**
 * core/timer.js — Cronómetro por nivel.
 *
 * Cuenta hacia arriba siempre (récord personal). Si el nivel declara límite,
 * emite `onExpire` una única vez al alcanzarlo, pero NO detiene el juego:
 * agotar el tiempo sólo topa las estrellas (§6.4), nunca hace fallar el nivel.
 *
 * Mide con `performance.now()` en vez de contar ticks, así que no se desincroniza
 * si la pestaña se queda en segundo plano.
 */

export class Timer {
  /**
   * @param {{ limit?: number|null, onTick?: (s:number)=>void, onExpire?: ()=>void }} options
   */
  constructor({ limit = null, onTick = null, onExpire = null } = {}) {
    this.limit = limit;
    this.onTick = onTick;
    this.onExpire = onExpire;

    this._elapsedMs = 0;
    this._startedAt = null;
    this._intervalId = null;
    this._expired = false;
    this._lastEmitted = -1;
  }

  /** Segundos transcurridos (enteros). */
  get seconds() {
    return Math.floor(this.elapsedMs / 1000);
  }

  get elapsedMs() {
    const live = this._startedAt !== null ? performance.now() - this._startedAt : 0;
    return this._elapsedMs + live;
  }

  get isRunning() {
    return this._startedAt !== null;
  }

  /** Segundos restantes, o null si el nivel no tiene límite. */
  get remaining() {
    if (!this.limit) return null;
    return Math.max(0, this.limit - this.seconds);
  }

  get hasExpired() {
    return this._expired;
  }

  start() {
    if (this._startedAt !== null) return this;
    this._startedAt = performance.now();
    this._intervalId = setInterval(() => this._tick(), 250);
    this._tick();
    return this;
  }

  pause() {
    if (this._startedAt === null) return this;
    this._elapsedMs += performance.now() - this._startedAt;
    this._startedAt = null;
    clearInterval(this._intervalId);
    this._intervalId = null;
    return this;
  }

  resume() {
    return this.start();
  }

  /** Detiene y devuelve los segundos finales. */
  stop() {
    this.pause();
    return this.seconds;
  }

  reset() {
    this.pause();
    this._elapsedMs = 0;
    this._expired = false;
    this._lastEmitted = -1;
    return this;
  }

  /** Reanuda desde un tiempo previo (p. ej. al restaurar un intento). */
  setElapsed(seconds) {
    const wasRunning = this.isRunning;
    this.pause();
    this._elapsedMs = Math.max(0, seconds) * 1000;
    this._expired = Boolean(this.limit) && this.seconds >= this.limit;
    if (wasRunning) this.start();
    return this;
  }

  /** Libera el intervalo. Llamar siempre al salir del nivel. */
  destroy() {
    this.pause();
    this.onTick = null;
    this.onExpire = null;
  }

  _tick() {
    const secs = this.seconds;

    // Emitir sólo en cambios de segundo evita repintados inútiles.
    if (secs !== this._lastEmitted) {
      this._lastEmitted = secs;
      if (this.onTick) {
        try { this.onTick(secs); } catch (err) { console.error('[timer] onTick:', err); }
      }
    }

    if (this.limit && !this._expired && secs >= this.limit) {
      this._expired = true;
      if (this.onExpire) {
        try { this.onExpire(); } catch (err) { console.error('[timer] onExpire:', err); }
      }
    }
  }
}
