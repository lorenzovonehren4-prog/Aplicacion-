/**
 * levels/level-30.js — "LA SALIDA"
 *
 * Tipo:        Combinación de todo
 * Mecánica:    Tres fases encadenadas, como marca el documento maestro.
 *
 *   Fase 1 — La puerta:   tres candados, uno por cada mecánica del juego
 *                         (colores, lógica y rotación).
 *   Fase 2 — El laberinto: cuatro decisiones de navegación.
 *   Fase 3 — El código maestro: seis dígitos que sólo tiene quien recuerde los
 *                         niveles clave.
 *
 * El código maestro se IMPORTA de los niveles a los que alude, igual que en el
 * 27: seis respuestas que el jugador ya dio. Nunca está escrito como constante,
 * así que no puede desincronizarse de los niveles reales.
 *
 * El documento sugiere los niveles 3, 7, 12, 17, 21 y 27 como fuentes. Se usan
 * el 3, 5, 7, 12, 20 y 22 porque son los seis cuya respuesta es un número
 * suelto: la del 17 es una frase, la del 21 una tarjeta y la del 27 ya es un
 * código de cuatro cifras. El espíritu —"cada candado es un nivel que ya
 * resolviste"— se mantiene intacto.
 */

import { LevelBase } from './level-base.js';
import { el, svgEl, icon } from '../utils/dom.js';
import { createKeypad } from './shared/keypad.js';
import { sequenceEquals } from '../systems/validation.js';

import { ANSWER_COLUMN } from './level-03.js';
import { ANSWER_PIECE } from './level-05.js';
import { ANSWER_SWITCH } from './level-07.js';
import { ANSWER_BALL } from './level-12.js';
import { ANSWER_DOOR } from './level-20.js';
import { ANSWER_COIN } from './level-22.js';

/* ── Fase 1 · Candado 1: colores ─────────────────────────────────────────── */

const LOCK_COLORS = [
  { id: 'rojo', label: 'Rojo', hex: '#ef4444' },
  { id: 'azul', label: 'Azul', hex: '#38bdf8' },
  { id: 'verde', label: 'Verde', hex: '#22c55e' },
  { id: 'amarillo', label: 'Amarillo', hex: '#fbbf24' },
];

const COLOR_RULES = [
  'El verde es el primero.',
  'El rojo va justo antes del azul.',
  'El amarillo no es el último.',
];

const COLOR_SOLUTION = ['verde', 'amarillo', 'rojo', 'azul'];

/* ── Fase 1 · Candado 2: lógica ──────────────────────────────────────────── */

const PLATES = [
  { id: 'X', statement: 'La llave está en Z.' },
  { id: 'Y', statement: 'La llave no está en Z.' },
  { id: 'Z', statement: 'La llave no está en Y.' },
];

const PLATE_SOLUTION = 'Y';

/* ── Fase 1 · Candado 3: rotación ────────────────────────────────────────── */

const TILE_SIZE = 2;
const DELTA = [[-1, 0], [0, 1], [1, 0], [0, -1]];
const OPPOSITE = [2, 3, 0, 1];

const tileConnectors = (r, c) => DELTA
  .map(([dr, dc], dir) => ({ dir, r: r + dr, c: c + dc }))
  .filter(({ r: nr, c: nc }) => nr >= 0 && nr < TILE_SIZE && nc >= 0 && nc < TILE_SIZE)
  .map(({ dir }) => dir);

/* ── Fase 2 · El laberinto ───────────────────────────────────────────────── */

const MAZE_STEPS = ['derecha', 'arriba', 'arriba', 'derecha'];

/* ── Fase 3 · El código maestro ──────────────────────────────────────────── */

const MASTER_CLUES = [
  { level: 3, text: 'La columna del símbolo torcido', digit: ANSWER_COLUMN },
  { level: 5, text: 'La pieza que completaba el espejo', digit: ANSWER_PIECE },
  { level: 7, text: 'El interruptor de la bombilla', digit: ANSWER_SWITCH },
  { level: 12, text: 'La pelota que pesaba de más', digit: ANSWER_BALL },
  { level: 20, text: 'La puerta que no mentía', digit: ANSWER_DOOR },
  { level: 22, text: 'La moneda distinta', digit: ANSWER_COIN },
];

const MASTER_CODE = MASTER_CLUES.map((clue) => clue.digit).join('');

const STYLES = `
.lv30 {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.lv30__phases {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
}

.lv30__phase {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-pill);
  border: 1px solid var(--glass-border);
  font-size: 0.66rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.lv30__phase--active { border-color: var(--accent-line); color: var(--accent); }
.lv30__phase--done { border-color: rgba(34,197,94,0.45); color: var(--success); }

.lv30__stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--sp-4);
}

.lv30__title {
  text-align: center;
  font-size: 0.86rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* --- Candados --- */

.lv30__locks { display: flex; justify-content: center; gap: var(--sp-3); flex-wrap: wrap; }

.lv30__lock {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  width: clamp(96px, 26vw, 128px);
  padding: var(--sp-4) var(--sp-3);
  border-radius: var(--r-md);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  transition: all var(--t-base) var(--ease);
}

.lv30__lock:hover:not(:disabled) { border-color: var(--accent-line); box-shadow: var(--shadow-glow); }
.lv30__lock--open { border-color: rgba(34,197,94,0.5); background: var(--success-soft); color: var(--success); }
.lv30__lock-name { font-size: 0.62rem; letter-spacing: 0.16em; text-transform: uppercase; }

.lv30__panel {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  align-items: center;
  padding: var(--sp-5);
  border-radius: var(--r-lg);
  border: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.3);
  animation: rise-in var(--t-base) var(--ease) both;
}

.lv30__rules {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  font-size: 0.88rem;
  color: var(--text-dim);
  list-style: none;
}

.lv30__slots { display: flex; gap: var(--sp-2); }

.lv30__slot {
  width: 40px; height: 40px;
  border-radius: 50%;
  border: 1px dashed var(--glass-border);
}

.lv30__slot--filled { border-style: solid; border-color: transparent; }

.lv30__colors { display: flex; gap: var(--sp-3); flex-wrap: wrap; justify-content: center; }

.lv30__color {
  width: 56px; height: 56px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.14);
  transition: transform var(--t-fast) var(--ease), opacity var(--t-base) var(--ease);
}
.lv30__color:hover:not(:disabled) { transform: scale(1.08); }
.lv30__color--used { opacity: 0.2; pointer-events: none; }

.lv30__plates { display: flex; gap: var(--sp-3); flex-wrap: wrap; justify-content: center; }

.lv30__plate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  width: clamp(130px, 30vw, 168px);
  padding: var(--sp-4) var(--sp-3);
  border-radius: var(--r-md);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
}
.lv30__plate:hover:not(:disabled) { border-color: var(--accent-line); }
.lv30__plate-id { font-family: var(--font-mono); font-size: 1.2rem; color: var(--accent); }
.lv30__plate-text { font-size: 0.82rem; font-style: italic; text-align: center; color: var(--text); }

.lv30__tiles {
  display: grid;
  grid-template-columns: repeat(${TILE_SIZE}, 1fr);
  gap: 2px;
  padding: 2px;
  border-radius: var(--r-sm);
  background: rgba(255,255,255,0.05);
}

.lv30__tile {
  width: clamp(62px, 17vw, 84px);
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  border-radius: 3px;
  background: rgba(0,0,0,0.42);
}
.lv30__tile svg { width: 100%; height: 100%; display: block; }
.lv30__spin { transition: transform var(--t-base) var(--ease); transform-origin: 50px 50px; }
.lv30__wire { stroke: hsl(190 72% 64%); stroke-width: 9; stroke-linecap: round; fill: none; }
.lv30__tile[data-loose='true'] .lv30__wire { stroke: hsl(0 75% 62%); }

/* --- Laberinto --- */

.lv30__maze { display: flex; flex-direction: column; align-items: center; gap: var(--sp-4); }

.lv30__track { display: flex; align-items: center; gap: var(--sp-2); }

.lv30__step {
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 1px solid var(--glass-border);
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-faint);
}
.lv30__step--done { border-color: var(--accent-line); color: var(--accent); background: var(--accent-soft); }

.lv30__pad {
  display: grid;
  grid-template-columns: repeat(3, 52px);
  grid-template-rows: repeat(2, 52px);
  gap: var(--sp-2);
}

.lv30__key {
  display: grid; place-items: center;
  border-radius: var(--r-sm);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text);
}
.lv30__key:hover:not(:disabled) { border-color: var(--accent-line); }
.lv30__key--up { grid-column: 2; grid-row: 1; }
.lv30__key--left { grid-column: 1; grid-row: 2; }
.lv30__key--down { grid-column: 2; grid-row: 2; }
.lv30__key--right { grid-column: 3; grid-row: 2; }

/* --- Código maestro --- */

.lv30__clues {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--sp-2);
  width: min(560px, 100%);
  list-style: none;
}

.lv30__clue {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-sm);
  border: 1px solid var(--glass-border);
  background: rgba(0,0,0,0.22);
  font-size: 0.8rem;
  color: var(--text-dim);
}

.lv30__clue b {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--mystery);
  flex: none;
}
`;

export class Level30 extends LevelBase {
  constructor(levelId, container, context) {
    super(levelId, container, context);

    this.phase = 1;
    this.locks = { colores: false, logica: false, rotacion: false };
    this.openLock = null;

    this.colorPicks = [];
    // Rotaciones de partida del candado 3: ninguna es la correcta.
    this.rotation = [[1, 2], [3, 1]];
    this.mazeStep = 0;
  }

  init() {
    this.phaseNodes = [1, 2, 3].map((n) => el('div.lv30__phase', {
      text: ['La puerta', 'El laberinto', 'El código'][n - 1],
    }));

    this.stage = el('div.lv30__stage');

    this.mount(el('style', { text: STYLES }), el('div.lv30', {}, [
      el('div.lv30__phases', {}, this.phaseNodes),
      this.stage,
    ]));

    this.render();
  }

  /* =================================================================== */

  render() {
    this.phaseNodes.forEach((node, i) => {
      node.classList.toggle('lv30__phase--active', i + 1 === this.phase);
      node.classList.toggle('lv30__phase--done', i + 1 < this.phase);
    });

    this.stage.replaceChildren();

    if (this.phase === 1) this.renderLocks();
    else if (this.phase === 2) this.renderMaze();
    else this.renderMasterCode();
  }

  /* ── Fase 1 ────────────────────────────────────────────────────────── */

  renderLocks() {
    this.setPrompt('Tres candados. Cada uno es un nivel que ya resolviste.');

    const row = el('div.lv30__locks', {}, [
      this.buildLock('colores', 'Colores'),
      this.buildLock('logica', 'Lógica'),
      this.buildLock('rotacion', 'Rotación'),
    ]);

    this.stage.append(el('p.lv30__title', { text: 'La última puerta' }), row);

    if (this.openLock === 'colores') this.stage.append(this.buildColorLock());
    if (this.openLock === 'logica') this.stage.append(this.buildLogicLock());
    if (this.openLock === 'rotacion') this.stage.append(this.buildRotationLock());

    if (Object.values(this.locks).every(Boolean)) {
      this.phase = 2;
      this.openLock = null;
      this.feedback('La puerta cede.', 'success');
      setTimeout(() => { if (!this._destroyed) this.render(); }, 700);
    }
  }

  buildLock(id, name) {
    const isOpen = this.locks[id];
    const button = el('button.lv30__lock', {
      type: 'button',
      disabled: isOpen,
      'aria-label': `Candado de ${name}, ${isOpen ? 'abierto' : 'cerrado'}`,
    }, [
      icon(isOpen ? 'check' : 'lock', { size: 22 }),
      el('span.lv30__lock-name', { text: name }),
    ]);

    if (isOpen) button.classList.add('lv30__lock--open');
    else this.listen(button, 'click', () => { this.openLock = id; this.render(); });

    return button;
  }

  buildColorLock() {
    const slots = LOCK_COLORS.map((_, i) => {
      const picked = this.colorPicks[i];
      const color = LOCK_COLORS.find((c) => c.id === picked);
      return el('div', {
        class: `lv30__slot${color ? ' lv30__slot--filled' : ''}`,
        style: color ? { background: color.hex } : {},
        'aria-label': `Posición ${i + 1}: ${color ? color.label : 'vacía'}`,
      });
    });

    const buttons = LOCK_COLORS.map((color) => {
      const used = this.colorPicks.includes(color.id);
      const button = el('button.lv30__color', {
        type: 'button',
        'aria-label': color.label,
        style: { background: color.hex },
      });
      if (used) button.classList.add('lv30__color--used');
      else this.listen(button, 'click', () => this.pickColor(color.id));
      return button;
    });

    return el('div.lv30__panel', {}, [
      el('ul.lv30__rules', {}, COLOR_RULES.map((rule) => el('li', { text: `· ${rule}` }))),
      el('div.lv30__slots', {}, slots),
      el('div.lv30__colors', {}, buttons),
    ]);
  }

  pickColor(id) {
    this.colorPicks.push(id);

    if (this.colorPicks.length === LOCK_COLORS.length) {
      if (sequenceEquals(this.colorPicks, COLOR_SOLUTION)) {
        this.locks.colores = true;
        this.openLock = null;
        this.feedback('Primer candado abierto.', 'success');
      } else {
        this.feedback('Ese orden no abre nada.', 'error');
        this.colorPicks = [];
      }
    }

    this.render();
  }

  buildLogicLock() {
    const plates = PLATES.map((plate) => {
      const button = el('button.lv30__plate', {
        type: 'button',
        'aria-label': `Placa ${plate.id}. Afirma: ${plate.statement}`,
      }, [
        el('span.lv30__plate-id', { text: plate.id, 'aria-hidden': 'true' }),
        el('p.lv30__plate-text', { text: `«${plate.statement}»`, 'aria-hidden': 'true' }),
      ]);
      this.listen(button, 'click', () => this.pickPlate(plate.id));
      return button;
    });

    return el('div.lv30__panel', {}, [
      el('ul.lv30__rules', {}, [el('li', { text: '· Sólo una de las tres afirmaciones es verdadera.' })]),
      el('div.lv30__plates', {}, plates),
    ]);
  }

  pickPlate(id) {
    if (id === PLATE_SOLUTION) {
      this.locks.logica = true;
      this.openLock = null;
      this.feedback('Segundo candado abierto.', 'success');
    } else {
      this.feedback('Esa placa no.', 'error');
    }
    this.render();
  }

  connectorsAt(r, c) {
    return tileConnectors(r, c).map((dir) => (dir + this.rotation[r][c]) % 4);
  }

  looseTiles() {
    const loose = new Set();
    for (let r = 0; r < TILE_SIZE; r += 1) {
      for (let c = 0; c < TILE_SIZE; c += 1) {
        for (const dir of this.connectorsAt(r, c)) {
          const nr = r + DELTA[dir][0];
          const nc = c + DELTA[dir][1];
          const outside = nr < 0 || nr >= TILE_SIZE || nc < 0 || nc >= TILE_SIZE;
          if (outside || !this.connectorsAt(nr, nc).includes(OPPOSITE[dir])) {
            loose.add(`${r},${c}`);
            break;
          }
        }
      }
    }
    return loose;
  }

  buildRotationLock() {
    const grid = el('div.lv30__tiles', { role: 'grid', 'aria-label': 'Piezas giratorias' });

    // Se guardan las referencias para poder repintar sólo los giros: si se
    // reconstruyera el panel en cada clic, la pieza saltaría en vez de girar.
    this.tileNodes = [];

    for (let r = 0; r < TILE_SIZE; r += 1) {
      this.tileNodes[r] = [];
      for (let c = 0; c < TILE_SIZE; c += 1) {
        const spin = svgEl('g', { class: 'lv30__spin' });
        for (const dir of tileConnectors(r, c)) {
          const ends = [[50, 0], [100, 50], [50, 100], [0, 50]][dir];
          spin.append(svgEl('line', {
            x1: 50, y1: 50, x2: ends[0], y2: ends[1], class: 'lv30__wire',
          }));
        }
        spin.append(svgEl('circle', { cx: 50, cy: 50, r: 7, fill: 'currentColor' }));

        const tile = el('button.lv30__tile', {
          type: 'button',
          'aria-label': `Pieza ${r + 1}-${c + 1}. Púlsala para girarla.`,
        }, [svgEl('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' }, [spin])]);

        this.listen(tile, 'click', () => this.rotateTile(r, c));
        this.tileNodes[r][c] = { tile, spin };
        grid.append(tile);
      }
    }

    this.paintTiles();

    return el('div.lv30__panel', {}, [
      el('ul.lv30__rules', {}, [el('li', { text: '· Ningún segmento puede quedar al aire.' })]),
      grid,
    ]);
  }

  paintTiles() {
    if (!this.tileNodes) return;
    const loose = this.looseTiles();

    for (let r = 0; r < TILE_SIZE; r += 1) {
      for (let c = 0; c < TILE_SIZE; c += 1) {
        const { tile, spin } = this.tileNodes[r][c];
        // Vía CSS (no atributo SVG) para que la transición del giro se aplique.
        spin.style.transform = `rotate(${this.rotation[r][c] * 90}deg)`;
        tile.dataset.loose = String(loose.has(`${r},${c}`));
      }
    }
  }

  rotateTile(r, c) {
    this.rotation[r][c] = (this.rotation[r][c] + 1) % 4;

    if (this.looseTiles().size === 0) {
      this.locks.rotacion = true;
      this.openLock = null;
      this.feedback('Tercer candado abierto.', 'success');
      this.render();
      return;
    }

    // Sólo se repintan los giros: el panel entero sigue en pie y la pieza gira.
    this.paintTiles();
  }

  /* ── Fase 2 ────────────────────────────────────────────────────────── */

  renderMaze() {
    this.setPrompt('El pasillo se bifurca. Un paso en falso y vuelves al principio.');

    const track = el('div.lv30__track', {}, MAZE_STEPS.map((_, i) => el('div', {
      class: `lv30__step${i < this.mazeStep ? ' lv30__step--done' : ''}`,
      text: String(i + 1),
    })));

    const key = (direction, modifier, glyph) => {
      const button = el('button', {
        class: `lv30__key lv30__key--${modifier}`,
        type: 'button', text: glyph,
        'aria-label': `Ir hacia ${direction}`,
      });
      this.listen(button, 'click', () => this.step(direction));
      return button;
    };

    this.stage.append(
      el('p.lv30__title', { text: 'El laberinto final' }),
      el('div.lv30__maze', {}, [
        track,
        el('div.lv30__pad', { role: 'group', 'aria-label': 'Direcciones' }, [
          key('arriba', 'up', '↑'),
          key('izquierda', 'left', '←'),
          key('abajo', 'down', '↓'),
          key('derecha', 'right', '→'),
        ]),
      ]),
    );
  }

  step(direction) {
    if (direction === MAZE_STEPS[this.mazeStep]) {
      this.mazeStep += 1;
      this.feedback('');

      if (this.mazeStep === MAZE_STEPS.length) {
        this.phase = 3;
        this.feedback('El pasillo termina en una cerradura de seis dígitos.', 'success');
      }
    } else {
      this.mazeStep = 0;
      this.feedback('Callejón sin salida. Vuelves al principio del pasillo.', 'error');
    }

    this.render();
  }

  /* ── Fase 3 ────────────────────────────────────────────────────────── */

  renderMasterCode() {
    this.setPrompt('Seis respuestas que ya diste. Sólo hay que recordarlas.');

    this.keypad = createKeypad({
      maxLength: MASTER_CODE.length,
      fixedLength: true,
      autoSubmit: true,
      onSubmit: (value) => {
        const correct = this.attempt(value);
        if (!correct) {
          this.keypad.clear();
          this.feedback('La cerradura no cede.', 'error');
        }
      },
    });

    this.stage.append(
      el('p.lv30__title', { text: 'El código maestro' }),
      el('ul.lv30__clues', {}, MASTER_CLUES.map((clue) => el('li.lv30__clue', {}, [
        el('b', { text: `N${String(clue.level).padStart(2, '0')}` }),
        el('span', { text: clue.text }),
      ]))),
      this.keypad.element,
    );
  }

  /* =================================================================== */

  validate(solution) {
    return this.phase === 3 && String(solution) === MASTER_CODE;
  }

  onSolved() {
    this.solved = true;
    this.keypad?.lock();
    this.phaseNodes.forEach((node) => {
      node.classList.remove('lv30__phase--active');
      node.classList.add('lv30__phase--done');
    });
  }

  destroy() {
    this.keypad?.destroy();
    super.destroy();
  }

  getPrompt() {
    return 'Tres candados, un pasillo y una última cerradura.';
  }

  getHints() {
    return [
      'Has practicado esto veintinueve veces.',
      'Cada candado es un nivel que ya resolviste: colores, lógica y rotación. Después, el pasillo; después, el código.',
      `El pasillo va ${MAZE_STEPS.join(', ')}. El código maestro es ${MASTER_CODE}.`,
    ];
  }

  getState() {
    return { phase: this.phase, locks: { ...this.locks }, mazeStep: this.mazeStep };
  }

  getType() {
    return 'final';
  }
}

export { MASTER_CODE };
export default Level30;
