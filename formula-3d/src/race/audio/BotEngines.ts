/**
 * Motores de los rivales con audio 3D (PannerNode). Sintetizar un motor por
 * bot sería caro y confuso: sólo suenan los más cercanos (`VOICES`), cada uno
 * con dos osciladores y un filtro, ubicados en el espacio y con efecto
 * Doppler (el "iiiuuuu" al pasar). Cuando cambia quién está más cerca, la voz
 * se desvanece y pasa al nuevo auto.
 */

import { firingHz } from '../../audio/EngineSynth';
import { clamp } from '../../core/utils/math';
import type { Vehicle } from '../physics/Vehicle';

/** Voces simultáneas. */
const VOICES = 3;
/** Distancia máxima a la que se oye un rival (m). */
const HEARING = 260;
/** Velocidad del sonido (m/s) para el Doppler. */
const SOUND_SPEED = 343;
/** Volumen de cada voz a plena carga. */
const LEVEL = 0.32;
/** Suavizado de los parámetros (s). */
const SMOOTH = 0.04;

/** Oyente: la cámara (posición, hacia dónde mira y su "arriba") y su velocidad. */
export interface Listener {
  x: number;
  y: number;
  z: number;
  forwardX: number;
  forwardY: number;
  forwardZ: number;
  upX: number;
  upY: number;
  upZ: number;
  /** Velocidad del oyente en el plano (m/s). */
  vx: number;
  vz: number;
}

interface Voice {
  fundamental: OscillatorNode;
  sub: OscillatorNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  panner: PannerNode;
  /** Auto que suena (índice en la lista de bots) o −1. */
  car: number;
}

export class BotEngines {
  private readonly voices: Voice[] = [];
  private readonly nearest: number[] = [];
  private readonly velocity = { x: 0, z: 0 };

  constructor(
    private readonly ctx: AudioContext,
    destination: AudioNode,
  ) {
    const now = ctx.currentTime;
    for (let i = 0; i < VOICES; i++) {
      const fundamental = ctx.createOscillator();
      fundamental.type = 'sawtooth';
      const sub = ctx.createOscillator();
      sub.type = 'square';
      const subGain = ctx.createGain();
      subGain.gain.value = 0.45;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 0.9;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const panner = ctx.createPanner();
      // "equalpower" es mucho más barato que HRTF y alcanza para ubicar un motor.
      panner.panningModel = 'equalpower';
      panner.distanceModel = 'inverse';
      panner.refDistance = 7;
      panner.rolloffFactor = 1.3;
      panner.maxDistance = 2000;
      fundamental.connect(filter);
      sub.connect(subGain).connect(filter);
      filter.connect(gain).connect(panner).connect(destination);
      fundamental.start(now);
      sub.start(now);
      this.voices.push({ fundamental, sub, filter, gain, panner, car: -1 });
    }
  }

  /**
   * Cada fotograma: ubica al oyente y asigna las voces a los rivales más cercanos.
   * @param bots autos rivales
   */
  update(listener: Listener, bots: readonly Vehicle[]): void {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    this.placeListener(listener, now);

    // Los más cercanos dentro del alcance.
    this.nearest.length = 0;
    const distance = (i: number): number => {
      const car = bots[i];
      return car ? Math.hypot(car.x - listener.x, car.z - listener.z) : Infinity;
    };
    for (let i = 0; i < bots.length; i++) {
      if (distance(i) < HEARING) this.nearest.push(i);
    }
    this.nearest.sort((a, b) => distance(a) - distance(b));
    this.nearest.length = Math.min(this.nearest.length, VOICES);

    // Las voces que siguen teniendo su auto lo conservan (sin cortes); las libres toman los nuevos.
    for (const voice of this.voices) {
      if (voice.car >= 0 && !this.nearest.includes(voice.car)) voice.car = -1;
    }
    for (const car of this.nearest) {
      if (this.voices.some((voice) => voice.car === car)) continue;
      const free = this.voices.find((voice) => voice.car < 0);
      if (!free) break;
      free.car = car;
      // Entra desde silencio: sin "pop".
      free.gain.gain.cancelScheduledValues(now);
      free.gain.gain.setValueAtTime(0, now);
    }

    for (const voice of this.voices) {
      const car = voice.car >= 0 ? bots[voice.car] : undefined;
      if (!car) {
        voice.gain.gain.setTargetAtTime(0, now, 0.08);
        continue;
      }
      const tel = car.telemetry;
      // Doppler: velocidades hacia el otro a lo largo de la línea que los une.
      const dx = listener.x - car.x;
      const dz = listener.z - car.z;
      const length = Math.hypot(dx, dz) || 1;
      car.worldVelocity(this.velocity);
      const sourceToward = (this.velocity.x * dx + this.velocity.z * dz) / length;
      const listenerToward = -(listener.vx * dx + listener.vz * dz) / length;
      const doppler = clamp((SOUND_SPEED + listenerToward) / (SOUND_SPEED - sourceToward), 0.7, 1.45);
      const hz = firingHz(tel.rpm) * doppler;
      const load = clamp(tel.throttle, 0, 1);
      voice.fundamental.frequency.setTargetAtTime(hz, now, SMOOTH);
      voice.sub.frequency.setTargetAtTime(hz / 2, now, SMOOTH);
      voice.filter.frequency.setTargetAtTime(700 + load * 2600 + hz * 0.8, now, SMOOTH);
      voice.gain.gain.setTargetAtTime(LEVEL * (0.45 + 0.55 * load), now, 0.06);
      voice.panner.positionX.setTargetAtTime(car.x, now, SMOOTH);
      voice.panner.positionY.setTargetAtTime(0.6, now, SMOOTH);
      voice.panner.positionZ.setTargetAtTime(car.z, now, SMOOTH);
    }
  }

  /** Silencio (pausa); las voces vuelven solas en el próximo `update`. */
  silence(): void {
    const now = this.ctx.currentTime;
    for (const voice of this.voices) {
      voice.gain.gain.setTargetAtTime(0, now, 0.03);
      voice.car = -1;
    }
  }

  dispose(): void {
    const now = this.ctx.currentTime;
    for (const voice of this.voices) {
      voice.gain.gain.setTargetAtTime(0, now, 0.03);
      voice.fundamental.stop(now + 0.15);
      voice.sub.stop(now + 0.15);
      voice.fundamental.onended = () => {
        for (const node of [voice.fundamental, voice.sub, voice.filter, voice.gain, voice.panner]) node.disconnect();
      };
    }
  }

  private placeListener(l: Listener, now: number): void {
    const listener = this.ctx.listener;
    // Todos los navegadores actuales exponen el oyente como AudioParams.
    if (!('positionX' in listener)) return;
    listener.positionX.setTargetAtTime(l.x, now, SMOOTH);
    listener.positionY.setTargetAtTime(l.y, now, SMOOTH);
    listener.positionZ.setTargetAtTime(l.z, now, SMOOTH);
    listener.forwardX.setTargetAtTime(l.forwardX, now, SMOOTH);
    listener.forwardY.setTargetAtTime(l.forwardY, now, SMOOTH);
    listener.forwardZ.setTargetAtTime(l.forwardZ, now, SMOOTH);
    listener.upX.setTargetAtTime(l.upX, now, SMOOTH);
    listener.upY.setTargetAtTime(l.upY, now, SMOOTH);
    listener.upZ.setTargetAtTime(l.upZ, now, SMOOTH);
  }
}
