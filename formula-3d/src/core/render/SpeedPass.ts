/**
 * Pasada de velocidad (posprocesado de la carrera):
 * - Desenfoque radial desde el punto de fuga: los bordes de la imagen se
 *   estiran hacia afuera cuando el auto va rápido (el centro queda nítido).
 * - Aire caliente: detrás de los escapes la imagen ondula un poco (hasta
 *   `HAZE_POINTS` puntos en pantalla, los de los autos más cercanos).
 * - Gradación de color suave (algo más de saturación y contraste) y una
 *   viñeta: el aspecto "de transmisión" de la imagen.
 * Si no hay nada que hacer (ni gradación pedida), la pasada se apaga.
 */

import { ShaderMaterial, Vector2, Vector4, type WebGLRenderer, type WebGLRenderTarget } from 'three';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';

export const HAZE_POINTS = 4;

/** Lo que una vista pide a la pasada de velocidad (se lee en cada cuadro). */
export interface SpeedFx {
  /** 0–1: intensidad del desenfoque radial. */
  blur: number;
  /** Punto de fuga en pantalla (0–1, origen abajo a la izquierda). */
  center: Vector2;
  /** Aire caliente: (x, y) en pantalla, intensidad 0–1 y radio (fracción del alto). */
  haze: Vector4[];
  /** Segundos, para animar la ondulación. */
  time: number;
  /** 0–1: intensidad de la gradación de color y la viñeta. */
  grade: number;
}

export function createSpeedFx(): SpeedFx {
  return { blur: 0, center: new Vector2(0.5, 0.5), haze: Array.from({ length: HAZE_POINTS }, () => new Vector4()), time: 0, grade: 0 };
}

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  #define HAZE_POINTS ${HAZE_POINTS}
  #define TAPS 8
  uniform sampler2D tDiffuse;
  uniform float blur;
  uniform vec2 center;
  uniform vec4 haze[HAZE_POINTS];
  uniform float time;
  uniform float aspect;
  uniform float grade;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    // Aire caliente: ondas finas que suben, sólo cerca de cada punto.
    vec2 offset = vec2(0.0);
    for (int i = 0; i < HAZE_POINTS; i++) {
      vec4 h = haze[i];
      if (h.z <= 0.0) continue;
      vec2 d = uv - h.xy;
      d.x *= aspect;
      // Óvalo más alto que ancho, y más intenso arriba del escape (el aire sube).
      float r = length(d * vec2(1.0, 0.7)) / h.w;
      float k = h.z * smoothstep(1.0, 0.0, r) * (0.6 + 0.4 * smoothstep(-0.3, 0.6, d.y / h.w));
      offset += k * vec2(
        sin(uv.y * 190.0 - time * 11.0) + 0.6 * sin(uv.y * 83.0 + time * 6.0),
        cos(uv.x * 150.0 + time * 9.0)
      );
    }
    uv += offset * 0.0016;
    vec4 color = texture2D(tDiffuse, uv);

    if (blur > 0.002) {
      // Muestras hacia el punto de fuga, más largas lejos del centro.
      vec2 dir = uv - center;
      float edge = smoothstep(0.12, 0.8, length(dir * vec2(aspect, 1.0)));
      vec2 stepUv = dir * blur * edge * (0.075 / float(TAPS));
      vec4 sum = color;
      for (int i = 1; i < TAPS; i++) sum += texture2D(tDiffuse, uv - stepUv * float(i));
      color = sum / float(TAPS);
    }
    if (grade > 0.0) {
      // Saturación y contraste (en lineal, antes del tone mapping) y viñeta suave.
      float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      vec3 graded = mix(vec3(luma), color.rgb, 1.0 + 0.12 * grade);
      graded = pow(max(graded, vec3(0.0)), vec3(1.0 + 0.06 * grade));
      vec2 v = (vUv - 0.5) * vec2(aspect, 1.0);
      float vignette = 1.0 - grade * 0.32 * smoothstep(0.35, 1.05, length(v));
      color.rgb = graded * vignette;
    }
    gl_FragColor = color;
  }
`;

export class SpeedPass extends Pass {
  private readonly material: ShaderMaterial;
  private readonly quad: FullScreenQuad;
  private warmed = false;

  constructor() {
    super();
    this.material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        tDiffuse: { value: null },
        blur: { value: 0 },
        center: { value: new Vector2(0.5, 0.5) },
        haze: { value: Array.from({ length: HAZE_POINTS }, () => new Vector4()) },
        time: { value: 0 },
        aspect: { value: 1 },
        grade: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.material);
    this.enabled = false;
  }

  /** Copia el estado de la vista; se apaga si no hay desenfoque ni calor. */
  apply(fx: SpeedFx | undefined, allowed: boolean): void {
    // La primera vez se dibuja aunque no haga nada: así el sombreador se compila
    // al entrar a la pista y no a 300 km/h (un tirón).
    const warmup = allowed && fx !== undefined && !this.warmed;
    if (warmup) this.warmed = true;
    let heat = false;
    if (fx) for (const point of fx.haze) heat ||= point.z > 0;
    const active = warmup || (allowed && fx !== undefined && (fx.blur > 0.002 || heat || fx.grade > 0));
    this.enabled = active;
    if (!active || !fx) return;
    const u = this.material.uniforms;
    if (u.blur) u.blur.value = fx.blur;
    (u.center?.value as Vector2 | undefined)?.copy(fx.center);
    const haze = u.haze?.value as Vector4[] | undefined;
    if (haze) for (let i = 0; i < HAZE_POINTS; i++) haze[i]?.copy(fx.haze[i] ?? ZERO);
    if (u.time) u.time.value = fx.time;
    if (u.grade) u.grade.value = fx.grade;
  }

  override setSize(width: number, height: number): void {
    const aspect = this.material.uniforms.aspect;
    if (aspect) aspect.value = width / Math.max(1, height);
  }

  override render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget): void {
    const input = this.material.uniforms.tDiffuse;
    if (input) input.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }

  override dispose(): void {
    this.material.dispose();
    this.quad.dispose();
  }
}

const ZERO = new Vector4();
