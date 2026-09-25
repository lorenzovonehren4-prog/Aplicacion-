# 🧟 Reino en Guardia: Apocalipsis

Tower defense 2D hecho con **HTML5 Canvas y JavaScript puro**, sin frameworks, librerías ni imágenes externas: todo se dibuja con formas geométricas y los sonidos se sintetizan con Web Audio.

## ▶ Cómo jugar

- **Opción rápida:** abre `tower-defense/index.html` con doble clic en Chrome, Edge o Firefox.
- **Con servidor local** (recomendado):
  ```bash
  cd tower-defense
  python3 -m http.server 8080
  # abre http://localhost:8080
  ```

El progreso (nivel, rango, medallas, estrellas y logros) se guarda en el navegador (`localStorage`).

## 🎮 Contenido

| | |
|---|---|
| 🗺️ **3 mapas** | Pradera del Molino (noches), Cañón Escarlata (tormentas de arena) y Fragua Volcánica (lava y erupciones). |
| ⚔️ **3 dificultades** | Aprendiz, Guardián y Leyenda. |
| 🌊 **20 oleadas** | Minijefe en la oleada 10 y jefe propio de cada mapa en la 20. |
| 🗼 **21 torres, nivel 5** | Terrestres, antiaéreas, mixtas, de detección, de apoyo y de economía (granjas, minas de plata, bancos). Cada torre desbloquea una habilidad especial en el nivel 5. |
| 🧟 **14 zombis y 3 jefes** | Terrestres 🦶, voladores 🪽, camuflados 👁️ y blindados 🛡️. |
| 🦸 **3 héroes** | Suben de nivel durante la partida y se pueden mover. |
| 💥 **5 habilidades** | Bombardeo, granada de hielo, suministro aéreo, barricadas y minas. |
| ⏩ **Ritmo** | Velocidades x1, x1.5, x2 y x3, adelantar oleadas (con plata extra) y oleadas automáticas. |
| ⭐ **Progresión** | 1 a 3 estrellas según las vidas que conserves, puntuación con récords, XP y **14 rangos militares** (de Recluta a Leyenda del Apocalipsis). |
| 🎖️ **Metajuego** | Desbloqueo de torres, héroes y habilidades por nivel; Cuartel de mejoras permanentes pagadas con medallas; 17 logros; recompensa diaria con racha; 3 misiones diarias. |
| ♾️ **Modos** | Campaña, Infinito y 4 Desafíos. |

### Controles
`1`–`9` elegir torre · `N` iniciar o adelantar oleada · `F` velocidad · `Espacio` pausa · `U` mejorar · `V` vender · `H` héroe · `Q` `W` `E` `R` `T` habilidades · `Esc` o clic derecho: cancelar.

## 🧱 Estructura

```
tower-defense/
├── index.html        pantallas (intro, menús, partida) y carga de módulos
├── style.css
├── src/
│   ├── config.js      ← TODO el balance: mapas, zombis, torres, oleadas, héroes, rangos…
│   ├── utils.js       funciones auxiliares (estadísticas por nivel, formato)
│   ├── audio.js       efectos de sonido sintetizados (Web Audio)
│   ├── profile.js     perfil guardado: XP, rangos, medallas, logros, misiones
│   ├── map.js         cuadrícula, camino terrestre, ruta aérea y dibujo del escenario
│   ├── enemies.js     zombis: movimiento, estados, jefes y barras de vida
│   ├── projectiles.js proyectiles, minas, napalm y efectos visuales
│   ├── towers.js      torres y sus comportamientos (BEHAVIORS)
│   ├── heroes.js      héroes (extienden Tower)
│   ├── game.js        bucle con requestAnimationFrame + delta time, oleadas, economía
│   ├── ui.js          HUD, tienda, panel de torre, habilidades, resultados
│   ├── menus.js       fondo animado y todas las pantallas de menú
│   └── main.js        arranque y cambio entre menús y partida
└── tests/             pruebas automáticas con Playwright
```

### ➕ Añadir una torre nueva
1. Añade una entrada en `CONFIG.towers` (`config.js`) con precio, estadísticas, crecimiento por nivel, a qué ataca (`targets`, `detect`) y su `perk` de nivel 5.
2. Si reutiliza un comportamiento existente (`bullet`, `splash`, `chain`, `slow`…), ya está lista.
3. Si necesita una mecánica nueva, registra `TD.BEHAVIORS.miComportamiento = { update(t, dt) {…}, draw(t, ctx) {…} }` en `towers.js`.

Los zombis, las oleadas, los mapas, los héroes, las habilidades, los rangos, los logros y las mejoras del Cuartel también se definen solo en `config.js`.

## ✅ Pruebas

Requieren Playwright (`npm install` en la raíz del repositorio):

```bash
node tower-defense/tests/humo.mjs        # recorre toda la interfaz, captura pantallas y falla si hay errores en consola
node tower-defense/tests/simulacion.mjs  # juega las 20 oleadas de los 3 mapas sin interfaz
```
