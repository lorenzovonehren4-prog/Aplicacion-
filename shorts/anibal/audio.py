# Arma timeline.json y audio.wav: voz + música (tambores de guerra, cuerdas) + efectos + ambientes.
import json, numpy as np, soundfile as sf
from scipy import signal
SR = 44100
g = json.load(open('guion.json'))
# pausa DESPUÉS de cada frase (s): corta en general, más larga antes de revelaciones
GAP = {'g1': .25, 'g2a': .3, 'g2b': .35, 'c1': .1, 'c2': .15, 'r1': .1, 'r2a': .05, 'r2b': .2, 'a1': .1, 'a2': .15,
       'b1': .2, 'k1': .15, 'k2a': .35, 'k2b': .15, 'k3': .35, 'k4a': .3, 'k4b': .25, 'm1': .15, 'm2': .25, 'm3': .25,
       'e1': .1, 'e2': .2, 'z1': .3, 'f1': .3, 'f2': .6}
t = 0.05
for s in g:
    s['start'] = round(t, 3); t += s['dur'] + GAP[s['id']]
TOTAL = round(t, 3)
json.dump({'total': TOTAL, 'segs': g}, open('timeline.json', 'w'), ensure_ascii=False, indent=1)
T = {s['id']: s['start'] for s in g}; E = {s['id']: s['start'] + s['dur'] for s in g}
N = int(TOTAL * SR); tt = np.arange(N) / SR
rng = np.random.default_rng(11)
sos = lambda k, f: signal.butter(2, f, k, fs=SR, output='sos')
lp = lambda x, f: signal.sosfilt(sos('low', f), x)
hp = lambda x, f: signal.sosfilt(sos('high', f), x)
bp = lambda x, a, b: signal.sosfilt(sos('bandpass', [a, b]), x)
def put(buf, x, at, gn=1.0):
    i = int(at * SR)
    if i >= N or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    x = x[:N - i]; buf[i:i + len(x)] += x * gn
def ramp(a, b, n): return np.linspace(a, b, max(1, n))
# ---------------- instrumentos ----------------
def tom(f0=70, d=.7, nz=.3):
    n = int(d * SR); k = np.arange(n) / SR
    x = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 1.2 * np.exp(-k * 18))) / SR) * np.exp(-k / (d * .35))
    x += lp(rng.standard_normal(n), 900) * np.exp(-k / .04) * nz
    return np.tanh(x * 1.4) * .8
def boom(size=1.0):
    n = int(3 * SR); k = np.arange(n) / SR
    x = np.sin(2 * np.pi * np.cumsum(30 + 60 * np.exp(-k * 5)) / SR) * np.exp(-k / (.8 * size))
    x += lp(rng.standard_normal(n), 250) * np.exp(-k / .6) * 1.2
    return np.tanh(x * 1.2) * .8
def whoosh(d=.5):
    n = int(d * SR); x = rng.standard_normal(n); out = np.zeros(n)
    for j in range(8):
        a, b = int(j * n / 8), int((j + 1) * n / 8); fc = 300 + 2800 * ((j + .5) / 8) ** 2
        out[a:b] = bp(x, fc * .6, fc * 1.6)[a:b]
    return out * np.sin(np.pi * np.linspace(0, 1, n)) ** 2 * .55
def riser(d):
    n = int(d * SR); k = np.linspace(0, 1, n)
    x = np.sin(2 * np.pi * np.cumsum(110 * 2 ** (k * 2)) / SR) * .3 + bp(rng.standard_normal(n), 700, 5000) * .35
    return x * k ** 2.4 * .55
def clash():
    n = int(.9 * SR); k = np.arange(n) / SR; x = np.zeros(n)
    for f in [2100, 3170, 4420, 5830, 7100]:
        x += np.sin(2 * np.pi * f * (1 + rng.uniform(-.02, .02)) * k) * np.exp(-k / rng.uniform(.08, .25))
    x = x / 5 + hp(rng.standard_normal(n), 2500) * np.exp(-k / .02) * .8
    return x * .35
def trumpet(d=1.2):  # barrito de elefante
    n = int(d * SR); k = np.linspace(0, 1, n)
    f = 260 + 520 * np.sin(np.pi * np.minimum(k * 1.6, 1)) + 25 * np.sin(2 * np.pi * 7 * k * d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = signal.sawtooth(ph) * .6 + signal.square(ph * .5) * .2 + rng.standard_normal(n) * .15
    x = bp(x, 300, 3200) * np.minimum(1, k * 8) * np.minimum(1, (1 - k) * 4)
    return np.tanh(x * 2) * .3
def paper():
    n = int(.35 * SR); k = np.arange(n) / SR
    x = hp(rng.standard_normal(n), 2500) * (np.abs(np.sin(2 * np.pi * 23 * k)) ** 3) * np.exp(-k / .15)
    return x * .25
def wind(d):
    n = int(d * SR); x = lp(rng.standard_normal(n), 600)
    mod = lp(rng.standard_normal(n), 1.2); mod = .5 + mod / (np.abs(mod).max() + 1e-9) * .5
    return x * mod * .5 + bp(rng.standard_normal(n), 900, 2500) * mod ** 3 * .08
def fire(d, dens=.9993):
    n = int(d * SR); cr = (rng.random(n) > dens) * rng.uniform(.3, 1, n)
    return bp(signal.lfilter([1], [1, -.9], cr), 600, 6000) * .5 + lp(rng.standard_normal(n), 300) * .05
def crowd(d):
    n = int(d * SR); x = bp(rng.standard_normal(n), 250, 1800)
    m = lp(np.abs(rng.standard_normal(n)), 4); return x * m / (m.max() + 1e-9) * .5
def pad(d, notes, amp=.06):
    n = int(d * SR); k = np.arange(n) / SR; x = np.zeros(n)
    for f in notes:
        for det in (-.15, .15):
            x += signal.sawtooth(2 * np.pi * (f + det) * k + rng.uniform(0, 6))
    x = lp(x, 1400) * np.minimum(1, k / .6) * np.minimum(1, (d - k) / .6)
    return x / len(notes) * amp * 4
def ostinato(d, root, bpm, amp=.06):  # cuerdas en corcheas
    n = int(d * SR); out = np.zeros(n); step = 60 / bpm / 2; seq = [1, 1, 1.5, 1, 1.2, 1, 1.5, 1.335]; i = 0; at = 0
    while at < d - .05:
        m = int(step * .95 * SR); k = np.arange(m) / SR; f = root * seq[i % 8]
        x = signal.sawtooth(2 * np.pi * f * k) + .5 * signal.sawtooth(2 * np.pi * f * 2.003 * k)
        x = lp(x, 2200) * np.exp(-k / (step * .6)); put_ = int(at * SR); out[put_:put_ + m] += x[:n - put_]
        at += step; i += 1
    return out * amp
music = np.zeros(N); fx = np.zeros(N); amb = np.zeros(N); voice = np.zeros(N)
D = 73.42  # re
def drums(a, b, bpm, inten, pattern):
    step = 60 / bpm / 2; at = a; i = 0
    while at < b - .05:
        p = pattern[i % len(pattern)]
        if p == 'B': put(music, tom(55, .8), at, .55 * inten)
        elif p == 'b': put(music, tom(62, .5), at, .32 * inten)
        elif p == 't': put(music, tom(110, .25, .5), at, .22 * inten)
        at += step; i += 1
# 1) altar: latido + fuego
put(amb, fire(E['g1'] + .3), 0, .9)
put(music, pad(E['g2a'] + .2, [D / 2, D, D * 1.2]), 0, 1)
for k in range(5): put(music, tom(48, .6, .1), .3 + k * .85, .35)
put(fx, riser(1.0), T['g2a'] - .1, .8)
put(fx, boom(1.3), T['g2b'], 1.0); put(fx, whoosh(.45), T['g2b'] - .25)
# 2) mapa y marcha
put(fx, paper(), T['c1'] - .1, 1)
drums(T['c1'], T['a1'], 104, .8, ['B', '0', 't', '0', 'b', '0', 't', 't'])
put(music, ostinato(T['a1'] - T['c2'], D, 104), T['c2'], 1)
put(music, pad(T['a1'] - T['c1'], [D / 2, D * 1.5]), T['c1'], .7)
put(fx, whoosh(.4), T['r1'] - .2); put(fx, paper(), T['r1'], 1)
put(fx, whoosh(.5), T['r2a'] - .2)
put(fx, trumpet(1.3), T['r2b'] + .1, 1.1)
# 3) Alpes: viento, pasos, avalancha
put(amb, wind(T['b1'] - T['a1'] + .4), T['a1'] - .2, 1.2)
put(music, pad(T['b1'] - T['a1'], [D / 2, D * 1.2, D * 1.8], .07), T['a1'], 1)
drums(T['a1'], T['b1'], 80, .6, ['B', '0', '0', '0', 'b', '0', '0', '0'])
put(fx, boom(.9), T['a1'] + .7, .7); put(fx, lp(rng.standard_normal(int(1.6 * SR)), 300) * np.exp(-np.arange(int(1.6 * SR)) / SR / .7) * .6, T['a1'] + .7)
put(fx, trumpet(1.0), T['a2'] + .4, .6)
# 4) Trebia, Trasimeno
put(fx, whoosh(.4), T['b1'] - .2)
bl = g[[s['id'] for s in g].index('b1')]
put(fx, boom(.8), T['b1'] + bl['dur'] * .55, .8); put(fx, clash(), T['b1'] + bl['dur'] * .55)
put(fx, boom(.8), T['b1'] + bl['dur'] * .85, .8); put(fx, clash(), T['b1'] + bl['dur'] * .85)
# 5) Cannas: tambores que crecen, silencio, golpe
put(fx, boom(1.1), T['k1'] + 1.1, .8)
drums(T['k1'], T['k2b'], 112, .8, ['B', 't', 'b', 't', 'B', 't', 'b', 'b'])
put(music, ostinato(T['k2b'] - T['k1'], D * .75, 112, .05), T['k1'], 1)
put(music, pad(T['k4a'] - T['k1'], [D / 2, D * .75, D * 1.2], .06), T['k1'], 1)
drums(T['k3'], T['k4a'] - .35, 126, 1.0, ['B', 't', 'b', 't', 'B', 'b', 'B', 't'])
put(music, ostinato(T['k4a'] - .35 - T['k3'], D, 126, .07), T['k3'], 1)
put(amb, crowd(T['m1'] - T['k1']), T['k1'], .5)
for k in range(6): put(fx, clash(), T['k3'] + .4 + k * .55, .45)
put(fx, riser(1.4), T['k4a'] - 1.5, 1)
put(fx, boom(1.6), T['k4a'], 1.2); put(fx, clash(), T['k4a'], .8)
put(music, pad(T['m1'] - T['k4b'], [D / 2, D * 1.2, D * 1.5], .08), T['k4b'], 1)
for k in range(4): put(music, tom(50, .9, .1), T['k4b'] + k * .9, .4)
# 6) Maharbal: atardecer, calma tensa
put(fx, whoosh(.5), T['m1'] - .3)
put(music, pad(T['e1'] - T['m1'], [D * .75, D * 1.125, D * 1.5], .06), T['m1'], 1)
put(amb, wind(T['e1'] - T['m1']), T['m1'], .35)
put(fx, boom(.7), T['m3'], .5)
# 7) quince años y Escipión
drums(T['e1'], T['z1'], 100, .7, ['B', '0', 't', '0', 'b', 't', 't', '0'])
put(music, ostinato(T['z1'] - T['e1'], D * 1.125, 100, .05), T['e1'], 1)
put(fx, paper(), T['e1'], 1); put(fx, whoosh(.4), T['e2'] - .2)
# 8) Zama
put(fx, boom(1.2), T['z1'], 1); put(fx, clash(), T['z1'] + .1, .7)
zl = g[[s['id'] for s in g].index('z1')]
put(fx, boom(1.4), T['z1'] + zl['dur'] * .62, 1)
put(music, pad(T['f1'] - T['z1'] - zl['dur'] * .6, [D / 2, D * .6, D * .9], .08), T['z1'] + zl['dur'] * .6, 1)
# 9) final: lámpara, y el fuego del altar de vuelta
put(amb, fire(TOTAL - T['f1'], .9996), T['f1'], .7)
put(music, pad(TOTAL - T['f1'] + .2, [D / 2, D, D * 1.2], .07), T['f1'], 1)
put(fx, boom(.6), T['f1'] + 3.3, .5)
put(fx, whoosh(.5), T['f2'] - .25); put(amb, fire(TOTAL - T['f2']), T['f2'], 1)
put(fx, boom(1.5), E['f2'] + .1, .9)
# voz
for s in g:
    v, sr = sf.read(f"voz/{s['id']}.wav"); v = signal.resample_poly(v, SR, sr); put(voice, v, s['start'])
voice = hp(voice, 80)
lvl = np.sqrt(np.maximum(lp(voice ** 2, 8), 0) + 1e-8)
voice = voice * lp(np.minimum(2.5, (0.1 / np.maximum(lvl, .02)) ** .5), 12)
voice = voice / np.abs(voice).max() * .9
env = lp(np.abs(voice), 5); duck = 1 - .62 * np.clip(env / (env.max() + 1e-9) * 4, 0, 1)
bed = (music * .95 + amb * .45) * duck + fx * .6 * (1 - .35 * (1 - duck))
mix = voice + bed
d = int(.012 * SR); wide = np.concatenate([np.zeros(d), (amb * .2 * duck + fx * .12)[:-d]])
out = np.stack([mix + wide, mix - wide], 1)
f = int(.4 * SR); out[-f:] *= np.linspace(1, 0, f)[:, None]
pk = np.abs(out).max(); out = out / pk * .95 if pk > .95 else out
sf.write('audio.wav', out, SR); print('total', TOTAL)
