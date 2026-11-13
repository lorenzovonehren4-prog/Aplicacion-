#!/bin/bash
# Vuelve a grabar la voz de los vídeos indicados con una voz neuronal de Microsoft y los renderiza de nuevo.
# Uso (desde shorts/): VOZ_EDGE=es-MX-JorgeNeural RATE=+10% bash herramientas/revoz.sh <carpeta> [...]
cd "$(dirname "$0")/.."; export NODE_PATH=$(npm root -g) SSL_CERT_FILE=${SSL_CERT_FILE:-/root/.ccr/ca-bundle.crt} VOZ_EDGE=${VOZ_EDGE:-es-MX-JorgeNeural}
for d in "$@"; do
  python3 motor/voz.py $d x >/dev/null 2>&1 || { echo "VOZ FALLÓ $d"; continue; }
  python3 motor/sonido.py $d >/dev/null 2>&1; node motor/render.mjs $d --cortes >/dev/null 2>&1; python3 motor/sonido.py $d >/dev/null 2>&1
  node motor/render.mjs $d $d/$d.mp4 >/dev/null 2>&1 && echo "ok $d"
done
