import { describe, expect, it } from 'vitest';
import { F1_SPEC } from '../src/race/physics/CarSpec';
import { PracticeSession, type SessionEvent } from '../src/race/PracticeSession';
import { AUSTRALIA } from '../src/tracks/data/australia';
import { Track } from '../src/tracks/Track';
import { autopilot } from './helpers/autopilot';

const STEP = 1 / 120;
const track = Track.load(AUSTRALIA);

describe('Práctica libre', () => {
  it('arranca en la pole, detrás de la línea, en vuelta de salida', () => {
    const session = new PracticeSession(track, F1_SPEC, null);
    expect(session.timer.lap).toBe(0);
    expect(session.distance).toBeGreaterThan(track.length - 20);
    expect(session.vehicle.speed).toBe(0);
    expect(session.wrongWay).toBe(false);
  });

  it('con el autopiloto completa una vuelta válida, pasa por las zonas de DRS y la cronometra', () => {
    const session = new PracticeSession(track, F1_SPEC, null);
    const events: SessionEvent[] = [];
    for (let t = 0; t < 150 && !events.some((e) => e.kind === 'lapCompleted'); t += STEP) {
      const input = autopilot(session.vehicle, track);
      events.push(...session.step(STEP, input, true));
    }
    const lap = events.find((e) => e.kind === 'lapCompleted');
    expect(lap?.kind).toBe('lapCompleted');
    if (lap?.kind !== 'lapCompleted') return;
    expect(lap.lap.valid).toBe(true);
    expect(lap.lap.time).toBeGreaterThan(80);
    expect(lap.lap.time).toBeLessThan(125);
    expect(lap.personalBest).toBe(true);
    expect(events.filter((e) => e.kind === 'sector')).toHaveLength(2);
    // Tres zonas de DRS: entra a todas (la primera, cerca de la meta, puede entrar dos veces).
    expect(events.filter((e) => e.kind === 'drsZone' && e.entered).length).toBeGreaterThanOrEqual(3);
  });

  it('volver a pista anula la vuelta y deja el auto detenido sobre el asfalto', () => {
    const session = new PracticeSession(track, F1_SPEC, null);
    // Sale y cruza la línea para tener una vuelta en curso.
    for (let t = 0; t < 4; t += STEP) session.step(STEP, { throttle: 1, brake: 0, steer: 0 }, false);
    expect(session.timer.lap).toBe(1);
    const events = session.resetToTrack();
    expect(events.some((e) => e.kind === 'invalidated')).toBe(true);
    expect(session.vehicle.speed).toBe(0);
    expect(Math.abs(session.vehicle.projection.d)).toBeLessThan(0.5);
  });

  it('reiniciar vuelve a la parrilla y conserva el récord personal', () => {
    const session = new PracticeSession(track, F1_SPEC, 95);
    for (let t = 0; t < 3; t += STEP) session.step(STEP, { throttle: 1, brake: 0, steer: 0 }, false);
    session.restart();
    expect(session.timer.lap).toBe(0);
    expect(session.timer.personalBest).toBe(95);
    expect(session.vehicle.speed).toBe(0);
  });

  it('avisa si el auto va en sentido contrario', () => {
    const session = new PracticeSession(track, F1_SPEC, null);
    const v = session.vehicle;
    v.heading += Math.PI;
    v.vx = 10;
    expect(session.wrongWay).toBe(true);
  });
});
