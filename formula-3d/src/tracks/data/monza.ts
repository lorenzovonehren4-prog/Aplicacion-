/**
 * Monza (Italia). El "templo de la velocidad": en sentido horario dentro del
 * parque, con la recta principal larga, la chicana cerrada del Rettifilo, la
 * Curva Grande a fondo, la chicana de la Roggia, las dos Lesmo, la recta del
 * Serraglio (que pasa por debajo del viejo óvalo peraltado), la chicana
 * rápida de Ascari, la recta de atrás y la Parabolica, que se abre de a poco
 * hasta la meta. Dos zonas de DRS y mucha arboleda.
 *
 * El trazado aproxima el real con rectas y arcos (cierra exacto con estas
 * medidas) y se escala a 5,793 km. Roggia, las Lesmo, Ascari y la entrada de
 * la Parabolica tienen radios ajustados a sus velocidades reales.
 */

import type { TrackDefinition } from '../TrackDefinition';

export const MONZA: TrackDefinition = {
  id: 'monza',
  name: 'Monza',
  grandPrix: 'Gran Premio de Italia',
  city: 'Monza',
  country: 'Italia',
  countryCode: 'IT',
  lengthKm: 5.793,
  turns: 11,
  lapRecord: { seconds: 80.874, driver: 'L. Brenner', year: 2025 },
  width: 15.5,
  layout: {
    start: [0, 0],
    heading: 0,
    segments: [
      { kind: 'straight', length: 1185.6 },
      { kind: 'turn', direction: 'right', radius: 18, angle: 83.4, name: 'Rettifilo' },
      { kind: 'straight', length: 14 },
      { kind: 'turn', direction: 'left', radius: 22, angle: 75.4, name: 'Rettifilo' },
      { kind: 'straight', length: 160 },
      { kind: 'turn', direction: 'right', radius: 440.3, angle: 61.2, name: 'Curva Grande' },
      { kind: 'straight', length: 300 },
      { kind: 'turn', direction: 'left', radius: 29, angle: 62, name: 'Roggia' },
      { kind: 'straight', length: 12 },
      { kind: 'turn', direction: 'right', radius: 30, angle: 67, name: 'Roggia' },
      { kind: 'straight', length: 312.6 },
      { kind: 'turn', direction: 'right', radius: 56, angle: 73.2, name: 'Lesmo 1' },
      { kind: 'straight', length: 153.1 },
      { kind: 'turn', direction: 'right', radius: 54, angle: 73, name: 'Lesmo 2' },
      { kind: 'straight', length: 452.81 },
      { kind: 'turn', direction: 'left', radius: 900, angle: 11.6, name: 'Serraglio' },
      { kind: 'straight', length: 262.9 },
      { kind: 'turn', direction: 'left', radius: 66, angle: 42, name: 'Ascari' },
      { kind: 'straight', length: 30 },
      { kind: 'turn', direction: 'right', radius: 58, angle: 62, name: 'Ascari' },
      { kind: 'straight', length: 40 },
      { kind: 'turn', direction: 'left', radius: 78, angle: 36, name: 'Ascari' },
      { kind: 'straight', length: 1043.04 },
      { kind: 'turn', direction: 'right', radius: 88, angle: 94.9, name: 'Parabolica' },
      { kind: 'turn', direction: 'right', radius: 251, angle: 72.3, name: 'Parabolica' },
    ],
  },
  startLine: 580,
  sectors: [2020, 4230],
  pits: { side: 'right', from: 150, to: 1080 },
  drsZones: [
    { detection: 4990, start: 150, end: 1100 },
    { detection: 3760, start: 4080, end: 4960 },
  ],
  runoff: [
    // Grava por fuera de la Curva Grande y de la Parabolica.
    { from: 1420, to: 1880, side: 'left', kind: 'gravel', width: 30 },
    { from: 5060, to: 5420, side: 'left', kind: 'gravel', width: 38 },
  ],
  scenery: {
    grandstands: [
      { at: 580, side: 'left', length: 230, rows: 18 },
      { at: 1210, side: 'left', length: 120, rows: 12 },
      { at: 2240, side: 'right', length: 100, rows: 10 },
      { at: 2650, side: 'left', length: 90, rows: 10 },
      { at: 4050, side: 'right', length: 110, rows: 12 },
      { at: 5220, side: 'left', length: 200, rows: 14 },
    ],
    treeDensity: 60,
    // El viejo óvalo de alta velocidad pasa por encima de la recta del Serraglio.
    bridges: [{ at: 3230, kind: 'banking', name: 'Sopraelevata' }],
  },
  environment: {
    sunAzimuth: 250,
    sunElevation: 34,
    turbidity: 3.5,
    fogDensity: 0.00016,
  },
};
