/**
 * Ajustes (se apila sobre el menú y, desde la Fase 3, sobre la pausa).
 * Fase 1: pestañas Gráficos y Sonido. Controles, Ayudas y Juego se suman en las
 * fases 2, 3 y 8, cuando tengan efecto real. Todo se aplica y se guarda al
 * instante.
 */

import gsap from 'gsap';
import { EngineSynth } from '../../audio/EngineSynth';
import type { Game } from '../../core/Game';
import type { UiAction } from '../../core/input/actions';
import { detectQuality, QUALITY_PRESETS, type FpsTarget, type QualityLevel, type ShadowLevel } from '../../core/render/quality';
import { createDefaultAudio, createDefaultGraphics } from '../../core/save/schema';
import type { ScreenParams, SettingsTab } from '../../core/screens/params';
import { Disposer } from '../../core/utils/Disposer';
import { h, prefersReducedMotion } from '../dom';
import { finished } from '../anim/finished';
import { ControlHints } from '../components/ControlHints';
import { actionRow, selectorRow, sliderRow, toggleRow, type RowContext, type SettingRow } from '../components/SettingRows';
import { BaseScreen } from './BaseScreen';

const TABS: ReadonlyArray<{ id: SettingsTab; label: string }> = [
  { id: 'graphics', label: 'Gráficos' },
  { id: 'audio', label: 'Sonido' },
];

/** Tiempo mínimo entre dos muestras del motor al mover su volumen (ms). */
const ENGINE_PREVIEW_GAP = 700;

export class SettingsScreen extends BaseScreen<ScreenParams['settings']> {
  readonly id = 'settings';
  private tab: SettingsTab = 'graphics';
  private rows: SettingRow[] = [];
  private readonly panel = h('div', { class: 'settings__panel', attrs: { role: 'dialog', 'aria-label': 'Ajustes' } });
  private readonly tabButtons = new Map<SettingsTab, HTMLButtonElement>();
  private readonly rowsHost = h('div', { class: 'settings__rows' });
  private readonly helpTitle = h('h3', { class: 'settings__help-title' });
  private readonly helpText = h('p', { class: 'settings__help-text' });
  private hints: ControlHints | null = null;
  private lastEnginePreview = 0;
  /** Listeners de las filas de la pestaña actual (se liberan al cambiar de pestaña). */
  private tabOwn = new Disposer();

  constructor(game: Game) {
    super(game, 'screen--settings');
    this.own.add(() => this.tabOwn.dispose());
  }

  enter(params: ScreenParams['settings']): void {
    const tabs = h('div', { class: 'tabs', attrs: { role: 'tablist' } });
    for (const tab of TABS) {
      const button = h('button', { class: 'tab', attrs: { type: 'button', role: 'tab' } }, h('span', { text: tab.label }));
      this.own.listen(button, 'click', () => this.selectTab(tab.id, true));
      this.tabButtons.set(tab.id, button);
      tabs.append(button);
    }

    this.hints = new ControlHints(
      [
        { keys: [{ keyboard: 'Q', gamepad: 'LB' }, { keyboard: 'E', gamepad: 'RB' }], label: 'Pestaña' },
        { keys: [{ keyboard: '←→', gamepad: '✚' }], label: 'Cambiar' },
        { keys: [{ keyboard: 'ESC', gamepad: 'B' }], label: 'Volver' },
      ],
      this.game.input.lastDevice,
    );
    this.own.add(this.game.events.on('input:device', ({ device }) => this.hints?.setDevice(device)));
    // Un cambio puede afectar a otras filas (la calidad cambia sombras y postprocesado).
    this.own.add(this.game.events.on('settings:changed', () => this.refreshRows()));

    const back = h('button', { class: 'settings__back', attrs: { type: 'button' }, text: 'Volver' });
    this.own.listen(back, 'click', () => this.onBack());

    this.panel.append(
      h('header', { class: 'settings__header' }, h('h2', { class: 'settings__title', text: 'Ajustes' }), tabs),
      this.rowsHost,
      h('aside', { class: 'settings__help' }, this.helpTitle, this.helpText),
      h('footer', { class: 'settings__footer' }, this.hints.element, back),
    );
    this.root.append(h('div', { class: 'settings__backdrop' }), this.panel);
    this.selectTab(params?.tab ?? 'graphics', false);
  }

  reveal(): void {
    const quick = prefersReducedMotion();
    const tl = gsap.timeline();
    tl.from(this.root.querySelector('.settings__backdrop'), { opacity: 0, duration: 0.35 }, 0);
    tl.from(this.panel, { x: 80, opacity: 0, duration: 0.5, ease: 'power3.out' }, 0);
    tl.add(this.animateRows(), 0.12);
    if (quick) tl.progress(1);
    this.own.tween(tl);
  }

  async hide(): Promise<void> {
    const tl = gsap.timeline();
    tl.to(this.panel, { x: 80, opacity: 0, duration: 0.3, ease: 'power2.in' }, 0);
    tl.to(this.root.querySelector('.settings__backdrop'), { opacity: 0, duration: 0.3 }, 0);
    if (prefersReducedMotion()) tl.progress(1);
    await finished(tl);
  }

  override onAction(action: UiAction): void {
    if (action === 'tabPrev' || action === 'tabNext') {
      const index = TABS.findIndex((t) => t.id === this.tab);
      const next = TABS[(index + (action === 'tabNext' ? 1 : -1) + TABS.length) % TABS.length];
      if (next) this.selectTab(next.id, true);
      return;
    }
    super.onAction(action);
  }

  protected onBack(): void {
    this.game.playUi('back');
    void this.game.screens.pop();
  }

  // ─── Pestañas y filas ──────────────────────────────────────────────────

  private selectTab(tab: SettingsTab, withSound: boolean): void {
    if (withSound && tab === this.tab && this.rows.length > 0) return;
    this.tab = tab;
    for (const [id, button] of this.tabButtons) {
      button.classList.toggle('is-active', id === tab);
      button.setAttribute('aria-selected', String(id === tab));
    }
    if (withSound) this.game.playUi('tab');

    this.nav.clear();
    this.tabOwn.dispose();
    this.tabOwn = new Disposer();
    const ctx: RowContext = {
      nav: this.nav,
      own: this.tabOwn,
      showHelp: (title, text) => {
        this.helpTitle.textContent = title;
        this.helpText.textContent = text;
      },
      play: (sound) => this.game.playUi(sound),
    };
    this.rows = tab === 'graphics' ? this.graphicsRows(ctx) : this.audioRows(ctx);
    this.rowsHost.replaceChildren(...this.rows.map((row) => row.element));
    this.nav.focusFirst();
    if (withSound) this.own.tween(this.animateRows());
  }

  private animateRows(): gsap.core.Tween {
    return gsap.from(this.rowsHost.children, {
      x: 30,
      opacity: 0,
      duration: 0.4,
      stagger: 0.04,
      ease: 'power3.out',
    });
  }

  private refreshRows(): void {
    for (const row of this.rows) row.refresh?.();
  }

  private graphicsRows(ctx: RowContext): SettingRow[] {
    const g = (): Game['settings']['graphics'] => this.game.settings.graphics;
    return [
      selectorRow<QualityLevel>(ctx, {
        label: 'Calidad gráfica',
        help: 'Ajusta todo de una vez: resolución máxima, antialiasing, sombras, reflejos y efectos. Baja para equipos modestos; Ultra para gráficas potentes.',
        options: [
          { value: 'low', label: 'Baja' },
          { value: 'medium', label: 'Media' },
          { value: 'high', label: 'Alta' },
          { value: 'ultra', label: 'Ultra' },
        ],
        get: () => g().quality,
        set: (quality) =>
          this.game.updateSettings((s) => {
            // Como en los juegos de consola: el nivel general arrastra sombras y efectos.
            const preset = QUALITY_PRESETS[quality];
            s.graphics.quality = quality;
            s.graphics.shadows = preset.shadows;
            s.graphics.postprocessing = preset.postprocessing;
          }),
      }),
      selectorRow<ShadowLevel>(ctx, {
        label: 'Sombras',
        help: 'Sombras en tiempo real de los autos y del escenario. Desactivarlas mejora mucho el rendimiento.',
        options: [
          { value: 'off', label: 'Desactivadas' },
          { value: 'low', label: 'Bajas' },
          { value: 'high', label: 'Altas' },
        ],
        get: () => g().shadows,
        set: (shadows) => this.game.updateSettings((s) => (s.graphics.shadows = shadows)),
      }),
      toggleRow(ctx, {
        label: 'Postprocesado',
        help: 'Brillo de las luces (bloom). Desde la Fase 9 también desenfoque de movimiento, distorsión de calor y efectos de cámara.',
        get: () => g().postprocessing,
        set: (on) => this.game.updateSettings((s) => (s.graphics.postprocessing = on)),
      }),
      sliderRow(ctx, {
        label: 'Resolución',
        help: 'Resolución interna de render. Por debajo del 100 % el juego gana fluidez a cambio de nitidez.',
        min: 0.5,
        max: 1,
        step: 0.05,
        get: () => g().resolutionScale,
        set: (scale) => this.game.updateSettings((s) => (s.graphics.resolutionScale = scale)),
      }),
      selectorRow<FpsTarget>(ctx, {
        label: 'FPS objetivo',
        help: 'Límite de fotogramas por segundo. 30 ahorra batería; Máximo usa toda la frecuencia de tu monitor.',
        options: [
          { value: 30, label: '30' },
          { value: 60, label: '60' },
          { value: 0, label: 'Máximo' },
        ],
        get: () => g().fpsTarget,
        set: (fps) => this.game.updateSettings((s) => (s.graphics.fpsTarget = fps)),
      }),
      toggleRow(ctx, {
        label: 'Mostrar FPS',
        help: 'Muestra en una esquina los fotogramas por segundo, el tiempo por fotograma y las llamadas de dibujo.',
        get: () => g().showFps,
        set: (on) => this.game.updateSettings((s) => (s.graphics.showFps = on)),
      }),
      actionRow(ctx, {
        label: 'Restablecer gráficos',
        help: 'Vuelve a la configuración recomendada para tu equipo.',
        icon: 'reset',
        run: () =>
          this.game.updateSettings((s) => {
            s.graphics = createDefaultGraphics(
              detectQuality({
                hardwareConcurrency: navigator.hardwareConcurrency,
                isMobile: matchMedia('(pointer: coarse)').matches,
              }),
            );
          }),
      }),
    ];
  }

  private audioRows(ctx: RowContext): SettingRow[] {
    const a = (): Game['settings']['audio'] => this.game.settings.audio;
    return [
      sliderRow(ctx, {
        label: 'Volumen general',
        help: 'Volumen de todo el juego.',
        min: 0,
        max: 1,
        step: 0.05,
        get: () => a().master,
        set: (v) => this.game.updateSettings((s) => (s.audio.master = v)),
      }),
      sliderRow(ctx, {
        label: 'Motor',
        help: 'Tu motor y, desde la Fase 4, los de los rivales. Al moverlo se escucha una muestra.',
        min: 0,
        max: 1,
        step: 0.05,
        get: () => a().engine,
        set: (v) => {
          this.game.updateSettings((s) => (s.audio.engine = v));
          this.previewEngine();
        },
      }),
      sliderRow(ctx, {
        label: 'Interfaz',
        help: 'Sonidos de menús y transiciones.',
        min: 0,
        max: 1,
        step: 0.05,
        get: () => a().ui,
        set: (v) => this.game.updateSettings((s) => (s.audio.ui = v)),
      }),
      actionRow(ctx, {
        label: 'Restablecer sonido',
        help: 'Vuelve a los volúmenes de fábrica.',
        icon: 'reset',
        run: () => this.game.updateSettings((s) => (s.audio = createDefaultAudio())),
      }),
    ];
  }

  /** Acelerón corto para escuchar el volumen del motor. */
  private previewEngine(): void {
    const now = performance.now();
    if (now - this.lastEnginePreview < ENGINE_PREVIEW_GAP) return;
    this.lastEnginePreview = now;
    const ctx = this.game.audio.context;
    const bus = this.game.audio.bus('engine');
    if (!ctx || !bus || ctx.state !== 'running') return;
    const engine = new EngineSynth(ctx, bus);
    const duration = engine.playSequence([
      { at: 0.3, rpm: 10500, throttle: 1 },
      { at: 0.65, rpm: 5000, throttle: 0 },
    ]);
    setTimeout(() => engine.stop(0.25), duration * 1000);
  }
}
