import { describe, expect, it } from 'vitest';
import { ASSIST_PRESETS } from '../src/assists/presets';
import { createDefaultSave } from '../src/core/save/schema';
import { sanitizeSave } from '../src/core/save/sanitize';
import { DRIVERS, pickRivals } from '../src/data/teams';
import { createChampionship, isFinished, nextRound, PLAYER_ID, pointsFor, recordRound, standings } from '../src/race/championship';
import { F1_SPEC } from '../src/race/physics/CarSpec';
import { Session, type SessionEvent } from '../src/race/Session';
import { decodeGhost, encodeGhost, GhostPlayer, GhostRecorder, GHOST_RATE } from '../src/race/session/Ghost';
import { AUSTRALIA } from '../src/tracks/data/australia';
import { MONZA } from '../src/tracks/data/monza';
import { Track } from '../src/tracks/Track';
import { weatherLook } from '../src/tracks/weather';
import { autopilot } from './helpers/autopilot';

const STEP = 1 / 120;
const NO_ASSISTS = { ...ASSIST_PRESETS.intermediate, braking: 'off' as const };

describe('fantasma', () => {
  it('graba a 20 Hz, reproduce interpolando y sobrevive al guardado', () => {
    const recorder = new GhostRecorder();
    recorder.start();
    // Recta a 50 m/s hacia −Z durante 3 s.
    for (let t = 0; t <= 3; t += STEP) recorder.record(t, 0, -50 * t, 0);
    const lap = recorder.finish(3, [0, 0.2, 0.4]);
    expect(lap.poses.length / 3).toBeGreaterThanOrEqual(3 * GHOST_RATE);
    const player = new GhostPlayer(lap);
    const pose = { x: 0, z: 0, heading: 0 };
    expect(player.poseAt(1.525, pose)).toBe(true);
    expect(pose.z).toBeCloseTo(-76.25, 0);
    expect(player.poseAt(3.5, pose)).toBe(false);

    const stored = encodeGhost(lap);
    const back = decodeGhost(stored);
    expect(back?.time).toBe(3);
    expect(back?.poses.length).toBe(lap.poses.length);
    expect(back?.trace[2]).toBeCloseTo(0.4, 5);
    // Dañado: se descarta.
    expect(decodeGhost({ ...stored, time: 30 })).toBeNull();
    expect(decodeGhost({ ...stored, poses: 'no es base64!' })).toBeNull();
  });

  it('contrarreloj: la primera vuelta válida es el fantasma y el delta se mide contra él', () => {
    const track = Track.load(AUSTRALIA);
    const session = new Session(track, F1_SPEC, null, { mode: 'timeTrial', laps: null }, NO_ASSISTS);
    expect(session.isTimeTrial).toBe(true);
    expect(session.ghost).toBeNull();
    const events: SessionEvent[] = [];
    for (let t = 0; t < 400 && !events.some((e) => e.kind === 'ghostLap'); t += STEP) {
      const input = autopilot(session.vehicle, track);
      events.push(...session.step(STEP, input, false));
    }
    const ghostEvent = events.find((e) => e.kind === 'ghostLap');
    if (ghostEvent?.kind !== 'ghostLap') throw new Error('No hubo fantasma.');
    const lap = events.find((e) => e.kind === 'lapCompleted');
    if (lap?.kind !== 'lapCompleted') throw new Error('No hubo vuelta.');
    expect(ghostEvent.ghost.time).toBe(lap.lap.time);
    expect(session.ghost).toBe(ghostEvent.ghost);

    // Con el fantasma guardado, una sesión nueva tiene delta desde la vuelta 1.
    const next = new Session(track, F1_SPEC, null, { mode: 'timeTrial', laps: null, ghost: ghostEvent.ghost }, NO_ASSISTS);
    let delta: number | null = null;
    for (let t = 0; t < 30 && delta === null; t += STEP) {
      const input = autopilot(next.vehicle, track);
      next.step(STEP, input, false);
      if (next.timer.lap === 1 && next.timer.lapTime > 5) delta = next.timer.delta(next.distance);
    }
    expect(delta).not.toBeNull();
    // Mismo piloto automático: casi el mismo ritmo que el fantasma.
    expect(Math.abs(delta ?? 99)).toBeLessThan(1.5);
  }, 60_000);
});

describe('campeonato', () => {
  const rivals = pickRivals(9).map((driver) => driver.id);
  const fresh = (): ReturnType<typeof createChampionship> =>
    createChampionship({ laps: 3, difficulty: 38, weather: 'sunny', rivals, calendar: ['australia', 'monza'] }, 1000);

  it('puntos estilo F1 y calendario', () => {
    expect([1, 2, 3, 10, 11].map(pointsFor)).toEqual([25, 18, 15, 1, 0]);
    const state = fresh();
    expect(nextRound(state)).toBe(0);
    expect(isFinished(state)).toBe(false);
    // Tabla inicial: todos en cero.
    expect(standings(state).every((row) => row.points === 0)).toBe(true);
  });

  it('suma carreras, ordena la tabla y desempata por victorias', () => {
    let state = fresh();
    const [a, b, ...rest] = rivals;
    if (!a || !b) throw new Error('Faltan rivales');
    state = recordRound(state, 0, [PLAYER_ID, a, b, ...rest]);
    expect(nextRound(state)).toBe(1);
    state = recordRound(state, 1, [a, PLAYER_ID, b, ...rest]);
    expect(isFinished(state)).toBe(true);
    const table = standings(state);
    // 25 + 18 = 43 los dos, con una victoria y dos podios cada uno: el orden
    // entre ellos queda fijo (desempate final por id) y el tercero suma 15 + 15.
    expect(table[0]?.points).toBe(43);
    expect(table[1]?.points).toBe(43);
    expect(table[2]?.id).toBe(b);
    expect(table[2]?.points).toBe(30);
    expect(table.map((row) => row.position)).toEqual(table.map((_, i) => i + 1));
  });

  it('se guarda y se recupera; uno dañado se descarta', () => {
    const save = createDefaultSave(1, 'medium');
    save.championship = recordRound(fresh(), 0, [PLAYER_ID, ...rivals]);
    const back = sanitizeSave(structuredClone(save), createDefaultSave(1, 'medium'));
    expect(back.championship?.rounds[0]?.results?.[0]).toEqual({ id: PLAYER_ID, position: 1, points: 25 });
    expect(back.championship?.rounds[1]?.results).toBeNull();
    const broken = structuredClone(save) as unknown as { championship: { rounds: Array<{ results: Array<{ id: string }> }> } };
    const first = broken.championship.rounds[0]?.results[0];
    if (first) first.id = 'intruso';
    expect(sanitizeSave(broken, createDefaultSave(1, 'medium')).championship).toBeNull();
    expect(DRIVERS.some((d) => d.id === rivals[0])).toBe(true);
  });
});

describe('clima', () => {
  it('atardecer con sol bajo y dorado; nublado con luz pareja', () => {
    const env = MONZA.environment;
    const sunny = weatherLook(env, 'sunny');
    const sunset = weatherLook(env, 'sunset');
    const cloudy = weatherLook(env, 'cloudy');
    expect(sunny.sunElevation).toBe(env.sunElevation);
    expect(sunset.sunElevation).toBeLessThan(10);
    expect(cloudy.cloudCoverage).toBeGreaterThan(sunny.cloudCoverage);
    expect(cloudy.sunIntensity).toBeLessThan(sunny.sunIntensity);
    expect(cloudy.ambientIntensity).toBeGreaterThan(sunny.ambientIntensity);
  });

  it('las opciones de carrera se guardan y se sanean', () => {
    const raw = structuredClone(createDefaultSave(1, 'medium')) as unknown as { settings: { race: Record<string, unknown> } };
    raw.settings.race = { ...raw.settings.race, trackId: 'monza', laps: 10, weather: 'sunset' };
    expect(sanitizeSave(raw, createDefaultSave(1, 'medium')).settings.race).toMatchObject({ trackId: 'monza', laps: 10, weather: 'sunset' });
    raw.settings.race = { ...raw.settings.race, laps: 7, weather: 'lluvia', trackId: '../x' };
    expect(sanitizeSave(raw, createDefaultSave(1, 'medium')).settings.race).toMatchObject({ trackId: 'australia', laps: 3, weather: 'sunny' });
  });
});
