import { describe, expect, it } from 'vitest';
import { licenseFor, LICENSE_TIERS } from '../src/progression/license';
import { weekKey, weeklyEvent, weekStart } from '../src/progression/weekly';
import { TRACKS } from '../src/tracks/registry';

describe('licencia', () => {
  it('sube con las medallas y dice cuánto falta', () => {
    const none = licenseFor({ bronze: 0, silver: 0, gold: 0, platinum: 0 });
    expect(none.tier.name).toBe('Novato');
    expect(none.next?.missing).toBe(4);
    const some = licenseFor({ bronze: 10, silver: 6, gold: 1, platinum: 0 });
    expect(some.tier.name).toBe('Licencia B');
    expect(some.fraction).toBeGreaterThan(0);
    const all = licenseFor({ bronze: 24, silver: 24, gold: 24, platinum: 24 });
    expect(all.tier).toBe(LICENSE_TIERS[LICENSE_TIERS.length - 1]);
    expect(all.next).toBeNull();
  });
});

describe('evento semanal', () => {
  it('la semana va de lunes a domingo y el evento es el mismo toda la semana', () => {
    expect(weekKey(new Date(2026, 9, 5))).toBe('2026-10-05');
    expect(weekKey(new Date(2026, 9, 11, 23, 59))).toBe('2026-10-05');
    expect(weekKey(new Date(2026, 9, 12))).toBe('2026-10-12');
    expect(weekStart(new Date(2026, 9, 8)).getDay()).toBe(1);
    const a = weeklyEvent(new Date(2026, 9, 6), TRACKS);
    const b = weeklyEvent(new Date(2026, 9, 10), TRACKS);
    expect(a.trackId).toBe(b.trackId);
    expect(a.race.mode).toBe('timeTrial');
    expect(a.ends.getTime() - weekStart(new Date(2026, 9, 6)).getTime()).toBeGreaterThan(6 * 86_400_000);
  });

  it('recorre todo el calendario antes de repetir un circuito', () => {
    const seen = new Set<string>();
    for (let w = 0; w < TRACKS.length; w++) seen.add(weeklyEvent(new Date(2026, 0, 5 + w * 7), TRACKS).trackId);
    expect(seen.size).toBe(TRACKS.length);
  });
});
