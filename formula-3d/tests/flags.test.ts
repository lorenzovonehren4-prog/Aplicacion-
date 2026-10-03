import { describe, expect, it } from 'vitest';
import { RaceFlags, type FlagCar, type FlagEvent } from '../src/race/session/Flags';

const LENGTH = 5000;
const car = (distance: number, lap: number, speed = 70): FlagCar => ({ distance, progress: (lap - 1) * LENGTH + distance, speed, wheelsOff: 0, ignore: false });

describe('banderas', () => {
  it('un auto detenido pone su sector en amarillo hasta unos segundos después de despejarse', () => {
    const flags = new RaceFlags(LENGTH, [1500, 3400], 3);
    const cars = [car(500, 2), car(2000, 2, 2), car(4000, 2)];
    const events = flags.update(0.1, cars, 0);
    expect(events).toContainEqual({ kind: 'yellow', sector: 1, on: true });
    expect(flags.yellow.map((left) => left > 0)).toEqual([false, true, false]);
    // Vuelve a andar: la amarilla sigue un rato y después se va.
    cars[1] = car(2050, 2);
    const later: FlagEvent[] = [];
    for (let t = 0; t < 3; t += 0.1) later.push(...flags.update(0.1, cars, 0));
    expect(flags.yellow[1]).toBeGreaterThan(0);
    for (let t = 0; t < 2; t += 0.1) later.push(...flags.update(0.1, cars, 0));
    expect(later).toContainEqual({ kind: 'yellow', sector: 1, on: false });
    expect(flags.anyYellow).toBe(false);
  });

  it('un despiste (tres ruedas afuera un momento) también es amarilla; los que terminaron no cuentan', () => {
    const flags = new RaceFlags(LENGTH, [1500, 3400], 2);
    const cars = [car(4200, 3), { ...car(800, 3), wheelsOff: 3 }];
    flags.update(0.3, cars, 0);
    expect(flags.anyYellow).toBe(false);
    flags.update(0.3, cars, 0);
    expect(flags.yellow[0]).toBeGreaterThan(0);
    const done = new RaceFlags(LENGTH, [1500, 3400], 1);
    done.update(0.1, [{ ...car(100, 4, 0), ignore: true }], 0);
    expect(done.anyYellow).toBe(false);
  });

  it('bandera azul al que van a doblar, sólo con el que viene a menos de ~1 s', () => {
    const flags = new RaceFlags(LENGTH, [1500, 3400], 3);
    // El 0 va en su vuelta 2 a 1000 m; el 1 en su vuelta 3, 50 m detrás en pista.
    const cars = [car(1000, 2), car(950, 3, 80), car(2000, 2)];
    const events = flags.update(0.1, cars, 0);
    expect(flags.blue[0]).toBe(1);
    expect(events).toContainEqual({ kind: 'blue', index: 1 });
    expect(flags.blue[2]).toBeNull();
    // Lejos (300 m) no hay azul.
    cars[1] = car(700, 3, 80);
    flags.update(0.1, cars, 0);
    expect(flags.blue[0]).toBeNull();
  });
});
