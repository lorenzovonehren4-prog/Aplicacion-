/**
 * Cronometraje de una sesión: vueltas, sectores, delta en vivo contra la
 * mejor vuelta y validez por límites de pista.
 *
 * Lógica pura (sin DOM ni 3D): recibe la distancia recorrida desde la línea
 * de meta en cada paso fijo y el tiempo del paso. Para que no se pueda hacer
 * trampa, una vuelta sólo cuenta si se pasó por los dos sectores en orden;
 * dar marcha atrás por la línea no suma ni resta vueltas.
 */

/** Distancia (m) alrededor de la línea en la que se detecta el cruce. */
const CROSSING_WINDOW = 60;
/** Cada cuántos metros se guarda el tiempo de la vuelta para el delta en vivo. */
export const DELTA_STEP = 10;

/** 'best' = mejor sector de la sesión (violeta en el HUD); 'slower' = más lento (amarillo). */
export type SectorResult = 'best' | 'slower';

export interface LapRecord {
  number: number;
  time: number;
  sectors: [number, number, number];
  valid: boolean;
}

export type LapEvent =
  | { kind: 'lapStarted'; number: number }
  | { kind: 'sector'; index: 0 | 1; time: number; result: SectorResult }
  | { kind: 'lapCompleted'; lap: LapRecord; sector3: SectorResult; bestOfSession: boolean; personalBest: boolean }
  | { kind: 'invalidated'; reason: 'trackLimits' | 'reset' };

export interface LapTimerOptions {
  length: number;
  /** Fin de los sectores 1 y 2, medidos desde la línea de meta (m). */
  sectorEnds: readonly [number, number];
  /** Mejor vuelta histórica del jugador en este circuito (s), para marcar récords. */
  personalBest: number | null;
  /** Vueltas de la carrera: al completar la última el cronómetro se detiene (null = sin límite). */
  lapLimit?: number | null;
}

export class LapTimer {
  /** Vuelta en curso (0 = todavía no cruzó la línea: vuelta de salida). */
  lap = 0;
  /** Tiempo de la vuelta en curso (s). */
  lapTime = 0;
  valid = true;
  lastLap: LapRecord | null = null;
  bestLap: LapRecord | null = null;
  personalBest: number | null;
  readonly laps: LapRecord[] = [];
  /** Tiempos de los sectores completados en la vuelta en curso. */
  readonly currentSectors: number[] = [];
  /** Mejores sectores de la sesión (vueltas válidas). */
  readonly bestSectors: [number | null, number | null, number | null] = [null, null, null];

  private lastDistance: number | null = null;
  private completedTrace: number[] = [];
  /** Se completó la última vuelta de la carrera: el cronómetro no sigue. */
  finished = false;
  /** Largada detenida: el reloj corre pero la vuelta 1 empieza detrás de la línea. */
  private awaitingLine = false;
  private sectorStart = 0;
  private nextSector = 0;
  /** Tiempo de vuelta en cada tramo de DELTA_STEP m (vuelta en curso y vuelta de referencia). */
  private trace: number[] = [];
  private bestTrace: number[] | null = null;
  /** Tiempo de la vuelta de referencia del delta (la mejor de la sesión o el fantasma). */
  private bestTraceTime: number | null = null;

  constructor(private readonly options: LapTimerOptions) {
    this.personalBest = options.personalBest;
  }

  /**
   * Avanza el cronómetro.
   * @param distance metros desde la línea de meta (0 … length)
   * @param dt duración del paso (s)
   */
  step(distance: number, dt: number): LapEvent[] {
    const events: LapEvent[] = [];
    if (this.finished) return events;
    const length = this.options.length;
    const previous = this.lastDistance;
    this.lastDistance = distance;
    if (this.lap > 0) this.lapTime += dt;
    if (previous === null) return events;

    // Cruce de la línea hacia adelante: de cerca del final a cerca del inicio.
    const crossedForward = previous > length - CROSSING_WINDOW && distance < CROSSING_WINDOW;
    const crossedBackward = previous < CROSSING_WINDOW && distance > length - CROSSING_WINDOW;
    if (this.awaitingLine) {
      // Desde la parrilla hasta la línea: el cruce no abre otra vuelta.
      if (crossedForward) {
        this.awaitingLine = false;
        // La traza del delta arranca en la línea, con el tiempo que llevó llegar.
        this.trace = [this.lapTime];
      }
      return events;
    }
    if (crossedBackward) {
      // Marcha atrás sobre la línea: la vuelta ya no puede ser válida.
      if (this.lap > 0 && this.valid) {
        this.valid = false;
        events.push({ kind: 'invalidated', reason: 'trackLimits' });
      }
      return events;
    }

    if (crossedForward) {
      // Fracción del paso que ocurrió después de la línea (interpolación del cruce).
      const before = length - previous;
      const travelled = before + distance;
      const overshoot = travelled > 0 ? (distance / travelled) * dt : 0;
      if (this.lap > 0 && this.nextSector === 2) {
        this.completeLap(this.lapTime - overshoot, events);
        const limit = this.options.lapLimit ?? null;
        if (limit !== null && this.lap >= limit) {
          // Bandera a cuadros: no hay otra vuelta.
          this.finished = true;
          this.lapTime -= overshoot;
          return events;
        }
      } else if (this.lap > 0) {
        // Cruzó sin completar los sectores (cortó camino o dio la vuelta): no cuenta.
        this.valid = false;
      }
      this.startLap(overshoot, events);
      return events;
    }

    if (this.lap === 0) return events;

    // Sectores.
    const end = this.nextSector < 2 ? this.options.sectorEnds[this.nextSector as 0 | 1] : null;
    if (end !== undefined && end !== null && previous < end && distance >= end && distance - previous < CROSSING_WINDOW) {
      const index = this.nextSector as 0 | 1;
      const time = this.lapTime - this.sectorStart;
      this.currentSectors.push(time);
      this.sectorStart = this.lapTime;
      this.nextSector++;
      events.push({ kind: 'sector', index, time, result: this.rateSector(index, time) });
    }

    // Traza para el delta.
    const slot = Math.floor(distance / DELTA_STEP);
    while (this.trace.length <= slot && distance - previous < CROSSING_WINDOW) this.trace.push(this.lapTime);
    return events;
  }

  /**
   * Delta en vivo contra la mejor vuelta de la sesión (s, + = más lento) o null
   * si no hay referencia (o si la carrera ya terminó: no hay vuelta en curso).
   */
  delta(distance: number): number | null {
    if (!this.bestTrace || this.lap === 0 || this.finished || this.awaitingLine) return null;
    const position = distance / DELTA_STEP;
    const i = Math.floor(position);
    const a = this.bestTrace[i];
    const b = this.bestTrace[i + 1] ?? this.bestTraceTime ?? undefined;
    if (a === undefined || b === undefined) return null;
    const reference = a + (b - a) * (position - i);
    return this.lapTime - reference;
  }

  /**
   * Vuelta de referencia para el delta desde la primera vuelta (el fantasma de
   * la contrarreloj). Una vuelta válida más rápida la reemplaza.
   */
  setReference(time: number, trace: readonly number[]): void {
    this.bestTrace = [...trace];
    this.bestTraceTime = time;
  }

  /** Traza de la última vuelta completada (tiempo cada `DELTA_STEP` m desde la línea). */
  get lastTrace(): readonly number[] {
    return this.completedTrace;
  }

  /** Anula la vuelta en curso (fuera de pista con las cuatro ruedas, reinicio…). */
  invalidate(reason: 'trackLimits' | 'reset'): LapEvent | null {
    if (this.lap === 0 || !this.valid) return null;
    this.valid = false;
    return { kind: 'invalidated', reason };
  }

  /**
   * Largada detenida: la vuelta 1 empieza ahora (al apagarse el semáforo),
   * aunque el auto todavía esté unos metros detrás de la línea.
   */
  beginRace(): LapEvent {
    this.startLap(0, []);
    this.awaitingLine = true;
    return { kind: 'lapStarted', number: this.lap };
  }

  /** Tras volver a la pista con R: se pierde la referencia del cruce (no cuenta como vuelta). */
  teleported(): void {
    this.lastDistance = null;
  }

  private startLap(elapsed: number, events: LapEvent[]): void {
    this.lap++;
    this.lapTime = elapsed;
    this.valid = true;
    this.sectorStart = 0;
    this.nextSector = 0;
    this.currentSectors.length = 0;
    this.trace = [0];
    events.push({ kind: 'lapStarted', number: this.lap });
  }

  private completeLap(time: number, events: LapEvent[]): void {
    const s1 = this.currentSectors[0] ?? 0;
    const s2 = this.currentSectors[1] ?? 0;
    const s3 = time - s1 - s2;
    const lap: LapRecord = { number: this.lap, time, sectors: [s1, s2, s3], valid: this.valid };
    this.laps.push(lap);
    this.lastLap = lap;
    let bestOfSession = false;
    let personalBest = false;
    const sector3 = this.rateSector(2, s3);
    this.completedTrace = this.trace;
    if (lap.valid) {
      if (!this.bestLap || time < this.bestLap.time) {
        this.bestLap = lap;
        bestOfSession = true;
      }
      if (this.bestTraceTime === null || time < this.bestTraceTime) {
        this.bestTrace = this.trace;
        this.bestTraceTime = time;
      }
      if (this.personalBest === null || time < this.personalBest) {
        this.personalBest = time;
        personalBest = true;
      }
      lap.sectors.forEach((sector, i) => {
        const best = this.bestSectors[i];
        if (best === null || best === undefined || sector < best) this.bestSectors[i] = sector;
      });
    }
    events.push({ kind: 'lapCompleted', lap, sector3, bestOfSession, personalBest });
  }

  /** Compara un sector con el mejor de la sesión (sin guardar: se guarda al cerrar una vuelta válida). */
  private rateSector(index: 0 | 1 | 2, time: number): SectorResult {
    const best = this.bestSectors[index];
    return best === null || time < best ? 'best' : 'slower';
  }
}
