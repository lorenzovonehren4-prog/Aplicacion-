/**
 * Hermanos Rodríguez (México). A 2.200 m de altura (aire fino): la recta más
 * larga del año hasta la curva 1, curvas medias y el paso por el estadio del
 * Foro Sol.
 *
 * Trazado real (ver `real/mexico.ts`), escalado a 4.304 km. Las posiciones
 * están en metros desde 350 m antes de la meta; DRS, boxes y tribunas se
 * ubicaron a partir de las rectas y curvas del trazado.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { MEXICO_POINTS } from './real/mexico';

export const MEXICO: TrackDefinition = {
  id: 'mexico',
  name: 'Hermanos Rodríguez',
  short: 'México',
  grandPrix: 'Gran Premio de la Ciudad de México',
  city: 'Ciudad de México',
  country: 'México',
  countryCode: 'MX',
  lengthKm: 4.304,
  turns: 17,
  lapRecord: { seconds: 77.774, driver: 'A. Tanabe', year: 2021 },
  width: 17,
  layout: { kind: 'points', points: MEXICO_POINTS },
  startLine: 350,
  sectors: [1768, 3187],
  pits: { side: 'left', from: 205, to: 680 },
  drsZones: [
    { detection: 4235, start: 250, end: 1318 },
    { detection: 1498, start: 1768, end: 2146 },
  ],
  scenery: {
    grandstands: [
      { at: 350, side: 'right', length: 200, rows: 16 },
      { at: 1464, side: 'left', length: 100, rows: 11 },
      { at: 2364, side: 'left', length: 100, rows: 11 },
      { at: 2838, side: 'right', length: 100, rows: 11 },
      { at: 4056, side: 'right', length: 100, rows: 11 },
    ],
    treeDensity: 30,
    skyline: { bearing: 300, distance: 3000, buildings: 110 },
  },
  environment: {
    sunAzimuth: 220,
    sunElevation: 44,
    turbidity: 3.8,
    fogDensity: 0.00024,
  },
};
