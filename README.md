# Anonymous Games

Portal de juegos estilo Poki / 1001 Juegos que junta todos los juegos del
repositorio en un solo lugar. HTML, CSS y JavaScript sin compilación.

| Juego | Carpeta | Género |
| --- | --- | --- |
| **Kartódromo** | `karting/` | Carreras 3D, 2 jugadores |
| **Sazón Tycoon** | `sazon-tycoon/` | Tycoon / simulación 3D |
| **Mind Escape** | `mind-escape/` | Puzzles y acertijos |

## Cómo abrirlo

```bash
npm start            # python3 -m http.server 8000
```

Y entrar a <http://localhost:8000>. El portal también abre con doble clic en
`index.html`, pero Mind Escape necesita servidor (usa módulos ES y `fetch`).

## Qué tiene el portal

- **Intro** animada la primera vez en cada sesión (clic para saltarla).
- **Cabecera**: logo, buscador (`/` para enfocarlo) y, arriba a la derecha, el
  sonido y **tu perfil**: máscara, nombre, nivel y barra de XP. Tocándolo se
  abre el panel del perfil.
- **Carrusel** de destacados con avance automático.
- **Categorías**: Carreras, Simulación, Puzzles, 3D, 2 jugadores y Favoritos.
- **Sigue jugando**: los últimos juegos que abriste.
- **Cuadrícula** estilo Poki con fichas grandes y chicas; al pasar el mouse la
  ficha se inclina, brilla y muestra otra imagen del juego. Las fichas leen el
  guardado de cada juego (nivel de piloto, día y plata, niveles superados).
- **Página de juego** con reproductor (el juego va en un `iframe`), favorito,
  reiniciar, pantalla completa (`F`), controles, tu progreso y más juegos.
- **Perfil**: 12 máscaras, nombre, nivel (10 XP por minuto jugado y 50 por
  insignia), tiempo por juego y **12 insignias** (algunas se ganan dentro de
  los juegos: ganar una carrera, abrir un segundo local, superar 30 niveles…).
- Sonidos de interfaz sintetizados (`M` para apagarlos). Funciona en celular.

Todo se guarda en `localStorage` bajo `anonymousGames_v1`. Borrar el perfil no
toca el progreso de los juegos.

## Estructura

```
index.html            el portal
portal/
  games.js            catálogo de juegos (y cómo leer el progreso de cada uno)
  portal.js           rutas, vistas, perfil, insignias, sonido
  portal.css          estilos
  img/                portadas (capturas reales de los juegos)
  fonts/              Fredoka y Rubik (sin internet)
  tests/portal.mjs    prueba en navegador
  tools/              scripts para sacar capturas nuevas
karting/  sazon-tycoon/  mind-escape/   cada juego, sin cambios
```

## Agregar un juego

1. Ponerlo en su carpeta con su `index.html`.
2. Sumar una entrada a `GAMES` en `portal/games.js` (título, colores,
   categorías, controles, portadas y `progress()` si guarda algo).
3. Poner sus imágenes en `portal/img/` (portada 960×600 en webp).

## Pruebas

```bash
npm install
npm run test:portal          # el portal (agregar --shots para capturas)
npm test                     # las 17 suites de Mind Escape
```

En contenedores, exportar `CHROMIUM_PATH` con la ruta del Chromium. Cada juego
tiene además sus propias pruebas (ver su `CLAUDE.md`).
