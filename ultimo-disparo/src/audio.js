'use strict';
// Último Disparo: sonido sintetizado con Web Audio (sin archivos): disparo con eco, cerrojo,
// clic de la mira, latido y respiración, silbido de la bala, impacto, ambiente y fanfarrias.

const SFX = {
  ctx: null, master: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain();
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 5;
    this.master.connect(comp); comp.connect(c.destination);
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    // eco de ciudad: respuesta al impulso generada
    const il = c.sampleRate * 2.4, ir = c.createBuffer(2, il, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const x = ir.getChannelData(ch); for (let i = 0; i < il; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / il, 3.2) * (i % 9000 < 300 ? 1.6 : 1); }
    this.verb = c.createConvolver(); this.verb.buffer = ir;
    this.verbIn = c.createGain(); this.verbIn.gain.value = 0.5;
    this.verbIn.connect(this.verb); this.verb.connect(this.master);
    this.amb = this.loop(0.5, 'lowpass', 500, 0.5);
    this.amb2 = this.loop(1.4, 'bandpass', 1800, 0.8);
    this.setVol();
  },
  setVol() { if (this.master) this.master.gain.value = save.opt.sound ? save.opt.vol : 0; },
  loop(rate, type, freq, q) {
    const c = this.ctx, src = c.createBufferSource(); src.buffer = this.noise; src.loop = true; src.playbackRate.value = rate;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(this.master); src.start(0, Math.random());
    return { g, f };
  },
  ambience(map, on) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const v = { dia: [0.05, 0.012, 600], puerto: [0.06, 0.008, 380], noche: [0.035, 0.006, 450], desierto: [0.07, 0.02, 900] }[map] || [0, 0, 500];
    this.amb.g.gain.setTargetAtTime(on ? v[0] : 0, t, 0.5);
    this.amb2.g.gain.setTargetAtTime(on ? v[1] : 0, t, 0.5);
    this.amb.f.frequency.setTargetAtTime(v[2], t, 0.5);
  },
  burst(dur, type, freq, q, vol, when = 0, dest, rate = 1, sweepTo) {
    const c = this.ctx, t = c.currentTime + when;
    const s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = rate;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
    return g;
  },
  tone(freq, dur, type = 'sine', vol = 0.2, when = 0, to, dest) {
    const c = this.ctx, t = c.currentTime + when;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  shot(silenced) {
    if (!this.ctx) return;
    if (silenced) {
      this.burst(0.18, 'bandpass', 900, 0.8, 0.5);
      this.tone(160, 0.12, 'sine', 0.35, 0, 60);
      this.burst(0.05, 'highpass', 3000, 0.7, 0.2);
    } else {
      this.burst(0.06, 'highpass', 1500, 0.5, 1.0);
      this.burst(0.5, 'lowpass', 1400, 0.6, 0.9);
      this.tone(110, 0.35, 'sine', 0.9, 0, 38);
      const e = this.burst(0.45, 'lowpass', 900, 0.5, 0.7, 0, this.verbIn);
      void e;
    }
    this.bolt(0.55);
  },
  bolt(when = 0) {
    if (!this.ctx) return;
    this.burst(0.04, 'bandpass', 2600, 4, 0.35, when);
    this.burst(0.05, 'bandpass', 1700, 5, 0.3, when + 0.16);
    this.burst(0.04, 'bandpass', 2200, 5, 0.3, when + 0.42);
    this.burst(0.06, 'bandpass', 3000, 4, 0.35, when + 0.56);
  },
  click() { if (this.ctx) this.burst(0.03, 'bandpass', 3200, 6, 0.25); },
  zoom() { if (this.ctx) { this.burst(0.025, 'bandpass', 4200, 8, 0.15); this.tone(1800, 0.04, 'square', 0.02); } },
  scope(on) { if (this.ctx) { this.burst(0.08, 'bandpass', on ? 1200 : 900, 2, 0.2); this.burst(0.03, 'bandpass', 3800, 6, 0.12, 0.05); } },
  heart() { if (this.ctx) { this.tone(58, 0.14, 'sine', 0.5); this.tone(52, 0.16, 'sine', 0.38, 0.2); } },
  breathIn() { if (this.ctx) this.burst(0.6, 'bandpass', 700, 0.8, 0.12, 0, null, 1, 1300); },
  breathOut() { if (this.ctx) this.burst(0.8, 'bandpass', 900, 0.8, 0.14, 0, null, 1, 400); },
  whoosh(dur) { if (this.ctx) { this.burst(dur, 'bandpass', 600, 2.5, 0.35, 0, null, 0.6, 2400); this.tone(320, dur, 'sine', 0.05, 0, 900); } },
  impact() { if (this.ctx) { this.tone(90, 0.25, 'sine', 0.6, 0, 40); this.burst(0.15, 'lowpass', 700, 0.7, 0.5); } },
  ricochet() { if (this.ctx) { this.burst(0.07, 'highpass', 2200, 1, 0.3); this.tone(2600, 0.35, 'sine', 0.07, 0.02, 900); } },
  tick(hi) { if (this.ctx) this.tone(hi ? 1320 : 990, 0.06, 'square', 0.05); },
  coin() { if (this.ctx) { this.tone(988, 0.08, 'square', 0.06); this.tone(1319, 0.18, 'square', 0.06, 0.07); } },
  buy() { if (this.ctx) { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.12, i * 0.06)); } },
  nope() { if (this.ctx) this.tone(180, 0.18, 'square', 0.07, 0, 120); },
  win() {
    if (!this.ctx) return;
    [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.16, i * 0.11));
    this.tone(1047, 0.7, 'triangle', 0.18, 0.46); this.tone(784, 0.7, 'sine', 0.1, 0.46);
  },
  star(i) { if (this.ctx) this.tone(880 * Math.pow(1.26, i), 0.25, 'triangle', 0.14); },
  fail() {
    if (!this.ctx) return;
    [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.38, 'sawtooth', 0.06, i * 0.16));
    this.tone(98, 1.0, 'sine', 0.25, 0.6);
  },
  panic() { if (this.ctx) { for (let i = 0; i < 3; i++) this.tone(700 + Math.random() * 400, 0.5, 'sawtooth', 0.012, i * 0.12, 500 + Math.random() * 200); } },
};
