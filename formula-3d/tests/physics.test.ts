import { describe, expect, it } from 'vitest';
import { createDefaultControls } from '../src/core/save/schema';
import { F1_SPEC } from '../src/race/physics/CarSpec';
import { Gearbox } from '../src/race/physics/Gearbox';
import { magicFormula, Vehicle } from '../src/race/physics/Vehicle';
import { AUSTRALIA } from '../src/tracks/data/australia';
import { Track } from '../src/tracks/Track';
import { autopilot } from './helpers/autopilot';
import { KeyboardPilot } from './helpers/keyboardPilot';
import { SKIDPAD } from './helpers/skidpad';

const track = Track.load(AUSTRALIA);
const STEP = 1 / 120;

function carOnStraight(): Vehicle {
  const car = new Vehicle(F1_SPEC, track);
  // Pole: el comienzo de la recta principal.
  car.placeAt(track.gridSlot(19).s, 0);
  return car;
}

describe('neumáticos y caja', () => {
  it('la fuerza lateral sube hasta el pico y luego cae', () => {
    const shape = { B: 12, C: 1.5 };
    expect(magicFormula(0, shape)).toBe(0);
    expect(magicFormula(0.05, shape)).toBeGreaterThan(0.5);
    const peak = Math.max(...Array.from({ length: 60 }, (_, i) => magicFormula(i * 0.005, shape)));
    expect(peak).toBeCloseTo(1, 2);
    expect(magicFormula(0.6, shape)).toBeLessThan(peak);
    expect(magicFormula(-0.05, shape)).toBeCloseTo(-magicFormula(0.05, shape));
  });

  it('la caja sube y baja marchas sin cazar', () => {
    const box = new Gearbox(F1_SPEC);
    let shifts = 0;
    let last = box.gear;
    for (let v = 0; v <= 92; v += 0.25) {
      box.update(0.05, { speed: v, throttle: 1, brake: 0, wheelspin: false });
      if (box.gear !== last) {
        shifts++;
        expect(box.gear).toBe(last + 1);
        last = box.gear;
      }
    }
    expect(box.gear).toBe(8);
    expect(shifts).toBe(7);
    for (let v = 92; v >= 10; v -= 0.25) box.update(0.05, { speed: v, throttle: 0, brake: 1, wheelspin: false });
    expect(box.gear).toBeLessThanOrEqual(2);
  });
});

describe('prestaciones del monoplaza', () => {
  it('acelera de 0 a 100 km/h en unos 2,6 s', () => {
    const car = carOnStraight();
    let t = 0;
    while (car.speed < 100 / 3.6 && t < 10) {
      car.step(STEP, { throttle: 1, brake: 0, steer: 0, drs: false });
      t += STEP;
    }
    expect(t).toBeGreaterThan(2.1);
    expect(t).toBeLessThan(3.2);
  });

  it('llega a unos 320–340 km/h y más con DRS', () => {
    const car = carOnStraight();
    for (let i = 0; i < 120 * 40; i++) {
      car.placeAt(track.gridSlot(19).s, 0);
      break;
    }
    // Recta infinita: se reubica al auto en la recta cada vez que se acerca a la curva.
    let top = 0;
    let s = track.gridSlot(19).s;
    for (let i = 0; i < 120 * 45; i++) {
      car.step(STEP, { throttle: 1, brake: 0, steer: 0, drs: false });
      top = Math.max(top, car.speed);
      if (track.geometry.deltaS(s, car.projection.s) > 700) {
        const speed = car.vx;
        const gear = car.gearbox.gear;
        car.placeAt(s, 0);
        car.vx = speed;
        car.gearbox.reset(gear);
        s = track.gridSlot(19).s;
      }
    }
    expect(top * 3.6).toBeGreaterThan(315);
    expect(top * 3.6).toBeLessThan(345);
  });

  it('frena de 300 a 80 km/h en unos 80–130 m', () => {
    const car = carOnStraight();
    car.vx = 300 / 3.6;
    car.gearbox.reset(7);
    const start = car.projection.s;
    let steps = 0;
    while (car.speed > 80 / 3.6 && steps < 2000) {
      car.step(STEP, { throttle: 0, brake: 1, steer: 0, drs: false });
      steps++;
    }
    const distance = track.geometry.deltaS(start, car.projection.s);
    expect(distance).toBeGreaterThan(70);
    expect(distance).toBeLessThan(140);
  });

  it('se queda quieto sin mandos y hace marcha atrás manteniendo el freno', () => {
    const car = carOnStraight();
    for (let i = 0; i < 240; i++) car.step(STEP, { throttle: 0, brake: 0, steer: 0, drs: false });
    expect(car.speed).toBeLessThan(0.05);
    for (let i = 0; i < 240; i++) car.step(STEP, { throttle: 0, brake: 1, steer: 0, drs: false });
    expect(car.gearbox.gear).toBe(-1);
    expect(car.vx).toBeLessThan(-0.5);
  });

  it('choca contra el muro sin atravesarlo', () => {
    const car = carOnStraight();
    car.vx = 50;
    // Apuntando 30° hacia la izquierda de la pista.
    car.heading += 0.5;
    let maxOut = 0;
    let impact = 0;
    for (let i = 0; i < 240; i++) {
      car.step(STEP, { throttle: 0.5, brake: 0, steer: 0, drs: false });
      const wall = track.trackside.wallLeft[car.projection.index] ?? 0;
      maxOut = Math.max(maxOut, -car.projection.d - wall);
      impact = Math.max(impact, car.telemetry.impact);
    }
    expect(impact).toBeGreaterThan(5);
    expect(maxOut).toBeLessThan(0.5);
  });
});

describe('vuelta completa con piloto automático', () => {
  it('completa Albert Park sin salirse en un tiempo realista', () => {
    const car = new Vehicle(F1_SPEC, track);
    const slot = track.gridSlot(0);
    car.placeAt(slot.s, 0);
    let travelled = 0;
    let last = car.projection.s;
    let time = 0;
    let offTrackTime = 0;
    let impacts = 0;
    let maxLateralG = 0;
    while (travelled < track.length && time < 200) {
      car.step(STEP, autopilot(car, track));
      time += STEP;
      travelled += track.geometry.deltaS(last, car.projection.s);
      last = car.projection.s;
      if (car.telemetry.wheelsOff >= 2) offTrackTime += STEP;
      if (car.telemetry.impact > 1) impacts++;
      maxLateralG = Math.max(maxLateralG, Math.abs(car.telemetry.ay) / 9.81);
    }
    console.info(
      `vuelta autopiloto: ${time.toFixed(2)} s · fuera ${offTrackTime.toFixed(2)} s · ` +
        `choques ${impacts} · g lateral máx ${maxLateralG.toFixed(2)}`,
    );
    expect(travelled).toBeGreaterThanOrEqual(track.length);
    expect(impacts).toBe(0);
    expect(offTrackTime).toBeLessThan(1);
    // El piloto de prueba va por el centro y con margen: más lento que un humano.
    expect(time).toBeGreaterThan(75);
    expect(time).toBeLessThan(110);
    expect(maxLateralG).toBeGreaterThan(2.5);
  });
});

describe('vuelta completa con teclado', () => {
  it('con mandos digitales (rampas del teclado) el auto se puede llevar sin trompos', () => {
    const car = new Vehicle(F1_SPEC, track);
    const slot = track.gridSlot(0);
    car.placeAt(slot.s, 0);
    const pilot = new KeyboardPilot();
    let travelled = 0;
    let last = car.projection.s;
    let time = 0;
    let offTrackTime = 0;
    let impacts = 0;
    let maxSlip = 0;
    while (travelled < track.length && time < 220) {
      // Piloto más prudente (margen 0,85): con teclado no se dosifica igual.
      const ideal = autopilot(car, track, 0.85);
      car.step(STEP, pilot.drive(ideal, STEP, car.speed));
      time += STEP;
      travelled += track.geometry.deltaS(last, car.projection.s);
      last = car.projection.s;
      if (car.telemetry.wheelsOff >= 2) offTrackTime += STEP;
      if (car.telemetry.impact > 1) impacts++;
      if (car.speed > 10) maxSlip = Math.max(maxSlip, Math.abs(Math.atan2(car.vy, car.vx)));
    }
    console.info(
      `vuelta con teclado: ${time.toFixed(2)} s · fuera ${offTrackTime.toFixed(2)} s · ` +
        `choques ${impacts} · deriva máx ${((maxSlip * 180) / Math.PI).toFixed(1)}°`,
    );
    expect(travelled).toBeGreaterThanOrEqual(track.length);
    expect(impacts).toBe(0);
    expect(offTrackTime).toBeLessThan(2);
    // Sin trompos: la deriva del auto nunca pasa de ~12°.
    expect(maxSlip).toBeLessThan(0.21);
  });
});

describe('curvas rápidas con la flecha mantenida', () => {
  /** Mantiene la flecha (con la rampa del teclado) 3 s a velocidad constante; devuelve la deriva máxima (rad). */
  function holdCorner(kmh: number, stability: number): { drift: number; ay: number } {
    const car = new Vehicle(F1_SPEC, SKIDPAD);
    car.placeAt(0, 0);
    car.vx = kmh / 3.6;
    car.electronics = { tractionControl: 1, abs: true, stability };
    const target = car.vx;
    let steer = 0;
    let drift = 0;
    let ay = 0;
    for (let t = 0; t < 3; t += STEP) {
      steer = Math.min(1, steer + ((3.8 - 2.1 * Math.min(1, car.speed / 80)) * STEP));
      car.step(STEP, { throttle: car.vx < target ? 0.6 : 0.2, brake: 0, steer, drs: false });
      drift = Math.max(drift, Math.abs(Math.atan2(car.vy, car.vx)));
      ay = Math.max(ay, Math.abs(car.telemetry.ay));
    }
    return { drift, ay };
  }

  it('no hace trompo a 180, 240 ni 290 km/h, con o sin control de estabilidad', () => {
    for (const kmh of [180, 240, 290]) {
      // Sin ayudas la cola puede moverse un poco (≤ 14°); con el control de estabilidad casi nada (≤ 9°).
      expect(holdCorner(kmh, 0).drift).toBeLessThan(0.25);
      expect(holdCorner(kmh, 1).drift).toBeLessThan(0.16);
    }
    // Y dobla con la carga aerodinámica: más de 4 g a 290 km/h.
    expect(holdCorner(290, 1).ay / 9.81).toBeGreaterThan(4);
  });
});

describe('tracción a la salida de las curvas', () => {
  /** Curva lenta con el volante girado y acelerador a fondo sin control de tracción: deriva máx y velocidad ganada. */
  function exitCorner(kmh: number): { drift: number; gained: number } {
    const car = new Vehicle(F1_SPEC, SKIDPAD);
    car.placeAt(0, 0);
    car.vx = kmh / 3.6;
    car.electronics = { tractionControl: 0, abs: true, stability: 0 };
    let drift = 0;
    // Se asienta en la curva a velocidad constante y después pisa a fondo con medio volante.
    for (let t = 0; t < 1.5; t += STEP) car.step(STEP, { throttle: 0.35, brake: 0, steer: 0.5, drs: false });
    const start = car.speed;
    for (let t = 0; t < 1.5; t += STEP) {
      car.step(STEP, { throttle: 1, brake: 0, steer: 0.5, drs: false });
      drift = Math.max(drift, Math.abs(Math.atan2(car.vy, car.vx)));
    }
    return { drift, gained: car.speed - start };
  }

  it('a fondo con el volante girado la cola aguanta y el auto acelera', () => {
    for (const kmh of [80, 120]) {
      const { drift, gained } = exitCorner(kmh);
      console.info(`salida de curva a ${kmh} km/h: deriva ${((drift * 180) / Math.PI).toFixed(1)}° · +${(gained * 3.6).toFixed(0)} km/h`);
      expect(drift).toBeLessThan(0.2);
      expect(gained).toBeGreaterThan(3);
    }
  });
});

describe('mandos de manejo', () => {
  it('curva del stick con zona muerta y sensibilidad', async () => {
    const { shapeStick } = await import('../src/race/input/DrivingInput');
    const base = { ...createDefaultControls(), steeringSensitivity: 1, steeringDeadzone: 0.1, vibration: true };
    expect(shapeStick(0.05, base)).toBe(0);
    expect(shapeStick(1, base)).toBeCloseTo(1);
    expect(shapeStick(-1, base)).toBeCloseTo(-1);
    expect(shapeStick(0.55, base)).toBeGreaterThan(0.2);
    expect(shapeStick(0.55, base)).toBeLessThan(0.5);
    // Más sensibilidad = más respuesta a mitad de recorrido.
    expect(shapeStick(0.55, { ...base, steeringSensitivity: 1.5 })).toBeGreaterThan(shapeStick(0.55, base));
  });
});
