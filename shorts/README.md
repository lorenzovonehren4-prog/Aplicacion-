# Shorts del canal

Vídeos verticales (1080×1920) de historia, política y geopolítica. El brief del dueño está en `SISTEMA.md` y manda sobre todo lo demás.

## Estructura
- `motor/`: lo común a todos los vídeos.
  - `motor.js`: personajes con ficha, soldados por época (`SOLDADO`), escenas genéricas (`march`, `charge`, `talk`, `city`), mapas con fronteras reales (`setMap`, `mapDraw`, `mapArrow`, `mapLabel`), vehículos, efectos, cámara con paralaje, subtítulos y rótulos (`MOTOR.run`).
  - `mundo.js`: fronteras de Natural Earth 1:110m (dominio público).
  - `voz.py`, `sonido.py`, `render.mjs`: narración, banda sonora y exportación.
- Una carpeta por vídeo, con `guion.json` (texto de la voz y pausas), `pista.json` (música y efectos), `escenas.js` (planos), `escena.html` y `PLAN.md` (las entregas A–G del sistema: investigación, guion, biblia visual, storyboard, prompts, montaje y evaluación).

## Vídeos
`anibal`, `termopilas`, `constantinopla`, `napoleon-rusia`, `dia-d`, `crisis-cuba`, `israel-palestina`, `uranio-iran`, `iran-israel-eeuu`, `rusia-ucrania`.
`meteorito/` y `meteorito-en/` son los primeros intentos, de antes del sistema actual.

## Rearmar un vídeo
Necesita `pip install piper-tts numpy scipy soundfile`, `ffmpeg`, Playwright y la voz `es_MX-claude-high` (`.onnx` y `.onnx.json`) de https://huggingface.co/rhasspy/piper-voices (carpeta `es/es_MX/claude/high`).

```bash
python3 motor/voz.py termopilas <carpeta-de-la-voz> 0.74
python3 motor/sonido.py termopilas
NODE_PATH=$(npm root -g) node motor/render.mjs termopilas termopilas/termopilas.mp4
```

Para revisar planos sueltos: `node motor/render.mjs termopilas --fotos 1,5,9`.
`anibal/` conserva su propio `audio.py` y sus escenas originales en `base.js`.

## Reglas que se aplican
- Los datos de temas actuales se verifican con fuentes recientes (están en cada `PLAN.md`), y las cifras discutidas se atribuyen en pantalla.
- No se dibujan líderes vivos; los nombres aparecen solo en rótulos. Las figuras históricas tienen ficha fija.
- Todo lleva el rótulo «RECREACIÓN ANIMADA».
