/**
 * levels/level-05.js — "El Espejo"
 *
 * Tipo:        Espacial
 * Mecánica:    Una figura simétrica a la que le falta la mitad derecha. Tres
 *              piezas candidatas.
 * Interacción: Apuntar a una pieza la encaja en el hueco; clic para elegirla.
 * Solución:    La pieza central (la pista #3 del documento maestro habla de
 *              "la curva superior de la pieza del medio").
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NOTA DE DISEÑO — dos correcciones tras probarlo
 *
 * La primera versión era injusta y hubo que rehacerla:
 *
 *   1. **La silueta era un arco liso.** Comparar tres arcos casi idénticos, en
 *      miniatura y separados de la figura, no es un puzzle espacial: es una
 *      prueba de agudeza visual con respuesta al azar. Ahora la mitad
 *      izquierda tiene relieve —una curva arriba y tres escalones— así que
 *      hay puntos de referencia concretos que cotejar.
 *
 *   2. **El hueco no daba ninguna pista.** Se mostraba una línea recta
 *      discontinua, que no dice nada de la forma que falta. Ahora, al apuntar
 *      una pieza, esta se dibuja encajada en el hueco. El jugador juzga la
 *      simetría de la figura entera, que es una tarea que el ojo humano hace
 *      bien, en vez de comparar curvas sueltas al margen.
 *
 * Los tres candidatos comparten los escalones y se diferencian sólo en el
 * hombro superior, para que la pista #3 siga siendo exactamente cierta.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { LevelBase } from './level-base.js';
import { el, svgEl } from '../utils/dom.js';

/** Mitad izquierda: curva en el hombro y tres escalones. */
const LEFT_HALF = 'M50 8 C30 10 18 20 18 34 L34 34 L34 52 L14 52 L14 74 L32 74 L32 92 L50 92';

/** Reflejo exacto de LEFT_HALF respecto del eje x = 50. */
const MIRROR = 'M50 8 C70 10 82 20 82 34 L66 34 L66 52 L86 52 L86 74 L68 74 L68 92 L50 92';

const CORRECT_INDEX = 1;

/** Pieza correcta en numeración humana. La usan los meta-puzzles 27 y 30. */
export const ANSWER_PIECE = CORRECT_INDEX + 1;

const PIECES = [
  // Hombro caído: la curva sale hacia abajo antes de abrirse.
  { d: 'M50 8 C62 18 82 24 82 34 L66 34 L66 52 L86 52 L86 74 L68 74 L68 92 L50 92', label: 'Pieza 1' },
  { d: MIRROR, label: 'Pieza 2' },
  // Hombro cuadrado: la curva arranca casi horizontal.
  { d: 'M50 8 C78 8 84 22 82 34 L66 34 L66 52 L86 52 L86 74 L68 74 L68 92 L50 92', label: 'Pieza 3' },
];

const STYLES = `
.lv05 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--sp-6);
}

.lv05__figure { display: grid; place-items: center; }
.lv05__figure svg { width: min(260px, 62vw); height: auto; }

/* El eje se dibuja explícito: es la herramienta del nivel. */
.lv05__axis {
  stroke: var(--mystery);
  stroke-width: 1;
  stroke-dasharray: 4 6;
  opacity: 0.6;
}

.lv05__shape {
  stroke: hsl(190 78% 66%);
  stroke-width: 2.8;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Pieza encajada en el hueco mientras se apunta a una opción. */
.lv05__preview {
  stroke: var(--mystery);
  stroke-width: 2.8;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0;
  transition: opacity var(--t-fast) var(--ease);
}

.lv05__preview--on { opacity: 1; }

.lv05__hint-empty {
  fill: var(--text-faint);
  font-family: var(--font-sans);
  font-size: 5px;
  letter-spacing: 0.4px;
  text-anchor: middle;
  opacity: 0.6;
  transition: opacity var(--t-fast) var(--ease);
}

.lv05--previewing .lv05__hint-empty { opacity: 0; }

.lv05__options {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--sp-4);
}

.lv05__option {
  display: grid;
  place-items: center;
  width: clamp(96px, 25vw, 132px);
  aspect-ratio: 3 / 4;
  padding: var(--sp-3);
  border-radius: var(--r-md);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  transition: transform var(--t-base) var(--ease),
              border-color var(--t-base) var(--ease),
              box-shadow var(--t-base) var(--ease),
              opacity var(--t-base) var(--ease);
}

.lv05__option:hover:not(:disabled),
.lv05__option:focus-visible {
  transform: translateY(-4px);
  border-color: var(--accent-line);
  box-shadow: var(--shadow-glow);
}

.lv05__option svg { width: 100%; height: 100%; }

.lv05__option--wrong { animation: error-shake 0.4s var(--ease); border-color: rgba(239,68,68,0.5); }
.lv05__option--found { border-color: rgba(34,197,94,0.55); background: var(--success-soft); }
.lv05__option--dimmed { opacity: 0.2; }
`;

export class Level05 extends LevelBase {
  init() {
    this.preview = svgEl('path', { d: MIRROR, class: 'lv05__preview' });

    const figureSvg = svgEl('svg', {
      viewBox: '0 0 100 100',
      role: 'img',
      'aria-label': 'Figura simétrica a la que le falta la mitad derecha',
    }, [
      svgEl('line', { x1: 50, y1: 2, x2: 50, y2: 98, class: 'lv05__axis' }),
      svgEl('path', { d: LEFT_HALF, class: 'lv05__shape' }),
      this.preview,
      svgEl('text', { x: 74, y: 52, class: 'lv05__hint-empty', text: 'falta esta mitad' }),
    ]);

    this.root = el('div.lv05', {}, [el('div.lv05__figure', {}, [figureSvg])]);

    this.options = PIECES.map((piece, index) => {
      const button = el('button.lv05__option', {
        type: 'button',
        'aria-label': `${piece.label}. Apunta para verla encajada.`,
      }, [
        // viewBox ceñido a la mitad derecha: la pieza se ve grande, no en miniatura.
        svgEl('svg', { viewBox: '46 2 44 96', 'aria-hidden': 'true' }, [
          svgEl('path', { d: piece.d, class: 'lv05__shape' }),
        ]),
      ]);

      const show = () => this.showPreview(piece.d);
      const hide = () => this.hidePreview();

      this.listen(button, 'pointerenter', show);
      this.listen(button, 'focus', show);
      this.listen(button, 'pointerleave', hide);
      this.listen(button, 'blur', hide);
      this.listen(button, 'click', () => this.onPick(index, button, piece.d));

      return button;
    });

    this.root.append(
      el('div.lv05__options', { role: 'group', 'aria-label': 'Piezas candidatas' }, this.options),
    );

    this.mount(el('style', { text: STYLES }), this.root);
  }

  showPreview(d) {
    if (this.solved) return;
    this.preview.setAttribute('d', d);
    this.preview.classList.add('lv05__preview--on');
    this.root.classList.add('lv05--previewing');
  }

  hidePreview() {
    if (this.solved) return;
    this.preview.classList.remove('lv05__preview--on');
    this.root.classList.remove('lv05--previewing');
  }

  onPick(index, button, d) {
    if (this.attempt(index)) return;
    button.classList.add('lv05__option--wrong');
    setTimeout(() => button.classList.remove('lv05__option--wrong'), 420);
  }

  validate(solution) {
    return Number(solution) === CORRECT_INDEX;
  }

  onSolved() {
    this.solved = true;
    // La figura se queda completa y en verde: la recompensa es ver la simetría.
    this.preview.setAttribute('d', MIRROR);
    this.preview.classList.add('lv05__preview--on');
    this.preview.style.stroke = 'var(--success)';
    this.root.classList.add('lv05--previewing');

    this.options.forEach((button, index) => {
      button.disabled = true;
      button.classList.add(index === CORRECT_INDEX ? 'lv05__option--found' : 'lv05__option--dimmed');
    });
  }

  getPrompt() {
    return 'Apunta a cada pieza para verla encajada. Sólo una deja la figura simétrica.';
  }

  getHints() {
    return [
      'Imagina un espejo en el centro.',
      'Los escalones son iguales en las tres piezas: la diferencia está arriba del todo.',
      'Mira la curva superior de la pieza del medio.',
    ];
  }

  getState() {
    return { correctIndex: CORRECT_INDEX };
  }

  getType() {
    return 'espacial';
  }
}

export default Level05;
