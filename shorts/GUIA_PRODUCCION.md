# Guía de producción de los Shorts (para continuar el trabajo)

Este documento explica cómo se hicieron las versiones actuales de los vídeos («¿Sabías que…?» y terror interactivo) y cómo hacer más iguales. Está pensado para dárselo a otro modelo junto con el repositorio.

## Prompt para empezar una sesión nueva

Copiar esto tal cual al abrir la sesión:

> Trabaja en la carpeta `shorts/` del repositorio, rama `claude/hopeful-lamport-uz29r3`. Antes de nada lee `shorts/GUIA_PRODUCCION.md`, `shorts/SISTEMA_CURIOSIDADES.md` y `shorts/PUBLICAR.md`. Soy el dueño del canal de YouTube Historia.Universal (shorts en español). Todo tiene que ser gratis: no uses herramientas de pago. Haz los vídeos con el mismo sistema que describe la guía (motor propio, voz Piper, fondos pintados con SD-Turbo, ficha de episodios y `herramientas/hacer.sh`), con el mismo estilo de personajes, cámara, subtítulos y sonido. Cuando te dé guiones, usa mi narración tal cual. Cuando termines una tanda, mándame los vídeos para verlos, apunta títulos y descripciones en `PUBLICAR.md`, y haz commit y push. Tienes mi permiso para publicar 2 vídeos al día en YouTube (12:30 y 19:30, hora de Lima) sin preguntarme, en el orden de `PUBLICAR.md`.

## Qué quiere el dueño (resumen de todo lo que pidió)

- Canal en español, todo gratis.
- Vídeos de unos 40 segundos (terror: 45–50), verticales 9:16.
- Los de historia abren con «¿Sabías que…?» y la respuesta llega al final. Si el dueño da la narración, se usa palabra por palabra.
- Algo cambia en pantalla cada 3–5 segundos: una toma por frase, cada una con su movimiento de cámara.
- Personajes de cabeza grande y redonda, contorno grueso, ojos con párpado, cejas gruesas, ropa detallada; fondos pintados y detallados, sin texto.
- Subtítulos grandes, máximo dos líneas, blanco con la palabra activa en amarillo. Títulos en Anton, subtítulos en Montserrat.
- Los personajes tienen que actuar (entrar, gesticular, reaccionar), no quedarse quietos.
- La voz se tiene que oír siempre por encima del fondo. El fondo no puede sonar entrecortado.
- Datos verificados, sin diálogos inventados, leyendas separadas de hechos. No se dibujan líderes vivos. En política discutida se cuentan las dos versiones sin elegir ganador.
- Publicar 2 al día; algunos días 3 (2 de historia + 1 de «pausa en el momento exacto»).

## Instalación (una vez por sesión)

```bash
pip install piper-tts numpy scipy soundfile pillow torch diffusers transformers accelerate
```

- `ffmpeg`, Node y Playwright con Chromium ya vienen en el entorno de Claude Code en la nube.
- Voz: descargar `es_MX-claude-high.onnx` y `es_MX-claude-high.onnx.json` de `https://huggingface.co/rhasspy/piper-voices` (carpeta `es/es_MX/claude/high`) a una carpeta cualquiera; esa carpeta es `VOZ`.
- Fondos: SD-Turbo (`stabilityai/sd-turbo`) se descarga solo la primera vez. Hay que poner `HF_HUB_DISABLE_XET=1` o la descarga falla. Corre en CPU: unos 25 s por imagen, y más de un minuto de carga inicial.

## Hacer una tanda nueva, paso a paso

1. Escribir una ficha en `herramientas/fichas/` copiando el formato de `tanda-f01-f08.py` (la más reciente). Cada episodio es una entrada de `EPIS`:
   - `pre`: prefijo de los fondos. `titulo`: rótulo de entrada. `final`: rótulo de cierre (tercer valor: tamaño).
   - `hot`: palabras que se resaltan en amarillo en los subtítulos.
   - `fechas`, `nombres`, `cifras`: rótulos por rango de escenas. `golpes`: escenas con sacudida de cámara (ahí los personajes dan un salto).
   - `fondos`: `{nombre: prompt en inglés}`. Un fondo por lugar, 5–7 por vídeo.
   - `esc`: una tupla por frase: `(narración, fondo, cámara, [personajes], extras)`.
     - Cámaras: `in`, `out`, `crash`, `sube`, `baja`, `whip`, `orbit`, `detalle`, `lejos`, `sigue`, `izq`, `der`. No repetir la misma dos veces seguidas.
     - Personaje: `"nombre x cara brazos habla L anda:a>b s1.4"`. Nombres: biblioteca `PJ` en `motor/motor.js`. Caras: `o` sorpresa, `m` desconfiado, `s` sonrisa, `f` triste, `g` risa, `e` enfadado, `n` neutro, `d` ojos cerrados. Brazos: `arriba`, `senala`, `pensar`, `baila`. `L` mira a la izquierda.
     - Extras: `T('TEXTO', y, tamaño)`, `EM(('emoji', x, y, tamaño, {'en': .3}))`, `D({'tipo': 'reloj'|'tanque'|'velero'|'wow'|'casco'|'colibri', ...})`, `{'barcos': [...]}`, `{'animales': [...]}`, `{'linea': {'a':..,'b':..,'txt':..}}`.
2. Si hace falta un personaje nuevo, añadirlo a `PJ` en `motor/motor.js` (color de ropa `top`, chaqueta `top2`, `hat`, `hair`, `beard`, `mustache`, `skin`, altura `h`).
3. Ejecutar desde `shorts/`:

```bash
VOZ=/ruta/a/la/voz bash herramientas/hacer.sh herramientas/fichas/mi-tanda.py 0.86
```

   Esto genera las carpetas, graba la voz, pinta los fondos, pone el ambiente, mezcla el audio y renderiza cada vídeo en `<carpeta>/<carpeta>.mp4`. También escribe `PLAN.md`.
4. Revisar antes de enviar: sacar un fotograma por escena y mirarlos.

```bash
NODE_PATH=$(npm root -g) node motor/render.mjs f01-lustig --fotos 3,9,15,21,27
```

   Cosas que suelen fallar: fondos con el motivo repetido en mosaico o con letras falsas (cambiar el prompt, borrar el `.jpg` de la caché y volver a pintar), sombreros que tapan los ojos, textos que pisan la cara.
5. Enviar los vídeos al dueño, apuntar título, descripción y etiquetas en `PUBLICAR.md`, y hacer commit y push. Los `.mp4` están en `.gitignore`: hay que añadirlos con `git add -f`.

**Voz actual: Microsoft Edge (gratis, sin cuenta).** Desde la última versión la narración se graba con voces neuronales elegidas por el dueño (`es-PE-AlexNeural` para los vídeos de historia y `es-ES-AlvaroNeural` para el terror) mediante `pip install edge-tts`. El entorno tiene que permitir el host `speech.platform.bing.com` (ya añadido al entorno «Aplicacion-»). Para grabar con ella: `VOZ_EDGE=es-PE-AlexNeural RATE=+10% python3 motor/voz.py <carpeta> x`, o para volver a grabar y renderizar vídeos ya hechos: `VOZ_EDGE=es-PE-AlexNeural RATE=+10% bash herramientas/revoz.sh <carpetas>`. En `hacer.sh` basta con exportar `VOZ_EDGE` antes de llamarlo. Otras voces probadas: `es-MX-JorgeNeural`, `es-US-AlonsoNeural`, `es-MX-DaliaNeural` (muestras en `canal/voces/`). Sin `VOZ_EDGE` se usa Piper, que funciona sin red.

Velocidad de voz con Piper: 0,72 es rápida, 0,86 es la usada en la última tanda. Si un guion corto no llega a 40 s, subir `GAP` (pausa entre frases) o añadir frases; no estirar la voz más de 0,9.

## Cómo está hecho cada elemento

- **Personajes** (`cabezon()` en `motor/motor.js`): cabeza redonda con sombreado lateral, orejas, nariz, ojos con blanco, pupila y párpado, cejas, mangas del color de la ropa, manos, pantalón, zapatos, camisa y corbata en chaquetas.
- **Actuación automática** (bucle de `chars` en `AUTO`): el personaje entra caminando desde el borde más cercano si no estaba en la toma anterior, se balancea, gesticula si habla, y salta con cara de sorpresa en las escenas marcadas en `golpes`.
- **Fondos** (`motor/fondos.py`): SD-Turbo, 512×896 escalado a 1080×1890, dos pasos, con el sufijo «2D cartoon background art, painted animation background, flat colors with soft shading, thick clean outlines, detailed textures, warm cinematic lighting, no people, no text». Se desenfocan un poco al copiarlos para que el personaje destaque.
- **Sonido** (`motor/sonido.py` y `pista.json`): música (colchón, ostinato, percusión), ambiente por escena (`motor/ambientar.py` lo elige según el fondo: mar, viento, gente, fuego, tormenta o sala), efectos en los giros y reverberación. La mezcla deja el fondo al menos 16 dB por debajo de la voz mientras se habla y no lo sube entre palabras. Al terminar imprime los niveles: comprobar que «fondo con voz» queda 16 dB o más por debajo de «voz».
- **Subtítulos y rótulos**: los pone `MOTOR.run` a partir de `guion.json` y `timeline.json`; tipografía v2 con `tipo: 2` en `AUTO`.

## Vídeos con escenas propias (terror)

`t01-no-abras/` es el modelo. Se escribe `escenas.js` a mano llamando a `AUTO` con funciones `extra(t, k)` por escena, y `guion.json` y `pista.json` a mano.

- Dibujos propios en ese archivo: puerta (siempre la misma), celular con mensajes, mirilla, reloj digital, tarjetas A/B, lluvia, relámpagos, oscurecido, plano sobre el hombro.
- Protagonista con poses propias mediante `YO(t, {...})`: sentado, sobresalto, caminar, retroceder temblando.
- Voces con efecto en `guion.json`: `"fx": "puerta"` (grave y apagada) y `"fx": "susurro"`.
- Sonidos de terror en `sonido.py`: `knock`, `thunder`, `vibra`, `pica`, `sting`, `breath`, `creak`, y las capas `storm`, `drone`, `heart`, `tictac`.
- Regla de la serie: nunca se muestra quién está detrás de la puerta, el episodio no resuelve el misterio y termina con dos opciones para comentar. El episodio 2 sigue la opción que gane.

## Publicar en YouTube

Se hace con el conector «Ytube» (Composio), en su banco de trabajo remoto:

1. Descargar el `.mp4` desde `https://raw.githubusercontent.com/lorenzovonehren4-prog/Aplicacion-/claude/hopeful-lamport-uz29r3/shorts/<carpeta>/<carpeta>.mp4` (por eso hay que hacer push antes).
2. `upload_local_file(ruta)` y guardar el `s3key`.
3. `run_composio_tool('YOUTUBE_MULTIPART_UPLOAD_VIDEO', {title, description, tags, categoryId: "27", privacyStatus: "private", videoFile: {name, mimetype: "video/mp4", s3key}})`.
4. Programar: `proxy_execute('PUT', '/videos', 'youtube', query_params={'part': 'status'}, body={id, status: {privacyStatus: 'private', publishAt, selfDeclaredMadeForKids: False, containsSyntheticMedia: True, embeddable: True, license: 'youtube', publicStatsViewable: True}})`.

- Horarios: 17:30Z y 00:30Z (12:30 y 19:30 de Lima). Orden y textos: `PUBLICAR.md`. Al subir, cambiar «pendiente» por el enlace.
- YouTube limita las subidas por día. Si devuelve «daily upload limit», subir lo que deje y reintentar al día siguiente.
- La descripción termina con: «Recreación animada: la voz y las imágenes están generadas por ordenador. ¿Qué historia quieres que cuente después? 👇». El terror lleva «Historia de ficción».
- Cuatro vídeos de la primera tanda no se publican porque tienen versión nueva: `torre-eiffel`, `guerra-38min`, `yamaguchi`, `guerra-emus` (se publican `f01`, `f03`, `f04`, `f08`).

## Pendiente

- Subir a YouTube los 45 vídeos en cola.
- Contrastar los datos de los guiones escritos de memoria (10 de la primera tanda y los 20 `e01`–`e20`): las fuentes están listadas en cada `PLAN.md` pero no se abrieron.
- TikTok (cuenta del dueño): falta que cree su aplicación de desarrollador para conectar; mientras tanto, textos en `TIKTOK.md`.
- Vídeos de «pausa en el momento exacto»: solo existe el prototipo `pausa-panqueque/`.
- Episodio 2 de «No abras la puerta» según los comentarios.
- Los 10 vídeos hechos a mano de la primera tanda (Cleopatra, Napoleón y los conejos, juicios a animales, Sínodo del Cadáver, Leonardo, Anticitera, Cannas, novela del Titanic, Yamaguchi, Twain) no tienen la actuación automática.
