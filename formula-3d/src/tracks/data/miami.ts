/**
 * Miami (Estados Unidos). Semiurbano alrededor del estadio: curvas rápidas al
 * principio, una chicana lenta y estrecha bajo el puente y tres rectas largas
 * con DRS.
 *
 * Trazado real (ver `real/miami.ts`), escalado a 5.412 km. Las posiciones
 * están en metros desde 350 m antes de la meta; DRS, boxes y tribunas se
 * ubicaron a partir de las rectas y curvas del trazado.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { MIAMI_POINTS } from './real/miami';

export const MIAMI: TrackDefinition = {
  id: 'miami',
  name: 'Miami',
  short: 'Miami',
  grandPrix: 'Gran Premio de Miami',
  city: 'Miami Gardens',
  country: 'Estados Unidos',
  countryCode: 'US',
  lengthKm: 5.412,
  turns: 19,
  lapRecord: { seconds: 89.708, driver: 'N. Kovač', year: 2023 },
  width: 16,
  layout: { kind: 'points', points: MIAMI_POINTS },
  startLine: 350,
  sectors: [2140, 3930],
  pits: { side: 'right', from: 151, to: 497 },
  drsZones: [
    { detection: 5296, start: 196, end: 412 },
    { detection: 3556, start: 3826, end: 4888 },
  ],
  scenery: {
    street: 'walls',
    grandstands: [
      { at: 350, side: 'left', length: 200, rows: 16 },
      { at: 1812, side: 'right', length: 100, rows: 11 },
      { at: 3288, side: 'right', length: 100, rows: 11 },
      { at: 3720, side: 'right', length: 100, rows: 11 },
      { at: 5034, side: 'right', length: 100, rows: 11 },
    ],
    treeDensity: 14,
    skyline: { bearing: 150, distance: 2600, buildings: 80 },
  },
  environment: {
    sunAzimuth: 230,
    sunElevation: 48,
    turbidity: 3.4,
    fogDensity: 0.0002,
  },
};
