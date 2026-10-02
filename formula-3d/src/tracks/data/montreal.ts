/**
 * Montreal (Canadá). En una isla del río San Lorenzo: chicanas rápidas y
 * pianos altos, la horquilla y la recta larga que termina en la chicana
 * final, junto al famoso "muro de los campeones".
 *
 * Trazado real (ver `real/montreal.ts`), escalado a 4.361 km. Las posiciones
 * están en metros desde 350 m antes de la meta; DRS, boxes y tribunas se
 * ubicaron a partir de las rectas y curvas del trazado.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { MONTREAL_POINTS } from './real/montreal';

export const MONTREAL: TrackDefinition = {
  id: 'montreal',
  name: 'Gilles Villeneuve',
  short: 'Montreal',
  grandPrix: 'Gran Premio de Canadá',
  city: 'Montreal',
  country: 'Canadá',
  countryCode: 'CA',
  lengthKm: 4.361,
  turns: 14,
  lapRecord: { seconds: 73.078, driver: 'C. Benedetti', year: 2019 },
  width: 16,
  layout: { kind: 'points', points: MONTREAL_POINTS },
  startLine: 350,
  sectors: [1788, 3226],
  pits: { side: 'right', from: 163, to: 539 },
  drsZones: [
    { detection: 4253, start: 208, end: 454 },
    { detection: 3502, start: 3772, end: 4246 },
  ],
  scenery: {
    street: 'walls',
    grandstands: [
      { at: 350, side: 'left', length: 200, rows: 16 },
      { at: 840, side: 'left', length: 100, rows: 11 },
      { at: 1758, side: 'right', length: 100, rows: 11 },
      { at: 2502, side: 'left', length: 100, rows: 11 },
      { at: 3186, side: 'left', length: 100, rows: 11 },
    ],
    treeDensity: 45,
    skyline: { bearing: 330, distance: 2600, buildings: 90 },
  },
  environment: {
    sunAzimuth: 215,
    sunElevation: 42,
    turbidity: 3.0,
    fogDensity: 0.00018,
  },
};
