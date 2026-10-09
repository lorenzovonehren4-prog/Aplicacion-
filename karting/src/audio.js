'use strict';
// Sonido sintetizado con Web Audio: motor de kart (un cilindro de dos tiempos, sin caja: el tono sigue
// a la velocidad), petardeo al soltar, chirrido de llantas, eco dentro de los túneles, público cerca de
// las tribunas, golpes, semáforo y un locutor en español (speechSynthesis del navegador).

const SFX = {
  ctx: null, master: null, eng: null, squeal: null, rivals: null, crowd: null, verb: null, lastThr: 0, sayT: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = save.opt.vol; this.master.connect(c.destination);
    this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = this.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // eco del túnel: respuesta al impulso hecha con ruido que se apaga (1,4 s)
    const len = Math.floor(c.sampleRate * 1.4), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const b = ir.getChannelData(ch); for (let i = 0; i < len; i++) b[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * (i < 900 ? 0.2 : 1); }
    const conv = c.createConvolver(); conv.buffer = ir;
    const wet = c.createGain(); wet.gain.value = 0;
    this.bus = c.createGain(); this.bus.connect(this.master);     // todo lo del kart pasa por acá
    this.bus.connect(conv); conv.connect(wet).connect(this.master);
    this.verb = wet;
    this.eng = this.engine(1);
    this.rivals = this.engine(0.5);
    // chirrido
    const src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 6;
    const g = c.createGain(); g.gain.value = 0;
    src.connect(bp).connect(g).connect(this.bus); src.start();
    this.squeal = { g, bp };
    // público: ruido de muchas voces (banda media con un vaivén lento)
    const cs = c.createBufferSource(); cs.buffer = this.noise; cs.loop = true; cs.playbackRate.value = 0.5;
    const cb = c.createBiquadFilter(); cb.type = 'bandpass'; cb.frequency.value = 700; cb.Q.value = 0.6;
    const cl = c.createBiquadFilter(); cl.type = 'peaking'; cl.frequency.value = 1500; cl.gain.value = 6; cl.Q.value = 2;
    const cg = c.createGain(); cg.gain.value = 0;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.23; const lg = c.createGain(); lg.gain.value = 300;
    lfo.connect(lg).connect(cl.frequency); lfo.start();
    cs.connect(cb).connect(cl).connect(cg).connect(this.master); cs.start();
    this.crowd = cg;
  },
  // Motor: diente de sierra + cuadrada a media frecuencia + armónico, saturado (WaveShaper) y filtrado,
  // más ruido de admisión. Un vaivén rápido le da la aspereza de un monocilíndrico.
  engine(vol) {
    const c = this.ctx;
    const o1 = c.createOscillator(); o1.type = 'sawtooth';
    const o2 = c.createOscillator(); o2.type = 'square';
    const o3 = c.createOscillator(); o3.type = 'sawtooth';
    const m2 = c.createGain(); m2.gain.value = 0.55;
    const m3 = c.createGain(); m3.gain.value = 0.18;
    const sh = c.createWaveShaper();
    const curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(x * 2.6); }
    sh.curve = curve; sh.oversample = '2x';
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 3;
    const body = c.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 180; body.gain.value = 5; body.Q.value = 1.2;
    const g = c.createGain(); g.gain.value = 0;
    // aspereza: modulación de amplitud
    const am = c.createGain(); am.gain.value = 1;
    const rough = c.createOscillator(); rough.type = 'triangle'; rough.frequency.value = 23;
    const rg = c.createGain(); rg.gain.value = 0.22; rough.connect(rg).connect(am.gain); rough.start();
    // admisión
    const ns = c.createBufferSource(); ns.buffer = this.noise; ns.loop = true;
    const nb = c.createBiquadFilter(); nb.type = 'bandpass'; nb.frequency.value = 2400; nb.Q.value = 1.4;
    const ng = c.createGain(); ng.gain.value = 0;
    ns.connect(nb).connect(ng).connect(g); ns.start();
    o1.connect(sh); o2.connect(m2).connect(sh); o3.connect(m3).connect(sh);
    sh.connect(lp).connect(body).connect(am).connect(g).connect(this.bus);
    o1.start(); o2.start(); o3.start();
    return { o1, o2, o3, lp, g, ng, nb, rough, vol };
  },
  setVol(v) { if (this.master) this.master.gain.value = v; },
  // frecuencia de encendido: transmisión directa, el embrague centrífugo patina bajo ~25 km/h
  rpmF(speed, throttle) { return Math.max(speed * 9.2, 38 + throttle * 42) + throttle * 6; },
  // motor del jugador según velocidad y acelerador; x = { rivalSpeed, tunnel, crowd }
  drive(speed, throttle, slip, rivalDist, on, x) {
    if (!this.ctx) return;
    x = x || {};
    const t = this.ctx.currentTime;
    const e = this.eng;
    const f = this.rpmF(speed, throttle);
    e.o1.frequency.setTargetAtTime(f, t, 0.04);
    e.o2.frequency.setTargetAtTime(f * 0.5, t, 0.04);
    e.o3.frequency.setTargetAtTime(f * 2.01, t, 0.04);
    e.rough.frequency.setTargetAtTime(f * 0.25 + 9, t, 0.1);
    e.lp.frequency.setTargetAtTime(420 + throttle * 1700 + speed * 28, t, 0.06);
    e.g.gain.setTargetAtTime(on ? (0.05 + throttle * 0.07) * e.vol : 0, t, 0.06);
    e.ng.gain.setTargetAtTime(on ? throttle * 0.05 : 0, t, 0.08);
    e.nb.frequency.setTargetAtTime(1500 + f * 6, t, 0.08);
    // petardeo al soltar el acelerador a buena velocidad
    if (on && this.lastThr > 0.6 && throttle < 0.2 && speed > 13) this.pops(2 + (Math.random() * 3 | 0));
    this.lastThr = throttle;
    this.squeal.g.gain.setTargetAtTime(on ? clamp((slip - 2) * 0.03, 0, 0.12) : 0, t, 0.05);
    const r = this.rivals, rf = this.rpmF(x.rivalSpeed || 18, 1);
    r.o1.frequency.setTargetAtTime(rf, t, 0.15); r.o2.frequency.setTargetAtTime(rf * 0.5, t, 0.15); r.o3.frequency.setTargetAtTime(rf * 2.01, t, 0.15);
    r.lp.frequency.setTargetAtTime(1300, t, 0.2);
    r.g.gain.setTargetAtTime(on ? clamp(0.06 - rivalDist * 0.0025, 0, 0.06) : 0, t, 0.15);
    r.ng.gain.setTargetAtTime(0, t, 0.2);
    this.verb.gain.setTargetAtTime(on && x.tunnel ? 0.75 : 0, t, 0.25);
    this.crowd.gain.setTargetAtTime(on ? (x.crowd || 0) * 0.09 : 0, t, 0.4);
  },
  pops(n) {
    const c = this.ctx, t0 = c.currentTime;
    for (let i = 0; i < n; i++) {
      const t = t0 + 0.04 + i * (0.05 + Math.random() * 0.07);
      const s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = 0.6 + Math.random() * 0.4;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500 + Math.random() * 500;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      s.connect(f).connect(g).connect(this.bus); s.start(t, Math.random()); s.stop(t + 0.1);
    }
  },
  silence() { this.drive(0, 0, 0, 999, false); if (window.speechSynthesis) speechSynthesis.cancel(); },
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
    s.connect(f).connect(g).connect(this.bus); s.start(t); s.stop(t + 0.3);
  },
  // Locutor: voz del navegador en español; si no hay voz, un "ding" de aviso
  say(text) {
    if (!save.opt.voice || !this.ctx || save.opt.vol <= 0) return;
    const now = performance.now();
    if (now - this.sayT < 1500) return;
    this.sayT = now;
    const ss = window.speechSynthesis;
    if (!ss || !window.SpeechSynthesisUtterance) { this.tone(1320, 0.15, 'sine', 0.08); this.tone(990, 0.25, 'sine', 0.08, 0.15); return; }
    const u = new SpeechSynthesisUtterance(text);
    const vs = ss.getVoices().filter(v => /^es/i.test(v.lang));
    u.voice = vs.find(v => /PE|419|MX|US|AR|CO/.test(v.lang)) || vs[0] || null;
    u.lang = u.voice ? u.voice.lang : 'es-PE';
    u.rate = 1.12; u.pitch = 1.05; u.volume = clamp(save.opt.vol * 1.2, 0, 1);
    ss.cancel(); ss.speak(u);
  },
  beep(n) { this.tone(n ? 520 : 1040, n ? 0.25 : 0.6, 'square', 0.12); },
  click() { this.tone(880, 0.06, 'triangle', 0.08); },
  coin() { this.tone(988, 0.08, 'square', 0.07); this.tone(1319, 0.2, 'square', 0.07, 0.08); },
  fanfare() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.12, i * 0.12)); },
};
