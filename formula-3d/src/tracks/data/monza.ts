/**
 * Monza (Italia). El "templo de la velocidad": en sentido horario dentro del
 * parque, con la recta principal larga, la chicana cerrada del Rettifilo, la
 * Curva Grande a fondo, la chicana de la Roggia, las dos Lesmo, la recta del
 * Serraglio (que pasa por debajo del viejo óvalo peraltado), la chicana
 * rápida de Ascari, la recta de atrás y la Parabolica, que se abre de a poco
 * hasta la meta. Dos zonas de DRS y mucha arboleda.
 *
 * El trazado es la línea central REAL del circuito (ver `real/monza.ts`) y se
 * escala a 5,793 km. El asfalto es más ancho que el real para dar más margen
 * al manejar. Las posiciones están en metros desde la salida de la Parabolica.
 */

import type { TrackDefinition } from '../TrackDefinition';
import { MONZA_POINTS } from './real/monza';

export const MONZA: TrackDefinition = {
  id: 'monza',
  name: 'Monza',
  short: 'Monza',
  grandPrix: 'Gran Premio de Italia',
  city: 'Monza',
  country: 'Italia',
  countryCode: 'IT',
  lengthKm: 5.793,
  turns: 11,
  lapRecord: { seconds: 80.874, driver: 'L. Brenner', year: 2025 },
  width: 17.5,
  layout: { kind: 'points', points: MONZA_POINTS },
  startLine: 339,
  sectors: [2200, 4600],
  pits: { side: 'right', from: 80, to: 1150 },
  drsZones: [
    { detection: 4700, start: 120, end: 1150 },
    { detection: 3500, start: 4650, end: 5350 },
  ],
  runoff: [
    // Grava por fuera de la Curva Grande y de la Parabolica.
    { from: 1500, to: 1950, side: 'left', kind: 'gravel', width: 30 },
    { from: 5360, to: 5700, side: 'left', kind: 'gravel', width: 38 },
  ],
  scenery: {
    grandstands: [
      { at: 339, side: 'left', length: 230, rows: 18 },
      { at: 1290, side: 'left', length: 120, rows: 12 },
      { at: 2500, side: 'right', length: 100, rows: 10 },
      { at: 3230, side: 'left', length: 90, rows: 10 },
      { at: 4350, side: 'right', length: 110, rows: 12 },
      { at: 5560, side: 'left', length: 200, rows: 14 },
    ],
    treeDensity: 60,
    // El viejo óvalo de alta velocidad pasa por encima de la recta del Serraglio.
    bridges: [{ at: 3600, kind: 'banking', name: 'Sopraelevata' }],
  },
  environment: {
    sunAzimuth: 250,
    sunElevation: 34,
    turbidity: 2.6,
    fogDensity: 0.00016,
  },
};
