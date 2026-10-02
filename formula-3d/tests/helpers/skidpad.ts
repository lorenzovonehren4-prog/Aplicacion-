import type { Track } from '../../src/tracks/Track';

/**
 * "Circuito" de prueba: un plano infinito de asfalto sin muros, para medir el
 * auto en curva sin que la pista se meta en el medio.
 */
export const SKIDPAD = {
  geometry: {
    project: (x: number, z: number, out: { index: number; s: number; d: number }) => {
      out.index = 0;
      out.s = -z;
      out.d = x;
      return out;
    },
    pointAt: (s: number, d: number, p: { x: number; z: number }, t?: { x: number; z: number }) => {
      p.x = d;
      p.z = -s;
      if (t) {
        t.x = 0;
        t.z = -1;
      }
    },
    tx: new Float32Array([0]),
    tz: new Float32Array([-1]),
  },
  trackside: { wallLeft: new Float32Array([1e9]), wallRight: new Float32Array([1e9]), gapLeft: new Uint8Array(1), gapRight: new Uint8Array(1) },
  surfaceAt: () => 'asphalt',
} as unknown as Track;
