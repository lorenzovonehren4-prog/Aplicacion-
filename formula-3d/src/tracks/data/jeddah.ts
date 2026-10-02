/**
 * Yeda (Arabia Saudita). El circuito urbano más rápido: una sucesión de
 * curvas rápidas ciegas entre muros a lo largo de la costa, con promedio de
 * más de 250 km/h y la horquilla del final.
 *
 * Trazado real (ver `real/jeddah.ts`), escalado a 6.174 km. Las posiciones
 * están en metros desde 350 m antes de la meta; DRS, boxes y tribunas se
 * ubicaron a partir de las rectas y curvas del trazado.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { JEDDAH_POINTS } from './real/jeddah';

export const JEDDAH: TrackDefinition = {
  id: 'jeddah',
  name: 'Corniche de Yeda',
  short: 'Yeda',
  grandPrix: 'Gran Premio de Arabia Saudita',
  city: 'Yeda',
  country: 'Arabia Saudita',
  countryCode: 'SA',
  lengthKm: 6.174,
  turns: 27,
  lapRecord: { seconds: 90.734, driver: 'R. Monteiro', year: 2024 },
  width: 15,
  layout: { kind: 'points', points: JEDDAH_POINTS },
  startLine: 350,
  sectors: [2396, 4442],
  pits: { side: 'right', from: 20, to: 680 },
  drsZones: [
    { detection: 5674, start: 5944, end: 622 },
  ],
  scenery: {
    street: 'walls',
    ground: 'sand',
    grandstands: [
      { at: 350, side: 'left', length: 200, rows: 16 },
      { at: 756, side: 'right', length: 100, rows: 11 },
      { at: 1266, side: 'right', length: 100, rows: 11 },
      { at: 3336, side: 'left', length: 100, rows: 11 },
      { at: 5826, side: 'right', length: 100, rows: 11 },
    ],
    treeDensity: 6,
    skyline: { bearing: 70, distance: 1600, buildings: 90 },
  },
  environment: {
    sunAzimuth: 265,
    sunElevation: 10,
    turbidity: 5.0,
    fogDensity: 0.0002,
  },
};
