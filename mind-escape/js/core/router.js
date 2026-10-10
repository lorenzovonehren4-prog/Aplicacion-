/**
 * core/router.js — Navegación entre pantallas.
 *
 * Rutas basadas en hash para que el botón "atrás" del navegador funcione:
 *   #/menu            Menú principal
 *   #/levels          Selector de niveles
 *   #/level/7         Nivel 7
 *   #/settings        Ajustes
 *
 * Cada pantalla es un objeto { mount(container, params) → destroy? }.
 * El router garantiza que siempre se llama a `destroy` de la anterior antes
 * de montar la siguiente: es lo que impide que los niveles filtren listeners.
 */

import { clear } from '../utils/dom.js';
import { transitionScreens } from '../utils/animations.js';

const routes = [];
let container = null;
let currentScreen = null;
let currentRoute = null;
let started = false;
let notFoundHandler = null;
let mountToken = 0;
const beforeHooks = [];

/**
 * Registra una ruta.
 * @param {string} pattern p. ej. '/level/:id'
 * @param {{ mount: Function, title?: string }} screen
 */
export function register(pattern, screen) {
  routes.push({ pattern, matcher: toMatcher(pattern), screen });
}

/** Ruta a la que caer cuando el hash no coincide con nada. */
export function setNotFound(path) {
  notFoundHandler = path;
}

/**
 * Registra una función que se ejecuta antes de montar cualquier pantalla.
 * Existe para que capas superiores (modales, overlays) puedan limpiarse sin
 * que el router tenga que conocerlas.
 */
export function beforeEach(hook) {
  beforeHooks.push(hook);
  return () => {
    const index = beforeHooks.indexOf(hook);
    if (index >= 0) beforeHooks.splice(index, 1);
  };
}

/** Arranca el router sobre un contenedor. */
export function start(mountPoint) {
  container = mountPoint;
  if (started) return;
  started = true;
  window.addEventListener('hashchange', handleChange);
  handleChange();
}

/** Navega a una ruta. */
export function go(path, { replace = false } = {}) {
  const target = `#${normalize(path)}`;
  if (window.location.hash === target) { handleChange(); return; }
  if (replace) window.location.replace(target);
  else window.location.hash = target;
}

/** Vuelve atrás en el historial, o al menú si no hay historial propio. */
export function back(fallback = '/menu') {
  if (window.history.length > 1) window.history.back();
  else go(fallback, { replace: true });
}

/** Ruta activa: { path, params }. */
export const getCurrentRoute = () => currentRoute;

/**
 * Vuelve a montar la ruta actual desde cero (destruye y reconstruye).
 * Es lo que usa "reintentar" para dejar un nivel completamente limpio.
 */
export function reload() {
  handleChange();
}

/* -------------------------------------------------------------------------- */

function handleChange() {
  const path = normalize(window.location.hash.replace(/^#/, '') || '/menu');

  for (const route of routes) {
    const params = route.matcher(path);
    if (!params) continue;
    mountScreen(route, path, params);
    return;
  }

  if (notFoundHandler && path !== notFoundHandler) go(notFoundHandler, { replace: true });
}

function mountScreen(route, path, params) {
  for (const hook of beforeHooks) {
    try { hook(); } catch (err) { console.error('[router] beforeEach:', err); }
  }

  // Desmontar la anterior SIEMPRE, incluso si falla el montaje de la nueva.
  if (typeof currentScreen === 'function') {
    try { currentScreen(); } catch (err) { console.error('[router] destroy:', err); }
  }
  currentScreen = null;
  currentRoute = { path, params, pattern: route.pattern };

  // La transición pinta con retardo. Si llega otra navegación mientras tanto,
  // el callback obsoleto debe abortar o pisaría a la pantalla nueva.
  const token = (mountToken += 1);

  transitionScreens(container, () => {
    if (token !== mountToken) return;
    clear(container);
    try {
      currentScreen = route.screen.mount(container, params) ?? null;
    } catch (err) {
      console.error('[router] mount:', err);
      renderMountError(err);
    }
  });

  window.scrollTo({ top: 0, behavior: 'auto' });
}

function renderMountError(err) {
  clear(container);
  const section = document.createElement('section');
  section.className = 'screen center stack stack--4';
  section.style.justifyContent = 'center';
  const title = document.createElement('h1');
  title.className = 'section-title';
  title.textContent = 'Algo se rompió al cargar esta pantalla';
  const detail = document.createElement('p');
  detail.className = 'text-faint mono';
  detail.textContent = String(err?.message ?? err);
  const link = document.createElement('a');
  link.href = '#/menu';
  link.className = 'btn';
  link.textContent = 'Volver al menú';
  section.append(title, detail, link);
  container.append(section);
}

/** '/level/:id' → función que devuelve params o null. */
function toMatcher(pattern) {
  const parts = normalize(pattern).split('/').filter(Boolean);

  return (path) => {
    const segments = normalize(path).split('/').filter(Boolean);
    if (segments.length !== parts.length) return null;

    const params = {};
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      if (part.startsWith(':')) params[part.slice(1)] = decodeURIComponent(segments[i]);
      else if (part !== segments[i]) return null;
    }
    return params;
  };
}

function normalize(path) {
  const trimmed = String(path || '/').trim();
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;
}
