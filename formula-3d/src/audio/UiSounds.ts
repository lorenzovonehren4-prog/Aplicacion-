/**
 * Sonidos de interfaz sintetizados (sin archivos): cortos, limpios y con un
 * carácter "de transmisión deportiva". Cada sonido crea nodos efímeros que se
 * desconectan solos al terminar.
 */

export type UiSound =
  | 'move'
  | 'confirm'
  | 'back'
  | 'locked'
  | 'tab'
  | 'tick'
  | 'whooshIn'
  | 'whooshOut'
  | 'levelUp'
  | 'flip'
  | 'reward'
  | 'rewardBig'
  | 'cheer'
  | 'firework';

/** Separación mínima entre dos sonidos iguales (evita metralla al mantener una tecla). */
const MIN_GAP: Partial<Record<UiSound, number>> = { move: 0.035, tick: 0.03, firework: 0.08 };

export class UiSounds {
  private readonly noise: AudioBuffer;
  private readonly lastPlayed = new Map<UiSound, number>();

  constructor(
    private readonly ctx: AudioContext,
    private readonly output: AudioNode,
  ) {
    this.noise = createNoiseBuffer(ctx, 1.5);
  }

  play(sound: UiSound): void {
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const gap = MIN_GAP[sound];
    const last = this.lastPlayed.get(sound);
    if (gap !== undefined && last !== undefined && now - last < gap) return;
    this.lastPlayed.set(sound, now);

    switch (sound) {
      case 'move':
        this.blip(now, 1850, 2350, 0.045, 0.16, 'sine');
        this.click(now, 5200, 0.012, 0.05);
        break;
      case 'tick':
        this.click(now, 4200, 0.01, 0.08);
        break;
      case 'confirm':
        this.blip(now, 880, 880, 0.07, 0.2, 'triangle');
        this.blip(now + 0.055, 1320, 1480, 0.11, 0.2, 'triangle');
        this.click(now, 3000, 0.02, 0.12);
        break;
      case 'back':
        this.blip(now, 760, 430, 0.12, 0.2, 'triangle');
        break;
      case 'locked':
        this.blip(now, 190, 160, 0.14, 0.18, 'square', 900);
        this.blip(now + 0.08, 170, 140, 0.12, 0.14, 'square', 900);
        break;
      case 'tab':
        this.blip(now, 1200, 1600, 0.06, 0.15, 'sine');
        this.whoosh(now, 0.16, 1800, 4200, 0.08);
        break;
      case 'whooshIn':
        this.whoosh(now, 0.42, 300, 3200, 0.32);
        break;
      case 'whooshOut':
        this.whoosh(now, 0.4, 3000, 500, 0.24);
        break;
      case 'levelUp':
        // Arpegio mayor que sube, con un brillo de ruido al final.
        [523.25, 659.25, 783.99, 1046.5].forEach((hz, i) => this.blip(now + i * 0.075, hz, hz * 1.01, 0.22, 0.17, 'triangle'));
        this.blip(now + 0.3, 1568, 1568, 0.5, 0.09, 'sine');
        this.whoosh(now + 0.22, 0.45, 2500, 9000, 0.1);
        break;
      case 'flip':
        this.whoosh(now, 0.16, 900, 3800, 0.16);
        this.click(now + 0.12, 2600, 0.02, 0.1);
        break;
      case 'reward':
        this.blip(now, 987.77, 987.77, 0.12, 0.14, 'triangle');
        this.blip(now + 0.08, 1318.5, 1318.5, 0.22, 0.14, 'triangle');
        break;
      case 'rewardBig':
        // Épico o legendario: acorde más largo y brillante.
        [659.25, 830.61, 987.77, 1318.5].forEach((hz, i) => this.blip(now + i * 0.05, hz, hz, 0.6, 0.12, 'triangle'));
        this.blip(now + 0.2, 2637, 2637, 0.7, 0.05, 'sine');
        this.whoosh(now, 0.6, 1200, 8000, 0.12);
        break;
      case 'cheer':
        // Ovación del público: rumor que crece y se apaga, con aplausos sueltos.
        this.crowd(now, 3.6, 0.2);
        for (let i = 0; i < 40; i++) this.click(now + 0.2 + Math.random() * 2.8, 1400 + Math.random() * 2400, 0.03, 0.05 + Math.random() * 0.05);
        break;
      case 'firework':
        // Estallido grave y crepitar de chispas.
        this.blip(now, 120, 45, 0.35, 0.22, 'sine');
        this.click(now, 900, 0.18, 0.2);
        for (let i = 0; i < 12; i++) this.click(now + 0.12 + Math.random() * 0.7, 3000 + Math.random() * 4000, 0.015, 0.03 + Math.random() * 0.04);
        break;
    }
  }

  /** Rumor de público: ruido filtrado con una envolvente lenta. */
  private crowd(at: number, duration: number, peak: number): void {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 0.6;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + duration * 0.25);
    gain.gain.setValueAtTime(peak, at + duration * 0.55);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter).connect(gain).connect(this.output);
    source.start(at);
    source.stop(at + duration + 0.05);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  /** Tono con barrido de frecuencia y envolvente rápida. */
  private blip(
    at: number,
    fromHz: number,
    toHz: number,
    duration: number,
    peak: number,
    type: OscillatorType,
    lowpassHz?: number,
  ): void {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(fromHz, at);
    osc.frequency.exponentialRampToValueAtTime(toHz, at + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    let tail: AudioNode = gain;
    osc.connect(gain);
    if (lowpassHz) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpassHz;
      gain.connect(filter);
      tail = filter;
    }
    tail.connect(this.output);
    osc.start(at);
    osc.stop(at + duration + 0.02);
    osc.onended = () => {
      osc.disconnect();
      tail.disconnect();
      gain.disconnect();
    };
  }

  /** Clic corto de ruido filtrado. */
  private click(at: number, hz: number, duration: number, peak: number): void {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = hz;
    filter.Q.value = 1.4;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(peak, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter).connect(gain).connect(this.output);
    source.start(at, Math.random() * 1.2, duration + 0.01);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  /** Barrido de ruido (transiciones de pantalla). */
  private whoosh(at: number, duration: number, fromHz: number, toHz: number, peak: number): void {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(fromHz, at);
    filter.frequency.exponentialRampToValueAtTime(toHz, at + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + duration * 0.45);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter).connect(gain).connect(this.output);
    source.start(at);
    source.stop(at + duration + 0.02);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }
}

/** Ruido blanco (compartido por todos los sonidos que lo usan). */
export function createNoiseBuffer(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}
