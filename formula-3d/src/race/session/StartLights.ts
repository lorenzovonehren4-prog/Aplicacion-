/**
 * Semáforo de largada: 5 luces que se encienden una por segundo y, tras una
 * pausa de tensión aleatoria de 0,5 a 2,5 s, se apagan todas juntas.
 * Lógica pura (sin sonido ni 3D): la pantalla reacciona a los eventos.
 */

export const LIGHT_COUNT = 5;
/** Espera antes de la primera luz (s): tiempo para ubicarse en la parrilla. */
const PRE_DELAY = 1.5;
const LIGHT_INTERVAL = 1;
const HOLD_MIN = 0.5;
const HOLD_MAX = 2.5;

export type StartLightsEvent = { kind: 'light'; index: number } | { kind: 'out' };

export class StartLights {
  /** Luces encendidas (0–5). */
  lit = 0;
  /** Ya se apagaron: ¡largada! */
  out = false;
  private time = 0;
  /** Pausa entre la quinta luz y el apagado (s). */
  readonly hold: number;

  /** @param random número en [0, 1) para la pausa (inyectable en las pruebas). */
  constructor(random: () => number = Math.random) {
    this.hold = HOLD_MIN + (HOLD_MAX - HOLD_MIN) * random();
  }

  step(dt: number): StartLightsEvent[] {
    if (this.out) return [];
    const events: StartLightsEvent[] = [];
    this.time += dt;
    while (this.lit < LIGHT_COUNT && this.time >= PRE_DELAY + this.lit * LIGHT_INTERVAL) {
      this.lit++;
      events.push({ kind: 'light', index: this.lit - 1 });
    }
    const allOnAt = PRE_DELAY + (LIGHT_COUNT - 1) * LIGHT_INTERVAL;
    if (this.lit === LIGHT_COUNT && this.time >= allOnAt + this.hold) {
      this.lit = 0;
      this.out = true;
      events.push({ kind: 'out' });
    }
    return events;
  }
}
