/**
 * Catálogo de circuitos, en el orden del calendario de la temporada. Agregar
 * uno = crear su archivo en `data/` y sumarlo aquí; nada más cambia.
 */

import { AUSTIN } from './data/austin';
import { AUSTRALIA } from './data/australia';
import { BAKU } from './data/baku';
import { BARCELONA } from './data/barcelona';
import { BUDAPEST } from './data/budapest';
import { INTERLAGOS } from './data/interlagos';
import { JEDDAH } from './data/jeddah';
import { LAS_VEGAS } from './data/lasvegas';
import { LUSAIL } from './data/lusail';
import { MADRID } from './data/madrid';
import { MEXICO } from './data/mexico';
import { MIAMI } from './data/miami';
import { MONACO } from './data/monaco';
import { MONTREAL } from './data/montreal';
import { MONZA } from './data/monza';
import { SAKHIR } from './data/sakhir';
import { SHANGHAI } from './data/shanghai';
import { SILVERSTONE } from './data/silverstone';
import { SINGAPORE } from './data/singapore';
import { SPA } from './data/spa';
import { SPIELBERG } from './data/spielberg';
import { SUZUKA } from './data/suzuka';
import { YAS_MARINA } from './data/yasmarina';
import { ZANDVOORT } from './data/zandvoort';
import type { TrackDefinition } from './TrackDefinition';

export const TRACKS: readonly TrackDefinition[] = [
  AUSTRALIA,
  SHANGHAI,
  SUZUKA,
  SAKHIR,
  JEDDAH,
  MIAMI,
  MONTREAL,
  MONACO,
  BARCELONA,
  SPIELBERG,
  SILVERSTONE,
  SPA,
  BUDAPEST,
  ZANDVOORT,
  MONZA,
  MADRID,
  BAKU,
  SINGAPORE,
  AUSTIN,
  MEXICO,
  INTERLAGOS,
  LAS_VEGAS,
  LUSAIL,
  YAS_MARINA,
];

export function getTrack(id: string): TrackDefinition {
  const track = TRACKS.find((t) => t.id === id);
  if (!track) throw new Error(`No existe el circuito "${id}".`);
  return track;
}
