/**
 * Shanghái (China). Diseñado sobre el carácter chino "shang": la curva 1 es
 * un caracol que se cierra sobre sí mismo, después vienen curvas medias, la
 * horquilla de la 6, la larguísima recta de atrás (1,2 km) que termina en la
 * horquilla 14 y la recta principal.
 *
 * Trazado real (ver `real/shanghai.ts`), escalado a 5.451 km. Las posiciones
 * están en metros desde 350 m antes de la meta; DRS, boxes y tribunas se
 * ubicaron a partir de las rectas y curvas del trazado.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { SHANGHAI_POINTS } from './real/shanghai';

export const SHANGHAI: TrackDefinition = {
  id: 'shanghai',
  name: 'Shanghái',
  short: 'Shanghái',
  grandPrix: 'Gran Premio de China',
  city: 'Shanghái',
  country: 'China',
  countryCode: 'CN',
  lengthKm: 5.451,
  turns: 16,
  lapRecord: { seconds: 92.238, driver: 'L. Brenner', year: 2024 },
  width: 17,
  layout: { kind: 'points', points: SHANGHAI_POINTS },
  startLine: 350,
  sectors: [2147, 3944],
  pits: { side: 'left', from: 20, to: 369 },
  drsZones: [
    { detection: 4864, start: 5134, end: 284 },
    { detection: 3262, start: 3532, end: 4510 },
  ],
  scenery: {
    grandstands: [
      { at: 350, side: 'right', length: 200, rows: 16 },
      { at: 1482, side: 'left', length: 100, rows: 11 },
      { at: 2436, side: 'right', length: 100, rows: 11 },
      { at: 3024, side: 'right', length: 100, rows: 11 },
      { at: 4662, side: 'left', length: 100, rows: 11 },
    ],
    treeDensity: 22,
    skyline: { bearing: 80, distance: 3600, buildings: 70 },
  },
  environment: {
    sunAzimuth: 220,
    sunElevation: 40,
    turbidity: 4.6,
    fogDensity: 0.00026,
  },
};
