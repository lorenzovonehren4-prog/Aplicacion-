import { describe, expect, it } from 'vitest';
import { LapTimer, type LapEvent } from '../src/race/session/LapTimer';

const LENGTH = 1000;
const DT = 1 / 120;

/** Recorre la pista a velocidad constante desde `from` durante `seconds`. */
function drive(timer: LapTimer, from: number, speed: number, seconds: number): { events: LapEvent[]; distance: number } {
  const events: LapEvent[] = [];
  let distance = from;
  for (let t = 0; t < seconds; t += DT) {
    distance = (distance + speed * DT) % LENGTH;
    events.push(...timer.step(distance, DT));
  }
  return { events, distance };
}

function create(personalBest: number | null = null): LapTimer {
  return new LapTimer({ length: LENGTH, sectorEnds: [300, 650], personalBest });
}

describe('LapTimer', () => {
  it('la vuelta de salida no se cronometra y la primera vuelta empieza en la línea', () => {
    const timer = create();
    // 100 m a 50 m/s: a los 1,9 s todavía no llegó a la línea.
    const outLap = drive(timer, 900, 50, 1.9);
    expect(timer.lap).toBe(0);
    expect(timer.lapTime).toBe(0);
    // 0,2 s más: cruza a los 2 s y lleva ~0,1 s de vuelta.
    const { events } = drive(timer, outLap.distance, 50, 0.2);
    expect(events.filter((e) => e.kind === 'lapStarted')).toHaveLength(1);
    expect(timer.lap).toBe(1);
    expect(timer.lapTime).toBeGreaterThan(0.05);
    expect(timer.lapTime).toBeLessThan(0.15);
  });

  it('cronometra la vuelta, los tres sectores y detecta la mejor', () => {
    const timer = create();
    let { distance } = drive(timer, 950, 50, 1.01); // cruza la línea
    const lap1 = drive(timer, distance, 50, 20);
    distance = lap1.distance;
    const completed = lap1.events.find((e) => e.kind === 'lapCompleted');
    expect(completed?.kind).toBe('lapCompleted');
    if (completed?.kind !== 'lapCompleted') return;
    expect(completed.lap.time).toBeCloseTo(20, 1);
    expect(completed.lap.sectors[0]).toBeCloseTo(6, 1);
    expect(completed.lap.sectors[1]).toBeCloseTo(7, 1);
    expect(completed.lap.sectors[2]).toBeCloseTo(7, 1);
    expect(completed.bestOfSession).toBe(true);
    expect(completed.personalBest).toBe(true);
    const sectors = lap1.events.filter((e) => e.kind === 'sector');
    expect(sectors).toHaveLength(2);

    // Segunda vuelta más lenta: no es la mejor y los sectores salen "más lentos".
    const lap2 = drive(timer, distance, 40, 25);
    const second = lap2.events.find((e) => e.kind === 'lapCompleted');
    expect(second?.kind === 'lapCompleted' && second.bestOfSession).toBe(false);
    expect(lap2.events.some((e) => e.kind === 'sector' && e.result === 'slower')).toBe(true);
    expect(timer.bestLap?.time).toBeCloseTo(20, 1);
  });

  it('el delta en vivo compara contra la mejor vuelta', () => {
    const timer = create();
    let { distance } = drive(timer, 950, 50, 1.01);
    ({ distance } = drive(timer, distance, 50, 20));
    // Media vuelta a 40 m/s: 500 m en 12,5 s contra 10 s de la mejor.
    ({ distance } = drive(timer, distance, 40, 12.5));
    const delta = timer.delta(distance);
    expect(delta).not.toBeNull();
    expect(delta ?? 0).toBeGreaterThan(2);
    expect(delta ?? 0).toBeLessThan(3);
  });

  it('una vuelta anulada no cuenta como mejor ni como récord', () => {
    const timer = create(30);
    const { distance } = drive(timer, 950, 50, 1.01);
    timer.invalidate('trackLimits');
    const lap = drive(timer, distance, 50, 20);
    const completed = lap.events.find((e) => e.kind === 'lapCompleted');
    expect(completed?.kind === 'lapCompleted' && completed.lap.valid).toBe(false);
    expect(timer.bestLap).toBeNull();
    expect(timer.personalBest).toBe(30);
    // La siguiente vuelta vuelve a ser válida.
    expect(timer.valid).toBe(true);
  });

  it('bate el récord personal guardado', () => {
    const timer = create(21);
    const { distance } = drive(timer, 950, 50, 1.01);
    const lap = drive(timer, distance, 50, 20);
    const completed = lap.events.find((e) => e.kind === 'lapCompleted');
    expect(completed?.kind === 'lapCompleted' && completed.personalBest).toBe(true);
    expect(timer.personalBest).toBeCloseTo(20, 1);
  });

  it('cruzar la línea sin pasar por los sectores no cuenta como vuelta', () => {
    const timer = create();
    drive(timer, 950, 50, 1.01);
    // Retrocede por la línea y vuelve a cruzarla hacia adelante.
    const events: LapEvent[] = [];
    for (const d of [20, 5, 990, 970, 990, 10]) events.push(...timer.step(d, DT));
    expect(events.some((e) => e.kind === 'lapCompleted')).toBe(false);
    expect(events.some((e) => e.kind === 'invalidated')).toBe(true);
  });

  it('tras volver a pista con R no se detecta un cruce falso', () => {
    const timer = create();
    const { distance } = drive(timer, 950, 50, 1.01);
    timer.step(distance + 10, DT);
    timer.teleported();
    // Aparece del otro lado de la línea (cerca del final): no es un cruce.
    const events = [...timer.step(980, DT), ...timer.step(985, DT)];
    expect(events).toHaveLength(0);
    expect(timer.lap).toBe(1);
  });

  it('en carrera: la largada detenida no abre otra vuelta y la bandera detiene el cronómetro', () => {
    const timer = new LapTimer({ length: LENGTH, sectorEnds: [300, 650], personalBest: null, lapLimit: 2 });
    // Parrilla 6 m detrás de la línea: la vuelta 1 empieza al apagarse el semáforo.
    timer.step(LENGTH - 6, DT);
    expect(timer.beginRace()).toEqual({ kind: 'lapStarted', number: 1 });
    const events = [...drive(timer, LENGTH - 6, 50, 45).events];
    const started = events.filter((e) => e.kind === 'lapStarted');
    const completed = events.filter((e) => e.kind === 'lapCompleted');
    expect(started.map((e) => (e.kind === 'lapStarted' ? e.number : 0))).toEqual([2]);
    expect(completed).toHaveLength(2);
    expect(timer.finished).toBe(true);
    expect(timer.lap).toBe(2);
    // Vuelta 1: 1006 m a 50 m/s; vuelta 2: 1000 m.
    expect(timer.laps[0]?.time).toBeCloseTo(20.12, 1);
    expect(timer.laps[1]?.time).toBeCloseTo(20, 1);
  });
});
