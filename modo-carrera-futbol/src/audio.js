/* ================== OPCIONES Y AUDIO SINTETIZADO (Web Audio, sin archivos) ================== */
const OPTS_KEY = 'mcf_opts_v1';
const OPTS = Object.assign({ music: true, sfx: true, vol: 0.7, quality: 'alta', speed: 'normal', tutorial: true }, (() => { try { return JSON.parse(localStorage.getItem(OPTS_KEY)) || {}; } catch (e) { return {}; } })());
function saveOpts() { try { localStorage.setItem(OPTS_KEY, JSON.stringify(OPTS)); } catch (e) { } }

const AU = { ctx: null, master: null, music: null, sfx: null, crowd: null, loop: null, mode: 'none', noise: null };
function audioInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return true; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
  try { AU.ctx = new AC(); } catch (e) { return false; }
  const c = AU.ctx;
  AU.master = c.createGain(); AU.master.connect(c.destination);
  AU.music = c.createGain(); AU.music.connect(AU.master);
  AU.sfx = c.createGain(); AU.sfx.connect(AU.master);
  const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  AU.noise = buf;
  applyAudioOpts();
  return true;
}
function applyAudioOpts() {
  if (!AU.ctx) return;
  AU.master.gain.value = OPTS.vol;
  AU.music.gain.value = OPTS.music ? 0.32 : 0;
  AU.sfx.gain.value = OPTS.sfx ? 0.9 : 0;
}
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => { if (audioInit() && AU.pending) { const m = AU.pending; AU.pending = null; setMusic(m); } }, { once: false, passive: true }));

function tone(freq, dur, type, vol, when, dest, slide) {
  if (!AU.ctx) return;
  const c = AU.ctx, t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || AU.sfx); o.start(t); o.stop(t + dur + 0.05);
}
function noiseHit(dur, freq, q, vol, when, dest, attack) {
  if (!AU.ctx) return null;
  const c = AU.ctx, t = c.currentTime + (when || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = AU.noise; s.loop = true; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (attack || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(dest || AU.sfx); s.start(t, Math.random()); s.stop(t + dur + 0.1);
  return f;
}
function sfxClick() { tone(880, 0.06, 'triangle', 0.08); }
function sfxWhistle(n) { for (let i = 0; i < (n || 1); i++) { tone(2600, 0.28, 'sine', 0.12, i * 0.38); tone(2750, 0.28, 'sine', 0.06, i * 0.38); } }
function sfxKick() { tone(140, 0.12, 'sine', 0.4, 0, null, 50); noiseHit(0.06, 1800, 1, 0.1); }
function sfxGoal() {
  if (!AU.ctx) return;
  sfxKick();
  const f = noiseHit(3.2, 700, 0.6, 0.55, 0.15, null, 0.4); if (f) f.frequency.exponentialRampToValueAtTime(1100, AU.ctx.currentTime + 1.2);
  for (const [fr, w] of [[392, 0.4], [494, 0.4], [587, 0.4], [784, 0.9]]) tone(fr, w + 0.4, 'sawtooth', 0.05, 0.3);
}
function sfxCheer() { noiseHit(1.4, 800, 0.7, 0.25, 0, null, 0.2); }
function sfxBoo() { tone(160, 1.2, 'sawtooth', 0.04, 0, null, 110); noiseHit(1, 300, 0.8, 0.12, 0, null, 0.2); }
function sfxCash() { tone(1320, 0.08, 'square', 0.06); tone(1760, 0.18, 'square', 0.06, 0.08); }
function sfxFirework() { noiseHit(0.5, 400, 0.5, 0.25, 0, null, 0.005); tone(900, 0.4, 'sine', 0.04, 0, null, 300); }
function sfxPop() { tone(520, 0.1, 'triangle', 0.1, 0, null, 900); }
function sfxBad() { tone(300, 0.25, 'triangle', 0.08, 0, null, 180); }

/* ---------- hinchada de fondo ---------- */
function crowdOn(level) {
  if (!AU.ctx) return;
  if (!AU.crowd) {
    const c = AU.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = AU.noise; s.loop = true; f.type = 'bandpass'; f.frequency.value = 650; f.Q.value = 0.5; g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(AU.sfx); s.start();
    AU.crowd = { s, g };
  }
  AU.crowd.g.gain.setTargetAtTime(0.05 + (level || 0.5) * 0.08, AU.ctx.currentTime, 0.4);
}
function crowdOff() { if (AU.crowd && AU.ctx) AU.crowd.g.gain.setTargetAtTime(0, AU.ctx.currentTime, 0.3); }

/* ---------- música ---------- */
const MENU_PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
function setMusic(mode) {
  if (!AU.ctx) { AU.pending = mode; return; }
  if (AU.mode === mode) return;
  AU.mode = mode;
  if (AU.loop) { clearInterval(AU.loop); AU.loop = null; }
  if (mode === 'none') return;
  let step = 0;
  const bpm = mode === 'disco' ? 124 : 96, stepDur = 60 / bpm / 2;
  const tick = () => {
    if (!OPTS.music) { step++; return; }
    const bar = Math.floor(step / 8) % 4, s = step % 8, ch = MENU_PROG[bar];
    if (mode === 'menu') {
      if (s === 0) for (const n of ch) tone(midi(n), stepDur * 7, 'triangle', 0.035, 0, AU.music);
      tone(midi(ch[[0, 1, 2, 1, 0, 2, 1, 2][s]] + 12), stepDur * 0.9, 'sine', 0.05, 0, AU.music);
      if (s % 4 === 0) tone(midi(ch[0] - 12), stepDur * 3, 'sine', 0.08, 0, AU.music);
    } else {
      if (s % 2 === 0) tone(110, 0.18, 'sine', 0.35, 0, AU.music, 40);
      if (s % 2 === 1) noiseHit(0.05, 8000, 1, 0.06, 0, AU.music);
      if (s === 2 || s === 6) noiseHit(0.12, 1800, 0.8, 0.08, 0, AU.music);
      tone(midi(ch[0] - 12 + (s % 4 === 3 ? 7 : 0)), stepDur * 0.8, 'sawtooth', 0.05, 0, AU.music);
      if (s === 0 || s === 3 || s === 6) for (const n of ch) tone(midi(n + 12), stepDur * 0.6, 'square', 0.015, 0, AU.music);
    }
    step++;
  };
  tick(); AU.loop = setInterval(tick, stepDur * 1000);
}
