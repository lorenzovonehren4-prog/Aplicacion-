/**
 * Podio (después de los resultados de una carrera con rivales): los tres
 * primeros suben en sus escalones, con un cartel sobre cada auto, y arranca
 * el festejo equipado en el garaje. ENTER adelanta la subida; después se
 * elige cómo seguir (el campeonato, repetir, otra carrera o el menú).
 */

import gsap from 'gsap';
import { Vector3 } from 'three';
import type { Game } from '../../core/Game';
import type { UiAction } from '../../core/input/actions';
import type { ResultsParams } from '../../core/screens/params';
import { getItem } from '../../progression/items';
import type { CelebrationStyle } from '../../progression/items';
import { PodiumScene } from '../../podium/PodiumScene';
import { finished } from '../anim/finished';
import { ControlHints } from '../components/ControlHints';
import { createMenuButton } from '../components/MenuButton';
import { h, prefersReducedMotion } from '../dom';
import type { IconName } from '../icons';
import { BaseScreen } from './BaseScreen';

const PLACES = ['1.º', '2.º', '3.º'];

export class PodiumScreen extends BaseScreen<ResultsParams> {
  readonly id = 'podium';
  private params!: ResultsParams;
  private scene: PodiumScene | null = null;
  private readonly labels: HTMLElement[] = [];
  private readonly shown: boolean[] = [false, false, false];
  private readonly anchor = new Vector3();
  private readonly header = h('header', { class: 'podium__header' });
  private readonly actions = h('div', { class: 'podium__actions' });
  private hints: ControlHints | null = null;
  private actionsShown = false;
  private elapsed = 0;

  constructor(game: Game) {
    super(game, 'screen--podium');
  }

  async enter(params: ResultsParams): Promise<void> {
    this.params = params;
    const game = this.game;
    const celebrationItem = getItem(game.save.data.garage.celebration);
    const style: CelebrationStyle = celebrationItem?.kind === 'celebration' ? celebrationItem.style : 'streamers';
    try {
      const scene = new PodiumScene(
        game.render.renderer,
        {
          liveries: params.podium.map((entry) => entry.livery),
          title: params.trackName,
          celebration: style,
          quality: game.settings.graphics.quality,
          onFirework: () => game.playUi('firework'),
        },
        game.render.maxAnisotropy,
      );
      const renderer = game.render.renderer;
      if (renderer.extensions.has('KHR_parallel_shader_compile')) await renderer.compileAsync(scene.scene, scene.camera);
      else renderer.compile(scene.scene, scene.camera);
      this.scene = scene;
      game.render.setView(scene);
    } catch (error) {
      console.error('[Podio] No se pudo armar la escena:', error);
      this.scene = null;
    }

    this.hints = new ControlHints(
      [
        { keys: [{ keyboard: '←→', gamepad: '✚' }], label: 'Elegir' },
        { keys: [{ keyboard: 'ENTER', gamepad: 'A' }], label: 'Aceptar / adelantar' },
        { keys: [{ keyboard: 'ESC', gamepad: 'B' }], label: 'Menú' },
      ],
      game.input.lastDevice,
    );
    this.own.add(game.events.on('input:device', ({ device }) => this.hints?.setDevice(device)));

    const winner = params.podium[0];
    const playerPlace = params.podium.findIndex((entry) => entry.isPlayer);
    this.header.append(
      h('span', { class: 'podium__kicker', text: `${params.modeLabel} · ${params.trackName}` }),
      h('h2', {
        class: 'podium__title',
        text: playerPlace === 0 ? '¡Ganaste!' : playerPlace > 0 ? `¡Al podio! Terminaste ${PLACES[playerPlace] ?? ''}` : `Ganó ${winner?.name ?? ''}`,
      }),
      h('span', { class: 'podium__celebration', text: `Festejo: ${celebrationItem?.name ?? 'Serpentinas'}` }),
    );
    params.podium.slice(0, 3).forEach((entry, index) => {
      // El contenedor sigue al auto; la tarjeta de adentro es la que se anima.
      const card = h(
        'div',
        { class: `podium__card podium__card--p${index + 1}${entry.isPlayer ? ' is-player' : ''}`, style: { '--team': entry.teamColor } },
        h('span', { class: 'podium__place', text: PLACES[index] ?? '' }),
        h('span', { class: 'podium__name', text: entry.name }),
        h('span', { class: 'podium__team', text: entry.isPlayer ? `${entry.teamName} · Tú` : entry.teamName }),
      );
      card.style.opacity = '0';
      this.labels.push(h('div', { class: 'podium__label' }, card));
    });
    this.buildActions();
    this.root.append(
      h('div', { class: 'podium__vignette' }),
      ...this.labels,
      this.header,
      this.actions,
      h('footer', { class: 'podium__footer' }, this.hints.element),
    );
    this.actions.style.opacity = '0';
    this.actions.style.pointerEvents = 'none';
  }

  reveal(): void {
    const quick = prefersReducedMotion();
    this.own.tween(gsap.from(this.header.children, { y: -24, opacity: 0, stagger: 0.12, duration: quick ? 0.01 : 0.6, ease: 'power3.out', delay: quick ? 0 : 0.4 }));
    if (quick) this.scene?.skipIntro();
  }

  async hide(): Promise<void> {
    const tl = gsap.timeline();
    tl.to(this.root.children, { opacity: 0, duration: 0.25, ease: 'power2.in' }, 0);
    if (prefersReducedMotion()) tl.progress(1);
    await finished(tl);
  }

  update(dt: number): void {
    const scene = this.scene;
    this.elapsed += dt;
    if (!scene) {
      if (!this.actionsShown) this.showActions();
      return;
    }
    scene.update(dt);
    // Carteles sobre cada auto (se proyecta un punto por encima del casco).
    const width = this.root.clientWidth;
    const height = this.root.clientHeight;
    this.labels.forEach((label, index) => {
      scene.labelAnchor(index, this.anchor).project(scene.camera);
      label.style.transform = `translate(-50%, -100%) translate(${((this.anchor.x * 0.5 + 0.5) * width).toFixed(1)}px, ${((-this.anchor.y * 0.5 + 0.5) * height).toFixed(1)}px)`;
      if (!this.shown[index] && scene.stepReady(index)) {
        this.shown[index] = true;
        this.game.playUi(index === 0 ? 'rewardBig' : 'reward');
        if (index === 0) this.game.playUi('cheer');
        this.own.tween(gsap.fromTo(label.firstElementChild, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: prefersReducedMotion() ? 0.01 : 0.45, ease: 'back.out(2)' }));
      }
    });
    if (!this.actionsShown && this.shown[0]) this.showActions();
  }

  override onAction(action: UiAction): void {
    // Mientras suben los escalones, ENTER los deja en su lugar (y las flechas no mueven nada todavía).
    if (!this.actionsShown && action !== 'back') {
      if (action === 'confirm') this.scene?.skipIntro();
      return;
    }
    super.onAction(action);
  }

  protected onBack(): void {
    this.game.playUi('back');
    void this.game.screens.goTo('menu', undefined);
  }

  override exit(): void {
    this.game.render.setView(null);
    this.scene?.dispose();
    this.scene = null;
    super.exit();
  }

  private showActions(): void {
    this.actionsShown = true;
    this.actions.style.pointerEvents = '';
    this.own.tween(gsap.fromTo(this.actions, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: prefersReducedMotion() ? 0.01 : 0.45, ease: 'power3.out', delay: prefersReducedMotion() ? 0 : 0.6 }));
    const first = this.actions.firstElementChild;
    if (first instanceof HTMLElement) this.nav.focus(first);
  }

  private buildActions(): void {
    const race = this.params.race;
    const list: Array<{ label: string; icon: IconName; run: () => void }> = [];
    if (race.championshipRound !== undefined) {
      list.push({ label: 'Ver campeonato', icon: 'trophy', run: () => void this.game.screens.goTo('championship', undefined) });
    } else {
      list.push({ label: 'Repetir carrera', icon: 'reset', run: () => void this.game.screens.goTo('race', race) });
      list.push({ label: 'Otra carrera', icon: 'flag', run: () => void this.game.screens.goTo('raceSelect', { mode: 'quickRace' }) });
    }
    list.push({ label: 'Menú principal', icon: 'exit', run: () => void this.game.screens.goTo('menu', undefined) });
    for (const action of list) {
      const button = createMenuButton({ label: action.label, icon: action.icon });
      this.nav.add(button, {
        onConfirm: () => {
          this.game.playUi('confirm');
          action.run();
        },
      });
      this.actions.append(button);
    }
  }
}
