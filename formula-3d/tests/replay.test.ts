import { describe, expect, it } from 'vitest';
import { ASSIST_PRESETS } from '../src/assists/presets';
import { pickRivals } from '../src/data/teams';
import { F1_SPEC } from '../src/race/physics/CarSpec';
import { ReplayPlayer } from '../src/race/ReplayPlayer';
import { emptyReplayCar, REPLAY_HZ, ReplayRecorder, type ReplaySource } from '../src/race/session/Replay';
import { Session } from '../src/race/Session';
import { AUSTRALIA } from '../src/tracks/data/australia';
import { Track } from '../src/tracks/Track';
import { autopilot } from './helpers/autopilot';

const STEP = 1 / 120;
const track = Track.load(AUSTRALIA);
const NO_ASSISTS = { ...ASSIST_PRESETS.intermediate, braking: 'off' as const };

/** Una carrera corta grabada: largada y unos segundos de carrera. */
function recordedRace(seconds: number): { session: Session; recorder: ReplayRecorder; snapshots: Array<{ time: number; x: number; z: number }> } {
  const session = new Session(track, F1_SPEC, null, { mode: 'race', laps: 3, rivals: { drivers: pickRivals(3), difficulty: 50 } }, NO_ASSISTS, () => 0.3);
  const recorder = new ReplayRecorder(session.cars.length);
  const sources: ReplaySource[] = session.cars.map((car) => ({ vehicle: car.vehicle, progress: 0, pit: 0, pitTime: 0, pitDuration: 0, pitRepair: false }));
  const snapshots: Array<{ time: number; x: number; z: number }> = [];
  for (let t = 0; t < seconds; t += STEP) {
    const input = session.phase === 'grid' ? { throttle: 0, brake: 0, steer: 0 } : autopilot(session.vehicle, track);
    const events = session.step(STEP, input, false);
    for (const event of events) {
      if (event.kind === 'light') recorder.mark({ kind: 'lights', lit: event.index + 1 });
      if (event.kind === 'lightsOut') {
        recorder.mark({ kind: 'lights', lit: 0 });
        recorder.markStart();
      }
      if (event.kind === 'lapStarted') recorder.mark({ kind: 'lap', number: event.number });
    }
    sources.forEach((source, i) => (source.progress = session.order?.runners[i]?.progress ?? 0));
    const frames = recorder.frames;
    recorder.record(STEP, sources);
    // Lo que vale el cuadro que se acaba de grabar (para comparar después).
    if (recorder.frames > frames && recorder.frames % 40 === 0) snapshots.push({ time: (recorder.frames - 1) / REPLAY_HZ, x: session.vehicle.x, z: session.vehicle.z });
  }
  return { session, recorder, snapshots };
}

describe('repetición', () => {
  it('graba 20 cuadros por segundo y devuelve las posiciones grabadas', () => {
    const { recorder, snapshots, session } = recordedRace(20);
    expect(recorder.frames).toBeGreaterThanOrEqual(20 * REPLAY_HZ - 1);
    expect(recorder.startTime).not.toBeNull();
    const pose = emptyReplayCar();
    for (const snapshot of snapshots) {
      recorder.read(snapshot.time, session.player.index, pose);
      expect(pose.x).toBeCloseTo(snapshot.x, 3);
      expect(pose.z).toBeCloseTo(snapshot.z, 3);
    }
    // Entre dos cuadros, a mitad de camino.
    const a = recorder.read(10, 0, emptyReplayCar());
    const b = recorder.read(10 + 1 / REPLAY_HZ, 0, emptyReplayCar());
    const mid = recorder.read(10 + 0.5 / REPLAY_HZ, 0, emptyReplayCar());
    expect(mid.x).toBeCloseTo((a.x + b.x) / 2, 3);
    expect(mid.z).toBeCloseTo((a.z + b.z) / 2, 3);
    expect(mid.speed).toBeGreaterThan(0);
  });

  it('el reproductor empieza antes de la largada, salta, cambia la velocidad y muestra el semáforo', () => {
    const { recorder, session } = recordedRace(15);
    const player = new ReplayPlayer(recorder, session.player.index);
    expect(player.time).toBeCloseTo((recorder.startTime ?? 0) - 3, 5);
    expect(player.lights).toBeGreaterThan(0);
    player.skip(4);
    expect(player.lights).toBe(0);
    expect(player.lap).toBe(1);
    player.changeSpeed(1);
    expect(player.speed).toBe(2);
    const t = player.time;
    player.advance(0.5);
    expect(player.time).toBeCloseTo(t + 1, 5);
    player.seek(1);
    player.advance(1);
    expect(player.playing).toBe(false);
    // Las poses grabadas se aplican a los autos y el orden sale del progreso.
    player.seek(0.8);
    player.apply(session.cars.map((car) => car.vehicle), 0);
    expect(player.standings()).toHaveLength(session.cars.length);
    const leader = player.cars[player.standings()[0] ?? 0];
    for (const car of player.cars) expect(car.progress).toBeLessThanOrEqual(leader?.progress ?? 0);
  });

  it('guardar y volver al estado de un auto lo deja exactamente igual', () => {
    const { session } = recordedRace(12);
    const v = session.vehicle;
    const state = v.saveState();
    const before = JSON.stringify(state);
    v.showPose({ ...emptyReplayCar(), x: 1, z: 2, heading: 3, speed: 40 }, 0.1);
    expect(v.x).toBe(1);
    v.loadState(state);
    expect(JSON.stringify(v.saveState())).toBe(before);
    // Y la física sigue igual que si no hubiera pasado nada.
    const twin = recordedRace(12).session.vehicle;
    for (let k = 0; k < 120; k++) {
      v.step(STEP, { throttle: 1, brake: 0, steer: 0, drs: false });
      twin.step(STEP, { throttle: 1, brake: 0, steer: 0, drs: false });
    }
    expect(v.x).toBeCloseTo(twin.x, 6);
    expect(v.z).toBeCloseTo(twin.z, 6);
  });
});
