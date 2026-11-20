# Prueba 3D — estilos nuevos (k01–k03)

Tres vídeos de prueba hechos con `motor/tres.js` (Three.js en el mismo render de Chromium; gratis, sin servicios externos).
Reutilizan la voz y el sonido de episodios ya hechos (se copian `audio.wav` y `timeline.json`) y solo cambian la imagen.

| Carpeta | Estilo | Audio de |
| --- | --- | --- |
| k01-colon-3d | Mapa en relieve de papel | j02-eclipse-colon |
| k02-vuelo739-3d | Repetición de accidente aéreo (HUD, radar, mapa) | h20-vuelo-739 |
| k03-pompeya-3d | Ciudad low-poly | i12-pompeya |

Rehacer: `node motor/render.mjs <carpeta> <carpeta>/<carpeta>.mp4`. Cada `escenas.js` llama `TRES.run({setup})`; `setup` arma la escena y devuelve una función de cámara/animación por frase.
No están en la cola de YouTube: son pruebas.
