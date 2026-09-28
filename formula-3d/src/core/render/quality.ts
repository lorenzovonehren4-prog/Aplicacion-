/**
 * Niveles de calidad gráfica. Son datos puros: el guardado los usa para los
 * valores por defecto y el `RenderHost` / las escenas para configurarse.
 */

export const QUALITY_LEVELS = ['low', 'medium', 'high', 'ultra'] as const;
export type QualityLevel = (typeof QUALITY_LEVELS)[number];

export const SHADOW_LEVELS = ['off', 'low', 'high'] as const;
export type ShadowLevel = (typeof SHADOW_LEVELS)[number];

/** FPS objetivo; 0 = lo que dé el monitor. */
export const FPS_TARGETS = [30, 60, 0] as const;
export type FpsTarget = (typeof FPS_TARGETS)[number];

export interface QualityPreset {
  /** Densidad de píxeles máxima (se multiplica por la escala de resolución). */
  maxPixelRatio: number;
  /** Muestras de MSAA del render target principal. */
  msaaSamples: number;
  /** Sombras con las que arranca este nivel. */
  shadows: ShadowLevel;
  /** Postprocesado con el que arranca este nivel. */
  postprocessing: boolean;
  /** Resolución de los reflejos planos (fracción del tamaño de pantalla); 0 = sin reflejos. */
  reflectionScale: number;
  /** Multiplicador de partículas (Fase 9). */
  particles: number;
  /** Densidad de árboles y público (Fase 2). */
  sceneryDensity: number;
}

export const QUALITY_PRESETS: Readonly<Record<QualityLevel, QualityPreset>> = {
  low: {
    maxPixelRatio: 1,
    msaaSamples: 0,
    shadows: 'off',
    postprocessing: false,
    reflectionScale: 0,
    particles: 0.3,
    sceneryDensity: 0.35,
  },
  medium: {
    maxPixelRatio: 1.25,
    msaaSamples: 2,
    shadows: 'low',
    postprocessing: true,
    reflectionScale: 0.5,
    particles: 0.6,
    sceneryDensity: 0.6,
  },
  high: {
    maxPixelRatio: 1.5,
    msaaSamples: 4,
    shadows: 'high',
    postprocessing: true,
    reflectionScale: 0.5,
    particles: 1,
    sceneryDensity: 1,
  },
  ultra: {
    maxPixelRatio: 2,
    msaaSamples: 4,
    shadows: 'high',
    postprocessing: true,
    reflectionScale: 1,
    particles: 1.3,
    sceneryDensity: 1.2,
  },
};

/** Tamaño del mapa de sombras según el nivel de sombras y la calidad general. */
export function shadowMapSize(shadows: ShadowLevel, quality: QualityLevel): number {
  if (shadows === 'off') return 0;
  if (shadows === 'low') return 1024;
  return quality === 'ultra' ? 4096 : 2048;
}

export interface DeviceHints {
  hardwareConcurrency?: number;
  isMobile?: boolean;
}

/**
 * Calidad inicial según el equipo: móviles y equipos con pocos núcleos empiezan
 * en Media; el resto en Alta. Sólo se usa cuando todavía no hay guardado.
 */
export function detectQuality(hints: DeviceHints): QualityLevel {
  if (hints.isMobile) return 'medium';
  if ((hints.hardwareConcurrency ?? 8) <= 4) return 'medium';
  return 'high';
}
