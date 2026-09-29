/**
 * Ambiente del estudio del menú y del garaje:
 * - Conos de luz visibles bajo cada foco (aire con un poco de humo): conos
 *   abiertos con un sombreador aditivo que se desvanece hacia abajo y en los
 *   bordes, con un leve parpadeo.
 * - Polvo flotando: puntos que derivan despacio y brillan al cruzar la luz.
 * - Pulso de luz roja que sale de la plataforma y recorre el piso cada tanto.
 *
 * Todo aditivo y sin sombras: casi no cuesta. La cantidad de polvo sigue la
 * calidad gráfica.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  Points,
  RingGeometry,
  ShaderMaterial,
  Vector3,
} from 'three';
import { Disposer } from '../core/utils/Disposer';

const CONE_VERTEX = /* glsl */ `
  varying float vHeight;
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  void main() {
    // La geometría va de y = -0.5 (base, abajo) a y = 0.5 (punta, arriba).
    vHeight = position.y + 0.5;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const CONE_FRAGMENT = /* glsl */ `
  uniform vec3 color;
  uniform float intensity;
  uniform float time;
  uniform float seed;
  varying float vHeight;
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  void main() {
    // Más denso en el centro del haz (de frente) que en los bordes.
    float facing = abs(dot(vNormalView, vViewDir));
    float core = pow(facing, 2.2);
    // Fuerte cerca del foco, se apaga antes de llegar al piso.
    float fall = smoothstep(0.0, 0.75, vHeight) * (0.35 + 0.65 * vHeight);
    float flicker = 0.92 + 0.08 * sin(time * 1.7 + seed * 6.0) * sin(time * 2.9 + seed);
    gl_FragColor = vec4(color * core * fall * intensity * flicker, 1.0);
  }
`;

const DUST_VERTEX = /* glsl */ `
  attribute float phase;
  uniform float time;
  uniform float scale;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    // Deriva lenta, distinta para cada mota.
    p.x += sin(time * 0.13 + phase * 7.0) * 0.6;
    p.y += mod(time * 0.05 + phase * 5.0, 5.0) - 2.5;
    p.z += cos(time * 0.11 + phase * 5.0) * 0.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    // Titila apenas y brilla más cerca del centro (donde están las luces).
    vAlpha = (0.35 + 0.65 * (0.5 + 0.5 * sin(time * 0.8 + phase * 20.0))) * smoothstep(7.0, 1.5, length(p.xz));
    gl_PointSize = scale * (0.8 + phase) / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const DUST_FRAGMENT = /* glsl */ `
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float d = dot(c, c);
    if (d > 1.0) discard;
    gl_FragColor = vec4(vec3(1.0, 0.97, 0.92) * (1.0 - d) * vAlpha * 0.35, 1.0);
  }
`;

const PULSE_PERIOD = 4.5;

export class StudioAtmosphere {
  readonly root = new Group();
  private readonly own = new Disposer();
  private readonly cones: ShaderMaterial[] = [];
  private readonly dust: ShaderMaterial;
  private readonly pulse: Mesh;
  private readonly pulseMaterial: ShaderMaterial;
  private time = 0;

  /**
   * @param lights focos (posición y a dónde apuntan) que llevan cono visible
   * @param amount cantidad de polvo según la calidad (0.3 … 1.3)
   */
  constructor(lights: ReadonlyArray<{ from: Vector3; to: Vector3; color: string; intensity: number; radius: number }>, platformRadius: number, amount: number) {
    this.root.name = 'ambiente-estudio';

    // ─── Conos de luz ───
    const coneGeometry = this.own.own(new CylinderGeometry(0.06, 1, 1, 40, 1, true));
    lights.forEach((light, i) => {
      const material = this.own.own(
        new ShaderMaterial({
          vertexShader: CONE_VERTEX,
          fragmentShader: CONE_FRAGMENT,
          uniforms: {
            color: { value: new Color(light.color) },
            intensity: { value: light.intensity },
            time: { value: 0 },
            seed: { value: i * 0.37 },
          },
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
          side: DoubleSide,
          fog: false,
        }),
      );
      this.cones.push(material);
      const cone = new Mesh(coneGeometry, material);
      const direction = light.to.clone().sub(light.from);
      const length = direction.length();
      // El cilindro crece en Y: se escala al largo del haz y se orienta de la punta (arriba) hacia la base.
      cone.scale.set(light.radius, length, light.radius);
      cone.position.copy(light.from).addScaledVector(direction, 0.5);
      cone.quaternion.setFromUnitVectors(new Vector3(0, -1, 0), direction.normalize());
      cone.renderOrder = 5;
      this.root.add(cone);
    });

    // ─── Polvo ───
    const count = Math.round(420 * amount);
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(Math.random()) * 7;
      const a = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = 0.3 + Math.random() * 4.5;
      positions[i * 3 + 2] = Math.sin(a) * r;
      phases[i] = Math.random();
    }
    const dustGeometry = this.own.own(new BufferGeometry());
    dustGeometry.setAttribute('position', new BufferAttribute(positions, 3));
    dustGeometry.setAttribute('phase', new BufferAttribute(phases, 1));
    this.dust = this.own.own(
      new ShaderMaterial({
        vertexShader: DUST_VERTEX,
        fragmentShader: DUST_FRAGMENT,
        uniforms: { time: { value: 0 }, scale: { value: 18 } },
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    const dust = new Points(dustGeometry, this.dust);
    dust.frustumCulled = false;
    dust.renderOrder = 6;
    this.root.add(dust);

    // ─── Pulso en el piso ───
    const pulseGeometry = this.own.own(new RingGeometry(0.97, 1, 128));
    pulseGeometry.rotateX(-Math.PI / 2);
    this.pulseMaterial = this.own.own(
      new ShaderMaterial({
        vertexShader: /* glsl */ `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `uniform float opacity; void main() { gl_FragColor = vec4(vec3(1.0, 0.16, 0.24) * 2.2 * opacity, 1.0); }`,
        uniforms: { opacity: { value: 0 } },
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.pulse = new Mesh(pulseGeometry, this.pulseMaterial);
    this.pulse.position.y = 0.008;
    this.pulse.scale.setScalar(platformRadius);
    this.pulse.userData.base = platformRadius;
    this.root.add(this.pulse);
  }

  /** Alto de la imagen en píxeles reales (tamaño del polvo en pantalla). */
  setViewHeight(pixels: number): void {
    const scale = this.dust.uniforms.scale;
    if (scale) scale.value = 18 * (pixels / 720);
  }

  update(dt: number): void {
    this.time += dt;
    for (const cone of this.cones) {
      const time = cone.uniforms.time;
      if (time) time.value = this.time;
    }
    const time = this.dust.uniforms.time;
    if (time) time.value = this.time;
    // El pulso sale del borde de la plataforma y se abre mientras se apaga.
    const t = (this.time % PULSE_PERIOD) / 2.2;
    const base = this.pulse.userData.base as number;
    const opacity = this.pulseMaterial.uniforms.opacity;
    if (t <= 1) {
      this.pulse.visible = true;
      this.pulse.scale.setScalar(base * (1 + t * 1.8));
      if (opacity) opacity.value = (1 - t) * (1 - t) * 0.5;
    } else {
      this.pulse.visible = false;
    }
  }

  dispose(): void {
    this.root.removeFromParent();
    this.own.dispose();
  }
}
