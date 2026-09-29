/**
 * Niveles de ayudas (estilo juego oficial) y su multiplicador de XP.
 * Ver PLAN.md §5.4.
 *
 * | Nivel         | Frenado | Tracción | ABS | Línea        | Tipo     | XP    |
 * |---------------|---------|----------|-----|--------------|----------|-------|
 * | Principiante  | Completa| Completo | Sí  | Completa     | Dinámica | ×1.0  |
 * | Intermedio    | Media   | No       | Sí  | Completa     | Dinámica | ×1.25 |
 * | Avanzado      | Baja    | No       | Sí  | Sólo curvas  | Dinámica | ×1.5  |
 * | Personalizado | a elección                                  | calculado |
 *
 * Principiante suma además la dirección asistida hacia el ápice, el
 * anti-derrape y algo más de agarre (ver `SteeringAssist` y `Session`).
 * La línea dinámica (color según tu velocidad) es la de todos los niveles
 * predefinidos; la fija queda como opción en Personalizado.
 */

import type {
  AssistConfig,
  AssistLevel,
  AssistSettings,
  BrakingAssist,
  LineMode,
  LineType,
  TractionAssist,
} from '../core/save/schema';
import type { DeepReadonly } from '../core/utils/types';

/** Ayudas que realmente se aplican en pista. */
export interface ActiveAssists extends AssistConfig {
  /** Dirección más suave y control de estabilidad (sólo Principiante). */
  steering: boolean;
}

export type PresetLevel = Exclude<AssistLevel, 'custom'>;

export const ASSIST_PRESETS: Readonly<Record<PresetLevel, Readonly<ActiveAssists>>> = {
  beginner: { braking: 'full', traction: 'full', abs: true, line: 'full', lineType: 'dynamic', steering: true },
  intermediate: { braking: 'medium', traction: 'off', abs: true, line: 'full', lineType: 'dynamic', steering: false },
  advanced: { braking: 'low', traction: 'off', abs: true, line: 'corners', lineType: 'dynamic', steering: false },
};

/** Multiplicadores fijos de los niveles predefinidos. */
const PRESET_XP: Readonly<Record<PresetLevel, number>> = { beginner: 1, intermediate: 1.25, advanced: 1.5 };

/**
 * Cuánto suma a la XP quitar cada ayuda en Personalizado. Los pesos están
 * elegidos para que configurar a mano un nivel predefinido dé su mismo
 * multiplicador (Intermedio = frenado media + sin tracción = 1,25).
 */
const XP_BONUS = {
  braking: { full: 0, medium: 0.1, low: 0.2, off: 0.3 } satisfies Record<BrakingAssist, number>,
  traction: { full: 0, medium: 0.07, off: 0.15 } satisfies Record<TractionAssist, number>,
  noAbs: 0.05,
  line: { full: 0, corners: 0.15, off: 0.2 } satisfies Record<LineMode, number>,
};
const MAX_XP_MULTIPLIER = 1.6;

/** Ayudas efectivas según el nivel elegido. */
export function activeAssists(settings: DeepReadonly<AssistSettings>): ActiveAssists {
  if (settings.level === 'custom') return { ...settings.custom, steering: false };
  return { ...ASSIST_PRESETS[settings.level] };
}

/** Sólo los valores elegibles (sin la dirección asistida, que depende del nivel). */
export function assistConfig(assists: ActiveAssists): AssistConfig {
  return {
    braking: assists.braking,
    traction: assists.traction,
    abs: assists.abs,
    line: assists.line,
    lineType: assists.lineType,
  };
}

/** Multiplicador de XP de una configuración de ayudas personalizada. */
export function customXpMultiplier(config: DeepReadonly<AssistConfig>): number {
  const bonus =
    XP_BONUS.braking[config.braking] +
    XP_BONUS.traction[config.traction] +
    (config.abs ? 0 : XP_BONUS.noAbs) +
    // Fija o dinámica da igual: las dos son ayudas (la dinámica es la de los niveles).
    XP_BONUS.line[config.line];
  return Math.min(MAX_XP_MULTIPLIER, Math.round((1 + bonus) * 100) / 100);
}

/** Multiplicador de XP del nivel de ayudas actual. */
export function xpMultiplier(settings: DeepReadonly<AssistSettings>): number {
  return settings.level === 'custom' ? customXpMultiplier(settings.custom) : PRESET_XP[settings.level];
}

/** Nivel de control de tracción de la electrónica del auto (0 = apagado, 1 = nunca patina). */
export const TRACTION_LEVELS: Readonly<Record<TractionAssist, number>> = { off: 0, medium: 0.55, full: 1 };

// ─── Textos para la interfaz ─────────────────────────────────────────────

export const LEVEL_INFO: Readonly<Record<AssistLevel, { name: string; description: string }>> = {
  beginner: {
    name: 'Principiante',
    description:
      'El auto frena solo antes de las curvas, te ayuda a girar hacia el ápice, no derrapa y se pega más al piso. Ideal para empezar.',
  },
  intermediate: {
    name: 'Intermedio',
    description: 'Frenas tú con algo de ayuda. Sin control de tracción: dosifica el acelerador a la salida.',
  },
  advanced: {
    name: 'Avanzado',
    description: 'Ayuda de frenado sólo en emergencias y línea en las curvas que cambia de color según tu velocidad.',
  },
  custom: {
    name: 'Personalizado',
    description: 'Elige cada ayuda. La XP se calcula según lo que quites.',
  },
};

export const BRAKING_LABELS: Readonly<Record<BrakingAssist, string>> = {
  off: 'Desactivada',
  low: 'Baja',
  medium: 'Media',
  full: 'Completa',
};

export const TRACTION_LABELS: Readonly<Record<TractionAssist, string>> = {
  off: 'Desactivado',
  medium: 'Medio',
  full: 'Completo',
};

export const LINE_LABELS: Readonly<Record<LineMode, string>> = {
  off: 'Desactivada',
  corners: 'Sólo curvas',
  full: 'Completa',
};

export const LINE_TYPE_LABELS: Readonly<Record<LineType, string>> = {
  fixed: 'Fija',
  dynamic: 'Dinámica',
};
