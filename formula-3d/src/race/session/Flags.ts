/**
 * Banderas de la dirección de carrera (lógica pura, sin física ni DOM):
 * - Amarilla: un auto detenido, despistado (tres o cuatro ruedas afuera) o
 *   atascado pone su sector en amarillo, hasta unos segundos después de que
 *   se despeja.
 * - Azul: a un auto lo va a doblar otro que lleva una vuelta más y viene a
 *   menos de ~1 s: tiene que dejarlo pasar.
 * La blanca y negra (límites de pista) y la de cuadros las decide la sesión.
 */

/** Lo que las banderas necesitan saber de cada auto. */
export interface FlagCar {
  /** Distancia desde la línea de meta (m). */
  distance: number;
  /** Progreso de carrera (m): vueltas completas × largo + distancia. */
  progress: number;
  speed: number;
  wheelsOff: number;
  /** No cuenta por ahora (terminó, está en boxes…). */
  ignore: boolean;
}

export type FlagEvent =
  | { kind: 'yellow'; sector: number; on: boolean }
  /** Al jugador lo va a doblar el auto `index` (null = ya pasó o se alejó). */
  | { kind: 'blue'; index: number | null };

export const SECTOR_COUNT = 3;
/** Segundos que sigue la amarilla después de que el sector se despeja. */
const YELLOW_HOLD = 4;
/** Por debajo de esta velocidad (m/s) un auto en carrera es un auto detenido. */
const STOPPED_SPEED = 6;
/** Tiempo (s) con tres o cuatro ruedas afuera que ya es un despiste. */
const OFF_TIME = 0.5;
/** Bandera azul: el que dobla está a menos de este tiempo (s) detrás. */
const BLUE_GAP = 1.2;

export class RaceFlags {
  /** Segundos de amarilla que le quedan a cada sector (0 = verde). */
  readonly yellow: number[] = Array.from({ length: SECTOR_COUNT }, () => 0);
  /** Para cada auto, el índice del que lo va a doblar (null si nadie). */
  readonly blue: Array<number | null>;
  private readonly offTime: number[];
  private readonly incident: boolean[] = Array.from({ length: SECTOR_COUNT }, () => false);

  /**
   * @param length largo de la vuelta (m)
   * @param sectorEnds fin de los sectores 1 y 2, desde la línea de meta (m)
   * @param count autos en carrera
   */
  constructor(
    private readonly length: number,
    private readonly sectorEnds: readonly [number, number],
    count: number,
  ) {
    this.blue = Array.from({ length: count }, () => null);
    this.offTime = Array.from({ length: count }, () => 0);
  }

  /** Sector (0–2) de una distancia desde la línea de meta. */
  sectorOf(distance: number): number {
    if (distance < this.sectorEnds[0]) return 0;
    return distance < this.sectorEnds[1] ? 1 : 2;
  }

  /** ¿Hay amarilla en algún sector? */
  get anyYellow(): boolean {
    return this.yellow.some((left) => left > 0);
  }

  /**
   * Un paso de la carrera.
   * @param player índice del jugador (sus avisos de azul van como eventos)
   */
  update(dt: number, cars: readonly FlagCar[], player: number, events: FlagEvent[] = []): FlagEvent[] {
    this.incident.fill(false);
    cars.forEach((car, i) => {
      if (car.ignore) {
        this.offTime[i] = 0;
        return;
      }
      this.offTime[i] = car.wheelsOff >= 3 ? (this.offTime[i] ?? 0) + dt : 0;
      if (car.speed < STOPPED_SPEED || (this.offTime[i] ?? 0) > OFF_TIME) this.incident[this.sectorOf(car.distance)] = true;
    });
    for (let k = 0; k < SECTOR_COUNT; k++) {
      const before = this.yellow[k] ?? 0;
      const after = this.incident[k] ? YELLOW_HOLD : Math.max(0, before - dt);
      this.yellow[k] = after;
      if (before > 0 !== after > 0) events.push({ kind: 'yellow', sector: k, on: after > 0 });
    }

    // Azul: el de atrás lleva una vuelta más y está a menos de BLUE_GAP s.
    cars.forEach((car, i) => {
      let lapper: number | null = null;
      if (!car.ignore) {
        cars.forEach((other, j) => {
          if (j === i || other.ignore) return;
          const ahead = other.progress - car.progress;
          const reach = BLUE_GAP * Math.max(20, other.speed);
          if (ahead > this.length - reach && ahead < this.length - 2) lapper = j;
        });
      }
      if (lapper !== this.blue[i]) {
        this.blue[i] = lapper;
        if (i === player) events.push({ kind: 'blue', index: lapper });
      }
    });
    return events;
  }

  reset(): void {
    this.yellow.fill(0);
    this.blue.fill(null);
    this.offTime.fill(0);
  }
}
