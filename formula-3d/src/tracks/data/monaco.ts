/**
 * Mónaco. Las calles del principado: la más lenta y angosta del año, con la
 * horquilla más cerrada (la del Fairmont), el túnel, la chicana del puerto y
 * la Rascasse. Sin escapatorias: cualquier error termina en el muro.
 *
 * Trazado real (ver `real/monaco.ts`), escalado a 3.337 km. Las posiciones
 * están en metros desde 350 m antes de la meta; DRS, boxes y tribunas se
 * ubicaron a partir de las rectas y curvas del trazado.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { MONACO_POINTS } from './real/monaco';

export const MONACO: TrackDefinition = {
  id: 'monaco',
  name: 'Montecarlo',
  short: 'Mónaco',
  grandPrix: 'Gran Premio de Mónaco',
  city: 'Montecarlo',
  country: 'Mónaco',
  countryCode: 'MC',
  lengthKm: 3.337,
  turns: 19,
  lapRecord: { seconds: 72.909, driver: 'S. Okafor', year: 2021 },
  width: 13,
  layout: { kind: 'points', points: MONACO_POINTS },
  startLine: 350,
  sectors: [1434, 2517],
  pits: { side: 'left', from: 180, to: 470 },
  drsZones: [
    { detection: 150, start: 300, end: 500 },
  ],
  scenery: {
    street: 'city',
    buildingHeight: [12, 42],
    grandstands: [
      { at: 350, side: 'right', length: 200, rows: 16 },
      { at: 798, side: 'left', length: 100, rows: 11 },
      { at: 1476, side: 'left', length: 100, rows: 11 },
      { at: 2250, side: 'left', length: 100, rows: 11 },
      { at: 2862, side: 'left', length: 100, rows: 11 },
    ],
    treeDensity: 6,
    skyline: { bearing: 20, distance: 900, buildings: 140 },
  },
  environment: {
    sunAzimuth: 225,
    sunElevation: 52,
    turbidity: 2.8,
    fogDensity: 0.00018,
  },
};
