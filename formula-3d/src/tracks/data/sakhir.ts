/**
 * Sakhir (Baréin). Circuito en el desierto, con frenadas fuertes después de
 * rectas largas (curvas 1, 4, 10 y 14) y tramos de tracción. Se corre al
 * atardecer.
 *
 * Trazado real (ver `real/sakhir.ts`), escalado a 5.412 km. Las posiciones
 * están en metros desde 350 m antes de la meta; DRS, boxes y tribunas se
 * ubicaron a partir de las rectas y curvas del trazado.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { SAKHIR_POINTS } from './real/sakhir';

export const SAKHIR: TrackDefinition = {
  id: 'sakhir',
  name: 'Sakhir',
  short: 'Sakhir',
  grandPrix: 'Gran Premio de Baréin',
  city: 'Sakhir',
  country: 'Baréin',
  countryCode: 'BH',
  lengthKm: 5.412,
  turns: 15,
  lapRecord: { seconds: 91.447, driver: 'E. Solvang', year: 2023 },
  width: 17,
  layout: { kind: 'points', points: SAKHIR_POINTS },
  startLine: 350,
  sectors: [2139, 3927],
  pits: { side: 'right', from: 20, to: 680 },
  drsZones: [
    { detection: 4954, start: 5224, end: 740 },
    { detection: 4126, start: 4396, end: 4894 },
    { detection: 2704, start: 2974, end: 3424 },
  ],
  scenery: {
    ground: 'sand',
    grandstands: [
      { at: 350, side: 'left', length: 200, rows: 16 },
      { at: 876, side: 'left', length: 100, rows: 11 },
      { at: 2406, side: 'left', length: 100, rows: 11 },
      { at: 2868, side: 'right', length: 100, rows: 11 },
      { at: 5040, side: 'left', length: 100, rows: 11 },
    ],
    treeDensity: 2,
  },
  environment: {
    sunAzimuth: 255,
    sunElevation: 12,
    turbidity: 5.2,
    fogDensity: 0.00022,
  },
};
