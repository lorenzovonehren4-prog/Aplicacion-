/**
 * levels/level-01.js — "El Código"
 *
 * Tipo:        Observación + Código
 * Mecánica:    Números flotando en pantalla. Uno tiene un matiz de color
 *              distinto y brilla un poco más que el resto.
 * Interacción: Clic en el número correcto.
 * Solución:    El número con el matiz diferente.
 *
 * Este archivo es el TEMPLATE de referencia para los otros 29 niveles.
 * Fíjate en tres cosas:
 *   1. Todo el estilo del puzzle vive en el propio módulo (`STYLES`), así que
 *      añadir un nivel no obliga a tocar index.html ni la carpeta styles/.
 *   2. El nivel nunca decide que está resuelto: llama a `this.attempt(valor)`
 *      y es la pantalla quien valida, cuenta el intento y reparte estrellas.
 *   3. Los adornos se generan con `createRng(seed)`, no con Math.random: las
 *      pistas hablan de posiciones concretas y deben seguir siendo ciertas
 *      después de recargar.
 */

import { LevelBase } from './level-base.js';
import { el } from '../utils/dom.js';
import { createRng, randInt, shuffle } from '../utils/math.js';

const SEED = 'mind-escape/level-01';
const DECOY_COUNT = 17;

/** Estilos propios del nivel. Se montan y se retiran con el nivel. */
const STYLES = `
.lv01 {
  position: relative;
  flex: 1;
  min-height: 320px;
  width: 100%;
}

.lv01__number {
  position: absolute;
  transform: translate(-50%, -50%);
  /* Área táctil cómoda: el número más pequeño medía 52×32 y quedaba por debajo
     del mínimo recomendado para el dedo. El glifo no cambia de tamaño. */
  display: grid;
  place-items: center;
  min-width: 46px;
  min-height: 46px;
  padding: 0.4em 0.55em;
  border-radius: 12px;
  font-family: var(--font-mono);
  font-weight: 600;
  line-height: 1;
  color: hsl(190 78% 66%);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: border-color var(--t-base) var(--ease),
              background var(--t-base) var(--ease);
}

/* El vaivén va en el glifo, no en el botón: así el área de clic no se mueve
   bajo el cursor. La dificultad del nivel está en ver el número, no en cazarlo. */
.lv01__glyph {
  display: inline-block;
  will-change: transform;
  animation: lv01-float 7s ease-in-out infinite;
}

/* El único rasgo que distingue a la respuesta: el matiz se desplaza ~14° hacia
   el verde y el halo es apenas perceptible. Sin bordes, sin tamaño distinto,
   sin trampas: hay que mirar, pero no hace falta forzar la vista. */
.lv01__number--target {
  color: hsl(176 76% 68%);
  text-shadow: 0 0 9px hsl(176 76% 58% / 0.32);
}

.lv01__number:hover,
.lv01__number:focus-visible {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--glass-border);
}

/* Al apuntar, el glifo se detiene bajo el cursor. */
.lv01__number:hover .lv01__glyph,
.lv01__number:focus-visible .lv01__glyph { animation-play-state: paused; }

.lv01__number--wrong {
  animation: error-shake 0.4s var(--ease);
  color: var(--error);
}

@keyframes lv01-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-9px); }
}

@media (prefers-reduced-motion: reduce) {
  .lv01__glyph { animation: none; }
}
`;

export class Level01 extends LevelBase {
  constructor(levelId, container, context) {
    super(levelId, container, context);

    const rng = createRng(SEED);

    /** Números de 3 cifras, todos distintos entre sí. */
    const values = new Set();
    while (values.size < DECOY_COUNT + 1) values.add(randInt(rng, 100, 999));

    const layout = buildLayout(rng, DECOY_COUNT + 1);

    this.items = shuffle([...values], rng).map((value, index) => ({
      value,
      ...layout[index],
      // Tamaños variados para que el ojo no use el tamaño como pista.
      size: 1.05 + rng() * 0.65,
      delay: rng() * 6,
    }));

    // La respuesta no puede caer pegada al borde: debe verse sin buscarla.
    const central = this.items.filter((item) => item.x > 18 && item.x < 82 && item.y > 18 && item.y < 82);
    const candidates = central.length ? central : this.items;
    this.target = candidates[randInt(rng, 0, candidates.length - 1)];
  }

  init() {
    const board = el('div.lv01');

    this.buttons = this.items.map((item) => {
      const isTarget = item === this.target;

      const button = el('button', {
        class: `lv01__number${isTarget ? ' lv01__number--target' : ''}`,
        type: 'button',
        'aria-label': `Número ${item.value}`,
        style: {
          left: `${item.x}%`,
          top: `${item.y}%`,
          // El tamaño de cada número es un multiplicador sobre una base que
          // encoge con la pantalla: con un rem fijo, a 320px los números eran
          // más anchos que el paso de la rejilla y se solapaban.
          fontSize: `calc(${item.size} * clamp(0.62rem, 2.6vw, 1rem))`,
        },
      }, [
        el('span.lv01__glyph', {
          text: String(item.value),
          style: { animationDelay: `${item.delay}s` },
        }),
      ]);

      this.listen(button, 'click', () => this.onPick(item, button));
      return button;
    });

    board.append(...this.buttons);
    this.mount(el('style', { text: STYLES }), board);
  }

  onPick(item, button) {
    const correct = this.attempt(item.value);
    if (correct) return;

    // Marca visual efímera sobre el número equivocado, además del feedback
    // global de la pantalla.
    button.classList.add('lv01__number--wrong');
    setTimeout(() => button.classList.remove('lv01__number--wrong'), 420);
  }

  validate(solution) {
    return Number(solution) === this.target.value;
  }

  onSolved() {
    // Al acertar, apagamos el resto para que la respuesta quede sola en pantalla.
    for (const button of this.buttons) {
      button.disabled = true;
      if (!button.classList.contains('lv01__number--target')) button.style.opacity = '0.15';
    }
  }

  getPrompt() {
    return 'Uno de estos números no es como los demás. Haz clic en él.';
  }

  getHints() {
    return [
      'No todos los números son iguales.',
      'Mira de cerca el color de cada dígito.',
      'El número correcto brilla un poco más: busca el que tira a verde en vez de a azul.',
    ];
  }

  getState() {
    return { target: this.target.value };
  }

  getType() {
    return 'observacion-codigo';
  }
}

/**
 * Reparte `count` posiciones en una cuadrícula suelta con jitter.
 * Una distribución puramente aleatoria amontona números y hace ilegible
 * el puzzle; la cuadrícula garantiza separación y el jitter, naturalidad.
 */
function buildLayout(rng, count) {
  const cols = 4;
  const rows = Math.ceil(count / cols);

  // Se generan más celdas de las necesarias y se descartan algunas: los huecos
  // rompen la sensación de rejilla sin arriesgar solapamientos.
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      // El jitter horizontal es corto a propósito: con la separación justa,
      // dos vecinos no llegan a tocarse ni en la pantalla más estrecha.
      cells.push({
        x: ((col + 0.5) / cols) * 100 + (rng() - 0.5) * (100 / cols) * 0.24,
        y: ((row + 0.5) / rows) * 100 + (rng() - 0.5) * (100 / rows) * 0.34,
      });
    }
  }

  return shuffle(cells, rng)
    .slice(0, count)
    .map(({ x, y }) => ({
      x: Math.min(88, Math.max(12, x)),
      y: Math.min(88, Math.max(12, y)),
    }));
}

export default Level01;
