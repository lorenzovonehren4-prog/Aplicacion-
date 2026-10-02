/**
 * Spa-Francorchamps (Bélgica). El más largo y en el bosque de las Ardenas: la
 * horquilla de La Source, la subida de Eau Rouge y Raidillon, la recta de
 * Kemmel, Pouhon a fondo y la chicana de la parada de autobús.
 *
 * Trazado real (ver `real/spa.ts`), escalado a 7.004 km. Las posiciones
 * están en metros desde 350 m antes de la meta; DRS, boxes y tribunas se
 * ubicaron a partir de las rectas y curvas del trazado.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { SPA_POINTS } from './real/spa';

export const SPA: TrackDefinition = {
  id: 'spa',
  name: 'Spa-Francorchamps',
  short: 'Spa',
  grandPrix: 'Gran Premio de Bélgica',
  city: 'Stavelot',
  country: 'Bélgica',
  countryCode: 'BE',
  lengthKm: 7.004,
  turns: 19,
  lapRecord: { seconds: 104.701, driver: 'K. Morimoto', year: 2018 },
  width: 17,
  layout: { kind: 'points', points: SPA_POINTS },
  startLine: 350,
  sectors: [2658, 4965],
  pits: { side: 'left', from: 49, to: 497 },
  drsZones: [
    { detection: 6747, start: 94, end: 412 },
    { detection: 1600, start: 1870, end: 2416 },
  ],
  scenery: {
    grandstands: [
      { at: 350, side: 'right', length: 200, rows: 16 },
      { at: 2574, side: 'left', length: 100, rows: 11 },
      { at: 3186, side: 'left', length: 100, rows: 11 },
      { at: 5082, side: 'left', length: 100, rows: 11 },
      { at: 6906, side: 'right', length: 100, rows: 11 },
    ],
    treeDensity: 85,
  },
  environment: {
    sunAzimuth: 200,
    sunElevation: 34,
    turbidity: 3.4,
    fogDensity: 0.00022,
  },
};
