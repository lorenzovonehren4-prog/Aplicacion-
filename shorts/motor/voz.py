# Graba la narración de un short: python3 motor/voz.py <carpeta> <carpeta del modelo Piper> [velocidad]
# Voz: es_MX-claude-high de https://huggingface.co/rhasspy/piper-voices (licencia apache-2.0). pip install piper-tts
import json, sys, wave, os, numpy as np, soundfile as sf
from piper import PiperVoice, SynthesisConfig
d, m = sys.argv[1], sys.argv[2]; ls = float(sys.argv[3]) if len(sys.argv) > 3 else 0.72
v = PiperVoice.load(f'{m}/es_MX-claude-high.onnx'); os.makedirs(f'{d}/voz', exist_ok=True)
g = json.load(open(f'{d}/guion.json'))
for s in g:
    tmp = f"{d}/voz/{s['id']}.tmp.wav"
    with wave.open(tmp, 'wb') as w: v.synthesize_wav(s['t'], w, syn_config=SynthesisConfig(length_scale=s.get('ls', ls), noise_scale=0.6, noise_w_scale=0.7))
    a, sr = sf.read(tmp); os.remove(tmp); i = np.where(np.abs(a) > 0.012)[0]; a = a[max(0, i[0] - 300):i[-1] + 1500]
    sf.write(f"{d}/voz/{s['id']}.wav", a, sr); s['dur'] = round(len(a) / sr, 3)
json.dump(g, open(f'{d}/guion.json', 'w'), ensure_ascii=False, indent=1)
print(d, 'voz', round(sum(s['dur'] for s in g), 2))
