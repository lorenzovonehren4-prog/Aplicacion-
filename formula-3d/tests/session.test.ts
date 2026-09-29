import { describe, expect, it } from 'vitest';
import { ASSIST_PRESETS } from '../src/assists/presets';
import { F1_SPEC } from '../src/race/physics/CarSpec';
import { Session, type SessionEvent } from '../src/race/Session';
import { StartLights } from '../src/race/session/StartLights';
import { AUSTRALIA } from '../src/tracks/data/australia';
import { Track } from '../src/tracks/Track';
import { autopilot } from './helpers/autopilot';

const STEP = 1 / 120;
const track = Track.load(AUSTRALIA);
/** Sin ayudas de manejo: las pruebas controlan el auto con el piloto automático. */
const NO_ASSISTS = { ...ASSIST_PRESETS.intermediate, braking: 'off' as const };

function practice(personalBest: number | null = null): Session {
  return new Session(track, F1_SPEC, personalBest, { mode: 'practice', laps: null }, NO_ASSISTS);
}

function race(laps: number): Session {
  return new Session(track, F1_SPEC, null, { mode: 'race', laps }, NO_ASSISTS, () => 0);
}

/** Maneja con el piloto automático hasta que `until` devuelva true o pase `maxTime`. */
function drive(session: Session, maxTime: number, until: (events: SessionEvent[]) => boolean = () => false): SessionEvent[] {
  const events: SessionEvent[] = [];
  for (let t = 0; t < maxTime && !until(events); t += STEP) {
    const input = autopilot(session.vehicle, track);
    events.push(...session.step(STEP, input, input.throttle > 0.9));
  }
  return events;
}

describe('semáforo', () => {
  it('enciende 5 luces, una por segundo, y las apaga tras la pausa', () => {
    const lights = new StartLights(() => 0.5);
    const times: Array<[string, number]> = [];
    for (let t = 0; t < 10; t += 0.01) {
      for (const event of lights.step(0.01)) times.push([event.kind, t]);
    }
    expect(times.filter(([kind]) => kind === 'light')).toHaveLength(5);
    const [first, second] = times;
    expect((second?.[1] ?? 0) - (first?.[1] ?? 0)).toBeCloseTo(1, 1);
    const out = times.find(([kind]) => kind === 'out');
    // Quinta luz a los 5,5 s y pausa de 0,5 + 2 × 0,5 = 1,5 s.
    expect(out?.[1]).toBeCloseTo(7, 1);
    expect(lights.out).toBe(true);
  });
});

describe('práctica libre', () => {
  it('arranca en la pole, detrás de la línea, en vuelta de salida', () => {
    const session = practice();
    expect(session.phase).toBe('running');
    expect(session.timer.lap).toBe(0);
    expect(session.distance).toBeGreaterThan(track.length - 20);
    expect(session.vehicle.speed).toBe(0);
    expect(session.wrongWay).toBe(false);
  });

  it('con el piloto automático completa una vuelta válida, pasa por las zonas de DRS y la cronometra', () => {
    const session = practice();
    const events = drive(session, 200, (list) => list.some((e) => e.kind === 'lapCompleted'));
    const lap = events.find((e) => e.kind === 'lapCompleted');
    expect(lap?.kind).toBe('lapCompleted');
    if (lap?.kind !== 'lapCompleted') return;
    expect(lap.lap.valid).toBe(true);
    expect(lap.lap.time).toBeGreaterThan(80);
    expect(lap.lap.time).toBeLessThan(160);
    expect(lap.personalBest).toBe(true);
    expect(events.filter((e) => e.kind === 'sector')).toHaveLength(2);
    expect(events.filter((e) => e.kind === 'drsZone' && e.entered).length).toBeGreaterThanOrEqual(3);
    expect(events.some((e) => e.kind === 'drsOpened')).toBe(true);
  });

  it('volver a pista anula la vuelta y deja el auto detenido sobre el asfalto', () => {
    const session = practice();
    for (let t = 0; t < 4; t += STEP) session.step(STEP, { throttle: 1, brake: 0, steer: 0 }, false);
    expect(session.timer.lap).toBe(1);
    const events = session.resetToTrack();
    expect(events.some((e) => e.kind === 'invalidated')).toBe(true);
    expect(session.vehicle.speed).toBe(0);
    expect(Math.abs(session.vehicle.projection.d)).toBeLessThan(0.5);
  });

  it('reiniciar vuelve a la parrilla y conserva el récord personal', () => {
    const session = practice(95);
    for (let t = 0; t < 3; t += STEP) session.step(STEP, { throttle: 1, brake: 0, steer: 0 }, false);
    session.restart();
    expect(session.timer.lap).toBe(0);
    expect(session.timer.personalBest).toBe(95);
    expect(session.vehicle.speed).toBe(0);
  });

  it('avisa si el auto va en sentido contrario', () => {
    const session = practice();
    const v = session.vehicle;
    v.heading += Math.PI;
    v.vx = 10;
    expect(session.wrongWay).toBe(true);
  });
});

describe('carrera', () => {
  it('en la parrilla el auto espera al semáforo aunque se acelere', () => {
    const session = race(2);
    expect(session.phase).toBe('grid');
    const start = { x: session.vehicle.x, z: session.vehicle.z };
    const events: SessionEvent[] = [];
    for (let t = 0; t < 5.9; t += STEP) events.push(...session.step(STEP, { throttle: 1, brake: 0, steer: 0 }, false));
    expect(events.filter((e) => e.kind === 'light')).toHaveLength(5);
    expect(session.vehicle.x).toBe(start.x);
    expect(session.vehicle.z).toBe(start.z);
    expect(session.vehicle.telemetry.rpm).toBeGreaterThan(9000);
    // Con la pausa mínima (0,5 s) se apagan a los 6 s: largada con el reloj en marcha.
    for (let t = 0; t < 0.2; t += STEP) events.push(...session.step(STEP, { throttle: 1, brake: 0, steer: 0 }, false));
    expect(events.some((e) => e.kind === 'lightsOut')).toBe(true);
    expect(session.phase).toBe('running');
    expect(session.timer.lap).toBe(1);
  });

  it('a 2 vueltas: DRS desde la vuelta 2, última vuelta, bandera y enfriamiento', () => {
    const session = race(2);
    const events = drive(session, 360, (list) => list.some((e) => e.kind === 'finished'));
    const kinds = events.map((e) => e.kind);
    // En la vuelta 1 no hay DRS; se habilita al empezar la 2, que es la última.
    const firstOpen = kinds.indexOf('drsOpened');
    const enabled = kinds.indexOf('drsEnabled');
    expect(enabled).toBeGreaterThan(-1);
    expect(firstOpen).toBeGreaterThan(enabled);
    expect(kinds).toContain('lastLap');
    // La largada cruzando la línea no abre otra vuelta: sólo "vuelta 1" y "vuelta 2".
    expect(events.filter((e) => e.kind === 'lapStarted').map((e) => (e.kind === 'lapStarted' ? e.number : 0))).toEqual([1, 2]);

    const finished = events.find((e) => e.kind === 'finished');
    if (finished?.kind !== 'finished') throw new Error('La carrera no terminó.');
    const { result } = finished;
    expect(result.laps).toHaveLength(2);
    expect(result.totalTime).toBeCloseTo((result.laps[0]?.time ?? 0) + (result.laps[1]?.time ?? 0), 5);
    // La vuelta 1 arranca detenida: es la más lenta.
    expect(result.laps[0]?.time ?? 0).toBeGreaterThan(result.laps[1]?.time ?? 0);
    expect(session.phase).toBe('finished');

    // Enfriamiento: el auto sigue solo, sin chocar, y baja la velocidad.
    let impacts = 0;
    for (let t = 0; t < 10; t += STEP) {
      session.step(STEP, { throttle: 1, brake: 0, steer: 1 }, true);
      if (session.vehicle.telemetry.impact > 1) impacts++;
    }
    expect(impacts).toBe(0);
    expect(session.vehicle.speed).toBeLessThan(25);
    expect(session.vehicle.speed).toBeGreaterThan(5);
    expect(session.timer.lap).toBe(2);
  });
});
