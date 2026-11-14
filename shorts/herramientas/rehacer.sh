#!/bin/bash
# Vuelve a pintar los fondos (modelo actual) y renderiza de nuevo las carpetas indicadas, sin regrabar voces.
# Uso (desde shorts/): CACHE=<carpeta de fondos> bash herramientas/rehacer.sh <carpeta> [...]
cd "$(dirname "$0")/.."; export NODE_PATH=$(npm root -g) HF_HUB_DISABLE_XET=1; CACHE=${CACHE:-/tmp/fondos-xl}; mkdir -p "$CACHE"
python3 - "$CACHE/_rehacer.json" "$@" <<'PY'
import json,sys; a={}
import os
for d in sys.argv[2:]:
    if os.path.exists(d+'/fondos_prompts.json'): a.update(json.load(open(d+'/fondos_prompts.json')))
json.dump(a,open(sys.argv[1],'w'))
PY
python3 motor/fondos.py "$CACHE" "$CACHE/_rehacer.json"
for d in "$@"; do python3 - $d "$CACHE" <<'PY'
import json,os,sys
from PIL import Image, ImageFilter
d,G=sys.argv[1],sys.argv[2]; os.makedirs(d+'/fondos',exist_ok=True)
if not os.path.exists(d+'/fondos_prompts.json'): sys.exit()
for k in json.load(open(d+'/fondos_prompts.json')):
    if os.path.exists(f'{G}/{k}.jpg'): Image.open(f'{G}/{k}.jpg').filter(ImageFilter.GaussianBlur(1.2)).save(f'{d}/fondos/{k}.jpg',quality=90)
PY
done
set -- "$@"; a="";b="";c="";i=0; for d in "$@"; do case $((i%3)) in 0) a="$a $d";; 1) b="$b $d";; 2) c="$c $d";; esac; i=$((i+1)); done
r(){ for d in "$@"; do python3 motor/sonido.py $d >/dev/null 2>&1; node motor/render.mjs $d --cortes >/dev/null 2>&1; python3 motor/sonido.py $d >/dev/null 2>&1; node motor/render.mjs $d $d/$d.mp4 >/dev/null 2>&1 && echo "ok $d" || echo "MAL $d"; done; }
r $a & r $b & r $c & wait; echo FIN
