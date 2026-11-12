# Graba la narración (voz/*.wav) desde guion.json con Piper, sin conexión.
# Uso: python3 voz.py <carpeta con es_MX-claude-high.onnx y .onnx.json> [velocidad]
# Voz: https://huggingface.co/rhasspy/piper-voices (es_MX/claude/high, licencia apache-2.0). pip install piper-tts
import json, sys, wave, numpy as np, soundfile as sf
from piper import PiperVoice, SynthesisConfig
m = sys.argv[1] if len(sys.argv) > 1 else '.'
ls = float(sys.argv[2]) if len(sys.argv) > 2 else 0.86
v = PiperVoice.load(f'{m}/es_MX-claude-high.onnx')
g = json.load(open('guion.json'))
for s in g:
    tmp = f"voz/{s['id']}.tmp.wav"
    with wave.open(tmp, 'wb') as w:
        v.synthesize_wav(s['t'], w, syn_config=SynthesisConfig(length_scale=ls, noise_scale=0.6, noise_w_scale=0.7))
    a, sr = sf.read(tmp)
    i = np.where(np.abs(a) > 0.012)[0]
    a = a[max(0, i[0] - 300):i[-1] + 1500]
    sf.write(f"voz/{s['id']}.wav", a, sr)
    s['dur'] = round(len(a) / sr, 3)
import os; [os.remove(f"voz/{s['id']}.tmp.wav") for s in g]
json.dump(g, open('guion.json', 'w'), ensure_ascii=False, indent=1)
print('voz total', round(sum(s['dur'] for s in g), 2))
