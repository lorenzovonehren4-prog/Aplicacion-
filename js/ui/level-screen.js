/**
 * ui/level-screen.js — Pantalla de nivel.
 *
 * Es el anfitrión de los puzzles: monta el chrome común (cabecera, cronómetro,
 * barra de respuesta, panel de pistas), carga el módulo del nivel y le expone
 * un `host` reducido. Toda la contabilidad —intentos, pistas, estrellas,
 * desbloqueo— vive aquí, nunca dentro del nivel.
 */

import { el, icon, starIcon, clear, createDisposer, announce } from '../utils/dom.js';
import { formatClock, pad2 } from '../utils/math.js';
import { flashError, flashSuccess } from '../utils/animations.js';
import * as router from '../core/router.js';
import * as audio from '../core/audio.js';
import * as state from '../core/state.js';
import { Timer } from '../core/timer.js';
import * as progress from '../systems/progress.js';
import { HintSystem } from '../systems/hints.js';
import { runValidation } from '../systems/validation.js';
import { MAX_STARS, potentialStars } from '../systems/scoring.js';
import { getLevelMeta, getTotalLevels, isImplemented, loadLevelClass } from '../levels/registry.js';
import { showCompletionModal } from './completion-modal.js';

export const levelScreen = {
  mount(container, params) {
    const levelId = Number(params.id);
    const meta = getLevelMeta(levelId);

    if (!meta) { router.go('/levels', { replace: true }); return null; }
    if (!progress.isUnlocked(levelId)) {
      announce('Ese nivel todavía está bloqueado');
      router.go('/levels', { replace: true });
      return null;
    }

    return new LevelSession(container, meta).start();
  },
};

class LevelSession {
  constructor(container, meta) {
    this.container = container;
    this.meta = meta;
    this.levelId = meta.id;

    this.disposer = createDisposer();
    this.level = null;
    this.solved = false;
    this.attempts = 0;
    this.destroyed = false;

    this.hints = new HintSystem([], { onChange: () => this.onHintsChanged() });

    this.timer = new Timer({
      limit: meta.timeLimit ?? null,
      onTick: (secs) => this.onTick(secs),
      onExpire: () => this.onTimeExpired(),
    });
  }

  /** Monta el chrome, lanza la carga del nivel y devuelve la función destroy. */
  start() {
    this.render();
    progress.touchLevel(this.levelId);
    this.loadLevel();
    return () => this.destroy();
  }

  /* ======================================================================
     Estructura de la pantalla
     ====================================================================== */

  render() {
    this.els = {};

    this.els.timer = el('span.timer', {}, [
      el('span.timer__value', { text: '00:00' }),
    ]);

    this.els.hintCount = el('span.level-stats__value', { text: `0 / ${this.hints.total}` });
    this.els.stars = el('span.stars.stars--md');
    this.els.prompt = el('p.puzzle-prompt', { hidden: true });
    this.els.puzzle = el('div.puzzle-area', { 'aria-live': 'off' });
    this.els.feedback = el('p.level-feedback', { role: 'status', 'aria-live': 'polite' });
    this.els.answerSlot = el('div');
    this.els.hintsSlot = el('div');

    const screen = el('section.screen.level-screen', { 'aria-labelledby': 'level-title' }, [
      el('header.topbar', {}, [
        el('button.btn.btn--ghost', {
          type: 'button',
          on: { click: () => { audio.play('click'); router.go('/levels'); } },
        }, [icon('arrowLeft', { size: 15 }), 'Volver']),
        el('h1#level-title.topbar__title', {
          text: `Nivel ${pad2(this.levelId)} — ${this.meta.title}`,
        }),
      ]),

      el('div.level-stats', {}, [
        el('div.level-stats__group', {}, [
          el('div.level-stats__item', {}, [
            el('span.level-stats__label', { text: this.meta.timeLimit ? 'Restante' : 'Tiempo' }),
            this.els.timer,
          ]),
          el('div.level-stats__item', {}, [
            el('span.level-stats__label', { text: 'Pistas' }),
            this.els.hintCount,
          ]),
        ]),
        el('div.level-stats__item', {}, [
          el('span.level-stats__label', { text: 'Estrellas posibles' }),
          this.els.stars,
        ]),
      ]),

      this.els.prompt,
      this.els.puzzle,
      this.els.feedback,
      this.els.answerSlot,
      this.els.hintsSlot,
    ]);

    this.container.append(screen);
    this.updateStars();
    this.renderLoading();
  }

  renderLoading() {
    this.els.puzzle.append(el('p.level-pending', {}, [
      el('span.level-pending__badge', { text: 'Cargando' }),
    ]));
  }

  /* ======================================================================
     Carga del módulo de nivel
     ====================================================================== */

  async loadLevel() {
    if (!isImplemented(this.levelId)) {
      this.renderPending('Este nivel todavía no está construido.');
      return;
    }

    try {
      const LevelClass = await loadLevelClass(this.levelId);
      if (this.destroyed) return;

      clear(this.els.puzzle);

      this.level = new LevelClass(this.levelId, this.els.puzzle, {
        meta: this.meta,
        host: {
          attempt: (solution) => this.attempt(solution),
          solve: (solution) => this.attempt(solution),
          feedback: (message, tone) => this.setFeedback(message, tone),
          setPrompt: (text) => this.setPrompt(text),
        },
      });

      this.hints.restore(0);
      this.hints.hints = normalizeHintList(this.level.getHints());

      this.level.init();

      this.setPrompt(this.level.getPrompt());
      this.renderAnswerBar();
      this.renderHintPanel();

      this.timer.start();
      this.disposer.add(() => this.timer.destroy());
    } catch (err) {
      console.error(`[level-screen] no se pudo cargar el nivel ${this.levelId}:`, err);
      if (!this.destroyed) this.renderPending('No se pudo cargar este nivel.');
    }
  }

  renderPending(message) {
    clear(this.els.puzzle);
    this.els.puzzle.append(el('div.level-pending', {}, [
      el('span.level-pending__badge', { text: 'En construcción' }),
      el('p', { text: message }),
      el('p.text-faint', {
        style: { fontSize: '0.8rem' },
        text: `Añade js/levels/level-${pad2(this.levelId)}.js y marca "implemented": true en data/levels-meta.json.`,
      }),
      el('button.btn', {
        type: 'button',
        on: { click: () => { audio.play('click'); router.go('/levels'); } },
      }, ['Volver al selector']),
    ]));

    this.renderHintPanel();
  }

  /* ======================================================================
     Barra de respuesta
     ====================================================================== */

  renderAnswerBar() {
    const mode = this.level.getInputMode();
    clear(this.els.answerSlot);
    if (mode === 'none') return;

    const config = { ...this.level.getInputConfig() };
    const numeric = mode === 'numeric';

    const input = el('input.input', {
      type: 'text',
      inputmode: numeric ? 'numeric' : 'text',
      autocomplete: 'off',
      autocapitalize: 'off',
      maxLength: config.maxLength ?? 24,
      placeholder: config.placeholder ?? '',
      'aria-label': config.label ?? 'Respuesta',
    });
    // `spellcheck` es booleano: pasarlo como prop string lo activaría siempre.
    input.spellcheck = false;

    const form = el('form.answer-bar__form', {
      on: {
        submit: (event) => {
          event.preventDefault();
          const value = input.value.trim();
          if (!value) { flashError(input); return; }
          const ok = this.attempt(value);
          if (ok) input.disabled = true;
          else { flashError(input); input.select(); }
        },
      },
    }, [
      input,
      el('button.btn.btn--primary', { type: 'submit' }, [config.submitLabel ?? 'Enviar']),
    ]);

    this.els.answerSlot.append(el('div.answer-bar', {}, [
      el('span.answer-bar__label', { text: config.label ?? 'Introduce tu respuesta' }),
      form,
    ]));

    this.els.answerInput = input;
  }

  /* ======================================================================
     Panel de pistas
     ====================================================================== */

  renderHintPanel() {
    clear(this.els.hintsSlot);

    const panel = el('section.glass.hints', { dataset: { open: 'false' } });
    const list = el('div.hints__list');

    const header = el('button.hints__header', {
      type: 'button',
      'aria-expanded': 'false',
      on: {
        click: () => {
          const open = panel.dataset.open === 'true';
          panel.dataset.open = String(!open);
          header.setAttribute('aria-expanded', String(!open));
          audio.play('click');
        },
      },
    }, [
      el('span.hints__title', {}, [
        icon('bulb', { size: 15 }),
        'Pistas',
        el('span.hints__count', { text: `${this.hints.remaining} disponibles` }),
      ]),
      icon('chevronDown', { size: 16, className: 'hints__chevron' }),
    ]);

    panel.append(header, el('div.hints__body', {}, [
      el('div.hints__body-inner', {}, [
        list,
        el('p.hints__warning', {
          text: 'Cada pista reduce las estrellas máximas del nivel. La siguiente se desbloquea al usar la anterior.',
        }),
      ]),
    ]));

    this.els.hintsList = list;
    this.els.hintsCountLabel = header.querySelector('.hints__count');
    this.els.hintsPanel = panel;

    this.paintHints();
    this.els.hintsSlot.append(panel);
  }

  paintHints() {
    if (!this.els.hintsList) return;
    clear(this.els.hintsList);

    this.hints.hints.forEach((text, index) => {
      const revealed = this.hints.isRevealed(index);
      const canReveal = this.hints.canReveal(index);

      const item = el('div', { class: `hint${revealed ? ' hint--revealed' : ''}` });

      if (revealed) {
        item.append(el('p.hint__text', {}, [
          el('span.hint__index', { text: `Pista ${index + 1} · ` }),
          text,
        ]));
      } else {
        item.append(el('button.hint__reveal', {
          type: 'button',
          disabled: !canReveal,
          on: { click: () => this.revealHint(index) },
        }, [
          el('span.hint__index', { text: `0${index + 1}` }),
          canReveal ? `Revelar pista ${index + 1}` : `Pista ${index + 1} bloqueada`,
          icon(canReveal ? 'bulb' : 'lock', { size: 15, className: 'hint__icon' }),
        ]));
      }

      this.els.hintsList.append(item);
    });

    if (this.els.hintsCountLabel) {
      this.els.hintsCountLabel.textContent = `${this.hints.remaining} disponibles`;
    }
  }

  revealHint(index) {
    const text = this.hints.reveal(index);
    if (text === null) return;
    announce(`Pista ${index + 1}: ${text}`);
    progress.recordHintUsage(this.levelId, this.hints.used);
  }

  onHintsChanged() {
    this.paintHints();
    if (this.els.hintCount) {
      this.els.hintCount.textContent = `${this.hints.used} / ${this.hints.total}`;
    }
    this.updateStars();
  }

  /* ======================================================================
     Cronómetro y estrellas
     ====================================================================== */

  onTick(seconds) {
    if (!this.els.timer) return;

    const value = this.els.timer.querySelector('.timer__value');
    const limit = this.meta.timeLimit;

    if (limit) {
      const remaining = Math.max(0, limit - seconds);
      value.textContent = formatClock(remaining);
      this.els.timer.classList.toggle('timer--warning', remaining <= 30 && remaining > 10);
      this.els.timer.classList.toggle('timer--critical', remaining <= 10 && remaining > 0);
      this.els.timer.classList.toggle('timer--expired', remaining === 0);
    } else {
      value.textContent = formatClock(seconds);
      this.els.timer.classList.toggle('timer--over-threshold', seconds > this.meta.timeThreshold);
    }

    // Las estrellas potenciales bajan solas al cruzar el umbral.
    this.updateStars();
  }

  onTimeExpired() {
    this.setFeedback('Se acabó el tiempo, pero el nivel sigue en pie: máximo 2 ★.', 'error');
    audio.play('error');
    announce('Tiempo agotado. Puedes seguir resolviendo.');
    this.level?.onTimeExpired();
  }

  updateStars() {
    if (!this.els.stars) return;
    const possible = this.solved ? this.lastResultStars ?? MAX_STARS : potentialStars({
      hintsUsed: this.hints.used,
      timeSeconds: this.timer.seconds,
      timeThreshold: this.meta.timeThreshold,
      timeExpired: this.timer.hasExpired,
    });

    clear(this.els.stars);
    this.els.stars.setAttribute('aria-label', `${possible} de ${MAX_STARS} estrellas posibles`);
    for (let i = 0; i < MAX_STARS; i += 1) {
      this.els.stars.append(starIcon({
        size: 16,
        className: `stars__item${i < possible ? ' stars__item--filled' : ''}`,
      }));
    }
  }

  /* ======================================================================
     Intentos
     ====================================================================== */

  /**
   * Punto único por el que pasa toda solución propuesta.
   * @returns {boolean}
   */
  attempt(solution) {
    if (this.solved || !this.level) return false;

    const correct = runValidation(this.level, solution);
    this.attempts += 1;

    if (correct) this.onCorrect();
    else this.onWrong();

    return correct;
  }

  onCorrect() {
    this.solved = true;
    const seconds = this.timer.stop();

    audio.play('correct');
    flashSuccess(this.els.puzzle);
    this.setFeedback('Correcto.', 'success');
    this.level.onSolved();

    const result = progress.completeLevel(this.levelId, {
      timeSeconds: seconds,
      hintsUsed: this.hints.used,
      timeExpired: this.timer.hasExpired,
    });

    this.lastResultStars = result.stars;
    this.updateStars();

    if (result.unlockedLevel) audio.play('unlock');

    const isFinalLevel = this.levelId >= getTotalLevels();

    // Pequeña pausa: el jugador merece ver su propia victoria antes del modal.
    const timeoutId = setTimeout(() => {
      if (this.destroyed) return;
      showCompletionModal({
        levelId: this.levelId,
        title: this.meta.title,
        stars: result.stars,
        timeSeconds: seconds,
        bestTime: result.bestTime,
        hintsUsed: this.hints.used,
        attempts: this.attempts,
        isNewRecord: result.isNewRecord,
        unlockedLevel: result.unlockedLevel,
        nextLevel: result.nextLevel,
        isFinalLevel,
        onNext: () => router.go(`/level/${result.nextLevel}`),
        onSelect: () => router.go('/levels'),
        onReplay: () => this.replay(),
      });
    }, 620);

    this.disposer.add(() => clearTimeout(timeoutId));
  }

  onWrong() {
    progress.recordAttempt(this.levelId);
    audio.play('error');
    flashError(this.els.answerInput ?? this.els.puzzle);
    this.setFeedback('No es correcto. Sigue intentándolo — los intentos no se penalizan.', 'error');
    this.level.onFailed();
  }

  /** Reinicia el nivel desde cero: el router destruye esta sesión y crea otra. */
  replay() {
    router.reload();
  }

  /* ======================================================================
     Utilidades
     ====================================================================== */

  setFeedback(message, tone = 'info') {
    if (!this.els.feedback) return;
    this.els.feedback.textContent = message ?? '';
    this.els.feedback.className = `level-feedback${tone === 'info' ? '' : ` level-feedback--${tone}`}`;
  }

  setPrompt(text) {
    if (!this.els.prompt) return;
    const value = String(text ?? '').trim();
    this.els.prompt.textContent = value;
    this.els.prompt.hidden = !value;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    // El tiempo jugado cuenta aunque el nivel se abandone a medias. Cuando se
    // completa ya lo contabilizó `progress.completeLevel`, así que no se suma dos veces.
    const seconds = this.timer.stop();
    if (!this.solved && seconds > 0) state.addPlayTime(seconds);

    try { this.level?.destroy(); } catch (err) { console.error('[level-screen] destroy:', err); }
    this.level = null;
    this.timer.destroy();
    this.disposer.run();
  }
}

/** Un nivel debe entregar 3 pistas; si no, se completa para no romper la UI. */
function normalizeHintList(hints) {
  const list = Array.isArray(hints) ? hints.filter((h) => typeof h === 'string' && h.trim()) : [];
  while (list.length < 3) list.push('(Pista pendiente de escribir para este nivel.)');
  return list.slice(0, 3);
}

export default levelScreen;
