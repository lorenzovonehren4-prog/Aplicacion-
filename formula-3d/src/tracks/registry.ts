/**
 * Catálogo de circuitos. Agregar uno = crear su archivo en `data/` y sumarlo
 * aquí; nada más cambia.
 */

import { AUSTRALIA } from './data/australia';
import type { TrackDefinition } from './TrackDefinition';

export const TRACKS: readonly TrackDefinition[] = [AUSTRALIA];

export function getTrack(id: string): TrackDefinition {
  const track = TRACKS.find((t) => t.id === id);
  if (!track) throw new Error(`No existe el circuito "${id}".`);
  return track;
}
