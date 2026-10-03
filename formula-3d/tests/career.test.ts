import { describe, expect, it } from 'vitest';
import { createDefaultBindings, isBindableKey, keyLabel } from '../src/core/input/bindings';
import { sanitizeSave } from '../src/core/save/sanitize';
import { createDefaultSave } from '../src/core/save/schema';
import { achievementContext, ACHIEVEMENTS, createDefaultStats, newAchievements, recordSession, type SessionSummary } from '../src/progression/career';
import { medalTimes } from '../src/progression/medals';
import { TRACKS } from '../src/tracks/registry';

const NOW = 1_700_000_000_000;

function race(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    mode: 'race',
    trackId: 'monza',
    position: 1,
    starters: 12,
    raceLaps: 3,
    validLaps: 3,
    distanceKm: 17.4,
    fastestLap: true,
    clean: true,
    overtakes: 5,
    difficulty: 38,
    assistMultiplier: 1,
    seasonPosition: null,
    ...overrides,
  };
}

describe('estadísticas de la trayectoria', () => {
  it('una victoria suma carrera, victoria, podio, puntos, vuelta rápida y el circuito', () => {
    const stats = recordSession(createDefaultStats(), race());
    expect(stats).toMatchObject({ races: 1, wins: 1, podiums: 1, pointsFinishes: 1, fastestLaps: 1, cleanRaces: 1, overtakes: 5, laps: 3 });
    expect(stats.distanceKm).toBeCloseTo(17.4);
    expect(stats.tracks.monza).toEqual({ races: 1, wins: 1, podiums: 1 });
  });

  it('práctica suma vueltas y distancia pero no carreras; el campeonato cuenta al cerrarse', () => {
    let stats = recordSession(createDefaultStats(), race({ mode: 'practice', validLaps: 6, distanceKm: 30 }));
    expect(stats.races).toBe(0);
    expect(stats.laps).toBe(6);
    stats = recordSession(stats, race({ position: 4, seasonPosition: 1, difficulty: 95, assistMultiplier: 1.5 }));
    expect(stats).toMatchObject({ races: 1, wins: 0, podiums: 0, seasons: 1, championships: 1, legendWins: 0 });
  });

  it('los logros se cumplen una sola vez', () => {
    const data = createDefaultSave(NOW, 'high');
    expect(newAchievements(achievementContext(data), {})).toEqual([]);
    data.stats = recordSession(data.stats, race({ difficulty: 95, assistMultiplier: 1.5, raceLaps: 10 }));
    const fresh = newAchievements(achievementContext(data), {});
    expect(fresh).toEqual(expect.arrayContaining(['first-race', 'first-points', 'first-podium', 'first-win', 'fastest-lap', 'legend-win', 'unassisted-win', 'long-race']));
    const have = Object.fromEntries(fresh.map((id) => [id, NOW]));
    expect(newAchievements(achievementContext(data), have)).toEqual([]);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  it('logros de medallas y de la racha del desafío del día', () => {
    const data = createDefaultSave(NOW, 'high');
    const monza = TRACKS.find((t) => t.id === 'monza') ?? TRACKS[0]!;
    data.records = { monza: { bestLap: medalTimes(monza).gold } };
    data.daily = { last: '2026-10-03', streak: 3, best: 3, total: 3 };
    const fresh = newAchievements(achievementContext(data), {});
    expect(fresh).toEqual(expect.arrayContaining(['medal-gold', 'daily-3']));
    expect(fresh).not.toContain('medal-platinum');
    expect(fresh).not.toContain('daily-7');
  });

  it('el saneo descarta logros desconocidos y estadísticas inválidas', () => {
    const data = sanitizeSave({ achievements: { 'first-win': NOW, hacker: NOW, 'first-race': 'ayer' }, stats: { wins: -3, races: 2.6, tracks: { monza: { wins: 2 }, '../x': {} } } }, createDefaultSave(NOW, 'high'));
    expect(data.achievements).toEqual({ 'first-win': NOW });
    expect(data.stats.wins).toBe(0);
    expect(data.stats.races).toBe(3);
    expect(Object.keys(data.stats.tracks)).toEqual(['monza']);
  });
});

describe('teclas', () => {
  it('nombres cortos y teclas que no se pueden asignar', () => {
    expect(keyLabel('KeyD')).toBe('D');
    expect(keyLabel('ArrowUp')).toBe('↑');
    expect(keyLabel('Digit3')).toBe('3');
    expect(isBindableKey('Escape')).toBe(false);
    expect(isBindableKey('KeyW')).toBe(true);
  });

  it('una tecla repetida hace volver todas a las de fábrica', () => {
    const base = createDefaultSave(NOW, 'high');
    const ok = sanitizeSave({ settings: { controls: { keys: { ...createDefaultBindings(), throttle: 'KeyW', brake: 'KeyS' } } } }, base);
    expect(ok.settings.controls.keys).toMatchObject({ throttle: 'KeyW', brake: 'KeyS' });
    const clash = sanitizeSave({ settings: { controls: { keys: { ...createDefaultBindings(), throttle: 'KeyD' } } } }, base);
    expect(clash.settings.controls.keys).toEqual(createDefaultBindings());
  });
});
