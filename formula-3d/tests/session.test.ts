import { describe, expect, it } from 'vitest';
import { ASSIST_PRESETS } from '../src/assists/presets';
import { F1_SPEC } from '../src/race/physics/CarSpec';
import { classify, Session, TIME_PENALTY, TRACK_LIMIT_WARNINGS, type SessionEvent, type StandingRow } from '../src/race/Session';
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

const IDLE = { throttle: 0, brake: 0, steer: 0 };

/**
 * Maneja con el piloto automático hasta que `until` devuelva true o pase
 * `maxTime`. En la parrilla espera las luces sin acelerar (como hay que hacer).
 */
function drive(session: Session, maxTime: number, until: (events: SessionEvent[]) => boolean = () => false): SessionEvent[] {
  const events: SessionEvent[] = [];
  for (let t = 0; t < maxTime && !until(events); t += STEP) {
    if (session.phase === 'grid') {
      events.push(...session.step(STEP, IDLE, false));
      continue;
    }
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
  it('en la parrilla el auto espera al semáforo; acelerar al apagarse da el tiempo de reacción', () => {
    const session = race(2);
    expect(session.phase).toBe('grid');
    const start = { x: session.vehicle.x, z: session.vehicle.z };
    const events: SessionEvent[] = [];
    for (let t = 0; t < 5.9; t += STEP) events.push(...session.step(STEP, IDLE, false));
    expect(events.filter((e) => e.kind === 'light')).toHaveLength(5);
    expect(session.vehicle.x).toBe(start.x);
    expect(session.vehicle.z).toBe(start.z);
    // Con la pausa mínima (0,5 s) se apagan a los 6 s: largada con el reloj en marcha.
    for (let t = 0; t < 0.2 && session.phase === 'grid'; t += STEP) events.push(...session.step(STEP, IDLE, false));
    expect(events.some((e) => e.kind === 'lightsOut')).toBe(true);
    expect(session.phase).toBe('running');
    expect(session.timer.lap).toBe(1);
    // Reacciona 0,25 s después.
    for (let t = 0; t < 0.25; t += STEP) events.push(...session.step(STEP, IDLE, false));
    for (let t = 0; t < 0.1; t += STEP) events.push(...session.step(STEP, { throttle: 1, brake: 0, steer: 0 }, false));
    const reaction = events.find((e) => e.kind === 'reaction');
    expect(reaction?.kind === 'reaction' ? reaction.time : 0).toBeCloseTo(0.25, 1);
    expect(session.jumpStart).toBe(false);
    expect(session.penalties[session.player.index]).toBe(0);
  });

  it('acelerar antes de la primera luz sólo avisa; con el semáforo encendido es salida en falso (+5 s)', () => {
    const session = race(2);
    const events: SessionEvent[] = [];
    const gas = { throttle: 1, brake: 0, steer: 0 };
    // Antes de la primera luz (1,5 s): aviso, el auto no se mueve.
    for (let t = 0; t < 1; t += STEP) events.push(...session.step(STEP, gas, false));
    expect(events.filter((e) => e.kind === 'gridHint')).toHaveLength(1);
    expect(session.jumpStart).toBe(false);
    expect(session.vehicle.speed).toBe(0);
    // Con una luz encendida: salida en falso, sanción y el auto se escapa un poco, nada más.
    for (let t = 0; t < 3; t += STEP) events.push(...session.step(STEP, gas, false));
    const jump = events.filter((e) => e.kind === 'jumpStart');
    expect(jump).toHaveLength(1);
    expect(session.jumpStart).toBe(true);
    expect(session.penalties[session.player.index]).toBe(TIME_PENALTY);
    const moved = track.geometry.deltaS(track.gridSlot(session.player.index).s, session.vehicle.projection.s);
    expect(moved).toBeGreaterThan(0.2);
    expect(moved).toBeLessThan(2.5);
    expect(session.phase).toBe('grid');
    // Sin tiempo de reacción y con la sanción en el resultado.
    const rest = drive(session, 400, (list) => list.some((e) => e.kind === 'finished'));
    expect(rest.some((e) => e.kind === 'reaction')).toBe(false);
    const finished = rest.find((e) => e.kind === 'finished');
    expect(finished?.kind === 'finished' ? finished.result.penalty : -1).toBe(TIME_PENALTY);
  });

  it('límites de pista en carrera: advertencias, bandera blanca y negra y después sanciones', () => {
    const session = race(3);
    drive(session, 30, () => session.timer.lap >= 1 && session.vehicle.speed > 30);
    const events: SessionEvent[] = [];
    // Las ruedas afuera las decide la prueba (la física las recalcula en cada paso).
    const v = session.vehicle;
    const physics = v.step.bind(v);
    let off = 0;
    v.step = (dt, input): void => {
      physics(dt, input);
      v.telemetry.wheelsOff = off;
    };
    // Cada salida (las cuatro ruedas afuera y de vuelta adentro) es una infracción.
    for (let k = 0; k < TRACK_LIMIT_WARNINGS + 2; k++) {
      off = 4;
      for (let t = 0; t < 0.5; t += STEP) events.push(...session.step(STEP, IDLE, false));
      off = 0;
      for (let t = 0; t < 1.2; t += STEP) events.push(...session.step(STEP, IDLE, false));
    }
    const offenses = events.filter((e) => e.kind === 'trackLimits');
    expect(offenses.map((e) => (e.kind === 'trackLimits' ? e.count : 0))).toEqual([1, 2, 3, 4, 5]);
    expect(offenses.map((e) => (e.kind === 'trackLimits' ? e.penalty : 0))).toEqual([0, 0, 0, TIME_PENALTY, TIME_PENALTY]);
    expect(session.penalties[session.player.index]).toBe(2 * TIME_PENALTY);
    expect(session.warnings).toBe(TRACK_LIMIT_WARNINGS + 2);
    // Ya no se avisa "vuelta anulada": la vuelta sólo queda sin récord.
    expect(session.timer.valid).toBe(false);
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

describe('clasificación con sanciones', () => {
  const row = (index: number, finishTime: number | null, penalty = 0, laps = 3): StandingRow => ({
    position: index + 1,
    index,
    name: `P${index}`,
    code: `P${index}`,
    number: index,
    teamName: '',
    teamColor: '',
    isPlayer: index === 0,
    finished: finishTime !== null,
    laps,
    finishTime,
    interval: { seconds: null, laps: 0 },
    gap: { seconds: null, laps: 0 },
    bestLap: null,
    fastestLap: false,
    penalty,
    inPit: false,
  });

  it('el que llega primero con +5 s queda detrás de quien cruzó menos de 5 s después', () => {
    const table = classify([row(0, 100, 5), row(1, 102), row(2, 107), row(3, null, 0, 2)]);
    expect(table.map((r) => r.index)).toEqual([1, 0, 2, 3]);
    expect(table.map((r) => r.position)).toEqual([1, 2, 3, 4]);
    expect(table[1]?.interval.seconds).toBeCloseTo(3);
    expect(table[2]?.gap.seconds).toBeCloseTo(5);
  });

  it('sin sanciones deja el orden de llegada', () => {
    const rows = [row(0, 100), row(1, 102)];
    expect(classify(rows)).toBe(rows);
  });

  it('una vuelta menos sigue detrás aunque su tiempo sea menor', () => {
    const table = classify([row(0, 100, 5, 3), row(1, 101, 0, 2)]);
    expect(table.map((r) => r.index)).toEqual([0, 1]);
    expect(table[1]?.interval.laps).toBe(1);
  });
});
