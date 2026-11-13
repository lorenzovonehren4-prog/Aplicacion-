# No abras la puerta — corto de terror interactivo (52 s, 9:16)

Ficción original del canal: no es un hecho real y así se indica en la descripción. Brief del dueño: terror psicológico, el espectador decide al final (A o B) y el misterio no se resuelve; la continuación depende de los comentarios.

- Narración: la del brief. Se añadieron dos frases para la escena 4, que no tenía texto («Miras por la mirilla. Está demasiado oscuro para ver quién es.» y «Entonces, tu celular vibra.») y la lectura de las opciones.
- Voces: narrador Piper `es_MX-claude-high` (0,84). La voz tras la puerta y el susurro son la misma voz con efecto (`fx: puerta` y `fx: susurro` en `guion.json`, ver `motor/voz.py`).
- Imagen: tres fondos pintados (`fondos_prompts.json`) oscurecidos, con lluvia y relámpagos. La puerta, el celular, la mirilla, el reloj y las tarjetas A/B están dibujados en `escenas.js`; la puerta es siempre la misma y nunca se ve quién está detrás (solo la sombra de unos pies bajo la rendija).
- Sonido (`pista.json`): lluvia y viento continuos, colchón disonante que se corta cuando llega el mensaje, tres golpes y luego dos, vibración del celular, latido desde el susurro.
- Continuación: episodio 2 según gane A o B en los comentarios.
