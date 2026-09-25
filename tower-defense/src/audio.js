/* =====================================================================
 * audio.js — Efectos de sonido sintetizados con Web Audio (sin archivos).
 * Se limita cuántos sonidos iguales suenan a la vez para evitar ruido.
 * ===================================================================== */
window.TD = window.TD || {};

TD.Audio = {
  ctx: null,
  master: null,
  enabled: true,
  volume: 0.5,
  lastPlayed: {},
  noiseBuffer: null,

  // Debe llamarse tras una interacción del usuario (política de los navegadores)
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    // Buffer de ruido blanco reutilizable para explosiones
    const len = this.ctx.sampleRate * 0.6;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  },

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  },

  // Evita repetir el mismo sonido demasiado seguido
  throttle(name, ms) {
    const now = performance.now();
    if (this.lastPlayed[name] && now - this.lastPlayed[name] < ms) return false;
    this.lastPlayed[name] = now;
    return true;
  },

  tone(freq, dur, type, vol, slideTo, delay) {
    const c = this.ctx;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },

  noise(dur, vol, filterFreq) {
    const c = this.ctx;
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(filterFreq || 1200, t);
    f.frequency.exponentialRampToValueAtTime(80, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur);
  },

  // Catálogo de sonidos del juego
  play(name) {
    if (!this.enabled || !this.ctx) return;
    switch (name) {
      case 'shot':    if (this.throttle(name, 60)) this.tone(880, 0.05, 'square', 0.04, 440); break;
      case 'mg':      if (this.throttle(name, 70)) this.tone(600, 0.03, 'square', 0.03, 300); break;
      case 'shotgun': if (this.throttle(name, 90)) this.noise(0.12, 0.12, 2500); break;
      case 'sniper':  if (this.throttle(name, 90)) { this.tone(1400, 0.12, 'sawtooth', 0.06, 200); this.noise(0.08, 0.08, 4000); } break;
      case 'boom':    if (this.throttle(name, 80)) this.noise(0.35, 0.22, 900); break;
      case 'bigboom': if (this.throttle(name, 120)) { this.noise(0.6, 0.35, 700); this.tone(90, 0.5, 'sine', 0.2, 40); } break;
      case 'missile': if (this.throttle(name, 120)) this.tone(300, 0.25, 'sawtooth', 0.04, 900); break;
      case 'zap':     if (this.throttle(name, 90)) this.tone(1800, 0.12, 'sawtooth', 0.04, 300); break;
      case 'laser':   if (this.throttle(name, 250)) this.tone(1200, 0.2, 'sine', 0.03, 1300); break;
      case 'flame':   if (this.throttle(name, 200)) this.noise(0.2, 0.04, 600); break;
      case 'freeze':  if (this.throttle(name, 150)) this.tone(2200, 0.25, 'triangle', 0.04, 900); break;
      case 'coin':    if (this.throttle(name, 50)) { this.tone(1320, 0.06, 'square', 0.05); this.tone(1760, 0.1, 'square', 0.05, null, 0.06); } break;
      case 'kill':    if (this.throttle(name, 45)) this.tone(220, 0.08, 'triangle', 0.05, 110); break;
      case 'build':   this.tone(440, 0.08, 'square', 0.07); this.tone(660, 0.12, 'square', 0.07, null, 0.08); break;
      case 'upgrade': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.1, 'square', 0.06, null, i * 0.06)); break;
      case 'sell':    this.tone(660, 0.08, 'square', 0.06); this.tone(440, 0.12, 'square', 0.06, null, 0.08); break;
      case 'error':   this.tone(150, 0.15, 'square', 0.07); break;
      case 'click':   this.tone(800, 0.04, 'square', 0.04); break;
      case 'leak':    this.tone(200, 0.3, 'sawtooth', 0.08, 80); break;
      case 'wave':    [392, 523, 659].forEach((f, i) => this.tone(f, 0.22, 'sawtooth', 0.05, null, i * 0.12)); break;
      case 'boss':    this.tone(70, 1.2, 'sawtooth', 0.15, 50); this.tone(105, 1.2, 'sawtooth', 0.1, 70); break;
      case 'win':     [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.2, 'square', 0.06, null, i * 0.13)); break;
      case 'lose':    [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.35, 'sawtooth', 0.06, null, i * 0.25)); break;
      case 'levelup': [523, 784, 1046, 1568].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.08, null, i * 0.09)); break;
      case 'star':    this.tone(1046, 0.25, 'triangle', 0.08, 2093); break;
    }
  }
};
