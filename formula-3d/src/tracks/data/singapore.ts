/**
 * Marina Bay (Singapur). Carrera nocturna entre rascacielos: muchísimas
 * curvas en ángulo recto, calor, humedad y muros por todos lados. Una de las
 * más exigentes del año.
 *
 * Trazado real (ver `real/singapore.ts`), escalado a 4.940 km. Las posiciones
 * están en metros desde 350 m antes de la meta; DRS, boxes y tribunas se
 * ubicaron a partir de las rectas y curvas del trazado.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { SINGAPORE_POINTS } from './real/singapore';

export const SINGAPORE: TrackDefinition = {
  id: 'singapore',
  name: 'Marina Bay',
  short: 'Singapur',
  grandPrix: 'Gran Premio de Singapur',
  city: 'Singapur',
  country: 'Singapur',
  countryCode: 'SG',
  lengthKm: 4.94,
  turns: 19,
  lapRecord: { seconds: 94.486, driver: 'D. Volkov', year: 2023 },
  width: 15,
  layout: { kind: 'points', points: SINGAPORE_POINTS },
  startLine: 350,
  sectors: [1978, 3605],
  pits: { side: 'right', from: 73, to: 497 },
  drsZones: [
    { detection: 4731, start: 118, end: 412 },
  ],
  scenery: {
    street: 'city',
    buildingHeight: [24, 95],
    grandstands: [
      { at: 350, side: 'left', length: 200, rows: 16 },
      { at: 1008, side: 'right', length: 100, rows: 11 },
      { at: 2550, side: 'right', length: 100, rows: 11 },
      { at: 3522, side: 'left', length: 100, rows: 11 },
      { at: 4746, side: 'left', length: 100, rows: 11 },
    ],
    treeDensity: 10,
    skyline: { bearing: 90, distance: 1100, buildings: 140 },
  },
  environment: {
    sunAzimuth: 260,
    sunElevation: 10,
    turbidity: 4.4,
    fogDensity: 0.00022,
  },
};
