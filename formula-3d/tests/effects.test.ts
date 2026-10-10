import { describe, expect, it } from 'vitest';
import { ParticleSystem, SMOKE, SPARKS } from '../src/race/render/Particles';

/** Partículas vivas: las que se dibujan. */
const alive = (system: ParticleSystem): number => system.points.geometry.drawRange.count;

describe('partículas', () => {
  it('respeta la capacidad (escalada por la calidad) y no crea más', () => {
    const system = new ParticleSystem(SPARKS, 0.1);
    const capacity = Math.round(SPARKS.capacity * 0.1);
    for (let i = 0; i < capacity * 3; i++) system.emit(0, 1, 0, 0, 0, 0, 5, 0.1, 1, 1, 1, 1);
    system.update(1 / 60);
    expect(alive(system)).toBe(capacity);
    system.dispose();
  });

  it('las que mueren dejan lugar y las vivas siguen su vida', () => {
    const system = new ParticleSystem(SMOKE, 1);
    for (let i = 0; i < 10; i++) system.emit(i, 1, 0, 0, 0, 0, i < 5 ? 0.1 : 2, 0.5, 1, 1, 1, 1);
    system.update(0.2);
    expect(alive(system)).toBe(5);
    // Las cinco que quedan son las de vida larga (x = 5…9), en cualquier orden.
    const positions = system.points.geometry.getAttribute('position');
    const xs = Array.from({ length: 5 }, (_, i) => Math.round(positions.getX(i))).sort((a, b) => a - b);
    expect(xs).toEqual([5, 6, 7, 8, 9]);
    system.clear();
    system.update(0.1);
    expect(alive(system)).toBe(0);
    expect(system.points.visible).toBe(false);
    system.dispose();
  });

  it('el humo sube, crece y se desvanece; las chispas caen', () => {
    const smoke = new ParticleSystem(SMOKE, 1);
    smoke.emit(0, 1, 0, 0, 0, 0, 2, 0.5, 0.8, 1, 1, 1);
    for (let i = 0; i < 60; i++) smoke.update(1 / 60);
    const geometry = smoke.points.geometry;
    expect(geometry.getAttribute('position').getY(0)).toBeGreaterThan(1);
    expect(geometry.getAttribute('size').getX(0)).toBeGreaterThan(0.5);
    expect(geometry.getAttribute('alpha').getX(0)).toBeLessThan(0.8);
    const sparks = new ParticleSystem(SPARKS, 1);
    sparks.emit(0, 2, 0, 0, 0, 0, 2, 0.1, 1, 1, 1, 1);
    for (let i = 0; i < 30; i++) sparks.update(1 / 60);
    expect(sparks.points.geometry.getAttribute('position').getY(0)).toBeLessThan(2);
    smoke.dispose();
    sparks.dispose();
  });
});
