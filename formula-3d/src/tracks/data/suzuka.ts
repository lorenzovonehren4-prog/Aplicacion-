/**
 * Suzuka (Japón). El único "ocho" del calendario: las eses rápidas del primer
 * sector, la Degner, la horquilla, la Spoon, la recta que cruza por arriba
 * del primer tramo (el cruce), la 130R casi a fondo y la chicana final. Muy
 * técnico: un error se arrastra varias curvas.
 *
 * Trazado real (ver `real/suzuka.ts`), escalado a 5.807 km. Las posiciones
 * están en metros desde 350 m antes de la meta; DRS, boxes y tribunas se
 * ubicaron a partir de las rectas y curvas del trazado.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { SUZUKA_POINTS } from './real/suzuka';

export const SUZUKA: TrackDefinition = {
  id: 'suzuka',
  name: 'Suzuka',
  short: 'Suzuka',
  grandPrix: 'Gran Premio de Japón',
  city: 'Suzuka',
  country: 'Japón',
  countryCode: 'JP',
  lengthKm: 5.807,
  turns: 18,
  lapRecord: { seconds: 90.983, driver: 'A. Tanabe', year: 2025 },
  width: 17,
  layout: { kind: 'points', points: SUZUKA_POINTS },
  startLine: 350,
  sectors: [2273, 4197],
  pits: { side: 'right', from: 31, to: 680 },
  drsZones: [
    { detection: 5576, start: 76, end: 616 },
    { detection: 4270, start: 4540, end: 4882 },
  ],
  scenery: {
    grandstands: [
      { at: 350, side: 'left', length: 200, rows: 16 },
      { at: 900, side: 'left', length: 100, rows: 11 },
      { at: 2532, side: 'left', length: 100, rows: 11 },
      { at: 2988, side: 'right', length: 100, rows: 11 },
      { at: 5454, side: 'left', length: 100, rows: 11 },
    ],
    treeDensity: 55,
    skyline: { bearing: 160, distance: 4200, buildings: 30 },
  },
  environment: {
    sunAzimuth: 210,
    sunElevation: 36,
    turbidity: 3.0,
    fogDensity: 0.0002,
  },
};
