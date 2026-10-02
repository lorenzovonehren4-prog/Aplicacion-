# ÁPICE GP

Juego de carreras de monoplazas estilo Fórmula 1 en 3D para navegador
(Vite + TypeScript + Three.js + GSAP + Web Audio). Equipos, pilotos y marcas
son ficticios.

La arquitectura, las decisiones técnicas y las fases de desarrollo están en
[`PLAN.md`](./PLAN.md).

## Cómo jugar (desarrollo)

Requisitos: Node.js 20.19 o superior (o 22.12+) y un navegador con WebGL 2
(Chrome, Edge, Firefox o Safari recientes).

```bash
cd formula-3d
npm install
npm run dev
```

Abrir <http://localhost:5173>.

## Controles

| Acción | Teclado | Gamepad |
|---|---|---|
| Navegar | Flechas o WASD | Cruceta o stick izquierdo |
| Elegir | Enter o Espacio | A |
| Volver | Esc o Retroceso | B |
| Cambiar pestaña | Q / E | LB / RB |

El ratón también funciona en todos los menús.

### En pista

| Acción | Teclado | Gamepad |
|---|---|---|
| Acelerar / frenar | ↑ / ↓ | RT / LT |
| Doblar | ← / → | Stick izquierdo |
| DRS (en las zonas) | D | X |
| Cambiar cámara | C | Y |
| Volver a la pista | R | Select |
| Pausa | Esc o P | Start (o B) |

Las teclas del manejo se cambian en Ajustes → Controles.

La caja de cambios es automática (8 marchas).

## Comandos

```bash
npm run dev        # servidor de desarrollo
npm run build      # typecheck + build de producción (dist/)
npm run preview    # sirve dist/
npm run check      # typecheck + lint + pruebas unitarias + build
npm test           # pruebas unitarias (Vitest)
npm run smoke      # prueba de humo en Chromium real (necesita `npm run build` antes)
npm run build:artifact  # todo el juego en un solo HTML (dist-artifact/apice-gp.html)
```

La prueba de humo usa `playwright-core`. Si no tienes un Chromium de Playwright
instalado: `npx playwright-core install chromium`, o indica uno propio con la
variable `CHROMIUM_PATH`.

## Estado

Versión 1.11.0: las 9 fases del documento de diseño están completas, con
más tracción en curvas, carga y carrera más fluidas, pistas más anchas,
gráficos mejorados, circuitos con más detalle (asfalto con goma y marcas,
árboles con viento, barreras de neumáticos, horizonte y público animado) y
menús pulidos (fondos animados, mapa del circuito con sectores y un auto que
recorre la vuelta, vista previa del campeonato), texturas nítidas
(anisotrópico 8–16×, mipmaps, doble resolución y detalle cercano), ayuda de
dirección hacia el ápice con anti-derrape en Principiante y línea de
trazada dinámica en todos los niveles, que se pone roja con tiempo para
frenar suave y doblar. Los circuitos usan el trazado real (línea central
medida) y son algo más anchos que los reales; la dirección con teclado
crece con el tiempo que mantienes la flecha, sin demora: responde enseguida
pero un toque corto gira poco. En ventanas chicas (como el panel de
claude.ai) la interfaz se achica en proporción en vez de encimarse. El HUD
sigue la distribución de una transmisión de carrera y la calidad inicial se
elige según la GPU para que el juego vaya fluido y nítido.
Albert Park y Monza, con pantalla de selección de carrera. Modos: práctica
libre, carrera rápida (3, 5 o 10 vueltas contra 9–19 rivales con IA de 5
dificultades), contrarreloj con fantasma y campeonato con puntos. XP y
niveles 1–100, pase de temporada de 50 niveles, garaje con vista previa en
vivo (pintura, material, llantas, alerón, casco, número y festejo), perfil con
estadísticas, récords, vitrina de trofeos y 21 logros. Tutorial la primera
vez, manual de ayudas con demos animadas, teclas reasignables y música de
menú generativa.

En pista: presentación del circuito en tres tomas (vuelo, parrilla y órbita),
clima, choques con chispas y humo, humo de neumáticos, tierra fuera de la
pista, rebufo y DRS (el campo visual se abre), desenfoque de velocidad y aire
caliente de los escapes, bandera a cuadros y cámara lenta en la llegada,
tres cámaras, sonido 3D, HUD con radio, ayudas por niveles y rendimiento
automático. Después de una carrera con rivales, el podio 3D con confeti,
serpentinas, champán y fuegos artificiales (el festejo equipado se luce más).
Ver la sección **Fases** de `PLAN.md`.

## Créditos de datos

Los trazados de Albert Park y Monza vienen de la
[TUMFTM racetrack-database](https://github.com/TUMFTM/racetrack-database)
(Universidad Técnica de Múnich), derivada de OpenStreetMap (© colaboradores
de OpenStreetMap), bajo licencia LGPL-3.0. Los archivos convertidos y la
licencia están en `src/tracks/data/real/`.
