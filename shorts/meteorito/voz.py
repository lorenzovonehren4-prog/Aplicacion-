# Genera la narración (voz/*.wav) a partir de guion.json con Kokoro, sin conexión.
# Necesita: pip install kokoro-onnx soundfile, y los modelos kokoro-v1.0.onnx y voices-v1.0.bin
# (github.com/thewh1teagle/kokoro-onnx, "model-files-v1.0") en la carpeta que se pase como argumento.
import json, sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
m = sys.argv[1] if len(sys.argv) > 1 else '.'
k = Kokoro(f'{m}/kokoro-v1.0.onnx', f'{m}/voices-v1.0.bin')
g = json.load(open('guion.json'))
for s in g:
    a, sr = k.create(s['t'], voice='em_alex', speed=1.2, lang='es')
    i = np.where(np.abs(a) > 0.01)[0]
    a = a[max(0, i[0] - 600):i[-1] + 1800]          # recorta el silencio
    sf.write(f"voz/{s['id']}.wav", a, sr)
    s['dur'] = round(len(a) / sr, 3)
json.dump(g, open('guion.json', 'w'), ensure_ascii=False, indent=1)
