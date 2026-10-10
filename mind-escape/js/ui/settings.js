/**
 * ui/settings.js — Pantalla de ajustes y estadísticas generales.
 */

import { el, icon, announce } from '../utils/dom.js';
import { formatTime } from '../utils/math.js';
import * as router from '../core/router.js';
import * as state from '../core/state.js';
import * as audio from '../core/audio.js';
import * as storage from '../core/storage.js';
import * as progress from '../systems/progress.js';
import { getLevelMeta } from '../levels/registry.js';
import { confirmDialog } from './completion-modal.js';

export const settingsScreen = {
  mount(container) {
    const screen = el('section.screen', { 'aria-labelledby': 'settings-title' });
    container.append(screen);

    const render = () => {
      screen.replaceChildren(...buildContent());
    };

    render();
    // Repintar cuando cambie el estado (p. ej. tras borrar el progreso).
    return state.subscribe(render);
  },
};

function buildContent() {
  const settings = state.getSettings();
  const summary = progress.getSummary();
  const favoriteMeta = summary.favoriteLevel ? getLevelMeta(summary.favoriteLevel) : null;

  return [
    el('header.topbar', {}, [
      el('button.btn.btn--ghost', {
        type: 'button',
        on: { click: () => { audio.play('click'); router.go('/menu'); } },
      }, [icon('arrowLeft', { size: 15 }), 'Volver']),
      el('span.topbar__title', { text: 'Ajustes' }),
    ]),

    el('h1#settings-title.section-title', { text: 'Ajustes', style: { marginBottom: '1.5rem' } }),

    el('div.settings__list', {}, [
      toggleRow({
        name: 'Sonido',
        hint: 'Clics, aciertos y errores',
        checked: settings.sound !== false,
        onToggle: (value) => {
          state.setSetting('sound', value);
          if (value) audio.play('correct');
        },
      }),

      toggleRow({
        name: 'Música',
        hint: 'Ambiente de fondo, casi imperceptible',
        checked: settings.music !== false,
        onToggle: (value) => {
          state.setSetting('music', value);
          audio.syncAmbient();
          if (value) audio.play('click');
        },
      }),

      el('div.setting-row.setting-row--static', {}, [
        el('div.setting-row__text', {}, [
          el('span.setting-row__name', { text: 'Modo oscuro' }),
          el('span.setting-row__hint', { text: 'Siempre activo — forma parte del juego' }),
        ]),
        el('span.switch', { 'aria-checked': 'true', role: 'img', 'aria-label': 'Activado' }),
      ]),

      el('button.setting-row.btn--danger', {
        type: 'button',
        on: { click: onClearProgress },
      }, [
        el('div.setting-row__text', {}, [
          el('span.setting-row__name', { text: 'Borrar progreso' }),
          el('span.setting-row__hint', { text: 'Niveles, estrellas y tiempos. No se puede deshacer.' }),
        ]),
      ]),
    ]),

    el('h2.section-title', { text: 'Estadísticas generales', style: { margin: '2rem 0 1rem' } }),

    el('div.glass.glass--pad.stats-block', {}, [
      statRow('Niveles completados', `${summary.completed} / ${summary.total}`),
      statRow('Estrellas totales', `${summary.stars} / ${summary.maxStars}`),
      statRow('Tiempo total', formatTime(summary.totalPlayTime)),
      statRow(
        'Nivel más peleado',
        favoriteMeta ? `${String(favoriteMeta.id).padStart(2, '0')} · ${favoriteMeta.title}` : '—',
      ),
    ]),

    !storage.isAvailable() && el('p.text-faint.center', {
      style: { marginTop: '1.5rem', fontSize: '0.8rem' },
      text: 'Este navegador no permite guardar datos: el progreso se perderá al cerrar la pestaña.',
    }),
  ].filter(Boolean);
}

function toggleRow({ name, hint, checked, onToggle }) {
  const button = el('button.setting-row', {
    type: 'button',
    role: 'switch',
    'aria-checked': String(checked),
  }, [
    el('div.setting-row__text', {}, [
      el('span.setting-row__name', { text: name }),
      el('span.setting-row__hint', { text: hint }),
    ]),
    el('span.switch', { 'aria-hidden': 'true', 'aria-checked': String(checked) }),
  ]);

  button.addEventListener('click', () => {
    const next = button.getAttribute('aria-checked') !== 'true';
    button.setAttribute('aria-checked', String(next));
    button.querySelector('.switch').setAttribute('aria-checked', String(next));
    announce(`${name} ${next ? 'activado' : 'desactivado'}`);
    onToggle(next);
  });

  return button;
}

function statRow(label, value) {
  return el('dl.stats-block__row', {}, [
    el('dt', { text: label }),
    el('dd', { text: value }),
  ]);
}

async function onClearProgress() {
  audio.play('click');
  const confirmed = await confirmDialog({
    title: 'Borrar progreso',
    message: 'Se perderán todos los niveles desbloqueados, las estrellas y los tiempos. Esta acción no se puede deshacer.',
    confirmLabel: 'Sí, borrar todo',
    cancelLabel: 'Conservar mi progreso',
    danger: true,
  });

  if (!confirmed) return;
  state.reset();
  audio.syncAmbient();
  announce('Progreso borrado');
}

export default settingsScreen;
