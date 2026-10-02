/**
 * Estudio 3D del menú principal y del garaje: el monoplaza sobre
 * una plataforma giratoria, luces de estudio, piso oscuro con reflejos,
 * sombras suaves y tiras de luz al fondo que brillan con el bloom.
 */

import {
  AdditiveBlending,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  FogExp2,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RectAreaLight,
  RingGeometry,
  Scene,
  ShadowMaterial,
  ShaderMaterial,
  SpotLight,
  SRGBColorSpace,
  Vector3,
  type WebGLRenderer,
} from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { createStudioEnvironment, type EnvironmentMap } from '../core/render/environment';
import { QUALITY_PRESETS, shadowMapSize } from '../core/render/quality';
import type { RenderView } from '../core/render/RenderHost';
import type { GraphicsSettings } from '../core/save/schema';
import { Disposer } from '../core/utils/Disposer';
import { damp } from '../core/utils/math';
import { CarModel } from './CarModel';
import { StudioAtmosphere } from './StudioAtmosphere';
import type { LiveryConfig } from './livery';

const FLOOR_RADIUS = 20;
const PLATFORM_RADIUS = 3.4;
const BACKGROUND = new Color('#050608');

/** Shader del piso: reflejo desenfocado, degradado hacia la oscuridad y surcos de la plataforma. */
const FLOOR_SHADER = {
  name: 'StudioFloorShader',
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    baseColor: { value: new Color('#0b0c0f') },
    reflectivity: { value: 0.55 },
    platformRadius: { value: PLATFORM_RADIUS },
    fadeRadius: { value: 11 },
    texel: { value: 1 / 1024 },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec3 vWorld;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    uniform vec3 baseColor;
    uniform float reflectivity;
    uniform float platformRadius;
    uniform float fadeRadius;
    uniform float texel;
    varying vec4 vUv;
    varying vec3 vWorld;
    #include <logdepthbuf_pars_fragment>

    vec3 blurred(vec2 uv, float spread) {
      vec3 sum = texture2D(tDiffuse, uv).rgb * 0.28;
      vec2 d = vec2(texel * spread);
      sum += texture2D(tDiffuse, uv + vec2(d.x, 0.0)).rgb * 0.12;
      sum += texture2D(tDiffuse, uv - vec2(d.x, 0.0)).rgb * 0.12;
      sum += texture2D(tDiffuse, uv + vec2(0.0, d.y)).rgb * 0.12;
      sum += texture2D(tDiffuse, uv - vec2(0.0, d.y)).rgb * 0.12;
      sum += texture2D(tDiffuse, uv + d).rgb * 0.06;
      sum += texture2D(tDiffuse, uv - d).rgb * 0.06;
      sum += texture2D(tDiffuse, uv + vec2(d.x, -d.y)).rgb * 0.06;
      sum += texture2D(tDiffuse, uv - vec2(d.x, -d.y)).rgb * 0.06;
      return sum;
    }

    void main() {
      #include <logdepthbuf_fragment>
      float r = length(vWorld.xz);
      float onPlatform = 1.0 - smoothstep(platformRadius - 0.01, platformRadius + 0.01, r);
      float fade = 1.0 - smoothstep(fadeRadius * 0.3, fadeRadius, r);

      // Plataforma: un poco más clara, con surcos concéntricos finos.
      float grooves = 0.5 + 0.5 * sin(r * 90.0);
      vec3 base = baseColor * (0.35 + 0.65 * fade);
      base += onPlatform * (vec3(0.012) + grooves * 0.006);

      vec2 uv = vUv.xy / vUv.w;
      vec3 reflection = blurred(uv, mix(2.5, 5.0, 1.0 - onPlatform)) * color;
      float strength = reflectivity * mix(0.45, 1.0, onPlatform) * fade;
      gl_FragColor = vec4(base + reflection * strength, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
};

/** Textura de sombra de contacto: rectángulo redondeado muy difuminado. */
function createContactShadowTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear la sombra de contacto.');
  ctx.filter = 'blur(18px)';
  ctx.fillStyle = 'rgba(0,0,0,0.95)';
  ctx.beginPath();
  ctx.roundRect(34, 34, 60, 188, 26);
  ctx.fill();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Degradado vertical para el telón de fondo cilíndrico. */
function createBackdropTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el fondo del estudio.');
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#020203');
  gradient.addColorStop(0.55, '#0b0d12');
  gradient.addColorStop(0.8, '#111319');
  gradient.addColorStop(1, '#07080a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4, 256);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export interface StudioOptions {
  livery: LiveryConfig;
}

/** Encuadre de la cámara en órbita alrededor del auto. */
interface Orbit {
  angle: number;
  radius: number;
  height: number;
}

/** Encuadres del garaje: la cámara se acerca a la pieza que se está editando. */
export type StudioShot = 'overview' | 'side' | 'front' | 'wheel' | 'rear' | 'helmet';

interface ShotDef {
  angle: number;
  radius: number;
  height: number;
  /** Punto que mira la cámara (y alrededor del cual gira). */
  look: [number, number, number];
}

// Ángulo 0 = detrás del auto (+Z); π = de frente. El morro apunta a −Z.
const SHOTS: Readonly<Record<StudioShot, ShotDef>> = {
  overview: { angle: -2.35, radius: 8.6, height: 1.8, look: [0, 0.42, 0] },
  side: { angle: -Math.PI / 2 - 0.12, radius: 7.4, height: 1.25, look: [0, 0.45, 0] },
  front: { angle: -2.75, radius: 4.4, height: 2.5, look: [0, 0.3, -1.9] },
  wheel: { angle: -1.95, radius: 3.1, height: 0.62, look: [-0.8, 0.36, -1.78] },
  rear: { angle: 0.62, radius: 4.8, height: 1.75, look: [0, 0.8, 2.3] },
  helmet: { angle: -2.45, radius: 2.5, height: 1.35, look: [0, 0.74, -0.2] },
};

/**
 * Tablas de las luces de área (dos texturas de 64×64). `init()` crea tablas
 * nuevas cada vez sin liberar las anteriores: se llama una sola vez por página
 * (si no, cada vuelta al menú dejaba dos texturas más en la GPU).
 */
let rectAreaLightsReady = false;
function initRectAreaLights(): void {
  if (rectAreaLightsReady) return;
  RectAreaLightUniformsLib.init();
  rectAreaLightsReady = true;
}

export class StudioScene implements RenderView {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(30, 16 / 9, 0.1, 80);
  readonly car: CarModel;

  private readonly own = new Disposer();
  private readonly environment: EnvironmentMap;
  private readonly keyLight: SpotLight;
  private readonly rimLight: SpotLight;
  private readonly shadowCatcher: Mesh;
  private readonly matteFloor: Mesh;
  private reflector: Reflector | null = null;
  private readonly floorGeometry: CircleGeometry;
  private readonly reflectorGeometry: CircleGeometry;
  private readonly platform = new Group();

  private readonly orbit: Orbit = { angle: -0.6, radius: 9, height: 1.5 };
  /** Punto que mira la cámara (y el que se quiere mirar), para los encuadres del garaje. */
  private readonly look = new Vector3(0, 0.42, 0);
  private readonly lookTarget = new Vector3(0, 0.42, 0);
  private shot: StudioShot | null = null;
  private readonly orbitTarget: Orbit = { ...this.orbit };
  /** Velocidad de giro automático de la cámara (rad/s). */
  private orbitSpeed = 0.07;
  private readonly pointer = { x: 0, y: 0, smoothX: 0, smoothY: 0 };
  /** Desplazamiento horizontal del encuadre (fracción del ancho): deja lugar al menú. */
  private frameShift = 0;
  private viewport = { width: 1, height: 1 };
  private reflectionScale = 0;
  private time = 0;
  /** Conos de luz, polvo y pulso del piso (se arma al conocer la calidad). */
  private atmosphere: StudioAtmosphere | null = null;
  private atmosphereAmount = -1;

  constructor(
    private readonly renderer: WebGLRenderer,
    options: StudioOptions,
    anisotropy: number,
  ) {
    initRectAreaLights();
    this.scene.background = BACKGROUND;
    this.scene.fog = new FogExp2(BACKGROUND, 0.045);

    this.environment = createStudioEnvironment(renderer);
    this.own.add(() => this.environment.dispose());
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 1.15;

    // ─── Luces ───
    this.scene.add(new HemisphereLight('#1d2433', '#000000', 0.35));

    this.keyLight = new SpotLight('#ffffff', 95, 20, 0.62, 0.85, 2);
    this.keyLight.position.set(2.8, 7.5, -3.2);
    this.keyLight.shadow.bias = -0.0004;
    this.keyLight.shadow.normalBias = 0.02;
    this.keyLight.shadow.radius = 5;
    this.keyLight.shadow.camera.near = 3;
    this.keyLight.shadow.camera.far = 14;
    this.scene.add(this.keyLight, this.keyLight.target);

    this.rimLight = new SpotLight('#ff2a3c', 40, 18, 0.55, 1, 2);
    this.rimLight.position.set(-5, 3, 7);
    this.scene.add(this.rimLight, this.rimLight.target);

    for (const [x, z, intensity] of [
      [5.5, -1.5, 1.4],
      [-5.5, 1.5, 1.4],
    ] as const) {
      const panel = new RectAreaLight('#dfe8ff', intensity, 1.2, 4.5);
      panel.position.set(x, 1.9, z);
      panel.lookAt(0, 0.5, 0);
      this.scene.add(panel);
    }

    // ─── Piso, plataforma y fondo ───
    this.floorGeometry = this.own.own(new CircleGeometry(FLOOR_RADIUS, 96));
    this.floorGeometry.rotateX(-Math.PI / 2);
    this.reflectorGeometry = this.own.own(new CircleGeometry(FLOOR_RADIUS, 96));

    const matteMaterial = this.own.own(new MeshStandardMaterial({ color: '#08090b', roughness: 0.55, metalness: 0.1 }));
    this.matteFloor = new Mesh(this.floorGeometry, matteMaterial);
    this.matteFloor.receiveShadow = true;
    this.scene.add(this.matteFloor);

    const shadowGeometry = this.own.own(new PlaneGeometry(14, 14));
    shadowGeometry.rotateX(-Math.PI / 2);
    this.shadowCatcher = new Mesh(shadowGeometry, this.own.own(new ShadowMaterial({ opacity: 0.55 })));
    this.shadowCatcher.position.y = 0.002;
    this.shadowCatcher.receiveShadow = true;
    this.scene.add(this.shadowCatcher);

    const contactTexture = this.own.own(createContactShadowTexture());
    const contactGeometry = this.own.own(new PlaneGeometry(2.7, 6.6));
    contactGeometry.rotateX(-Math.PI / 2);
    const contact = new Mesh(
      contactGeometry,
      this.own.own(new MeshBasicMaterial({ map: contactTexture, transparent: true, depthWrite: false, opacity: 0.9 })),
    );
    contact.position.y = 0.004;
    contact.renderOrder = 1;
    this.platform.add(contact);

    this.buildPlatformRing();
    this.buildBackdrop();
    this.scene.add(this.platform);

    // ─── Auto ───
    this.car = new CarModel({ livery: options.livery, anisotropy });
    this.car.root.position.y = 0.001;
    this.car.setSteer(0.28);
    this.platform.add(this.car.root);
    this.keyLight.target.position.set(0, 0.4, 0);
    this.rimLight.target.position.set(0, 0.4, 0);

    this.applyOrbitToCamera();
  }

  /** Posición del puntero normalizada (−1…1) para el paralaje suave de la cámara. */
  setPointer(x: number, y: number): void {
    this.pointer.x = x;
    this.pointer.y = y;
  }

  /** Corre el encuadre para dejar espacio a la interfaz (−0.5…0.5 del ancho). */
  setFrameShift(fraction: number): void {
    this.frameShift = fraction;
    this.updateViewOffset();
  }

  /**
   * Encuadre del garaje (la cámara deja de girar sola y se acerca a la pieza),
   * o `null` para volver al giro lento del menú.
   */
  setShot(shot: StudioShot | null): void {
    this.shot = shot;
    if (shot === null) {
      this.orbitSpeed = 0.07;
      this.orbitTarget.radius = 9;
      this.orbitTarget.height = 1.5;
      this.lookTarget.set(0, 0.42, 0);
      return;
    }
    const def = SHOTS[shot];
    this.orbitSpeed = 0;
    // El ángulo actual se lleva a la vuelta más cercana del destino: gira por el camino corto.
    const turns = Math.round((this.orbit.angle - def.angle) / (Math.PI * 2));
    this.orbit.angle -= turns * Math.PI * 2;
    this.orbitTarget.angle = def.angle;
    this.orbitTarget.radius = def.radius;
    this.orbitTarget.height = def.height;
    this.lookTarget.set(...def.look);
  }

  /** Acercamiento cinematográfico de entrada: arranca cerca y bajo y se abre. */
  playIntro(): void {
    this.orbit.radius = 5.4;
    this.orbit.height = 0.55;
    this.orbit.angle = this.orbitTarget.angle - 0.9;
  }

  update(dt: number): void {
    this.time += dt;
    this.orbitTarget.angle += this.orbitSpeed * dt;
    this.orbit.angle = damp(this.orbit.angle, this.orbitTarget.angle, 1.6, dt);
    this.orbit.radius = damp(this.orbit.radius, this.orbitTarget.radius, 1.4, dt);
    this.orbit.height = damp(this.orbit.height, this.orbitTarget.height, 1.4, dt);
    this.look.x = damp(this.look.x, this.lookTarget.x, 2.2, dt);
    this.look.y = damp(this.look.y, this.lookTarget.y, 2.2, dt);
    this.look.z = damp(this.look.z, this.lookTarget.z, 2.2, dt);
    this.pointer.smoothX = damp(this.pointer.smoothX, this.pointer.x, 2.5, dt);
    this.pointer.smoothY = damp(this.pointer.smoothY, this.pointer.y, 2.5, dt);
    this.applyOrbitToCamera();

    this.atmosphere?.update(dt);

    // Luz trasera "respirando", como un auto encendido en boxes.
    this.car.setRearLight(0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.time * 2.2)));
  }

  onGraphicsChanged(graphics: GraphicsSettings): void {
    const size = shadowMapSize(graphics.shadows, graphics.quality);
    const shadows = size > 0;
    this.keyLight.castShadow = shadows;
    if (shadows && this.keyLight.shadow.mapSize.x !== size) {
      this.keyLight.shadow.mapSize.set(size, size);
      this.keyLight.shadow.map?.dispose();
      this.keyLight.shadow.map = null;
    }
    this.shadowCatcher.visible = shadows;
    this.setReflectionScale(QUALITY_PRESETS[graphics.quality].reflectionScale);
    this.buildAtmosphere(QUALITY_PRESETS[graphics.quality].particles);
  }

  onResize(width: number, height: number, pixelRatio: number): void {
    this.viewport = { width, height };
    this.camera.aspect = width / height;
    this.updateViewOffset();
    this.resizeReflection(pixelRatio);
    this.atmosphere?.setViewHeight(height * pixelRatio);
  }

  dispose(): void {
    this.atmosphere?.dispose();
    this.destroyReflector();
    this.car.dispose();
    this.own.dispose();
    this.scene.clear();
  }

  // ─── Interno ───────────────────────────────────────────────────────────

  /** Conos visibles bajo los focos, polvo en el aire y el pulso del piso. */
  private buildAtmosphere(amount: number): void {
    if (amount === this.atmosphereAmount) return;
    this.atmosphereAmount = amount;
    this.atmosphere?.dispose();
    this.atmosphere = new StudioAtmosphere(
      [
        { from: this.keyLight.position, to: new Vector3(0, 0, 0), color: '#fff4e6', intensity: 0.16, radius: 2.4 },
        { from: new Vector3(-3.2, 7.6, 2.6), to: new Vector3(-0.6, 0, 0.4), color: '#dfe8ff', intensity: 0.09, radius: 1.8 },
        { from: this.rimLight.position, to: new Vector3(0, 0.2, 0), color: '#ff2a3c', intensity: 0.1, radius: 1.6 },
      ],
      PLATFORM_RADIUS,
      amount,
    );
    this.atmosphere.setViewHeight(this.viewport.height * this.renderer.getPixelRatio());
    this.scene.add(this.atmosphere.root);
  }

  private applyOrbitToCamera(): void {
    // En el garaje la cámara se balancea apenas alrededor del encuadre.
    const sway = this.shot !== null ? Math.sin(this.time * 0.35) * 0.1 : 0;
    const angle = this.orbit.angle + this.pointer.smoothX * 0.12 + sway;
    const height = this.orbit.height + this.pointer.smoothY * 0.25;
    this.camera.position.set(this.look.x + Math.sin(angle) * this.orbit.radius, height, this.look.z + Math.cos(angle) * this.orbit.radius);
    this.camera.lookAt(TARGET.copy(this.look));
  }

  private updateViewOffset(): void {
    const { width, height } = this.viewport;
    if (this.frameShift === 0) {
      this.camera.clearViewOffset();
    } else {
      this.camera.setViewOffset(width, height, -this.frameShift * width, 0, width, height);
    }
    this.camera.updateProjectionMatrix();
  }

  private setReflectionScale(scale: number): void {
    if (scale === this.reflectionScale && (scale === 0) === (this.reflector === null)) return;
    this.reflectionScale = scale;
    this.destroyReflector();
    if (scale > 0) {
      // El Reflector refleja respecto de su +Z local: se usa un disco sin rotar y se gira la malla.
      const reflector = new Reflector(this.reflectorGeometry, {
        textureWidth: 512,
        textureHeight: 512,
        clipBias: 0.002,
        multisample: 0,
        shader: FLOOR_SHADER,
      });
      reflector.rotation.x = -Math.PI / 2;
      this.reflector = reflector;
      this.scene.add(reflector);
      this.resizeReflection(this.renderer.getPixelRatio());
    }
    this.matteFloor.visible = this.reflector === null;
  }

  private resizeReflection(pixelRatio: number): void {
    if (!this.reflector) return;
    const w = Math.max(64, Math.round(this.viewport.width * pixelRatio * this.reflectionScale));
    const h = Math.max(64, Math.round(this.viewport.height * pixelRatio * this.reflectionScale));
    this.reflector.getRenderTarget().setSize(w, h);
    const material = this.reflector.material as { uniforms?: Record<string, { value: unknown }> };
    const texel = material.uniforms?.texel;
    if (texel) texel.value = 1 / Math.max(w, h);
  }

  private destroyReflector(): void {
    if (!this.reflector) return;
    this.scene.remove(this.reflector);
    this.reflector.dispose();
    this.reflector = null;
  }

  private buildPlatformRing(): void {
    // Aro luminoso rojo (brilla con el bloom) y bisel metálico.
    const glowGeometry = this.own.own(new RingGeometry(PLATFORM_RADIUS - 0.035, PLATFORM_RADIUS, 160));
    glowGeometry.rotateX(-Math.PI / 2);
    const glow = new Mesh(glowGeometry, this.own.own(new MeshBasicMaterial({ color: new Color('#ff2a3c').multiplyScalar(3) })));
    glow.position.y = 0.006;
    this.scene.add(glow);

    const bevelGeometry = this.own.own(new CylinderGeometry(PLATFORM_RADIUS + 0.03, PLATFORM_RADIUS + 0.06, 0.02, 160, 1, true));
    const bevel = new Mesh(
      bevelGeometry,
      this.own.own(new MeshStandardMaterial({ color: '#2a2d33', metalness: 1, roughness: 0.25, side: DoubleSide })),
    );
    bevel.position.y = 0.01;
    this.scene.add(bevel);
  }

  private buildBackdrop(): void {
    // Telón cilíndrico con degradado.
    const backdropTexture = this.own.own(createBackdropTexture());
    const backdropGeometry = this.own.own(new CylinderGeometry(18, 18, 12, 64, 1, true));
    const backdrop = new Mesh(
      backdropGeometry,
      this.own.own(new MeshBasicMaterial({ map: backdropTexture, side: DoubleSide, fog: false })),
    );
    backdrop.position.y = 5.5;
    this.scene.add(backdrop);

    // Tiras de luz verticales alrededor: paneles LED con el brillo que se
    // desvanece hacia las puntas y los costados (no palos duros), aditivos.
    const stripGeometry = this.own.own(new PlaneGeometry(0.5, 5));
    const stripMaterial = (hex: string, power: number): ShaderMaterial =>
      this.own.own(
        new ShaderMaterial({
          vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,
          fragmentShader: /* glsl */ `
            uniform vec3 color;
            varying vec2 vUv;
            void main() {
              float across = abs(vUv.x - 0.5) * 2.0;
              // Núcleo fino y brillante con un halo suave alrededor.
              float glow = exp(-across * across * 90.0) + 0.22 * exp(-across * across * 7.0);
              float ends = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.72, vUv.y);
              gl_FragColor = vec4(color * glow * ends, 1.0);
            }`,
          uniforms: { color: { value: new Color(hex).multiplyScalar(power) } },
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
          fog: false,
        }),
      );
    const white = stripMaterial('#dfe8ff', 1.5);
    const red = stripMaterial('#ff2a3c', 1.8);
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const strip = new Mesh(stripGeometry, i % 7 === 3 ? red : white);
      strip.position.set(Math.sin(angle) * 15, 2.6, Math.cos(angle) * 15);
      strip.lookAt(0, 2.6, 0);
      strip.renderOrder = 4;
      this.scene.add(strip);
    }
  }
}

const TARGET = new Vector3();
