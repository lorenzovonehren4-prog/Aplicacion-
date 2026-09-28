import { describe, expect, it } from 'vitest';
import { F1_SPEC, performanceModel } from '../src/race/physics/CarSpec';
import { AUSTRALIA } from '../src/tracks/data/australia';
import { traceLayout } from '../src/tracks/layout';
import { getTrack, TRACKS } from '../src/tracks/registry';
import { cornerSpeed } from '../src/tracks/TrackAnalysis';
import { Track } from '../src/tracks/Track';

const track = Track.load(AUSTRALIA);
const g = track.geometry;

describe('trazado por tramos', () => {
  it('cada circuito cierra y no gira de más', () => {
    for (const def of TRACKS) {
      const traced = traceLayout(def.layout);
      expect(traced.closureError).toBeLessThan(2);
      expect(Math.abs(traced.headingError)).toBeLessThan(0.01);
    }
  });

  it('el registro encuentra los circuitos', () => {
    expect(getTrack('australia').name).toBe('Albert Park');
    expect(() => getTrack('nada')).toThrow();
  });
});

describe('geometría de Albert Park', () => {
  it('mide la longitud oficial', () => {
    expect(g.length).toBeGreaterThan(5270);
    expect(g.length).toBeLessThan(5286);
    expect(g.ds).toBeCloseTo(1, 1);
  });

  it('la spline es cerrada y continua', () => {
    const last = g.count - 1;
    const gap = Math.hypot((g.x[0] ?? 0) - (g.x[last] ?? 0), (g.z[0] ?? 0) - (g.z[last] ?? 0));
    expect(gap).toBeCloseTo(g.ds, 1);
    for (let i = 1; i < g.count; i++) {
      const step = Math.hypot((g.x[i] ?? 0) - (g.x[i - 1] ?? 0), (g.z[i] ?? 0) - (g.z[i - 1] ?? 0));
      expect(step).toBeGreaterThan(g.ds * 0.9);
      expect(step).toBeLessThan(g.ds * 1.1);
    }
  });

  it('proyectar (s, d) → mundo → (s, d) devuelve lo mismo', () => {
    const p = { x: 0, z: 0 };
    const out = { index: 0, s: 0, d: 0 };
    for (let k = 0; k < 200; k++) {
      const s = (k * 97.3) % g.length;
      const d = ((k * 37) % 21) - 10;
      g.pointAt(s, d, p);
      g.project(p.x, p.z, out, k === 0 ? -1 : out.index);
      expect(Math.abs(g.deltaS(s, out.s))).toBeLessThan(0.08);
      expect(out.d).toBeCloseTo(d, 1);
    }
  });

  it('la búsqueda global encuentra el punto aunque no haya pista', () => {
    const p = { x: 0, z: 0 };
    g.pointAt(2500, 3, p);
    const out = g.project(p.x, p.z, { index: 0, s: 0, d: 0 });
    expect(Math.abs(g.deltaS(2500, out.s))).toBeLessThan(0.1);
  });
});

describe('análisis de curvas', () => {
  const corners = track.analysis.corners;

  it('encuentra las curvas del circuito', () => {
    expect(corners.length).toBeGreaterThanOrEqual(13);
    expect(corners.length).toBeLessThanOrEqual(15);
    // Numeradas desde la línea de meta.
    expect(corners[0]?.number).toBe(1);
    const firstApex = g.wrapS((corners[0]?.apex ?? 0) - track.startS);
    for (const corner of corners.slice(1)) expect(g.wrapS(corner.apex - track.startS)).toBeGreaterThan(firstApex);
  });

  it('velocidades y frenadas coherentes', () => {
    const slowest = Math.min(...corners.map((c) => c.safeSpeed));
    expect(slowest * 3.6).toBeGreaterThan(85);
    expect(slowest * 3.6).toBeLessThan(135);
    for (const corner of corners) {
      if (corner.brakingPoint === null) continue;
      const before = g.deltaS(corner.brakingPoint, corner.apex);
      expect(before).toBeGreaterThan(0);
      expect(before).toBeLessThan(420);
      expect(corner.entrySpeed).toBeGreaterThan(corner.safeSpeed);
    }
    // Hay curvas lentas con frenada fuerte y rápidas que se hacen a fondo.
    expect(corners.some((c) => c.brakingPoint === null)).toBe(true);
    expect(corners.filter((c) => c.brakingPoint !== null).length).toBeGreaterThanOrEqual(6);
  });

  it('vuelta teórica en un rango realista', () => {
    // Récord real ~1:20; el perfil ideal es algo más rápido que un piloto.
    expect(track.analysis.lapTime).toBeGreaterThan(68);
    expect(track.analysis.lapTime).toBeLessThan(92);
  });

  it('velocidad de curva con carga aerodinámica', () => {
    const model = performanceModel(F1_SPEC);
    expect(model.topSpeed * 3.6).toBeGreaterThan(320);
    expect(model.topSpeed * 3.6).toBeLessThan(345);
    // Curva de 50 m: ~115 km/h; recta: velocidad máxima.
    expect(cornerSpeed(1 / 50, model) * 3.6).toBeGreaterThan(100);
    expect(cornerSpeed(1 / 50, model) * 3.6).toBeLessThan(130);
    expect(cornerSpeed(0, model)).toBeGreaterThan(model.topSpeed);
  });
});

describe('entorno de pista', () => {
  const t = track.trackside;

  it('muros siempre fuera del asfalto', () => {
    for (let i = 0; i < g.count; i++) {
      expect(t.wallLeft[i]).toBeGreaterThan(g.halfWidth + 2);
      expect(t.wallRight[i]).toBeGreaterThan(g.halfWidth + 2);
    }
  });

  it('superficies según la distancia lateral', () => {
    const kerbIndex = t.kerbRight.findIndex((w) => w > 0);
    expect(kerbIndex).toBeGreaterThanOrEqual(0);
    expect(track.surfaceAt(kerbIndex, 0)).toBe('asphalt');
    expect(track.surfaceAt(kerbIndex, g.halfWidth + 0.5)).toBe('kerb');
    expect(track.surfaceAt(kerbIndex, 500)).toBe('wall');
    const gravel = t.runoffLeft.findIndex((k) => k === 1);
    expect(gravel).toBeGreaterThanOrEqual(0);
  });

  it('parrilla detrás de la línea, en la recta', () => {
    for (let p = 0; p < 20; p++) {
      const slot = track.gridSlot(p);
      const behind = g.deltaS(slot.s, track.startS);
      expect(behind).toBeGreaterThan(0);
      expect(Math.abs(g.curvatureAt(slot.s))).toBeLessThan(1e-3);
      expect(Math.abs(slot.d)).toBeLessThan(g.halfWidth - 1);
    }
  });
});
