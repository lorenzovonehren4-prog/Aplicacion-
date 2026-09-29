/**
 * Audio del juego con Web Audio. Ver PLAN.md §4.8.
 *
 * Grafo: fuentes → buses (motor, efectos, interfaz, música)
 * → master → compresor → salida. El contexto se crea en el primer gesto del
 * usuario (los navegadores bloquean el audio antes de eso).
 */

import type { AudioSettings } from '../core/save/schema';
import { UiSounds } from './UiSounds';

export type AudioBus = 'engine' | 'effects' | 'ui' | 'music';

/** Tiempo de las rampas de volumen (s): los cambios nunca hacen "clic". */
const VOLUME_RAMP = 0.08;

/** Curva perceptual: un slider al 50 % suena "a la mitad". */
function perceptual(volume: number): number {
  return volume * volume;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly buses = new Map<AudioBus, GainNode>();
  private volumes: AudioSettings;
  private uiSounds: UiSounds | null = null;

  constructor(volumes: AudioSettings) {
    this.volumes = { ...volumes };
  }

  /** Contexto de audio (null hasta el primer gesto del usuario). */
  get context(): AudioContext | null {
    return this.ctx;
  }

  /** Sonidos de interfaz (silenciosos si el audio aún no está listo). */
  get ui(): UiSounds | null {
    return this.uiSounds;
  }

  /**
   * Crea o reanuda el contexto. Debe llamarse desde un gesto del usuario
   * (tecla o clic). Es seguro llamarla muchas veces.
   */
  unlock(): void {
    if (typeof AudioContext === 'undefined') return;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext({ latencyHint: 'interactive' });
      } catch (error) {
        console.warn('[Audio] No se pudo crear el contexto de audio.', error);
        return;
      }
      this.buildGraph(this.ctx);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch((error: unknown) => console.warn('[Audio] No se pudo reanudar el audio.', error));
    }
  }

  /** Nodo de entrada de un bus (null si el audio no está listo). */
  bus(name: AudioBus): GainNode | null {
    return this.buses.get(name) ?? null;
  }

  setVolumes(volumes: AudioSettings): void {
    this.volumes = { ...volumes };
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(perceptual(volumes.master), now, VOLUME_RAMP / 3);
    this.buses.get('engine')?.gain.setTargetAtTime(perceptual(volumes.engine), now, VOLUME_RAMP / 3);
    this.buses.get('effects')?.gain.setTargetAtTime(perceptual(volumes.effects), now, VOLUME_RAMP / 3);
    this.buses.get('ui')?.gain.setTargetAtTime(perceptual(volumes.ui), now, VOLUME_RAMP / 3);
    this.buses.get('music')?.gain.setTargetAtTime(perceptual(volumes.music), now, VOLUME_RAMP / 3);
  }

  /** Pausa todo el audio (pestaña oculta). */
  suspend(): void {
    if (this.ctx?.state === 'running') {
      this.ctx.suspend().catch((error: unknown) => console.warn('[Audio] No se pudo pausar el audio.', error));
    }
  }

  /** Reanuda el audio (pestaña visible otra vez). */
  resume(): void {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume().catch((error: unknown) => console.warn('[Audio] No se pudo reanudar el audio.', error));
    }
  }

  dispose(): void {
    const ctx = this.ctx;
    this.ctx = null;
    this.uiSounds = null;
    this.buses.clear();
    ctx?.close().catch(() => undefined);
  }

  private buildGraph(ctx: AudioContext): void {
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -10;
    compressor.knee.value = 8;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.2;
    compressor.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.gain.value = perceptual(this.volumes.master);
    this.master.connect(compressor);

    const engine = ctx.createGain();
    engine.gain.value = perceptual(this.volumes.engine);
    engine.connect(this.master);
    this.buses.set('engine', engine);

    const effects = ctx.createGain();
    effects.gain.value = perceptual(this.volumes.effects);
    effects.connect(this.master);
    this.buses.set('effects', effects);

    const ui = ctx.createGain();
    ui.gain.value = perceptual(this.volumes.ui);
    ui.connect(this.master);
    this.buses.set('ui', ui);

    const music = ctx.createGain();
    music.gain.value = perceptual(this.volumes.music);
    music.connect(this.master);
    this.buses.set('music', music);

    this.uiSounds = new UiSounds(ctx, ui);
  }
}
