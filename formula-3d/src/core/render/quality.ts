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
  /**
   * Filtrado anisotrópico de las texturas (se limita a lo que soporte la GPU).
   * Mantiene nítido el asfalto visto en ángulo rasante, a lo lejos.
   */
  anisotropy: number;
  /**
   * Nivel de detalle de los rivales: hasta qué distancia (m) y cuántos se
   * dibujan con el modelo cercano, y cuánto detalle tiene ese modelo (1 = el
   * del jugador). Así los autos que están al lado nunca se ven "de lejos".
   */
  rivalLod: { nearDistance: number; maxNear: number; nearDetail: number };
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
    anisotropy: 8,
    rivalLod: { nearDistance: 60, maxNear: 5, nearDetail: 0.3 },
  },
  medium: {
    maxPixelRatio: 1.5,
    msaaSamples: 2,
    shadows: 'low',
    postprocessing: true,
    reflectionScale: 0.5,
    particles: 0.6,
    sceneryDensity: 0.6,
    anisotropy: 16,
    rivalLod: { nearDistance: 90, maxNear: 8, nearDetail: 0.36 },
  },
  high: {
    maxPixelRatio: 2,
    msaaSamples: 4,
    shadows: 'high',
    postprocessing: true,
    reflectionScale: 0.5,
    particles: 1,
    sceneryDensity: 1,
    anisotropy: 16,
    rivalLod: { nearDistance: 130, maxNear: 10, nearDetail: 0.46 },
  },
  ultra: {
    maxPixelRatio: 2,
    msaaSamples: 4,
    shadows: 'high',
    postprocessing: true,
    reflectionScale: 1,
    particles: 1.3,
    sceneryDensity: 1.2,
    anisotropy: 16,
    rivalLod: { nearDistance: 170, maxNear: 12, nearDetail: 0.56 },
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
  /** Nombre de la GPU que informa WebGL (puede faltar si el navegador lo oculta). */
  gpu?: string;
}

/** Tipo de GPU según su nombre. */
export type GpuClass = 'software' | 'integrated' | 'apple' | 'discrete' | 'unknown';

export function classifyGpu(name: string | undefined): GpuClass {
  if (!name) return 'unknown';
  const gpu = name.toLowerCase();
  if (/swiftshader|llvmpipe|softpipe|microsoft basic render|software/.test(gpu)) return 'software';
  if (/apple m\d/.test(gpu)) return 'apple';
  if (/geforce|nvidia|quadro|rtx|gtx|radeon rx|radeon pro|arc a\d/.test(gpu)) return 'discrete';
  if (/intel|iris|uhd|hd graphics|mali|adreno|powervr|apple gpu|radeon\(tm\) graphics|radeon graphics|vega \d/.test(gpu)) {
    return 'integrated';
  }
  return 'unknown';
}

/**
 * Calidad inicial según el equipo. Sólo se usa cuando todavía no hay
 * guardado; después el ajuste automático de rendimiento corrige en carrera.
 * - GPU por software o móvil → Baja.
 * - GPU integrada (la mayoría de las notebooks) o desconocida → Media.
 * - GPU dedicada o Apple M, con 6 núcleos o más → Alta.
 */
export function detectQuality(hints: DeviceHints): QualityLevel {
  const gpu = classifyGpu(hints.gpu);
  if (gpu === 'software' || hints.isMobile) return 'low';
  const cores = hints.hardwareConcurrency ?? 4;
  if ((gpu === 'discrete' || gpu === 'apple') && cores >= 6) return 'high';
  return 'medium';
}
