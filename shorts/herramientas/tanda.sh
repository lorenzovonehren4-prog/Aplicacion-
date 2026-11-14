#!/bin/bash
# Hace una tanda completa de una ficha: datos → voces (Alex/Álvaro alternadas) → todos los fondos de una vez → ambiente → audio y vídeo en 3 procesos.
# Uso (desde shorts/): bash herramientas/tanda.sh herramientas/fichas/<tanda>.py
# Variables: CACHE (fondos pintados), VOZ_FIJA (una sola voz para toda la tanda), RATE (velocidad, +10%)
cd "$(dirname "$0")/.."; export NODE_PATH=$(npm root -g) HF_HUB_DISABLE_XET=1 SSL_CERT_FILE=${SSL_CERT_FILE:-/root/.ccr/ca-bundle.crt}
F=$1; CACHE=${CACHE:-/tmp/fondos-shorts}; mkdir -p "$CACHE"
EPS=$(GAP=${GAP:-.25} python3 herramientas/gen.py "$F" | sed 's/.*fondos: //')
i=0; for d in $EPS; do v=es-PE-AlexNeural; [ $((i%2)) = 1 ] && v=es-ES-AlvaroNeural
  for k in 1 2 3; do VOZ_EDGE=${VOZ_FIJA:-$v} RATE=${RATE:-+10%} python3 motor/voz.py $d x && break || sleep 5; done; i=$((i+1)); done
python3 - "$CACHE/_tanda.json" $EPS <<'PY'
import json,sys; a={}
for d in sys.argv[2:]: a.update(json.load(open(d+'/fondos_prompts.json')))
json.dump(a,open(sys.argv[1],'w'))
PY
python3 motor/fondos.py "$CACHE" "$CACHE/_tanda.json"
for d in $EPS; do python3 - $d "$CACHE" <<'PY'
import json,os,sys
from PIL import Image, ImageFilter
d,G=sys.argv[1],sys.argv[2]; os.makedirs(d+'/fondos',exist_ok=True)
for k in json.load(open(d+'/fondos_prompts.json')): Image.open(f'{G}/{k}.jpg').filter(ImageFilter.GaussianBlur(1.5)).save(f'{d}/fondos/{k}.jpg',quality=90)
PY
  python3 motor/ambientar.py $d >/dev/null; done
set -- $EPS; a="";b="";c="";i=0; for d in "$@"; do case $((i%3)) in 0) a="$a $d";; 1) b="$b $d";; 2) c="$c $d";; esac; i=$((i+1)); done
r(){ for d in "$@"; do python3 motor/sonido.py $d >/dev/null 2>&1; node motor/render.mjs $d --cortes >/dev/null 2>&1; python3 motor/sonido.py $d >/dev/null 2>&1; node motor/render.mjs $d $d/$d.mp4 >/dev/null 2>&1 && echo "ok $d" || echo "MAL $d"; done; }
r $a & r $b & r $c & wait
python3 herramientas/planes.py "$F"; echo FIN
