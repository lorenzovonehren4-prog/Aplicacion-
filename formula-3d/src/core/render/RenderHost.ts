/**
 * Renderer único del juego. Ver PLAN.md §4.4.
 *
 * Con posprocesado o MSAA dibuja a través de un `EffectComposer` (RenderPass
 * con MSAA → bloom → OutputPass con tone mapping y sRGB). En calidad Baja dibuja
 * directo al lienzo, que tiene su propio antialiasing (el del contexto WebGL,
 * barato): así hasta en Baja los bordes se ven limpios. La calidad cambia en
 * caliente sin recrear el contexto.
 */

import {
  ACESFilmicToneMapping,
  HalfFloatType,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { GraphicsSettings } from '../save/schema';
import { QUALITY_PRESETS } from './quality';
import { SpeedPass, type SpeedFx } from './SpeedPass';

/**
 * Bloom con resolución ajustable: el de three.js trabaja a la mitad de la
 * pantalla; en calidad Media se lo achica otra mitad (un cuarto de los
 * píxeles), que en un brillo difuso casi no se nota y alivia la GPU.
 */
class ScaledBloomPass extends UnrealBloomPass {
  private scale = 1;
  private fullWidth = 1;
  private fullHeight = 1;

  override setSize(width: number, height: number): void {
    this.fullWidth = width;
    this.fullHeight = height;
    super.setSize(Math.max(2, Math.round(width * this.scale)), Math.max(2, Math.round(height * this.scale)));
  }

  setScale(scale: number): void {
    if (scale === this.scale) return;
    this.scale = scale;
    this.setSize(this.fullWidth, this.fullHeight);
  }
}

/** Lo que una pantalla 3D entrega para dibujar. */
export interface RenderView {
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  /** Exposición del tone mapping (1 por defecto; un cielo físico pide menos). */
  readonly exposure?: number;
  /**
   * Umbral de luminancia del bloom (lineal, antes del tone mapping). Una escena
   * a cielo abierto lo sube para que sólo brillen los reflejos del sol.
   */
  readonly bloomThreshold?: number;
  /**
   * Imagen congelada (p. ej., en pausa): se dibuja un cuadro y después no se
   * vuelve a dibujar hasta que cambie algo. Ahorra GPU y batería.
   */
  readonly frozen?: boolean;
  /** Desenfoque de velocidad y aire caliente (sólo con posprocesado). */
  readonly speedFx?: SpeedFx;
  /** Ajustes gráficos nuevos (sombras, reflejos...). */
  onGraphicsChanged?(graphics: GraphicsSettings): void;
  /** Tamaño nuevo del lienzo en píxeles CSS y densidad de píxeles efectiva. */
  onResize?(width: number, height: number, pixelRatio: number): void;
  /** Alivio inmediato sin recompilar sombreadores (ver `RenderHost.lighten`). */
  onLighten?(): void;
  /** Lo que se dibuja encima del cuadro terminado (el retrovisor de la carrera). */
  overlay?(renderer: WebGLRenderer): void;
}

export interface RenderStats {
  drawCalls: number;
  triangles: number;
}

/** Parámetros del bloom: sólo brillan emisivos y reflejos muy intensos. */
const BLOOM = { strength: 0.55, radius: 0.55, threshold: 0.92 };

export class RenderHost {
  readonly renderer: WebGLRenderer;
  private composer: EffectComposer;
  private readonly renderPass: RenderPass;
  private readonly bloomPass: ScaledBloomPass;
  private readonly outputPass: OutputPass;
  private readonly speedPass = new SpeedPass();
  private view: RenderView | null = null;
  private graphics: GraphicsSettings;
  private width = 1;
  private height = 1;
  private msaaSamples = -1;
  private lastStats: RenderStats = { drawCalls: 0, triangles: 0 };
  /** Dibujo directo al lienzo, sin composer (calidad Baja). */
  private directRender = false;
  /** Ya se dibujó el cuadro congelado de la vista actual. */
  private frozenFrameDrawn = false;
  /** Alivio en curso (ver `lighten`): hasta el próximo cambio de ajustes. */
  private lightened = false;

  /**
   * @param antialias antialiasing del lienzo (lo usa la calidad Baja). Se apaga
   *   con GPU por software: ahí cuesta tanto como dibujar la escena dos veces.
   */
  constructor(
    readonly canvas: HTMLCanvasElement,
    graphics: GraphicsSettings,
    antialias = true,
  ) {
    this.graphics = graphics;
    this.renderer = new WebGLRenderer({
      canvas,
      // Antialiasing del lienzo: lo usa la calidad Baja (dibujo directo, sin composer).
      antialias,
      alpha: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.setClearColor(0x000000, 1);
    // Las estadísticas se reinician a mano: el composer dibuja varias veces por fotograma.
    this.renderer.info.autoReset = false;

    // Escena vacía hasta que una pantalla entregue su vista.
    this.renderPass = new RenderPass(new Scene(), new PerspectiveCamera());
    this.bloomPass = new ScaledBloomPass(new Vector2(256, 256), BLOOM.strength, BLOOM.radius, BLOOM.threshold);
    this.outputPass = new OutputPass();
    this.composer = this.createComposer(0);
    this.applyGraphics(graphics);
  }

  /** Nombre de la GPU según WebGL (para elegir la calidad inicial), o undefined si se oculta. */
  static probeGpu(): string | undefined {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      if (!gl) return undefined;
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      const name: unknown = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return typeof name === 'string' ? name : undefined;
    } catch {
      return undefined;
    }
  }

  /** ¿El navegador soporta WebGL 2? (requisito del juego) */
  static isSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return canvas.getContext('webgl2') !== null;
    } catch {
      return false;
    }
  }

  /** Filtrado anisotrópico para las texturas: el de la calidad actual (8× o 16×), sin pasar el de la GPU. */
  get textureAnisotropy(): number {
    const wanted = QUALITY_PRESETS[this.currentGraphics.quality].anisotropy;
    return Math.max(1, Math.min(wanted, this.renderer.capabilities.getMaxAnisotropy()));
  }

  get stats(): RenderStats {
    return this.lastStats;
  }

  get currentGraphics(): GraphicsSettings {
    return this.graphics;
  }

  /**
   * ¿La escena se dibuja directo al lienzo (sin composer)? Los sombreadores se
   * compilan distinto según el destino: hay que precompilar para éste.
   */
  get drawsToCanvas(): boolean {
    return this.directRender;
  }

  /** Vista a dibujar (null = pantalla negra). */
  setView(view: RenderView | null): void {
    this.view = view;
    this.frozenFrameDrawn = false;
    if (view) {
      this.renderPass.scene = view.scene;
      this.renderPass.camera = view.camera;
      this.renderer.toneMappingExposure = view.exposure ?? 1;
      this.bloomPass.threshold = view.bloomThreshold ?? BLOOM.threshold;
      view.camera.aspect = this.width / this.height;
      view.camera.updateProjectionMatrix();
      view.onGraphicsChanged?.(this.graphics);
      view.onResize?.(this.width, this.height, this.renderer.getPixelRatio());
    }
  }

  applyGraphics(graphics: GraphicsSettings): void {
    this.graphics = graphics;
    this.lightened = false;
    const preset = QUALITY_PRESETS[graphics.quality];

    const shadows = graphics.shadows !== 'off';
    if (this.renderer.shadowMap.enabled !== shadows) {
      this.renderer.shadowMap.enabled = shadows;
      // Los materiales se recompilan para incluir (o quitar) las sombras.
      this.view?.scene.traverse((object) => {
        const material = (object as { material?: { needsUpdate: boolean } | Array<{ needsUpdate: boolean }> }).material;
        if (Array.isArray(material)) for (const m of material) m.needsUpdate = true;
        else if (material) material.needsUpdate = true;
      });
    }

    if (preset.msaaSamples !== this.msaaSamples) {
      this.composer.dispose();
      this.composer = this.createComposer(preset.msaaSamples);
    }
    this.bloomPass.enabled = graphics.postprocessing;
    this.bloomPass.setScale(preset.bloomScale);
    this.directRender = !graphics.postprocessing && preset.msaaSamples === 0;
    this.resize(this.width, this.height);
    this.view?.onGraphicsChanged?.(graphics);
  }

  /**
   * Alivio inmediato cuando faltan FPS en carrera, sin tocar nada que recompile
   * sombreadores (eso queda para la próxima sesión): sin bloom, sin MSAA (el
   * composer sigue: los sombreadores no cambian), densidad de píxeles 1 y la
   * vista achica sus sombras. Dura hasta el próximo cambio de ajustes.
   */
  lighten(): void {
    if (this.lightened) return;
    this.lightened = true;
    this.bloomPass.enabled = false;
    if (this.msaaSamples > 0) {
      this.composer.dispose();
      this.composer = this.createComposer(0);
    }
    this.resize(this.width, this.height);
    this.view?.onLighten?.();
  }

  /** Tamaño del lienzo en píxeles CSS. */
  resize(width: number, height: number): void {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    const preset = QUALITY_PRESETS[this.graphics.quality];
    const deviceRatio = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    const maxRatio = this.lightened ? 1 : preset.maxPixelRatio;
    const pixelRatio = Math.max(0.5, Math.min(deviceRatio, maxRatio) * this.graphics.resolutionScale);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(this.width, this.height, false);
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(this.width, this.height);
    this.frozenFrameDrawn = false;
    if (this.view) {
      this.view.camera.aspect = this.width / this.height;
      this.view.camera.updateProjectionMatrix();
      this.view.onResize?.(this.width, this.height, pixelRatio);
    }
  }

  render(): void {
    this.renderer.info.reset();
    if (!this.view) {
      this.renderer.setRenderTarget(null);
      this.renderer.clear();
      return;
    }
    if (this.view.frozen) {
      if (this.frozenFrameDrawn) return;
      this.frozenFrameDrawn = true;
    } else {
      this.frozenFrameDrawn = false;
    }
    if (this.directRender) {
      // Sin posprocesado ni MSAA: directo al lienzo (el tone mapping y el sRGB
      // los aplica cada material). Ahorra un búfer de pantalla completa y una pasada.
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.view.scene, this.view.camera);
    } else {
      this.speedPass.apply(this.view.speedFx, this.graphics.postprocessing);
      this.composer.render();
    }
    this.view.overlay?.(this.renderer);
    this.lastStats = {
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
    };
  }

  dispose(): void {
    this.composer.dispose();
    this.bloomPass.dispose();
    this.speedPass.dispose();
    this.outputPass.dispose();
    this.renderer.dispose();
  }

  private createComposer(samples: number): EffectComposer {
    this.msaaSamples = samples;
    const target = new WebGLRenderTarget(this.width, this.height, { type: HalfFloatType, samples });
    const composer = new EffectComposer(this.renderer, target);
    composer.addPass(this.renderPass);
    composer.addPass(this.bloomPass);
    composer.addPass(this.speedPass);
    composer.addPass(this.outputPass);
    return composer;
  }
}
