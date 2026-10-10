/**
 * Pasada final del posprocesado: una sola vuelta por la pantalla completa
 * que hace todo lo que antes eran tres (sumar el bloom, la pasada de
 * velocidad y la salida con tone mapping y sRGB). Cada pasada a pantalla
 * completa lee y escribe una imagen de media precisión: en las GPU integradas
 * es de lo que más cuesta, y así se ahorran dos por cuadro.
 *
 * - Desenfoque radial desde el punto de fuga: los bordes de la imagen se
 *   estiran hacia afuera cuando el auto va rápido (el centro queda nítido).
 * - Aire caliente: detrás de los escapes la imagen ondula un poco (hasta
 *   `HAZE_POINTS` puntos en pantalla, los de los autos más cercanos).
 * - Bloom: se suma la imagen que deja `BloomPass` (ya difuminada).
 * - Gradación de color suave (algo más de saturación y contraste) y una
 *   viñeta: el aspecto "de transmisión" de la imagen.
 * - Salida: tone mapping y sRGB del lienzo (los que pone three.js al dibujar
 *   en pantalla). Siempre se dibuja: es la salida del composer.
 */

import { ShaderMaterial, Vector2, Vector4, type Texture, type WebGLRenderer, type WebGLRenderTarget } from 'three';
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
  uniform sampler2D tBloom;
  uniform float bloom;
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
      // Muestras hacia el punto de fuga, más largas lejos del centro. En el
      // centro (donde el desenfoque no mueve nada) no se toman: ahorra lecturas.
      vec2 dir = uv - center;
      float edge = smoothstep(0.12, 0.8, length(dir * vec2(aspect, 1.0)));
      if (edge > 0.01) {
        vec2 stepUv = dir * blur * edge * (0.075 / float(TAPS));
        vec4 sum = color;
        for (int i = 1; i < TAPS; i++) sum += texture2D(tDiffuse, uv - stepUv * float(i));
        color = sum / float(TAPS);
      }
    }
    // Bloom (ya difuminado: se suma sin el desenfoque de velocidad).
    if (bloom > 0.0) color.rgb += texture2D(tBloom, vUv).rgb;
    if (grade > 0.0) {
      // Saturación y contraste (en lineal, antes del tone mapping) y viñeta suave.
      float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      vec3 graded = mix(vec3(luma), color.rgb, 1.0 + 0.12 * grade);
      graded = pow(max(graded, vec3(0.0)), vec3(1.0 + 0.06 * grade));
      vec2 v = (vUv - 0.5) * vec2(aspect, 1.0);
      float vignette = 1.0 - grade * 0.32 * smoothstep(0.35, 1.05, length(v));
      color.rgb = graded * vignette;
    }
    gl_FragColor = vec4(color.rgb, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class FinalPass extends Pass {
  private readonly material: ShaderMaterial;
  private readonly quad: FullScreenQuad;

  constructor() {
    super();
    this.material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        tDiffuse: { value: null },
        tBloom: { value: null },
        bloom: { value: 0 },
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
  }

  /**
   * Copia el estado del cuadro.
   * @param fx efectos de la vista (o undefined si no tiene)
   * @param allowed posprocesado encendido (si no, sólo hace la salida)
   * @param bloom imagen del bloom a sumar, o null si el bloom está apagado
   */
  apply(fx: SpeedFx | undefined, allowed: boolean, bloom: Texture | null): void {
    const u = this.material.uniforms;
    if (u.bloom) u.bloom.value = bloom ? 1 : 0;
    if (u.tBloom) u.tBloom.value = bloom;
    const active = allowed && fx !== undefined;
    if (u.blur) u.blur.value = active ? fx.blur : 0;
    if (u.grade) u.grade.value = active ? fx.grade : 0;
    const haze = u.haze?.value as Vector4[] | undefined;
    if (haze) for (let i = 0; i < HAZE_POINTS; i++) haze[i]?.copy((active ? fx.haze[i] : undefined) ?? ZERO);
    if (!active) return;
    (u.center?.value as Vector2 | undefined)?.copy(fx.center);
    if (u.time) u.time.value = fx.time;
  }

  override setSize(width: number, height: number): void {
    const aspect = this.material.uniforms.aspect;
    if (aspect) aspect.value = width / Math.max(1, height);
  }

  override render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget): void {
    const input = this.material.uniforms.tDiffuse;
    if (input) input.value = readBuffer.texture;
    // Es la última pasada: va a la pantalla (si no, con la salida "de pantalla" quedaría mal codificada).
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }

  override dispose(): void {
    this.material.dispose();
    this.quad.dispose();
  }
}

const ZERO = new Vector4();
