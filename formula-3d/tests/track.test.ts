import { describe, expect, it } from 'vitest';
import { F1_SPEC, performanceModel } from '../src/race/physics/CarSpec';
import { AUSTRALIA } from '../src/tracks/data/australia';
import { MONZA } from '../src/tracks/data/monza';
import { traceLayout } from '../src/tracks/layout';
import { getTrack, TRACKS } from '../src/tracks/registry';
import { cornerSpeed } from '../src/tracks/TrackAnalysis';
import { Track } from '../src/tracks/Track';
import { numberedCorners } from '../src/tracks/insight';

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
    expect(getTrack('monza').name).toBe('Monza');
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
      // Del lado de adentro de una curva cerrada del trazado real el error sube un poco.
      expect(Math.abs(g.deltaS(s, out.s))).toBeLessThan(0.25);
      expect(Math.abs(out.d - d)).toBeLessThan(0.1);
    }
  });

  it('la búsqueda completa da siempre el tramo más cercano (nada de árboles sobre la pista)', () => {
    for (const def of TRACKS) {
      const tg = Track.load(def).geometry;
      const out = { index: 0, s: 0, d: 0 };
      const p = { x: 0, z: 0 };
      for (let k = 0; k < 300; k++) {
        // Puntos a 0–60 m de la pista, repartidos por toda la vuelta.
        tg.pointAt((k * 173.7) % tg.length, ((k * 29) % 121) - 60, p);
        tg.project(p.x, p.z, out);
        let nearest = Infinity;
        for (let i = 0; i < tg.count; i++) nearest = Math.min(nearest, Math.hypot((tg.x[i] ?? 0) - p.x, (tg.z[i] ?? 0) - p.z));
        expect(Math.abs(out.d), `${def.id}: punto ${k}`).toBeLessThan(nearest + 1);
      }
    }
  }, 60000);

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
    // Las 14 oficiales más los quiebres rápidos que el trazado real también tiene.
    expect(corners.length).toBeGreaterThanOrEqual(14);
    expect(corners.length).toBeLessThanOrEqual(26);
    // Numeradas desde la línea de meta.
    expect(corners[0]?.number).toBe(1);
    const firstApex = g.wrapS((corners[0]?.apex ?? 0) - track.startS);
    for (const corner of corners.slice(1)) expect(g.wrapS(corner.apex - track.startS)).toBeGreaterThan(firstApex);
  });

  it('velocidades y frenadas coherentes', () => {
    const slowest = Math.min(...corners.map((c) => c.safeSpeed));
    // Por el centro (la referencia prudente): la trazada ideal es bastante más rápida.
    expect(slowest * 3.6).toBeGreaterThan(55);
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
      // Recta (radio de más de 300 m: la recta real tiene leves curvas).
      expect(Math.abs(g.curvatureAt(slot.s))).toBeLessThan(3.3e-3);
      expect(Math.abs(slot.d)).toBeLessThan(g.halfWidth - 1);
    }
  });
});

describe('Monza', () => {
  const monza = Track.load(MONZA);
  const mg = monza.geometry;

  it('mide la longitud oficial y tiene sus 11 curvas (más algún quiebre rápido)', () => {
    expect(mg.length).toBeGreaterThan(5785);
    expect(mg.length).toBeLessThan(5800);
    expect(monza.analysis.corners.length).toBeGreaterThanOrEqual(11);
    expect(monza.analysis.corners.length).toBeLessThanOrEqual(16);
  });

  it('templo de la velocidad: chicanas lentas, Curva Grande a fondo y más de 320 km/h', () => {
    const corners = monza.analysis.corners;
    // La chicana del Rettifilo (curvas 1 y 2) es lo más lento.
    const slowest = corners.reduce((a, b) => (b.safeSpeed < a.safeSpeed ? b : a));
    expect(slowest.number).toBeLessThanOrEqual(2);
    expect(slowest.safeSpeed * 3.6).toBeLessThan(80);
    // La Curva Grande (la 3) se hace sin frenar.
    expect(corners[2]?.brakingPoint).toBeNull();
    let top = 0;
    for (let k = 0; k < monza.racingLine.count; k++) top = Math.max(top, monza.racingLine.speed[k] ?? 0);
    expect(top * 3.6).toBeGreaterThan(320);
    // Más rápida que Albert Park por vuelta media, aunque más larga.
    expect(mg.length / monza.racingLine.lapTime).toBeGreaterThan(track.geometry.length / track.racingLine.lapTime);
  });

  it('dos zonas de DRS, sectores en orden y parrilla en la recta', () => {
    expect(monza.drsZones).toHaveLength(2);
    const [s1, s2] = monza.sectorEnds;
    expect(mg.wrapS(s1 - monza.startS)).toBeLessThan(mg.wrapS(s2 - monza.startS));
    for (let p = 0; p < 20; p++) {
      const slot = monza.gridSlot(p);
      expect(mg.deltaS(slot.s, monza.startS)).toBeGreaterThan(0);
      expect(Math.abs(mg.curvatureAt(slot.s))).toBeLessThan(3.3e-3);
    }
    for (let i = 0; i < mg.count; i++) {
      expect(monza.trackside.wallLeft[i]).toBeGreaterThan(mg.halfWidth + 2);
      expect(monza.trackside.wallRight[i]).toBeGreaterThan(mg.halfWidth + 2);
    }
  });
});

describe('curvas numeradas del mapa', () => {
  it('son las más cerradas, tantas como las oficiales y en el orden de la vuelta', () => {
    for (const def of [AUSTRALIA, MONZA]) {
      const all = Track.load(def).analysis.corners;
      const corners = numberedCorners(all, def.turns);
      expect(corners.length, def.id).toBe(def.turns);
      // En orden y ninguna de las que quedan afuera es más cerrada que las elegidas.
      for (let i = 1; i < corners.length; i++) expect(corners[i]!.number).toBeGreaterThan(corners[i - 1]!.number);
      const widest = Math.max(...corners.map((c) => c.radius));
      for (const corner of all) if (!corners.includes(corner)) expect(corner.radius).toBeGreaterThanOrEqual(widest);
    }
  });
});
