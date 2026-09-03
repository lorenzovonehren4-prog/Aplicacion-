/**
 * ui/menu.js — Pantalla de menú principal.
 */

import { el, icon, append } from '../utils/dom.js';
import { formatTime } from '../utils/math.js';
import * as router from '../core/router.js';
import * as audio from '../core/audio.js';
import * as progress from '../systems/progress.js';

const TITLE = 'MIND ESCAPE';

export const menuScreen = {
  mount(container) {
    const summary = progress.getSummary();
    const canContinue = progress.hasProgress() && !summary.isFinished;
    const continueLevel = progress.getContinueLevel();

    const screen = el('section.screen.menu', { 'aria-labelledby': 'menu-title' }, [
      el('div.menu__brand', {}, [
        // Cada letra en su propio span: permite animar el título más adelante
        // sin volver a tocar el marcado.
        el('h1#menu-title.menu__title', { 'aria-label': TITLE },
          [...TITLE].map((char) => el('span', { text: char === ' ' ? ' ' : char, 'aria-hidden': 'true' }))),
        el('hr.menu__rule'),
        el('p.menu__tagline', { text: '30 desafíos · 1 salida' }),
      ]),

      el('div.menu__actions', {}, [
        canContinue && el('button.btn.btn--primary', {
          type: 'button',
          on: { click: () => navigate(`/level/${continueLevel}`) },
        }, [`Continuar · Nivel ${String(continueLevel).padStart(2, '0')}`]),

        summary.isFinished && el('button.btn.btn--primary', {
          type: 'button',
          on: { click: () => navigate('/levels') },
        }, ['Has escapado · Revisitar']),

        el('button.btn', {
          type: 'button',
          on: { click: () => navigate('/levels') },
        }, [icon('grid', { size: 15 }), 'Niveles']),

        el('button.btn', {
          type: 'button',
          on: { click: () => navigate('/settings') },
        }, [icon('gear', { size: 15 }), 'Ajustes']),
      ]),

      buildProgressBlock(summary),
    ]);

    container.append(screen);
    return null;
  },
};

function buildProgressBlock(summary) {
  if (!summary.completed && !summary.totalPlayTime) {
    return el('p.menu__footer', { text: 'Sin registros · Empieza por el nivel 01' });
  }

  const block = el('div.menu__progress', {}, [
    el('p.menu__progress-line', {
      text: `${summary.completed} / ${summary.total} niveles · ${summary.stars} / ${summary.maxStars} estrellas`,
    }),
    el('div.menu__progress-bar', {
      role: 'progressbar',
      'aria-valuemin': '0',
      'aria-valuemax': String(summary.total),
      'aria-valuenow': String(summary.completed),
      'aria-label': 'Progreso total',
    }, [
      el('div.menu__progress-fill', { style: { width: `${summary.percent}%` } }),
    ]),
  ]);

  if (summary.totalPlayTime) {
    append(block, el('p.menu__footer', { text: `Tiempo jugado ${formatTime(summary.totalPlayTime)}` }));
  }

  return block;
}

function navigate(path) {
  audio.unlock();
  audio.play('click');
  router.go(path);
}

export default menuScreen;
