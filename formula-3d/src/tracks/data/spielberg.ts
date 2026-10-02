/**
 * Spielberg (Austria). Corto y en la montaña: tres rectas con frenadas
 * fuertes (curvas 1, 3 y 4) y un sector final de curvas rápidas a derecha.
 * Pocas curvas y vueltas cortísimas.
 *
 * Trazado real (ver `real/spielberg.ts`), escalado a 4.318 km. Las posiciones
 * están en metros desde 350 m antes de la meta; DRS, boxes y tribunas se
 * ubicaron a partir de las rectas y curvas del trazado.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { SPIELBERG_POINTS } from './real/spielberg';

export const SPIELBERG: TrackDefinition = {
  id: 'spielberg',
  name: 'Spielberg',
  short: 'Spielberg',
  grandPrix: 'Gran Premio de Austria',
  city: 'Spielberg',
  country: 'Austria',
  countryCode: 'AT',
  lengthKm: 4.318,
  turns: 10,
  lapRecord: { seconds: 65.619, driver: 'I. Rocha', year: 2020 },
  width: 17,
  layout: { kind: 'points', points: SPIELBERG_POINTS },
  startLine: 350,
  sectors: [1776, 3202],
  pits: { side: 'right', from: 20, to: 605 },
  drsZones: [
    { detection: 4018, start: 10, end: 520 },
    { detection: 1426, start: 1696, end: 2236 },
    { detection: 520, start: 790, end: 1138 },
  ],
  scenery: {
    grandstands: [
      { at: 350, side: 'left', length: 200, rows: 16 },
      { at: 1584, side: 'left', length: 100, rows: 11 },
      { at: 2388, side: 'left', length: 100, rows: 11 },
      { at: 2910, side: 'right', length: 100, rows: 11 },
      { at: 4164, side: 'left', length: 100, rows: 11 },
    ],
    treeDensity: 35,
    skyline: { bearing: 250, distance: 5200, buildings: 15 },
  },
  environment: {
    sunAzimuth: 230,
    sunElevation: 42,
    turbidity: 2.6,
    fogDensity: 0.00016,
  },
};
