# Publicar Sazón Tycoon en itch.io

## 1. Armar el zip

En una terminal, dentro de la carpeta `sazon-tycoon`:

```
node tools/empaquetar-itch.mjs
```

Se crea `dist/sazon-tycoon-itch.zip` con solo lo necesario: `index.html`, `src/` y `vendor/` (motor 3D y fuentes). No depende de internet.

## 2. Crear el proyecto en itch.io

1. Entra a https://itch.io, inicia sesión y ve a **Upload new project**.
2. **Title:** Sazón Tycoon.
3. **Kind of project:** HTML.
4. **Uploads:** sube `sazon-tycoon-itch.zip` y marca **This file will be played in the browser**.
5. **Embed options:**
   - Viewport dimensions: **1280 × 720**.
   - Marca **Mobile friendly** (orientación **Landscape**).
   - Marca **Fullscreen button**.
   - Deja desmarcado "Automatically start on page load" (así el audio arranca con el primer toque).
6. **Cover image:** sube `itch/portada.png` (630 × 500).
7. **Screenshots:** sube las imágenes de la carpeta `itch/`.
8. **Genre:** Simulation. **Tags:** tycoon, restaurant, management, 3d, peru, cooking, idle.
9. **Pricing:** gratis, o "No payments" / "Donate" si quieres propinas.
10. Guarda como **Draft**, pruébalo en la página del juego (también desde el celular) y cuando esté bien, cámbialo a **Public**.

## Descripción sugerida

> ¡Abre tu propio restaurante criollo en Lima! Empieza con dos mesas y un cocinero, anota pedidos, lleva platos y limpia mesas. Contrata mozos, amplía la carta con ceviche, lomo saltado y pollo a la brasa, decora tu local y construye pisos nuevos, drive-thru y delivery. Cuando llegues a 4.5 estrellas, abre locales en Miraflores, Barranco y Gamarra, cada uno con su clientela. Y prepárate para los imprevistos: partidos de la selección, críticos de incógnito, apagones y feriados largos.
>
> Funciona en computadora y celular. Tu progreso se guarda solo en el navegador.

## Notas

- El progreso se guarda en el navegador de cada jugador (`localStorage`). Si alguien borra los datos del sitio, pierde la partida.
- En Opciones hay tres calidades gráficas. En celulares, el juego elige sola la calidad según el equipo y además baja la resolución interna si los FPS caen.
