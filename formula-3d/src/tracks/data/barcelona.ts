/**
 * Barcelona-Cataluña (España). El circuito de pruebas por excelencia: recta
 * larga, curvas medias y rápidas (la 3 y la 9) y un último sector más lento.
 * Completo pero sin trampas.
 *
 * Trazado real (ver `real/barcelona.ts`), escalado a 4.657 km. Las posiciones
 * están en metros desde 350 m antes de la meta; DRS, boxes y tribunas se
 * ubicaron a partir de las rectas y curvas del trazado.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { BARCELONA_POINTS } from './real/barcelona';

export const BARCELONA: TrackDefinition = {
  id: 'barcelona',
  name: 'Barcelona-Cataluña',
  short: 'Barcelona',
  grandPrix: 'Gran Premio de Barcelona-Cataluña',
  city: 'Montmeló',
  country: 'España',
  countryCode: 'ES',
  lengthKm: 4.657,
  turns: 14,
  lapRecord: { seconds: 76.33, driver: 'D. Valdivia', year: 2021 },
  width: 17,
  layout: { kind: 'points', points: BARCELONA_POINTS },
  startLine: 350,
  sectors: [1893, 3437],
  pits: { side: 'right', from: 20, to: 680 },
  drsZones: [
    { detection: 4414, start: 54, end: 888 },
  ],
  scenery: {
    grandstands: [
      { at: 350, side: 'left', length: 200, rows: 16 },
      { at: 1038, side: 'left', length: 100, rows: 11 },
      { at: 2328, side: 'right', length: 100, rows: 11 },
      { at: 2742, side: 'right', length: 100, rows: 11 },
      { at: 3678, side: 'right', length: 100, rows: 11 },
    ],
    treeDensity: 18,
    skyline: { bearing: 200, distance: 4500, buildings: 30 },
  },
  environment: {
    sunAzimuth: 225,
    sunElevation: 46,
    turbidity: 3.2,
    fogDensity: 0.0002,
  },
};
