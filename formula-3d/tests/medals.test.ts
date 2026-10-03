import { describe, expect, it } from 'vitest';
import { ASSIST_PRESETS } from '../src/assists/presets';
import { MEDALS, MEDAL_PACE, medalFor, medalsEarned, medalTally, medalTimes, nextMedal, referenceLap } from '../src/progression/medals';
import { BotDriver } from '../src/race/ai/BotDriver';
import { botParams } from '../src/race/ai/difficulty';
import { F1_SPEC, performanceModel } from '../src/race/physics/CarSpec';
import type { DriverInput } from '../src/race/physics/Vehicle';
import { Session } from '../src/race/Session';
import { TRACKS } from '../src/tracks/registry';
import { Track } from '../src/tracks/Track';

const STEP = 1 / 120;
const byId = (id: string) => TRACKS.find((def) => def.id === id) ?? TRACKS[0]!;

/** Mejor vuelta válida del piloto automático "profesional" (como la referencia de las medallas). */
function proLap(id: string): number {
  const def = byId(id);
  const track = Track.load(def);
  let seed = 3;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const session = new Session(track, F1_SPEC, null, { mode: 'timeTrial', laps: null }, { ...ASSIST_PRESETS.advanced }, random);
  const bot = new BotDriver(track, performanceModel(F1_SPEC), { ...botParams(85, { skill: 0.88, aggression: 0.5 }), mistakesPerLap: 0 }, random);
  bot.reset(session.vehicle);
  const input: DriverInput = { throttle: 0, brake: 0, steer: 0, drs: false };
  let best = Infinity;
  for (let t = 0; t < def.lapRecord.seconds * 3.6; t += STEP) {
    bot.drive(session.vehicle, STEP, [session.vehicle], input);
    for (const event of session.step(STEP, input, true)) if (event.kind === 'lapCompleted' && event.lap.valid) best = Math.min(best, event.lap.time);
    if (bot.needsReset) {
      session.resetToTrack();
      bot.recovered();
    }
  }
  return best;
}

describe('medallas de tiempo', () => {
  it('cada pista tiene su referencia y los tiempos van de más lento (bronce) a más rápido (platino)', () => {
    for (const def of TRACKS) {
      expect(MEDAL_PACE[def.id], def.id).toBeDefined();
      const times = medalTimes(def);
      for (let i = 1; i < MEDALS.length; i++) expect(times[MEDALS[i]!], def.id).toBeLessThan(times[MEDALS[i - 1]!]);
      // El platino nunca baja del récord real.
      expect(times.platinum, def.id).toBeGreaterThan(def.lapRecord.seconds);
    }
  });

  it('medalla de una vuelta, la próxima y las ganadas al mejorar', () => {
    const monza = byId('monza');
    const times = medalTimes(monza);
    expect(medalFor(monza, null)).toBeNull();
    expect(medalFor(monza, times.bronze + 0.5)).toBeNull();
    expect(medalFor(monza, times.bronze)).toBe('bronze');
    expect(medalFor(monza, times.gold - 0.01)).toBe('gold');
    expect(nextMedal(monza, null)).toEqual({ medal: 'bronze', time: times.bronze });
    expect(nextMedal(monza, times.silver)?.medal).toBe('gold');
    expect(nextMedal(monza, times.platinum - 1)).toBeNull();
    // De nada a oro de una: bronce, plata y oro.
    expect(medalsEarned(monza, null, times.gold)).toEqual(['bronze', 'silver', 'gold']);
    expect(medalsEarned(monza, times.silver, times.silver - 0.05)).toEqual([]);
    const tally = medalTally([monza, byId('baku')], (id) => (id === 'monza' ? times.gold : null));
    expect(tally).toEqual({ bronze: 1, silver: 1, gold: 1, platinum: 0 });
  });

  it('la referencia sigue al ritmo del auto (si cambia la física, hay que medirla de nuevo)', { timeout: 120_000 }, () => {
    for (const id of ['monza', 'spielberg', 'baku']) {
      const ratio = proLap(id) / referenceLap(byId(id));
      expect(ratio, id).toBeGreaterThan(0.97);
      expect(ratio, id).toBeLessThan(1.03);
    }
  });
});
