/**
 * Albert Park (Melbourne, Australia). Circuito semiurbano en sentido horario
 * alrededor del lago del parque: recta de meta, la combinación de las curvas
 * 1 y 2, la frenada fuerte de la 3, el sector del medio, la curva rápida
 * donde antes estaba la chicana 9-10 (trazado de 2022), la larga recta junto
 * al lago, la chicana rápida 9-10 y el sector final (11 a 14).
 *
 * El trazado es la línea central REAL del circuito (ver `real/melbourne.ts`)
 * y se escala a 5,278 km. El asfalto es 2 m más ancho que el real para dar
 * más margen al manejar. Las posiciones (meta, sectores, DRS, boxes,
 * tribunas) están en metros desde la salida de la última curva.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { MELBOURNE_LAKE, MELBOURNE_POINTS } from './real/melbourne';

export const AUSTRALIA: TrackDefinition = {
  id: 'australia',
  name: 'Albert Park',
  grandPrix: 'Gran Premio de Australia',
  city: 'Melbourne',
  country: 'Australia',
  countryCode: 'AU',
  lengthKm: 5.278,
  turns: 14,
  lapRecord: { seconds: 79.813, driver: 'T. Valdivia', year: 2024 },
  width: 18,
  layout: { kind: 'points', points: MELBOURNE_POINTS },
  startLine: 364,
  sectors: [1950, 3550],
  pits: { side: 'left', from: 40, to: 700 },
  drsZones: [
    { detection: 4950, start: 120, end: 690 },
    { detection: 820, start: 950, end: 1400 },
    { detection: 2400, start: 2700, end: 3580 },
    { detection: 3760, start: 3950, end: 4420 },
  ],
  scenery: {
    lake: MELBOURNE_LAKE,
    grandstands: [
      { at: 364, side: 'right', length: 190, rows: 16 },
      { at: 760, side: 'left', length: 110, rows: 12 },
      { at: 1480, side: 'left', length: 90, rows: 10 },
      { at: 2250, side: 'left', length: 90, rows: 10 },
      { at: 4490, side: 'left', length: 100, rows: 12 },
      { at: 5010, side: 'right', length: 80, rows: 10 },
    ],
    treeDensity: 40,
    skyline: { bearing: 10, distance: 3400, buildings: 70 },
  },
  environment: {
    sunAzimuth: 300,
    sunElevation: 38,
    turbidity: 3,
    fogDensity: 0.00018,
  },
};
