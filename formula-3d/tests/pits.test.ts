import { describe, expect, it } from 'vitest';
import { ASSIST_PRESETS } from '../src/assists/presets';
import { pickRivals } from '../src/data/teams';
import { F1_SPEC } from '../src/race/physics/CarSpec';
import { tyreGrip } from '../src/race/physics/Vehicle';
import { Session, type SessionEvent } from '../src/race/Session';
import { PIT_SPEED } from '../src/race/session/PitStop';
import { AUSTRALIA } from '../src/tracks/data/australia';
import { TRACKS } from '../src/tracks/registry';
import { Track } from '../src/tracks/Track';
import { autopilot } from './helpers/autopilot';

const STEP = 1 / 120;
const track = Track.load(AUSTRALIA);
const NO_ASSISTS = { ...ASSIST_PRESETS.intermediate, braking: 'off' as const };
const IDLE = { throttle: 0, brake: 0, steer: 0 };

/** Maneja con el piloto automático (esperando las luces en la parrilla). */
function drive(session: Session, maxTime: number, until: (events: SessionEvent[]) => boolean, each?: () => void): SessionEvent[] {
  const events: SessionEvent[] = [];
  for (let t = 0; t < maxTime && !until(events); t += STEP) {
    if (session.phase === 'grid') {
      events.push(...session.step(STEP, IDLE, false));
      continue;
    }
    const input = autopilot(session.vehicle, session.track);
    events.push(...session.step(STEP, input, false));
    each?.();
  }
  return events;
}

describe('calle de boxes', () => {
  it('en los 24 circuitos: desvíos, muro, boxes dentro del muro y zona del límite', () => {
    for (const def of TRACKS) {
      const t = Track.load(def);
      const g = t.geometry;
      const pit = t.pitLane;
      const span = g.wrapS(pit.wallTo - pit.wallFrom);
      expect(span, def.id).toBeGreaterThan(150);
      expect(g.wrapS(pit.wallFrom - pit.entry), def.id).toBeGreaterThanOrEqual(80);
      expect(g.wrapS(pit.exit - pit.wallTo), def.id).toBeGreaterThanOrEqual(80);
      for (const box of pit.boxes) expect(t.inRange(box, pit.wallFrom, pit.wallTo), def.id).toBe(true);
      expect(t.inRange(pit.limitFrom, pit.wallFrom, pit.wallTo), def.id).toBe(true);
      // Muro de boxes pegado a la pista y, en los desvíos, detrás de la calle.
      const walls = pit.side === 'left' ? t.trackside.wallLeft : t.trackside.wallRight;
      expect(walls[g.indexAt(pit.wallFrom + span / 2)], def.id).toBeCloseTo(g.halfWidth + 3.5, 1);
      expect(walls[g.indexAt(pit.wallFrom - 5)] ?? 0, def.id).toBeGreaterThanOrEqual(pit.outer);
      expect(walls[g.indexAt(pit.wallTo + 5)] ?? 0, def.id).toBeGreaterThanOrEqual(pit.outer);
    }
  }, 60_000);

  it('las gomas gastadas pierden agarre de a poco y después se caen', () => {
    expect(tyreGrip(0)).toBe(1);
    expect(tyreGrip(0.35)).toBeCloseTo(0.98, 2);
    expect(tyreGrip(0.7)).toBeCloseTo(0.96, 2);
    expect(tyreGrip(1)).toBeCloseTo(0.84, 2);
  });
});

describe('parada en boxes', () => {
  it('el jugador pide boxes: entra, respeta el límite, para, cambia gomas, arregla el auto y vuelve a la pista', () => {
    const session = new Session(track, F1_SPEC, null, { mode: 'race', laps: 6 }, NO_ASSISTS, () => 0.5);
    // Hasta la mitad de la vuelta 1 y pide boxes.
    drive(session, 120, () => session.timer.lap === 1 && session.distance > track.length * 0.5 && session.distance < track.length * 0.8);
    session.vehicle.damage = 0.4;
    const worn = session.vehicle.tyreWear;
    expect(worn).toBeGreaterThan(0);
    expect(session.togglePitRequest()).toBe(true);
    let maxLimited = 0;
    let crossedWall = false;
    const pit = track.pitLane;
    const events = drive(
      session,
      200,
      (list) => list.some((e) => e.kind === 'pitExit'),
      () => {
        const stop = session.player.pit;
        if (stop?.limited) maxLimited = Math.max(maxLimited, session.vehicle.speed);
        // Nunca del otro lado del muro de boxes (entre la pista y la calle) a lo largo del muro.
        const p = session.vehicle.projection;
        const d = p.d * pit.sign;
        if (track.inRange(p.s, pit.wallFrom + 2, pit.wallTo - 2) && d > track.geometry.halfWidth + 2 && d < pit.inner - 0.5) crossedWall = true;
      },
    );
    const kinds = events.map((e) => e.kind);
    expect(kinds).toContain('pitEntry');
    expect(kinds).toContain('pitService');
    expect(kinds).toContain('pitExit');
    expect(kinds).not.toContain('trackLimits');
    expect(maxLimited).toBeLessThanOrEqual(PIT_SPEED + 0.01);
    expect(crossedWall).toBe(false);
    expect(session.vehicle.tyreWear).toBeLessThan(worn);
    expect(session.vehicle.damage).toBe(0);
    expect(session.player.stops).toBe(1);
    expect(session.pitRequested).toBe(false);
    // De vuelta en la pista, andando, y sigue la carrera normal.
    expect(Math.abs(session.vehicle.projection.d)).toBeLessThan(track.geometry.halfWidth);
    expect(session.vehicle.speed).toBeGreaterThan(10);
    const after = drive(session, 30, () => false);
    expect(after.some((e) => e.kind === 'trackLimits')).toBe(false);
    expect(session.vehicle.telemetry.impact).toBe(0);
  });

  it('en contrarreloj no hay boxes ni desgaste', () => {
    const session = new Session(track, F1_SPEC, null, { mode: 'timeTrial', laps: null }, NO_ASSISTS);
    expect(session.pitsOpen).toBe(false);
    expect(session.togglePitRequest()).toBe(false);
    expect(session.vehicle.wearRate).toBe(0);
    expect(session.vehicle.damageEnabled).toBe(false);
  });

  it('en una carrera larga cada bot para una vez cerca de la mitad', () => {
    const laps = 5;
    let seed = 7;
    const random = (): number => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const session = new Session(
      track,
      F1_SPEC,
      null,
      { mode: 'race', laps, rivals: { drivers: pickRivals(3), difficulty: 50 }, player: { name: 'Prueba', code: 'PRU', number: 7 } },
      NO_ASSISTS,
      random,
    );
    const bots = session.cars.filter((car) => !car.isPlayer);
    for (const bot of bots) {
      expect(bot.pitLap).not.toBeNull();
      expect(bot.pitLap ?? 0).toBeGreaterThanOrEqual(2);
      expect(bot.pitLap ?? 0).toBeLessThanOrEqual(laps - 1);
    }
    // El jugador va despacio (no estorba): sólo se mira a los bots.
    const events: SessionEvent[] = [];
    for (let t = 0; t < 700 && !bots.every((bot) => session.order?.runners[bot.index]?.finished); t += STEP) {
      events.push(...session.step(STEP, IDLE, false));
    }
    for (const bot of bots) expect(bot.stops, bot.name).toBe(1);
    expect(events.filter((e) => e.kind === 'pitExit')).toHaveLength(bots.length);
  }, 120_000);
});
