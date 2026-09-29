import { describe, expect, it } from 'vitest';
import { BrakingAssist } from '../src/assists/BrakingAssist';
import { RacingLineMesh, excessToState } from '../src/assists/RacingLineMesh';
import { SteeringAssist } from '../src/assists/SteeringAssist';
import { ASSIST_PRESETS, activeAssists, customXpMultiplier, xpMultiplier } from '../src/assists/presets';
import { createDefaultAssists } from '../src/core/save/schema';
import { LineFollower } from '../src/race/ai/LineFollower';
import { F1_SPEC, performanceModel } from '../src/race/physics/CarSpec';
import { Vehicle, type DriverInput } from '../src/race/physics/Vehicle';
import { AUSTRALIA } from '../src/tracks/data/australia';
import { LINE_GREEN, LINE_RED, LINE_YELLOW } from '../src/tracks/RacingLine';
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

  it('anti-derrape (Principiante): la misma cola cruzada se endereza casi sin deriva', () => {
    const car = new Vehicle(F1_SPEC, track);
    car.placeAt(track.startS - 300, 0);
    car.electronics = { tractionControl: 0, abs: true, stability: 1, antiSlide: 1, gripBoost: 1.08 };
    car.gearbox.reset(3);
    car.vx = 30;
    car.vy = -5;
    car.yawRate = 1;
    const input: DriverInput = { throttle: 1, brake: 0, steer: 0, drs: false };
    let late = 0;
    for (let t = 0; t < 1.5; t += STEP) {
      car.step(STEP, input);
      // Después de un cuarto de segundo ya no queda deslizamiento.
      if (t > 0.25) late = Math.max(late, Math.abs(Math.atan2(car.vy, car.vx)));
    }
    expect(late).toBeLessThan(0.08);
  });
});

/**
 * Un piloto "de teclado" en Principiante: acelerador a fondo siempre y el
 * volante todo o nada hacia donde va la curva. Las ayudas (frenado completo,
 * dirección hacia el ápice, anti-derrape) tienen que llevarlo por la pista.
 */
function keyboardBeginnerLap(): { impacts: number; offTrack: number; completed: boolean; maxSlip: number } {
  const car = new Vehicle(F1_SPEC, track);
  car.placeAt(track.gridSlot(0).s, 0);
  car.electronics = { tractionControl: 1, abs: true, stability: 1, antiSlide: 1, gripBoost: 1.08 };
  const braking = new BrakingAssist(centerline, line, 'full');
  const steering = new SteeringAssist(track.geometry, line);
  steering.enabled = true;
  const raw: DriverInput = { throttle: 1, brake: 0, steer: 0, drs: false };
  const out: DriverInput = { ...raw };
  let travelled = 0;
  let last = car.projection.s;
  let impacts = 0;
  let offTrack = 0;
  let maxSlip = 0;
  for (let t = 0; t < 150 && travelled < track.length; t += STEP) {
    const ideal = steering.idealSteer(car);
    raw.steer = Math.abs(ideal) > 0.03 ? Math.sign(ideal) : 0;
    steering.apply(braking.apply(raw, car.projection.s, car.vx, out), car, out);
    car.step(STEP, out);
    travelled += track.geometry.deltaS(last, car.projection.s);
    last = car.projection.s;
    if (car.telemetry.impact > 1) impacts++;
    if (car.telemetry.wheelsOff >= 2) offTrack += STEP;
    if (car.vx > 15) maxSlip = Math.max(maxSlip, Math.abs(Math.atan2(car.vy, car.vx)));
  }
  return { impacts, offTrack, completed: travelled >= track.length, maxSlip };
}

describe('ayuda de dirección y anti-derrape', () => {
  it('con volante todo o nada y a fondo, las ayudas lo llevan por la pista sin derrapar', () => {
    const result = keyboardBeginnerLap();
    expect(result.completed).toBe(true);
    expect(result.impacts).toBe(0);
    expect(result.offTrack).toBeLessThan(1);
    // Deriva máxima del auto: nada de cola cruzada (menos de ~6°).
    expect(result.maxSlip).toBeLessThan(0.1);
  });

  it('en las rectas no toca el volante (se puede cambiar de carril)', () => {
    const car = new Vehicle(F1_SPEC, track);
    car.placeAt(track.startS - 250, 0);
    car.vx = 60;
    const steering = new SteeringAssist(track.geometry, line);
    steering.enabled = true;
    const input: DriverInput = { throttle: 1, brake: 0, steer: 1, drs: false };
    const out: DriverInput = { ...input };
    expect(steering.apply(input, car, out).steer).toBe(1);
  });
});

describe('línea dinámica', () => {
  it('interpola verde → amarillo → rojo según el porcentaje de exceso de velocidad', () => {
    expect(excessToState(-0.2)).toBe(LINE_GREEN);
    expect(excessToState(0)).toBe(LINE_GREEN);
    expect(excessToState(0.03)).toBeCloseTo((LINE_GREEN + LINE_YELLOW) / 2, 5);
    expect(excessToState(0.06)).toBeCloseTo(LINE_YELLOW, 5);
    expect(excessToState(0.105)).toBeCloseTo((LINE_YELLOW + LINE_RED) / 2, 5);
    expect(excessToState(0.15)).toBeCloseTo(LINE_RED, 5);
    expect(excessToState(0.5)).toBe(LINE_RED);
  });

  it('el color depende de TU velocidad, no del tramo: lento, verde; pasado, rojo antes de la curva', () => {
    const mesh = new RacingLineMesh(line, performanceModel(F1_SPEC));
    const c1 = track.analysis.corners[0];
    if (!c1) throw new Error('Falta la curva 1.');
    const s = c1.apex - 80;
    const apex = line.indexAt(c1.apex);
    // A la velocidad de la curva: todo verde, también el ápice.
    const slow = mesh.computeTargets(s, line.speedAt(c1.apex));
    expect(slow[apex]).toBe(LINE_GREEN);
    expect(slow[line.indexAt(s)]).toBe(LINE_GREEN);
    // A fondo (85 m/s) a 80 m del ápice ya no se llega: rojo desde donde estás.
    const fast = mesh.computeTargets(s, 85);
    expect(fast[line.indexAt(s)]).toBe(LINE_RED);
    // Subiendo la velocidad de a poco el color nunca retrocede y pasa por el amarillo.
    let previous = LINE_GREEN;
    let sawYellow = false;
    for (let speed = line.speedAt(c1.apex); speed <= 85; speed += 0.5) {
      const state = mesh.computeTargets(s, speed)[line.indexAt(s)] ?? 0;
      expect(state).toBeGreaterThanOrEqual(previous - 1e-6);
      if (state > 0.6 && state < 1.4) sawYellow = true;
      previous = state;
    }
    expect(sawYellow).toBe(true);
    mesh.dispose();
  });
});
