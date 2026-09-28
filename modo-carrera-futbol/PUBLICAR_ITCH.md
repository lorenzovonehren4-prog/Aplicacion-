# Publicar en itch.io

1. En la carpeta del juego, ejecuta:

   ```
   node tools/empaquetar.mjs
   ```

   Se crea `dist/modo-carrera-futbol-itch.zip` (y también `dist/modo-carrera-futbol.html`, el juego en un solo archivo).
2. Entra a https://itch.io/game/new e inicia sesión.
3. Completa:
   - **Title:** Modo Carrera Fútbol
   - **Kind of project:** HTML
   - **Uploads:** sube el zip y marca **"This file will be played in the browser"**.
   - **Embed options:** tamaño 1280 × 720, activa **"Fullscreen button"** y **"Automatically start on page load"**.
   - **Genre:** Simulation. **Tags:** futbol, soccer, career, simulator, 3d, peru.
4. Pon capturas: el estadio, la negociación en la oficina, tu casa y la pantalla del puntaje final.
5. Guarda como borrador, pruébalo en la página del juego y, cuando funcione, cambia la visibilidad a **Public**.

Notas:
- El juego guarda las carreras en el navegador (localStorage). Si el jugador borra los datos del sitio, pierde sus carreras.
- Todos los clubes, jugadores y marcas son inventados. No agregues nombres ni escudos reales.
