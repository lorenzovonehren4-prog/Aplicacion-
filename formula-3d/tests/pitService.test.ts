import { describe, expect, it } from 'vitest';
import { gunStarts, jackHits, LIFT_HEIGHT, liftAt, servicePose, TYRES_DONE, wheelWork, WHEELS, type WheelWork } from '../src/race/session/PitService';
import { SERVICE_BASE } from '../src/race/session/PitStop';

const work = (): WheelWork => ({ gun: false, off: 0, on: 0, attached: true, done: false });

describe('coreografía de la parada', () => {
  it('los gatos suben con el auto parado, sostienen y bajan justo antes de la salida', () => {
    const duration = 2.4;
    expect(liftAt(-1, duration, true)).toBe(0);
    expect(liftAt(0, duration, true)).toBe(0);
    expect(liftAt(0.5, duration, true)).toBeCloseTo(LIFT_HEIGHT, 5);
    expect(liftAt(0.5, duration, false)).toBeCloseTo(LIFT_HEIGHT, 5);
    // La trompa sube antes que la cola (entra primero el gato delantero).
    expect(liftAt(0.15, duration, true)).toBeGreaterThan(liftAt(0.15, duration, false));
    expect(liftAt(duration, duration, true)).toBe(0);
    expect(liftAt(duration, duration, false)).toBe(0);
  });

  it('cada rueda: sale la vieja, entra la nueva y queda ajustada antes de bajar los gatos', () => {
    // Con el servicio más corto todo entra: las cuatro ruedas listas con el auto todavía arriba.
    expect(TYRES_DONE).toBeLessThan(SERVICE_BASE - 0.3);
    for (let wheel = 0; wheel < WHEELS; wheel++) {
      const w = work();
      expect(wheelWork(0.1, wheel, w).attached).toBe(true);
      expect(wheelWork(0.9, wheel, w).attached).toBe(false);
      expect(w.off).toBe(1);
      expect(wheelWork(TYRES_DONE, wheel, w).attached).toBe(true);
      expect(w.on).toBe(1);
      expect(w.done).toBe(true);
      expect(liftAt(TYRES_DONE, SERVICE_BASE, true)).toBeGreaterThan(0.05);
    }
  });

  it('la pose del auto: levantado y sin ruedas en el cambio; normal fuera del box', () => {
    const pose = { liftFront: 1, liftRear: 1, wheelsOff: 15 };
    servicePose(null, 0, pose);
    expect(pose).toEqual({ liftFront: 0, liftRear: 0, wheelsOff: 0 });
    servicePose(0.9, 2.4, pose);
    expect(pose.wheelsOff).toBe(15);
    expect(pose.liftFront).toBeGreaterThan(0.05);
    servicePose(2.4, 2.4, pose);
    expect(pose.wheelsOff).toBe(0);
    expect(pose.liftFront).toBe(0);
  });

  it('sonidos: las pistolas arrancan dos veces por rueda y los gatos golpean tres veces', () => {
    const duration = 2.4;
    let guns = 0;
    let jacks = 0;
    const step = 1 / 60;
    for (let t = 0; t < duration; t += step) {
      if (gunStarts(t, t + step)) guns++;
      if (jackHits(t, t + step, duration)) jacks++;
    }
    // Las cuatro ruedas aflojan y ajustan (algunas en el mismo cuadro).
    expect(guns).toBeGreaterThanOrEqual(4);
    expect(guns).toBeLessThanOrEqual(8);
    expect(jacks).toBe(3);
  });
});
