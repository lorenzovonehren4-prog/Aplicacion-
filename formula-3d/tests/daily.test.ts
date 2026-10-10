import { describe, expect, it } from 'vitest';
import { sanitizeSave } from '../src/core/save/sanitize';
import { createDefaultSave } from '../src/core/save/schema';
import {
  CHALLENGE_KINDS,
  completeDaily,
  createDailyState,
  currentStreak,
  dailyChallenge,
  dailyCompleted,
  dailyReward,
  dateKey,
  doneToday,
  previousDay,
} from '../src/progression/daily';
import { medalTimes } from '../src/progression/medals';
import { TRACKS } from '../src/tracks/registry';

const noLaps = (): null => null;

/** Fecha AAAA-MM-DD a `days` días de `start`. */
function plus(start: string, days: number): string {
  const [y, m, d] = start.split('-').map(Number);
  return dateKey(new Date(y ?? 2026, (m ?? 1) - 1, (d ?? 1) + days));
}

describe('desafío del día', () => {
  it('fechas locales y el día anterior (cambio de mes y de año)', () => {
    expect(dateKey(new Date(2026, 9, 3, 23, 59))).toBe('2026-10-03');
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2026-01-01')).toBe('2025-12-31');
  });

  it('el mismo día da el mismo desafío; los tipos rotan y la pista nunca repite la de ayer', () => {
    const today = '2026-10-03';
    expect(dailyChallenge(today, TRACKS, noLaps, 50)).toEqual(dailyChallenge(today, TRACKS, noLaps, 50));
    const kinds = new Set<string>();
    let previous = '';
    for (let i = 0; i < 60; i++) {
      const challenge = dailyChallenge(plus(today, i), TRACKS, noLaps, 38);
      if (i < CHALLENGE_KINDS.length) kinds.add(challenge.kind);
      expect(challenge.trackId).not.toBe(previous);
      previous = challenge.trackId;
      expect(TRACKS.some((t) => t.id === challenge.trackId)).toBe(true);
      expect(challenge.race.trackId).toBe(challenge.trackId);
      expect(challenge.race.daily).toBe(plus(today, i));
      expect(challenge.goal.length).toBeGreaterThan(30);
      if (challenge.kind === 'comeback') expect(challenge.race.startLast).toBe(true);
      // Remontada y victoria: un nivel con nombre por debajo (Amateur 38 → Novato 8).
      if (challenge.kind === 'comeback' || challenge.kind === 'win') expect(challenge.race.difficulty).toBe(8);
      if (challenge.kind === 'podium' || challenge.kind === 'clean') expect(challenge.race.difficulty).toBe(38);
      if (challenge.kind === 'medal') expect(challenge.race.mode).toBe('timeTrial');
      else expect(challenge.race.mode).toBe('race');
    }
    expect(kinds.size).toBe(CHALLENGE_KINDS.length);
  });

  it('la medalla del desafío es la próxima del jugador en esa pista', () => {
    let day = '2026-10-03';
    while (dailyChallenge(day, TRACKS, noLaps, 50).kind !== 'medal') day = plus(day, 1);
    const fresh = dailyChallenge(day, TRACKS, noLaps, 50);
    const def = TRACKS.find((t) => t.id === fresh.trackId)!;
    const times = medalTimes(def);
    expect(fresh.target).toBe(times.bronze);
    const withSilver = dailyChallenge(day, TRACKS, () => times.silver, 50);
    expect(withSilver.target).toBe(times.gold);
    expect(withSilver.title).toBe('Vuelta de oro');
  });

  it('cada tipo se cumple con lo suyo', () => {
    const base = { bestLap: null, position: null, contacts: 0, allValid: true };
    const of = (kind: (typeof CHALLENGE_KINDS)[number]) => {
      let day = '2026-10-03';
      while (dailyChallenge(day, TRACKS, noLaps, 50).kind !== kind) day = plus(day, 1);
      return dailyChallenge(day, TRACKS, noLaps, 50);
    };
    const medal = of('medal');
    expect(dailyCompleted(medal, { ...base, bestLap: (medal.target ?? 0) - 0.1 })).toBe(true);
    expect(dailyCompleted(medal, { ...base, bestLap: (medal.target ?? 0) + 0.1 })).toBe(false);
    expect(dailyCompleted(of('podium'), { ...base, position: 3 })).toBe(true);
    expect(dailyCompleted(of('podium'), { ...base, position: 4 })).toBe(false);
    expect(dailyCompleted(of('comeback'), { ...base, position: 6 })).toBe(true);
    expect(dailyCompleted(of('clean'), { ...base, position: 5, contacts: 1 })).toBe(false);
    expect(dailyCompleted(of('clean'), { ...base, position: 5, allValid: false })).toBe(false);
    expect(dailyCompleted(of('clean'), { ...base, position: 5 })).toBe(true);
    expect(dailyCompleted(of('win'), { ...base, position: 1 })).toBe(true);
    expect(dailyCompleted(of('win'), { ...base, position: 2 })).toBe(false);
    // Sin terminar la carrera no hay puesto: no se cumple.
    expect(dailyCompleted(of('podium'), base)).toBe(false);
  });

  it('racha: sube con días seguidos, se corta si se saltea uno y no se cobra dos veces el mismo día', () => {
    let state = createDailyState();
    state = completeDaily(state, '2026-10-01');
    state = completeDaily(state, '2026-10-02');
    state = completeDaily(state, '2026-10-03');
    expect(state).toEqual({ last: '2026-10-03', streak: 3, best: 3, total: 3 });
    expect(doneToday(state, '2026-10-03')).toBe(true);
    expect(completeDaily(state, '2026-10-03')).toEqual(state);
    expect(currentStreak(state, '2026-10-04')).toBe(3);
    expect(currentStreak(state, '2026-10-05')).toBe(0);
    state = completeDaily(state, '2026-10-05');
    expect(state.streak).toBe(1);
    expect(state.best).toBe(3);
  });

  it('el premio sube con la racha hasta el quinto día', () => {
    expect(dailyReward(1)).toEqual({ xp: 300, points: 2 });
    expect(dailyReward(3)).toEqual({ xp: 420, points: 3 });
    expect(dailyReward(5)).toEqual({ xp: 540, points: 3 });
    expect(dailyReward(30)).toEqual({ xp: 540, points: 3 });
  });

  it('el guardado: uno viejo arranca de cero y lo inválido se corrige', () => {
    const fresh = createDefaultSave(Date.now(), 'medium');
    // Un guardado de antes de la Versión 2.4 no trae el campo.
    const old: Record<string, unknown> = { ...fresh };
    delete old.daily;
    expect(sanitizeSave(old, fresh).daily).toEqual(createDailyState());
    expect(sanitizeSave({ ...fresh, daily: { last: 'ayer', streak: 9, best: -2, total: 'x' } }, fresh).daily).toEqual(createDailyState());
    expect(sanitizeSave({ ...fresh, daily: { last: '2026-10-02', streak: 4, best: 2, total: 1 } }, fresh).daily).toEqual({
      last: '2026-10-02',
      streak: 4,
      best: 4,
      total: 4,
    });
  });
});
