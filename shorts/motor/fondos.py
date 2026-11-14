# Genera fondos pintados con SD-Turbo en CPU: python3 fondos.py <salida_dir> <json con {nombre: prompt}>
import sys, json, os, torch
from diffusers import AutoPipelineForText2Image
from PIL import Image, ImageFilter
out, specs = sys.argv[1], json.load(open(sys.argv[2]))
os.makedirs(out, exist_ok=True)
torch.set_num_threads(4)
pipe = AutoPipelineForText2Image.from_pretrained("stabilityai/sd-turbo", torch_dtype=torch.float32)
pipe.set_progress_bar_config(disable=True)
STEPS = int(os.environ.get("STEPS", 3)); W0, H0 = (576, 1024) if STEPS > 2 else (512, 896)
PRE = "2D painted cartoon background, no people, no text, "
ESTILO = ", detailed, cinematic depth, soft shading, clean outlines"
for name, prompt in specs.items():
    dst = f"{out}/{name}.jpg"
    if os.path.exists(dst): continue
    g = torch.Generator().manual_seed(abs(hash(name)) % 10000)
    im = pipe(PRE + prompt + ESTILO, num_inference_steps=STEPS, guidance_scale=0.0, width=W0, height=H0, generator=g).images[0]
    im = im.resize((1080, 1890), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1))
    im.save(dst, quality=92); print("ok", name, flush=True)
