/**
 * Las Vegas (Estados Unidos). De noche por las calles de la ciudad: rectas
 * larguísimas (el Strip), frenadas a ángulo recto y una chicana lenta.
 * Altísimas velocidades entre muros.
 *
 * Trazado real (ver `real/lasvegas.ts`), escalado a 6.201 km. Las posiciones
 * están en metros desde 350 m antes de la meta; DRS, boxes y tribunas se
 * ubicaron a partir de las rectas y curvas del trazado.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { LAS_VEGAS_POINTS } from './real/lasvegas';

export const LAS_VEGAS: TrackDefinition = {
  id: 'lasvegas',
  name: 'Las Vegas',
  short: 'Las Vegas',
  grandPrix: 'Gran Premio de Las Vegas',
  city: 'Las Vegas',
  country: 'Estados Unidos',
  countryCode: 'US',
  lengthKm: 6.201,
  turns: 17,
  lapRecord: { seconds: 94.876, driver: 'R. Monteiro', year: 2024 },
  width: 15,
  layout: { kind: 'points', points: LAS_VEGAS_POINTS },
  startLine: 350,
  sectors: [2407, 4464],
  pits: { side: 'right', from: 133, to: 377 },
  drsZones: [
    { detection: 3682, start: 3952, end: 5176 },
    { detection: 688, start: 958, end: 1582 },
    { detection: 5284, start: 5554, end: 5962 },
  ],
  scenery: {
    street: 'city',
    buildingHeight: [18, 110],
    ground: 'sand',
    grandstands: [
      { at: 350, side: 'left', length: 200, rows: 16 },
      { at: 1728, side: 'left', length: 100, rows: 11 },
      { at: 2196, side: 'right', length: 100, rows: 11 },
      { at: 3372, side: 'right', length: 100, rows: 11 },
      { at: 5316, side: 'right', length: 100, rows: 11 },
    ],
    treeDensity: 3,
    skyline: { bearing: 0, distance: 1400, buildings: 140 },
  },
  environment: {
    sunAzimuth: 250,
    sunElevation: 8,
    turbidity: 4.6,
    fogDensity: 0.0002,
  },
};
