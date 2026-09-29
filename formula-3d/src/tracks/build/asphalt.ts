/**
 * Asfalto "usado", como se ve en una carrera de verdad:
 * - La trazada engomada: una franja más oscura y apenas más lisa (brilla un
 *   poco más) por donde pasan todos, con las dos huellas de las ruedas.
 * - Marcas de frenada: rayas negras finas en las zonas de frenada fuerte,
 *   que se cortan y retoman a lo largo.
 * - Suciedad de goma (bolitas) fuera de la trazada en los bordes de las curvas.
 * - Parches de asfalto reparado (más nuevo y oscuro, o más viejo y claro).
 *
 * El sombreador sabe por dónde va la trazada en cada punto de la vuelta con
 * una textura de datos de 1 × N (una columna por tramo de pista):
 * R = desplazamiento de la trazada, G = frenada fuerte, B = cuánto se dobla.
 * La cinta del asfalto tiene U = metros desde el borde izquierdo / 7 y
 * V = metros a lo largo / 7 (ver `buildAsphalt`).
 */

import { DataTexture, LinearFilter, MeshStandardMaterial, RepeatWrapping, RGBAFormat, UnsignedByteType, type Texture } from 'three';
import { LINE_YELLOW } from '../RacingLine';
import type { Track } from '../Track';
import { DETAIL_PARS, detailLayer } from './detail';

/** Metros de pista por repetición de la textura del asfalto (U y V). */
export const ASPHALT_TILE = 7;
const SAMPLES = 2048;
const GRAVITY = 9.81;

/** Textura de datos de la trazada a lo largo de la vuelta. */
export function createTrackDataTexture(track: Track): DataTexture {
  const g = track.geometry;
  const line = track.racingLine;
  const data = new Uint8Array(SAMPLES * 4);
  for (let k = 0; k < SAMPLES; k++) {
    const s = (k / SAMPLES) * g.length;
    const offset = line.offsetAt(s) / g.halfWidth;
    const index = line.indexAt(s);
    // Frenada fuerte: el rojo del perfil (el amarillo es levantar el pie).
    const braking = Math.min(1, Math.max(0, (line.state[index] ?? 0) - LINE_YELLOW));
    const speed = line.speedAt(s);
    const lateralG = (speed * speed * Math.abs(line.curvature[index] ?? 0)) / GRAVITY;
    data[k * 4] = Math.round((Math.max(-1, Math.min(1, offset)) * 0.5 + 0.5) * 255);
    data[k * 4 + 1] = Math.round(braking * 255);
    data[k * 4 + 2] = Math.round(Math.min(1, lateralG / 3.5) * 255);
    data[k * 4 + 3] = 255;
  }
  const texture = new DataTexture(data, SAMPLES, 1, RGBAFormat, UnsignedByteType);
  texture.wrapS = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

const FRAGMENT_PARS = /* glsl */ `
  uniform sampler2D trackData;
  uniform float trackLength;
  uniform float halfWidth;
  float asphaltHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float asphaltNoise(float x) {
    float i = floor(x);
    float f = fract(x);
    float a = fract(sin(i * 91.7) * 43758.5453);
    float b = fract(sin((i + 1.0) * 91.7) * 43758.5453);
    return mix(a, b, f * f * (3.0 - 2.0 * f));
  }
`;

const FRAGMENT_MAP = /* glsl */ `
  #include <map_fragment>
  // Grano nítido de cerca (el mapa repite cada 7 m; el detalle cada 1,4 m).
  ${detailLayer(5, 0.55)}
  // Posición en la pista: s a lo largo, d desde el centro (+ derecha).
  float trackS = vMapUv.y * ${ASPHALT_TILE.toFixed(1)};
  float trackD = vMapUv.x * ${ASPHALT_TILE.toFixed(1)} - halfWidth - 0.3;
  vec4 lineData = texture2D(trackData, vec2(trackS / trackLength, 0.5));
  float lineD = (lineData.r * 2.0 - 1.0) * halfWidth;
  float fromLine = trackD - lineD;

  // Trazada engomada y las dos huellas de las ruedas (trocha ~1,6 m).
  float asphaltRubber = exp(-fromLine * fromLine / 3.2);
  float wheelTracks = exp(-pow(abs(fromLine) - 0.8, 2.0) / 0.09);
  float grime = asphaltRubber * 0.26 + wheelTracks * 0.12;

  // Marcas de frenada: rayas finas por las huellas, que se cortan a lo largo.
  float lane = asphaltHash(vec2(floor(trackD * 7.0), 3.0));
  float streak = smoothstep(0.45, 0.8, asphaltNoise(trackS * 0.09 + lane * 17.0)) * step(0.35, lane);
  float skid = lineData.g * exp(-pow(abs(fromLine) - 0.8, 2.0) / 0.16) * streak * 0.7;

  // Bolitas de goma en los bordes de las curvas, lejos de la trazada.
  float edge = smoothstep(halfWidth - 3.5, halfWidth - 0.4, abs(trackD));
  float marbles = lineData.b * edge * (1.0 - asphaltRubber) * 0.5;

  // Parches de reparación: rectángulos de ~30 × 4,5 m con bordes netos.
  vec2 cell = vec2(floor(trackS / 29.0), floor((trackD + halfWidth) / 4.6));
  float patchPick = asphaltHash(cell);
  float patchTone = patchPick > 0.94 ? 0.8 : patchPick < 0.04 ? 1.14 : 1.0;

  diffuseColor.rgb *= (1.0 - grime - skid) * patchTone;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.085, 0.08, 0.075), marbles * 0.6);
`;

const FRAGMENT_ROUGHNESS = /* glsl */ `
  #include <roughnessmap_fragment>
  // La goma pulida brilla un poco más.
  roughnessFactor *= 1.0 - asphaltRubber * 0.22;
`;

/** Material del asfalto de la pista con la trazada engomada y las marcas. */
export function createRacedAsphaltMaterial(track: Track, map: Texture, bump: Texture, data: DataTexture): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 0.6, roughness: 0.88, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.trackData = { value: data };
    shader.uniforms.trackLength = { value: track.geometry.length };
    shader.uniforms.halfWidth = { value: track.geometry.halfWidth };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_PARS}\n${DETAIL_PARS}`)
      .replace('#include <map_fragment>', FRAGMENT_MAP)
      .replace('#include <roughnessmap_fragment>', FRAGMENT_ROUGHNESS);
  };
  material.customProgramCacheKey = () => 'asfalto-usado';
  return material;
}
