'use strict';
// Código Rojo (basado en el de Drive In The Serrín): sonido sintetizado con Web Audio (sin archivos). Motor, viento, chirrido,
// choques, monedas, cuenta regresiva, caída, truenos, lluvia y fanfarria.

const SFX = {
  ctx: null, master: null, on: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain();
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp); comp.connect(c.destination);
    this.setVol();
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    // ---- motor: armónicos saturados + admisión + turbo ----
    const bus = c.createGain(); bus.gain.value = 0;               // volumen del motor
    const duck = c.createGain(); duck.gain.value = 1;              // baja cuando habla el copiloto
    const mix = c.createGain(); mix.gain.value = 0.55;
    const sh = c.createWaveShaper(); const cv = new Float32Array(512);
    for (let i = 0; i < 512; i++) { const x = i / 256 - 1; cv[i] = Math.tanh(x * 3.2) * 0.9; }
    sh.curve = cv; sh.oversample = '2x';
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 3;
    const body = c.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 140; body.gain.value = 7; body.Q.value = 1;
    const trem = c.createGain(); trem.gain.value = 0.8;
    const osc = (type, g) => { const o = c.createOscillator(); o.type = type; const gg = c.createGain(); gg.gain.value = g; o.connect(gg); gg.connect(mix); o.start(); return o; };
    const o1 = osc('sawtooth', 0.7), o2 = osc('sawtooth', 0.32), o3 = osc('sine', 0.65), o4 = osc('square', 0.12);
    o2.detune.value = 9;
    mix.connect(sh); sh.connect(lp); lp.connect(body); body.connect(trem); trem.connect(bus); bus.connect(duck); duck.connect(this.master);
    // irregularidad de las explosiones (le da "grano")
    const lfo = c.createOscillator(); lfo.type = 'triangle'; const lg = c.createGain(); lg.gain.value = 0.18;
    lfo.connect(lg); lg.connect(trem.gain); lfo.start();
    const intake = this.loop(1, 'bandpass', 500, 1.4, duck);
    const turbo = c.createOscillator(); turbo.type = 'sine'; const tg = c.createGain(); tg.gain.value = 0;
    turbo.connect(tg); tg.connect(duck); turbo.start();
    this.eng = { o1, o2, o3, o4, lp, bus, lfo, intake, turbo, tg, duck };
    this.wind = this.loop(1, 'bandpass', 600, 0.6);
    this.screech = this.loop(1, 'bandpass', 2400, 7);
    this.screech2 = this.loop(1.3, 'bandpass', 3400, 9);
    this.gravel = this.loop(0.6, 'bandpass', 380, 0.9);
    this.rain = this.loop(1, 'highpass', 3000, 0.5);
    this.last = { gear: 1, thr: 0, rpm: 0 };
    // sirena: dos osciladores que suben y bajan (gemido) con un LFO
    const so = c.createOscillator(); so.type = 'sawtooth';
    const sf = c.createBiquadFilter(); sf.type = 'lowpass'; sf.frequency.value = 2400;
    const sg = c.createGain(); sg.gain.value = 0;
    const lfo2 = c.createOscillator(); lfo2.type = 'triangle'; lfo2.frequency.value = 0.55;
    const lg2 = c.createGain(); lg2.gain.value = 330;
    lfo2.connect(lg2); lg2.connect(so.frequency); so.frequency.value = 950;
    so.connect(sf); sf.connect(sg); sg.connect(this.master); so.start(); lfo2.start();
    this.siren = { g: sg, lfo: lfo2 };
    // bocina
    const ho = c.createOscillator(); ho.type = 'square'; ho.frequency.value = 415;
    const ho2 = c.createOscillator(); ho2.type = 'square'; ho2.frequency.value = 523;
    const hf = c.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 1400;
    const hg = c.createGain(); hg.gain.value = 0;
    ho.connect(hf); ho2.connect(hf); hf.connect(hg); hg.connect(this.master); ho.start(); ho2.start();
    this.horn = hg;
    if (window.speechSynthesis) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => { this._voice = undefined; }; }
  },
  loop(rate, type, freq, q, dest) {
    const c = this.ctx, src = c.createBufferSource(); src.buffer = this.noise; src.loop = true; src.playbackRate.value = rate;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(dest || this.master); src.start(0, Math.random() * 1.5);
    return { g, f };
  },
  setVol() { if (this.master) this.master.gain.value = save.opt.sound ? save.opt.vol * 0.8 : 0; },
  // Se llama cada cuadro mientras se maneja. thr: acelerador (0-1).
  drive(C, on, rain, thr = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, k = 0.06, E = this.eng, L = this.last;
    const rpm = on ? C.rpm : 0, alive = on && C.state !== 'crash';
    const fr = Math.max(26, rpm / 60 * 2);                      // 4 cilindros: 2 explosiones por vuelta
    E.o1.frequency.setTargetAtTime(fr, t, 0.03);
    E.o2.frequency.setTargetAtTime(fr * 2, t, 0.03);
    E.o3.frequency.setTargetAtTime(fr * 0.5, t, 0.03);
    E.o4.frequency.setTargetAtTime(fr * 3, t, 0.03);
    E.lfo.frequency.setTargetAtTime(fr * 0.25, t, 0.05);
    const load = alive ? (thr ? 1 : 0.3) : 0;
    E.lp.frequency.setTargetAtTime(350 + rpm * (0.18 + load * 0.3), t, 0.05);
    E.bus.gain.setTargetAtTime(alive ? 0.11 + rpm / 7500 * 0.1 + load * 0.06 : 0, t, k);
    E.intake.f.frequency.setTargetAtTime(fr * 4, t, 0.05);
    E.intake.g.gain.setTargetAtTime(alive ? load * rpm / 7000 * 0.18 : 0, t, k);
    E.turbo.frequency.setTargetAtTime(1800 + rpm * 0.55, t, 0.1);
    E.tg.gain.setTargetAtTime(alive ? load * Math.max(0, rpm - 2500) / 5000 * 0.025 : 0, t, 0.2);
    if (alive && C.state === 'drive') {
      // cambio de marcha: el motor se corta un instante y suena la caja
      if (C.gear > L.gear && L.gear > 0) {
        E.bus.gain.cancelScheduledValues(t); E.bus.gain.setValueAtTime(0.03, t); E.bus.gain.linearRampToValueAtTime(0.2, t + 0.14);
        this.burst(0.05, 900, 0.18);
        if (thr) this.sweep(0.35, 5000, 1500, 0.07);          // pssst del turbo
      }
      // soltar el acelerador alto de vueltas: petardeo del escape
      if (L.thr && !thr && rpm > 4200) {
        this.sweep(0.3, 4500, 1800, 0.06);
        const n = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) this.burst(0.05, 500 + Math.random() * 400, 0.35 + Math.random() * 0.3, 'lowpass', 0.08 + Math.random() * 0.5);
      }
    }
    L.gear = C.gear; L.thr = thr; L.rpm = rpm;
    const sp = on ? Math.abs(C.f) : 0;
    this.wind.g.gain.setTargetAtTime(Math.min(0.4, sp * sp / 5000 + (C.state === 'fall' ? 0.3 : 0)), t, k);
    this.wind.f.frequency.setTargetAtTime(350 + sp * 18, t, k);
    const sl = on && C.state === 'drive' ? Math.max(0, C.slide - 0.6) : 0;
    this.screech.g.gain.setTargetAtTime(Math.min(0.2, sl * 0.06), t, 0.03);
    this.screech2.g.gain.setTargetAtTime(Math.min(0.1, sl * 0.03), t, 0.03);
    this.screech.f.frequency.setTargetAtTime(2200 + Math.sin(t * 13) * 300, t, 0.02);
    this.gravel.g.gain.setTargetAtTime(on && C.grass && C.state === 'drive' ? Math.min(0.35, sp * 0.012) : 0, t, 0.05);
    this.rain.g.gain.setTargetAtTime(rain ? 0.12 : 0, t, 0.3);
  },
  // volumen de la sirena (0 a 1) según qué tan cerca está el patrullero; fast = ritmo de persecución
  setSiren(v, fast) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.siren.g.gain.setTargetAtTime(v * 0.07, t, 0.15);
    this.siren.lfo.frequency.setTargetAtTime(fast ? 3.2 : 0.55, t, 0.3);
  },
  setHorn(on) { if (this.ctx) this.horn.gain.setTargetAtTime(on ? 0.09 : 0, this.ctx.currentTime, 0.02); },
  bust() { [440, 554, 659].forEach((f, i) => this.tone(f, 0.5, 'sawtooth', 0.08, i * 0.05)); this.tone(220, 1.2, 'square', 0.06, 0.2); },
  bag() { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.12, 'square', 0.07, i * 0.05)); },
  stopDrive() { this.setSiren(0); this.setHorn(false); if (this.ctx) this.drive({ rpm: 0, f: 0, slide: 0, state: 'off', gear: 1 }, false, false, 0); },
  // ruido con un filtro que barre de f0 a f1 (soplido, silbido)
  sweep(dur, f0, f1, vol, delay = 0) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay, s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  // golpe metálico: ruido por filtros resonantes que quedan vibrando
  metal(vol, delay = 0) {
    if (!this.ctx) return;
    for (const fq of [420, 870, 1650, 2900]) {
      const c = this.ctx, t = c.currentTime + delay + Math.random() * 0.03, s = c.createBufferSource(); s.buffer = this.noise;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fq * (0.85 + Math.random() * 0.3); f.Q.value = 18;
      const g = c.createGain(); g.gain.setValueAtTime(vol * 2.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5 + Math.random() * 0.4);
      s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + 1);
    }
  },
  glass(vol, delay = 0) {
    this.burst(0.35, 5000, vol * 0.5, 'highpass', delay);
    for (let i = 0; i < 9; i++) this.tone(2800 + Math.random() * 4000, 0.06 + Math.random() * 0.15, 'sine', vol * 0.08, delay + Math.random() * 0.4);
  },
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
  hit(v) { this.burst(0.25 + v * 0.02, 500 + v * 60, Math.min(0.9, 0.2 + v * 0.06)); this.tone(90, 0.2, 'sine', Math.min(0.5, v * 0.05), 0, -40); if (v > 3) this.metal(Math.min(0.25, v * 0.03)); this.sweep(0.4, 3000, 1200, Math.min(0.2, v * 0.03)); },
  scrape() { this.burst(0.2, 1800, 0.15, 'bandpass'); },
  beep(hi) { this.tone(hi ? 880 : 440, hi ? 0.5 : 0.22, 'square', 0.12); },
  fall() { this.tone(900, 1.8, 'sine', 0.1, 0, -760); this.sweep(2.2, 400, 2500, 0.25); },
  thud(v) { this.burst(0.5, 300, Math.min(0.9, 0.3 + v * 0.03)); this.tone(55, 0.45, 'sine', 0.5, 0, -25); if (v > 5) { this.metal(0.12); this.burst(0.3, 1500, 0.2, 'bandpass', 0.05); } },
  crash(v) {
    this.tone(60, 0.8, 'sine', 0.8, 0, -35);
    this.burst(0.9, 900, 0.9); this.burst(0.4, 250, 1);
    this.metal(0.35); this.metal(0.22, 0.18); this.metal(0.15, 0.42);
    this.glass(0.9, 0.05);
    this.sweep(0.9, 3500, 900, 0.3, 0.05);                       // chirrido de lata
    [0.6, 0.85, 1.1].forEach(d => this.burst(0.08, 2000 + Math.random() * 2000, 0.15, 'bandpass', d)); // piezas que caen
  },
  guard() { this.metal(0.4); this.sweep(0.7, 2600, 600, 0.35); this.burst(0.3, 500, 0.7); },
  boom(s = 1) { this.tone(45, 1.6, 'sine', 0.9 * s, 0, -25); this.burst(1.8 * s, 260, 1); this.burst(0.5, 1400, 0.6 * s); this.sweep(1.4, 900, 120, 0.5 * s, 0.1); },
  pop() { this.burst(0.08, 1800, 0.25, 'bandpass'); this.tone(900 + Math.random() * 600, 0.6, 'sine', 0.03, 0.05, -500); },
  brakeCue() { this.tone(1760, 0.09, 'square', 0.13); this.tone(1760, 0.09, 'square', 0.13, 0.12); },
  radio() { this.tone(1400, 0.05, 'square', 0.04); this.burst(0.12, 2500, 0.05, 'bandpass', 0.02); },
  // Voz del copiloto (voz del navegador en español). urgent corta lo que estaba diciendo.
  voice() {
    if (this._voice !== undefined || !window.speechSynthesis) return this._voice;
    const vs = speechSynthesis.getVoices().filter(v => /^es/i.test(v.lang));
    if (!vs.length) return null;
    const score = v => (/natural|neural|google|online/i.test(v.name) ? 4 : 0) + (/m[eé]xic|es-mx|es-us|latin|419/i.test(v.name + v.lang) ? 2 : 0) + (/jorge|diego|pablo|ra[uú]l|juan|carlos/i.test(v.name) ? 1 : 0);
    this._voice = vs.sort((a, b) => score(b) - score(a))[0];
    return this._voice;
  },
  say(txt, urgent) {
    if (save.opt.voz === false || !save.opt.sound || !window.speechSynthesis) return;
    try {
      if (urgent || speechSynthesis.speaking) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(txt);
      const v = this.voice();
      if (v) u.voice = v;
      u.lang = v ? v.lang : 'es-ES'; u.rate = urgent ? 1.35 : 1.18; u.pitch = 0.95; u.volume = Math.min(1, save.opt.vol * 1.2);
      const E = this.eng;
      if (E && this.ctx) {
        u.onstart = () => E.duck.gain.setTargetAtTime(0.55, this.ctx.currentTime, 0.05);
        u.onend = u.onerror = () => E.duck.gain.setTargetAtTime(1, this.ctx.currentTime, 0.2);
      }
      this.radio();
      speechSynthesis.speak(u);
    } catch (e) { /* sin voz */ }
  },
  thunder() { this.burst(2.6, 180, 0.7); this.burst(1.2, 90, 0.5, 'lowpass', 0.2); },
  nitro() { this.sweep(0.9, 300, 2600, 0.28); this.burst(0.7, 700, 0.35); },
  buy() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.12, i * 0.06)); },
  win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, i === 5 ? 0.6 : 0.16, 'square', 0.09, i * 0.13)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.13, i * 0.18)); },
  star(i) { this.tone(660 + i * 220, 0.25, 'triangle', 0.15); this.tone(990 + i * 330, 0.3, 'sine', 0.08, 0.05); },
  fanfare() { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, i === 6 ? 1.2 : 0.2, 'sawtooth', 0.07, i * 0.17)); },
};
