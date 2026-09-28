/**
 * Motor sintetizado: V6 turbo de 4 tiempos. Ver PLAN.md §4.8.
 *
 * Frecuencia de encendido = rpm / 60 × 3 (tres explosiones por vuelta).
 * Capas: sierra en la fundamental (cuerpo), cuadrada a media frecuencia
 * (graves), sierra al doble (aspereza) y ruido filtrado (admisión), con
 * modulación de amplitud a la frecuencia de encendido (pulsos de combustión).
 * Todo pasa por una distorsión suave y un pasa-bajos que se abre con las rpm.
 *
 * En la Fase 1 se usa para el acelerón del splash; en la Fase 2 se liga a la
 * física (rpm y acelerador en cada fotograma).
 */

import { createNoiseBuffer } from './UiSounds';

const CYLINDERS_PER_REV = 3;
/** Constante de tiempo de una caída de rpm (cambio de marcha), en segundos. */
const DROP_TIME_CONSTANT = 0.018;

/** Punto de una secuencia de acelerones: en `at` segundos, llegar a `rpm` con `throttle`. */
export interface RevKeyframe {
  at: number;
  rpm: number;
  throttle: number;
  /** Cómo se llega: rampa exponencial (acelerar) o caída rápida (cambio de marcha). */
  curve?: 'ramp' | 'drop';
}

function firingHz(rpm: number): number {
  return (Math.max(600, rpm) / 60) * CYLINDERS_PER_REV;
}

function distortionCurve(drive: number): Float32Array<ArrayBuffer> {
  const samples = 1024;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
  }
  return curve;
}

export class EngineSynth {
  private readonly fundamental: OscillatorNode;
  private readonly sub: OscillatorNode;
  private readonly harmonic: OscillatorNode;
  private readonly pulse: OscillatorNode;
  private readonly noise: AudioBufferSourceNode;
  private readonly noiseFilter: BiquadFilterNode;
  private readonly noiseGain: GainNode;
  private readonly harmonicGain: GainNode;
  private readonly lowpass: BiquadFilterNode;
  private readonly output: GainNode;
  private readonly nodes: AudioNode[];
  private started = false;
  private stopped = false;

  constructor(
    private readonly ctx: AudioContext,
    destination: AudioNode,
  ) {
    const mix = ctx.createGain();
    mix.gain.value = 0.5;

    this.fundamental = ctx.createOscillator();
    this.fundamental.type = 'sawtooth';
    const fundamentalGain = ctx.createGain();
    fundamentalGain.gain.value = 0.55;
    this.fundamental.connect(fundamentalGain).connect(mix);

    this.sub = ctx.createOscillator();
    this.sub.type = 'square';
    const subGain = ctx.createGain();
    subGain.gain.value = 0.3;
    this.sub.connect(subGain).connect(mix);

    this.harmonic = ctx.createOscillator();
    this.harmonic.type = 'sawtooth';
    this.harmonicGain = ctx.createGain();
    this.harmonicGain.gain.value = 0.12;
    this.harmonic.connect(this.harmonicGain).connect(mix);

    this.noise = ctx.createBufferSource();
    this.noise.buffer = createNoiseBuffer(ctx, 2);
    this.noise.loop = true;
    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.Q.value = 1.1;
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0.05;
    this.noise.connect(this.noiseFilter).connect(this.noiseGain).connect(mix);

    // Pulsos de combustión: la mezcla oscila en volumen al ritmo del encendido.
    const pulseDepth = ctx.createGain();
    pulseDepth.gain.value = 0.35;
    const pulsed = ctx.createGain();
    pulsed.gain.value = 0.65;
    this.pulse = ctx.createOscillator();
    this.pulse.type = 'sine';
    this.pulse.connect(pulseDepth).connect(pulsed.gain);
    mix.connect(pulsed);

    const shaper = ctx.createWaveShaper();
    shaper.curve = distortionCurve(2.4);
    shaper.oversample = '2x';

    this.lowpass = ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.Q.value = 0.8;

    const body = ctx.createBiquadFilter();
    body.type = 'peaking';
    body.frequency.value = 260;
    body.gain.value = 5;
    body.Q.value = 0.9;

    this.output = ctx.createGain();
    this.output.gain.value = 0;
    pulsed.connect(shaper).connect(this.lowpass).connect(body).connect(this.output).connect(destination);

    this.nodes = [mix, fundamentalGain, subGain, this.harmonicGain, this.noiseFilter, this.noiseGain, pulseDepth, pulsed, shaper, this.lowpass, body, this.output];
    this.applyRpm(4000, 0, ctx.currentTime, 0);
    this.output.gain.setValueAtTime(0, ctx.currentTime);
  }

  /** Arranca los osciladores (el volumen sube según el acelerador). */
  start(): void {
    if (this.started) return;
    this.started = true;
    const now = this.ctx.currentTime;
    for (const source of [this.fundamental, this.sub, this.harmonic, this.pulse, this.noise]) source.start(now);
  }

  /**
   * Programa una secuencia de acelerones relativa a ahora. Cada tramo se acerca
   * a su objetivo con una curva exponencial (como sube un motor real); una
   * caída (`drop`) es casi instantánea. Devuelve la duración total (s).
   */
  playSequence(keyframes: readonly RevKeyframe[]): number {
    this.start();
    const base = this.ctx.currentTime + 0.02;
    let previous = 0;
    let previousWasDrop = false;
    for (const frame of keyframes) {
      if (frame.curve === 'drop') {
        this.applyRpm(frame.rpm, frame.throttle, base + frame.at, DROP_TIME_CONSTANT);
      } else {
        // Tras una caída se espera a que termine antes de volver a subir.
        const start = previous + (previousWasDrop ? DROP_TIME_CONSTANT * 3 : 0);
        const span = Math.max(0.03, frame.at - start);
        this.applyRpm(frame.rpm, frame.throttle, base + start, span / 3);
      }
      previous = frame.at;
      previousWasDrop = frame.curve === 'drop';
    }
    return previous;
  }

  /** Baja el volumen y libera todo al terminar. */
  stop(fadeSeconds = 0.25): void {
    if (this.stopped) return;
    this.stopped = true;
    const now = this.ctx.currentTime;
    this.output.gain.cancelScheduledValues(now);
    this.output.gain.setTargetAtTime(0, now, fadeSeconds / 4);
    const endAt = now + fadeSeconds + 0.05;
    for (const source of [this.fundamental, this.sub, this.harmonic, this.pulse, this.noise]) {
      if (this.started) source.stop(endAt);
    }
    this.fundamental.onended = () => this.disconnectAll();
    if (!this.started) this.disconnectAll();
  }

  private disconnectAll(): void {
    for (const source of [this.fundamental, this.sub, this.harmonic, this.pulse, this.noise]) source.disconnect();
    for (const node of this.nodes) node.disconnect();
  }

  /**
   * Lleva todos los parámetros al estado de `rpm` y `throttle` empezando en
   * `at`, con constante de tiempo `timeConstant` (0 = inmediato).
   */
  private applyRpm(rpm: number, throttle: number, at: number, timeConstant: number): void {
    const hz = firingHz(rpm);
    const load = Math.min(1, Math.max(0, throttle));
    const targets: Array<[AudioParam, number]> = [
      [this.fundamental.frequency, hz],
      [this.sub.frequency, hz / 2],
      [this.harmonic.frequency, hz * 2],
      [this.pulse.frequency, hz],
      [this.noiseFilter.frequency, hz * 2.2],
      [this.lowpass.frequency, 700 + rpm * 0.32 + load * 1800],
      [this.harmonicGain.gain, 0.06 + (rpm / 13000) * 0.18],
      [this.noiseGain.gain, 0.02 + load * 0.09],
      [this.output.gain, 0.12 + load * 0.28],
    ];
    for (const [param, value] of targets) {
      if (timeConstant <= 0) param.setValueAtTime(value, at);
      else param.setTargetAtTime(value, at, timeConstant);
    }
  }
}
