/**
 * Lo que el jugador arma en el garaje (se guarda en `SaveData.garage`) y cómo
 * se convierte en la decoración del auto (`LiveryConfig`).
 *
 * - Pintura: un patrón y tres colores. Los patrones y algunos colores piden un
 *   nivel de piloto; las pinturas ganadas (pase o nivel) son combinaciones
 *   listas que se aplican de una.
 * - Material, llantas, alerón y casco: ítems del catálogo
 *   (`progression/items.ts`) que se tienen por el pase, por nivel o de fábrica.
 * - Número (1–99) y franja del neumático (colores de compuesto).
 */

import type { Progression } from '../core/save/schema';
import type { DeepReadonly } from '../core/utils/types';
import { getItem, type Finish, type HelmetDesign, type Item, type PaintPattern, type WingShape } from '../progression/items';
import { PLAYER_DEFAULT_LIVERY, type LiveryConfig } from './livery';

export interface GarageSetup {
  pattern: PaintPattern;
  /** Principal, secundario y acento. */
  colors: [string, string, string];
  /** Ids de ítems del catálogo. */
  material: string;
  rims: string;
  wing: string;
  helmet: string;
  number: number;
  tireStripe: string;
}

export function createDefaultGarage(): GarageSetup {
  return {
    pattern: 'solid',
    colors: [PLAYER_DEFAULT_LIVERY.primary, PLAYER_DEFAULT_LIVERY.secondary, PLAYER_DEFAULT_LIVERY.accent],
    material: 'material-gloss',
    rims: 'rims-factory',
    wing: 'wing-standard',
    helmet: 'helmet-team',
    number: PLAYER_DEFAULT_LIVERY.number,
    tireStripe: PLAYER_DEFAULT_LIVERY.tireStripe,
  };
}

/** Patrones de pintura, con el nivel de piloto que piden. */
export const PATTERNS: ReadonlyArray<{ id: PaintPattern; label: string; level: number }> = [
  { id: 'solid', label: 'Fábrica', level: 1 },
  { id: 'stripes', label: 'Franjas', level: 2 },
  { id: 'split', label: 'Partido', level: 4 },
  { id: 'chevron', label: 'Flechas', level: 6 },
  { id: 'gradient', label: 'Degradado', level: 9 },
  { id: 'geometric', label: 'Geométrico', level: 13 },
];

/** Paleta de colores de pintura, con el nivel que piden los especiales. */
export const PALETTE: ReadonlyArray<{ hex: string; name: string; level: number }> = [
  { hex: '#c8102e', name: 'Rojo Ápice', level: 1 },
  { hex: '#111317', name: 'Negro', level: 1 },
  { hex: '#f2f2f0', name: 'Blanco', level: 1 },
  { hex: '#8a939e', name: 'Plata', level: 1 },
  { hex: '#1747c2', name: 'Azul', level: 1 },
  { hex: '#0f4d2e', name: 'Verde carreras', level: 1 },
  { hex: '#ff7a1a', name: 'Naranja', level: 1 },
  { hex: '#ffd23f', name: 'Amarillo', level: 1 },
  { hex: '#6b1d8f', name: 'Violeta', level: 3 },
  { hex: '#00b7c7', name: 'Turquesa', level: 3 },
  { hex: '#ff4fd8', name: 'Rosa', level: 5 },
  { hex: '#0c1024', name: 'Azul noche', level: 5 },
  { hex: '#b6f000', name: 'Lima', level: 7 },
  { hex: '#6e0712', name: 'Borgoña', level: 7 },
  { hex: '#39ff88', name: 'Verde neón', level: 10 },
  { hex: '#d4a93c', name: 'Oro', level: 12 },
  { hex: '#e9eef3', name: 'Perla', level: 16 },
  { hex: '#2b1a0e', name: 'Café tostado', level: 20 },
];

/** Colores de la franja del neumático (como los compuestos). */
export const TIRE_COMPOUNDS: ReadonlyArray<{ hex: string; name: string; level: number }> = [
  { hex: '#ff2a3c', name: 'Blando (rojo)', level: 1 },
  { hex: '#ffd23f', name: 'Medio (amarillo)', level: 1 },
  { hex: '#f4f4f2', name: 'Duro (blanco)', level: 1 },
  { hex: '#39d353', name: 'Intermedio (verde)', level: 4 },
  { hex: '#2f7bff', name: 'Lluvia (azul)', level: 6 },
  { hex: '#b76bff', name: 'Violeta', level: 11 },
  { hex: '#f5c542', name: 'Oro', level: 18 },
];

/** ¿El piloto tiene este ítem? (de fábrica, ganado en el pase o por nivel). */
export function ownsItem(item: Item, progression: DeepReadonly<Progression>): boolean {
  if (progression.unlocked.includes(item.id)) return true;
  return item.level !== undefined && progression.level >= item.level;
}

export function ownsItemId(id: string, progression: DeepReadonly<Progression>): boolean {
  const item = getItem(id);
  return item !== undefined && ownsItem(item, progression);
}

/** Convierte lo elegido en el garaje en la decoración que dibuja `CarModel`. */
export function liveryFromSetup(setup: DeepReadonly<GarageSetup>): LiveryConfig {
  const primary = setup.colors[0] ?? PLAYER_DEFAULT_LIVERY.primary;
  const secondary = setup.colors[1] ?? PLAYER_DEFAULT_LIVERY.secondary;
  const accent = setup.colors[2] ?? PLAYER_DEFAULT_LIVERY.accent;
  const material = getItem(setup.material);
  const rims = getItem(setup.rims);
  const wing = getItem(setup.wing);
  const helmet = getItem(setup.helmet);
  const finish: Finish = material?.kind === 'material' ? material.finish : 'gloss';
  const shape: WingShape = wing?.kind === 'wing' ? wing.shape : 'standard';
  const helmetDesign: HelmetDesign = helmet?.kind === 'helmet' ? helmet.design : 'team';
  return {
    primary,
    secondary,
    accent,
    number: setup.number,
    tireStripe: setup.tireStripe,
    pattern: setup.pattern,
    finish,
    rims:
      rims?.kind === 'rims'
        ? { spokes: rims.spokes, color: rims.color, accent: rims.cover ? setup.tireStripe : rims.accent, cover: rims.cover === true }
        : undefined,
    wing: shape,
    helmet: helmet?.kind === 'helmet' ? { colors: [...helmet.colors], design: helmetDesign } : undefined,
  };
}
