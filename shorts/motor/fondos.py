# Genera fondos pintados con SD-Turbo en CPU: python3 fondos.py <salida_dir> <json con {nombre: prompt}>
import sys, json, os, torch
from diffusers import AutoPipelineForText2Image
from PIL import Image, ImageFilter
out, specs = sys.argv[1], json.load(open(sys.argv[2]))
os.makedirs(out, exist_ok=True)
torch.set_num_threads(4)
pipe = AutoPipelineForText2Image.from_pretrained("stabilityai/sd-turbo", torch_dtype=torch.float32)
pipe.set_progress_bar_config(disable=True)
ESTILO = ", 2D cartoon background art, painted animation background, flat colors with soft shading, thick clean outlines, detailed textures, warm cinematic lighting, no people, no text"
for name, prompt in specs.items():
    dst = f"{out}/{name}.jpg"
    if os.path.exists(dst): continue
    g = torch.Generator().manual_seed(abs(hash(name)) % 10000)
    im = pipe(prompt + ESTILO, num_inference_steps=2, guidance_scale=0.0, width=512, height=896, generator=g).images[0]
    im = im.resize((1080, 1890), Image.LANCZOS).filter(ImageFilter.GaussianBlur(2))
    im.save(dst, quality=92); print("ok", name, flush=True)
