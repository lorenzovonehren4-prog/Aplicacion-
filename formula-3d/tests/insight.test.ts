import { describe, expect, it } from 'vitest';
import { gearForSpeed, trackInsight } from '../src/tracks/insight';
import { TRACKS } from '../src/tracks/registry';

describe('guía de circuitos', () => {
  it('la marcha sube con la velocidad y llega a 8.ª en recta', () => {
    let previous = 0;
    for (let kmh = 40; kmh <= 340; kmh += 10) {
      const gear = gearForSpeed(kmh / 3.6);
      expect(gear).toBeGreaterThanOrEqual(previous);
      previous = gear;
    }
    expect(gearForSpeed(60 / 3.6)).toBeLessThanOrEqual(2);
    expect(gearForSpeed(320 / 3.6)).toBe(8);
  });

  it('cada pista tiene su ficha y una guía con todas sus curvas', { timeout: 30_000 }, () => {
    for (const def of TRACKS) {
      const insight = trackInsight(def);
      // Las curvas salen del análisis: a veces dos oficiales son una sola (el caracol de Shanghái).
      expect(insight.corners.length, def.id).toBeLessThanOrEqual(def.turns);
      expect(insight.corners.length, def.id).toBeGreaterThanOrEqual(def.turns - 2);
      expect(insight.topSpeedKmh, def.id).toBeGreaterThan(280);
      expect(insight.topSpeedKmh, def.id).toBeLessThan(360);
      expect(insight.fullThrottle, def.id).toBeGreaterThan(0.3);
      expect(insight.fullThrottle, def.id).toBeLessThan(0.95);
      expect(insight.brakingZones, def.id).toBeGreaterThan(2);
      expect(insight.slowest?.minKmh ?? 0, def.id).toBeGreaterThan(30);
      insight.corners.forEach((corner, i) => {
        expect(corner.number).toBe(i + 1);
        expect(corner.minKmh).toBeLessThanOrEqual(corner.entryKmh);
        expect(corner.gear).toBeGreaterThanOrEqual(1);
        expect(corner.gear).toBeLessThanOrEqual(8);
        expect(corner.tip.length).toBeGreaterThan(40);
      });
    }
  });

  it('Mónaco es más lenta y más trabada que Monza', () => {
    const monaco = trackInsight(TRACKS.find((t) => t.id === 'monaco') ?? TRACKS[0]!);
    const monza = trackInsight(TRACKS.find((t) => t.id === 'monza') ?? TRACKS[0]!);
    expect(monaco.kind).toBe('Urbano');
    expect(monza.kind).toBe('Permanente');
    expect(monaco.fullThrottle).toBeLessThan(monza.fullThrottle);
    expect(monaco.slowest?.minKmh ?? 0).toBeLessThan(monza.slowest?.minKmh ?? 0);
    expect(monaco.corners.some((c) => c.kind === 'hairpin')).toBe(true);
  });
});
