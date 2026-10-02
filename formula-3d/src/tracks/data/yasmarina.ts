/**
 * Yas Marina (Emiratos Árabes Unidos). Cierre de temporada al atardecer: dos
 * rectas largas con frenadas fuertes y un último sector lento junto al puerto
 * y bajo el hotel.
 *
 * Trazado real (ver `real/yasmarina.ts`), escalado a 5.281 km. Las posiciones
 * están en metros desde 350 m antes de la meta; DRS, boxes y tribunas se
 * ubicaron a partir de las rectas y curvas del trazado.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { YAS_MARINA_POINTS } from './real/yasmarina';

export const YAS_MARINA: TrackDefinition = {
  id: 'yasmarina',
  name: 'Yas Marina',
  short: 'Yas Marina',
  grandPrix: 'Gran Premio de Abu Dabi',
  city: 'Abu Dabi',
  country: 'Emiratos Árabes Unidos',
  countryCode: 'AE',
  lengthKm: 5.281,
  turns: 16,
  lapRecord: { seconds: 86.103, driver: 'C. Benedetti', year: 2021 },
  width: 16,
  layout: { kind: 'points', points: YAS_MARINA_POINTS },
  startLine: 350,
  sectors: [2099, 3847],
  pits: { side: 'right', from: 97, to: 515 },
  drsZones: [
    { detection: 5118, start: 142, end: 430 },
    { detection: 1600, start: 1870, end: 2686 },
    { detection: 2968, start: 3238, end: 3676 },
  ],
  scenery: {
    street: 'walls',
    ground: 'sand',
    grandstands: [
      { at: 350, side: 'left', length: 200, rows: 16 },
      { at: 1644, side: 'right', length: 100, rows: 11 },
      { at: 2832, side: 'right', length: 100, rows: 11 },
      { at: 4530, side: 'left', length: 100, rows: 11 },
      { at: 5058, side: 'left', length: 100, rows: 11 },
    ],
    treeDensity: 4,
    skyline: { bearing: 100, distance: 1600, buildings: 70 },
  },
  environment: {
    sunAzimuth: 255,
    sunElevation: 11,
    turbidity: 4.8,
    fogDensity: 0.0002,
  },
};
