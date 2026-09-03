/**
 * ui/level-select.js — Selector de los 30 niveles.
 */

import { el, icon, starIcon, announce } from '../utils/dom.js';
import { formatClock, pad2 } from '../utils/math.js';
import { staggerIn } from '../utils/animations.js';
import * as router from '../core/router.js';
import * as audio from '../core/audio.js';
import * as state from '../core/state.js';
import * as progress from '../systems/progress.js';
import { getAllLevelMeta } from '../levels/registry.js';
import { MAX_STARS } from '../systems/scoring.js';

export const levelSelectScreen = {
  mount(container) {
    const summary = progress.getSummary();
    const nextLevel = progress.getNextLevel();

    const grid = el('div.level-select__grid', { role: 'list' });
    const cards = getAllLevelMeta().map((meta) => buildCard(meta, nextLevel));
    staggerIn(cards, { step: 22 });
    grid.append(...cards);

    const screen = el('section.screen', { 'aria-labelledby': 'levels-title' }, [
      el('header.topbar', {}, [
        el('button.btn.btn--ghost', {
          type: 'button',
          on: { click: () => { audio.play('click'); router.go('/menu'); } },
        }, [icon('arrowLeft', { size: 15 }), 'Volver']),
        el('span.topbar__title', { text: 'Mind Escape' }),
      ]),

      el('div.level-select__head', {}, [
        el('h1#levels-title.section-title', { text: 'Selecciona un nivel' }),
        el('p.text-faint', { style: { fontSize: '0.82rem' },
          text: 'Cada nivel completado abre el siguiente.' }),
      ]),

      grid,

      el('footer.level-select__foot', {}, [
        el('p.level-select__stat', {}, ['Progreso', el('b', { text: `${summary.completed} / ${summary.total}` })]),
        el('p.level-select__stat', {}, [
          'Estrellas',
          el('b', { text: `${summary.stars} / ${summary.maxStars}` }),
        ]),
      ]),
    ]);

    container.append(screen);
    return null;
  },
};

function buildCard(meta, nextLevel) {
  const status = progress.getLevelStatus(meta.id);
  const data = state.getLevelData(meta.id);
  const locked = status === 'locked';
  const isNext = !locked && meta.id === nextLevel;

  const classes = [
    'level-card',
    `level-card--${status}`,
    isNext && 'level-card--next',
    !meta.implemented && !locked && 'level-card--soon',
  ].filter(Boolean).join(' ');

  const label = locked
    ? `Nivel ${meta.id}, bloqueado`
    : `Nivel ${meta.id}, ${meta.title}. ${status === 'completed'
        ? `Completado con ${data.stars} de ${MAX_STARS} estrellas.`
        : 'Disponible.'}`;

  const card = el('button', {
    class: classes,
    type: 'button',
    role: 'listitem',
    disabled: locked,
    'aria-label': label,
    on: locked ? {} : { click: () => open(meta.id) },
  }, [
    el('span.level-card__number', { text: pad2(meta.id) }),

    locked
      ? icon('lock', { size: 18, className: 'level-card__lock' })
      : el('span.level-card__title', { text: meta.implemented ? meta.title : 'Próximamente' }),

    status === 'completed' && buildStars(data.stars),
    status === 'completed' && Number.isFinite(data.bestTime) && data.bestTime >= 0
      && el('span.level-card__time', { text: formatClock(data.bestTime) }),
  ]);

  return card;
}

function buildStars(earned) {
  return el('span.stars.stars--sm', { 'aria-hidden': 'true' },
    Array.from({ length: MAX_STARS }, (_, i) =>
      starIcon({
        size: 13,
        className: `stars__item${i < earned ? ' stars__item--filled' : ''}`,
      })));
}

function open(levelId) {
  audio.unlock();
  audio.play('click');
  announce(`Abriendo nivel ${levelId}`);
  router.go(`/level/${levelId}`);
}

export default levelSelectScreen;
