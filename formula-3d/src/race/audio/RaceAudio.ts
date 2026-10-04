/**
 * Sonido en pista: el motor en tiempo real (bus del motor) y los efectos
 * (bus de efectos): chirrido de neumáticos al derrapar o bloquear, vibración
 * de los pianos, crujido de la grava y el pasto, viento que crece con la
 * velocidad, golpe seco al cambiar de marcha e impactos contra los muros.
 * Los motores de los rivales suenan en 3D (ver `BotEngines`).
 *
 * Todo es síntesis con ruido filtrado: no hay archivos de audio.
 */

import type { AudioManager } from '../../audio/AudioManager';
import { EngineSynth } from '../../audio/EngineSynth';
import { createNoiseBuffer } from '../../audio/UiSounds';
import { clamp } from '../../core/utils/math';
import type { Telemetry, Vehicle } from '../physics/Vehicle';
import { BotEngines, type Listener } from './BotEngines';

/** Constante de tiempo de los cambios de volumen de los efectos continuos (s). */
const SMOOTH = 0.05;

interface Loop {
  source: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
}

export interface SurfaceMix {
  /** 0–1: ruedas en pasto. */
  grass: number;
  /** 0–1: ruedas en grava. */
  gravel: number;
  /** 0–1: ruedas sobre pianos. */
  kerb: number;
}

class EffectsGraph {
  private readonly nodes: AudioNode[] = [];
  private readonly sources: AudioScheduledSourceNode[] = [];
  readonly skid: Loop;
  readonly wind: Loop;
  readonly gravel: Loop;
  readonly kerb: Loop;
  private readonly kerbPulse: OscillatorNode;
  private readonly noise: AudioBuffer;

  constructor(
    private readonly ctx: AudioContext,
    private readonly out: AudioNode,
  ) {
    this.noise = createNoiseBuffer(ctx, 2);
    this.skid = this.loop('bandpass', 1100, 3.2);
    this.wind = this.loop('lowpass', 500, 0.6);
    this.gravel = this.loop('highpass', 1600, 0.7);
    this.kerb = this.loop('lowpass', 180, 1.2);

    // Los pianos vibran a pulsos: un oscilador cuadrado modula el volumen entre
    // 0 y 1 antes del control de nivel (así, con nivel 0, no suena nada).
    const pulsed = ctx.createGain();
    pulsed.gain.value = 0.5;
    this.kerb.filter.disconnect();
    this.kerb.filter.connect(pulsed).connect(this.kerb.gain);
    this.kerbPulse = ctx.createOscillator();
    this.kerbPulse.type = 'square';
    const depth = ctx.createGain();
    depth.gain.value = 0.5;
    this.kerbPulse.connect(depth).connect(pulsed.gain);
    this.nodes.push(pulsed, depth);
    this.kerbPulse.start();
    this.sources.push(this.kerbPulse);
  }

  update(tel: Telemetry, surfaces: SurfaceMix): void {
    const now = this.ctx.currentTime;
    const speed = tel.speed;
    const moving = clamp(speed / 12, 0, 1);

    const skid = clamp(Math.max(tel.slide * 1.3, tel.lockup, tel.wheelspin * 0.9), 0, 1) * moving * (1 - surfaces.gravel);
    this.skid.gain.gain.setTargetAtTime(skid * 0.55, now, SMOOTH);
    this.skid.filter.frequency.setTargetAtTime(900 + skid * 700 + tel.lockup * 400, now, SMOOTH);

    const wind = clamp(speed / 90, 0, 1);
    this.wind.gain.gain.setTargetAtTime(wind * wind * 0.28, now, 0.15);
    this.wind.filter.frequency.setTargetAtTime(300 + wind * 1400, now, 0.15);

    const rough = Math.max(surfaces.gravel, surfaces.grass * 0.45) * moving;
    this.gravel.gain.gain.setTargetAtTime(rough * 0.4, now, SMOOTH);
    this.gravel.filter.frequency.setTargetAtTime(surfaces.gravel > surfaces.grass ? 1600 : 700, now, 0.1);

    const kerb = surfaces.kerb * moving;
    this.kerb.gain.gain.setTargetAtTime(kerb * 0.55, now, 0.02);
    // Una franja de piano cada ~1 m: la frecuencia sube con la velocidad.
    this.kerbPulse.frequency.setTargetAtTime(clamp(speed / 1.1, 6, 80), now, 0.05);
  }

  /** Golpe contra un muro: ruido seco + un "bum" grave. */
  impact(strength: number): void {
    const now = this.ctx.currentTime;
    const level = clamp(strength, 0.15, 1);
    const burst = this.ctx.createBufferSource();
    burst.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900 + level * 2200;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(level * 0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35 + level * 0.3);
    burst.connect(filter).connect(gain).connect(this.out);
    burst.start(now, Math.random() * 1.5, 0.8);

    const thump = this.ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(95, now);
    thump.frequency.exponentialRampToValueAtTime(38, now + 0.25);
    const thumpGain = this.ctx.createGain();
    thumpGain.gain.setValueAtTime(level * 0.8, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    thump.connect(thumpGain).connect(this.out);
    thump.start(now);
    thump.stop(now + 0.32);
    const cleanup = (): void => {
      for (const node of [burst, filter, gain, thump, thumpGain]) node.disconnect();
    };
    thump.onended = cleanup;
  }

  /** Una luz del semáforo: pitido corto y seco. */
  startLight(): void {
    const now = this.ctx.currentTime;
    const tone = this.ctx.createOscillator();
    tone.type = 'square';
    tone.frequency.value = 880;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2400;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.01);
    gain.gain.setValueAtTime(0.22, now + 0.16);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    tone.connect(filter).connect(gain).connect(this.out);
    tone.start(now);
    tone.stop(now + 0.26);
    tone.onended = () => {
      tone.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  /** ¡Apagadas!: el público estalla (ruido filtrado que crece y se apaga). */
  lightsOut(): void {
    const now = this.ctx.currentTime;
    const roar = this.ctx.createBufferSource();
    roar.buffer = this.noise;
    roar.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    filter.Q.value = 0.6;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.6);
    roar.connect(filter).connect(gain).connect(this.out);
    roar.start(now, Math.random() * 1.5);
    roar.stop(now + 2.7);
    roar.onended = () => {
      roar.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  /**
   * Pistola de boxes: el "brrrt" de la llave neumática (ruido agudo que
   * vibra a ~50 Hz) con el silbido del motor de aire que sube.
   */
  gun(): void {
    const now = this.ctx.currentTime;
    const length = 0.24;
    const rattle = this.ctx.createBufferSource();
    rattle.buffer = this.noise;
    const band = this.ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 2600;
    band.Q.value = 1.4;
    const chop = this.ctx.createGain();
    chop.gain.value = 0.5;
    const lfo = this.ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 52;
    const depth = this.ctx.createGain();
    depth.gain.value = 0.5;
    lfo.connect(depth).connect(chop.gain);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.32, now + 0.015);
    gain.gain.setValueAtTime(0.32, now + length - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + length);
    rattle.connect(band).connect(chop).connect(gain).connect(this.out);
    const whine = this.ctx.createOscillator();
    whine.type = 'sawtooth';
    whine.frequency.setValueAtTime(1500, now);
    whine.frequency.exponentialRampToValueAtTime(2700, now + length);
    const whineGain = this.ctx.createGain();
    whineGain.gain.setValueAtTime(0.0001, now);
    whineGain.gain.exponentialRampToValueAtTime(0.035, now + 0.03);
    whineGain.gain.exponentialRampToValueAtTime(0.001, now + length);
    whine.connect(whineGain).connect(this.out);
    rattle.start(now, Math.random() * 1.5, length + 0.02);
    lfo.start(now);
    lfo.stop(now + length + 0.02);
    whine.start(now);
    whine.stop(now + length + 0.02);
    whine.onended = () => {
      for (const node of [rattle, band, chop, lfo, depth, gain, whine, whineGain]) node.disconnect();
    };
  }

  /** Gato de boxes: golpe metálico corto (al levantar y al bajar el auto). */
  jack(): void {
    const now = this.ctx.currentTime;
    const thump = this.ctx.createOscillator();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime(160, now);
    thump.frequency.exponentialRampToValueAtTime(70, now + 0.12);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    thump.connect(gain).connect(this.out);
    const click = this.ctx.createBufferSource();
    click.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2500;
    const clickGain = this.ctx.createGain();
    clickGain.gain.setValueAtTime(0.18, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    click.connect(filter).connect(clickGain).connect(this.out);
    thump.start(now);
    thump.stop(now + 0.18);
    click.start(now, Math.random(), 0.06);
    thump.onended = () => {
      for (const node of [thump, gain, click, filter, clickGain]) node.disconnect();
    };
  }

  /** El flap del DRS se abre: soplido neumático corto. */
  drs(): void {
    const now = this.ctx.currentTime;
    const puff = this.ctx.createBufferSource();
    puff.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.exponentialRampToValueAtTime(900, now + 0.18);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    puff.connect(filter).connect(gain).connect(this.out);
    puff.start(now, Math.random(), 0.22);
    puff.onended = () => {
      puff.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  /**
   * Bandera a cuadros: ovación del público (ruido de banda ancha que crece y se
   * apaga, con "olas") y un acorde de fanfarria corto.
   */
  flag(): void {
    const now = this.ctx.currentTime;
    const crowd = this.ctx.createBufferSource();
    crowd.buffer = this.noise;
    crowd.loop = true;
    const band = this.ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1100;
    band.Q.value = 0.6;
    const swell = this.ctx.createGain();
    swell.gain.setValueAtTime(0.0001, now);
    swell.gain.exponentialRampToValueAtTime(0.22, now + 0.6);
    swell.gain.setValueAtTime(0.22, now + 1.6);
    swell.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);
    // Olas de la tribuna.
    const wave = this.ctx.createOscillator();
    wave.frequency.value = 1.7;
    const waveDepth = this.ctx.createGain();
    waveDepth.gain.value = 0.06;
    wave.connect(waveDepth).connect(swell.gain);
    crowd.connect(band).connect(swell).connect(this.out);
    crowd.start(now, Math.random());
    crowd.stop(now + 4.3);
    wave.start(now);
    wave.stop(now + 4.3);
    crowd.onended = () => {
      crowd.disconnect();
      band.disconnect();
      swell.disconnect();
      wave.disconnect();
      waveDepth.disconnect();
    };
    // Fanfarria: acorde mayor con metales sintéticos (sierra filtrada).
    for (const [i, hz] of [392, 493.88, 587.33, 783.99].entries()) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = hz;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(700, now);
      filter.frequency.linearRampToValueAtTime(2400, now + 0.25);
      const gain = this.ctx.createGain();
      const start = now + i * 0.06;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.05, start + 0.05);
      gain.gain.setValueAtTime(0.05, now + 0.9);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
      osc.connect(filter).connect(gain).connect(this.out);
      osc.start(start);
      osc.stop(now + 1.65);
      osc.onended = () => {
        filter.disconnect();
        gain.disconnect();
      };
    }
  }

  /** Radio del equipo: "chasquido" de apertura del canal. */
  radio(): void {
    const now = this.ctx.currentTime;
    const click = this.ctx.createBufferSource();
    click.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 1.4;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.setValueAtTime(0.14, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    const beep = this.ctx.createOscillator();
    beep.frequency.value = 1250;
    const beepGain = this.ctx.createGain();
    beepGain.gain.setValueAtTime(0, now + 0.12);
    beepGain.gain.linearRampToValueAtTime(0.06, now + 0.13);
    beepGain.gain.setValueAtTime(0.06, now + 0.2);
    beepGain.gain.linearRampToValueAtTime(0, now + 0.22);
    click.connect(filter).connect(gain).connect(this.out);
    beep.connect(beepGain).connect(this.out);
    click.start(now, Math.random(), 0.13);
    beep.start(now + 0.12);
    beep.stop(now + 0.24);
    beep.onended = () => {
      for (const node of [click, filter, gain, beep, beepGain]) node.disconnect();
    };
  }

  /** "Clac" corto de la caja al pasar de marcha. */
  shift(): void {
    const now = this.ctx.currentTime;
    const click = this.ctx.createBufferSource();
    click.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2400;
    filter.Q.value = 2;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    click.connect(filter).connect(gain).connect(this.out);
    click.start(now, Math.random(), 0.08);
    click.onended = () => {
      click.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  /** Silencia los efectos continuos (pausa). */
  silence(): void {
    const now = this.ctx.currentTime;
    for (const loop of [this.skid, this.wind, this.gravel, this.kerb]) loop.gain.gain.setTargetAtTime(0, now, 0.03);
  }

  dispose(): void {
    const now = this.ctx.currentTime;
    for (const loop of [this.skid, this.wind, this.gravel, this.kerb]) loop.gain.gain.setTargetAtTime(0, now, 0.03);
    const end = now + 0.15;
    for (const source of this.sources) source.stop(end);
    this.kerbPulse.onended = () => {
      for (const source of this.sources) source.disconnect();
      for (const node of this.nodes) node.disconnect();
    };
  }

  private loop(type: BiquadFilterType, frequency: number, q: number): Loop {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(this.out);
    // Cada bucle arranca en un punto distinto del ruido: no suenan "en fase".
    source.start(this.ctx.currentTime, Math.random() * 2);
    this.sources.push(source);
    this.nodes.push(filter, gain);
    return { source, filter, gain };
  }
}

export class RaceAudio {
  private engine: EngineSynth | null = null;
  private effects: EffectsGraph | null = null;
  private bots: BotEngines | null = null;
  private lastGear = 0;
  private muted = false;

  constructor(private readonly audio: AudioManager) {}

  /**
   * Llamar cada fotograma. Crea el grafo en cuanto el audio está habilitado.
   * `impact` es el choque más fuerte (m/s) de los pasos de física de este fotograma.
   */
  update(tel: Telemetry, surfaces: SurfaceMix, impact: number): void {
    if (this.muted) return;
    this.ensure();
    if (!this.engine || !this.effects) return;
    // Con el limitador, el corte de inyección hace "tartamudear" las rpm.
    const rpm = tel.limiter ? tel.rpm - (Math.random() < 0.5 ? 350 : 0) : tel.rpm;
    this.engine.setState(rpm, tel.throttle);
    this.effects.update(tel, surfaces);
    if (tel.gear !== this.lastGear) {
      if (this.lastGear !== 0 && tel.gear > 0) this.effects.shift();
      this.lastGear = tel.gear;
    }
    if (impact > 1.5) this.effects.impact(impact / 25);
  }

  /** Motores de los rivales: la cámara es el oyente. */
  updateTraffic(listener: Listener, bots: readonly Vehicle[]): void {
    if (this.muted || bots.length === 0) return;
    this.ensure();
    this.bots?.update(listener, bots);
  }

  /** Sonidos de un momento de la carrera (semáforo, DRS, radio, boxes). */
  cue(kind: 'light' | 'lightsOut' | 'drs' | 'radio' | 'flag' | 'gun' | 'jack'): void {
    this.ensure();
    const effects = this.effects;
    if (!effects) return;
    switch (kind) {
      case 'light':
        effects.startLight();
        break;
      case 'lightsOut':
        effects.lightsOut();
        break;
      case 'drs':
        effects.drs();
        break;
      case 'radio':
        effects.radio();
        break;
      case 'flag':
        effects.flag();
        break;
      case 'gun':
        effects.gun();
        break;
      case 'jack':
        effects.jack();
        break;
    }
  }

  /** Pausa: el motor baja a ralentí y los efectos se callan. */
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.engine?.setState(4000, 0);
      this.effects?.silence();
      this.bots?.silence();
    }
  }

  dispose(): void {
    this.engine?.stop(0.3);
    this.effects?.dispose();
    this.bots?.dispose();
    this.engine = null;
    this.effects = null;
    this.bots = null;
  }

  private ensure(): void {
    if (this.engine) return;
    const ctx = this.audio.context;
    const engineBus = this.audio.bus('engine');
    const effectsBus = this.audio.bus('effects');
    if (!ctx || !engineBus || !effectsBus || ctx.state !== 'running') return;
    this.engine = new EngineSynth(ctx, engineBus);
    this.effects = new EffectsGraph(ctx, effectsBus);
    this.bots = new BotEngines(ctx, engineBus);
  }
}
