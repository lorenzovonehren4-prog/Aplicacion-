/**
 * Partículas de la pista: humo de neumáticos, polvo de la grava y chispas.
 * Cada sistema es un único `Points` (una llamada de dibujo) con un búfer de
 * capacidad fija: las partículas vivas se mantienen al principio del arreglo
 * (al morir una, la última ocupa su lugar), así no se crean objetos por
 * cuadro y sólo se dibujan las vivas (`setDrawRange`).
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  NormalBlending,
  Points,
  ShaderMaterial,
  type Blending,
} from 'three';

export interface ParticleStyle {
  capacity: number;
  /** Suave y difuso (humo) o núcleo brillante (chispas). */
  kind: 'soft' | 'spark';
  blending: Blending;
  /** Aceleración vertical (m/s², negativa = cae). */
  gravity: number;
  /** Frenado por el aire (1/s). */
  drag: number;
  /** Crecimiento del tamaño (m/s). */
  growth: number;
}

export const SMOKE: ParticleStyle = { capacity: 700, kind: 'soft', blending: NormalBlending, gravity: 0.6, drag: 1.6, growth: 2.2 };
export const DUST: ParticleStyle = { capacity: 400, kind: 'soft', blending: NormalBlending, gravity: -1.5, drag: 2.2, growth: 1.6 };
export const SPARKS: ParticleStyle = { capacity: 500, kind: 'spark', blending: AdditiveBlending, gravity: -9.8, drag: 0.6, growth: -0.04 };

const VERTEX = /* glsl */ `
  attribute float size;
  attribute float alpha;
  attribute vec3 color;
  uniform float scale;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vAlpha = alpha;
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * scale / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT_SOFT = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d = dot(p, p);
    if (d > 1.0) discard;
    float a = (1.0 - d) * (1.0 - d) * vAlpha;
    gl_FragColor = vec4(vColor, a);
  }
`;

const FRAGMENT_SPARK = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d = dot(p, p);
    if (d > 1.0) discard;
    float core = exp(-d * 6.0);
    gl_FragColor = vec4(vColor * (1.0 + core * 2.0), core * vAlpha);
  }
`;

export class ParticleSystem {
  readonly points: Points;
  private readonly geometry = new BufferGeometry();
  private readonly material: ShaderMaterial;
  private readonly position: Float32Array;
  private readonly velocity: Float32Array;
  private readonly size: Float32Array;
  private readonly alpha: Float32Array;
  private readonly color: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly startAlpha: Float32Array;
  private readonly capacity: number;
  private count = 0;

  constructor(private readonly style: ParticleStyle, scale: number) {
    this.capacity = Math.max(16, Math.round(style.capacity * scale));
    const n = this.capacity;
    this.position = new Float32Array(n * 3);
    this.velocity = new Float32Array(n * 3);
    this.size = new Float32Array(n);
    this.alpha = new Float32Array(n);
    this.color = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    this.maxLife = new Float32Array(n);
    this.startAlpha = new Float32Array(n);
    this.geometry.setAttribute('position', new BufferAttribute(this.position, 3));
    this.geometry.setAttribute('size', new BufferAttribute(this.size, 1));
    this.geometry.setAttribute('alpha', new BufferAttribute(this.alpha, 1));
    this.geometry.setAttribute('color', new BufferAttribute(this.color, 3));
    this.geometry.setDrawRange(0, 0);
    this.material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: style.kind === 'soft' ? FRAGMENT_SOFT : FRAGMENT_SPARK,
      uniforms: { scale: { value: 600 } },
      transparent: true,
      depthWrite: false,
      blending: style.blending,
    });
    this.points = new Points(this.geometry, this.material);
    // Se mueven por todo el circuito: sin recorte por esfera envolvente.
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
  }

  /** Escala del tamaño en pantalla (depende del alto de la vista y del FOV). */
  setViewScale(scale: number): void {
    const uniform = this.material.uniforms.scale;
    if (uniform) uniform.value = scale;
  }

  /** Suelta una partícula (si no hay lugar, se ignora). */
  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, alpha: number, r: number, g: number, b: number): void {
    if (this.count >= this.capacity) return;
    const i = this.count++;
    const i3 = i * 3;
    this.position[i3] = x;
    this.position[i3 + 1] = y;
    this.position[i3 + 2] = z;
    this.velocity[i3] = vx;
    this.velocity[i3 + 1] = vy;
    this.velocity[i3 + 2] = vz;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.size[i] = size;
    this.startAlpha[i] = alpha;
    this.alpha[i] = alpha;
    this.color[i3] = r;
    this.color[i3 + 1] = g;
    this.color[i3 + 2] = b;
  }

  update(dt: number): void {
    const { gravity, drag, growth } = this.style;
    const damping = Math.max(0, 1 - drag * dt);
    let i = 0;
    while (i < this.count) {
      const life = (this.life[i] ?? 0) - dt;
      if (life <= 0) {
        this.kill(i);
        continue;
      }
      this.life[i] = life;
      const i3 = i * 3;
      const vx = (this.velocity[i3] ?? 0) * damping;
      const vy = ((this.velocity[i3 + 1] ?? 0) + gravity * dt) * damping;
      const vz = (this.velocity[i3 + 2] ?? 0) * damping;
      this.velocity[i3] = vx;
      this.velocity[i3 + 1] = vy;
      this.velocity[i3 + 2] = vz;
      this.position[i3] = (this.position[i3] ?? 0) + vx * dt;
      this.position[i3 + 1] = Math.max(0.02, (this.position[i3 + 1] ?? 0) + vy * dt);
      this.position[i3 + 2] = (this.position[i3 + 2] ?? 0) + vz * dt;
      this.size[i] = Math.max(0.01, (this.size[i] ?? 0) + growth * dt);
      const t = life / (this.maxLife[i] ?? 1);
      this.alpha[i] = (this.startAlpha[i] ?? 0) * Math.min(1, t * 1.8);
      i++;
    }
    this.geometry.setDrawRange(0, this.count);
    this.points.visible = this.count > 0;
    for (const name of ['position', 'size', 'alpha', 'color']) {
      const attribute = this.geometry.getAttribute(name) as BufferAttribute;
      attribute.clearUpdateRanges();
      attribute.addUpdateRange(0, this.count * attribute.itemSize);
      attribute.needsUpdate = true;
    }
  }

  clear(): void {
    this.count = 0;
    this.geometry.setDrawRange(0, 0);
  }

  dispose(): void {
    this.points.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }

  /** Mata la partícula `i`: la última viva ocupa su lugar. */
  private kill(i: number): void {
    const last = --this.count;
    if (i === last) return;
    const i3 = i * 3;
    const l3 = last * 3;
    for (let k = 0; k < 3; k++) {
      this.position[i3 + k] = this.position[l3 + k] ?? 0;
      this.velocity[i3 + k] = this.velocity[l3 + k] ?? 0;
      this.color[i3 + k] = this.color[l3 + k] ?? 0;
    }
    this.life[i] = this.life[last] ?? 0;
    this.maxLife[i] = this.maxLife[last] ?? 1;
    this.size[i] = this.size[last] ?? 0;
    this.alpha[i] = this.alpha[last] ?? 0;
    this.startAlpha[i] = this.startAlpha[last] ?? 0;
  }
}
