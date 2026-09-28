import { describe, expect, it } from 'vitest';
import { BrakingAssist } from '../src/assists/BrakingAssist';
import { ASSIST_PRESETS, activeAssists, customXpMultiplier, xpMultiplier } from '../src/assists/presets';
import { createDefaultAssists } from '../src/core/save/schema';
import { LineFollower } from '../src/race/ai/LineFollower';
import { F1_SPEC } from '../src/race/physics/CarSpec';
import { Vehicle, type DriverInput } from '../src/race/physics/Vehicle';
import { AUSTRALIA } from '../src/tracks/data/australia';
import { LINE_GREEN, LINE_RED } from '../src/tracks/RacingLine';
import { Track } from '../src/tracks/Track';

const STEP = 1 / 120;
const track = Track.load(AUSTRALIA);
const line = track.racingLine;
const centerline = { speedAt: (s: number) => track.centerSpeedAt(s) };

describe('niveles de ayudas', () => {
  it('cada nivel activa lo que dice la tabla del documento de diseño', () => {
    const settings = createDefaultAssists();
    expect(activeAssists(settings)).toEqual({ ...ASSIST_PRESETS.beginner });
    expect(activeAssists({ ...settings, level: 'advanced' })).toMatchObject({
      braking: 'low',
      traction: 'off',
      abs: true,
      line: 'corners',
      lineType: 'dynamic',
      steering: false,
    });
    // Personalizado usa sus propios valores y nunca la dirección asistida.
    expect(activeAssists({ ...settings, level: 'custom' })).toEqual({ ...settings.custom, steering: false });
  });

  it('XP: 1,0 / 1,25 / 1,5 y en Personalizado se calcula con tope 1,6', () => {
    const settings = createDefaultAssists();
    expect(xpMultiplier(settings)).toBe(1);
    expect(xpMultiplier({ ...settings, level: 'intermediate' })).toBe(1.25);
    expect(xpMultiplier({ ...settings, level: 'advanced' })).toBe(1.5);
    // Configurar a mano un nivel predefinido da su mismo multiplicador.
    for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
      expect(customXpMultiplier(ASSIST_PRESETS[level])).toBe(xpMultiplier({ ...settings, level }));
    }
    const nothing = { braking: 'off', traction: 'off', abs: false, line: 'off', lineType: 'dynamic' } as const;
    expect(customXpMultiplier(nothing)).toBe(1.6);
    // Sin línea, que sea dinámica no suma.
    expect(customXpMultiplier({ ...nothing, lineType: 'fixed' })).toBe(customXpMultiplier(nothing));
  });
});

describe('trazada ideal', () => {
  it('queda dentro de la pista (con los pianos) y es más rápida que ir por el centro', () => {
    const hw = track.geometry.halfWidth;
    for (const d of line.offset) expect(Math.abs(d)).toBeLessThanOrEqual(hw);
    expect(line.lapTime).toBeLessThan(track.analysis.lapTime);
    expect(line.lapTime).toBeGreaterThan(track.analysis.lapTime * 0.8);
  });

  it('en las curvas lentas después de una recta entra por afuera y toca el ápice por dentro', () => {
    // Frenadas fuertes (más de 100 km/h): llegan desde una recta, sin otra curva pegada.
    const slow = track.analysis.corners.filter((c) => c.entrySpeed - c.safeSpeed > 28);
    expect(slow.length).toBeGreaterThanOrEqual(3);
    for (const corner of slow) {
      const inside = corner.direction === 'right' ? 1 : -1;
      expect(line.offsetAt(corner.apex) * inside, `curva ${corner.number}: ápice`).toBeGreaterThan(1.5);
      expect(line.offsetAt(corner.brakingPoint ?? 0) * inside, `curva ${corner.number}: entrada`).toBeLessThan(0);
    }
  });

  it('pinta de rojo las frenadas y de verde las rectas; en "sólo curvas" las rectas se ocultan', () => {
    const c1 = track.analysis.corners[0];
    if (!c1?.brakingPoint) throw new Error('La curva 1 debería tener frenada.');
    // En los 150 m antes del ápice de la curva 1 hay frenada fuerte (rojo).
    let reddest = 0;
    for (let x = 0; x < 150; x += line.step) reddest = Math.max(reddest, line.state[line.indexAt(c1.apex - x)] ?? 0);
    expect(reddest).toBeGreaterThan(LINE_RED - 0.3);
    // Mitad de la recta principal: acelerar y sin línea en "sólo curvas".
    const straight = line.indexAt(track.startS - 250);
    expect(line.state[straight]).toBeCloseTo(LINE_GREEN, 1);
    expect(line.cornerMask[straight]).toBe(0);
    expect(line.cornerMask[line.indexAt(c1.apex)]).toBe(1);
  });
});

/** Un piloto que nunca frena ni levanta: sólo dobla (siguiendo el centro). */
function flatOutLap(braking: 'off' | 'full', stability: number): { impacts: number; offTrack: number; completed: boolean } {
  const car = new Vehicle(F1_SPEC, track);
  car.placeAt(track.gridSlot(0).s, 0);
  car.electronics = { tractionControl: 1, abs: true, stability };
  // Dobla bien (sigue la trazada): lo único que se prueba es la velocidad.
  const steering = new LineFollower(track, { racingLine: true });
  const assist = new BrakingAssist(centerline, line, braking);
  const raw: DriverInput = { throttle: 1, brake: 0, steer: 0, drs: false };
  const out: DriverInput = { ...raw };
  let travelled = 0;
  let last = car.projection.s;
  let impacts = 0;
  let offTrack = 0;
  for (let t = 0; t < 150 && travelled < track.length; t += STEP) {
    raw.steer = steering.drive(car, STEP, { ...raw }).steer;
    raw.throttle = 1;
    raw.brake = 0;
    car.step(STEP, assist.apply(raw, car.projection.s, car.vx, out));
    travelled += track.geometry.deltaS(last, car.projection.s);
    last = car.projection.s;
    if (car.telemetry.impact > 1) impacts++;
    if (car.telemetry.wheelsOff >= 2) offTrack += STEP;
  }
  return { impacts, offTrack, completed: travelled >= track.length };
}

describe('ayuda de frenado', () => {
  it('Completa: acelerando a fondo todo el tiempo, se da la vuelta sin salirse', () => {
    const result = flatOutLap('full', 1);
    expect(result.completed).toBe(true);
    expect(result.impacts).toBe(0);
    // Como mucho, algún roce breve del borde a la salida de una curva.
    expect(result.offTrack).toBeLessThan(1);
  });

  it('sin ayuda, el mismo piloto se sale en la primera frenada', () => {
    const result = flatOutLap('off', 0);
    expect(result.impacts + result.offTrack).toBeGreaterThan(0);
  });

  it('Baja no toca el freno si todavía se llega frenando a fondo', () => {
    const assist = new BrakingAssist(centerline, line, 'low');
    const input: DriverInput = { throttle: 1, brake: 0, steer: 0, drs: false };
    const out: DriverInput = { ...input };
    for (let s = 0; s < track.length; s += 50) {
      assist.apply(input, s, line.speedAt(s) * 0.99, out);
      expect(out.brake).toBe(0);
    }
  });
});

describe('parrilla y estabilidad', () => {
  it('retenido en la parrilla: acelera el motor sin moverse y larga al soltarlo', () => {
    const car = new Vehicle(F1_SPEC, track);
    const slot = track.gridSlot(0);
    car.placeAt(slot.s, slot.d);
    car.held = true;
    const start = { x: car.x, z: car.z };
    const input: DriverInput = { throttle: 1, brake: 0, steer: 0, drs: false };
    for (let t = 0; t < 2; t += STEP) car.step(STEP, input);
    expect(Math.hypot(car.x - start.x, car.z - start.z)).toBe(0);
    expect(car.telemetry.rpm).toBeGreaterThan(9500);
    car.held = false;
    for (let t = 0; t < 1; t += STEP) car.step(STEP, input);
    // 0–100 km/h en ~3 s: al segundo ya va a ~35 km/h.
    expect(car.speed).toBeGreaterThan(8);
  });

  it('el control de estabilidad atrapa un sobreviraje que sin él termina en trompo', () => {
    const maxDrift = (stability: number): number => {
      const car = new Vehicle(F1_SPEC, track);
      car.placeAt(track.startS - 300, 0);
      car.electronics = { tractionControl: 0, abs: true, stability };
      car.gearbox.reset(3);
      // Cola afuera: gira a la izquierda mientras desliza hacia la derecha, a fondo.
      car.vx = 30;
      car.vy = -5;
      car.yawRate = 1;
      let drift = 0;
      const input: DriverInput = { throttle: 1, brake: 0, steer: 0, drs: false };
      for (let t = 0; t < 1.5; t += STEP) {
        car.step(STEP, input);
        drift = Math.max(drift, Math.abs(Math.atan2(car.vy, car.vx)));
      }
      return drift;
    };
    expect(maxDrift(0)).toBeGreaterThan(0.8);
    expect(maxDrift(1)).toBeLessThan(0.35);
  });
});
