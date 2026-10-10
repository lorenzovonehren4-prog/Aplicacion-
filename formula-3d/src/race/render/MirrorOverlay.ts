/**
 * Retrovisor de la pantalla: dibuja la imagen trasera (ver `RearMirrors`)
 * encima del cuadro ya terminado, en el rectángulo que ocupa su marco en el
 * HUD, invertida como en un espejo, con las esquinas redondeadas, un brillo
 * de vidrio y los bordes apenas más oscuros.
 *
 * Va después del posprocesado, así el desenfoque de velocidad no lo borronea.
 * Los dos sombreadores (imagen lineal o ya terminada) se compilan con la
 * carga (`compile`).
 */

import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector4,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { Disposer } from '../../core/utils/Disposer';

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  uniform vec2 size;
  uniform float radius;
  varying vec2 vUv;

  void main() {
    // Rectángulo redondeado (en píxeles): afuera no se dibuja.
    vec2 p = (vUv - 0.5) * size;
    vec2 q = abs(p) - (size * 0.5 - radius);
    float outside = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
    if (outside > 0.5) discard;
    // Espejo: la derecha de la cámara trasera queda a la derecha de la imagen.
    vec4 color = texture2D(map, vec2(1.0 - vUv.x, vUv.y));
    // Vidrio: bordes un poco más oscuros y un brillo diagonal muy suave.
    float edge = smoothstep(0.0, -18.0, outside);
    color.rgb *= mix(0.72, 1.0, edge);
    float sheen = smoothstep(0.35, 0.0, abs(vUv.x * 0.6 + vUv.y - 0.95)) * 0.05;
    color.rgb += sheen;
    gl_FragColor = vec4(color.rgb, 1.0);
    #ifndef ENCODED
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    #endif
  }
`;

export class MirrorOverlay {
  private readonly own = new Disposer();
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly linear: ShaderMaterial;
  private readonly encoded: ShaderMaterial;
  private readonly quad: Mesh;
  private readonly viewport = new Vector4();
  private readonly size = new Vector2();
  private readonly scissor = new Vector4();
  /** Rectángulo en píxeles CSS del lienzo (x, y desde arriba a la izquierda, ancho, alto), o null si no se muestra. */
  private rect: { x: number; y: number; width: number; height: number } | null = null;

  constructor() {
    const material = (encoded: boolean): ShaderMaterial =>
      this.own.own(
        new ShaderMaterial({
          vertexShader: VERTEX,
          fragmentShader: FRAGMENT,
          uniforms: { map: { value: null }, size: { value: new Vector2(1, 1) }, radius: { value: 10 } },
          defines: encoded ? { ENCODED: '' } : {},
          // La imagen lineal recibe el tono y el sRGB del lienzo; la terminada ya los tiene.
          toneMapped: !encoded,
          depthTest: false,
          depthWrite: false,
        }),
      );
    this.linear = material(false);
    this.encoded = material(true);
    this.quad = new Mesh(this.own.own(new PlaneGeometry(2, 2)), this.linear);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  /** Dónde va (píxeles CSS del lienzo), o null para no dibujarlo. */
  setRect(rect: { x: number; y: number; width: number; height: number } | null): void {
    this.rect = rect && rect.width > 8 && rect.height > 8 ? rect : null;
  }

  get visible(): boolean {
    return this.rect !== null;
  }

  /** Compila los dos sombreadores para el lienzo (con la carga, no en carrera). */
  compile(renderer: WebGLRenderer): void {
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(null);
    for (const material of [this.linear, this.encoded]) {
      this.quad.material = material;
      renderer.compile(this.scene, this.camera);
    }
    renderer.setRenderTarget(previous);
  }

  /** Dibuja la imagen sobre el lienzo (después del cuadro). */
  render(renderer: WebGLRenderer, image: { texture: Texture; encoded: boolean } | null): void {
    const rect = this.rect;
    if (!rect || !image) return;
    const material = image.encoded ? this.encoded : this.linear;
    this.quad.material = material;
    const ratio = renderer.getPixelRatio();
    const canvasHeight = renderer.getSize(this.size).y;
    // Viewport y tijeretazo en píxeles CSS (three los multiplica por la densidad); WebGL cuenta desde abajo.
    const y = canvasHeight - rect.y - rect.height;
    const uniforms = material.uniforms;
    if (uniforms.map) uniforms.map.value = image.texture;
    (uniforms.size?.value as Vector2 | undefined)?.set(rect.width * ratio, rect.height * ratio);
    if (uniforms.radius) uniforms.radius.value = 9 * ratio;

    const autoClear = renderer.autoClear;
    const previous = renderer.getRenderTarget();
    renderer.getViewport(this.viewport);
    renderer.getScissor(this.scissor);
    const scissorTest = renderer.getScissorTest();
    renderer.setRenderTarget(null);
    renderer.autoClear = false;
    renderer.setViewport(rect.x, y, rect.width, rect.height);
    renderer.setScissor(rect.x, y, rect.width, rect.height);
    renderer.setScissorTest(true);
    renderer.render(this.scene, this.camera);
    renderer.setScissorTest(scissorTest);
    renderer.setScissor(this.scissor);
    renderer.setViewport(this.viewport);
    renderer.setRenderTarget(previous);
    renderer.autoClear = autoClear;
  }

  dispose(): void {
    this.own.dispose();
  }
}
