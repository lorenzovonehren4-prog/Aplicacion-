import { describe, expect, it } from 'vitest';
import { sanitizeSave } from '../src/core/save/sanitize';
import { createDefaultSave } from '../src/core/save/schema';
import {
  applyUpgrades,
  buyUpgrade,
  carStats,
  createDefaultWorkshop,
  devPointsFor,
  MAX_STATS,
  STOCK_STATS,
  totalLevels,
  UPGRADE_IDS,
  UPGRADE_MAX_LEVEL,
  upgradeCost,
  type DevPointsInput,
} from '../src/progression/upgrades';
import { F1_SPEC } from '../src/race/physics/CarSpec';

const NOW = 1_700_000_000_000;

const RACE: DevPointsInput = {
  mode: 'race',
  position: 5,
  starters: 10,
  laps: 3,
  personalBest: false,
  difficulty: 60,
  seasonPosition: null,
};

describe('mejoras del auto', () => {
  it('cada nivel cuesta uno más que el anterior y el máximo no se pasa', () => {
    expect([0, 1, 2, 3, 4].map(upgradeCost)).toEqual([1, 2, 3, 4, 5]);
    expect(upgradeCost(UPGRADE_MAX_LEVEL)).toBeNull();
    let workshop = createDefaultWorkshop(100);
    for (let i = 0; i < UPGRADE_MAX_LEVEL; i++) {
      const next = buyUpgrade(workshop, 'engine');
      expect(next).not.toBeNull();
      if (next) workshop = next;
    }
    expect(workshop.levels.engine).toBe(UPGRADE_MAX_LEVEL);
    expect(workshop.points).toBe(100 - 15);
    expect(buyUpgrade(workshop, 'engine')).toBeNull();
    expect(totalLevels(workshop.levels)).toBe(UPGRADE_MAX_LEVEL);
  });

  it('no compra sin puntos y no toca el taller original', () => {
    const workshop = createDefaultWorkshop(1);
    const once = buyUpgrade(workshop, 'aero');
    expect(once?.points).toBe(0);
    expect(workshop.levels.aero).toBe(0);
    expect(once && buyUpgrade(once, 'aero')).toBeNull();
  });

  it('cada área mejora lo que promete y el auto de fábrica queda igual', () => {
    const none = { engine: 0, aero: 0, brakes: 0, gearbox: 0, chassis: 0 };
    expect(applyUpgrades(F1_SPEC, none)).toEqual({ ...F1_SPEC, gearTorqueMap: [...F1_SPEC.gearTorqueMap] });
    const engine = carStats(applyUpgrades(F1_SPEC, { ...none, engine: 5 }));
    expect(engine.power).toBeGreaterThan(STOCK_STATS.power);
    expect(engine.topSpeed).toBeGreaterThan(STOCK_STATS.topSpeed);
    const aero = carStats(applyUpgrades(F1_SPEC, { ...none, aero: 5 }));
    expect(aero.cornering).toBeGreaterThan(STOCK_STATS.cornering);
    expect(aero.topSpeed).toBeLessThanOrEqual(STOCK_STATS.topSpeed);
    const brakes = carStats(applyUpgrades(F1_SPEC, { ...none, brakes: 5 }));
    expect(brakes.braking).toBeGreaterThan(STOCK_STATS.braking);
    const gearbox = carStats(applyUpgrades(F1_SPEC, { ...none, gearbox: 5 }));
    expect(gearbox.shift).toBeLessThan(STOCK_STATS.shift);
    const chassis = carStats(applyUpgrades(F1_SPEC, { ...none, chassis: 5 }));
    expect(chassis.cornering).toBeGreaterThan(STOCK_STATS.cornering);
    // El paquete completo es mejor en todo, pero no un auto de otra categoría.
    expect(MAX_STATS.power / STOCK_STATS.power).toBeLessThan(1.1);
    expect(MAX_STATS.cornering / STOCK_STATS.cornering).toBeLessThan(1.15);
  });

  it('los niveles fuera de rango se recortan', () => {
    const wild = applyUpgrades(F1_SPEC, { engine: 99, aero: -3, brakes: 2.4, gearbox: 0, chassis: 0 });
    const max = applyUpgrades(F1_SPEC, { engine: UPGRADE_MAX_LEVEL, aero: 0, brakes: 2, gearbox: 0, chassis: 0 });
    expect(wild).toEqual(max);
  });

  it('puntos de desarrollo: mejor puesto, más largo y más difícil dan más', () => {
    const p5 = devPointsFor(RACE);
    expect(devPointsFor({ ...RACE, position: 1 })).toBeGreaterThan(p5);
    expect(devPointsFor({ ...RACE, position: 10 })).toBeLessThan(p5);
    expect(devPointsFor({ ...RACE, laps: 10 })).toBeGreaterThan(p5);
    expect(devPointsFor({ ...RACE, difficulty: 95 })).toBeGreaterThan(p5);
    expect(devPointsFor({ ...RACE, position: 20, starters: 20, difficulty: 0 })).toBeGreaterThanOrEqual(1);
    expect(devPointsFor({ ...RACE, seasonPosition: 1 })).toBe(p5 + 10);
    // Sin rivales: por vueltas válidas y récord personal.
    expect(devPointsFor({ ...RACE, mode: 'timeTrial', starters: 1, laps: 2 })).toBe(0);
    expect(devPointsFor({ ...RACE, mode: 'timeTrial', starters: 1, laps: 7, personalBest: true })).toBe(3);
    expect(devPointsFor({ ...RACE, mode: 'practice', starters: 1, laps: 40 })).toBe(3);
  });

  it('un guardado viejo recibe puntos de bienvenida según sus carreras', () => {
    const fresh = sanitizeSave({}, createDefaultSave(NOW, 'high'));
    expect(fresh.workshop.points).toBe(5);
    const veteran = sanitizeSave({ stats: { races: 12 } }, createDefaultSave(NOW, 'high'));
    expect(veteran.workshop.points).toBe(5 + 24);
    const saved = sanitizeSave(
      { workshop: { points: 7, earned: 30, levels: { engine: 3, aero: 9, brakes: -1, gearbox: 'x' } } },
      createDefaultSave(NOW, 'high'),
    );
    expect(saved.workshop.points).toBe(7);
    expect(saved.workshop.levels).toEqual({ engine: 3, aero: UPGRADE_MAX_LEVEL, brakes: 0, gearbox: 0, chassis: 0 });
    expect(UPGRADE_IDS.every((id) => Number.isInteger(saved.workshop.levels[id]))).toBe(true);
  });
});
