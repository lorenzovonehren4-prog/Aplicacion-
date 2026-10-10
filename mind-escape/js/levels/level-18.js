/**
 * levels/level-18.js — "Habitación Oscura"
 *
 * Tipo:        Observación + Interacción
 * Mecánica:    La pantalla está casi a oscuras. Un círculo de luz sigue al
 *              cursor (o al dedo) y revela lo que hay debajo.
 * Interacción: Mover la luz para encontrar cuatro números escondidos e
 *              introducir el código.
 * Solución:    7 3 9 1 → 7391 (en orden de lectura, de arriba-izquierda a
 *              abajo-derecha)
 *
 * La oscuridad es una capa con un degradado radial transparente en la posición
 * del puntero, no una máscara sobre cada número: así el efecto es continuo y
 * los números se insinúan en el borde de la luz en vez de aparecer de golpe.
 *
 * Las flechas del teclado también mueven la luz. Un nivel cuya única mecánica
 * es apuntar dejaría fuera a quien no usa ratón, y aquí no hay nada que lo
 * justifique.
 */

import { LevelBase } from './level-base.js';
import { el } from '../utils/dom.js';
import { createKeypad } from './shared/keypad.js';

/** Los números, en orden de lectura. Las esquinas son deliberadas: la pista
 *  #3 del documento maestro dice "busca en las esquinas". */
const HIDDEN = [
  { digit: '7', x: 13, y: 18 },
  { digit: '3', x: 86, y: 22 },
  { digit: '9', x: 16, y: 81 },
  { digit: '1', x: 88, y: 84 },
];

const CODE = HIDDEN.map((item) => item.digit).join('');
const LIGHT_RADIUS = 110;
const KEY_STEP = 4; // % de avance por pulsación de flecha

const STYLES = `
.lv18 {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.lv18__room {
  position: relative;
  flex: 1;
  min-height: 300px;
  border-radius: var(--r-md);
  border: 1px solid var(--glass-border);
  background: #04060d;
  overflow: hidden;
  cursor: none;
  touch-action: none;
}

.lv18__room:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.lv18__digit {
  position: absolute;
  transform: translate(-50%, -50%);
  font-family: var(--font-mono);
  font-size: clamp(1.6rem, 5vw, 2.4rem);
  font-weight: 600;
  color: hsl(190 70% 72%);
  user-select: none;
}

/* Ruido: marcas sin valor que dan textura a la habitación y hacen que
   encontrar los números sea encontrarlos, no tropezar con lo único que hay. */
.lv18__noise {
  position: absolute;
  transform: translate(-50%, -50%);
  color: hsl(220 14% 34%);
  font-family: var(--font-mono);
  font-size: clamp(0.8rem, 2.4vw, 1.1rem);
  user-select: none;
}

/* La oscuridad va por encima de todo, con un agujero en la posición de la luz. */
.lv18__dark {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: background 60ms linear;
}

.lv18__found {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--text-faint);
}

.lv18__hintline {
  text-align: center;
  font-size: 0.72rem;
  color: var(--text-faint);
}
`;

export class Level18 extends LevelBase {
  constructor(levelId, container, context) {
    super(levelId, container, context);
    this.light = { x: 50, y: 50 };
  }

  init() {
    this.room = el('div.lv18__room', {
      tabindex: '0',
      role: 'application',
      'aria-label': 'Habitación a oscuras. Mueve la luz con el ratón o con las flechas del teclado.',
    });

    // Ruido de fondo, en posiciones fijas para que la habitación sea siempre
    // la misma habitación.
    const noise = ['·', '×', '+', '·', '—', '·', '×', '·', '+', '·', '—', '·'];
    noise.forEach((glyph, i) => {
      const angle = (i / noise.length) * Math.PI * 2;
      this.room.append(el('span.lv18__noise', {
        text: glyph,
        'aria-hidden': 'true',
        style: {
          left: `${50 + Math.cos(angle) * 30}%`,
          top: `${50 + Math.sin(angle) * 28}%`,
        },
      }));
    });

    for (const item of HIDDEN) {
      this.room.append(el('span.lv18__digit', {
        text: item.digit,
        'aria-hidden': 'true',
        style: { left: `${item.x}%`, top: `${item.y}%` },
      }));
    }

    this.dark = el('div.lv18__dark', { 'aria-hidden': 'true' });
    this.room.append(this.dark);

    this.listen(this.room, 'pointermove', (event) => this.onPointer(event));
    this.listen(this.room, 'pointerdown', (event) => this.onPointer(event));
    this.listen(this.room, 'keydown', (event) => this.onKey(event));

    this.keypad = createKeypad({
      maxLength: CODE.length,
      fixedLength: true,
      autoSubmit: true,
      onSubmit: (value) => {
        const correct = this.attempt(value);
        if (!correct) this.keypad.clear();
      },
    });

    this.mount(el('style', { text: STYLES }), el('div.lv18', {}, [
      this.room,
      el('p.lv18__hintline', { text: 'Mueve el ratón por la habitación — o usa las flechas del teclado.' }),
      this.keypad.element,
    ]));

    this.paintDark();
  }

  onPointer(event) {
    const rect = this.room.getBoundingClientRect();
    this.light = {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
    this.paintDark();
  }

  onKey(event) {
    const moves = {
      ArrowUp: [0, -KEY_STEP], ArrowDown: [0, KEY_STEP],
      ArrowLeft: [-KEY_STEP, 0], ArrowRight: [KEY_STEP, 0],
    };
    const move = moves[event.key];
    if (!move) return;

    event.preventDefault();
    this.light = {
      x: Math.min(100, Math.max(0, this.light.x + move[0])),
      y: Math.min(100, Math.max(0, this.light.y + move[1])),
    };
    this.paintDark();
  }

  paintDark() {
    if (!this.dark) return;
    const { x, y } = this.light;
    this.dark.style.background = `radial-gradient(circle ${LIGHT_RADIUS}px at ${x}% ${y}%,`
      + ' rgba(0,0,0,0) 0%,'
      + ' rgba(0,0,0,0.35) 45%,'
      + ' rgba(4,6,13,0.97) 78%,'
      + ' rgba(4,6,13,1) 100%)';
  }

  validate(solution) {
    return String(solution) === CODE;
  }

  onSolved() {
    this.solved = true;
    // Se enciende la luz: la habitación deja de estar a oscuras.
    this.dark.style.background = 'rgba(0,0,0,0)';
    this.room.style.cursor = 'default';
    this.keypad.lock();
  }

  destroy() {
    this.keypad?.destroy();
    super.destroy();
  }

  getPrompt() {
    return 'La habitación está a oscuras. Sólo ves lo que ilumines.';
  }

  getHints() {
    return [
      'Mueve la luz despacio: hay más cosas de las que parece.',
      'Hay cuatro números escondidos, y el código los lee de izquierda a derecha y de arriba abajo.',
      'Busca en las esquinas: 7 arriba a la izquierda, 3 arriba a la derecha, 9 abajo a la izquierda y 1 abajo a la derecha.',
    ];
  }

  getState() {
    return { code: CODE };
  }

  getType() {
    return 'observacion';
  }
}

export default Level18;
