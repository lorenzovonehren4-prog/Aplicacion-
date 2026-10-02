/**
 * Bakú (Azerbaiyán). Calles de la ciudad vieja: ángulos rectos lentos, el
 * paso angostísimo junto al castillo y una recta de más de 2 km a fondo junto
 * al mar.
 *
 * Trazado real (ver `real/baku.ts`), escalado a 6.003 km. Las posiciones
 * están en metros desde 350 m antes de la meta; DRS, boxes y tribunas se
 * ubicaron a partir de las rectas y curvas del trazado.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { BAKU_POINTS } from './real/baku';

export const BAKU: TrackDefinition = {
  id: 'baku',
  name: 'Bakú',
  short: 'Bakú',
  grandPrix: 'Gran Premio de Azerbaiyán',
  city: 'Bakú',
  country: 'Azerbaiyán',
  countryCode: 'AZ',
  lengthKm: 6.003,
  turns: 20,
  lapRecord: { seconds: 103.009, driver: 'J. Moreau', year: 2019 },
  width: 15,
  layout: { kind: 'points', points: BAKU_POINTS },
  startLine: 350,
  sectors: [2316, 4281],
  pits: { side: 'right', from: 20, to: 432 },
  drsZones: [
    { detection: 4636, start: 4906, end: 347 },
    { detection: 664, start: 934, end: 1540 },
  ],
  scenery: {
    street: 'city',
    buildingHeight: [10, 30],
    grandstands: [
      { at: 350, side: 'left', length: 200, rows: 16 },
      { at: 828, side: 'right', length: 100, rows: 11 },
      { at: 1686, side: 'right', length: 100, rows: 11 },
      { at: 2238, side: 'right', length: 100, rows: 11 },
      { at: 3030, side: 'right', length: 100, rows: 11 },
    ],
    treeDensity: 4,
    skyline: { bearing: 160, distance: 1200, buildings: 120 },
  },
  environment: {
    sunAzimuth: 250,
    sunElevation: 30,
    turbidity: 3.6,
    fogDensity: 0.0002,
  },
};
