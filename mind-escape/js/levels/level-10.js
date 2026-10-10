/**
 * levels/level-10.js — "Código Oculto"
 *
 * Tipo:        Observación + Código
 * Mecánica:    Una pantalla llena de ruido visual —letras, números y símbolos—
 *              donde seis caracteres tienen opacidad completa y el resto no.
 * Interacción: Escribir la palabra que forman.
 * Solución:    ESCAPA
 *
 * Sobre el contraste: el documento propone 100 % frente a 80 %. Sobre fondo
 * negro esa diferencia es casi invisible y el nivel se vuelve una tortura, así
 * que el ruido va al 45 %. Sigue exigiendo mirar con calma —que es de lo que va
 * el nivel—, pero la respuesta aparece en cuanto dejas de leer y empiezas a ver.
 *
 * Las seis letras se colocan en orden de lectura (izquierda a derecha, arriba
 * abajo) para que la palabra se lea sola una vez detectada.
 */

import { LevelBase } from './level-base.js';
import { el } from '../utils/dom.js';
import { createRng, randInt, shuffle } from '../utils/math.js';
import { textEquals } from '../systems/validation.js';

const SEED = 'mind-escape/level-10';
const MESSAGE = 'ESCAPA';
const COLS = 14;
const ROWS = 9;
const NOISE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%&*+=?/<>{}[]';

const STYLES = `
.lv10 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--sp-5);
}

.lv10__grid {
  display: grid;
  grid-template-columns: repeat(${COLS}, 1fr);
  gap: clamp(2px, 0.8vw, 8px);
  width: 100%;
  max-width: 620px;
  margin: 0 auto;
  user-select: none;
}

.lv10__char {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  font-family: var(--font-mono);
  font-size: clamp(0.7rem, 2.4vw, 1.05rem);
  font-weight: 600;
  color: hsl(190 60% 68%);
  opacity: 0.45;
  animation: fade-in 0.5s var(--ease) both;
}

.lv10__char--signal { opacity: 1; }

/* Al resolver, el ruido se apaga y el mensaje queda solo en pantalla. */
.lv10__grid--solved .lv10__char { opacity: 0.08; }
.lv10__grid--solved .lv10__char--signal {
  opacity: 1;
  color: var(--success);
  text-shadow: 0 0 12px rgba(34, 197, 94, 0.5);
}
`;

export class Level10 extends LevelBase {
  constructor(levelId, container, context) {
    super(levelId, container, context);

    const rng = createRng(SEED);
    const total = COLS * ROWS;

    // Una posición por letra, repartidas en orden de lectura: se elige una
    // celda al azar dentro de cada bloque consecutivo de la cuadrícula.
    const blockSize = Math.floor(total / MESSAGE.length);
    const signalPositions = [...MESSAGE].map((_, i) => {
      const start = i * blockSize;
      const end = Math.min(total - 1, start + blockSize - 1);
      return randInt(rng, start, end);
    });

    const signalMap = new Map(signalPositions.map((pos, i) => [pos, MESSAGE[i]]));

    this.cells = Array.from({ length: total }, (_, index) => {
      const signal = signalMap.get(index);
      return {
        char: signal ?? NOISE[randInt(rng, 0, NOISE.length - 1)],
        signal: Boolean(signal),
        delay: rng() * 0.5,
      };
    });
  }

  init() {
    const grid = el('div.lv10__grid', {
      role: 'img',
      'aria-label': 'Cuadrícula de caracteres. Algunos se muestran con más intensidad que el resto.',
    });

    this.cellNodes = this.cells.map((cell) => el('span', {
      class: `lv10__char${cell.signal ? ' lv10__char--signal' : ''}`,
      text: cell.char,
      'aria-hidden': 'true',
      style: { animationDelay: `${cell.delay}s` },
    }));

    grid.append(...this.cellNodes);
    this.grid = grid;

    this.mount(el('style', { text: STYLES }), el('div.lv10', {}, [grid]));
  }

  validate(solution) {
    return textEquals(solution, MESSAGE);
  }

  onSolved() {
    this.grid.classList.add('lv10__grid--solved');
  }

  getInputMode() {
    return 'text';
  }

  getInputConfig() {
    return {
      label: 'La palabra escondida',
      placeholder: '······',
      maxLength: 12,
      submitLabel: 'Enviar',
    };
  }

  getPrompt() {
    return 'No todo lo que ves está igual de presente.';
  }

  getHints() {
    return [
      'No todo es decoración.',
      'Algunos caracteres son más reales que otros: fíjate en cuáles se ven con más fuerza.',
      'Los caracteres a plena opacidad, leídos de izquierda a derecha y de arriba abajo, forman una palabra de seis letras.',
    ];
  }

  getState() {
    return { message: MESSAGE };
  }

  getType() {
    return 'observacion-codigo';
  }
}

export default Level10;
