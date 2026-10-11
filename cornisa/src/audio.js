'use strict';
// Cornisa: sonido sintetizado con Web Audio (sin archivos). Motor, viento, chirrido,
// choques, monedas, cuenta regresiva, caída, truenos, lluvia y fanfarria.

const SFX = {
  ctx: null, master: null, on: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.connect(c.destination);
    this.setVol();
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    // motor: dos osciladores saturados y filtrados
    const eg = c.createGain(); eg.gain.value = 0;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 2;
    const sh = c.createWaveShaper(); const cv = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; cv[i] = Math.tanh(x * 2.5); }
    sh.curve = cv;
    const o1 = c.createOscillator(); o1.type = 'sawtooth';
    const o2 = c.createOscillator(); o2.type = 'square';
    const g2 = c.createGain(); g2.gain.value = 0.5;
    o1.connect(sh); o2.connect(g2); g2.connect(sh); sh.connect(lp); lp.connect(eg); eg.connect(this.master);
    o1.start(); o2.start();
    this.eng = { o1, o2, lp, g: eg };
    this.wind = this.loop(1, 'bandpass', 600, 0.6);
    this.screech = this.loop(1, 'bandpass', 2600, 6);
    this.rain = this.loop(1, 'highpass', 3000, 0.5);
  },
  loop(rate, type, freq, q) {
    const c = this.ctx, src = c.createBufferSource(); src.buffer = this.noise; src.loop = true; src.playbackRate.value = rate;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(this.master); src.start();
    return { g, f };
  },
  setVol() { if (this.master) this.master.gain.value = save.opt.sound ? save.opt.vol * 0.8 : 0; },
  // Se llama cada cuadro mientras se maneja.
  drive(C, on, rain) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, k = 0.08;
    const rpm = on ? C.rpm : 0;
    const fr = Math.max(28, rpm / 60 * 2);
    this.eng.o1.frequency.setTargetAtTime(fr, t, 0.05);
    this.eng.o2.frequency.setTargetAtTime(fr * 0.5, t, 0.05);
    this.eng.lp.frequency.setTargetAtTime(500 + rpm * 0.25, t, 0.05);
    this.eng.g.gain.setTargetAtTime(on ? 0.1 + rpm / 7000 * 0.12 : 0, t, k);
    const sp = on ? Math.abs(C.f) : 0;
    this.wind.g.gain.setTargetAtTime(Math.min(0.35, sp * sp / 4000), t, k);
    this.wind.f.frequency.setTargetAtTime(400 + sp * 20, t, k);
    this.screech.g.gain.setTargetAtTime(on && C.state === 'drive' ? Math.min(0.22, Math.max(0, C.slide - 0.8) * 0.06) : 0, t, 0.04);
    this.rain.g.gain.setTargetAtTime(rain ? 0.12 : 0, t, 0.3);
  },
  stopDrive() { if (this.ctx) this.drive({ rpm: 0, f: 0, slide: 0, state: 'off' }, false, false); },
  tone(freq, dur, type = 'sine', vol = 0.2, delay = 0, slide = 0) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  burst(dur, freq, vol, type = 'lowpass', delay = 0) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay, s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  click() { this.tone(660, 0.06, 'triangle', 0.12); },
  ok() { this.tone(520, 0.08, 'triangle', 0.14); this.tone(780, 0.12, 'triangle', 0.14, 0.07); },
  no() { this.tone(220, 0.16, 'square', 0.08); },
  coin() { this.tone(988, 0.07, 'square', 0.07); this.tone(1319, 0.18, 'square', 0.07, 0.06); },
  hit(v) { this.burst(0.25 + v * 0.02, 500 + v * 60, Math.min(0.9, 0.2 + v * 0.06)); this.tone(90, 0.2, 'sine', Math.min(0.5, v * 0.05), 0, -40); },
  scrape() { this.burst(0.2, 1800, 0.15, 'bandpass'); },
  beep(hi) { this.tone(hi ? 880 : 440, hi ? 0.5 : 0.22, 'square', 0.12); },
  fall() { this.tone(900, 1.6, 'sine', 0.12, 0, -760); this.burst(0.8, 900, 0.2, 'bandpass'); },
  thud(v) { this.burst(0.5, 300, Math.min(0.9, 0.3 + v * 0.03)); this.tone(60, 0.4, 'sine', 0.4, 0, -30); },
  thunder() { this.burst(2.6, 180, 0.7); this.burst(1.2, 90, 0.5, 'lowpass', 0.2); },
  buy() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.12, i * 0.06)); },
  win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, i === 5 ? 0.6 : 0.16, 'square', 0.09, i * 0.13)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.13, i * 0.18)); },
  star(i) { this.tone(660 + i * 220, 0.25, 'triangle', 0.15); this.tone(990 + i * 330, 0.3, 'sine', 0.08, 0.05); },
  fanfare() { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, i === 6 ? 1.2 : 0.2, 'sawtooth', 0.07, i * 0.17)); },
};
