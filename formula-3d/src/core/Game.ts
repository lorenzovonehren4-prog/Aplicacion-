/**
 * Raíz de composición: crea los servicios del juego y los conecta. Ver PLAN.md §4.1.
 * Ningún módulo usa variables globales: todo cuelga de la instancia de `Game`.
 */

import { compileScene, prewarm } from './render/prewarm';
import { AudioManager } from '../audio/AudioManager';
import { MenuMusic } from '../audio/MenuMusic';
import type { UiSound } from '../audio/UiSounds';
import { StudioScene } from '../garage/StudioScene';
import { liveryFromSetup } from '../garage/setup';
import { DiagonalWipe } from '../ui/anim/DiagonalWipe';
import { AchievementToasts } from '../ui/components/AchievementToast';
import { FpsMeter } from '../ui/components/FpsMeter';
import { applyUiScale } from '../ui/scale';
import { achievementContext, getAchievement, newAchievements } from '../progression/career';
import { OnlineRecords } from '../online/OnlineRecords';
import { TRACKS } from '../tracks/registry';
import { EventBus } from './EventBus';
import type { GameEvents } from './events';
import { GameLoop } from './GameLoop';
import { InputManager } from './input/InputManager';
import { classifyGpu, detectQuality } from './render/quality';
import { RenderHost } from './render/RenderHost';
import { SaveManager } from './save/SaveManager';
import type { SaveData, Settings } from './save/schema';
import { createBestStorage } from './save/storage';
import type { ScreenParams } from './screens/params';
import { ScreenManager } from './screens/ScreenManager';
import { Disposer } from './utils/Disposer';
import type { DeepReadonly } from './utils/types';

export interface GameLayers {
  /** Contenedor del canvas y de las pantallas (se desenfoca en las transiciones). */
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  /** Donde se montan las pantallas. */
  ui: HTMLElement;
  /** Capa superior: transiciones y medidor de FPS. */
  overlay: HTMLElement;
}

export class Game {
  readonly events = new EventBus<GameEvents>();
  readonly screens: ScreenManager<ScreenParams>;
  readonly loop: GameLoop;
  /** Récords en línea (tablas compartidas del link; sin conexión fuera de claude.ai). */
  readonly online: OnlineRecords;
  private readonly fpsMeter: FpsMeter;
  private readonly toasts: AchievementToasts;
  /** Música de los menús (se apaga en la pista). */
  private music: MenuMusic | null = null;
  private readonly own = new Disposer();
  private studioPromise: Promise<StudioScene> | null = null;
  private studio: StudioScene | null = null;
  /** Se incrementa al crear o liberar el estudio (descarta creaciones viejas). */
  private studioGeneration = 0;
  private appliedGraphics = '';

  private constructor(
    readonly layers: GameLayers,
    readonly save: SaveManager,
    readonly audio: AudioManager,
    readonly input: InputManager,
    readonly render: RenderHost,
  ) {
    this.screens = new ScreenManager<ScreenParams>({
      host: layers.ui,
      transition: new DiagonalWipe(layers.overlay, layers.stage, () => audio.ui),
      fallback: 'menu',
      onChange: (change) => this.events.emit('screen:changed', change),
      onError: (error) => console.error('[Pantallas]', error),
    });
    this.fpsMeter = new FpsMeter(layers.overlay);
    this.toasts = new AchievementToasts(layers.overlay, () => this.playUi('rewardBig'));
    this.own.add(() => this.toasts.dispose());

    this.loop = new GameLoop({
      fixedUpdate: (step) => this.screens.fixedUpdate(step),
      update: (dt, alpha) => {
        this.input.update();
        this.screens.update(dt, alpha);
        this.fpsMeter.update(dt, this.loop.fps, this.loop.frameMs, this.render.stats);
      },
      render: () => this.render.render(),
    });

    // Entrada → pantallas; el primer gesto habilita el audio (y la música del menú).
    this.own.add(
      input.onAnyInput(() => {
        audio.unlock();
        this.updateMusic();
      }),
    );
    this.own.add(this.events.on('screen:changed', () => this.updateMusic()));

    // Récords en línea: se conectan sin frenar el arranque y no suben nada mientras se corre.
    this.online = new OnlineRecords(save, TRACKS);
    this.own.add(() => this.online.dispose());
    this.own.add(this.events.on('screen:changed', () => this.online.setActive(!this.screens.stackIds.includes('race'))));
    void this.online.start();
    this.own.add(() => this.music?.stop());
    this.own.add(input.onAction((action) => this.screens.dispatch(action)));
    this.own.add(input.onDeviceChange((device) => this.events.emit('input:device', { device })));

    // Cada cambio de ajustes se aplica al instante.
    this.own.add(save.onChange((data) => this.applySettings(data.settings)));
    this.applySettings(save.data.settings);

    // Logros: se revisan después de cada cambio del guardado (carreras, nivel,
    // pase, garaje…) y también al arrancar, por si un guardado viejo ya los cumple.
    this.own.add(save.onChange((data) => this.checkAchievements(data)));
    this.own.timeout(() => this.checkAchievements(save.data), 1500);

    // Tamaño del lienzo y escala de la interfaz (en ventanas chicas, todo se achica en proporción).
    const resize = (): void => {
      this.render.resize(layers.stage.clientWidth, layers.stage.clientHeight);
      applyUiScale(layers.stage.clientWidth, layers.stage.clientHeight);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(layers.stage);
    this.own.add(() => observer.disconnect());
    resize();

    // Pestaña oculta: se guarda y se pausa el audio.
    this.own.listen(document, 'visibilitychange', () => {
      if (document.hidden) {
        void this.save.flush();
        this.audio.suspend();
      } else {
        this.audio.resume();
      }
    });
    this.own.listen(window, 'pagehide', () => void this.save.flush());
  }

  /** Crea todos los servicios. Falla sólo si no hay WebGL 2. */
  static async boot(layers: GameLayers): Promise<Game> {
    const storage = await createBestStorage();
    const gpu = RenderHost.probeGpu();
    const save = await SaveManager.load({
      storage,
      initialQuality: detectQuality({
        gpu,
        hardwareConcurrency: navigator.hardwareConcurrency,
        isMobile: matchMedia('(pointer: coarse)').matches,
      }),
    });
    const audio = new AudioManager(save.data.settings.audio);
    const input = new InputManager(window);
    const render = new RenderHost(layers.canvas, save.data.settings.graphics, classifyGpu(gpu) !== 'software');
    return new Game(layers, save, audio, input, render);
  }

  get settings(): DeepReadonly<Settings> {
    return this.save.data.settings;
  }

  /** Modifica los ajustes: se guardan y se aplican enseguida. */
  updateSettings(mutator: (settings: Settings) => void): void {
    this.save.update((data) => mutator(data.settings));
  }

  /** Música en los menús; en la pista (y antes del primer gesto) no suena. */
  private updateMusic(): void {
    const ctx = this.audio.context;
    const bus = this.audio.bus('music');
    // En pista no hay música, tampoco con Ajustes o el manual abiertos encima de la carrera.
    const stack = this.screens.stackIds;
    const inMenus = stack.length > 0 && !stack.includes('race') && !stack.includes('splash');
    if (inMenus && ctx && bus && ctx.state === 'running') {
      if (!this.music) {
        this.music = new MenuMusic(ctx, bus);
        this.music.start();
      }
    } else if (!inMenus && this.music) {
      this.music.stop();
      this.music = null;
    }
  }

  /** Anota los logros recién cumplidos y los anuncia. */
  private checkAchievements(data: DeepReadonly<SaveData>): void {
    const fresh = newAchievements(achievementContext(data), data.achievements);
    if (fresh.length === 0) return;
    const now = Date.now();
    this.save.update((draft) => {
      for (const id of fresh) draft.achievements[id] = now;
    });
    for (const id of fresh) {
      const achievement = getAchievement(id);
      if (achievement) this.toasts.show(achievement);
    }
  }

  /** Reproduce un sonido de interfaz (no hace nada si el audio aún no está listo). */
  playUi(sound: UiSound): void {
    this.audio.ui?.play(sound);
  }

  /**
   * Estudio 3D compartido por el menú y el garaje. Se crea una sola vez y se
   * precompilan sus shaders para que el menú aparezca sin tirones.
   */
  getStudio(): Promise<StudioScene> {
    if (this.studioPromise) return this.studioPromise;
    const generation = ++this.studioGeneration;
    const promise = (async () => {
      const studio = new StudioScene(this.render.renderer, { livery: liveryFromSetup(this.save.data.garage) }, this.render.textureAnisotropy);
      studio.onGraphicsChanged(this.render.currentGraphics);
      // Con compilación paralela de shaders se espera sin trabar la animación;
      // sin ella, se compila de una vez (evita el tirón del primer fotograma).
      // Siempre para el destino real (lienzo o búfer): si no, se compila dos veces.
      const renderer = this.render.renderer;
      const toCanvas = this.render.drawsToCanvas;
      await compileScene(renderer, studio.scene, studio.camera, toCanvas);
      // Y sube su geometría y texturas: el menú aparece sin un primer cuadro lento.
      prewarm(renderer, studio.scene, studio.camera, toCanvas);
      // Si se liberó mientras se creaba, `releaseStudio` se encarga de éste.
      if (this.studioGeneration === generation) this.studio = studio;
      return studio;
    })();
    this.studioPromise = promise;
    return promise;
  }

  /**
   * Libera el estudio (al salir a pista: su mapa de entorno, reflejos y el auto
   * ocupan memoria de video que el circuito necesita). El menú lo vuelve a crear.
   */
  releaseStudio(): void {
    const pending = this.studioPromise;
    const ready = this.studio;
    this.studioGeneration++;
    this.studioPromise = null;
    this.studio = null;
    if (ready) ready.dispose();
    // Si todavía se estaba creando, se libera en cuanto termine.
    else pending?.then((studio) => studio.dispose()).catch(() => undefined);
  }

  start(): void {
    this.loop.start();
  }

  async dispose(): Promise<void> {
    this.loop.stop();
    await this.screens.destroy();
    await this.save.flush();
    this.save.dispose();
    this.own.dispose();
    this.studio?.dispose();
    this.input.dispose();
    this.audio.dispose();
    this.render.dispose();
    this.events.clear();
  }

  private applySettings(settings: DeepReadonly<Settings>): void {
    const graphicsKey = JSON.stringify(settings.graphics);
    if (graphicsKey !== this.appliedGraphics) {
      this.appliedGraphics = graphicsKey;
      this.render.applyGraphics({ ...settings.graphics });
      this.loop.setFpsTarget(settings.graphics.fpsTarget);
      this.fpsMeter.setVisible(settings.graphics.showFps);
    }
    this.audio.setVolumes({ ...settings.audio });
    this.events.emit('settings:changed', { settings });
  }
}
