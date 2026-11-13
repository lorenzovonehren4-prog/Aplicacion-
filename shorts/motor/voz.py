# Graba la narración de un short: python3 motor/voz.py <carpeta> <carpeta del modelo Piper> [velocidad]
# Con VOZ_EDGE=<voz> usa las voces neuronales de Microsoft Edge en vez de Piper.
# Voz: es_MX-claude-high de https://huggingface.co/rhasspy/piper-voices (licencia apache-2.0). pip install piper-tts
import json, sys, wave, os, numpy as np, soundfile as sf
from piper import PiperVoice, SynthesisConfig
d, m = sys.argv[1], sys.argv[2]; ls = float(sys.argv[3]) if len(sys.argv) > 3 else 0.72
EDGE = os.environ.get('VOZ_EDGE')  # p. ej. es-MX-JorgeNeural: voz neuronal de Microsoft (pip install edge-tts); RATE=+10% ajusta la velocidad
v = None if EDGE else PiperVoice.load(f'{m}/es_MX-claude-high.onnx'); os.makedirs(f'{d}/voz', exist_ok=True)
def edge(txt, dst):
    import asyncio, subprocess, edge_tts
    for k in range(4):
        try:
            asyncio.run(edge_tts.Communicate(txt, EDGE, rate=os.environ.get('RATE', '+10%'), proxy=os.environ.get('HTTPS_PROXY')).save(dst + '.mp3')); break
        except Exception as e:
            if k == 3: raise
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', dst + '.mp3', '-ac', '1', '-ar', '24000', dst], check=True); os.remove(dst + '.mp3')
g = json.load(open(f'{d}/guion.json'))
for s in g:
    tmp = f"{d}/voz/{s['id']}.tmp.wav"
    if EDGE: edge(s['t'], tmp)
    else:
      with wave.open(tmp, 'wb') as w: v.synthesize_wav(s['t'], w, syn_config=SynthesisConfig(length_scale=s.get('ls', ls), noise_scale=float(os.environ.get('NS', 0.6)), noise_w_scale=float(os.environ.get('NW', 0.7))))
    a, sr = sf.read(tmp); os.remove(tmp); i = np.where(np.abs(a) > 0.012)[0]; a = a[max(0, i[0] - 300):i[-1] + 1500]
    if s.get('fx') == 'puerta':  # voz al otro lado de una puerta: más grave y apagada
        from scipy import signal
        a = signal.resample(a, int(len(a) * 1.1)); a = signal.sosfilt(signal.butter(2, 1700, 'low', fs=sr, output='sos'), a) * 1.6
    if s.get('fx') == 'susurro':  # susurro: se conserva la envolvente espectral y se cambia la fase por ruido
        from scipy import signal
        a = signal.resample(a, int(len(a) * 1.12)); f, tt, Z = signal.stft(a, sr, nperseg=512); Z = np.abs(Z) * np.exp(2j * np.pi * np.random.default_rng(3).random(Z.shape)); _, w = signal.istft(Z, sr, nperseg=512)
        w = signal.sosfilt(signal.butter(2, 500, 'high', fs=sr, output='sos'), w); a = w[:len(a)] * 1.4 + a[:len(w)][:len(a)] * .12
    sf.write(f"{d}/voz/{s['id']}.wav", a, sr); s['dur'] = round(len(a) / sr, 3)
json.dump(g, open(f'{d}/guion.json', 'w'), ensure_ascii=False, indent=1)
print(d, 'voz', round(sum(s['dur'] for s in g), 2))
