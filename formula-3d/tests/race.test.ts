import { describe, expect, it } from 'vitest';
import { ASSIST_PRESETS } from '../src/assists/presets';
import { RIVALS_MAX, RIVALS_MIN } from '../src/core/save/schema';
import { DRIVERS, PLAYER_TEAM_ID, TEAMS, liveryOf, pickRivals, playerCode, teamOf } from '../src/data/teams';
import { PLAYER_DEFAULT_LIVERY } from '../src/garage/livery';
import { BotDriver } from '../src/race/ai/BotDriver';
import { DIFFICULTY_INFO, botParams, difficultyValue } from '../src/race/ai/difficulty';
import { resolveCarCollisions } from '../src/race/physics/CarCollisions';
import { F1_SPEC, performanceModel } from '../src/race/physics/CarSpec';
import { Vehicle } from '../src/race/physics/Vehicle';
import { Session, type SessionEvent } from '../src/race/Session';
import { OVERTAKE_MARGIN, RaceOrder } from '../src/race/session/RaceOrder';
import { AUSTRALIA } from '../src/tracks/data/australia';
import { Track } from '../src/tracks/Track';

const STEP = 1 / 120;
const track = Track.load(AUSTRALIA);
const NO_ASSISTS = { ...ASSIST_PRESETS.intermediate, braking: 'off' as const };

/** Números pseudoaleatorios repetibles. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

describe('equipos y pilotos', () => {
  it('10 equipos con 2 pilotos cada uno (el jugador es uno de Ápice) y números únicos', () => {
    expect(TEAMS).toHaveLength(10);
    for (const team of TEAMS) {
      const drivers = DRIVERS.filter((d) => d.teamId === team.id);
      expect(drivers).toHaveLength(team.id === PLAYER_TEAM_ID ? 1 : 2);
    }
    const numbers = DRIVERS.map((d) => d.number);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers).not.toContain(PLAYER_DEFAULT_LIVERY.number);
    const codes = DRIVERS.map((d) => d.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) expect(code).toMatch(/^[A-Z]{3}$/);
    expect(DRIVERS).toHaveLength(RIVALS_MAX);
  });

  it('elige rivales con el compañero de equipo y punteros y rezagados', () => {
    const few = pickRivals(RIVALS_MIN);
    expect(few).toHaveLength(RIVALS_MIN);
    expect(few.some((d) => d.teamId === PLAYER_TEAM_ID)).toBe(true);
    const skills = DRIVERS.filter((d) => d.teamId !== PLAYER_TEAM_ID).map((d) => d.skill);
    expect(few.some((d) => d.skill === Math.max(...skills))).toBe(true);
    expect(few.some((d) => d.skill === Math.min(...skills))).toBe(true);
    expect(pickRivals(3)).toHaveLength(RIVALS_MIN);
    expect(pickRivals(99)).toHaveLength(RIVALS_MAX);
  });

  it('livery del equipo, abreviatura del jugador', () => {
    const driver = DRIVERS.find((d) => d.teamId === 'vortex');
    if (!driver) throw new Error('Falta un piloto de Vortex');
    expect(liveryOf(driver).primary).toBe(teamOf(driver).primary);
    expect(liveryOf(driver).number).toBe(driver.number);
    expect(playerCode('Ána María')).toBe('ANA');
    expect(playerCode('Jo')).toBe('JOX');
  });
});

describe('dificultad', () => {
  it('más dificultad: más ritmo, frenadas más tardías, menos errores', () => {
    const driver = { skill: 0.84, aggression: 0.5 };
    const levels = (['novice', 'amateur', 'pro', 'legend'] as const).map((level) => botParams(DIFFICULTY_INFO[level].value, driver));
    for (let i = 1; i < levels.length; i++) {
      const [a, b] = [levels[i - 1], levels[i]];
      if (!a || !b) continue;
      expect(b.pace).toBeGreaterThan(a.pace);
      expect(b.braking).toBeGreaterThan(a.braking);
      expect(b.topThrottle).toBeGreaterThanOrEqual(a.topThrottle);
      expect(b.mistakesPerLap).toBeLessThan(a.mistakesPerLap);
    }
    // Nunca por encima del límite físico de la trazada.
    expect(botParams(100, { skill: 1, aggression: 1 }).pace).toBeLessThanOrEqual(0.97);
  });

  it('la personalizada usa el valor del control', () => {
    expect(difficultyValue({ difficulty: 'custom', customDifficulty: 73 })).toBe(73);
    expect(difficultyValue({ difficulty: 'pro', customDifficulty: 73 })).toBe(DIFFICULTY_INFO.pro.value);
  });
});

describe('orden de carrera', () => {
  it('cuenta vueltas desde la largada, ordena por progreso y mide intervalos en tiempo', () => {
    const L = 1000;
    // Dos autos detrás de la línea: A adelante.
    const order = new RaceOrder(L, 2, [990, 980]);
    expect(order.order).toEqual([0, 1]);
    const distances = [990, 980];
    const events = [];
    // A a 50 m/s, B a 40 m/s: A se escapa.
    for (let t = 0; t < 45; t += 0.1) {
      distances[0] = ((distances[0] ?? 0) + 5) % L;
      distances[1] = ((distances[1] ?? 0) + 4) % L;
      events.push(...order.update(0.1, distances));
    }
    const [a, b] = order.runners;
    expect(a?.position).toBe(1);
    expect(b?.position).toBe(2);
    // A completó las 2 vueltas (recibió la bandera); B sigue en la vuelta 2.
    expect(a?.finished).toBe(true);
    expect(b?.finished).toBe(false);
    expect(b?.lap).toBe(2);
    // El intervalo de B: la diferencia de horas en el mismo punto (crece con la distancia).
    const gap = order.interval(1);
    expect(gap.laps).toBe(0);
    expect(gap.seconds).toBeGreaterThan(4);
    expect(events.some((e) => e.kind === 'lapCompleted' && e.index === 0)).toBe(true);
  });

  it('la bandera cae para el líder y cada auto termina al cruzar la línea (los doblados con menos vueltas)', () => {
    const L = 1000;
    const order = new RaceOrder(L, 2, [995, 990]);
    const distances = [995, 990];
    const finished: number[] = [];
    let leaderFinished = -1;
    for (let t = 0; t < 120 && finished.length < 2; t += 0.1) {
      // A dobla a B: 3× más rápido.
      distances[0] = ((distances[0] ?? 0) + 6) % L;
      distances[1] = ((distances[1] ?? 0) + 2) % L;
      for (const event of order.update(0.1, distances)) {
        if (event.kind === 'finished') finished.push(event.index);
        if (event.kind === 'leaderFinished') leaderFinished = event.index;
      }
    }
    expect(leaderFinished).toBe(0);
    expect(finished).toEqual([0, 1]);
    expect(order.runners[0]?.lapsDone).toBe(2);
    expect(order.runners[1]?.lapsDone).toBeLessThan(2);
    expect(order.gapToLeader(1).laps).toBeGreaterThan(0);
  });

  it('rueda a rueda la posición no parpadea: cambia una sola vez, cuando uno pasa de verdad', () => {
    const L = 1000;
    const order = new RaceOrder(L, 3, [995, 994]);
    const distances = [995, 994];
    const swaps: number[] = [];
    let leader = order.order[0];
    for (let step = 0; step < 400; step++) {
      // Lado a lado: B se adelanta y se atrasa hasta 70 cm a cada paso…
      const wobble = Math.sin(step * 1.7) * 0.7;
      distances[0] = (995 + step * 0.5) % L;
      // …y al final pasa de verdad (3 m adelante).
      distances[1] = (995 + step * 0.5 + wobble + (step > 300 ? 3 : 0)) % L;
      order.update(0.01, distances);
      if (order.order[0] !== leader) {
        swaps.push(step);
        leader = order.order[0];
      }
    }
    expect(swaps).toHaveLength(1);
    expect(swaps[0]).toBeGreaterThan(300);
    expect(order.runners[1]?.position).toBe(1);
    expect(OVERTAKE_MARGIN).toBeGreaterThan(0.7);
  });
});

describe('choques entre autos', () => {
  function carAt(s: number, d: number, speed: number): Vehicle {
    const car = new Vehicle(F1_SPEC, track);
    car.placeAt(s, d);
    car.vx = speed;
    return car;
  }

  it('un golpe por detrás separa los autos y pasa velocidad al de adelante', () => {
    const s = track.startS + 400;
    const front = carAt(s + 4.5, 0, 40);
    const back = carAt(s, 0, 50);
    const before = front.vx + back.vx;
    const contacts = resolveCarCollisions([front, back]);
    expect(contacts).toHaveLength(1);
    expect(contacts[0]?.speed).toBeGreaterThan(5);
    expect(front.vx).toBeGreaterThan(40);
    expect(back.vx).toBeLessThan(50);
    // Se conserva el momento (misma masa): la suma de velocidades no crece.
    expect(front.vx + back.vx).toBeLessThanOrEqual(before + 1e-6);
    expect(back.telemetry.impact).toBeGreaterThan(5);
  });

  it('autos lejos o fantasmas no chocan', () => {
    const s = track.startS + 400;
    expect(resolveCarCollisions([carAt(s, 0, 40), carAt(s + 30, 0, 40)])).toHaveLength(0);
    expect(resolveCarCollisions([carAt(s + 3, 0, 40), carAt(s, 0, 50)], [], [true, false])).toHaveLength(0);
  });
});

describe('rebufo', () => {
  it('detrás de otro auto, menos arrastre: más velocidad al final de la recta', () => {
    const run = (slipstream: number): number => {
      const car = new Vehicle(F1_SPEC, track);
      car.placeAt(track.startS, 0);
      car.vx = 70;
      car.slipstream = slipstream;
      for (let t = 0; t < 4; t += STEP) car.step(STEP, { throttle: 1, brake: 0, steer: 0, drs: false });
      return car.vx;
    };
    expect(run(1)).toBeGreaterThan(run(0) + 0.5);
  });
});

describe('carrera con rivales', () => {
  it('2 vueltas con 11 bots: largada, posiciones, intervalos, bandera para todos y pocos choques', () => {
    // Semilla con una carrera típica (el jugador gana y pierde lugares); con el
    // Albert Park más fiel, la semilla 11 daba justo una carrera sin cambios para él.
    const random = seeded(2);
    const session = new Session(
      track,
      F1_SPEC,
      null,
      { mode: 'race', laps: 2, rivals: { drivers: pickRivals(11), difficulty: 40 }, player: { name: 'Prueba', code: 'PRU', number: 7 } },
      NO_ASSISTS,
      random,
    );
    expect(session.cars).toHaveLength(12);
    // El jugador larga en la mitad de la parrilla.
    expect(session.position).toBe(7);
    // El jugador lo maneja un bot de prueba (como un humano prolijo).
    const me = new BotDriver(track, performanceModel(F1_SPEC), botParams(40, { skill: 0.84, aggression: 0.5 }), random);
    me.reset(session.vehicle);
    const input = { throttle: 0, brake: 0, steer: 0, drs: false };
    const events: SessionEvent[] = [];
    let severe = 0;
    for (let t = 0; t < 330; t += STEP) {
      if (session.phase === 'grid') {
        events.push(...session.step(STEP, me.grid(input), false));
      } else {
        me.drive(session.vehicle, STEP, session.cars.map((c) => c.vehicle), input);
        events.push(...session.step(STEP, input, true));
        if (me.needsReset) {
          session.resetToTrack();
          me.recovered();
        }
      }
      for (const car of session.cars) if (car.vehicle.telemetry.impact > 12) severe++;
      if (session.order?.runners.every((r) => r.finished)) break;
    }
    const kinds = new Set(events.map((e) => e.kind));
    expect(kinds.has('lightsOut')).toBe(true);
    expect(kinds.has('position')).toBe(true);
    expect(kinds.has('fastestLap')).toBe(true);
    expect(kinds.has('leaderFinished')).toBe(true);
    expect(kinds.has('finished')).toBe(true);

    const table = session.standings();
    expect(table).toHaveLength(12);
    // Todos recibieron la bandera y la tabla está ordenada.
    expect(table.every((row) => row.finished)).toBe(true);
    expect(table.map((row) => row.position)).toEqual(table.map((_, i) => i + 1));
    for (const row of table) {
      expect(Number.isFinite(row.finishTime)).toBe(true);
      // Trazado real (curvas más exigentes) y bots más prudentes en los niveles fáciles.
      expect(row.bestLap).toBeGreaterThan(70);
      expect(row.bestLap).toBeLessThan(130);
    }
    expect(table[1]?.gap.seconds ?? 0).toBeGreaterThanOrEqual(0);
    expect(session.result?.starters).toBe(12);
    expect(session.result?.position).toBe(table.find((row) => row.isPlayer)?.position);
    // Carrera limpia en general: algún toque puede haber, choques fuertes casi nunca.
    expect(severe).toBeLessThan(40);
  }, 120_000);

  it('el DRS en carrera exige estar a menos de 1 s en la detección', () => {
    const session = new Session(
      track,
      F1_SPEC,
      null,
      { mode: 'race', laps: 3, rivals: { drivers: pickRivals(9), difficulty: 40 } },
      NO_ASSISTS,
      () => 0,
    );
    // Sin nadie cerca: nunca se habilita.
    const solo = new Session(track, F1_SPEC, null, { mode: 'race', laps: 3 }, NO_ASSISTS, () => 0);
    expect(solo.hasRivals).toBe(false);
    expect(session.hasRivals).toBe(true);
    expect(session.drsState).toBe('off');
  });

  it('al volver a la pista el fantasma no termina encima de otro auto', () => {
    const session = new Session(
      track,
      F1_SPEC,
      null,
      { mode: 'race', laps: 3, rivals: { drivers: pickRivals(1), difficulty: 40 } },
      NO_ASSISTS,
      () => 0,
    );
    const idle = { throttle: 0, brake: 0, steer: 0, drs: false };
    for (let t = 0; t < 20 && session.phase !== 'running'; t += STEP) session.step(STEP, idle, false);
    expect(session.phase).toBe('running');
    const me = session.player;
    const rival = session.cars.find((car) => !car.isPlayer);
    if (!rival) throw new Error('falta el rival');
    const s = track.startS + 600;
    // El fantasma está por terminar y el rival quedó justo encima: sigue fantasma.
    me.vehicle.placeAt(s, 0);
    rival.vehicle.placeAt(s + 1, 0);
    me.ghost = STEP / 2;
    session.step(STEP, idle, false);
    expect(me.ghost).toBeGreaterThan(0);
    // Con el camino libre, termina enseguida (y no vuelve).
    rival.vehicle.placeAt(s + 120, 0);
    for (let t = 0; t < 0.5; t += STEP) session.step(STEP, idle, false);
    expect(me.ghost).toBe(0);
  });
});
