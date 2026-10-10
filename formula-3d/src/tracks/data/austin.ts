/**
 * Austin (Estados Unidos). Subida empinada a la curva 1, unas eses rápidas
 * copiadas de Silverstone, una recta larga y un estadio de curvas lentas al
 * final.
 *
 * Trazado real (ver `real/austin.ts`), escalado a 5.513 km. Las posiciones
 * están en metros desde 350 m antes de la meta; DRS, boxes y tribunas se
 * ubicaron a partir de las rectas y curvas del trazado.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { AUSTIN_POINTS } from './real/austin';

export const AUSTIN: TrackDefinition = {
  id: 'austin',
  name: 'Circuito de las Américas',
  short: 'Austin',
  grandPrix: 'Gran Premio de los Estados Unidos',
  city: 'Austin',
  country: 'Estados Unidos',
  countryCode: 'US',
  lengthKm: 5.513,
  turns: 20,
  lapRecord: { seconds: 96.169, driver: 'L. Brenner', year: 2019 },
  width: 17,
  layout: { kind: 'points', points: AUSTIN_POINTS },
  startLine: 350,
  sectors: [2171, 3992],
  pits: { side: 'right', from: 20, to: 572 },
  drsZones: [
    { detection: 5134, start: 5404, end: 487 },
    { detection: 2398, start: 2668, end: 3598 },
  ],
  scenery: {
    grandstands: [
      { at: 350, side: 'left', length: 200, rows: 16 },
      { at: 2550, side: 'right', length: 100, rows: 11 },
      { at: 3744, side: 'right', length: 100, rows: 11 },
      { at: 4242, side: 'right', length: 100, rows: 11 },
      { at: 5292, side: 'right', length: 100, rows: 11 },
    ],
    treeDensity: 14,
    skyline: { bearing: 310, distance: 7000, buildings: 40 },
  },
  environment: {
    sunAzimuth: 240,
    sunElevation: 44,
    turbidity: 3.2,
    fogDensity: 0.0002,
  },
};
