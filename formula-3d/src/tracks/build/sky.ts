/**
 * Cielo físico (dispersión atmosférica), sol con sombras que siguen al auto,
 * luz ambiente del cielo y mapa de entorno generado desde el mismo cielo (así
 * la pintura del auto refleja el cielo real de la escena).
 */

import {
  Color,
  DirectionalLight,
  FogExp2,
  HemisphereLight,
  MathUtils,
  PMREMGenerator,
  Scene,
  Vector3,
  type Object3D,
  type Texture,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import type { TrackEnvironment } from '../TrackDefinition';

/** Tamaño de la zona con sombras alrededor del auto (m). */
const SHADOW_EXTENT = 80;
/**
 * Escala del brillo del cielo. El shader físico devuelve luminancias de 3 a 10
 * (pensadas para exposiciones de ~0,5): así queda por debajo del umbral del
 * bloom y en el mismo rango que los objetos iluminados por el sol.
 */
const SKY_INTENSITY = 0.22;

/** Multiplica la salida del shader del cielo por `SKY_INTENSITY`. */
function dimSky(sky: Sky): void {
  sky.material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      'gl_FragColor = vec4( texColor, 1.0 );',
      `gl_FragColor = vec4( texColor * ${SKY_INTENSITY.toFixed(3)}, 1.0 );`,
    );
  };
}

export interface SkyEnvironment {
  readonly objects: Object3D[];
  readonly sun: DirectionalLight;
  readonly environment: Texture;
  readonly fog: FogExp2;
  /** Mueve la cámara de sombras para que siga al auto (sin parpadeo de texeles). */
  follow(x: number, z: number): void;
  setShadowMapSize(size: number): void;
  dispose(): void;
}

export function createSky(renderer: WebGLRenderer, env: TrackEnvironment): SkyEnvironment {
  const sky = new Sky();
  sky.scale.setScalar(20000);
  dimSky(sky);
  const uniforms = sky.material.uniforms;
  const set = (name: string, value: number): void => {
    const uniform = uniforms[name];
    if (uniform) uniform.value = value;
  };
  set('turbidity', env.turbidity);
  set('rayleigh', 1.2);
  set('mieCoefficient', 0.004);
  set('mieDirectionalG', 0.82);
  // Sin disco solar: su brillo (miles de veces el del cielo) inunda el bloom y
  // el mapa de entorno, y lava toda la escena.
  const disc = uniforms.showSunDisc;
  if (disc) disc.value = 0;

  // Dirección del sol: azimut desde el norte (−Z) hacia el este (+X).
  const phi = MathUtils.degToRad(90 - env.sunElevation);
  const theta = MathUtils.degToRad(env.sunAzimuth);
  const sunDirection = new Vector3(Math.sin(phi) * Math.sin(theta), Math.cos(phi), -Math.sin(phi) * Math.cos(theta));
  (uniforms.sunPosition?.value as Vector3 | undefined)?.copy(sunDirection);

  // Mapa de entorno desde el cielo.
  const pmrem = new PMREMGenerator(renderer);
  const envScene = new Scene();
  const envSky = new Sky();
  envSky.scale.setScalar(1000);
  dimSky(envSky);
  for (const [name, uniform] of Object.entries(uniforms)) {
    const target = envSky.material.uniforms[name];
    const value: unknown = uniform.value;
    if (target) target.value = value instanceof Vector3 ? value.clone() : value;
  }
  envScene.add(envSky);
  const target: WebGLRenderTarget = pmrem.fromScene(envScene, 0.03);
  pmrem.dispose();
  envSky.geometry.dispose();
  envSky.material.dispose();

  const sun = new DirectionalLight(new Color('#fff4e2'), 3.2);
  sun.castShadow = true;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius = 3;
  const camera = sun.shadow.camera;
  camera.left = -SHADOW_EXTENT;
  camera.right = SHADOW_EXTENT;
  camera.top = SHADOW_EXTENT;
  camera.bottom = -SHADOW_EXTENT;
  camera.near = 1;
  camera.far = 600;
  camera.updateProjectionMatrix();

  const hemisphere = new HemisphereLight(new Color('#bcd4ff'), new Color('#4a5a32'), 0.55);

  // Niebla del color del horizonte.
  const fog = new FogExp2(new Color('#c9d6e3'), env.fogDensity);

  const offset = sunDirection.clone().multiplyScalar(250);
  let mapSize = 0;

  return {
    objects: [sky, sun, sun.target, hemisphere],
    sun,
    environment: target.texture,
    fog,
    follow(x: number, z: number) {
      // Se ajusta a la grilla de texeles para que las sombras no "tiemblen".
      const texel = (SHADOW_EXTENT * 2) / Math.max(256, mapSize);
      const sx = Math.round(x / texel) * texel;
      const sz = Math.round(z / texel) * texel;
      sun.target.position.set(sx, 0, sz);
      sun.position.set(sx + offset.x, offset.y, sz + offset.z);
    },
    setShadowMapSize(size: number) {
      mapSize = size;
      sun.castShadow = size > 0;
      if (size > 0 && sun.shadow.mapSize.x !== size) {
        sun.shadow.mapSize.set(size, size);
        sun.shadow.map?.dispose();
        sun.shadow.map = null;
      }
    },
    dispose() {
      target.dispose();
      sky.geometry.dispose();
      sky.material.dispose();
      sun.shadow.map?.dispose();
    },
  };
}
