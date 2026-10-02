/**
 * Interlagos (Brasil). Antihorario y con muchas subidas y bajadas: la S do
 * Senna en bajada, la recta opuesta, el sector del medio sinuoso y la larga
 * subida a fondo hasta la meta.
 *
 * Trazado real (ver `real/interlagos.ts`), escalado a 4.309 km. Las posiciones
 * están en metros desde 350 m antes de la meta; DRS, boxes y tribunas se
 * ubicaron a partir de las rectas y curvas del trazado.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { INTERLAGOS_POINTS } from './real/interlagos';

export const INTERLAGOS: TrackDefinition = {
  id: 'interlagos',
  name: 'Interlagos',
  short: 'São Paulo',
  grandPrix: 'Gran Premio de São Paulo',
  city: 'São Paulo',
  country: 'Brasil',
  countryCode: 'BR',
  lengthKm: 4.309,
  turns: 15,
  lapRecord: { seconds: 70.54, driver: 'E. Solvang', year: 2018 },
  width: 17,
  layout: { kind: 'points', points: INTERLAGOS_POINTS },
  startLine: 350,
  sectors: [1769, 3189],
  pits: { side: 'right', from: 97, to: 545 },
  drsZones: [
    { detection: 4130, start: 142, end: 460 },
    { detection: 856, start: 1126, end: 1540 },
  ],
  scenery: {
    grandstands: [
      { at: 350, side: 'left', length: 200, rows: 16 },
      { at: 738, side: 'left', length: 100, rows: 11 },
      { at: 1692, side: 'right', length: 100, rows: 11 },
      { at: 2712, side: 'right', length: 100, rows: 11 },
      { at: 3510, side: 'right', length: 100, rows: 11 },
    ],
    treeDensity: 30,
    skyline: { bearing: 20, distance: 1800, buildings: 130 },
  },
  environment: {
    sunAzimuth: 215,
    sunElevation: 46,
    turbidity: 3.6,
    fogDensity: 0.0002,
  },
};
