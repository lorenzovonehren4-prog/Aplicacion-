/**
 * Madring (España). Circuito nuevo, mitad urbano, alrededor del recinto
 * ferial de IFEMA: muchas curvas, una curva peraltada larga y tramos rápidos
 * entre muros.
 *
 * Trazado real (ver `real/madrid.ts`), escalado a 5.474 km. Las posiciones
 * están en metros desde 350 m antes de la meta; DRS, boxes y tribunas se
 * ubicaron a partir de las rectas y curvas del trazado.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { MADRID_POINTS } from './real/madrid';

export const MADRID: TrackDefinition = {
  id: 'madrid',
  name: 'Madring',
  short: 'Madrid',
  grandPrix: 'Gran Premio de España',
  city: 'Madrid',
  country: 'España',
  countryCode: 'ES',
  lengthKm: 5.474,
  turns: 22,
  lapRecord: { seconds: 88.9, driver: 'O. Hartley', year: 2026 },
  width: 16,
  layout: { kind: 'points', points: MADRID_POINTS },
  startLine: 350,
  sectors: [2136, 3923],
  pits: { side: 'right', from: 20, to: 442 },
  drsZones: [
    { detection: 5080, start: 5350, end: 357 },
  ],
  scenery: {
    street: 'walls',
    grandstands: [
      { at: 350, side: 'left', length: 200, rows: 16 },
      { at: 1572, side: 'right', length: 100, rows: 11 },
      { at: 1944, side: 'left', length: 100, rows: 11 },
      { at: 4002, side: 'left', length: 100, rows: 11 },
      { at: 4782, side: 'right', length: 100, rows: 11 },
    ],
    treeDensity: 12,
    skyline: { bearing: 220, distance: 2200, buildings: 90 },
  },
  environment: {
    sunAzimuth: 230,
    sunElevation: 46,
    turbidity: 3.0,
    fogDensity: 0.0002,
  },
};
