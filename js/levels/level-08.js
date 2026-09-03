/**
 * levels/level-08.js — "Relojes"
 *
 * Tipo:        Patrón + Código
 * Mecánica:    Cuatro relojes analógicos. Cada uno codifica un dígito.
 * Interacción: Introducir el código de 4 dígitos.
 * Regla:       dígito = hora + (minutos / 5)   — la del documento maestro,
 *              confirmada por su pista #3: "3:00 → 3, 4:15 → 7".
 * Solución:    3 · 7 · 6 · 4  →  3764
 *
 * Detalle que importa: la aguja de las horas avanza con los minutos, como en un
 * reloj real (4:15 la deja un cuarto pasada el 4). Dibujarla clavada en la hora
 * exacta sería más fácil de leer, pero el jugador que sepa mirar un reloj se
 * daría cuenta de que algo no encaja.
 */

import { LevelBase } from './level-base.js';
import { el, svgEl } from '../utils/dom.js';
import { createKeypad } from './shared/keypad.js';

const CLOCKS = [
  { hour: 3, minute: 0 },   // 3 + 0 = 3
  { hour: 4, minute: 15 },  // 4 + 3 = 7
  { hour: 1, minute: 25 },  // 1 + 5 = 6
  { hour: 2, minute: 10 },  // 2 + 2 = 4
];

const digitFor = ({ hour, minute }) => hour + minute / 5;
const CODE = CLOCKS.map(digitFor).join('');

const STYLES = `
.lv08 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--sp-6);
}

.lv08__clocks {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--sp-4);
}

.lv08__clock {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  animation: pop-in 0.4s var(--ease) both;
}

.lv08__clock svg { width: clamp(88px, 21vw, 122px); height: auto; }

.lv08__clock-name {
  font-size: 0.62rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.lv08__face { fill: rgba(0, 0, 0, 0.35); stroke: var(--glass-border); stroke-width: 1.5; }
.lv08__tick { stroke: hsl(190 40% 45%); stroke-width: 1.5; stroke-linecap: round; }
.lv08__tick--hour { stroke: hsl(190 60% 60%); stroke-width: 2.2; }
.lv08__hand-hour { stroke: hsl(190 78% 70%); stroke-width: 3.4; stroke-linecap: round; }
.lv08__hand-minute { stroke: var(--accent); stroke-width: 2.2; stroke-linecap: round; }
.lv08__pin { fill: var(--accent); }
`;

export class Level08 extends LevelBase {
  init() {
    const clocks = el('div.lv08__clocks', {}, CLOCKS.map((time, index) => el('div.lv08__clock', {
      style: { animationDelay: `${index * 0.08}s` },
    }, [
      buildClock(time),
      el('span.lv08__clock-name', { text: `Reloj ${index + 1}`, 'aria-hidden': 'true' }),
    ])));

    this.keypad = createKeypad({
      maxLength: CODE.length,
      fixedLength: true,
      autoSubmit: true,
      onSubmit: (value) => {
        const correct = this.attempt(value);
        if (!correct) this.keypad.clear();
      },
    });

    this.mount(
      el('style', { text: STYLES }),
      el('div.lv08', {}, [clocks, this.keypad.element]),
    );
  }

  validate(solution) {
    return String(solution) === CODE;
  }

  onSolved() {
    this.keypad.lock();
  }

  destroy() {
    this.keypad?.destroy();
    super.destroy();
  }

  getPrompt() {
    return 'Cada reloj esconde un dígito. Los cuatro, en orden, abren la puerta.';
  }

  getHints() {
    return [
      'Las manecillas apuntan a números: léelos.',
      'La hora es sólo la mitad. Suma también los minutos, pero contados de cinco en cinco.',
      'Dígito = hora + (minutos ÷ 5). Reloj 1: 3:00 → 3. Reloj 2: 4:15 → 4 + 3 = 7.',
    ];
  }

  getState() {
    return { code: CODE };
  }

  getType() {
    return 'patron-codigo';
  }
}

/** Reloj analógico. La aguja horaria avanza con los minutos, como uno de verdad. */
function buildClock({ hour, minute }) {
  const size = 100;
  const c = size / 2;

  const minuteAngle = minute * 6;
  const hourAngle = (hour % 12) * 30 + minute * 0.5;

  const ticks = [];
  for (let i = 0; i < 12; i += 1) {
    const isHour = i % 3 === 0;
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const outer = 42;
    const inner = isHour ? 34 : 37;
    ticks.push(svgEl('line', {
      x1: c + Math.cos(angle) * inner,
      y1: c + Math.sin(angle) * inner,
      x2: c + Math.cos(angle) * outer,
      y2: c + Math.sin(angle) * outer,
      class: `lv08__tick${isHour ? ' lv08__tick--hour' : ''}`,
    }));
  }

  const hand = (angleDeg, length, className) => {
    const angle = (angleDeg - 90) * (Math.PI / 180);
    return svgEl('line', {
      x1: c, y1: c,
      x2: c + Math.cos(angle) * length,
      y2: c + Math.sin(angle) * length,
      class: className,
    });
  };

  const label = `${hour}:${String(minute).padStart(2, '0')}`;

  return svgEl('svg', {
    viewBox: `0 0 ${size} ${size}`,
    role: 'img',
    'aria-label': `Reloj marcando las ${label}`,
  }, [
    svgEl('circle', { cx: c, cy: c, r: 46, class: 'lv08__face' }),
    ...ticks,
    hand(hourAngle, 24, 'lv08__hand-hour'),
    hand(minuteAngle, 34, 'lv08__hand-minute'),
    svgEl('circle', { cx: c, cy: c, r: 2.6, class: 'lv08__pin' }),
  ]);
}

export default Level08;
