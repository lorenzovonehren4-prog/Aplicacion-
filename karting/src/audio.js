'use strict';
// Sonido sintetizado con Web Audio: motor, chirrido de llantas, golpes, semáforo y menús.

const SFX = {
  ctx: null, master: null, eng: null, squeal: null, rivals: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = save.opt.vol; this.master.connect(c.destination);
    this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = this.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.eng = this.engine(0.22);
    this.rivals = this.engine(0.0);
    // chirrido
    const src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 6;
    const g = c.createGain(); g.gain.value = 0;
    src.connect(bp).connect(g).connect(this.master); src.start();
    this.squeal = { g, bp };
  },
  engine(vol) {
    const c = this.ctx;
    const o1 = c.createOscillator(); o1.type = 'sawtooth';
    const o2 = c.createOscillator(); o2.type = 'square';
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 2;
    const g = c.createGain(); g.gain.value = 0;
    const m2 = c.createGain(); m2.gain.value = 0.5;
    o1.connect(lp); o2.connect(m2).connect(lp); lp.connect(g).connect(this.master);
    o1.start(); o2.start();
    return { o1, o2, lp, g, vol };
  },
  setVol(v) { if (this.master) this.master.gain.value = v; },
  // motor del jugador según velocidad y acelerador
  drive(speed, throttle, slip, rivalDist, on) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const e = this.eng;
    const f = 48 + speed * 6.2 + throttle * 10;
    e.o1.frequency.setTargetAtTime(f, t, 0.05);
    e.o2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
    e.lp.frequency.setTargetAtTime(500 + throttle * 1400 + speed * 20, t, 0.08);
    e.g.gain.setTargetAtTime(on ? 0.06 + throttle * 0.08 : 0, t, 0.08);
    this.squeal.g.gain.setTargetAtTime(on ? clamp((slip - 2) * 0.03, 0, 0.12) : 0, t, 0.05);
    const r = this.rivals;
    r.o1.frequency.setTargetAtTime(70 + 8 * 6.2, t, 0.2); r.o2.frequency.setTargetAtTime(66, t, 0.2);
    r.g.gain.setTargetAtTime(on ? clamp(0.05 - rivalDist * 0.002, 0, 0.05) : 0, t, 0.2);
  },
  silence() { this.drive(0, 0, 0, 999, false); },
  tone(freq, dur, type, vol, delay) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + (delay || 0);
    const o = c.createOscillator(); o.type = type || 'sine'; o.frequency.value = freq;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || 0.2, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  hit(power) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    const g = c.createGain(); g.gain.setValueAtTime(clamp(power * 0.05, 0.05, 0.4), t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    s.connect(f).connect(g).connect(this.master); s.start(t); s.stop(t + 0.3);
  },
  beep(n) { this.tone(n ? 520 : 1040, n ? 0.25 : 0.6, 'square', 0.12); },
  click() { this.tone(880, 0.06, 'triangle', 0.08); },
  coin() { this.tone(988, 0.08, 'square', 0.07); this.tone(1319, 0.2, 'square', 0.07, 0.08); },
  fanfare() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.12, i * 0.12)); },
};
