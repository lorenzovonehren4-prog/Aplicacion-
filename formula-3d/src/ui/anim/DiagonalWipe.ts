/**
 * Transición de pantalla estilo transmisión deportiva: dos bandas inclinadas
 * (acento rojo y panel oscuro, cada una con un filo de luz) que barren la
 * pantalla de izquierda a derecha, con desenfoque del fondo mientras cubren.
 */

import gsap from 'gsap';
import type { TransitionPlayer } from '../../core/screens/ScreenManager';
import type { UiSounds } from '../../audio/UiSounds';
import { h, prefersReducedMotion } from '../dom';
import { createLogo } from '../components/Logo';
import { finished } from './finished';

const SKEW = -20;

/** Desplazamientos (px) para que las bandas (220vw de ancho, inclinadas) queden fuera de la vista. */
const offLeft = (): number => -(window.innerWidth * 1.7 + window.innerHeight * 0.6);
const offRight = (): number => window.innerWidth * 1.7 + window.innerHeight * 0.6;

export class DiagonalWipe implements TransitionPlayer {
  private readonly root: HTMLDivElement;
  private readonly bands: HTMLDivElement[];
  private readonly logo: HTMLDivElement;

  constructor(
    overlay: HTMLElement,
    private readonly stage: HTMLElement,
    private readonly sounds: () => UiSounds | null,
  ) {
    const accent = h('div', { class: 'wipe__band wipe__band--accent' });
    const dark = h('div', { class: 'wipe__band wipe__band--dark' });
    this.logo = h('div', { class: 'wipe__logo' }, createLogo());
    this.bands = [accent, dark];
    this.root = h('div', { class: 'wipe', attrs: { 'aria-hidden': 'true' } }, accent, dark, this.logo);
    overlay.appendChild(this.root);
    gsap.set(this.bands, { skewX: SKEW, x: offLeft });
  }

  cover(): Promise<void> {
    const quick = prefersReducedMotion();
    this.root.classList.add('is-active');
    this.sounds()?.play('whooshIn');
    gsap.set(this.bands, { x: offLeft });
    gsap.set(this.logo, { opacity: 0, scale: 0.92 });
    const tl = gsap.timeline();
    tl.to(this.bands, {
      x: 0,
      duration: quick ? 0.15 : 0.52,
      ease: 'power4.inOut',
      stagger: quick ? 0 : 0.07,
    });
    if (!quick) tl.to(this.stage, { filter: 'blur(8px)', duration: 0.4, ease: 'power2.in' }, 0);
    tl.to(this.logo, { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out' }, '-=0.12');
    return finished(tl);
  }

  reveal(): Promise<void> {
    const quick = prefersReducedMotion();
    this.sounds()?.play('whooshOut');
    const tl = gsap.timeline();
    tl.to(this.logo, { opacity: 0, scale: 1.06, duration: 0.18, ease: 'power2.in' });
    tl.to(
      [...this.bands].reverse(),
      {
        x: offRight,
        duration: quick ? 0.15 : 0.55,
        ease: 'power4.inOut',
        stagger: quick ? 0 : 0.06,
      },
      quick ? 0 : 0.05,
    );
    tl.to(this.stage, { filter: 'blur(0px)', duration: quick ? 0.1 : 0.45, ease: 'power2.out' }, 0.1);
    return finished(tl).then(() => {
      this.stage.style.filter = '';
      this.root.classList.remove('is-active');
    });
  }
}
