/**
 * Tutorial inicial (sólo la primera vez, entre el splash y el menú), con el
 * auto girando de fondo:
 * 1. Nombre del piloto.
 * 2. Experiencia (Nunca jugué / Algo / Mucho) → nivel de ayudas recomendado,
 *    que se aplica (se puede cambiar cuando se quiera).
 * 3. Los controles básicos, con las teclas configuradas.
 * Al terminar queda marcado (`profile.tutorialDone`) y se va al menú.
 */

import gsap from 'gsap';
import { LEVEL_INFO } from '../../assists/presets';
import type { Game } from '../../core/Game';
import { keyLabel } from '../../core/input/bindings';
import { DEFAULT_PILOT_NAME, PROFILE_NAME_MAX_LENGTH, type AssistLevel, type ExperienceLevel } from '../../core/save/schema';
import type { StudioScene } from '../../garage/StudioScene';
import { finished } from '../anim/finished';
import { ControlHints } from '../components/ControlHints';
import { createLogo } from '../components/Logo';
import { createMenuButton } from '../components/MenuButton';
import { h, prefersReducedMotion } from '../dom';
import { BaseScreen } from './BaseScreen';
import { uiWidth } from '../scale';

const EXPERIENCE: ReadonlyArray<{ id: ExperienceLevel; label: string; detail: string; level: AssistLevel }> = [
  { id: 'none', label: 'Nunca jugué', detail: 'Es mi primer juego de autos de carrera.', level: 'beginner' },
  { id: 'some', label: 'Algo', detail: 'Jugué juegos de carreras alguna vez.', level: 'intermediate' },
  { id: 'lots', label: 'Mucho', detail: 'Conozco los simuladores y las trazadas.', level: 'advanced' },
];

type Step = 'name' | 'experience' | 'controls';

export class TutorialScreen extends BaseScreen {
  readonly id = 'tutorial';
  private readonly card = h('div', { class: 'tut__card' });
  private readonly dots = h('div', { class: 'tut__dots' }, h('i'), h('i'), h('i'));
  private studio: StudioScene | null = null;
  private step: Step = 'name';
  private experience: ExperienceLevel = 'none';

  constructor(game: Game) {
    super(game, 'screen--tutorial');
  }

  async enter(): Promise<void> {
    try {
      this.studio = await this.game.getStudio();
    } catch (error) {
      console.error('[Tutorial] Sin estudio 3D:', error);
      this.studio = null;
    }
    this.game.render.setView(this.studio);
    this.studio?.setFrameShift(uiWidth() < 900 ? 0 : -0.14);
    const hints = new ControlHints(
      [
        { keys: [{ keyboard: '↑↓', gamepad: '✚' }], label: 'Elegir' },
        { keys: [{ keyboard: 'ENTER', gamepad: 'A' }], label: 'Seguir' },
      ],
      this.game.input.lastDevice,
    );
    this.own.add(this.game.events.on('input:device', ({ device }) => hints.setDevice(device)));
    this.root.append(
      h('div', { class: 'tut__scrim' }),
      h('div', { class: 'tut__panel' }, createLogo('tut__logo'), this.dots, this.card, h('footer', { class: 'tut__footer' }, hints.element)),
    );
    this.showName();
  }

  update(dt: number): void {
    this.studio?.update(dt);
  }

  async hide(): Promise<void> {
    const tl = gsap.timeline();
    tl.to(this.root.querySelector('.tut__panel'), { opacity: 0, x: 40, duration: 0.3, ease: 'power2.in' });
    if (prefersReducedMotion()) tl.progress(1);
    await finished(tl);
  }

  protected onBack(): void {
    if (this.step === 'experience') this.showName();
    else if (this.step === 'controls') this.showExperience();
  }

  private setStep(step: Step): void {
    this.step = step;
    const index = step === 'name' ? 0 : step === 'experience' ? 1 : 2;
    [...this.dots.children].forEach((dot, i) => dot.classList.toggle('is-on', i <= index));
    this.nav.clear();
  }

  private swap(children: HTMLElement[]): void {
    this.card.replaceChildren(...children);
    if (!prefersReducedMotion()) this.own.tween(gsap.from(this.card.children, { x: 30, opacity: 0, stagger: 0.06, duration: 0.4, ease: 'power3.out' }));
  }

  // ─── 1. Nombre ─────────────────────────────────────────────────────────

  private showName(): void {
    this.setStep('name');
    const input = h('input', {
      class: 'tut__input',
      attrs: { type: 'text', maxlength: PROFILE_NAME_MAX_LENGTH, placeholder: DEFAULT_PILOT_NAME, 'aria-label': 'Nombre del piloto', spellcheck: 'false', autocomplete: 'off' },
    });
    const current = this.game.save.data.profile.name;
    if (current !== DEFAULT_PILOT_NAME) input.value = current;
    const next = createMenuButton({ label: 'Seguir', icon: 'play' });
    const save = (): void => {
      const name = input.value.trim() || DEFAULT_PILOT_NAME;
      this.game.save.update((data) => (data.profile.name = name));
      this.game.playUi('confirm');
      this.showExperience();
    };
    // En el campo de texto, ENTER sigue (las teclas no llegan a los menús mientras se escribe).
    this.own.listen(input, 'keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        save();
      }
      event.stopPropagation();
    });
    this.nav.add(next, { onConfirm: save });
    this.swap([
      h('span', { class: 'tut__kicker', text: 'Bienvenido a ÁPICE GP' }),
      h('h2', { class: 'tut__title', text: '¿Cómo te llamas, piloto?' }),
      h('p', { class: 'tut__text', text: `Es el nombre que verás en la torre de posiciones y en tu perfil (hasta ${PROFILE_NAME_MAX_LENGTH} letras). Lo puedes cambiar después en Perfil.` }),
      input,
      next,
    ]);
    this.own.timeout(() => input.focus(), prefersReducedMotion() ? 0 : 350);
  }

  // ─── 2. Experiencia ────────────────────────────────────────────────────

  private showExperience(): void {
    this.setStep('experience');
    const recommendation = h('p', { class: 'tut__reco' });
    const buttons = EXPERIENCE.map((option) => {
      const button = h(
        'button',
        { class: 'tut__option', attrs: { type: 'button' } },
        h('b', { text: option.label }),
        h('span', { text: option.detail }),
      );
      this.nav.add(button, {
        onFocus: () => {
          this.experience = option.id;
          const level = LEVEL_INFO[option.level];
          recommendation.replaceChildren(h('b', { text: `Te recomendamos: ${level.name}` }), h('span', { text: level.description }));
        },
        onConfirm: () => this.chooseExperience(option.id, option.level),
      });
      return button;
    });
    this.swap([
      h('span', { class: 'tut__kicker', text: `Hola, ${this.game.save.data.profile.name}` }),
      h('h2', { class: 'tut__title', text: '¿Cuánto jugaste juegos de carreras?' }),
      h('p', { class: 'tut__text', text: 'Con eso elegimos las ayudas de manejo para empezar. ¿Nuevo? Empieza en Principiante: el auto frena solo y no patina.' }),
      h('div', { class: 'tut__options' }, ...buttons),
      recommendation,
    ]);
    const saved = EXPERIENCE.findIndex((option) => option.id === this.experience);
    const focus = buttons[Math.max(0, saved)];
    if (focus) this.nav.focus(focus);
  }

  private chooseExperience(experience: ExperienceLevel, level: AssistLevel): void {
    this.game.playUi('confirm');
    this.game.save.update((data) => {
      data.profile.experience = experience;
      data.settings.assists.level = level;
    });
    this.showControls();
  }

  // ─── 3. Controles ──────────────────────────────────────────────────────

  private showControls(): void {
    this.setStep('controls');
    const keys = this.game.settings.controls.keys;
    const rows: ReadonlyArray<readonly [string, string, string]> = [
      [keyLabel(keys.throttle), 'RT', 'Acelerar'],
      [keyLabel(keys.brake), 'LT', 'Frenar'],
      [`${keyLabel(keys.left)} ${keyLabel(keys.right)}`, 'Stick', 'Doblar'],
      [keyLabel(keys.drs), 'X', 'DRS en las zonas verdes del mapa'],
      [keyLabel(keys.camera), 'Y', 'Cambiar cámara'],
      [keyLabel(keys.reset), 'Select', 'Volver a la pista'],
      ['ESC', 'Start', 'Pausa'],
    ];
    const go = createMenuButton({ label: '¡A correr!', icon: 'flag' });
    this.nav.add(go, { onConfirm: () => this.finish() });
    this.swap([
      h('span', { class: 'tut__kicker', text: `Ayudas: ${LEVEL_INFO[this.game.settings.assists.level].name}` }),
      h('h2', { class: 'tut__title', text: 'Los controles' }),
      h(
        'div',
        { class: 'tut__keys' },
        ...rows.map(([key, pad, label]) => h('div', { class: 'tut__key' }, h('kbd', { text: key }), h('kbd', { class: 'is-pad', text: pad }), h('span', { text: label }))),
      ),
      h('p', { class: 'tut__text', text: 'La caja es automática. Las teclas se cambian en Ajustes → Controles, y el Manual de ayudas explica cada ayuda con demos.' }),
      go,
    ]);
    this.nav.focus(go);
  }

  private finish(): void {
    this.game.playUi('confirm');
    this.game.save.update((data) => (data.profile.tutorialDone = true));
    void this.game.screens.goTo('menu', undefined);
  }
}
