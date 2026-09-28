/**
 * La ayuda de la línea de trazada: una cinta sobre el asfalto siguiendo la
 * trazada ideal, con shader propio (bordes difuminados, brillo en el centro,
 * transparencia y chevrones que avanzan).
 *
 * - Fija: cada tramo tiene su color según el perfil de la trazada (verde
 *   acelerar, amarillo levantar, rojo frenar).
 * - Dinámica: el color se recalcula cada fotograma comparando TU velocidad
 *   con la que pide cada punto de adelante (¿alcanzas a frenar?), con una
 *   transición suave entre colores.
 * - Sólo curvas: se ve en frenadas y curvas y se desvanece en las rectas.
 */

import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from 'three';
import type { LineMode, LineType } from '../core/save/schema';
import type { PerformanceModel } from '../race/physics/CarSpec';
import { LINE_GREEN, LINE_RED, LINE_YELLOW, type RacingLine } from '../tracks/RacingLine';

/** Ancho de la cinta (m) y altura sobre el asfalto (sobre la pintura). */
const WIDTH = 0.95;
const HEIGHT = 0.02;
/** Tramo adelante del auto que evalúa la línea dinámica (m). */
const DYNAMIC_RANGE = 260;
/** Rapidez de la transición de colores (1/s). */
const COLOR_RATE = 5;
/** Línea dinámica: fracción de la frenada disponible desde la que pasa a amarillo y a rojo. */
const DYNAMIC_YELLOW_FROM = 0.33;
const DYNAMIC_RED_FROM = 0.72;

const vertexShader = /* glsl */ `
  attribute float aState;
  attribute float aMask;
  varying vec2 vUv;
  varying float vState;
  varying float vMask;
  #include <fog_pars_vertex>
  void main() {
    vUv = uv;
    vState = aState;
    vMask = aMask;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uCornersOnly;
  uniform vec3 uGreen;
  uniform vec3 uYellow;
  uniform vec3 uRed;
  varying vec2 vUv;
  varying float vState;
  varying float vMask;
  #include <fog_pars_fragment>
  void main() {
    float state = clamp(vState, 0.0, 2.0);
    vec3 color = state < 1.0 ? mix(uGreen, uYellow, state) : mix(uYellow, uRed, state - 1.0);
    float across = abs(vUv.x * 2.0 - 1.0);
    // Bordes difuminados y un núcleo más brillante.
    float body = 1.0 - smoothstep(0.45, 1.0, across);
    float core = 1.0 - smoothstep(0.0, 0.45, across);
    // Chevrones apuntando hacia adelante (V con la punta en el centro), cada 3 m, avanzando.
    float phase = fract((vUv.y + across * 0.9) / 3.0 - uTime * 1.6);
    float chevron = smoothstep(0.0, 0.06, phase) * (1.0 - smoothstep(0.22, 0.3, phase));
    float mask = mix(1.0, vMask, uCornersOnly);
    float alpha = body * (0.5 + 0.35 * chevron + 0.15 * core) * mask * uOpacity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(color * (0.85 + 0.55 * core + 0.7 * chevron), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export class RacingLineMesh {
  readonly mesh: Mesh<BufferGeometry, ShaderMaterial>;
  private readonly stateAttribute: Float32BufferAttribute;
  /** Color que se muestra en cada punto (con transición). */
  private readonly shown: Float32Array;
  private readonly target: Float32Array;
  private mode: LineMode = 'off';
  private type: LineType = 'fixed';

  constructor(
    private readonly line: RacingLine,
    private readonly model: PerformanceModel,
  ) {
    const n = line.count;
    const positions: number[] = [];
    const uvs: number[] = [];
    const masks: number[] = [];
    const indices: number[] = [];
    let along = 0;
    // n + 1 filas: la última repite la primera para cerrar la vuelta (con V continua).
    for (let k = 0; k <= n; k++) {
      const i = k % n;
      const prev = (i - 1 + n) % n;
      const next = (i + 1) % n;
      let tx = (line.x[next] ?? 0) - (line.x[prev] ?? 0);
      let tz = (line.z[next] ?? 0) - (line.z[prev] ?? 0);
      const length = Math.hypot(tx, tz) || 1;
      tx /= length;
      tz /= length;
      // Normal hacia la derecha: (−tz, tx).
      const rx = -tz * (WIDTH / 2);
      const rz = tx * (WIDTH / 2);
      const x = line.x[i] ?? 0;
      const z = line.z[i] ?? 0;
      positions.push(x - rx, HEIGHT, z - rz, x + rx, HEIGHT, z + rz);
      uvs.push(0, along, 1, along);
      const mask = line.cornerMask[i] ?? 0;
      masks.push(mask, mask);
      along += line.spacing[i] ?? 0;
    }
    for (let k = 0; k < n; k++) {
      const a = k * 2;
      // Cara hacia arriba (derecha × adelante = arriba): izq → der → izq siguiente.
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('aMask', new Float32BufferAttribute(masks, 1));
    this.stateAttribute = new Float32BufferAttribute(new Float32Array((n + 1) * 2), 1);
    geometry.setAttribute('aState', this.stateAttribute);
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();

    const material = new ShaderMaterial({
      uniforms: UniformsUtils.merge([
        UniformsLib.fog,
        {
          uTime: { value: 0 },
          uOpacity: { value: 1 },
          uCornersOnly: { value: 0 },
          uGreen: { value: new Color('#1fe36a') },
          uYellow: { value: new Color('#ffcf1f') },
          uRed: { value: new Color('#ff2438') },
        },
      ]),
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      fog: true,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
    this.mesh = new Mesh(geometry, material);
    this.mesh.name = 'trazada';
    this.mesh.renderOrder = 2;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;

    this.shown = new Float32Array(line.state);
    this.target = new Float32Array(n);
    this.writeStates();
  }

  /** Aplica el modo de la ayuda (desactivada, sólo curvas o completa) y el tipo (fija o dinámica). */
  configure(mode: LineMode, type: LineType): void {
    this.mode = mode;
    this.type = type;
    this.mesh.visible = mode !== 'off';
    this.mesh.material.uniforms.uCornersOnly!.value = mode === 'corners' ? 1 : 0;
    if (type === 'fixed') {
      this.shown.set(this.line.state);
      this.writeStates();
    }
  }

  /**
   * Cada fotograma.
   * @param s posición del auto en la pista (m)
   * @param speed velocidad del auto (m/s)
   */
  update(dt: number, time: number, s: number, speed: number): void {
    if (this.mode === 'off') return;
    this.mesh.material.uniforms.uTime!.value = time;
    if (this.type !== 'dynamic') return;

    const line = this.line;
    const n = line.count;
    const model = this.model;
    // Frenada disponible a esta velocidad (con un margen: la de un piloto, no la máxima).
    const brake = 0.85 * model.longitudinalGrip * (model.gravity + model.downforcePerMass * speed * speed);
    const first = line.indexAt(s);
    const window = Math.ceil(DYNAMIC_RANGE / line.step);
    this.target.fill(LINE_GREEN);
    // Hacia atrás desde el final de la ventana: cada punto muestra lo peor que tiene adelante.
    let worst: number = LINE_GREEN;
    for (let w = window; w >= 0; w--) {
      const k = (first + w) % n;
      const distance = Math.max(1, w * line.step);
      const reference = line.speed[k] ?? 0;
      const needed = (speed * speed - reference * reference) / (2 * distance);
      // Fracción de la frenada disponible que haría falta. Con la carga aerodinámica
      // se frena a ~5 g, así que el amarillo avisa desde ~3 veces la distancia de
      // frenada (da tiempo a reaccionar) y el rojo es "frena ya".
      const ratio = needed / brake;
      const state =
        ratio <= DYNAMIC_YELLOW_FROM
          ? LINE_GREEN
          : ratio <= DYNAMIC_RED_FROM
            ? LINE_GREEN + ((ratio - DYNAMIC_YELLOW_FROM) / (DYNAMIC_RED_FROM - DYNAMIC_YELLOW_FROM)) * (LINE_YELLOW - LINE_GREEN)
            : Math.min(LINE_RED, LINE_YELLOW + ((ratio - DYNAMIC_RED_FROM) / 0.25) * (LINE_RED - LINE_YELLOW));
      worst = Math.max(worst, state);
      this.target[k] = worst;
    }
    const blend = 1 - Math.exp(-COLOR_RATE * dt);
    for (let k = 0; k < n; k++) {
      const shown = this.shown[k] ?? 0;
      this.shown[k] = shown + ((this.target[k] ?? 0) - shown) * blend;
    }
    this.writeStates();
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }

  private writeStates(): void {
    const array = this.stateAttribute.array as Float32Array;
    const n = this.line.count;
    for (let k = 0; k <= n; k++) {
      const value = this.shown[k % n] ?? 0;
      array[k * 2] = value;
      array[k * 2 + 1] = value;
    }
    this.stateAttribute.needsUpdate = true;
  }
}
