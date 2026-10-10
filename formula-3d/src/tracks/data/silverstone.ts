/**
 * Silverstone (Reino Unido). Una vieja base aérea: las curvas rápidas de
 * Copse y la secuencia Maggotts-Becketts-Chapel, el Hangar Straight y Stowe.
 * Premia el valor en lo rápido.
 *
 * Trazado real (ver `real/silverstone.ts`), escalado a 5.891 km. Las posiciones
 * están en metros desde 350 m antes de la meta; DRS, boxes y tribunas se
 * ubicaron a partir de las rectas y curvas del trazado.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { SILVERSTONE_POINTS } from './real/silverstone';

export const SILVERSTONE: TrackDefinition = {
  id: 'silverstone',
  name: 'Silverstone',
  short: 'Silverstone',
  grandPrix: 'Gran Premio de Gran Bretaña',
  city: 'Silverstone',
  country: 'Reino Unido',
  countryCode: 'GB',
  lengthKm: 5.891,
  turns: 18,
  lapRecord: { seconds: 87.097, driver: 'M. Whitfield', year: 2020 },
  width: 17,
  layout: { kind: 'points', points: SILVERSTONE_POINTS },
  startLine: 350,
  sectors: [2294, 4239],
  pits: { side: 'right', from: 139, to: 473 },
  drsZones: [
    { detection: 5747, start: 184, end: 388 },
    { detection: 1498, start: 1768, end: 2320 },
    { detection: 4420, start: 4690, end: 5104 },
  ],
  scenery: {
    grandstands: [
      { at: 350, side: 'left', length: 200, rows: 16 },
      { at: 1518, side: 'left', length: 100, rows: 11 },
      { at: 2988, side: 'right', length: 100, rows: 11 },
      { at: 4380, side: 'right', length: 100, rows: 11 },
      { at: 5334, side: 'right', length: 100, rows: 11 },
    ],
    treeDensity: 20,
    skyline: { bearing: 40, distance: 5000, buildings: 25 },
  },
  environment: {
    sunAzimuth: 205,
    sunElevation: 36,
    turbidity: 3.6,
    fogDensity: 0.00022,
  },
};
