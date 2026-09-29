/**
 * Fantasma de la contrarreloj: la vuelta grabada a 20 Hz (posición y rumbo) y
 * su traza de tiempos para el delta. Se guarda por circuito en un formato
 * compacto (números de 32 bits en base64: una vuelta de 1:30 ocupa ~30 KB).
 */

/** Muestras por segundo. */
export const GHOST_RATE = 20;
/** Valores por muestra: x, z, rumbo. */
const STRIDE = 3;

export interface GhostLap {
  /** Tiempo de la vuelta (s). */
  time: number;
  /** x, z y rumbo de cada muestra, a `GHOST_RATE` por segundo desde la línea. */
  poses: Float32Array;
  /** Tiempo de vuelta cada 10 m desde la línea (delta en vivo). */
  trace: readonly number[];
}

/** Forma guardada (ver `TrackRecord.ghost`). */
export interface StoredGhost {
  time: number;
  poses: string;
  trace: string;
}

export interface GhostPose {
  x: number;
  z: number;
  heading: number;
}

/** Graba la vuelta en curso. */
export class GhostRecorder {
  private samples: number[] = [];
  private next = 0;

  /** Empieza a grabar una vuelta nueva. */
  start(): void {
    this.samples = [];
    this.next = 0;
  }

  /** Registra la pose si toca una muestra en este instante de la vuelta. */
  record(lapTime: number, x: number, z: number, heading: number): void {
    while (lapTime >= this.next / GHOST_RATE) {
      this.samples.push(x, z, heading);
      this.next++;
    }
  }

  /** Cierra la vuelta: devuelve el fantasma listo para usar y guardar. */
  finish(time: number, trace: readonly number[]): GhostLap {
    return { time, poses: new Float32Array(this.samples), trace: [...trace] };
  }
}

/** Reproduce un fantasma. */
export class GhostPlayer {
  constructor(readonly lap: GhostLap) {}

  /**
   * Pose a los `t` segundos de la vuelta (interpolada entre muestras).
   * @returns false si la vuelta del fantasma ya terminó
   */
  poseAt(t: number, out: GhostPose): boolean {
    const poses = this.lap.poses;
    const count = poses.length / STRIDE;
    if (count < 2 || t < 0 || t > this.lap.time) return false;
    const f = Math.min(count - 1.0001, t * GHOST_RATE);
    const i = Math.floor(f);
    const k = f - i;
    const a = i * STRIDE;
    const b = a + STRIDE;
    out.x = (poses[a] ?? 0) + ((poses[b] ?? 0) - (poses[a] ?? 0)) * k;
    out.z = (poses[a + 1] ?? 0) + ((poses[b + 1] ?? 0) - (poses[a + 1] ?? 0)) * k;
    let delta = (poses[b + 2] ?? 0) - (poses[a + 2] ?? 0);
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    out.heading = (poses[a + 2] ?? 0) + delta * k;
    return true;
  }
}

function toBase64(values: Float32Array): string {
  const bytes = new Uint8Array(values.buffer, values.byteOffset, values.byteLength);
  let binary = '';
  // En tramos: `String.fromCharCode(...bytes)` con arreglos grandes desborda la pila.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(text: string): Float32Array | null {
  try {
    const binary = atob(text);
    if (binary.length % 4 !== 0) return null;
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Float32Array(bytes.buffer);
  } catch {
    return null;
  }
}

export function encodeGhost(lap: GhostLap): StoredGhost {
  return { time: lap.time, poses: toBase64(lap.poses), trace: toBase64(new Float32Array(lap.trace)) };
}

/** Lee un fantasma guardado; null si está dañado o no corresponde a su tiempo. */
export function decodeGhost(stored: StoredGhost): GhostLap | null {
  const poses = fromBase64(stored.poses);
  const trace = fromBase64(stored.trace);
  if (!poses || !trace || poses.length % STRIDE !== 0) return null;
  // Una muestra por cada 1/20 s de vuelta (con margen de una muestra).
  const expected = Math.floor(stored.time * GHOST_RATE) + 1;
  if (Math.abs(poses.length / STRIDE - expected) > 2) return null;
  for (const value of poses) if (!Number.isFinite(value)) return null;
  return { time: stored.time, poses, trace: Array.from(trace) };
}
