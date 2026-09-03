/**
 * ui/ending.js — Pantalla final.
 *
 * Es el pago de todo el juego, y el documento maestro le dedica una maqueta
 * entera: ABIERTO · ¡ESCAPASTE! · 30/30 · tiempo total · estrellas.
 *
 * Hasta ahora, terminar el nivel 30 sólo mostraba el mismo modal que cualquier
 * otro nivel. Esta pantalla existe para que la última puerta se sienta distinta
 * de las veintinueve anteriores.
 *
 * No es un modal: es una ruta propia (`#/final`). Así se puede volver a ella
 * desde el menú cuando la partida ya está completa, en vez de ser un momento
 * que se pierde al cerrar una ventana.
 */

import { el, icon, starIcon, announce } from '../utils/dom.js';
import { formatTime } from '../utils/math.js';
import { prefersReducedMotion } from '../utils/animations.js';
import * as router from '../core/router.js';
import * as audio from '../core/audio.js';
import * as progress from '../systems/progress.js';
import { MAX_STARS } from '../systems/scoring.js';

const STYLES = `
.ending {
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: var(--sp-6);
  padding-top: var(--sp-7);
  padding-bottom: var(--sp-7);
}

.ending__door {
  position: relative;
  width: clamp(96px, 26vw, 132px);
  aspect-ratio: 2 / 3;
  animation: rise-in 0.7s var(--ease) both;
}

.ending__door svg { width: 100%; height: 100%; color: var(--success); }

/* Resplandor que sale por la puerta abierta. */
.ending__glow {
  position: absolute;
  inset: -40%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(34,197,94,0.28), transparent 68%);
  animation: ending-breathe 4s ease-in-out infinite;
  pointer-events: none;
}

@keyframes ending-breathe {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50%      { opacity: 1;    transform: scale(1.08); }
}

.ending__status {
  font-size: 0.74rem;
  letter-spacing: 0.42em;
  text-transform: uppercase;
  color: var(--success);
  margin-right: -0.42em;
  animation: fade-in 0.8s var(--ease) 0.2s both;
}

.ending__title {
  font-size: clamp(2rem, 9vw, 3.6rem);
  font-weight: 200;
  letter-spacing: 0.16em;
  line-height: 1;
  margin-right: -0.16em;
  color: #fff;
  text-shadow: 0 0 30px rgba(34, 197, 94, 0.35), 0 0 70px rgba(0, 212, 255, 0.2);
  animation: rise-in 0.8s var(--ease) 0.3s both;
}

.ending__stats {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: center;
  gap: var(--sp-5) var(--sp-7);
  animation: rise-in 0.8s var(--ease) 0.45s both;
}

.ending__stat { display: flex; flex-direction: column; gap: var(--sp-2); }

.ending__stat-label {
  font-size: 0.6rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.ending__stat-value {
  font-family: var(--font-mono);
  font-size: clamp(1.2rem, 5vw, 1.6rem);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.ending__stat-value--gold { color: var(--gold); }

.ending__perfect {
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--gold);
  animation: fade-in 0.8s var(--ease) 0.7s both;
}

.ending__rule {
  width: min(280px, 66vw);
  height: 1px;
  border: 0;
  background: linear-gradient(90deg, transparent, rgba(34,197,94,0.45), transparent);
}

.ending__actions {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  width: min(340px, 100%);
  animation: rise-in 0.8s var(--ease) 0.6s both;
}

.ending__note {
  font-size: 0.78rem;
  color: var(--text-faint);
  max-width: 40ch;
  line-height: 1.6;
}

@media (prefers-reduced-motion: reduce) {
  .ending__glow { animation: none; }
}
`;

export const endingScreen = {
  mount(container) {
    const summary = progress.getSummary();

    // A esta pantalla sólo se llega habiendo terminado: si alguien escribe la
    // ruta a mano sin haber acabado, se le devuelve al selector.
    if (!summary.isFinished) {
      router.go('/levels', { replace: true });
      return null;
    }

    const perfect = summary.stars === summary.maxStars;

    const screen = el('section.screen.ending', { 'aria-labelledby': 'ending-title' }, [
      el('style', { text: STYLES }),

      el('div.ending__door', {}, [
        el('div.ending__glow', { 'aria-hidden': 'true' }),
        buildOpenDoor(),
      ]),

      el('p.ending__status', { text: 'Abierto' }),
      el('h1#ending-title.ending__title', { text: '¡Escapaste!' }),

      el('hr.ending__rule'),

      el('div.ending__stats', {}, [
        stat('Niveles', `${summary.completed} / ${summary.total}`),
        stat('Estrellas', `${summary.stars} / ${summary.maxStars}`, { gold: true }),
        stat('Tiempo total', formatTime(summary.totalPlayTime)),
      ]),

      buildStarBar(summary),

      perfect
        ? el('p.ending__perfect', { text: '★ Partida perfecta · 90 de 90' })
        : el('p.ending__note', {
            text: `Te faltan ${summary.maxStars - summary.stars} estrellas. Cualquier nivel se puede repetir sin perder lo que ya tienes.`,
          }),

      el('div.ending__actions', {}, [
        el('button.btn.btn--primary', {
          type: 'button',
          on: { click: () => { audio.play('click'); router.go('/levels'); } },
        }, [icon('grid', { size: 15 }), 'Repasar los niveles']),
        el('button.btn', {
          type: 'button',
          on: { click: () => { audio.play('click'); router.go('/menu'); } },
        }, ['Volver al menú']),
      ]),
    ]);

    container.append(screen);

    audio.play('complete');
    announce(`Has escapado. ${summary.completed} de ${summary.total} niveles y ${summary.stars} de ${summary.maxStars} estrellas.`);

    if (!prefersReducedMotion()) celebrate(screen);
    return null;
  },
};

function stat(label, value, { gold = false } = {}) {
  return el('div.ending__stat', {}, [
    el('span.ending__stat-label', { text: label }),
    el('span', {
      class: `ending__stat-value${gold ? ' ending__stat-value--gold' : ''}`,
      text: value,
    }),
  ]);
}

/** Tres estrellas grandes llenas en proporción a lo conseguido. */
function buildStarBar(summary) {
  const ratio = summary.maxStars ? summary.stars / summary.maxStars : 0;
  // Con floor, la tercera estrella se reserva para el 90 de 90: redondear
  // encendía las tres al 96 % y contradecía el texto de debajo.
  const filled = Math.floor(ratio * MAX_STARS);

  return el('span.stars.stars--lg.stars--animated', {
    role: 'img',
    'aria-label': `${summary.stars} de ${summary.maxStars} estrellas`,
  }, Array.from({ length: MAX_STARS }, (_, i) =>
    starIcon({ size: 30, className: `stars__item${i < filled ? ' stars__item--filled' : ''}` })));
}

function buildOpenDoor() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 60 90');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.5');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <rect x="4" y="4" width="52" height="82" rx="4" opacity="0.35" />
    <path d="M4 4 L34 14 L34 76 L4 86 Z" fill="rgba(34,197,94,0.1)" />
    <circle cx="28" cy="46" r="2.4" fill="currentColor" stroke="none" />
  `;
  return svg;
}

/**
 * Lluvia breve de partículas dentro de la pantalla. Dura poco a propósito: la
 * estética del juego es contenida y una fiesta larga la rompería.
 */
function celebrate(screen) {
  const canvas = el('canvas', {
    'aria-hidden': 'true',
    style: {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: '5',
    },
  });
  screen.append(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const colors = ['34, 197, 94', '0, 212, 255', '251, 191, 36', '124, 58, 237'];
  const bits = Array.from({ length: 70 }, () => ({
    x: width / 2 + (Math.random() - 0.5) * width * 0.5,
    y: height * 0.42 + (Math.random() - 0.5) * 60,
    vx: (Math.random() - 0.5) * 3.4,
    vy: -Math.random() * 4.5 - 1.2,
    r: Math.random() * 2.6 + 1,
    color: colors[Math.floor(Math.random() * colors.length)],
    life: 1,
  }));

  let frame = 0;
  let running = true;

  (function draw() {
    if (!running) return;
    frame += 1;
    ctx.clearRect(0, 0, width, height);

    for (const bit of bits) {
      bit.x += bit.vx;
      bit.y += bit.vy;
      bit.vy += 0.06;      // gravedad suave
      bit.life -= 0.007;

      if (bit.life <= 0) continue;
      ctx.beginPath();
      ctx.arc(bit.x, bit.y, bit.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${bit.color}, ${Math.max(0, bit.life)})`;
      ctx.fill();
    }

    if (frame < 260) requestAnimationFrame(draw);
    else { running = false; canvas.remove(); }
  })();
}

export default endingScreen;
