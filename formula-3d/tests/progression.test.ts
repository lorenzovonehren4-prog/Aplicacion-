import { describe, expect, it } from 'vitest';
import { sanitizeSave } from '../src/core/save/sanitize';
import { createDefaultProgression, createDefaultSave } from '../src/core/save/schema';
import { getItem, ITEMS, RARITIES, SEASON_ONE_REWARDS, STARTER_ITEM_IDS } from '../src/progression/items';
import { xpToNextLevel } from '../src/progression/levels';
import { passProgress, passRewardsBetween, PASS_MAX_XP, SEASON } from '../src/progression/seasonPass';
import { applyXp, computeXp, difficultyMultiplier, positionBase, type XpInput } from '../src/progression/xp';

const NOW = 1_700_000_000_000;
const LABELS = { difficulty: 'Amateur', assists: 'Principiante' };

function raceInput(overrides: Partial<XpInput> = {}): XpInput {
  return {
    mode: 'race',
    position: 3,
    starters: 12,
    laps: 3,
    overtakes: 4,
    fastestLap: false,
    clean: true,
    personalBest: false,
    difficulty: 38,
    assistMultiplier: 1,
    championshipPoints: null,
    seasonPosition: null,
    ...overrides,
  };
}

describe('catálogo de ítems', () => {
  it('tiene ids únicos, rarezas válidas y 50 recompensas en la temporada', () => {
    const ids = ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of ITEMS) expect(RARITIES).toContain(item.rarity);
    expect(SEASON_ONE_REWARDS).toHaveLength(50);
    expect(SEASON.tiers).toBe(50);
    // Los niveles 10, 20… 50 son legendarios: el premio mayor de cada tramo.
    for (const tier of [10, 20, 30, 40, 50]) expect(getItem(SEASON_ONE_REWARDS[tier - 1] ?? '')?.rarity).toBe('legendary');
    for (const id of STARTER_ITEM_IDS) expect(SEASON_ONE_REWARDS).not.toContain(id);
  });
});

describe('XP de una sesión', () => {
  it('suma posición, adelantamientos y carrera limpia, y multiplica', () => {
    const award = computeXp(raceInput(), LABELS);
    expect(award.lines.map((line) => line.label)).toEqual(['Posición final', 'Adelantamientos', 'Carrera limpia']);
    expect(award.subtotal).toBe(750 + 200 + 200);
    expect(award.total).toBe(1150);
    const hard = computeXp(raceInput({ difficulty: 95, assistMultiplier: 1.5 }), LABELS);
    expect(hard.total).toBe(Math.round((1150 * 1.5 * 1.5) / 10) * 10);
  });

  it('una carrera más larga da más base y los adelantamientos tienen tope', () => {
    expect(positionBase(1, 3)).toBe(1000);
    expect(positionBase(1, 10)).toBeGreaterThan(positionBase(1, 5));
    expect(positionBase(15, 3)).toBe(300);
    const farm = computeXp(raceInput({ overtakes: 80, clean: false }), LABELS);
    expect(farm.lines.find((line) => line.label === 'Adelantamientos')?.xp).toBe(600);
  });

  it('el campeonato suma 20 por punto y el premio de fin de temporada', () => {
    const award = computeXp(raceInput({ position: 1, championshipPoints: 25, seasonPosition: 1, clean: false, overtakes: 0 }), LABELS);
    expect(award.lines.map((line) => line.xp)).toEqual([1000, 500, 2000]);
  });

  it('práctica y contrarreloj dan XP por vuelta válida y por récord', () => {
    const practice = computeXp(raceInput({ mode: 'practice', laps: 5, personalBest: true }), LABELS);
    expect(practice.subtotal).toBe(5 * 60 + 150);
    expect(practice.multipliers).toHaveLength(1);
    const trial = computeXp(raceInput({ mode: 'timeTrial', laps: 0, personalBest: false }), LABELS);
    expect(trial.total).toBe(0);
  });

  it('el multiplicador de dificultad es continuo entre los niveles', () => {
    expect(difficultyMultiplier(0)).toBe(0.8);
    expect(difficultyMultiplier(38)).toBe(1);
    expect(difficultyMultiplier(68)).toBe(1.25);
    expect(difficultyMultiplier(100)).toBe(1.5);
    expect(difficultyMultiplier(53)).toBeGreaterThan(1);
    expect(difficultyMultiplier(53)).toBeLessThan(1.25);
  });
});

describe('applyXp', () => {
  it('sube de nivel arrastrando el sobrante', () => {
    const start = createDefaultProgression();
    const gain = applyXp(start, xpToNextLevel(1) + xpToNextLevel(2) + 10);
    expect(gain.levelsGained).toBe(2);
    expect(gain.progression.level).toBe(3);
    expect(gain.progression.xp).toBe(10);
    expect(gain.progression.totalXp).toBe(xpToNextLevel(1) + xpToNextLevel(2) + 10);
  });

  it('desbloquea las recompensas de cada nivel del pase alcanzado', () => {
    const start = createDefaultProgression();
    const gain = applyXp(start, 2500);
    expect(gain.rewards).toEqual(SEASON_ONE_REWARDS.slice(0, 2));
    expect(gain.progression.unlocked).toEqual([...STARTER_ITEM_IDS, ...SEASON_ONE_REWARDS.slice(0, 2)]);
    expect(passProgress(gain.progression.pass.xp)).toMatchObject({ tier: 2, xp: 500, fraction: 0.5 });
    const next = applyXp(gain.progression, 600);
    expect(next.rewards).toEqual([SEASON_ONE_REWARDS[2]]);
  });

  it('el pase se completa en 50 000 XP y el nivel máximo queda en 100', () => {
    const gain = applyXp(createDefaultProgression(), 5_000_000);
    expect(gain.progression.level).toBe(100);
    expect(gain.progression.xp).toBe(0);
    expect(gain.progression.pass.xp).toBe(PASS_MAX_XP);
    expect(gain.rewards).toHaveLength(50);
    expect(passProgress(PASS_MAX_XP).complete).toBe(true);
    expect(passRewardsBetween(PASS_MAX_XP, PASS_MAX_XP + 999)).toEqual([]);
  });
});

describe('saneo de la progresión', () => {
  const defaults = () => createDefaultSave(NOW, 'high');

  it('descarta ítems desconocidos y equipados que no se tienen', () => {
    const data = sanitizeSave(
      {
        profile: { titleId: 'title-apex', avatarId: 'avatar-crown' },
        progression: { level: 4, xp: 10, totalXp: 5000, pass: { season: 1, xp: 500 }, unlocked: ['title-apex', 'hacker-item', 'title-apex', 42] },
      },
      defaults(),
    );
    expect(data.progression.unlocked).toEqual([...STARTER_ITEM_IDS, 'title-apex']);
    expect(data.profile.titleId).toBe('title-apex');
    // La corona no está desbloqueada: vuelve el avatar por defecto.
    expect(data.profile.avatarId).toBe('avatar-initials');
    expect(data.progression.pass).toEqual({ season: 1, xp: 500 });
  });

  it('los niveles del pase ya completados siempre dan su recompensa', () => {
    const data = sanitizeSave({ progression: { pass: { season: 1, xp: 3500 }, unlocked: [] } }, defaults());
    expect(data.progression.unlocked).toEqual([...STARTER_ITEM_IDS, ...SEASON_ONE_REWARDS.slice(0, 3)]);
  });

  it('un título equipado tiene que ser un título', () => {
    const data = sanitizeSave({ profile: { titleId: 'paint-crimson' }, progression: { unlocked: ['paint-crimson'] } }, defaults());
    expect(data.profile.titleId).toBe('title-rookie');
  });

  it('el pase de otra temporada empieza de cero', () => {
    const data = sanitizeSave({ progression: { pass: { season: 7, xp: 30_000 } } }, defaults());
    expect(data.progression.pass).toEqual({ season: SEASON.id, xp: 0 });
  });
});
