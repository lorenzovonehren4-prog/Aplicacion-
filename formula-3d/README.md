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

La caja de cambios es automática (8 marchas).

## Comandos

```bash
npm run dev        # servidor de desarrollo
npm run build      # typecheck + build de producción (dist/)
npm run preview    # sirve dist/
npm run check      # typecheck + lint + pruebas unitarias + build
npm test           # pruebas unitarias (Vitest)
npm run smoke      # prueba de humo en Chromium real (necesita `npm run build` antes)
```

La prueba de humo usa `playwright-core`. Si no tienes un Chromium de Playwright
instalado: `npx playwright-core install chromium`, o indica uno propio con la
variable `CHROMIUM_PATH`.

## Estado

Fase 2 de 9: práctica libre en Albert Park con física de monoplaza, tres
cámaras, sonido del motor y efectos, HUD con tiempos y récord guardado, pausa y
ajustes de controles y juego. Ver la sección **Fases** de `PLAN.md`.
