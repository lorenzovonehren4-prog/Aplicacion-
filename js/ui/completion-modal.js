/**
 * ui/completion-modal.js — Modal de nivel completado y diálogo de confirmación.
 *
 * Se monta en #overlay-root, atrapa el foco mientras está abierto y devuelve
 * el foco al elemento que lo abrió al cerrarse.
 */

import { el, starIcon, icon, qsa, announce } from '../utils/dom.js';
import { formatClock } from '../utils/math.js';
import { MAX_STARS } from '../systems/scoring.js';
import * as audio from '../core/audio.js';

const OVERLAY_ID = 'overlay-root';

/**
 * Overlays abiertos. Un modal vive fuera del contenedor de pantallas, así que
 * el router no lo limpia al navegar: sin este registro, el modal de "nivel
 * completado" se quedaría flotando sobre la pantalla siguiente.
 */
const openOverlays = new Set();

/** Cierra todos los overlays abiertos (lo llama el router al navegar). */
export function closeAllOverlays() {
  for (const entry of [...openOverlays]) entry.dismiss();
}

/**
 * Muestra el modal de nivel superado.
 *
 * @param {{
 *   levelId:number, title:string, stars:number, timeSeconds:number,
 *   bestTime:number|null, hintsUsed:number, attempts:number,
 *   isNewRecord:boolean, unlockedLevel:number|null, nextLevel:number|null,
 *   isFinalLevel:boolean,
 *   onNext:()=>void, onSelect:()=>void, onReplay:()=>void
 * }} result
 * @returns {() => void} cierra el modal
 */
export function showCompletionModal(result) {
  audio.play('complete');

  const facts = [
    fact('Tiempo', formatClock(result.timeSeconds)),
    fact('Pistas', String(result.hintsUsed)),
    fact('Intentos', String(result.attempts)),
  ];

  const canContinue = Boolean(result.nextLevel) && !result.isFinalLevel;

  const modal = el('div.glass.modal', {
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'completion-title',
  }, [
    el('p.modal__eyebrow', { text: result.isFinalLevel ? '¡Escapaste!' : 'Nivel completado' }),
    el('h2#completion-title.modal__title', {
      text: result.isFinalLevel ? 'La salida' : `Nivel ${String(result.levelId).padStart(2, '0')} · ${result.title}`,
    }),

    el('div.modal__stars', {}, [buildStars(result.stars)]),

    result.isNewRecord && el('p.modal__badge', { text: '★ Nuevo récord personal' }),

    el('div.modal__facts', {}, facts),

    el('div.modal__actions', {}, [
      canContinue && el('button.btn.btn--primary', {
        type: 'button',
        on: { click: () => { audio.play('click'); close(); result.onNext(); } },
      }, ['Siguiente nivel', icon('arrowRight', { size: 15 })]),

      result.stars < MAX_STARS && el('button.btn', {
        type: 'button',
        on: { click: () => { audio.play('click'); close(); result.onReplay(); } },
      }, ['Reintentar por las 3 ★']),

      el('button.btn', {
        type: 'button',
        on: { click: () => { audio.play('click'); close(); result.onSelect(); } },
      }, ['Selector de niveles']),
    ]),
  ]);

  const close = mountOverlay(modal, { dismissible: false });

  announce(`Nivel completado con ${result.stars} de ${MAX_STARS} estrellas.`);
  return close;
}

/**
 * Diálogo de confirmación genérico (usado por "Borrar progreso").
 * @returns {Promise<boolean>}
 */
export function confirmDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
}) {
  return new Promise((resolve) => {
    let close = () => {};
    const finish = (value) => { close(); resolve(value); };

    const modal = el('div.glass.modal', {
      role: 'alertdialog',
      'aria-modal': 'true',
      'aria-labelledby': 'confirm-title',
      'aria-describedby': 'confirm-message',
    }, [
      el('h2#confirm-title.modal__title', { text: title }),
      el('p#confirm-message.modal__message', { text: message }),
      el('div.modal__actions', {}, [
        el('button', {
          class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`,
          type: 'button',
          on: { click: () => { audio.play('click'); finish(true); } },
        }, [confirmLabel]),
        el('button.btn.btn--ghost', {
          type: 'button',
          on: { click: () => { audio.play('click'); finish(false); } },
        }, [cancelLabel]),
      ]),
    ]);

    close = mountOverlay(modal, { dismissible: true, onDismiss: () => resolve(false) });
  });
}

/* -------------------------------------------------------------------------- */

/**
 * Monta un modal con captura de foco.
 * @returns {() => void} cierra el modal
 */
function mountOverlay(modal, { dismissible = true, onDismiss = null } = {}) {
  const root = document.getElementById(OVERLAY_ID) ?? document.body;
  const previouslyFocused = document.activeElement;

  const backdrop = el('div.modal-backdrop', {
    on: dismissible ? {
      click: (event) => { if (event.target === backdrop) { close(); onDismiss?.(); } },
    } : {},
  }, [modal]);

  let closed = false;
  const entry = { close: () => close(), dismiss: () => { close(); onDismiss?.(); } };

  function close() {
    if (closed) return;
    closed = true;
    openOverlays.delete(entry);
    document.removeEventListener('keydown', onKeydown, true);
    backdrop.remove();
    if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus({ preventScroll: true });
  }

  function onKeydown(event) {
    if (event.key === 'Escape' && dismissible) {
      event.preventDefault();
      close();
      onDismiss?.();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusables = qsa(
      'button:not(:disabled), [href], input:not(:disabled), select, textarea, [tabindex]:not([tabindex="-1"])',
      modal,
    );
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  root.append(backdrop);
  openOverlays.add(entry);
  document.addEventListener('keydown', onKeydown, true);

  // Enfocar la primera acción para que Enter haga lo esperado.
  requestAnimationFrame(() => {
    const target = modal.querySelector('button');
    if (target) target.focus({ preventScroll: true });
  });

  return close;
}

function buildStars(earned) {
  return el('span.stars.stars--lg.stars--animated', {
    role: 'img',
    'aria-label': `${earned} de ${MAX_STARS} estrellas`,
  }, Array.from({ length: MAX_STARS }, (_, i) =>
    starIcon({ size: 34, className: `stars__item${i < earned ? ' stars__item--filled' : ''}` })));
}

function fact(label, value) {
  return el('div.modal__fact', {}, [
    el('span.modal__fact-label', { text: label }),
    el('span.modal__fact-value', { text: value }),
  ]);
}

export default showCompletionModal;
