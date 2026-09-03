/**
 * core/audio.js — Gestor de sonido.
 *
 * Todos los sonidos se sintetizan con la Web Audio API: cero archivos, cero
 * peticiones de red, y el timbre encaja con la estética (tonos limpios, cortos,
 * nunca agresivos). `assets/sounds/` queda libre por si más adelante se quieren
 * samples reales: bastaría con cambiar la implementación de `play()`.
 *
 * El contexto se crea perezosamente en el primer gesto del usuario, como exigen
 * las políticas de autoplay.
 */

import * as state from './state.js';

let ctx = null;
let masterGain = null;
let ambientNodes = null;

const MASTER_VOLUME = 0.32;

/** Recetas de cada efecto: lista de tonos { freq, start, dur, type, gain }. */
const SOUNDS = {
  click:    { tones: [{ freq: 320, start: 0,     dur: 0.05, type: 'triangle', gain: 0.35 }] },
  correct:  { tones: [
                { freq: 880,  start: 0,    dur: 0.16, type: 'sine', gain: 0.4 },
                { freq: 1320, start: 0.07, dur: 0.22, type: 'sine', gain: 0.28 },
              ] },
  error:    { tones: [
                { freq: 150, start: 0,    dur: 0.14, type: 'sine',     gain: 0.4 },
                { freq: 110, start: 0.06, dur: 0.16, type: 'triangle', gain: 0.28 },
              ] },
  unlock:   { tones: [
                { freq: 523, start: 0,    dur: 0.12, type: 'sine', gain: 0.3 },
                { freq: 659, start: 0.08, dur: 0.12, type: 'sine', gain: 0.3 },
                { freq: 784, start: 0.16, dur: 0.18, type: 'sine', gain: 0.32 },
              ] },
  complete: { tones: [
                { freq: 523,  start: 0,    dur: 0.14, type: 'sine', gain: 0.3 },
                { freq: 659,  start: 0.1,  dur: 0.14, type: 'sine', gain: 0.3 },
                { freq: 784,  start: 0.2,  dur: 0.14, type: 'sine', gain: 0.3 },
                { freq: 1047, start: 0.3,  dur: 0.36, type: 'sine', gain: 0.34 },
              ] },
  hint:     { tones: [
                { freq: 660, start: 0,    dur: 0.09, type: 'triangle', gain: 0.22 },
                { freq: 495, start: 0.07, dur: 0.12, type: 'triangle', gain: 0.18 },
              ] },
};

/** Crea (o recupera) el AudioContext. Devuelve null si el navegador no puede. */
function ensureContext() {
  if (ctx) return ctx;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;

  try {
    ctx = new AudioCtor();
    masterGain = ctx.createGain();
    masterGain.gain.value = MASTER_VOLUME;
    masterGain.connect(ctx.destination);
  } catch (err) {
    console.warn('[audio] no disponible:', err);
    ctx = null;
  }
  return ctx;
}

/**
 * Prepara el audio tras el primer gesto del usuario.
 * Idempotente: se puede llamar en cada clic sin coste apreciable.
 */
export function unlock() {
  const context = ensureContext();
  if (context && context.state === 'suspended') context.resume().catch(() => {});
}

/** ¿Están los efectos activados en ajustes? */
const soundEnabled = () => state.getSettings().sound !== false;
const musicEnabled = () => state.getSettings().music !== false;

/**
 * Reproduce un efecto por nombre.
 * @param {keyof typeof SOUNDS} name
 */
export function play(name) {
  if (!soundEnabled()) return;
  const recipe = SOUNDS[name];
  if (!recipe) return;

  const context = ensureContext();
  if (!context) return;
  if (context.state === 'suspended') context.resume().catch(() => {});

  const now = context.currentTime;
  for (const tone of recipe.tones) {
    try { playTone(context, tone, now); } catch { /* un efecto perdido no rompe nada */ }
  }
}

function playTone(context, { freq, start, dur, type, gain }, now) {
  const osc = context.createOscillator();
  const env = context.createGain();

  osc.type = type ?? 'sine';
  osc.frequency.setValueAtTime(freq, now + start);

  // Envolvente suave: ataque corto, caída exponencial. Sin chasquidos.
  env.gain.setValueAtTime(0.0001, now + start);
  env.gain.exponentialRampToValueAtTime(gain ?? 0.3, now + start + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

  osc.connect(env);
  env.connect(masterGain);
  osc.start(now + start);
  osc.stop(now + start + dur + 0.03);
}

/* --------------------------------------------------------------------------
   Ambiente: drone casi subliminal
   -------------------------------------------------------------------------- */

/** Arranca el drone ambiental si la música está activada. */
export function startAmbient() {
  if (!musicEnabled() || ambientNodes) return;
  const context = ensureContext();
  if (!context) return;

  try {
    const gain = context.createGain();
    gain.gain.value = 0;
    gain.connect(masterGain);

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    filter.connect(gain);

    // Dos osciladores muy graves y ligeramente desafinados: sensación de aire.
    const oscs = [55, 82.5].map((freq, i) => {
      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq + i * 0.3;
      osc.connect(filter);
      osc.start();
      return osc;
    });

    gain.gain.setTargetAtTime(0.035, context.currentTime, 2.5);
    ambientNodes = { gain, filter, oscs };
  } catch (err) {
    console.warn('[audio] ambiente no disponible:', err);
  }
}

/** Detiene el drone con un desvanecido corto. */
export function stopAmbient() {
  if (!ambientNodes || !ctx) return;
  const { gain, oscs } = ambientNodes;
  ambientNodes = null;

  try {
    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
    setTimeout(() => {
      for (const osc of oscs) { try { osc.stop(); osc.disconnect(); } catch { /* ya parado */ } }
      try { gain.disconnect(); } catch { /* ya desconectado */ }
    }, 1200);
  } catch { /* silencio forzado, sin más */ }
}

/** Sincroniza el ambiente con el ajuste de música. */
export function syncAmbient() {
  if (musicEnabled()) startAmbient();
  else stopAmbient();
}
