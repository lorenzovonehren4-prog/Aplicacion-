/**
 * Albert Park (Melbourne, Australia). Circuito semiurbano en sentido horario
 * alrededor del lago del parque: recta de meta larga, la combinación rápida de
 * las curvas 1 y 2, la frenada fuerte de la 3, el sector ondulado del medio,
 * la larga recta junto al lago (zona de DRS), la chicana rápida 9-10 y el
 * sector lento final (11 a 14).
 *
 * El trazado aproxima el real con rectas y arcos; se escala a 5,278 km.
 */

import type { TrackDefinition } from '../TrackDefinition';

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
  width: 14,
  layout: {
    start: [0, 0],
    heading: 0,
    segments: [
      { kind: 'straight', length: 916.5 },
      { kind: 'turn', direction: 'right', radius: 62, angle: 75, name: 'C1' },
      { kind: 'straight', length: 20 },
      { kind: 'turn', direction: 'left', radius: 95, angle: 40, name: 'C2' },
      { kind: 'straight', length: 180 },
      { kind: 'turn', direction: 'right', radius: 34, angle: 95, name: 'C3' },
      { kind: 'straight', length: 50 },
      { kind: 'turn', direction: 'left', radius: 60, angle: 45, name: 'C4' },
      { kind: 'straight', length: 140 },
      { kind: 'turn', direction: 'right', radius: 250, angle: 20, name: 'C5' },
      { kind: 'straight', length: 90 },
      { kind: 'turn', direction: 'right', radius: 75, angle: 75, name: 'C6' },
      { kind: 'straight', length: 70 },
      { kind: 'turn', direction: 'left', radius: 85, angle: 60, name: 'C7' },
      { kind: 'straight', length: 30 },
      { kind: 'turn', direction: 'right', radius: 150, angle: 60, name: 'C8' },
      { kind: 'straight', length: 220 },
      { kind: 'turn', direction: 'left', radius: 450, angle: 16, name: 'rápida' },
      { kind: 'straight', length: 200 },
      { kind: 'turn', direction: 'right', radius: 120, angle: 55, name: 'C9' },
      { kind: 'straight', length: 20 },
      { kind: 'turn', direction: 'left', radius: 110, angle: 50, name: 'C10' },
      { kind: 'straight', length: 220 },
      { kind: 'turn', direction: 'right', radius: 42, angle: 100, name: 'C11' },
      { kind: 'straight', length: 120 },
      { kind: 'turn', direction: 'left', radius: 70, angle: 35, name: 'C12' },
      { kind: 'straight', length: 180 },
      { kind: 'turn', direction: 'right', radius: 55, angle: 70, name: 'C13' },
      { kind: 'straight', length: 574.5 },
      { kind: 'turn', direction: 'right', radius: 85, angle: 56, name: 'C14' },
    ],
  },
  startLine: 440,
  sectors: [1650, 3180],
  pits: { side: 'left', from: 120, to: 880 },
  drsZones: [
    { detection: 4180, start: 120, end: 860 },
    { detection: 1880, start: 2200, end: 2700 },
    { detection: 3550, start: 3680, end: 4200 },
  ],
  scenery: {
    lake: [
      [180, -900],
      [330, -990],
      [520, -1000],
      [650, -950],
      [720, -820],
      [760, -600],
      [770, -350],
      [780, -120],
      [760, 60],
      [650, 170],
      [480, 200],
      [330, 120],
      [200, 20],
      [150, -200],
      [130, -500],
      [140, -750],
    ],
    grandstands: [
      { at: 440, side: 'right', length: 190, rows: 16 },
      { at: 955, side: 'left', length: 110, rows: 12 },
      { at: 1290, side: 'left', length: 90, rows: 10 },
      { at: 3210, side: 'left', length: 100, rows: 10 },
      { at: 3625, side: 'left', length: 100, rows: 12 },
    ],
    treeDensity: 40,
    skyline: { bearing: 0, distance: 3400, buildings: 70 },
  },
  environment: {
    sunAzimuth: 300,
    sunElevation: 38,
    turbidity: 3,
    fogDensity: 0.00018,
  },
};
