/**
 * Hungaroring (Hungría). "Mónaco sin muros": curvas lentas y medias
 * encadenadas, casi sin rectas, muy difícil para adelantar. Exige ritmo y
 * precisión vuelta tras vuelta.
 *
 * Trazado real (ver `real/budapest.ts`), escalado a 4.381 km. Las posiciones
 * están en metros desde 350 m antes de la meta; DRS, boxes y tribunas se
 * ubicaron a partir de las rectas y curvas del trazado.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { BUDAPEST_POINTS } from './real/budapest';

export const BUDAPEST: TrackDefinition = {
  id: 'budapest',
  name: 'Hungaroring',
  short: 'Budapest',
  grandPrix: 'Gran Premio de Hungría',
  city: 'Mogyoród',
  country: 'Hungría',
  countryCode: 'HU',
  lengthKm: 4.381,
  turns: 14,
  lapRecord: { seconds: 76.627, driver: 'S. Quispe', year: 2020 },
  width: 17,
  layout: { kind: 'points', points: BUDAPEST_POINTS },
  startLine: 350,
  sectors: [1795, 3240],
  pits: { side: 'left', from: 20, to: 608 },
  drsZones: [
    { detection: 4012, start: 4282, end: 523 },
  ],
  scenery: {
    grandstands: [
      { at: 350, side: 'right', length: 200, rows: 16 },
      { at: 1212, side: 'right', length: 100, rows: 11 },
      { at: 1848, side: 'right', length: 100, rows: 11 },
      { at: 2412, side: 'left', length: 100, rows: 11 },
      { at: 3546, side: 'left', length: 100, rows: 11 },
    ],
    treeDensity: 30,
    skyline: { bearing: 230, distance: 5500, buildings: 20 },
  },
  environment: {
    sunAzimuth: 220,
    sunElevation: 48,
    turbidity: 3.0,
    fogDensity: 0.00018,
  },
};
