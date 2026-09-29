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

Fase 8 de 9: Albert Park y Monza, con pantalla de selección de carrera.
Modos: práctica libre, carrera rápida (3, 5 o 10 vueltas contra 9–19 rivales
con IA de 5 dificultades), contrarreloj con fantasma y campeonato con puntos.
XP y niveles 1–100, pase de temporada de 50 niveles, garaje con vista previa
en vivo, perfil con estadísticas, récords, vitrina de trofeos y 21 logros.
Tutorial la primera vez (nombre y nivel de ayudas recomendado), manual de
ayudas con demos animadas, teclas reasignables y música de menú generativa.
Clima, choques, rebufo, DRS, física estable en curvas rápidas, tres cámaras,
sonido 3D, HUD con radio, ayudas por niveles y rendimiento automático. Ver la
sección **Fases** de `PLAN.md`.
