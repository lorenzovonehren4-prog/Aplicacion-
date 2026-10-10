/**
 * levels/level-25.js — "Rotación"
 *
 * Tipo:        Espacial + Interacción
 * Mecánica:    Nueve piezas cuadradas con segmentos de línea. Cada clic gira
 *              una pieza 90°.
 * Interacción: Pulsar piezas hasta que todos los segmentos casen.
 * Solución:    Cada pieza conecta con todos sus vecinos y ningún segmento
 *              apunta al vacío.
 *
 * La condición de victoria es "ningún cabo suelto": todo segmento que sale de
 * una pieza tiene que encontrarse con otro en la pieza contigua, y ninguno
 * puede apuntar fuera del tablero. Eso fija una única rotación para cada pieza
 * del borde —las esquinas sólo encajan de una forma—, y desde ahí el resto cae
 * solo. La pieza central es una cruz, así que da igual cómo esté girada: es la
 * única que no hay que tocar, tal como adelanta la pista #3 del documento.
 */

import { LevelBase } from './level-base.js';
import { el, svgEl } from '../utils/dom.js';
import { createRng, randInt } from '../utils/math.js';

const SIZE = 3;
const SEED = 'mind-escape/level-25';

/** Direcciones: 0 norte, 1 este, 2 sur, 3 oeste. */
const DELTA = [[-1, 0], [0, 1], [1, 0], [0, -1]];
const OPPOSITE = [2, 3, 0, 1];

/**
 * Solución: cada pieza tiene un segmento hacia cada vecino que existe dentro
 * del tablero. Las esquinas quedan en codo, los lados en T y el centro en cruz.
 */
function solutionConnectors(r, c) {
  return DELTA
    .map(([dr, dc], dir) => ({ dir, r: r + dr, c: c + dc }))
    .filter(({ r: nr, c: nc }) => nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE)
    .map(({ dir }) => dir);
}

const STYLES = `
.lv25 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: var(--sp-4);
}

.lv25__grid {
  display: grid;
  grid-template-columns: repeat(${SIZE}, 1fr);
  gap: 2px;
  padding: 2px;
  border-radius: var(--r-md);
  background: rgba(255, 255, 255, 0.05);
}

.lv25__tile {
  width: clamp(66px, 19vw, 96px);
  aspect-ratio: 1;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.42);
  transition: background var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease);
}

.lv25__tile:hover:not(:disabled) { background: rgba(0, 212, 255, 0.06); border-color: var(--accent-line); }

.lv25__tile svg { width: 100%; height: 100%; display: block; }

/* El giro se anima: el jugador ve la pieza rotar, no teletransportarse. */
.lv25__spin { transition: transform var(--t-base) var(--ease); transform-origin: 50px 50px; }

.lv25__wire { stroke: hsl(190 72% 64%); stroke-width: 9; stroke-linecap: round; fill: none; }
.lv25__hub { fill: hsl(190 72% 64%); }

/* Un cabo suelto se pinta en rojo: el error es visible sin tener que contarlo. */
.lv25__tile[data-loose='true'] .lv25__wire { stroke: hsl(0 75% 62%); }
.lv25__tile[data-loose='true'] .lv25__hub { fill: hsl(0 75% 62%); }

.lv25__tile--done .lv25__wire { stroke: var(--success); }
.lv25__tile--done .lv25__hub { fill: var(--success); }

.lv25__status { font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-faint); }
.lv25__status b { color: var(--accent); }
`;

export class Level25 extends LevelBase {
  constructor(levelId, container, context) {
    super(levelId, container, context);

    const rng = createRng(SEED);
    this.rotation = [];

    for (let r = 0; r < SIZE; r += 1) {
      this.rotation[r] = [];
      for (let c = 0; c < SIZE; c += 1) {
        // El centro es una cruz: girarlo no cambia nada, así que se deja a 0.
        const isCenter = r === 1 && c === 1;
        this.rotation[r][c] = isCenter ? 0 : randInt(rng, 1, 3);
      }
    }
  }

  /** Conectores actuales de una pieza, ya girados. */
  connectorsAt(r, c) {
    return solutionConnectors(r, c).map((dir) => (dir + this.rotation[r][c]) % 4);
  }

  init() {
    this.tiles = [];
    const grid = el('div.lv25__grid', { role: 'grid', 'aria-label': 'Tablero de piezas giratorias' });

    for (let r = 0; r < SIZE; r += 1) {
      this.tiles[r] = [];
      for (let c = 0; c < SIZE; c += 1) {
        const spin = svgEl('g', { class: 'lv25__spin' });
        const svg = svgEl('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' }, [spin]);

        // Se dibuja la pieza sin girar y se rota el grupo: así el giro se anima.
        for (const dir of solutionConnectors(r, c)) spin.append(arm(dir));
        spin.append(svgEl('circle', { cx: 50, cy: 50, r: 7, class: 'lv25__hub' }));

        const tile = el('button.lv25__tile', {
          type: 'button',
          role: 'gridcell',
          dataset: { r: String(r), c: String(c) },
        }, [svg]);

        this.listen(tile, 'click', () => this.rotate(r, c));
        this.tiles[r][c] = { tile, spin };
        grid.append(tile);
      }
    }

    this.status = el('p.lv25__status', {}, ['Cabos sueltos ', el('b', { text: '—' })]);

    this.mount(el('style', { text: STYLES }), el('div.lv25', {}, [grid, this.status]));
    this.render();
  }

  rotate(r, c) {
    if (this.solved) return;
    this.rotation[r][c] = (this.rotation[r][c] + 1) % 4;
    this.render();

    if (this.looseEnds().length === 0) this.attempt(this.snapshot());
  }

  /** Conectores que no encuentran pareja: el tablero está resuelto cuando no queda ninguno. */
  looseEnds() {
    const loose = [];

    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        for (const dir of this.connectorsAt(r, c)) {
          const [dr, dc] = DELTA[dir];
          const nr = r + dr;
          const nc = c + dc;

          const outside = nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE;
          if (outside || !this.connectorsAt(nr, nc).includes(OPPOSITE[dir])) {
            loose.push([r, c]);
            break;
          }
        }
      }
    }

    return loose;
  }

  snapshot() {
    return this.rotation.map((row) => [...row]);
  }

  render() {
    const loose = new Set(this.looseEnds().map(([r, c]) => `${r},${c}`));

    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        const { tile, spin } = this.tiles[r][c];
        spin.style.transform = `rotate(${this.rotation[r][c] * 90}deg)`;
        tile.dataset.loose = String(loose.has(`${r},${c}`));
        tile.setAttribute('aria-label',
          `Pieza fila ${r + 1}, columna ${c + 1}. ${loose.has(`${r},${c}`)
            ? 'Tiene algún cabo suelto.' : 'Encaja con sus vecinas.'} Púlsala para girarla.`);
      }
    }

    this.status.querySelector('b').textContent = String(loose.size);
  }

  validate(solution) {
    return Array.isArray(solution) && this.looseEnds().length === 0;
  }

  onSolved() {
    this.solved = true;
    for (const row of this.tiles) {
      for (const { tile } of row) {
        tile.disabled = true;
        tile.classList.add('lv25__tile--done');
        tile.dataset.loose = 'false';
      }
    }
  }

  getPrompt() {
    return 'Gira las piezas hasta que ningún segmento quede al aire.';
  }

  getHints() {
    return [
      'Cada pieza tiene cuatro orientaciones, y sólo una encaja con sus vecinas.',
      'Empieza por las esquinas: sus dos segmentos sólo pueden apuntar hacia dentro del tablero, así que su giro está forzado.',
      'La pieza central es una cruz y conecta con las cuatro vecinas: gires lo que gires, esa ya está bien. Las demás siguen a las esquinas.',
    ];
  }

  getState() {
    return { rotation: this.snapshot() };
  }

  setState(state) {
    if (Array.isArray(state?.rotation)) this.rotation = state.rotation.map((row) => [...row]);
  }

  getType() {
    return 'espacial-interaccion';
  }
}

/** Brazo desde el centro hasta el borde en la dirección dada. */
function arm(dir) {
  const ends = [[50, 0], [100, 50], [50, 100], [0, 50]];
  const [x, y] = ends[dir];
  return svgEl('line', { x1: 50, y1: 50, x2: x, y2: y, class: 'lv25__wire' });
}

export default Level25;
