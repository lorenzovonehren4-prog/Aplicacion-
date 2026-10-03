import { describe, expect, it } from 'vitest';
import { ASSIST_PRESETS } from '../src/assists/presets';
import { F1_SPEC } from '../src/race/physics/CarSpec';
import { Session, type SessionEvent } from '../src/race/Session';
import { TRACKS } from '../src/tracks/registry';
import { Track } from '../src/tracks/Track';
import { autopilot } from './helpers/autopilot';

const STEP = 1 / 120;
const NO_ASSISTS = { ...ASSIST_PRESETS.intermediate, braking: 'off' as const };

describe('calendario de 24 circuitos', () => {
  it('están todos, con id único y en el orden de la temporada', () => {
    expect(TRACKS).toHaveLength(24);
    expect(new Set(TRACKS.map((t) => t.id)).size).toBe(24);
    expect(TRACKS[0]?.id).toBe('australia');
    expect(TRACKS[23]?.id).toBe('yasmarina');
  });

  it('cada uno mide su longitud oficial, con los muros fuera del asfalto salvo en un cruce', () => {
    for (const def of TRACKS) {
      const track = Track.load(def);
      const g = track.geometry;
      expect(Math.abs(g.length - def.lengthKm * 1000), def.id).toBeLessThan(15);
      const t = track.trackside;
      for (let i = 0; i < g.count; i += 7) {
        if (t.gapLeft[i] !== 1) expect(t.wallLeft[i] ?? 0, `${def.id} izq ${i}`).toBeGreaterThan(g.halfWidth * 0.7);
        if (t.gapRight[i] !== 1) expect(t.wallRight[i] ?? 0, `${def.id} der ${i}`).toBeGreaterThan(g.halfWidth * 0.7);
      }
      // Sólo Suzuka (el "ocho") cruza sobre sí misma; los demás cortes son la punta
      // y el final del muro de boxes (dos muestras en cada uno).
      const pit = track.pitLane;
      const ends = [pit.wallFrom, pit.wallTo].map((s) => g.indexAt(s));
      const nearEnds = (i: number): boolean => ends.some((end) => Math.abs(g.wrapIndex(i - end + 2) - 2) <= 1);
      const crossing = (gaps: Uint8Array, side: 'left' | 'right'): boolean =>
        gaps.some((v, i) => v === 1 && !(side === pit.side && nearEnds(i)));
      expect(crossing(t.gapLeft, 'left') || crossing(t.gapRight, 'right'), def.id).toBe(def.id === 'suzuka');
      const pitGaps = pit.side === 'left' ? t.gapLeft : t.gapRight;
      for (const end of ends) expect(pitGaps[end], `${def.id} punta del muro`).toBe(1);
    }
  }, 60000);

  it('la trazada nunca dobla más cerrado de lo que gira el auto (giro mínimo ≈ 9,6 m)', () => {
    const wheelbase = F1_SPEC.cgToFront + F1_SPEC.cgToRear;
    const turning = wheelbase / Math.tan(F1_SPEC.maxSteerLow);
    expect(turning).toBeGreaterThan(9);
    for (const def of TRACKS) {
      const curvature = Track.load(def).racingLine.curvature;
      let tightest = 0;
      for (const k of curvature) tightest = Math.max(tightest, Math.abs(k));
      // Con margen sobre el giro del auto (antes, Mónaco pedía 2,6 m en la horquilla).
      expect(1 / tightest, def.id).toBeGreaterThan(turning + 1);
    }
  }, 60000);

  it('el piloto automático da una vuelta válida en todos', () => {
    for (const def of TRACKS) {
      const track = Track.load(def);
      const session = new Session(track, F1_SPEC, null, { mode: 'practice', laps: null }, NO_ASSISTS);
      const events: SessionEvent[] = [];
      for (let t = 0; t < 260 && !events.some((e) => e.kind === 'lapCompleted'); t += STEP) {
        const input = autopilot(session.vehicle, track);
        events.push(...session.step(STEP, input, input.throttle > 0.9));
      }
      const lap = events.find((e) => e.kind === 'lapCompleted');
      expect(lap?.kind, def.id).toBe('lapCompleted');
      if (lap?.kind === 'lapCompleted') expect(lap.lap.valid, def.id).toBe(true);
    }
  }, 120000);
});
