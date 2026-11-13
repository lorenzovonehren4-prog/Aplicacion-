# Banda sonora de un short: python3 motor/sonido.py <carpeta>
# Lee guion.json (frases con "gap" opcional) y pista.json ({"plan":[[desde,hasta,tipo,{...}]], "cues":[[cuando,efecto,ganancia,{...}]]}).
# Tiempos: número, "T:id" (inicio de frase), "E:id" (fin), "F:id:0.5" (fracción de la frase), con "+0.3"/"-0.2" opcional.
# Escribe timeline.json y audio.wav. Todo sintetizado aquí (sin muestras de terceros).
import json, sys, re, numpy as np, soundfile as sf
from scipy import signal
d = sys.argv[1]; SR = 44100
g = json.load(open(f'{d}/guion.json')); P = json.loads(re.sub(r'(?<=[\[:,\s-])\.(\d)', r'0.\1', open(f'{d}/pista.json').read()))
t = P.get('start', .05)
for s in g:
    s['start'] = round(t, 3); t += s['dur'] + s.get('gap', P.get('gap', .15))
TOTAL = round(t + P.get('tail', .3), 3)
json.dump({'total': TOTAL, 'segs': g}, open(f'{d}/timeline.json', 'w'), ensure_ascii=False, indent=1)
SEG = {s['id']: s for s in g}
def tm(x):
    if isinstance(x, (int, float)): return float(x)
    if x == 'END': return TOTAL
    m = re.match(r'^([TEF]):([\w]+)(?::([\d.]+))?([+-][\d.]+)?$', x)
    k, i, fr, off = m.groups(); s = SEG[i]
    v = s['start'] if k == 'T' else s['start'] + s['dur'] if k == 'E' else s['start'] + s['dur'] * float(fr)
    return v + (float(off) if off else 0)
N = int(TOTAL * SR); rng = np.random.default_rng(7)
sos = lambda k, f: signal.butter(2, f, k, fs=SR, output='sos')
lp = lambda x, f: signal.sosfilt(sos('low', f), x); hp = lambda x, f: signal.sosfilt(sos('high', f), x)
bp = lambda x, a, b: signal.sosfilt(sos('bandpass', [a, b]), x)
def put(buf, x, at, gn=1.0):
    i = int(at * SR)
    if i >= N or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    x = x[:N - i]; buf[i:i + len(x)] += x * gn
def env(n, a=.4, r=.6):
    k = np.arange(n) / SR; d_ = n / SR; return np.minimum(1, k / max(a, 1e-3)) * np.minimum(1, (d_ - k) / max(r, 1e-3)).clip(0)
# ---------- efectos ----------
def tom(f0=70, dd=.7, nz=.3):
    n = int(dd * SR); k = np.arange(n) / SR
    x = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 1.2 * np.exp(-k * 18))) / SR) * np.exp(-k / (dd * .35)); x += lp(rng.standard_normal(n), 900) * np.exp(-k / .04) * nz
    return np.tanh(x * 1.4) * .8
def boom(size=1.0):
    n = int(3 * SR); k = np.arange(n) / SR
    x = np.sin(2 * np.pi * np.cumsum(30 + 60 * np.exp(-k * 5)) / SR) * np.exp(-k / (.8 * size)); x += lp(rng.standard_normal(n), 250) * np.exp(-k / .6) * 1.2
    return np.tanh(x * 1.2) * .8
def whoosh(dd=.5):
    n = int(dd * SR); x = rng.standard_normal(n); out = np.zeros(n)
    for j in range(8):
        a, b = int(j * n / 8), int((j + 1) * n / 8); fc = 300 + 2800 * ((j + .5) / 8) ** 2; out[a:b] = bp(x, fc * .6, fc * 1.6)[a:b]
    return out * np.sin(np.pi * np.linspace(0, 1, n)) ** 2 * .55
def riser(dd=1.2):
    n = int(dd * SR); k = np.linspace(0, 1, n)
    return (np.sin(2 * np.pi * np.cumsum(110 * 2 ** (k * 2)) / SR) * .3 + bp(rng.standard_normal(n), 700, 5000) * .35) * k ** 2.4 * .55
def clash():
    n = int(.9 * SR); k = np.arange(n) / SR; x = np.zeros(n)
    for f in [2100, 3170, 4420, 5830, 7100]: x += np.sin(2 * np.pi * f * (1 + rng.uniform(-.02, .02)) * k) * np.exp(-k / rng.uniform(.08, .25))
    return (x / 5 + hp(rng.standard_normal(n), 2500) * np.exp(-k / .02) * .8) * .35
def trumpet(dd=1.2):
    n = int(dd * SR); k = np.linspace(0, 1, n); f = 260 + 520 * np.sin(np.pi * np.minimum(k * 1.6, 1)) + 25 * np.sin(2 * np.pi * 7 * k * dd)
    ph = 2 * np.pi * np.cumsum(f) / SR; x = signal.sawtooth(ph) * .6 + signal.square(ph * .5) * .2 + rng.standard_normal(n) * .15
    return np.tanh(bp(x, 300, 3200) * np.minimum(1, k * 8) * np.minimum(1, (1 - k) * 4) * 2) * .3
def paper():
    n = int(.35 * SR); k = np.arange(n) / SR; return hp(rng.standard_normal(n), 2500) * (np.abs(np.sin(2 * np.pi * 23 * k)) ** 3) * np.exp(-k / .15) * .25
def gunshot():
    n = int(.6 * SR); k = np.arange(n) / SR; return np.tanh((hp(rng.standard_normal(n), 400) * np.exp(-k / .03) + np.sin(2 * np.pi * 90 * k) * np.exp(-k / .1)) * 2) * .5
def cannon():
    n = int(2.2 * SR); k = np.arange(n) / SR; x = boom(.7)[:n] * .9 + hp(rng.standard_normal(n), 300) * np.exp(-k / .05) * .6; return np.tanh(x * 1.3) * .8
def jet(dd=2.5):
    n = int(dd * SR); k = np.linspace(0, 1, n); x = bp(rng.standard_normal(n), 300, 4000) * np.exp(-((k - .55) ** 2) / .05); return x * .5
def rocket(dd=1.6):
    n = int(dd * SR); k = np.linspace(0, 1, n); x = bp(rng.standard_normal(n), 200, 2500) * (k ** .5) * np.exp(-((k - .7) ** 2) / .1); return x * .6
def beep(f=880, dd=.12):
    n = int(dd * SR); k = np.arange(n) / SR; return np.sin(2 * np.pi * f * k) * np.minimum(1, (dd - k) / .02) * .15
def bell(f=220):
    n = int(3 * SR); k = np.arange(n) / SR; x = sum(np.sin(2 * np.pi * f * m * k) * np.exp(-k / (1.6 / m)) * a for m, a in [(1, 1), (2.76, .5), (5.4, .25), (8.9, .12)]); return x * .25
def heartbeat():
    n = int(.8 * SR); x = np.zeros(n); x[:int(.25 * SR)] += tom(45, .25, 0)[:int(.25 * SR)]; x[int(.22 * SR):int(.22 * SR) + int(.25 * SR)] += tom(42, .25, 0)[:int(.25 * SR)] * .7; return x * .6
def knock():  # golpe seco en una puerta de madera
    n = int(.5 * SR); k = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * k) * np.exp(-k / dc) * g for f, dc, g in [(92, .09, 1), (185, .05, .6), (310, .03, .35), (540, .018, .2)])
    x += bp(rng.standard_normal(n), 300, 2400) * np.exp(-k / .012) * .9; return np.tanh(x * 1.6) * .9
def thunder(dd=4.5):
    n = int(dd * SR); k = np.arange(n) / SR; m = lp(np.abs(rng.standard_normal(n)), 3); m = m / (m.max() + 1e-9)
    x = lp(rng.standard_normal(n), 160) * 2.2 * (np.exp(-k / (dd * .3)) * (.5 + m)) + bp(rng.standard_normal(n), 400, 2500) * np.exp(-k / .08) * .5
    return np.tanh(x * 1.5) * .7
def vibra():  # celular vibrando sobre algo duro
    n = int(.42 * SR); k = np.arange(n) / SR; x = signal.square(2 * np.pi * 172 * k) * .5 + np.sin(2 * np.pi * 86 * k)
    return lp(x, 900) * (np.abs(np.sin(2 * np.pi * 31 * k)) * .4 + .6) * env(n, .02, .05) * .3
def pica():  # picaporte que alguien prueba
    n = int(.45 * SR); k = np.arange(n) / SR; x = np.zeros(n)
    for at, g in [(0, 1), (.09, .6), (.2, .9), (.3, .5)]:
        q = int(at * SR); m = n - q; kk = np.arange(m) / SR
        x[q:] += (sum(np.sin(2 * np.pi * f * kk) * np.exp(-kk / .02) for f in (1900, 2750, 4100)) / 3 + hp(rng.standard_normal(m), 3000) * np.exp(-kk / .006)) * g
    return x * .3
def sting():  # golpe disonante de tensión
    n = int(3.5 * SR); k = np.arange(n) / SR; x = sum(signal.sawtooth(2 * np.pi * f * k + rng.uniform(0, 6)) for f in (55, 58.3, 82.4, 116.5, 233, 247))
    return (lp(x, 1800) / 6 * np.exp(-k / 1.1) + np.pad(boom(1.2), (0, n))[:n] * .9) * .7
def breath():
    n = int(1.3 * SR); k = np.linspace(0, 1, n); return bp(rng.standard_normal(n), 500, 2600) * np.sin(np.pi * k) ** 2 * .22
def creak():  # crujido de madera
    n = int(.9 * SR); k = np.linspace(0, 1, n); f = 180 + 140 * k + 30 * np.sin(2 * np.pi * 9 * k)
    return bp(signal.sawtooth(2 * np.pi * np.cumsum(f) / SR) * (np.abs(np.sin(2 * np.pi * 37 * k)) ** 4), 400, 3000) * np.sin(np.pi * k) * .25
SFX = dict(boom=lambda o: boom(o.get('size', 1)), whoosh=lambda o: whoosh(o.get('d', .5)), riser=lambda o: riser(o.get('d', 1.2)), clash=lambda o: clash(), trumpet=lambda o: trumpet(o.get('d', 1.2)),
           paper=lambda o: paper(), gunshot=lambda o: gunshot(), cannon=lambda o: cannon(), jet=lambda o: jet(o.get('d', 2.5)), rocket=lambda o: rocket(o.get('d', 1.6)),
           beep=lambda o: beep(o.get('f', 880)), bell=lambda o: bell(o.get('f', 220)), heartbeat=lambda o: heartbeat(), knock=lambda o: knock(), thunder=lambda o: thunder(o.get('d', 4.5)), vibra=lambda o: vibra(), pica=lambda o: pica(), sting=lambda o: sting(), breath=lambda o: breath(), creak=lambda o: creak(), tom=lambda o: tom(o.get('f', 60), o.get('d', .7)))
# ---------- capas ----------
def pad(dd, notes, amp=.06):
    n = int(dd * SR); k = np.arange(n) / SR; x = np.zeros(n)
    for f in notes:
        for det in (-.15, .15): x += signal.sawtooth(2 * np.pi * (f + det) * k + rng.uniform(0, 6))
    return lp(x, 1400) * env(n, .6, .6) / len(notes) * amp * 4
def ostinato(dd, root, bpm, amp=.06, seq=(1, 1, 1.5, 1, 1.2, 1, 1.5, 1.335)):
    n = int(dd * SR); out = np.zeros(n); step = 60 / bpm / 2; i = 0; at = 0
    while at < dd - .05:
        m = int(step * .95 * SR); k = np.arange(m) / SR; f = root * seq[i % len(seq)]
        x = lp(signal.sawtooth(2 * np.pi * f * k) + .5 * signal.sawtooth(2 * np.pi * f * 2.003 * k), 2200) * np.exp(-k / (step * .6)); p = int(at * SR); out[p:p + m] += x[:n - p]; at += step; i += 1
    return out * amp
def drums(dd, bpm, pattern):
    n = int(dd * SR); out = np.zeros(n); step = 60 / bpm / 2; at = 0; i = 0
    while at < dd - .05:
        p = pattern[i % len(pattern)]; x = None
        if p == 'B': x = tom(55, .8) * .55
        elif p == 'b': x = tom(62, .5) * .32
        elif p == 't': x = tom(110, .25, .5) * .22
        elif p == 's': x = (hp(rng.standard_normal(int(.18 * SR)), 1500) * np.exp(-np.arange(int(.18 * SR)) / SR / .04)) * .25
        if x is not None: q = int(at * SR); out[q:q + len(x)] += x[:n - q]
        at += step; i += 1
    return out
def noise_bed(dd, kind):
    n = int(dd * SR); k = np.arange(n) / SR
    if kind == 'wind':
        x = lp(rng.standard_normal(n), 600); m = lp(rng.standard_normal(n), 1.2); m = .5 + m / (np.abs(m).max() + 1e-9) * .5; return x * m * .5 + bp(rng.standard_normal(n), 900, 2500) * m ** 3 * .08
    if kind == 'fire':
        cr = (rng.random(n) > .9993) * rng.uniform(.3, 1, n); return bp(signal.lfilter([1], [1, -.9], cr), 600, 6000) * .5 + lp(rng.standard_normal(n), 300) * .05
    if kind == 'crowd':
        x = bp(rng.standard_normal(n), 250, 1800); m = lp(np.abs(rng.standard_normal(n)), 4); return x * m / (m.max() + 1e-9) * .5
    if kind == 'sea':
        m = .55 + .45 * np.sin(2 * np.pi * k / 4.5) ** 2; return lp(rng.standard_normal(n), 900) * m * .4
    if kind == 'rain':
        return hp(rng.standard_normal(n), 2000) * .12 + lp(rng.standard_normal(n), 400) * .08
    if kind == 'storm':  # lluvia con gotas sueltas, canalón y rachas de viento
        m = lp(rng.standard_normal(n), .5); m = .75 + .25 * m / (np.abs(m).max() + 1e-9)
        x = hp(rng.standard_normal(n), 2500) * .1 * m + bp(rng.standard_normal(n), 500, 1600) * .05 + lp(rng.standard_normal(n), 220) * .12
        dr = (rng.random(n) > .9985) * rng.uniform(.2, 1, n); x += bp(signal.lfilter([1], [1, -.97], dr), 900, 5000) * .35
        w = lp(rng.standard_normal(n), 1.0); w = (.5 + .5 * w / (np.abs(w).max() + 1e-9)) ** 2; x += bp(rng.standard_normal(n), 250, 700) * w * .12
        return x
    if kind == 'drone':  # tensión: grave desafinado, filtro que respira y un agudo inquietante que crece
        cr = np.linspace(0, 1, n) ** 1.5; x = np.zeros(n)
        for f in (36.7, 36.9, 55.2, 73.1, 77.6): x += signal.sawtooth(2 * np.pi * f * k + rng.uniform(0, 6))
        lo = lp(x, 180) * .25 + lp(x, 600) * (.5 + .5 * np.sin(2 * np.pi * k / 9)) * .08
        hi = sum(np.sin(2 * np.pi * f * k * (1 + .004 * np.sin(2 * np.pi * (.3 + j * .11) * k))) for j, f in enumerate((1244, 1318, 1865))) * .012
        sub = np.sin(2 * np.pi * 41 * k) * (np.sin(2 * np.pi * k / 2.4) ** 8) * .25
        return (lo + sub) * (.45 + .55 * cr) + hi * (.2 + .8 * cr)
    if kind == 'tictac':
        out = np.zeros(n); at = 0; j = 0
        while at < dd - .1:
            m = int(.03 * SR); kk = np.arange(m) / SR; b = np.sin(2 * np.pi * (2100 if j % 2 else 1700) * kk) * np.exp(-kk / .004) * .5; q = int(at * SR); out[q:q + m] += b[:n - q]; at += .5; j += 1
        return out
    if kind == 'city':
        return lp(rng.standard_normal(n), 200) * .25 + bp(rng.standard_normal(n), 300, 900) * lp(np.abs(rng.standard_normal(n)), 2) * .4
    if kind == 'siren':
        f = 520 + 280 * (0.5 - 0.5 * np.cos(2 * np.pi * k / 6)); x = np.sin(2 * np.pi * np.cumsum(f) / SR) + .3 * np.sin(4 * np.pi * np.cumsum(f) / SR); return lp(x, 2000) * .08
    if kind == 'march':
        out = np.zeros(n); step = .5; at = 0
        while at < dd - .1:
            m = int(.12 * SR); x = lp(rng.standard_normal(m), 500) * np.exp(-np.arange(m) / SR / .03) * .5; q = int(at * SR); out[q:q + m] += x[:n - q]; at += step
        return out
    if kind == 'heart':
        out = np.zeros(n); at = 0
        while at < dd - .8: h = heartbeat(); q = int(at * SR); out[q:q + len(h)] += h[:n - q]; at += .9
        return out
    if kind == 'clock':
        out = np.zeros(n); at = 0
        while at < dd - .1: b = beep(1800, .03) * 2; q = int(at * SR); out[q:q + len(b)] += b[:n - q]; at += .5
        return out
    return np.zeros(n)
music = np.zeros(N); fx = np.zeros(N); amb = np.zeros(N); voice = np.zeros(N)
NOTE = {'re': 73.42, 'mi': 82.41, 'fa': 87.31, 'sol': 98.0, 'la': 110.0, 'do': 65.41}
for a, b, kind, o in P.get('plan', []):
    t0, t1 = tm(a), tm(b); dd = t1 - t0
    if dd <= 0: continue
    root = NOTE.get(o.get('key', 're'), 73.42); gn = o.get('gain', 1)
    if kind == 'pad': put(music, pad(dd + .4, [root * r for r in o.get('chord', [.5, 1, 1.2])], o.get('amp', .06)), t0, gn)
    elif kind == 'ostinato': put(music, ostinato(dd, root * o.get('oct', 1), o.get('bpm', 104), o.get('amp', .06)), t0, gn)
    elif kind == 'drums': put(music, drums(dd, o.get('bpm', 104), o.get('pat', 'B0t0b0tt')), t0, o.get('inten', .8) * gn)
    else: put(amb, noise_bed(dd + .3, kind), t0, gn)
for cue in P.get('cues', []):
    at, name, gn = tm(cue[0]), cue[1], (cue[2] if len(cue) > 2 else 1); o = cue[3] if len(cue) > 3 else {}
    put(fx, SFX[name](o), at, gn)
import os
if os.path.exists(f'{d}/cortes.json') and P.get('cortes', True):
    for ct in json.load(open(f'{d}/cortes.json')): put(fx, whoosh(.32), ct - .2, .45); put(fx, tom(48, .35, .2), ct, .35)
for s in g:
    v, sr = sf.read(f"{d}/voz/{s['id']}.wav"); v = signal.resample_poly(v, SR, sr); put(voice, v, s['start'])
if P.get('reverb'):  # sala: cola corta sobre efectos y ambiente
    rv = int(1.1 * SR); ir = rng.standard_normal(rv) * np.exp(-np.arange(rv) / SR / .28); ir = lp(ir, 3500); ir /= np.abs(ir).sum() ** .5 * 6
    fx = fx + signal.fftconvolve(fx, ir)[:N] * P['reverb']; amb = amb + signal.fftconvolve(amb, ir)[:N] * P['reverb'] * .4
voice = hp(voice, 80); lvl = np.sqrt(np.maximum(lp(voice ** 2, 8), 0) + 1e-8)
voice = voice * lp(np.minimum(2.5, (0.1 / np.maximum(lvl, .02)) ** .5), 12); voice = voice / np.abs(voice).max() * .9
voice = voice + .35 * bp(voice, 2200, 5000)  # presencia: consonantes más claras
voice = voice / np.abs(voice).max() * .9
DK, BED = P.get('duck', .62), P.get('bed', .95)
e = lp(np.abs(voice), 5); duck = 1 - DK * np.clip(e / (e.max() + 1e-9) * 4, 0, 1)
mix = voice + (music * BED + amb * .45 * BED) * duck + fx * .6 * (1 - .45 * (1 - duck))
dl = int(.012 * SR); wide = np.concatenate([np.zeros(dl), (amb * .2 * duck + fx * .12)[:-dl]])
out = np.stack([mix + wide, mix - wide], 1); f = int(.4 * SR); out[-f:] *= np.linspace(1, 0, f)[:, None]
pk = np.abs(out).max(); out = out / pk * .95 if pk > .95 else out
sf.write(f'{d}/audio.wav', out, SR); print(d, 'total', TOTAL)
