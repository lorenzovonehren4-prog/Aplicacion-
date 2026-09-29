/**
 * Orden de carrera: vueltas de cada auto, posiciones, intervalos y bandera a
 * cuadros para todos. Lógica pura (sin física ni DOM).
 *
 * - Cada auto tiene un "progreso" continuo: (vuelta − 1) × largo + distancia
 *   desde la línea. En la parrilla (detrás de la línea) está en la vuelta 0,
 *   con progreso negativo; al cruzar la línea empieza la vuelta 1.
 * - Intervalos como en la TV: se anota la hora de paso por puntos cada
 *   `TIMING_STEP` metros; el intervalo con el de adelante es la diferencia de
 *   horas en el último punto que pasaron los dos.
 * - Cuando el líder completa la última vuelta cae la bandera: cada auto
 *   termina al cruzar la línea la próxima vez (los doblados, con menos vueltas).
 */

/** Separación de los puntos de cronometraje (m). */
export const TIMING_STEP = 25;
/** Margen de la línea para detectar el cruce (m): evita confundir saltos con cruces. */
const CROSS_WINDOW = 250;

export interface RunnerState {
  /** Índice del auto (el mismo que en la lista de la sesión). */
  readonly index: number;
  /** Vuelta en curso (0 = todavía no cruzó la línea tras la largada). */
  lap: number;
  /** Distancia desde la línea de meta (0 … largo). */
  distance: number;
  /** Vueltas completas + fracción, en metros. */
  progress: number;
  /** Hora de carrera en que empezó la vuelta en curso (s). */
  lapStart: number;
  lastLap: number | null;
  bestLap: number | null;
  finished: boolean;
  /** Hora de carrera al recibir la bandera (s). */
  finishTime: number | null;
  /** Vueltas completas al terminar. */
  lapsDone: number;
  /** Posición (1 = primero). */
  position: number;
}

export interface OrderEvent {
  kind: 'lapCompleted' | 'finished' | 'leaderFinished' | 'fastestLap';
  index: number;
  /** Vuelta completada o tiempo de la vuelta rápida. */
  lap?: number;
  time?: number;
}

export class RaceOrder {
  readonly runners: RunnerState[];
  /** Hora de carrera (s) desde que se apagaron las luces. */
  time = 0;
  /** Cayó la bandera a cuadros (el líder completó la última vuelta). */
  flag = false;
  /** Vuelta rápida de la carrera. */
  fastest: { index: number; time: number } | null = null;
  /** Orden actual (índices de autos, del primero al último). */
  readonly order: number[];
  private readonly points: number;
  private readonly passings: Float64Array[];
  private finishCount = 0;

  /**
   * @param length largo de la vuelta (m)
   * @param laps vueltas de la carrera
   * @param distances distancia desde la línea de cada auto en la parrilla
   */
  constructor(
    private readonly length: number,
    readonly laps: number,
    distances: readonly number[],
  ) {
    this.points = Math.ceil(length / TIMING_STEP);
    const slots = (laps + 2) * this.points;
    this.runners = distances.map((distance, index) => ({
      index,
      lap: 0,
      distance,
      progress: distance - length,
      lapStart: 0,
      lastLap: null,
      bestLap: null,
      finished: false,
      finishTime: null,
      lapsDone: 0,
      position: index + 1,
    }));
    this.passings = distances.map(() => new Float64Array(slots).fill(-1));
    this.order = distances.map((_, index) => index);
    this.sort();
  }

  /**
   * Avanza el reloj y registra las posiciones de este paso.
   * @param distances distancia desde la línea de cada auto (0 … largo)
   */
  update(dt: number, distances: readonly number[], events: OrderEvent[] = []): OrderEvent[] {
    this.time += dt;
    const L = this.length;
    for (const runner of this.runners) {
      const distance = distances[runner.index] ?? runner.distance;
      const before = runner.distance;
      runner.distance = distance;
      if (runner.finished) continue;
      if (before > L - CROSS_WINDOW && distance < CROSS_WINDOW) {
        this.crossLine(runner, events);
        if (runner.finished) continue;
      } else if (before < CROSS_WINDOW && distance > L - CROSS_WINDOW && runner.lap > 0) {
        // Cruzó la línea marcha atrás: vuelve a la vuelta anterior.
        runner.lap--;
      }
      runner.progress = (runner.lap - 1) * L + distance;
      this.recordPassing(runner);
    }
    this.sort();
    return events;
  }

  /**
   * Intervalo con el auto de adelante (s), o null si no se puede medir todavía.
   * Si están a una vuelta o más, `laps` indica cuántas.
   */
  interval(index: number): { seconds: number | null; laps: number } {
    const runner = this.runners[index];
    if (!runner || runner.position <= 1) return { seconds: null, laps: 0 };
    const aheadIndex = this.order[runner.position - 2];
    const ahead = aheadIndex === undefined ? undefined : this.runners[aheadIndex];
    if (!ahead) return { seconds: null, laps: 0 };
    return this.gapBetween(runner, ahead);
  }

  /** Diferencia con el líder (s) o en vueltas. */
  gapToLeader(index: number): { seconds: number | null; laps: number } {
    const runner = this.runners[index];
    const leaderIndex = this.order[0];
    const leader = leaderIndex === undefined ? undefined : this.runners[leaderIndex];
    if (!runner || !leader || leader === runner) return { seconds: null, laps: 0 };
    return this.gapBetween(runner, leader);
  }

  private gapBetween(runner: RunnerState, ahead: RunnerState): { seconds: number | null; laps: number } {
    if (runner.finished && ahead.finished && runner.finishTime !== null && ahead.finishTime !== null) {
      const laps = ahead.lapsDone - runner.lapsDone;
      return laps > 0 ? { seconds: null, laps } : { seconds: runner.finishTime - ahead.finishTime, laps: 0 };
    }
    const laps = Math.floor((ahead.progress - runner.progress) / this.length);
    if (laps >= 1) return { seconds: null, laps };
    const point = this.pointIndex(runner);
    if (point < 0) return { seconds: null, laps: 0 };
    const mine = this.passings[runner.index]?.[point] ?? -1;
    const theirs = this.passings[ahead.index]?.[point] ?? -1;
    if (mine < 0 || theirs < 0) return { seconds: null, laps: 0 };
    return { seconds: Math.max(0, mine - theirs), laps: 0 };
  }

  private crossLine(runner: RunnerState, events: OrderEvent[]): void {
    if (runner.lap >= 1) {
      const lapTime = this.time - runner.lapStart;
      runner.lastLap = lapTime;
      runner.lapsDone = runner.lap;
      if (runner.bestLap === null || lapTime < runner.bestLap) runner.bestLap = lapTime;
      events.push({ kind: 'lapCompleted', index: runner.index, lap: runner.lap, time: lapTime });
      if (this.fastest === null || lapTime < this.fastest.time) {
        this.fastest = { index: runner.index, time: lapTime };
        events.push({ kind: 'fastestLap', index: runner.index, time: lapTime });
      }
      if (!this.flag && runner.lap >= this.laps) {
        this.flag = true;
        events.push({ kind: 'leaderFinished', index: runner.index });
      }
      if (this.flag) {
        runner.finished = true;
        runner.finishTime = this.time;
        runner.progress = runner.lapsDone * this.length;
        runner.position = ++this.finishCount;
        events.push({ kind: 'finished', index: runner.index, lap: runner.lapsDone, time: this.time });
        return;
      }
    }
    runner.lap++;
    runner.lapStart = this.time;
  }

  private pointIndex(runner: RunnerState): number {
    if (runner.lap < 1) return -1;
    const point = (runner.lap - 1) * this.points + Math.floor(runner.distance / TIMING_STEP);
    return Math.min(point, (this.passings[runner.index]?.length ?? 1) - 1);
  }

  private recordPassing(runner: RunnerState): void {
    const point = this.pointIndex(runner);
    const passings = this.passings[runner.index];
    if (point < 0 || !passings) return;
    // Se anota la primera vez que pasa (y los puntos salteados en un paso largo).
    for (let k = point; k >= 0 && (passings[k] ?? 0) < 0; k--) passings[k] = this.time;
  }

  private sort(): void {
    const runners = this.runners;
    this.order.sort((a, b) => {
      const ra = runners[a];
      const rb = runners[b];
      if (!ra || !rb) return 0;
      // Los que terminaron van primero, en el orden en que recibieron la bandera.
      if (ra.finished !== rb.finished) return ra.finished ? -1 : 1;
      if (ra.finished && rb.finished) return ra.position - rb.position;
      return rb.progress - ra.progress;
    });
    this.order.forEach((index, i) => {
      const runner = runners[index];
      if (runner && !runner.finished) runner.position = i + 1;
    });
  }
}
