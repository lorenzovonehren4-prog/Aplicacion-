# Shorts de Cosmo.ia

Shorts verticales (1080×1920) de «¿Qué pasaría si…?». Cada carpeta es un short que se arma solo.

## Rearmar un short

```bash
cd shorts/meteorito
python3 audio.py                                   # arma timeline.json y audio.wav (voz + sirenas + golpes + música)
NODE_PATH=$(npm root -g) node render.mjs short.mp4 # dibuja escena.html cuadro a cuadro y lo une con el audio
```

- `guion.json`: las frases de la narración, la imagen de cada una y su duración.
- `voz.py`: vuelve a grabar la narración con Kokoro (voz `em_alex`) si cambia el guion.
- `escena.html`: planos, cámara, temblores, destellos, vidrios, brasas y textos. Todo depende de `setT(t)`.
- `img/`: ilustraciones clave hechas en OpenArt. Con el plan gratuito traen la marca de agua de OpenArt;
  con un plan de pago basta reemplazar los archivos y volver a renderizar.
- Necesita `pip install numpy scipy soundfile`, `ffmpeg` y Playwright.

## Canal

`canal/cosmo-ia-perfil.png` (800×800) y `canal/cosmo-ia-banner.png` (2560×1440, texto dentro de la zona segura).
Se redibujan con `node canal/marca.cjs`.

**Nombre:** Cosmo.ia  ·  **Identificador sugerido:** @cosmo.ia (o @cosmoia.shorts si está tomado)

**Descripción del canal:**

> ¿Qué pasaría si cae un meteorito? ¿Y si la Tierra tuviera dos soles? ¿Y si el Sol se apagara mañana?
>
> En Cosmo.ia respondemos las preguntas más locas del universo en menos de 60 segundos, con datos reales
> y animación de película. Espacio, catástrofes, ciencia y curiosidades que no te enseñaron en el colegio.
>
> 🚀 Shorts nuevos cada semana
> 🔔 Suscríbete y deja tu «¿qué pasaría si…?» en los comentarios: el mejor se convierte en video.
>
> Las imágenes y la voz se crean con inteligencia artificial; los datos se verifican antes de publicar.

**Palabras clave del canal:** qué pasaría si, datos curiosos, espacio, universo, ciencia, astronomía, meteorito, curiosidades, shorts

## Short 1 — meteorito

- **Título:** ¿Qué pasaría si cae un meteorito? 3 tamaños ☄️
- **Descripción:**
  > 20 metros, 60 metros, 10 kilómetros: qué le pasa a tu ciudad con cada uno.
  > Si ves el destello… aléjate de la ventana.
  >
  > Datos: Cheliábinsk (2013, ~1 500 heridos, casi todos por vidrios), Tunguska (1908, ~80 millones de
  > árboles), Chicxulub (hace 66 millones de años).
  >
  > #quépasaríasi #datoscuriosos #meteorito #espacio #ciencia #shorts
- **Comentario fijado:** ¿Cuál «¿qué pasaría si…?» quieres ver después? 👇
- Al subirlo, marcar «contenido alterado o sintético» (imágenes y voz hechas con IA).

## Herramientas instaladas en el proyecto

- `.claude/skills/yt-*`: youtube-agent-skill (guion, título + miniatura, SEO, Shorts, retención…). Escribe; **no publica**.
- `.claude/skills/graphify`: `/graphify .` arma un grafo del código (necesita `pip install graphifyy`).
