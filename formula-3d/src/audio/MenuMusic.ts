/**
 * Música generativa de los menús (sin archivos): se compone mientras suena y
 * nunca se repite igual. Tono menor, 94 bpm, estilo "previa de carrera":
 * - Colchón de acordes con osciladores desafinados y un filtro que respira.
 * - Bajo en la fundamental de cada compás.
 * - Arpegio con notas del acorde elegidas al azar (con silencios) y eco.
 * - Hi-hat de ruido en corcheas y un bombo suave en los tiempos 1 y 3.
 * Los acordes siguen una cadena de Markov (i, VI, III, VII, iv, v…), así la
 * progresión suena bien pero cambia. Se programa con anticipación sobre el
 * reloj del contexto de audio (sin depender de los fotogramas).
 */

import { createNoiseBuffer } from './UiSounds';

const BPM = 94;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
/** Cuánto se programa por adelantado (s) y cada cuánto se revisa (ms). */
const LOOKAHEAD = 0.6;
const TICK_MS = 150;
/** La menor natural a partir de A2 (MIDI 45). */
const ROOT = 45;

/** Acordes (grado → semitonos del acorde sobre la tónica). */
const CHORDS: Readonly<Record<string, readonly number[]>> = {
  i: [0, 3, 7],
  iv: [5, 8, 12],
  v: [7, 10, 14],
  III: [3, 7, 10],
  VI: [8, 12, 15],
  VII: [10, 14, 17],
};

/** A dónde puede ir cada acorde (con repeticiones = más probable). */
const NEXT: Readonly<Record<string, readonly string[]>> = {
  i: ['VI', 'VI', 'iv', 'VII', 'III'],
  VI: ['III', 'VII', 'VII', 'iv', 'i'],
  III: ['VII', 'VI', 'iv'],
  VII: ['i', 'i', 'III', 'VI'],
  iv: ['v', 'VII', 'i', 'VI'],
  v: ['i', 'VI'],
};

const midiToHz = (note: number): number => 440 * Math.pow(2, (note - 69) / 12);

export class MenuMusic {
  private readonly out: GainNode;
  private readonly padFilter: BiquadFilterNode;
  private readonly delay: DelayNode;
  private readonly noise: AudioBuffer;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBar = 0;
  private chord = 'i';
  private bars = 0;
  private stopped = false;

  constructor(
    private readonly ctx: AudioContext,
    destination: AudioNode,
  ) {
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(destination);
    // Filtro del colchón: se abre y se cierra despacio (LFO).
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 900;
    this.padFilter.Q.value = 3;
    this.padFilter.connect(this.out);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 500;
    lfo.connect(lfoDepth).connect(this.padFilter.frequency);
    lfo.start();
    // Eco del arpegio: tresillo de corchea con realimentación.
    this.delay = ctx.createDelay(2);
    this.delay.delayTime.value = BEAT * 0.75;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.38;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2600;
    this.delay.connect(tone).connect(feedback).connect(this.delay);
    tone.connect(this.out);
    this.noise = createNoiseBuffer(ctx, 1);
  }

  /** Arranca con un fundido de entrada. */
  start(): void {
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(this.out.gain.value, now);
    this.out.gain.linearRampToValueAtTime(0.5, now + 2.5);
    this.nextBar = now + 0.1;
    this.timer = setInterval(() => this.schedule(), TICK_MS);
    this.schedule();
  }

  /** Fundido de salida y liberación de los nodos. */
  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(this.out.gain.value, now);
    this.out.gain.linearRampToValueAtTime(0, now + 1.2);
    setTimeout(() => {
      if (this.timer !== null) clearInterval(this.timer);
      this.timer = null;
      this.out.disconnect();
    }, 1400);
  }

  private schedule(): void {
    if (this.stopped) return;
    while (this.nextBar < this.ctx.currentTime + LOOKAHEAD) {
      this.bar(this.nextBar);
      this.nextBar += BAR;
    }
  }

  /** Programa un compás entero a partir de `at`. */
  private bar(at: number): void {
    const notes = CHORDS[this.chord] ?? CHORDS.i ?? [0, 3, 7];
    const intro = this.bars < 2;
    // Colchón: el acorde una octava arriba, dos osciladores desafinados por nota.
    for (const interval of notes) {
      for (const detune of [-7, 7]) this.pad(at, midiToHz(ROOT + 12 + interval), detune);
    }
    // Bajo: fundamental en el 1 y en el "y" del 3.
    const bassNote = midiToHz(ROOT - 12 + (notes[0] ?? 0));
    this.bass(at, bassNote, BEAT * 2.2);
    this.bass(at + BEAT * 2.5, bassNote, BEAT * 1.3);
    if (!intro) {
      // Arpegio de semicorcheas con notas del acorde (y silencios al azar).
      const octaveUp = Math.random() < 0.35 ? 24 : 12;
      for (let step = 0; step < 16; step++) {
        if (Math.random() < 0.38) continue;
        const note = notes[Math.floor(Math.random() * notes.length)] ?? 0;
        const high = Math.random() < 0.25 ? 12 : 0;
        this.pluck(at + step * (BEAT / 4), midiToHz(ROOT + octaveUp + note + high), step % 4 === 0 ? 0.11 : 0.07);
      }
      // Percusión suave.
      for (let eighth = 0; eighth < 8; eighth++) this.hat(at + eighth * (BEAT / 2), eighth % 2 === 1 ? 0.05 : 0.025);
      this.kick(at);
      this.kick(at + BEAT * 2);
    }
    this.bars++;
    // Cada dos compases, acorde nuevo.
    if (this.bars % 2 === 0) {
      const options = NEXT[this.chord] ?? ['i'];
      this.chord = options[Math.floor(Math.random() * options.length)] ?? 'i';
    }
  }

  private pad(at: number, hz: number, detune: number): void {
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = hz;
    osc.detune.value = detune;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(0.022, at + 0.6);
    gain.gain.setValueAtTime(0.022, at + BAR - 0.4);
    gain.gain.linearRampToValueAtTime(0.0001, at + BAR + 0.3);
    osc.connect(gain).connect(this.padFilter);
    osc.start(at);
    osc.stop(at + BAR + 0.35);
    osc.onended = () => gain.disconnect();
  }

  private bass(at: number, hz: number, length: number): void {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = hz;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.16, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(gain).connect(this.out);
    osc.start(at);
    osc.stop(at + length + 0.05);
    osc.onended = () => gain.disconnect();
  }

  private pluck(at: number, hz: number, peak: number): void {
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = hz;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);
    osc.connect(gain);
    gain.connect(this.out);
    gain.connect(this.delay);
    osc.start(at);
    osc.stop(at + 0.3);
    osc.onended = () => gain.disconnect();
  }

  private hat(at: number, peak: number): void {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7500;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(peak * (0.7 + Math.random() * 0.6), at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    source.connect(filter).connect(gain).connect(this.out);
    source.start(at, Math.random() * 0.5, 0.06);
    source.onended = () => {
      filter.disconnect();
      gain.disconnect();
    };
  }

  private kick(at: number): void {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, at);
    osc.frequency.exponentialRampToValueAtTime(42, at + 0.14);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.2, at + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
    osc.connect(gain).connect(this.out);
    osc.start(at);
    osc.stop(at + 0.3);
    osc.onended = () => gain.disconnect();
  }
}
