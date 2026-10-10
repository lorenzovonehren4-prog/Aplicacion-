/**
 * Zandvoort (Países Bajos). Entre médanos junto al mar: subidas y bajadas,
 * curvas peraltadas (Hugenholtz y la Arie Luyendyk) y muy poco lugar para
 * adelantar.
 *
 * Trazado real (ver `real/zandvoort.ts`), escalado a 4.259 km. Las posiciones
 * están en metros desde 350 m antes de la meta; DRS, boxes y tribunas se
 * ubicaron a partir de las rectas y curvas del trazado.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { ZANDVOORT_POINTS } from './real/zandvoort';

export const ZANDVOORT: TrackDefinition = {
  id: 'zandvoort',
  name: 'Zandvoort',
  short: 'Zandvoort',
  grandPrix: 'Gran Premio de los Países Bajos',
  city: 'Zandvoort',
  country: 'Países Bajos',
  countryCode: 'NL',
  lengthKm: 4.259,
  turns: 14,
  lapRecord: { seconds: 71.097, driver: 'M. Arriaga', year: 2023 },
  width: 16,
  layout: { kind: 'points', points: ZANDVOORT_POINTS },
  startLine: 350,
  sectors: [1755, 3159],
  pits: { side: 'left', from: 67, to: 659 },
  drsZones: [
    { detection: 4056, start: 112, end: 574 },
  ],
  scenery: {
    grandstands: [
      { at: 350, side: 'right', length: 200, rows: 16 },
      { at: 750, side: 'left', length: 100, rows: 11 },
      { at: 2622, side: 'left', length: 100, rows: 11 },
      { at: 3456, side: 'left', length: 100, rows: 11 },
      { at: 3876, side: 'left', length: 100, rows: 11 },
    ],
    treeDensity: 10,
    skyline: { bearing: 20, distance: 2200, buildings: 40 },
  },
  environment: {
    sunAzimuth: 215,
    sunElevation: 40,
    turbidity: 3.2,
    fogDensity: 0.0002,
  },
};
