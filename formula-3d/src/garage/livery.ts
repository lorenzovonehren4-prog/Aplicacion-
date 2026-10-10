/**
 * Livery (decoración) del monoplaza: colores, patrón, acabado de la pintura,
 * número, franja del neumático, llantas, forma del alerón y casco. Lo que falta
 * toma el valor de fábrica (los rivales y el fantasma sólo definen colores y
 * número). El garaje la arma a partir de lo elegido (`garage/setup.ts`).
 */

import type { Finish, HelmetDesign, PaintPattern, WingShape } from '../progression/items';

export interface RimsLook {
  spokes: number;
  color: string;
  accent: string;
  /** Tapa aerodinámica lisa sobre los rayos. */
  cover: boolean;
}

export interface HelmetLook {
  /** Base, segundo y tercer color (el diseño `team` usa los del auto). */
  colors: [string, string, string];
  design: HelmetDesign;
}

export interface LiveryConfig {
  /** Color principal de la carrocería. */
  primary: string;
  /** Color secundario (parte baja, alerones). */
  secondary: string;
  /** Color de acento (filetes, detalles). */
  accent: string;
  /** Número del auto (1–99). */
  number: number;
  /** Color de la franja del neumático (compuesto). */
  tireStripe: string;
  pattern?: PaintPattern;
  finish?: Finish;
  rims?: RimsLook | undefined;
  wing?: WingShape;
  helmet?: HelmetLook | undefined;
}

/** Livery de fábrica del auto del jugador (equipo ficticio "Ápice"). */
export const PLAYER_DEFAULT_LIVERY: Readonly<LiveryConfig> = {
  primary: '#c8102e',
  secondary: '#111317',
  accent: '#f2f2f0',
  number: 7,
  tireStripe: '#ff2a3c',
};
