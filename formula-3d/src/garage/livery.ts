/**
 * Livery (decoración) del monoplaza. En la Fase 7 el garaje agrega patrones,
 * materiales y más opciones; por ahora: colores, número y franja del neumático.
 */

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
}

/** Livery de fábrica del auto del jugador (equipo ficticio "Ápice"). */
export const PLAYER_DEFAULT_LIVERY: Readonly<LiveryConfig> = {
  primary: '#c8102e',
  secondary: '#111317',
  accent: '#f2f2f0',
  number: 7,
  tireStripe: '#ff2a3c',
};
