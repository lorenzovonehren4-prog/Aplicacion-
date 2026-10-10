/**
 * utils/animations.js — Animaciones reutilizables y el campo de partículas.
 *
 * Todo respeta `prefers-reduced-motion`: si el usuario lo pide, las
 * animaciones se reducen a no-ops y el canvas de partículas no se dibuja.
 */

import { playAnimation } from './dom.js';

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Pulso verde de acierto sobre un elemento. */
export const flashSuccess = (node) => playAnimation(node, 'is-success', 700);

/** Sacudida horizontal de error. No reinicia nada, sólo comunica. */
export const flashError = (node) => playAnimation(node, 'is-error', 500);

/** Aparición escalonada de una lista de nodos. */
export function staggerIn(nodes, { step = 40, duration = 350 } = {}) {
  if (prefersReducedMotion()) return;
  nodes.forEach((node, i) => {
    node.style.animationDelay = `${i * step}ms`;
    node.style.animationDuration = `${duration}ms`;
  });
}

/**
 * Transición de salida/entrada entre pantallas.
 * @param {HTMLElement} container
 * @param {() => void} render Pinta el nuevo contenido (se llama a mitad).
 */
export function transitionScreens(container, render) {
  if (prefersReducedMotion()) { render(); return Promise.resolve(); }

  container.classList.add('screen-transition', 'screen-exit');

  return new Promise((resolve) => {
    setTimeout(() => {
      render();
      container.classList.remove('screen-exit');
      container.classList.add('screen-enter');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          container.classList.remove('screen-enter');
          container.classList.add('screen-active');
          resolve();
        });
      });
    }, 180);
  });
}

/* ==========================================================================
   Campo de partículas del fondo
   ========================================================================== */

/**
 * Arranca el campo de partículas sobre un <canvas>. Muy sutil a propósito:
 * puntos lentos, opacidad baja, sin conexiones ni ruido visual.
 *
 * @param {HTMLCanvasElement} canvas
 * @returns {() => void} función para detenerlo
 */
export function startParticleField(canvas) {
  if (!canvas || !canvas.getContext || prefersReducedMotion()) return () => {};

  const ctx = canvas.getContext('2d');
  const particles = [];
  let width = 0;
  let height = 0;
  let dpr = 1;
  let frame = 0;
  let running = true;

  const COLORS = ['0, 212, 255', '124, 58, 237', '255, 255, 255'];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    particles.length = 0;
    // Densidad ligada al área, con techo para no castigar móviles.
    const count = Math.min(70, Math.round((width * height) / 26000));
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.6 + 0.5,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16 - 0.04,
        alpha: Math.random() * 0.28 + 0.07,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function draw() {
    if (!running) return;
    frame += 1;
    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;

      // Respiración lenta, apenas perceptible.
      const twinkle = 0.75 + 0.25 * Math.sin(frame * 0.012 + p.phase);

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color}, ${p.alpha * twinkle})`;
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  requestAnimationFrame(draw);

  return () => {
    running = false;
    window.removeEventListener('resize', resize);
    ctx.clearRect(0, 0, width, height);
  };
}
