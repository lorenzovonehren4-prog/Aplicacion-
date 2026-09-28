/**
 * Pantalla de inicio: línea de luz → destello → el logo aparece con desenfoque
 * → "pulsa cualquier tecla". Al pulsar suena un motor acelerando (con dos
 * cambios de marcha) y se pasa al menú. El primer gesto también habilita el
 * audio del navegador. (La Fase 8 agrega aquí el desvío al tutorial inicial.)
 *
 * Mientras se ve el logo se prepara el estudio 3D del menú en segundo plano.
 */

import gsap from 'gsap';
import { EngineSynth, type RevKeyframe } from '../../audio/EngineSynth';
import type { Game } from '../../core/Game';
import { h, prefersReducedMotion } from '../dom';
import { createLogo } from '../components/Logo';
import { BaseScreen } from './BaseScreen';

/** Acelerón de la presentación: sube, cambio, sube, cambio, sube y suelta. */
const REV_SEQUENCE: readonly RevKeyframe[] = [
  { at: 0.5, rpm: 11800, throttle: 1 },
  { at: 0.56, rpm: 9300, throttle: 0.4, curve: 'drop' },
  { at: 1.05, rpm: 12500, throttle: 1 },
  { at: 1.11, rpm: 10100, throttle: 0.35, curve: 'drop' },
  { at: 1.6, rpm: 12900, throttle: 1 },
  { at: 2.5, rpm: 5200, throttle: 0 },
];

/** Tiempo mínimo que se escucha el motor antes de cambiar de pantalla (s). */
const REV_BEFORE_LEAVING = 1.25;

type Phase = 'intro' | 'ready' | 'starting';

export class SplashScreen extends BaseScreen {
  readonly id = 'splash';
  private phase: Phase = 'intro';
  private intro: gsap.core.Timeline | null = null;
  private engine: EngineSynth | null = null;
  private studioReady: Promise<unknown> = Promise.resolve();
  private studioLoaded = false;

  private readonly glow = h('div', { class: 'splash__glow' });
  private readonly streak = h('div', { class: 'splash__streak' });
  private readonly flash = h('div', { class: 'splash__flash' });
  private readonly logo = createLogo('splash__logo');
  private readonly sheen = h('div', { class: 'splash__sheen' });
  private readonly tagline = h('p', { class: 'splash__tagline', text: 'Campeonato de monoplazas' });
  private readonly prompt = h('p', { class: 'splash__prompt', text: 'Pulsa cualquier tecla' });

  constructor(game: Game) {
    super(game, 'screen--splash');
  }

  enter(): void {
    this.root.append(
      this.glow,
      this.streak,
      h('div', { class: 'splash__center' }, h('div', { class: 'splash__logo-wrap' }, this.logo, this.sheen), this.tagline),
      this.prompt,
      h('p', {
        class: 'splash__legal',
        text: 'Juego independiente, sin afiliación oficial. Equipos, pilotos y marcas son ficticios.',
      }),
      this.flash,
    );
    gsap.set([this.logo, this.tagline, this.prompt, this.glow], { opacity: 0 });
    gsap.set(this.streak, { scaleX: 0, opacity: 0 });
    gsap.set(this.flash, { opacity: 0 });

    this.own.add(this.game.input.onAnyInput(() => this.onAnyInput()));

    // El estudio del menú se arma después de los primeros fotogramas para no
    // trabar la animación del logo.
    this.studioReady = new Promise<void>((resolve) => {
      this.own.timeout(() => {
        this.game.getStudio().then(
          () => {
            this.studioLoaded = true;
            resolve();
          },
          (error: unknown) => {
            // El menú funciona igual sin 3D: se sigue.
            console.error('[Splash] No se pudo preparar el estudio 3D.', error);
            this.studioLoaded = true;
            resolve();
          },
        );
      }, 250);
    });
  }

  reveal(): void {
    const quick = prefersReducedMotion();
    const tl = gsap.timeline({ onComplete: () => this.becomeReady() });
    tl.to(this.glow, { opacity: 0.75, duration: 1.4, ease: 'power2.out' }, 0);
    tl.to(this.streak, { scaleX: 1, opacity: 1, duration: 0.55, ease: 'power4.out' }, 0.15);
    tl.to(this.flash, { opacity: quick ? 0.3 : 0.85, duration: 0.07, ease: 'none' }, 0.62);
    tl.to(this.flash, { opacity: 0, duration: 0.6, ease: 'power2.out' }, 0.69);
    tl.to(this.streak, { scaleY: 0.2, opacity: 0, duration: 0.5, ease: 'power2.in' }, 0.66);
    tl.fromTo(
      this.logo,
      { opacity: 0, scale: 1.18, filter: 'blur(18px)' },
      { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1, ease: 'expo.out' },
      0.64,
    );
    tl.fromTo(
      this.logo.querySelector('.logo__gp'),
      { scale: 0, rotate: -12 },
      { scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(2.2)' },
      1.0,
    );
    tl.fromTo(
      this.tagline,
      { opacity: 0, y: 12, letterSpacing: '0.9em' },
      { opacity: 1, y: 0, letterSpacing: '0.5em', duration: 0.9, ease: 'power3.out' },
      1.15,
    );
    tl.to(this.prompt, { opacity: 1, duration: 0.5 }, 1.6);
    if (quick) tl.progress(1);
    this.intro = this.own.tween(tl);
  }

  protected onBack(): void {
    this.onAnyInput();
  }

  override exit(): void {
    this.engine?.stop(0.6);
    this.engine = null;
    super.exit();
  }

  private becomeReady(): void {
    if (this.phase !== 'intro') return;
    this.phase = 'ready';
    // "Pulsa cualquier tecla" late suave y el brillo cruza el logo cada tanto.
    this.own.tween(gsap.to(this.prompt, { opacity: 0.35, duration: 0.9, repeat: -1, yoyo: true, ease: 'sine.inOut' }));
    this.own.tween(
      gsap.fromTo(
        this.sheen,
        { xPercent: -120 },
        { xPercent: 220, duration: 1.1, ease: 'power2.inOut', repeat: -1, repeatDelay: 2.6 },
      ),
    );
  }

  private onAnyInput(): void {
    if (this.phase === 'starting') return;
    // Si se pulsa durante la intro, se completa al instante y se arranca igual.
    this.intro?.progress(1);
    this.phase = 'starting';
    void this.start();
  }

  private async start(): Promise<void> {
    this.playRev();
    gsap.killTweensOf([this.prompt, this.sheen]);
    const tl = gsap.timeline();
    tl.to(this.prompt, { opacity: 1, duration: 0.06, repeat: 5, yoyo: true, ease: 'none' }, 0);
    tl.to(this.flash, { opacity: 0.5, duration: 0.06 }, 0.05);
    tl.to(this.flash, { opacity: 0, duration: 0.5, ease: 'power2.out' }, 0.11);
    tl.to(this.logo, { scale: 1.05, duration: 0.18, ease: 'power2.out' }, 0.05);
    tl.to(this.logo, { scale: 1, duration: 0.8, ease: 'elastic.out(1, 0.5)' }, 0.23);
    tl.fromTo(this.sheen, { xPercent: -120 }, { xPercent: 220, duration: 0.7, ease: 'power2.inOut' }, 0.05);
    this.own.tween(tl);

    const waited = new Promise<void>((resolve) => this.own.timeout(resolve, REV_BEFORE_LEAVING * 1000));
    // Si el estudio 3D todavía se está armando (equipos lentos), se avisa.
    this.own.timeout(() => {
      if (this.studioLoaded) return;
      this.prompt.textContent = 'Cargando…';
      this.own.tween(gsap.to(this.prompt, { opacity: 0.8, duration: 0.2 }));
    }, REV_BEFORE_LEAVING * 1000 + 150);

    await Promise.all([waited, this.studioReady]);
    if (this.own.isDisposed) return;
    await this.game.screens.goTo('menu', undefined);
  }

  private playRev(): void {
    const ctx = this.game.audio.context;
    const bus = this.game.audio.bus('engine');
    if (!ctx || !bus) return;
    const play = (): void => {
      if (this.own.isDisposed) return;
      const engine = new EngineSynth(ctx, bus);
      this.engine = engine;
      const duration = engine.playSequence(REV_SEQUENCE);
      setTimeout(() => engine.stop(0.5), duration * 1000);
    };
    if (ctx.state === 'running') play();
    else ctx.resume().then(play, (error: unknown) => console.warn('[Splash] Audio no disponible.', error));
  }
}
