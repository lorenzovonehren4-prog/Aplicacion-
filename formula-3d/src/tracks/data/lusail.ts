/**
 * Lusail (Catar). Circuito de motos en el desierto, de noche: curvas rápidas
 * y medias que se encadenan una tras otra, muy exigente en lo físico; una
 * sola recta larga.
 *
 * Trazado real (ver `real/lusail.ts`), escalado a 5.419 km. Las posiciones
 * están en metros desde 350 m antes de la meta; DRS, boxes y tribunas se
 * ubicaron a partir de las rectas y curvas del trazado.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { LUSAIL_POINTS } from './real/lusail';

export const LUSAIL: TrackDefinition = {
  id: 'lusail',
  name: 'Lusail',
  short: 'Lusail',
  grandPrix: 'Gran Premio de Catar',
  city: 'Lusail',
  country: 'Catar',
  countryCode: 'QA',
  lengthKm: 5.419,
  turns: 16,
  lapRecord: { seconds: 82.384, driver: 'N. Kovač', year: 2023 },
  width: 17,
  layout: { kind: 'points', points: LUSAIL_POINTS },
  startLine: 350,
  sectors: [2144, 3938],
  pits: { side: 'right', from: 20, to: 680 },
  drsZones: [
    { detection: 4894, start: 5164, end: 646 },
  ],
  scenery: {
    ground: 'sand',
    grandstands: [
      { at: 350, side: 'left', length: 200, rows: 16 },
      { at: 828, side: 'left', length: 100, rows: 11 },
      { at: 2244, side: 'right', length: 100, rows: 11 },
      { at: 2634, side: 'left', length: 100, rows: 11 },
      { at: 3192, side: 'right', length: 100, rows: 11 },
    ],
    treeDensity: 0,
    skyline: { bearing: 200, distance: 6000, buildings: 30 },
  },
  environment: {
    sunAzimuth: 260,
    sunElevation: 9,
    turbidity: 5.4,
    fogDensity: 0.00024,
  },
};
