/**
 * Ajuste automático de rendimiento: mide los FPS reales en carrera y, si el
 * equipo no llega al objetivo, baja primero la resolución interna y después
 * el nivel de calidad (sombras, posprocesado, MSAA). Si el objetivo se cumple
 * con holgura durante un buen rato, vuelve a subir la resolución de a poco
 * (nunca la calidad: eso lo decide el jugador en Ajustes). Si una subida hace
 * caer los FPS otra vez, no vuelve a intentarlo: así no oscila.
 *
 * Lógica pura: recibe la duración de cada cuadro y devuelve una decisión. La
 * pantalla de carrera la aplica en los Ajustes (queda guardada).
 */

import { QUALITY_LEVELS, type QualityLevel } from './quality';

export type GovernorDecision =
  | { kind: 'resolution'; scale: number }
  | { kind: 'quality'; quality: QualityLevel; scale: number };

export interface GovernorState {
  quality: QualityLevel;
  resolutionScale: number;
  /** FPS objetivo (0 = sin límite: se toma 60). */
  fpsTarget: number;
}

/** Segundos a ignorar después de empezar o de un cambio (compilación de shaders, cachés). */
const WARMUP = 3;
/** Ventana de medición (s). */
const WINDOW = 2.5;
/** Por debajo de esta fracción del objetivo se baja un escalón. */
const DOWN_AT = 0.82;
/** Desde esta fracción del objetivo, sostenida, se prueba a subir la resolución. */
const UP_AT = 0.97;
/** Tiempo cumpliendo el objetivo antes de subir la resolución (s). */
const UP_AFTER = 20;
/** Si los FPS caen antes de este tiempo tras una subida, la subida falló (s). */
const UP_PROBATION = 15;
const MIN_SCALE = 0.6;
/** Escalón de resolución al bajar y al subir (se sube más despacio). */
const SCALE_STEP = 0.15;
const UP_STEP = 0.05;

export class PerformanceGovernor {
  private warmup = WARMUP;
  private windowTime = 0;
  private windowFrames = 0;
  private headroomTime = 0;
  /** Tiempo desde la última subida de resolución (s); Infinity si no hubo. */
  private sinceUp = Infinity;
  /** Una subida ya hizo caer los FPS: no se vuelve a subir en esta sesión. */
  private upLocked = false;

  /** Vuelve a esperar el calentamiento (tras una pausa o un cambio de ajustes). */
  reset(): void {
    this.warmup = WARMUP;
    this.windowTime = 0;
    this.windowFrames = 0;
    this.headroomTime = 0;
  }

  /**
   * Registra un cuadro dibujado.
   * @param seconds duración del cuadro
   * @returns un cambio a aplicar, o null
   */
  sample(seconds: number, state: GovernorState): GovernorDecision | null {
    // Cuadros absurdos (pestaña oculta, depurador): no cuentan.
    if (seconds <= 0 || seconds > 0.5) return null;
    if (this.warmup > 0) {
      this.warmup -= seconds;
      return null;
    }
    this.windowTime += seconds;
    this.windowFrames++;
    this.sinceUp += seconds;
    if (this.windowTime < WINDOW) return null;

    const fps = this.windowFrames / this.windowTime;
    const span = this.windowTime;
    this.windowTime = 0;
    this.windowFrames = 0;
    const target = state.fpsTarget > 0 ? state.fpsTarget : 60;

    if (fps < target * DOWN_AT) {
      if (this.sinceUp < UP_PROBATION) this.upLocked = true;
      const decision = this.stepDown(state);
      if (decision) this.reset();
      return decision;
    }
    if (fps >= target * UP_AT && state.resolutionScale < 1 && !this.upLocked) {
      this.headroomTime += span;
      if (this.headroomTime >= UP_AFTER) {
        this.reset();
        this.sinceUp = 0;
        return { kind: 'resolution', scale: Math.min(1, round(state.resolutionScale + UP_STEP)) };
      }
    } else {
      this.headroomTime = 0;
    }
    return null;
  }

  private stepDown(state: GovernorState): GovernorDecision | null {
    if (state.resolutionScale - SCALE_STEP >= MIN_SCALE - 1e-6) {
      return { kind: 'resolution', scale: round(state.resolutionScale - SCALE_STEP) };
    }
    const index = QUALITY_LEVELS.indexOf(state.quality);
    const lower = QUALITY_LEVELS[index - 1];
    if (!lower) return null;
    // Al bajar de nivel, la resolución vuelve a un punto intermedio.
    return { kind: 'quality', quality: lower, scale: 0.85 };
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
