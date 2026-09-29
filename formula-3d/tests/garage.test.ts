import { describe, expect, it } from 'vitest';
import { sanitizeSave } from '../src/core/save/sanitize';
import { createDefaultProgression, createDefaultSave } from '../src/core/save/schema';
import { createDefaultGarage, liveryFromSetup, ownsItemId, PALETTE, PATTERNS } from '../src/garage/setup';
import { ITEMS } from '../src/progression/items';

const NOW = 1_700_000_000_000;
const defaults = () => createDefaultSave(NOW, 'high');

describe('garaje', () => {
  it('lo de fábrica se tiene siempre; lo de nivel, al llegar al nivel; lo del pase, al ganarlo', () => {
    const rookie = createDefaultProgression();
    expect(ownsItemId('material-gloss', rookie)).toBe(true);
    expect(ownsItemId('material-chrome', rookie)).toBe(false);
    expect(ownsItemId('material-chrome', { ...rookie, level: 25 })).toBe(true);
    expect(ownsItemId('rims-turbine', rookie)).toBe(false);
    expect(ownsItemId('rims-turbine', { ...rookie, unlocked: [...rookie.unlocked, 'rims-turbine'] })).toBe(true);
    // Todo ítem del garaje se consigue de alguna forma: de fábrica, por nivel o en el pase.
    for (const item of ITEMS) expect(item.level === undefined || item.level <= 100).toBe(true);
  });

  it('la configuración de fábrica da la livery de siempre', () => {
    const livery = liveryFromSetup(createDefaultGarage());
    expect(livery).toMatchObject({ primary: '#c8102e', secondary: '#111317', accent: '#f2f2f0', number: 7, pattern: 'solid', finish: 'gloss', wing: 'standard' });
    expect(livery.rims).toMatchObject({ cover: true, accent: '#ff2a3c' });
    expect(livery.helmet?.design).toBe('team');
  });

  it('traduce ítems a la livery: acabado, llantas, alerón y casco', () => {
    const livery = liveryFromSetup({ ...createDefaultGarage(), material: 'material-pearl', rims: 'rims-gold', wing: 'wing-swan', helmet: 'helmet-stars', number: 44 });
    expect(livery.finish).toBe('pearl');
    expect(livery.rims).toMatchObject({ spokes: 7, cover: false });
    expect(livery.wing).toBe('swan');
    expect(livery.helmet?.design).toBe('stars');
    expect(livery.number).toBe(44);
  });

  it('el saneo descarta piezas que no se tienen, colores inválidos y números fuera de rango', () => {
    const data = sanitizeSave(
      {
        progression: { level: 3, unlocked: ['rims-turbine'] },
        garage: { pattern: 'plaid', colors: ['#ABCDEF', 'rojo', 42], material: 'material-chrome', rims: 'rims-turbine', wing: 'paint-nebula', helmet: 'helmet-stripe', number: 250, tireStripe: '#fff' },
      },
      defaults(),
    );
    const garage = data.garage;
    const factory = createDefaultGarage();
    expect(garage.pattern).toBe('solid');
    expect(garage.colors).toEqual(['#abcdef', factory.colors[1], factory.colors[2]]);
    expect(garage.material).toBe('material-gloss'); // cromo pide nivel 25
    expect(garage.rims).toBe('rims-turbine'); // ganada en el pase
    expect(garage.wing).toBe('wing-standard'); // no es un alerón
    expect(garage.helmet).toBe('helmet-team'); // franja azul pide nivel 5
    expect(garage.number).toBe(99);
    expect(garage.tireStripe).toBe(factory.tireStripe);
  });

  it('festejo del podio: el de fábrica siempre; los del pase, sólo si se ganaron', () => {
    expect(createDefaultGarage().celebration).toBe('celebration-streamers');
    const won = sanitizeSave({ progression: { unlocked: ['celebration-fireworks'] }, garage: { celebration: 'celebration-fireworks' } }, defaults());
    expect(won.garage.celebration).toBe('celebration-fireworks');
    const notWon = sanitizeSave({ garage: { celebration: 'celebration-confetti' } }, defaults());
    expect(notWon.garage.celebration).toBe('celebration-streamers');
    const wrongKind = sanitizeSave({ garage: { celebration: 'rims-factory' } }, defaults());
    expect(wrongKind.garage.celebration).toBe('celebration-streamers');
  });

  it('patrones y paleta: lo básico sin nivel y lo especial más adelante', () => {
    expect(PATTERNS[0]).toMatchObject({ id: 'solid', level: 1 });
    expect(PATTERNS.every((p, i) => i === 0 || p.level >= (PATTERNS[i - 1]?.level ?? 0))).toBe(true);
    expect(PALETTE.filter((c) => c.level === 1).length).toBeGreaterThanOrEqual(8);
    expect(new Set(PALETTE.map((c) => c.hex)).size).toBe(PALETTE.length);
  });
});
