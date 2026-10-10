/**
 * Los bots en las 24 pistas: carreras de una vuelta con 11 rivales en
 * Leyenda (la largada y las primeras curvas son lo más difícil) y un bot solo
 * que aprende la pista. Antes de la Versión 2.1, en Leyenda medio pelotón se
 * iba en la primera curva de Suzuka, los autos quedaban hasta 28 s fuera de la
 * pista y Leyenda daba vueltas más lentas que Profesional.
 */
import { describe, expect, it, vi } from 'vitest';
import { ASSIST_PRESETS } from '../src/assists/presets';
import { pickRivals } from '../src/data/teams';
import { BotDriver } from '../src/race/ai/BotDriver';
import { botParams } from '../src/race/ai/difficulty';
import { F1_SPEC, performanceModel } from '../src/race/physics/CarSpec';
import { Session } from '../src/race/Session';
import { getTrack, TRACKS } from '../src/tracks/registry';
import { Track } from '../src/tracks/Track';

const STEP = 1 / 120;
const ASSISTS = { ...ASSIST_PRESETS.intermediate, braking: 'off' as const };
const LEGEND = 95;

function seeded(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

describe('bots en las 24 pistas', () => {
  it('Leyenda, 1 vuelta con 11 rivales: todos terminan, casi nadie necesita volver a la pista y nadie queda mucho tiempo afuera', () => {
    // Cuenta los bots que vuelven a la pista porque quedaron trabados o afuera.
    const recovered = vi.spyOn(BotDriver.prototype, 'recovered');
    let total = 0;
    try {
      for (const def of TRACKS) {
        const track = Track.load(def);
        const random = seeded(7);
        const session = new Session(
          track,
          F1_SPEC,
          null,
          { mode: 'race', laps: 1, rivals: { drivers: pickRivals(11), difficulty: LEGEND }, player: { name: 'Prueba', code: 'PRU', number: 7 } },
          ASSISTS,
          random,
        );
        const me = new BotDriver(track, performanceModel(F1_SPEC), botParams(LEGEND, { skill: 0.84, aggression: 0.5 }), random);
        me.reset(session.vehicle);
        const input = { throttle: 0, brake: 0, steer: 0, drs: false };
        const offTime = session.cars.map(() => 0);
        const before = recovered.mock.calls.length;
        for (let t = 0; t < 260; t += STEP) {
          if (session.phase === 'grid') {
            // Espera las luces sin acelerar (si no, salida en falso).
            session.step(STEP, { throttle: 0, brake: 0, steer: 0 }, false);
            continue;
          }
          me.drive(session.vehicle, STEP, session.cars.map((c) => c.vehicle), input);
          session.step(STEP, input, true);
          if (me.needsReset) {
            session.resetToTrack();
            me.recovered();
          }
          session.cars.forEach((car, i) => {
            if (Math.abs(car.vehicle.projection.d) > track.geometry.halfWidth + 1.5) offTime[i] = (offTime[i] ?? 0) + STEP;
          });
          if (session.order?.runners.every((r) => r.finished)) break;
        }
        const recoveries = recovered.mock.calls.length - before;
        total += recoveries;
        expect(session.standings().every((row) => row.finished), def.id).toBe(true);
        expect(recoveries, def.id).toBeLessThanOrEqual(4);
        // El tope de 4 s afuera vuelve a cualquiera a la pista (cuenta el tiempo de todas sus salidas).
        expect(Math.max(...offTime), def.id).toBeLessThan(12);
      }
    } finally {
      recovered.mockRestore();
    }
    // En las 24 carreras (288 autos), sólo unos pocos rescates.
    expect(total).toBeLessThan(25);
  }, 180_000);

  it('un bot de Leyenda solo aprende la pista: en la tercera vuelta ya no se sale', () => {
    for (const id of ['monaco', 'suzuka', 'singapore', 'madrid']) {
      const track = Track.load(getTrack(id));
      const random = seeded(3);
      const session = new Session(track, F1_SPEC, null, { mode: 'practice', laps: null }, ASSISTS, random);
      const me = new BotDriver(track, performanceModel(F1_SPEC), { ...botParams(LEGEND, { skill: 0.9, aggression: 0.5 }), mistakesPerLap: 0 }, random);
      me.reset(null);
      const input = { throttle: 0, brake: 0, steer: 0, drs: false };
      const exits = [0, 0, 0];
      let travelled = 0;
      let lastS = session.vehicle.projection.s;
      let wasOff = false;
      for (let t = 0; t < 420; t += STEP) {
        me.drive(session.vehicle, STEP, [session.vehicle], input);
        session.step(STEP, input, true);
        if (me.needsReset) {
          session.resetToTrack();
          me.recovered();
        }
        const p = session.vehicle.projection;
        travelled += track.geometry.deltaS(lastS, p.s);
        lastS = p.s;
        const lap = Math.floor(travelled / track.geometry.length);
        if (lap >= 3) break;
        const off = Math.abs(p.d) > track.geometry.halfWidth + 1.5;
        if (off && !wasOff) exits[lap] = (exits[lap] ?? 0) + 1;
        wasOff = off;
      }
      expect(travelled, id).toBeGreaterThan(track.geometry.length * 3 - 1);
      expect(exits[2], `${id} vuelta 3 (${exits.join('/')})`).toBe(0);
    }
  }, 120_000);
});
