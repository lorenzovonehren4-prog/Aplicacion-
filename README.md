# Anonymous Games

Portal de juegos estilo Poki / 1001 Juegos que junta todos los juegos del
repositorio en un solo lugar. HTML, CSS y JavaScript sin compilación.

| Juego | Carpeta | Género |
| --- | --- | --- |
| **Ápice GP** | `formula-3d/` | Monoplazas estilo F1 en 3D |
| **Kartódromo** | `karting/` | Carreras de karts 3D, 2 jugadores |
| **Combi Rush** | `combi-rush/` | Manejar una combi por Lima (3D) |
| **Fuga Urbana** | `fuga-urbana/` | Escapar de la policía |
| **Sazón Tycoon** | `sazon-tycoon/` | Tycoon de restaurantes 3D |
| **Modo Carrera Fútbol** | `modo-carrera-futbol/` | Carrera de futbolista |
| **Reino en Guardia** | `tower-defense/` | Tower defense contra zombis |
| **Don't Look Up** | `escalada/` | Escalada / plataformas, online |
| **Mind Escape** | `mind-escape/` | Puzzles y acertijos |

Cada juego vino de su propia rama y está tal cual, en su carpeta.

## Cómo abrirlo

```bash
npm start            # python3 -m http.server 8000
```

Y entrar a <http://localhost:8000>. El portal también abre con doble clic en
`index.html`, pero Mind Escape necesita servidor (usa módulos ES y `fetch`).

## Qué tiene el portal

- **Intro** animada la primera vez en cada sesión (clic para saltarla).
- **Cabecera**: logo, buscador (`/` para enfocarlo) y, arriba a la derecha, el
  botón **about:blank** (abre el portal en una pestaña nueva cuya barra dice
  `about:blank`, titulada "Classes", con todo adentro), el sonido y **tu
  perfil**: máscara, nombre, nivel y barra de XP.
- **Carrusel** de destacados (los juegos con `featured: true`) con avance automático.
- **Categorías**: Carreras, Acción, Simulación, Deportes, Estrategia,
  Plataformas, Puzzles, 3D, Multijugador y Favoritos.
- **Sigue jugando**: los últimos juegos que abriste.
- **Cuadrícula** estilo Poki con fichas grandes y chicas; al pasar el mouse la
  ficha se inclina, brilla y muestra otra imagen del juego. Las fichas leen el
  guardado de cada juego (nivel de piloto, día y plata, niveles superados).
- **Página de juego** con reproductor (el juego va en un `iframe`), favorito,
  reiniciar, pantalla completa (`F`), controles, tu progreso y más juegos.
- **Perfil**: 12 máscaras, nombre, nivel (10 XP por minuto jugado y 50 por
  insignia), tiempo por juego y **18 insignias** (muchas se ganan dentro de
  los juegos: ganar una carrera, 10 viajes en combi, llegar a la cima…).
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
formula-3d/ karting/ combi-rush/ fuga-urbana/ sazon-tycoon/
modo-carrera-futbol/ tower-defense/ escalada/ mind-escape/   cada juego, sin cambios
```

## Agregar un juego

1. Ponerlo en su carpeta con su `index.html`.
2. Sumar una entrada a `GAMES` en `portal/games.js` (título, colores,
   categorías, controles, portadas y `progress()` si guarda algo).
3. Poner sus imágenes en `portal/img/` (portada 960×600 en webp).

## Ápice GP

`formula-3d/` es Vite + TypeScript. El portal abre `formula-3d/apice-gp.html`,
su versión ya compilada en un solo archivo. Después de cambiar el juego:

```bash
cd formula-3d && npm ci && npm run build:artifact && cd ..
node portal/tools/apice-gp.mjs
```

## Pruebas

```bash
npm install
npm run test:portal          # el portal (agregar --shots para capturas)
npm test                     # las 17 suites de Mind Escape
```

En contenedores, exportar `CHROMIUM_PATH` con la ruta del Chromium. Cada juego
tiene además sus propias pruebas (ver su `CLAUDE.md`).
