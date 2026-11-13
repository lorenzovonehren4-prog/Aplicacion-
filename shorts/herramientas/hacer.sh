#!/bin/bash
# Hace de principio a fin los episodios de una ficha: datos → voz → fondos → sonido → vídeo.
# Uso (desde shorts/):  VOZ=<carpeta con es_MX-claude-high.onnx> bash herramientas/hacer.sh herramientas/fichas/<tanda>.py [velocidad]
# Variables: VOZ (obligatoria), GAP (pausa entre frases, .25), CACHE (carpeta de fondos pintados, /tmp/fondos-shorts)
set -e
cd "$(dirname "$0")/.."; export NODE_PATH=$(npm root -g) HF_HUB_DISABLE_XET=1
F=$1; VEL=${2:-0.86}; CACHE=${CACHE:-/tmp/fondos-shorts}; mkdir -p "$CACHE"
EPS=$(GAP=${GAP:-.25} python3 herramientas/gen.py "$F" | sed 's/.*fondos: //')
for d in $EPS; do
  NS=0.6 NW=0.7 python3 motor/voz.py $d "$VOZ" $VEL                      # narración (escribe dur en guion.json)
  python3 motor/fondos.py "$CACHE" $d/fondos_prompts.json                # fondos pintados (salta los que ya existen)
  python3 - "$d" "$CACHE" <<'PY'
import json,os,sys
from PIL import Image, ImageFilter
d,G=sys.argv[1],sys.argv[2]; os.makedirs(d+'/fondos',exist_ok=True)
for k in json.load(open(d+'/fondos_prompts.json')): Image.open(f'{G}/{k}.jpg').filter(ImageFilter.GaussianBlur(3.5)).save(f'{d}/fondos/{k}.jpg',quality=88)
PY
  python3 motor/ambientar.py $d                                          # ambiente por escena
  python3 motor/sonido.py $d; node motor/render.mjs $d --cortes; python3 motor/sonido.py $d   # audio, cortes de plano y audio definitivo
  node motor/render.mjs $d $d/$d.mp4                                     # vídeo final
done
python3 herramientas/planes.py "$F"
